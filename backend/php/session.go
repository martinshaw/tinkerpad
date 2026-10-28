package php

import (
	"bufio"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"tinkerpad/backend/ssh"
)

const (
	sessionBootTimeout = 90 * time.Second
	sessionRunTimeout  = 180 * time.Second
)

type SessionSpec struct {
	Runtime       string `json:"runtime"`
	WorkingDir    string `json:"workingDir"`
	PhpBinaryPath string `json:"phpBinaryPath"`
	SshUuid       string `json:"sshUuid"`
	ContainerId   string `json:"containerId"`
	PhpRunnerPath string `json:"phpRunnerPath"`
}

type SessionRequest struct {
	Op              string `json:"op"`
	Code            string `json:"code"`
	QueryLog        bool   `json:"queryLog"`
	DumpAssignments bool   `json:"dumpAssignments"`
	DumpLogs        bool   `json:"dumpLogs"`
	SQL             string `json:"sql"`
	Table           string `json:"table"`
	AllowWrites     bool   `json:"allowWrites"`
}

type resolvedSpec struct {
	key         string
	runtime     string
	dir         string
	phpBinary   string
	sshUuid     string
	containerId string
	runner      string
}

type liveSession struct {
	key    string
	stdin  io.WriteCloser
	reader *bufio.Reader
	stderr *syncBuf
	killFn func()
	once   sync.Once
	mu     sync.Mutex
	closed bool
}

type syncBuf struct {
	mu sync.Mutex
	b  bytes.Buffer
}

func (s *syncBuf) Write(p []byte) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.b.Write(p)
}

func (s *syncBuf) String() string {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.b.String()
}

func (s *syncBuf) Reset() {
	s.mu.Lock()
	s.b.Reset()
	s.mu.Unlock()
}

func (php *Php) SessionExec(tabId string, spec SessionSpec, req SessionRequest) RunResult {
	if strings.TrimSpace(tabId) == "" {
		return failResult("missing tab")
	}

	resolved, err := php.resolve(spec)
	if err != nil {
		return failResult(err.Error())
	}

	sess, err := php.sessionFor(tabId, resolved)
	if err != nil {
		php.log.Errorf("session start failed: %v", err)
		return failResult(err.Error())
	}

	result, err := sess.roundTrip(req)
	if err != nil {
		php.StopSession(tabId)
		php.log.Errorf("session request failed: %v", err)
		return failResult(err.Error())
	}

	return result
}

func (php *Php) StopSession(tabId string) {
	php.sessionMu.Lock()
	sess := php.sessions[tabId]
	delete(php.sessions, tabId)
	php.sessionMu.Unlock()

	if sess != nil {
		sess.close()
	}
}

func (php *Php) Close() {
	php.sessionMu.Lock()
	ids := make([]string, 0, len(php.sessions))
	for id := range php.sessions {
		ids = append(ids, id)
	}
	php.sessionMu.Unlock()

	for _, id := range ids {
		php.StopSession(id)
	}
}

func (php *Php) sessionFor(tabId string, spec resolvedSpec) (*liveSession, error) {
	php.sessionMu.Lock()
	existing := php.sessions[tabId]
	php.sessionMu.Unlock()

	if existing != nil && existing.key == spec.key && !existing.closed {
		return existing, nil
	}
	if existing != nil {
		php.StopSession(tabId)
	}

	started, err := php.start(spec)
	if err != nil {
		return nil, err
	}
	started.key = spec.key

	php.sessionMu.Lock()
	defer php.sessionMu.Unlock()
	if current := php.sessions[tabId]; current != nil && !current.closed {
		started.close()
		return current, nil
	}
	php.sessions[tabId] = started

	return started, nil
}

func (php *Php) resolve(spec SessionSpec) (resolvedSpec, error) {
	switch spec.Runtime {
	case "docker":
		return php.resolveDocker(spec)
	case "ssh":
		return php.resolveSSH(spec)
	default:
		dir := spec.WorkingDir
		if dir == "" {
			return resolvedSpec{}, errors.New("working directory is required")
		}
		bin := spec.PhpBinaryPath
		if bin == "" {
			bin = php.settings.App.PhpBinaryPath
		}

		return resolvedSpec{
			runtime:   "local",
			dir:       dir,
			phpBinary: bin,
			runner:    php.phpRunnerPath,
			key:       strings.Join([]string{"local", dir, bin, php.phpRunnerPath}, "|"),
		}, nil
	}
}

func (php *Php) resolveDocker(spec SessionSpec) (resolvedSpec, error) {
	if spec.ContainerId == "" {
		return resolvedSpec{}, errors.New("Docker container is not selected")
	}

	info := php.docker.GetContainerInfoById(spec.ContainerId)
	dir := spec.WorkingDir
	bin := spec.PhpBinaryPath
	runner := spec.PhpRunnerPath
	if info != nil {
		if dir == "" {
			dir = info.WorkingDir
		}
		if bin == "" {
			bin = info.PhpBinaryPath
		}
		if runner == "" {
			runner = info.PhpRunnerPath
		}
	}
	if runner == "" && info != nil {
		prepared := *info
		if dir != "" {
			prepared.WorkingDir = dir
		}
		if bin != "" {
			prepared.PhpBinaryPath = bin
		}
		path, err := php.docker.Connect(prepared)
		if err != nil {
			return resolvedSpec{}, err
		}
		runner = path
	}
	if dir == "" || bin == "" || runner == "" {
		return resolvedSpec{}, errors.New("Docker container is missing a working directory or PHP binary")
	}

	return resolvedSpec{
		runtime:     "docker",
		dir:         dir,
		phpBinary:   bin,
		containerId: spec.ContainerId,
		runner:      runner,
		key:         strings.Join([]string{"docker", spec.ContainerId, dir, bin, runner}, "|"),
	}, nil
}

func (php *Php) resolveSSH(spec SessionSpec) (resolvedSpec, error) {
	conn := php.sshConn(spec.SshUuid)
	if conn == nil {
		return resolvedSpec{}, errors.New("SSH connection is not open")
	}

	dir := conn.Config.WorkingDir
	bin := conn.Config.PhpBinaryPath
	runner := conn.PhpRunnerPath
	if dir == "" || bin == "" || runner == "" {
		return resolvedSpec{}, errors.New("SSH connection is missing a working directory or PHP binary")
	}

	return resolvedSpec{
		runtime:   "ssh",
		dir:       dir,
		phpBinary: bin,
		sshUuid:   spec.SshUuid,
		runner:    runner,
		key:       strings.Join([]string{"ssh", spec.SshUuid, dir, bin, runner}, "|"),
	}, nil
}

func (php *Php) start(spec resolvedSpec) (*liveSession, error) {
	switch spec.runtime {
	case "docker":
		cmd := exec.Command(
			php.settings.App.DockerBinaryPath,
			"exec", "-i",
			"-w", filepath.Dir(spec.runner),
			spec.containerId,
			spec.phpBinary,
			spec.runner,
			spec.dir,
			"--session",
		)
		return startCommand(cmd)
	case "ssh":
		return php.startSSH(spec)
	default:
		// Runner chdirs to spec.dir after its PHAR autoload is loaded.
		cmd := exec.Command(spec.phpBinary, spec.runner, spec.dir, "--session")
		return startCommand(cmd)
	}
}

func startCommand(cmd *exec.Cmd) (*liveSession, error) {
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}

	stderr := &syncBuf{}
	cmd.Stderr = stderr
	if err := cmd.Start(); err != nil {
		return nil, err
	}

	sess := &liveSession{
		stdin:  stdin,
		reader: bufio.NewReader(stdout),
		stderr: stderr,
		killFn: func() {
			if cmd.Process != nil {
				_ = cmd.Process.Kill()
			}
		},
	}
	go func() { _ = cmd.Wait() }()

	if err := sess.awaitReady(); err != nil {
		sess.close()
		return nil, withStderr(err, stderr.String())
	}
	stderr.Reset()

	return sess, nil
}

func (php *Php) startSSH(spec resolvedSpec) (*liveSession, error) {
	conn := php.sshConn(spec.sshUuid)
	if conn == nil {
		return nil, errors.New("SSH connection is not open")
	}

	clientSession, err := conn.Client.NewSession()
	if err != nil {
		return nil, err
	}

	stdin, err := clientSession.StdinPipe()
	if err != nil {
		_ = clientSession.Close()
		return nil, err
	}
	stdout, err := clientSession.StdoutPipe()
	if err != nil {
		_ = clientSession.Close()
		return nil, err
	}

	stderr := &syncBuf{}
	clientSession.Stderr = stderr
	if err := clientSession.Start(shellJoin(spec.phpBinary, spec.runner, spec.dir, "--session")); err != nil {
		_ = clientSession.Close()
		return nil, err
	}

	sess := &liveSession{
		stdin:  stdin,
		reader: bufio.NewReader(stdout),
		stderr: stderr,
		killFn: func() { _ = clientSession.Close() },
	}
	go func() { _ = clientSession.Wait() }()

	if err := sess.awaitReady(); err != nil {
		sess.close()
		return nil, withStderr(err, stderr.String())
	}
	stderr.Reset()

	return sess, nil
}

func (sess *liveSession) awaitReady() error {
	line, err := sess.readLine(sessionBootTimeout)
	if err != nil {
		return err
	}

	ready, result, err := parseFrame(line)
	if err != nil {
		return err
	}
	if ready {
		return nil
	}
	if result.Error != "" {
		return errors.New(result.Error)
	}

	return errors.New("session failed to start")
}

func (sess *liveSession) roundTrip(req SessionRequest) (RunResult, error) {
	sess.mu.Lock()
	defer sess.mu.Unlock()

	if sess.closed {
		return RunResult{}, errors.New("session is closed")
	}

	op := req.Op
	if op == "" {
		op = "run"
	}

	wire := map[string]any{"op": op}
	if op == "run" {
		wire["code"] = base64.StdEncoding.EncodeToString([]byte(req.Code))
	}
	if req.QueryLog {
		wire["queryLog"] = true
	}
	if req.DumpAssignments {
		wire["dumpAssignments"] = true
	}
	// Always send so PHP can default missing keys to on for older clients.
	wire["dumpLogs"] = req.DumpLogs
	if req.SQL != "" {
		wire["sql"] = req.SQL
	}
	if req.Table != "" {
		wire["table"] = req.Table
	}
	if req.AllowWrites {
		wire["allowWrites"] = true
	}

	payload, err := json.Marshal(wire)
	if err != nil {
		return RunResult{}, err
	}
	if _, err := sess.stdin.Write(append(payload, '\n')); err != nil {
		return RunResult{}, err
	}

	line, err := sess.readLine(sessionRunTimeout)
	if err != nil {
		return RunResult{}, withStderr(err, sess.stderr.String())
	}

	ready, result, err := parseFrame(line)
	if err != nil {
		return RunResult{}, err
	}
	if ready {
		return RunResult{}, errors.New("unexpected ready frame")
	}
	if extra := cleanStderr(sess.stderr.String()); extra != "" {
		sess.stderr.Reset()
		if result.Error != "" {
			result.Error += "\n" + extra
		} else {
			result.Error = extra
		}
	}

	return result, nil
}

func (sess *liveSession) readLine(timeout time.Duration) (string, error) {
	type outcome struct {
		line string
		err  error
	}

	ch := make(chan outcome, 1)
	go func() {
		line, err := sess.reader.ReadString('\n')
		ch <- outcome{line: line, err: err}
	}()

	timer := time.NewTimer(timeout)
	defer timer.Stop()

	select {
	case result := <-ch:
		return result.line, result.err
	case <-timer.C:
		if sess.killFn != nil {
			sess.killFn()
		}
		return "", errors.New("session timed out")
	}
}

func (sess *liveSession) close() {
	sess.once.Do(func() {
		sess.closed = true
		if sess.stdin != nil {
			_ = sess.stdin.Close()
		}
		if sess.killFn != nil {
			sess.killFn()
		}
	})
}

func (php *Php) sshConn(uuid string) *ssh.SshConnection {
	if uuid == "" {
		return nil
	}

	for _, conn := range php.ssh.Conns {
		if conn.Uuid == uuid {
			return conn
		}
	}

	return nil
}

func shellJoin(args ...string) string {
	quoted := make([]string, len(args))
	for i, arg := range args {
		quoted[i] = "'" + strings.ReplaceAll(arg, "'", `'\''`) + "'"
	}

	return strings.Join(quoted, " ")
}

func withStderr(err error, stderr string) error {
	stderr = cleanStderr(stderr)
	if err == nil {
		if stderr == "" {
			return nil
		}
		return errors.New(stderr)
	}
	if stderr == "" || strings.Contains(err.Error(), stderr) {
		return err
	}

	return fmt.Errorf("%w\n%s", err, stderr)
}
