package php

import (
	"bytes"
	"encoding/json"
	"errors"
	"os/exec"
	"strings"

	"golang.org/x/crypto/ssh"
)

type RunResult struct {
	Ok       bool   `json:"ok"`
	Output   string `json:"output"`
	Error    string `json:"error"`
	ExitCode int    `json:"exitCode"`
}

func failResult(message string) RunResult {
	return RunResult{Ok: false, Error: message, ExitCode: -1}
}

func parseCommand(cmd *exec.Cmd) RunResult {
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()

	return parseOutput(stdout.String(), stderr.String(), err)
}

func parseOutput(stdout, stderr string, err error) RunResult {
	output := extractJSON(cleanOutput(stdout))
	stderr = cleanStderr(stderr)
	code := exitCodeOf(err)

	if looksLikeRunner(output) {
		return RunResult{
			Ok:       err == nil,
			Output:   output,
			Error:    stderr,
			ExitCode: code,
		}
	}

	message := stderr
	if err != nil && (message == "" || !strings.Contains(message, err.Error())) {
		if message == "" {
			message = err.Error()
		} else {
			message = err.Error() + "\n" + message
		}
	}
	if message == "" {
		message = strings.TrimSpace(output)
	}
	if message == "" {
		message = "PHP run failed"
	}

	return RunResult{Ok: false, Error: message, ExitCode: code}
}

func looksLikeRunner(output string) bool {
	output = strings.TrimSpace(output)
	if !strings.HasPrefix(output, "{") {
		return false
	}

	var probe map[string]json.RawMessage
	if json.Unmarshal([]byte(output), &probe) != nil {
		return false
	}

	_, outputs := probe["outputs"]
	_, info := probe["framework_name"]

	return outputs || info
}

func cleanStderr(text string) string {
	lines := strings.Split(text, "\n")
	kept := make([]string, 0, len(lines))
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || trimmed == "Cannot read termcap database;" || trimmed == "using dumb terminal settings." {
			continue
		}
		kept = append(kept, line)
	}

	return strings.TrimSpace(strings.Join(kept, "\n"))
}

func extractJSON(output string) string {
	output = strings.TrimSpace(output)
	if looksLikeRunner(output) {
		return output
	}

	start := strings.Index(output, "{")
	end := strings.LastIndex(output, "}")
	if start >= 0 && end > start && looksLikeRunner(output[start:end+1]) {
		return output[start : end+1]
	}

	return output
}

func exitCodeOf(err error) int {
	if err == nil {
		return 0
	}

	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		return exitErr.ExitCode()
	}

	var sshErr *ssh.ExitError
	if errors.As(err, &sshErr) {
		return sshErr.ExitStatus()
	}

	return -1
}

func parseFrame(line string) (bool, RunResult, error) {
	line = strings.TrimSpace(line)
	if line == "" {
		return false, RunResult{}, errors.New("empty session response")
	}

	var probe struct {
		Ready   bool            `json:"ready"`
		Error   string          `json:"error"`
		Outputs json.RawMessage `json:"outputs"`
	}
	if err := json.Unmarshal([]byte(line), &probe); err != nil {
		return false, RunResult{}, errors.New(line)
	}
	if probe.Ready {
		return true, RunResult{}, nil
	}
	if probe.Outputs == nil && probe.Error == "" {
		return false, RunResult{}, errors.New(line)
	}

	return false, RunResult{
		Ok:       probe.Error == "",
		Output:   line,
		Error:    probe.Error,
		ExitCode: 0,
	}, nil
}
