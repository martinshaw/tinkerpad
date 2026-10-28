![Tinkerpad](assets/logo.png)

# Tinkerpad

![License](https://img.shields.io/github/license/martinshaw/tinkerpad)
![GitHub release](https://img.shields.io/github/release/martinshaw/tinkerpad)
![GitHub All Releases](https://img.shields.io/github/downloads/martinshaw/tinkerpad/total)
![GitHub stars](https://img.shields.io/github/stars/martinshaw/tinkerpad)
![GitHub forks](https://img.shields.io/github/forks/martinshaw/tinkerpad)

**A fast desktop PHP playground for local, SSH, and Docker workspaces.**

## Get started

### 1. Install

Download the latest release for your OS:

| Platform | Package |
| --- | --- |
| macOS | `.dmg` (universal) |
| Linux | `.deb` / `.AppImage` (amd64 / arm64) |
| Windows | `.zip` (amd64) |

→ [GitHub Releases](https://github.com/martinshaw/tinkerpad/releases)

### 2. Open a workspace

1. Launch **Tinkerpad**.
2. Use the status bar **workspace** control to pick:
   - a **local** project folder,
   - a **Docker** container, or
   - an **SSH** connection.
3. Write PHP in the editor and press **Run** (or your run shortcut).

Local runs need a PHP binary on your machine (or set one in Settings). Docker and SSH use PHP inside that environment.

### 3. Read the result

Switch output mode in the status bar: **Tree**, **Raw**, **JSON**, **Table**, or **SQL**. Use the **View** (`…`) menu for layout, compare, file tree, and dump options.

That’s it — open more tabs, pin the ones you keep, or drag a tab to a pane edge to split the editor.

---

## Features

### Workspaces & projects

* **Local, SSH, and Docker** — each tab has its own workspace; switch without losing code.
* **Saved projects** — name, color, and reopen common apps quickly.
* **Laravel Herd** — parked sites can seed the recent-dirs list on first launch (macOS).
* **File tree** — browse and open PHP files from the current project; optional rail when collapsed.

### Editor & sessions

* **Monaco editor** with Phpactor autocomplete.
* **Persistent sessions** — keep variables between runs (toggle per tab).
* **Run until line** — execute only up to the cursor/line.
* **Allow writes** — opt in when you need filesystem/DB side effects.
* **Query log**, **dump assignments**, and **dump logs** — session tools for Laravel-style debugging.
* **Align assignment output** — line up dump cards with `$x =` / `Log::` lines in the editor.
* **Multi-pane editing** — drag a tab to a left/right/top/bottom edge to split (max two panes); move or merge panes from the tab context menu.
* **Pin tabs**, close others / to the left / to the right.

### Output

* **Tree** — Symfony VarDumper cards with copy/export actions.
* **Raw**, **JSON**, **Table**, and **SQL/query** views.
* **Compare** previous vs current raw output.
* Captured `Log::` messages show level colors in Tree / JSON / Table.

### UI & settings

* **Light, dark, and high-contrast themes** with a theme gallery.
* **Font gallery** for editor fonts.
* **Native-feeling menus** — View and Runtime popovers; app menu wiring (About, updates).
* **Startup chrome** matches your theme (no white flash on dark themes).
* **In-app updater** via GitHub Releases for this repo (`martinshaw/tinkerpad`).

### Favorites & history

* Save favorite snippets and reopen them later.
* History of recent runs to jump back when needed.

---

## Updates

When a newer release is published, the title bar can show **Update** and open a download dialog for your OS. You can also check from **Help → About Tinkerpad**.

### Publishing a release (maintainers)

```shell
git tag v1.0.0
git push origin v1.0.0
```

Or run the **Release** workflow from the Actions tab (`workflow_dispatch`). CI builds macOS, Linux (amd64/arm64), and Windows artifacts and attaches them to the GitHub Release.

---

## Build from source

### Prerequisites

* [Go](https://go.dev/dl/) 1.24+
* [Bun](https://bun.sh/) (CI uses 1.1.38)
* [Wails CLI](https://wails.io/docs/gettingstarted/installation) v2.9.3
* PHP 8.x on your `PATH`
* [Composer](https://getcomposer.org/) (only to rebuild `resources/bin/php.phar`)

```shell
go install github.com/wailsapp/wails/v2/cmd/wails@v2.9.3
```

**macOS:** Xcode Command Line Tools. **Linux:** GTK/WebKit dev packages. **Windows:** CGO toolchain + WebView2.

### Build

```shell
git clone https://github.com/martinshaw/tinkerpad.git
cd tinkerpad
make install-wails   # once, if needed
make build           # → build/bin/
```

Development with live reload:

```shell
make dev
```

After changing `php/`, rebuild the embedded runner:

```shell
make phar
```

`make help` lists all targets. Optional: `VERSION=v1.0.0 ENCRYPT_SECRET=… make build`.

---

## Project layout

| Path | Role |
| --- | --- |
| `backend/` | Go services (PHP run/session, SSH, Docker, settings, favorites, projects) |
| `frontend/` | Solid.js + Vite + Monaco UI |
| `php/` | PHP session / one-shot runner (PsySH, VarDumper) |
| `resources/bin/` | Embedded `php.phar` and `phpactor.phar` |
| `build/` | Icons, platform packaging assets; output under `bin/` |

## Troubleshooting

**macOS “can’t open” after install** — System Settings → Privacy & Security → **Open Anyway**, or:

```shell
sudo xattr -d com.apple.quarantine /Applications/Tinkerpad.app
```

`pattern frontend/dist: no matching files found` — run `make frontend` once before embedding/`go build`.

**Local PHP snippets fail** — set a PHP binary in Settings, or use Docker / SSH.

**Autocomplete missing** — confirm `resources/bin/phpactor.phar` exists and the tab’s working directory is a PHP project Phpactor can index.

---

## Author

**Martin Shaw** — [hello@martinshaw.co](mailto:hello@martinshaw.co) · [martinshaw/tinkerpad](https://github.com/martinshaw/tinkerpad)
