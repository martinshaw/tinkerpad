package updater

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path"
	goruntime "runtime"
	"strings"
	"time"
	"tinkerpad/backend/logger"
	"tinkerpad/backend/settings"

	"github.com/adrg/xdg"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.org/x/mod/semver"
)

// Overridable via -ldflags "-X tinkerpad/backend/updater.releaseRepo=owner/name"
var releaseRepo = "martinshaw/tinkerpad"

type Updater struct {
	ctx      context.Context
	settings *settings.Settings
	log      *logger.Logger
}

type githubRelease struct {
	TagName string        `json:"tag_name"`
	Name    string        `json:"name"`
	Body    string        `json:"body"`
	HtmlUrl string        `json:"html_url"`
	Assets  []githubAsset `json:"assets"`
}

type githubAsset struct {
	Name string `json:"name"`
	Url  string `json:"browser_download_url"`
}

type UpdateInfo struct {
	Version    string `json:"version"`
	Body       string `json:"body"`
	Url        string `json:"url"`
	ReleaseUrl string `json:"releaseUrl"`
	AssetName  string `json:"assetName"`
}

func New() *Updater {
	return &Updater{}
}

func (u *Updater) Boot(ctx context.Context, s *settings.Settings, l *logger.Logger) {
	u.ctx = ctx
	u.settings = s
	u.log = l
}

func (u *Updater) CheckUpdate() {
	api := fmt.Sprintf("https://api.github.com/repos/%s/releases/latest", releaseRepo)
	req, err := http.NewRequest(http.MethodGet, api, nil)
	if err != nil {
		u.log.Errorf("error creating release request: %v", err)
		return
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "tinkerpad-updater")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	client := &http.Client{Timeout: 20 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		u.log.Errorf("error fetching latest release: %v", err)
		return
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		u.log.Errorf("error fetching latest release: status %d", res.StatusCode)
		return
	}

	var r githubRelease
	if err := json.NewDecoder(res.Body).Decode(&r); err != nil {
		u.log.Errorf("invalid release data: %v", err)
		return
	}

	latest := normalizeVersion(r.TagName)
	current := normalizeVersion(u.settings.GetAppVersion())
	if !semver.IsValid(latest) {
		u.log.Errorf("latest release tag is not semver: %s", r.TagName)
		return
	}
	if semver.IsValid(current) && semver.Compare(current, latest) >= 0 {
		return
	}

	asset := pickAsset(r.Assets)
	info := UpdateInfo{
		Version:    latest,
		Body:       strings.TrimSpace(r.Body),
		ReleaseUrl: r.HtmlUrl,
	}
	if info.ReleaseUrl == "" {
		info.ReleaseUrl = fmt.Sprintf("https://github.com/%s/releases/latest", releaseRepo)
	}
	if asset != nil {
		info.Url = asset.Url
		info.AssetName = asset.Name
	}

	runtime.EventsEmit(u.ctx, "update-available", info)
}

func (u *Updater) DownloadUpdate(url string) error {
	if url == "" {
		return fmt.Errorf("no download url for this platform")
	}

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "tinkerpad-updater")
	req.Header.Set("Accept", "application/octet-stream")

	client := &http.Client{Timeout: 10 * time.Minute}
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("download failed: status %d", res.StatusCode)
	}

	name := path.Base(strings.Split(url, "?")[0])
	destDir := xdg.UserDirs.Download
	if destDir == "" {
		home, _ := os.UserHomeDir()
		destDir = path.Join(home, "Downloads")
	}
	dest := path.Join(destDir, name)
	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err = io.Copy(out, res.Body); err != nil {
		return err
	}
	_ = out.Close()

	return openDownloaded(dest)
}

func (u *Updater) OpenReleasePage(url string) {
	if url == "" {
		url = fmt.Sprintf("https://github.com/%s/releases/latest", releaseRepo)
	}
	runtime.BrowserOpenURL(u.ctx, url)
}

func (u *Updater) ReleasesURL() string {
	return fmt.Sprintf("https://github.com/%s/releases", releaseRepo)
}

func normalizeVersion(v string) string {
	v = strings.TrimSpace(v)
	if v == "" || v == "dev" {
		return "v0.0.0-dev"
	}
	if !strings.HasPrefix(v, "v") {
		v = "v" + v
	}
	return v
}

func pickAsset(assets []githubAsset) *githubAsset {
	osName := goruntime.GOOS
	arch := goruntime.GOARCH

	score := func(name string) int {
		n := strings.ToLower(name)
		s := 0
		switch osName {
		case "darwin":
			if strings.HasSuffix(n, ".dmg") {
				s += 100
			}
			if strings.Contains(n, "darwin") || strings.Contains(n, "mac") {
				s += 20
			}
			if strings.Contains(n, "universal") {
				s += 10
			}
			if strings.Contains(n, arch) {
				s += 5
			}
		case "linux":
			if strings.Contains(n, "linux") {
				s += 20
			}
			if strings.Contains(n, arch) {
				s += 30
			}
			if strings.HasSuffix(n, ".appimage") {
				s += 100
			} else if strings.HasSuffix(n, ".deb") {
				s += 80
			}
		case "windows":
			if strings.Contains(n, "windows") || strings.Contains(n, "win") {
				s += 20
			}
			if strings.Contains(n, arch) || strings.Contains(n, "amd64") || strings.Contains(n, "x64") {
				s += 20
			}
			if strings.HasSuffix(n, ".zip") {
				s += 100
			} else if strings.HasSuffix(n, ".exe") {
				s += 90
			} else if strings.HasSuffix(n, ".msi") {
				s += 80
			}
		}
		return s
	}

	var best *githubAsset
	bestScore := 0
	for i := range assets {
		s := score(assets[i].Name)
		if s > bestScore {
			bestScore = s
			best = &assets[i]
		}
	}
	if bestScore < 80 {
		return nil
	}
	return best
}

func openDownloaded(filePath string) error {
	switch goruntime.GOOS {
	case "darwin":
		_, err := exec.Command("open", filePath).Output()
		return err
	case "windows":
		_, err := exec.Command("cmd", "/C", "start", "", filePath).Output()
		return err
	default:
		_, err := exec.Command("xdg-open", filePath).Output()
		return err
	}
}
