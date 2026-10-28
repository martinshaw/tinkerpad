package herd

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
)

type valetConfig struct {
	Paths []string `json:"paths"`
}

type herdConfig struct {
	LastSite string `json:"lastSite"`
}

// ListSites returns unique Laravel Herd parked/linked site directories.
// Paths come from Herd's valet config (and ~/Herd when present). Symlinks in
// valet/Sites are resolved and deduplicated by real path.
func ListSites() []string {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return nil
	}

	parkRoots := make([]string, 0, 4)
	for _, cfgPath := range valetConfigPaths(home) {
		for _, path := range readValetPaths(cfgPath) {
			parkRoots = append(parkRoots, cleanPath(path))
		}
	}

	herdHome := filepath.Join(home, "Herd")
	if isDir(herdHome) {
		parkRoots = append(parkRoots, herdHome)
	}

	parkRoots = uniquePaths(parkRoots)
	if len(parkRoots) == 0 {
		return nil
	}

	byReal := map[string]bool{}
	for _, root := range parkRoots {
		entries, err := os.ReadDir(root)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			name := entry.Name()
			if name == "" || strings.HasPrefix(name, ".") {
				continue
			}
			full := filepath.Join(root, name)
			info, err := os.Stat(full)
			if err != nil || !info.IsDir() {
				continue
			}
			real := resolvePath(full)
			if real == "" || !isDir(real) {
				continue
			}
			byReal[real] = true
		}
	}

	sites := make([]string, 0, len(byReal))
	for path := range byReal {
		sites = append(sites, path)
	}
	sort.Slice(sites, func(i, j int) bool {
		return strings.ToLower(filepath.Base(sites[i])) < strings.ToLower(filepath.Base(sites[j]))
	})

	lastSite := resolvePath(readLastSite(home))
	if lastSite == "" || !byReal[lastSite] {
		return sites
	}

	out := make([]string, 0, len(sites))
	out = append(out, lastSite)
	for _, path := range sites {
		if path == lastSite {
			continue
		}
		out = append(out, path)
	}
	return out
}

func valetConfigPaths(home string) []string {
	switch runtime.GOOS {
	case "darwin":
		return []string{
			filepath.Join(home, "Library", "Application Support", "Herd", "config", "valet", "config.json"),
		}
	case "windows":
		return []string{
			filepath.Join(home, "AppData", "Roaming", "Herd", "config", "valet", "config.json"),
			filepath.Join(home, ".config", "herd", "config", "valet", "config.json"),
		}
	default:
		return []string{
			filepath.Join(home, ".config", "herd", "config", "valet", "config.json"),
		}
	}
}

func herdJsonPath(home string) string {
	switch runtime.GOOS {
	case "darwin":
		return filepath.Join(home, "Library", "Application Support", "Herd", "config", "herd.json")
	case "windows":
		return filepath.Join(home, "AppData", "Roaming", "Herd", "config", "herd.json")
	default:
		return filepath.Join(home, ".config", "herd", "config", "herd.json")
	}
}

func readValetPaths(configPath string) []string {
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil
	}
	var cfg valetConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil
	}
	return cfg.Paths
}

func readLastSite(home string) string {
	data, err := os.ReadFile(herdJsonPath(home))
	if err != nil {
		return ""
	}
	var cfg herdConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return ""
	}
	return strings.TrimSpace(cfg.LastSite)
}

func cleanPath(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return ""
	}
	return filepath.Clean(path)
}

func resolvePath(path string) string {
	path = cleanPath(path)
	if path == "" {
		return ""
	}
	real, err := filepath.EvalSymlinks(path)
	if err != nil {
		return path
	}
	return real
}

func isDir(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func uniquePaths(paths []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(paths))
	for _, path := range paths {
		path = cleanPath(path)
		if path == "" || seen[path] {
			continue
		}
		seen[path] = true
		out = append(out, path)
	}
	return out
}
