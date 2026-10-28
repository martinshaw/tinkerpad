package dialog

import (
	"context"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"tinkerpad/backend/logger"
	"tinkerpad/backend/settings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// DirEntry is a single file or folder returned by ListDirectory.
type DirEntry struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	IsDir bool   `json:"isDir"`
}

type Dialog struct {
	ctx      context.Context
	log      *logger.Logger
	settings *settings.Settings
}

func New() *Dialog {
	return &Dialog{}
}

func (dialog *Dialog) Boot(ctx context.Context, log *logger.Logger, settings *settings.Settings) {
	dialog.ctx = ctx
	dialog.log = log
	dialog.settings = settings
}

func (dialog *Dialog) SelectDir() string {
	dir, err := runtime.OpenDirectoryDialog(dialog.ctx, dialog.getOptions())
	if err != nil {
		dialog.log.Errorf("failed to open directory dialog: %v", err)
		return ""
	}

	return dir
}

func (dialog *Dialog) SelectFile() string {
	file, err := runtime.OpenFileDialog(dialog.ctx, dialog.getOptions())
	if err != nil {
		dialog.log.Errorf("failed to open file dialog: %v", err)
		return ""
	}

	return file
}

func (dialog *Dialog) SelectPhpBinary() string {
	phpBinary := dialog.SelectFile()

	if phpBinary == "" {
		return ""
	}

	if dialog.settings.IsValidPhpBinaryPath(phpBinary) {
		return phpBinary
	}

	return ""
}

func (dialog *Dialog) SelectDockerBinary() string {
	file := dialog.SelectFile()
	if file == "" {
		return ""
	}
	if dialog.settings.IsValidDockerBinaryPath(file) {
		return file
	}

	return ""
}

func (dialog *Dialog) OpenPhpFile() string {
	file, err := runtime.OpenFileDialog(dialog.ctx, runtime.OpenDialogOptions{
		Title: "Open PHP file",
		Filters: []runtime.FileFilter{
			{DisplayName: "PHP", Pattern: "*.php"},
		},
		DefaultDirectory:           dialog.settings.App.DefaultWorkingDir,
		ShowHiddenFiles:            true,
		TreatPackagesAsDirectories: true,
	})
	if err != nil {
		dialog.log.Errorf("failed to open php dialog: %v", err)
		return ""
	}
	return file
}

func (dialog *Dialog) SavePhpFile(defaultName string) string {
	if defaultName == "" {
		defaultName = "snippet.php"
	}
	file, err := runtime.SaveFileDialog(dialog.ctx, runtime.SaveDialogOptions{
		Title:            "Save PHP file",
		DefaultFilename:  defaultName,
		DefaultDirectory: dialog.settings.App.DefaultWorkingDir,
		Filters: []runtime.FileFilter{
			{DisplayName: "PHP", Pattern: "*.php"},
		},
		ShowHiddenFiles:            true,
		CanCreateDirectories:       true,
		TreatPackagesAsDirectories: true,
	})
	if err != nil {
		dialog.log.Errorf("failed to save php dialog: %v", err)
		return ""
	}
	return file
}

func (dialog *Dialog) ReadTextFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

var skipDirNames = map[string]struct{}{
	".git":         {},
	".svn":         {},
	".hg":          {},
	"node_modules": {},
	".DS_Store":    {},
}

func (dialog *Dialog) ListDirectory(path string) ([]DirEntry, error) {
	if path == "" {
		return nil, os.ErrInvalid
	}
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	if !info.IsDir() {
		return nil, os.ErrInvalid
	}

	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	out := make([]DirEntry, 0, len(entries))
	for _, entry := range entries {
		name := entry.Name()
		if _, skip := skipDirNames[name]; skip {
			continue
		}
		if strings.HasPrefix(name, ".") {
			continue
		}
		out = append(out, DirEntry{
			Name:  name,
			Path:  filepath.Join(path, name),
			IsDir: entry.IsDir(),
		})
	}

	sort.SliceStable(out, func(i, j int) bool {
		if out[i].IsDir != out[j].IsDir {
			return out[i].IsDir
		}
		return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
	})

	return out, nil
}

func (dialog *Dialog) WriteTextFile(path string, content string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(content), 0o644)
}

func (dialog *Dialog) OpenJsonFile() string {
	file, err := runtime.OpenFileDialog(dialog.ctx, runtime.OpenDialogOptions{
		Title: "Import snippets",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON", Pattern: "*.json"},
		},
		ShowHiddenFiles:            true,
		TreatPackagesAsDirectories: true,
	})
	if err != nil {
		dialog.log.Errorf("failed to open json dialog: %v", err)
		return ""
	}

	return file
}

func (dialog *Dialog) SaveJsonFile(defaultName string) string {
	if defaultName == "" {
		defaultName = "tinkerpad-snippets.json"
	}
	file, err := runtime.SaveFileDialog(dialog.ctx, runtime.SaveDialogOptions{
		Title:            "Export snippets",
		DefaultFilename:  defaultName,
		DefaultDirectory: dialog.settings.App.DefaultWorkingDir,
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON", Pattern: "*.json"},
		},
		ShowHiddenFiles:            true,
		CanCreateDirectories:       true,
		TreatPackagesAsDirectories: true,
	})
	if err != nil {
		dialog.log.Errorf("failed to save json dialog: %v", err)
		return ""
	}

	return file
}

// SaveExportFile opens a save dialog for exporting dump output (text/html).
func (dialog *Dialog) SaveExportFile(defaultName string) string {
	if defaultName == "" {
		defaultName = "dump.txt"
	}

	displayName := "Text"
	pattern := "*.txt"
	ext := strings.ToLower(filepath.Ext(defaultName))
	switch ext {
	case ".html", ".htm":
		displayName = "HTML"
		pattern = "*.html;*.htm"
	case ".json":
		displayName = "JSON"
		pattern = "*.json"
	case ".md":
		displayName = "Markdown"
		pattern = "*.md"
	}

	file, err := runtime.SaveFileDialog(dialog.ctx, runtime.SaveDialogOptions{
		Title:            "Export output",
		DefaultFilename:  defaultName,
		DefaultDirectory: dialog.settings.App.DefaultWorkingDir,
		Filters: []runtime.FileFilter{
			{DisplayName: displayName, Pattern: pattern},
			{DisplayName: "All files", Pattern: "*"},
		},
		ShowHiddenFiles:            true,
		CanCreateDirectories:       true,
		TreatPackagesAsDirectories: true,
	})
	if err != nil {
		dialog.log.Errorf("failed to save export dialog: %v", err)
		return ""
	}

	return file
}

func (dialog *Dialog) Confirm(msg string) bool {
	options := runtime.MessageDialogOptions{
		Type:          runtime.QuestionDialog,
		Message:       msg,
		Buttons:       []string{"Yes", "Cancel"},
		DefaultButton: "Yes",
		CancelButton:  "Cancel",
	}

	res, err := runtime.MessageDialog(dialog.ctx, options)
	if err != nil {
		dialog.log.Errorf("failed to confirm dialog: %v", err)
		return false
	}

	return res == "Yes"
}

func (dialog *Dialog) Warning(msg string) {
	options := runtime.MessageDialogOptions{
		Type:    runtime.WarningDialog,
		Message: msg,
	}

	runtime.MessageDialog(dialog.ctx, options)
}

func (dialog *Dialog) Error(msg string) {
	options := runtime.MessageDialogOptions{
		Type:    runtime.ErrorDialog,
		Message: msg,
	}

	runtime.MessageDialog(dialog.ctx, options)
}

func (dialog *Dialog) Info(msg string) {
	options := runtime.MessageDialogOptions{
		Type:    runtime.InfoDialog,
		Message: msg,
	}

	runtime.MessageDialog(dialog.ctx, options)
}

func (dialog *Dialog) getOptions() runtime.OpenDialogOptions {
	return runtime.OpenDialogOptions{
		DefaultDirectory:           dialog.settings.App.DefaultWorkingDir,
		ShowHiddenFiles:            true,
		TreatPackagesAsDirectories: true,
	}
}
