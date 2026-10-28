# Tinkerpad build helpers
#
#   make build       Production app → build/bin/
#   make build-fast  Skip frontend/bindings when dist is fresh (Go-only rebuild)
#   make dev         Live development (wails dev)
#   make frontend    Install + build the Vite UI
#   make generate    Regenerate frontend/wailsjs bindings
#   make phar        Rebuild resources/bin/php.phar
#   make clean       Remove frontend dist and build output

WAILS_VERSION ?= v2.9.3
VERSION       ?= dev
ENCRYPT_SECRET ?=

# Prefer an explicit WAILS=..., then PATH, then $(go env GOPATH)/bin/wails
GOPATH_BIN := $(shell go env GOPATH 2>/dev/null)/bin
ifeq ($(origin WAILS),command line)
# keep user-provided WAILS
else ifneq ($(shell command -v wails 2>/dev/null),)
WAILS := wails
else ifneq ($(wildcard $(GOPATH_BIN)/wails),)
WAILS := $(GOPATH_BIN)/wails
else
WAILS := wails
endif

export CGO_ENABLED := 1
# So child shells (and tools that search PATH) find a Go-installed wails
export PATH := $(GOPATH_BIN):$(PATH)

RELEASE_REPO ?= martinshaw/tinkerpad

LDFLAGS := -X main.version=$(VERSION) -X tinkerpad/backend/updater.releaseRepo=$(RELEASE_REPO)
ifneq ($(ENCRYPT_SECRET),)
LDFLAGS += -X tinkerpad/backend/encrypt.secret=$(ENCRYPT_SECRET)
endif

# -m skips `go mod tidy` on every build (large win; run tidy yourself when deps change)
WAILS_BUILD_FLAGS := -m
ifeq ($(SKIP_FRONTEND),1)
WAILS_BUILD_FLAGS += -s
endif
ifeq ($(SKIP_BINDINGS),1)
WAILS_BUILD_FLAGS += -skipbindings
endif

.PHONY: help deps install-wails check-wails frontend frontend-if-stale generate build build-fast build-go dev phar clean

help:
	@echo "Targets:"
	@echo "  make deps           Install frontend packages (bun)"
	@echo "  make install-wails  Install Wails CLI $(WAILS_VERSION)"
	@echo "  make frontend       bun install + bun run build"
	@echo "  make generate       wails generate module"
	@echo "  make build          Production build (build/bin/)"
	@echo "  make build-fast     Rebuild app; skip Vite/bindings if frontend/dist is fresh"
	@echo "  make build-go       Go/app only (−s −skipbindings); requires existing frontend/dist"
	@echo "  make dev            wails dev"
	@echo "  make phar           Rebuild resources/bin/php.phar"
	@echo "  make clean          Remove frontend/dist and build/bin"
	@echo ""
	@echo "Optional: VERSION=v1.2.3 ENCRYPT_SECRET=... make build"
	@echo "          SKIP_FRONTEND=1 SKIP_BINDINGS=1 make build"
	@echo "Wails binary: $(WAILS)"

deps:
	cd frontend && bash scripts/ensure-deps.sh

install-wails:
	go install github.com/wailsapp/wails/v2/cmd/wails@$(WAILS_VERSION)
	@echo "Installed to $(GOPATH_BIN)/wails"
	@echo "If 'wails' is not found in your shell, add this to your PATH:"
	@echo "  export PATH=\"\$$(go env GOPATH)/bin:\$$PATH\""

check-wails:
	@command -v $(WAILS) >/dev/null 2>&1 || { \
		echo "wails not found. Run: make install-wails"; \
		echo "Or add Go's bin dir to PATH: export PATH=\"\$$(go env GOPATH)/bin:\$$PATH\""; \
		exit 1; \
	}

frontend: deps
	cd frontend && bun run build

# Rebuild Vite only when sources are newer than dist (or dist is missing).
frontend-if-stale:
	@dist=frontend/dist/index.html; \
	if [ ! -f "$$dist" ]; then \
		echo "frontend/dist missing → building"; \
		$(MAKE) frontend; \
	elif find frontend/src frontend/index.html frontend/vite.config.ts frontend/package.json frontend/tailwind.config.* frontend/postcss.config.* \
		-type f -newer "$$dist" 2>/dev/null | grep -q .; then \
		echo "frontend sources changed → building"; \
		$(MAKE) frontend; \
	else \
		echo "frontend/dist up to date"; \
	fi

generate: check-wails
	$(WAILS) generate module

build: check-wails
	$(WAILS) build $(WAILS_BUILD_FLAGS) -ldflags "$(LDFLAGS)"

# Typical local loop after UI is already built: skip Vite + binding regen.
build-fast: check-wails frontend-if-stale
	$(WAILS) build -s -skipbindings -m -ldflags "$(LDFLAGS)"

# Force Go-only package (fails embedding if dist missing).
build-go: check-wails
	@test -f frontend/dist/index.html || { echo "frontend/dist missing; run: make frontend"; exit 1; }
	$(WAILS) build -s -skipbindings -m -ldflags "$(LDFLAGS)"

dev: deps check-wails
	$(WAILS) generate module
	$(WAILS) dev

phar:
	cd php && composer install --no-interaction
	cd php && vendor/bin/box compile

clean:
	rm -rf frontend/dist build/bin
