package appmenu

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const eventName = "menu:command"

// Build returns the application menu. Call Bind before the window is shown so
// click handlers can emit events to the frontend.
func Build() *menu.Menu {
	m := menu.NewMenu()
	m.Append(menu.AppMenu())

	file := m.AddSubmenu("File")
	file.AddText("New Tab", keys.CmdOrCtrl("t"), emit("new-tab"))
	file.AddText("Open PHP File…", keys.CmdOrCtrl("o"), emit("open-php-file"))
	file.AddText("Open Directory…", keys.Combo("o", keys.CmdOrCtrlKey, keys.ShiftKey), emit("open-directory"))
	file.AddSeparator()
	file.AddText("Save", keys.CmdOrCtrl("s"), emit("save"))
	file.AddText("Save As…", keys.Combo("s", keys.CmdOrCtrlKey, keys.ShiftKey), emit("save-as"))
	file.AddSeparator()
	file.AddText("Close Tab", keys.CmdOrCtrl("w"), emit("close-tab"))

	m.Append(menu.EditMenu())

	view := m.AddSubmenu("View")
	view.AddText("Editor", keys.CmdOrCtrl("1"), emit("screen-code"))
	view.AddText("Favorites", keys.CmdOrCtrl("2"), emit("screen-favorites"))
	view.AddText("History", keys.CmdOrCtrl("3"), emit("screen-history"))
	view.AddText("Projects", keys.CmdOrCtrl("4"), emit("screen-projects"))
	view.AddText("SSH", keys.CmdOrCtrl("5"), emit("screen-ssh"))
	view.AddText("Docker", keys.CmdOrCtrl("6"), emit("screen-docker"))
	view.AddText("Database", keys.CmdOrCtrl("7"), emit("screen-database"))
	view.AddText("Settings…", keys.CmdOrCtrl(","), emit("screen-settings"))
	view.AddSeparator()
	view.AddText("Toggle Output", keys.CmdOrCtrl("u"), emit("toggle-result"))
	view.AddText("Toggle Layout", keys.CmdOrCtrl("l"), emit("toggle-layout"))
	view.AddText("Toggle File Tree", keys.CmdOrCtrl("b"), emit("toggle-file-tree"))
	view.AddSeparator()
	view.AddText("Zoom In", keys.CmdOrCtrl("="), emit("zoom-in"))
	view.AddText("Zoom Out", keys.CmdOrCtrl("-"), emit("zoom-out"))
	view.AddText("Actual Size", keys.CmdOrCtrl("0"), emit("zoom-reset"))
	view.AddSeparator()
	view.AddText("Output: Tree", keys.Combo("1", keys.CmdOrCtrlKey, keys.OptionOrAltKey), emit("output-structured"))
	view.AddText("Output: Raw", keys.Combo("2", keys.CmdOrCtrlKey, keys.OptionOrAltKey), emit("output-raw"))
	view.AddText("Output: JSON", keys.Combo("3", keys.CmdOrCtrlKey, keys.OptionOrAltKey), emit("output-json"))
	view.AddText("Output: Table", keys.Combo("4", keys.CmdOrCtrlKey, keys.OptionOrAltKey), emit("output-table"))
	view.AddText("Output: SQL", keys.Combo("5", keys.CmdOrCtrlKey, keys.OptionOrAltKey), emit("output-queries"))

	run := m.AddSubmenu("Run")
	run.AddText("Run Code", keys.CmdOrCtrl("r"), emit("run"))
	run.AddText("Execute Until Selected Line", keys.CmdOrCtrl("Enter"), emit("run-until-line"))
	run.AddSeparator()
	run.AddText("Toggle Persistent Session", keys.Combo("p", keys.CmdOrCtrlKey, keys.ShiftKey), emit("toggle-persistent"))
	run.AddText("Reset Session", keys.Combo("r", keys.CmdOrCtrlKey, keys.ShiftKey), emit("reset-session"))
	run.AddText("Toggle Query Log", keys.Combo("q", keys.CmdOrCtrlKey, keys.ShiftKey), emit("toggle-query-log"))
	run.AddText("Toggle Dump Assignments", keys.Combo("i", keys.CmdOrCtrlKey, keys.ShiftKey), emit("toggle-dump-assignments"))
	run.AddText("Toggle Dump Logs", keys.Combo("o", keys.CmdOrCtrlKey, keys.ShiftKey), emit("toggle-dump-logs"))
	run.AddText("Toggle Compare Runs", keys.Combo("d", keys.CmdOrCtrlKey, keys.ShiftKey), emit("toggle-compare"))

	workspace := m.AddSubmenu("Workspace")
	workspace.AddText("Open PHP File…", nil, emit("open-php-file"))
	workspace.AddText("Open Directory…", nil, emit("open-directory"))
	workspace.AddText("Use Local PHP", nil, emit("use-local-php"))
	workspace.AddSeparator()
	workspace.AddText("Manage Projects…", nil, emit("screen-projects"))
	workspace.AddText("Manage SSH…", nil, emit("screen-ssh"))
	workspace.AddText("Manage Docker…", nil, emit("screen-docker"))
	workspace.AddText("Database…", nil, emit("screen-database"))

	m.Append(menu.WindowMenu())

	help := m.AddSubmenu("Help")
	help.AddText("About Tinkerpad", nil, emit("about"))
	help.AddSeparator()
	help.AddText("Check for Updates…", nil, emit("check-updates"))
	help.AddText("GitHub Releases", nil, emit("open-releases"))
	help.AddText("View on GitHub", nil, emit("open-repo"))

	return m
}

var appCtx context.Context

// Bind stores the runtime context used by menu click handlers.
func Bind(ctx context.Context) {
	appCtx = ctx
}

func emit(command string) menu.Callback {
	return func(_ *menu.CallbackData) {
		if appCtx == nil {
			return
		}
		runtime.EventsEmit(appCtx, eventName, command)
	}
}
