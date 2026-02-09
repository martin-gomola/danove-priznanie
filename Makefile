# Daňové priznanie — DPFO typ B 2025

.PHONY: help dev commit build deploy deploy-clean up down stop logs status

# Optional: compose env file (same pattern as homelab-services — .env next to docker-compose.yml)
ENV_FILE := .env
COMPOSE := docker compose
ifneq ("$(wildcard $(ENV_FILE))","")
COMPOSE := docker compose --env-file $(ENV_FILE)
endif

# Enable Docker BuildKit (faster builds, better cache) — ref: beskarfolio
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export BUILDKIT_PROGRESS=plain

# Default target
help:
	@echo "📋 Daňové priznanie — DPFO typ B 2025"
	@echo "======================================"
	@echo ""
	@echo "🚀 LOCAL:"
	@echo "   make dev       - Run dev server (npm run dev, port 3015)"
	@echo "   make commit   - Stage all and commit (interactive)"
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
	@echo "📍 After deploy: http://localhost:3015"

# ─── Local development ─────────────────────────────────────────────────────

dev:
	npm run dev

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

# ─── Docker (deploy on server: git pull && make deploy) — ref: beskarfolio ──

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
	@echo "✅ Deployment complete!"
	@echo "🌐 App: http://localhost:3015"
	@echo ""
	@echo "💡 Check status: make status"
	@echo "💡 View logs: make logs"

# Deploy with clean cache (use when npm/Docker cache causes issues)
deploy-clean:
	@echo "🧹 Clearing Docker build cache..."
	docker builder prune -f
	@echo "🚀 Deploying with fresh cache..."
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d --remove-orphans
	@echo ""
	@echo "✅ Clean deployment complete!"
	@echo "🌐 App: http://localhost:3015"

# Start containers (assumes already built)
up:
	@echo "🚀 Starting containers..."
	$(COMPOSE) up -d
	@echo "✅ App running at http://localhost:3015"

# Stop and remove containers
down:
	@echo "🛑 Stopping containers..."
	$(COMPOSE) down
	@echo "✅ All containers stopped"

stop: down

# Follow app logs
logs:
	@echo "📋 Showing logs (Ctrl+C to exit)..."
	$(COMPOSE) logs -f app

# Container status
status:
	@echo "📊 Service status:"
	@echo ""
	$(COMPOSE) ps
	@echo ""
	@echo "🏥 Health:"
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:3015 2>/dev/null | grep -q 200 && echo "✅ App: Responding (port 3015)" || echo "❌ App: Not responding on port 3015"
	@echo ""
	@echo "💡 Use 'make logs' for detailed logs"
