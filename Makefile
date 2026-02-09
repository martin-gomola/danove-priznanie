# Daňové priznanie - DPFO typ B 2025

.PHONY: help dev test test-schema commit build deploy deploy-clean up down stop logs status

# Optional: compose env file (same pattern as homelab-services - .env next to docker-compose.yml)
ENV_FILE := .env
COMPOSE := docker compose
ifneq ("$(wildcard $(ENV_FILE))","")
COMPOSE := docker compose --env-file $(ENV_FILE)
endif

# Enable Docker BuildKit (faster builds, better cache) - ref: beskarfolio
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export BUILDKIT_PROGRESS=plain

# Default target
help:
	@echo "📋 Daňové priznanie - DPFO typ B 2025"
	@echo "======================================"
	@echo ""
	@echo "🚀 LOCAL:"
	@echo "   make dev          - Run dev server (npm run dev, port 3015)"
	@echo "   make test         - Run all tests"
	@echo "   make test-schema  - Validate XML against official XSD schema"
	@echo "   make commit       - Stage all and commit (interactive)"
	@echo ""
	@echo "🐳 DOCKER (deploy on server: git pull && make deploy):"
	@echo "   make deploy   - Build and start app (port 3015)"
	@echo "   make build   - Build image only"
	@echo "   make up      - Start containers (already built)"
	@echo "   make down    - Stop and remove containers"
	@echo "   make stop    - Same as down"
	@echo "   make logs    - Follow app logs"
	@echo "   make status  - Show container status"
	@echo "   make deploy-clean - Rebuild with no cache (when things break)"
	@echo ""
	@echo "📍 After deploy: http://localhost:<SERVICE_PORT> (default 3015)"

# ─── Local development ─────────────────────────────────────────────────────

dev:
	npm run dev

test:
	npx vitest run

test-schema:
	npx vitest run tests/xsd-validation.test.ts

# Stage all changes and commit (interactive)
commit:
	@echo "📝 Staging all changes..."
	@git add -A
	@echo ""
	@echo "💬 Enter commit message:"
	@bash -c 'read -p "> " msg; if [ -z "$$msg" ]; then echo "❌ Commit cancelled (empty message)"; exit 1; fi; git commit -m "$$msg"'
	@echo ""
	@echo "✅ Committed successfully!"
	@echo "💡 To push: git push"

# ─── Docker (deploy on server: git pull && make deploy) - ref: beskarfolio ──

# Build image only
build:
	@echo "🔨 Building Docker image..."
	$(COMPOSE) build
	@echo "✅ Build complete!"

# Deploy: build and run in background (single command like beskarfolio)
deploy:
	@echo "🚀 Deploying Daňové priznanie..."
	@echo "💡 Using BuildKit for optimized builds"
	@echo ""
	$(COMPOSE) up -d --build --remove-orphans
	@echo ""
	@PORT=$$(grep -s '^SERVICE_PORT=' .env | cut -d= -f2); PORT=$${PORT:-3015}; \
	 echo "✅ Deployment complete!"; \
	 echo "🌐 App: http://localhost:$$PORT"; \
	 echo ""; \
	 echo "💡 Check status: make status"; \
	 echo "💡 View logs: make logs"

# Deploy with clean cache (use when npm/Docker cache causes issues)
deploy-clean:
	@echo "🧹 Clearing Docker build cache..."
	docker builder prune -f
	@echo "🚀 Deploying with fresh cache..."
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d --remove-orphans
	@echo ""
	@PORT=$$(grep -s '^SERVICE_PORT=' .env | cut -d= -f2); PORT=$${PORT:-3015}; \
	 echo "✅ Clean deployment complete!"; \
	 echo "🌐 App: http://localhost:$$PORT"

# Start containers (assumes already built)
up:
	@echo "🚀 Starting containers..."
	$(COMPOSE) up -d
	@PORT=$$(grep -s '^SERVICE_PORT=' .env | cut -d= -f2); PORT=$${PORT:-3015}; \
	 echo "✅ App running at http://localhost:$$PORT"

# Stop and remove containers
down:
	@echo "🛑 Stopping containers..."
	$(COMPOSE) down
	@echo "✅ All containers stopped"

stop: down

# Follow app logs
logs:
	@echo "📋 Showing logs (Ctrl+C to exit)..."
	$(COMPOSE) logs -f dane-priznanie

# Container status (reads SERVICE_PORT from .env, defaults to 3015)
status:
	@echo "📊 Service status:"
	@echo ""
	$(COMPOSE) ps
	@echo ""
	@echo "🏥 Health:"
	@PORT=$$(grep -s '^SERVICE_PORT=' .env | cut -d= -f2 || echo 3015); \
	 PORT=$${PORT:-3015}; \
	 wget -q --spider http://localhost:$$PORT/ 2>/dev/null \
	   && echo "✅ App: Responding (port $$PORT)" \
	   || echo "❌ App: Not responding on port $$PORT"
	@echo ""
	@echo "💡 Use 'make logs' for detailed logs"
