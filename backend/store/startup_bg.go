package store

import (
	"encoding/json"
	"os/exec"
	"strconv"
	"strings"
	"tinkerpad/backend/storage"

	"github.com/wailsapp/wails/v2/pkg/options"
)

type generalThemeBlob struct {
	ThemeInfo *struct {
		Colors *struct {
			Background string `json:"background"`
		} `json:"colors"`
	} `json:"themeInfo"`
}

// StartupBackgroundColour returns the last-used editor background so the native
// window does not flash white before the frontend mounts. Falls back to the
// system appearance when no saved theme exists.
func StartupBackgroundColour(stg *storage.Storage) *options.RGBA {
	if data, err := stg.Load("store", "general.json"); err == nil && len(data) > 0 {
		var blob generalThemeBlob
		if json.Unmarshal(data, &blob) == nil {
			if bg := blob.ThemeInfo; bg != nil && bg.Colors != nil {
				if c := parseHexRGBA(bg.Colors.Background); c != nil {
					return c
				}
			}
		}
	}

	if systemPrefersDark() {
		return &options.RGBA{R: 30, G: 30, B: 30, A: 255}
	}
	return &options.RGBA{R: 255, G: 255, B: 255, A: 255}
}

func systemPrefersDark() bool {
	out, err := exec.Command("defaults", "read", "-g", "AppleInterfaceStyle").Output()
	if err != nil {
		return false
	}
	return strings.Contains(strings.ToLower(string(out)), "dark")
}

func parseHexRGBA(raw string) *options.RGBA {
	s := strings.TrimSpace(raw)
	if s == "" {
		return nil
	}
	if strings.HasPrefix(s, "#") {
		s = s[1:]
	}
	// Monaco sometimes stores without '#'; expand shorthand.
	switch len(s) {
	case 3:
		s = string([]byte{s[0], s[0], s[1], s[1], s[2], s[2]})
	case 4:
		s = string([]byte{s[0], s[0], s[1], s[1], s[2], s[2], s[3], s[3]})
	case 6, 8:
		// ok
	default:
		return nil
	}

	r, err1 := strconv.ParseUint(s[0:2], 16, 8)
	g, err2 := strconv.ParseUint(s[2:4], 16, 8)
	b, err3 := strconv.ParseUint(s[4:6], 16, 8)
	if err1 != nil || err2 != nil || err3 != nil {
		return nil
	}
	a := uint64(255)
	if len(s) == 8 {
		if parsed, err := strconv.ParseUint(s[6:8], 16, 8); err == nil {
			a = parsed
		}
	}
	return &options.RGBA{R: uint8(r), G: uint8(g), B: uint8(b), A: uint8(a)}
}
