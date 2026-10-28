package php

import (
	"bytes"
	"encoding/base64"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"tinkerpad/backend/docker"
	"tinkerpad/backend/logger"
	"tinkerpad/backend/settings"
	"tinkerpad/backend/ssh"
	"tinkerpad/backend/storage"
)

type Php struct {
	log           *logger.Logger
	storage       *storage.Storage
	settings      *settings.Settings
	ssh           *ssh.Ssh
	docker        *docker.Docker
	phpRunnerPath string
	sessions      map[string]*liveSession
	sessionMu     sync.Mutex
}

func New() *Php {
	return &Php{}
}

func (php *Php) Boot(log *logger.Logger, storage *storage.Storage, settings *settings.Settings, ssh *ssh.Ssh, docker *docker.Docker) {
	php.log = log
	php.storage = storage
	php.settings = settings
	php.ssh = ssh
	php.docker = docker
	php.phpRunnerPath = php.storage.GetPath("resources", "bin", "php.phar")
	php.sessions = map[string]*liveSession{}
}

func (php *Php) RunRemoteCode(uuid string, code string) RunResult {
	conn := php.sshConn(uuid)
	if conn == nil {
		return failResult("SSH connection is not open")
	}

	cmd, err := conn.Client.Command(conn.Config.PhpBinaryPath, conn.PhpRunnerPath, conn.Config.WorkingDir, encodeCode(code))
	if err != nil {
		php.log.Errorf("error creating remote command: %v", err)
		return failResult(err.Error())
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err = cmd.Run()
	result := parseOutput(stdout.String(), stderr.String(), err)
	if !result.Ok {
		php.log.Errorf("remote php run failed: %s", result.Error)
	}

	return result
}

func (php *Php) RunCode(cwd string, code string, phpBinary string) RunResult {
	bin := phpBinary
	if bin == "" {
		bin = php.settings.App.PhpBinaryPath
	}

	// Do not set cmd.Dir to the project: the runner chdirs itself after
	// loading its own PHAR autoloader. Starting in the project cwd made
	// relative requires pick up the app's vendor/autoload.php.
	cmd := exec.Command(bin, php.phpRunnerPath, cwd, encodeCode(code))
	result := parseCommand(cmd)
	if !result.Ok {
		php.log.Errorf("local php run failed: %s", result.Error)
	}

	return result
}

func (php *Php) RunDockerCode(id string, code string) RunResult {
	info := php.docker.GetContainerInfoById(id)
	if info == nil {
		return failResult("Docker container is not available")
	}

	cmd := exec.Command(
		php.settings.App.DockerBinaryPath,
		"exec", "-w", filepath.Dir(info.PhpRunnerPath),
		info.Id, info.PhpBinaryPath, info.PhpRunnerPath, info.WorkingDir, encodeCode(code),
	)
	result := parseCommand(cmd)
	if !result.Ok {
		php.log.Errorf("docker php run failed: %s", result.Error)
	}

	return result
}

func (php *Php) GetFrameworkInfo(cwd string) string {
	cmd := exec.Command(php.settings.App.PhpBinaryPath, php.phpRunnerPath, cwd)

	result, err := cmd.CombinedOutput()
	if err != nil {
		php.log.Errorf("error getting local framework info: %v | %s", err, result)
		return ""
	}

	return string(result)
}

func (php *Php) GetRemoteFrameworkInfo(uuid string) string {
	var conn *ssh.SshConnection
	for _, c := range php.ssh.Conns {
		if c.Uuid == uuid {
			conn = c
		}
	}
	if conn == nil {
		return ""
	}

	cmd, err := conn.Client.Command(conn.Config.PhpBinaryPath, conn.PhpRunnerPath, conn.Config.WorkingDir)
	if err != nil {
		php.log.Errorf("error creating remote cmd: %v", err)
		return ""
	}

	result, err := cmd.CombinedOutput()
	if err != nil {
		php.log.Errorf("error getting remote framework info: %v | %s", err, result)
		return ""
	}

	return cleanOutput(string(result))
}

func (php *Php) GetDockerFrameworkInfo(id string) string {
	info := php.docker.GetContainerInfoById(id)
	if info == nil {
		return ""
	}

	result, err := exec.Command(php.settings.App.DockerBinaryPath, "exec", "-w", filepath.Dir(info.PhpRunnerPath), info.Id, info.PhpBinaryPath, info.PhpRunnerPath, info.WorkingDir).CombinedOutput()
	if err != nil {
		php.log.Errorf("error getting docker framework info: %v | %s", err, result)
		return ""
	}

	return cleanOutput(string(result))
}

func cleanOutput(output string) string {
	exit := regexp.MustCompile(`(?s)(<aside.*?<\/aside>)|Exit:  Ctrl\+D`)
	info := regexp.MustCompile(`(?s)(<whisper.*?<\/whisper>)|INFO  Ctrl\+D\.`)
	tabs := regexp.MustCompile(`(?m)^ {2}`)

	output = exit.ReplaceAllString(output, "")
	output = info.ReplaceAllString(output, "")
	output = tabs.ReplaceAllString(output, "")

	return strings.TrimPrefix(strings.TrimSpace(output), "> \n")
}

func encodeCode(code string) string {
	return base64.StdEncoding.EncodeToString([]byte(code))
}
