#!/usr/bin/env bash
# Skip bun install when deps already match the lockfile.
set -euo pipefail
cd "$(dirname "$0")/.."

MARKER=node_modules/.tinkerpad-deps-ok

if [[ -d node_modules && -f bun.lockb && -e node_modules/.bin/vite && -f $MARKER ]]; then
  if [[ ! bun.lockb -nt $MARKER && ! package.json -nt $MARKER ]]; then
    exit 0
  fi
fi

bun install --frozen-lockfile
mkdir -p node_modules
touch "$MARKER"
