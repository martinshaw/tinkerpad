package forge

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"tinkerpad/backend/php"
)

const (
	pollInterval = 1500 * time.Millisecond
	pollTimeout  = 5 * time.Minute
	emptyTip     = "Forge returned no output. Run once more (Forge Commands often needs a second try), and make sure the script prints something with echo, dump(), or var_dump()."
)

func (f *Forge) RunCode(profileUUID, orgSlug string, serverID, siteID int, phpCode string) php.RunResult {
	code := normalizePHP(phpCode)
	if strings.TrimSpace(code) == "" {
		return php.RunResult{
			Ok:       false,
			Error:    "Nothing to run — add some PHP in the editor.",
			ExitCode: -1,
		}
	}
	if strings.TrimSpace(profileUUID) == "" {
		return php.RunResult{
			Ok:       false,
			Error:    "No Forge profile selected",
			ExitCode: -1,
		}
	}
	if strings.TrimSpace(orgSlug) == "" {
		return php.RunResult{
			Ok:       false,
			Error:    "No Forge organization on this site — reconnect the site from Workspace → Forge",
			ExitCode: -1,
		}
	}

	command := buildTinkerCommand(code)
	cmdID, err := f.createSiteCommand(profileUUID, orgSlug, serverID, siteID, command)
	if err != nil {
		return php.RunResult{Ok: false, Error: err.Error(), ExitCode: -1}
	}

	deadline := time.Now().Add(pollTimeout)
	var lastStatus string
	var output string
	for {
		cmd, err := f.getSiteCommand(profileUUID, orgSlug, serverID, siteID, cmdID)
		if err != nil {
			return php.RunResult{Ok: false, Error: err.Error(), ExitCode: -1}
		}
		lastStatus = strings.ToLower(strings.TrimSpace(cmd.Status))
		if isTerminalStatus(lastStatus) {
			out, outErr := f.getSiteCommandOutput(profileUUID, orgSlug, serverID, siteID, cmdID)
			if outErr != nil {
				return php.RunResult{Ok: false, Error: outErr.Error(), ExitCode: -1}
			}
			output = out
			break
		}
		if time.Now().After(deadline) {
			return php.RunResult{
				Ok:       false,
				Error:    fmt.Sprintf("Timed out waiting for Forge command (last status: %s)", lastStatus),
				ExitCode: -1,
			}
		}
		time.Sleep(pollInterval)
	}

	failed := lastStatus == "failed" || lastStatus == "error"
	if strings.TrimSpace(output) == "" {
		errMsg := emptyTip
		if failed {
			errMsg = "Forge command failed.\n\n" + emptyTip
		}
		return php.RunResult{
			Ok:       !failed,
			Output:   wrapPlainOutput(""),
			Error:    errMsg,
			ExitCode: exitCode(failed),
		}
	}

	errMsg := ""
	if failed {
		errMsg = "Forge command failed"
	}
	return php.RunResult{
		Ok:       !failed,
		Output:   wrapPlainOutput(output),
		Error:    errMsg,
		ExitCode: exitCode(failed),
	}
}

func isTerminalStatus(status string) bool {
	switch status {
	case "finished", "failed", "error", "complete", "completed", "succeeded", "success":
		return true
	default:
		return false
	}
}

func normalizePHP(code string) string {
	code = strings.TrimSpace(code)
	code = strings.TrimPrefix(code, "\ufeff")
	if strings.HasPrefix(code, "<?php") {
		code = strings.TrimSpace(code[5:])
	} else if strings.HasPrefix(code, "<?=") {
		code = strings.TrimSpace(code[3:])
	} else if strings.HasPrefix(code, "<?") {
		code = strings.TrimSpace(code[2:])
	}
	return strings.TrimSpace(code)
}

func buildTinkerCommand(phpCode string) string {
	escaped := strings.ReplaceAll(phpCode, "'", `'\''`)
	return "php artisan tinker --execute='" + escaped + "'"
}

func wrapPlainOutput(text string) string {
	outputs := []map[string]any{}
	if strings.TrimSpace(text) != "" {
		outputs = append(outputs, map[string]any{
			"html": "",
			"raw":  text,
			"kind": "dump",
		})
	}
	payload := map[string]any{
		"outputs":         outputs,
		"time":            0,
		"peakMemoryUsage": 0,
		"runAt":           time.Now().UnixMilli(),
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return text
	}
	return string(raw)
}

func exitCode(failed bool) int {
	if failed {
		return 1
	}
	return 0
}
