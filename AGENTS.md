# Tinkerpad — agent notes

Desktop PHP playground (Go/Wails + Solid.js + embedded PHP PHAR). Prefer small, targeted edits.

## Layout

| Path | Role |
| --- | --- |
| `backend/` | Go services (PHP run/session, SSH, Docker, settings, favorites, projects) |
| `frontend/src/` | Solid.js UI (stores, Monaco editor, status bar) |
| `php/` | Runner source (PsySH session / one-shot). **Not** what the app executes until rebuilt |
| `resources/bin/` | Embedded `php.phar` + `phpactor.phar` (binaries; do not hand-edit) |
| `main.go` | Wails app entry; embeds `frontend/dist` and `resources/` |

## Commands

```bash
make help
make frontend          # bun install + build → frontend/dist
make generate          # wails generate module → frontend/wailsjs
make build             # production app → build/bin/
make dev               # wails dev
make phar              # rebuild resources/bin/php.phar after php/ changes
```

## Critical gotchas

1. **PHAR is the runtime.** Changes under `php/` are dead until `make phar`, then rebuild/restart the app (embed + extract to `~/Library/Application Support/Tinkerpad/`).
2. **Do not set `cmd.Dir` to the user project** when spawning the runner; the runner loads its PHAR autoload then `chdir`s. Starting in the project cwd can load the wrong `vendor/autoload.php`.
3. **Wails bindings** live in gitignored `frontend/wailsjs` — regenerate, never invent APIs that are not in Go `Boot`/exported methods.
4. **Solid stores:** clearing a field to “unset” must use path form `setStore('tabs', pred, 'sshConn', undefined)`; object merges drop `undefined` keys.
5. Prefer `make build` / `make phar` over ad-hoc `go build` when verifying the desktop app.

## Releases / updates

- CI: `.github/workflows/release.yml` (tag `v*` or workflow_dispatch) publishes macOS DMG, Linux deb/AppImage, Windows zip to GitHub Releases.
- Updater (`backend/updater`) uses `https://api.github.com/repos/martinshaw/tinkerpad/releases/latest` (override with `-X tinkerpad/backend/updater.releaseRepo=owner/name`).

## Context hygiene

Ignore bulky trees (`node_modules`, `vendor`, `dist`, `*.phar`, `build/bin`). Read source under `backend/`, `frontend/src/`, `php/src/`, and `main.go` instead.
