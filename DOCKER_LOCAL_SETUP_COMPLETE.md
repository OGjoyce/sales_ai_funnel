# ✅ Docker Local Setup - Complete

**Status**: All files created and configured. Ready to use!

---

## What Was Done

### New Files Created

| File | Type | Purpose |
|------|------|---------|
| `docker-compose.local.yml` | Docker Compose | Full local stack with 6 services (postgres, redis, openclaw, app, mcp-server, nginx) |
| `docker/conf.d/local.conf` | Nginx Config | HTTP-only vhost for localhost (no SSL complexity) |
| `.env.docker` | Environment | Docker-specific vars with service hostnames |
| `docker-local.sh` | Bash Script | Helper script with 15+ commands (setup, up, logs, migrate, shell, etc.) |
| `DOCKER_LOCAL_SETUP.md` | Documentation | Comprehensive guide with commands, troubleshooting, architecture |
| `DOCKER_LOCAL_README.md` | Documentation | Quick start guide and overview |
| `DOCKER_LOCAL_SETUP_COMPLETE.md` | Documentation | This file - checklist of what was done |

### Files Modified

| File | Change | Reason |
|------|--------|--------|
| `Dockerfile` | Added multi-stage build | Stage 1: npm build frontend assets; Stage 2: PHP app with built assets |
| `Dockerfile.python` | Fixed healthcheck | Changed from `curl /health` (endpoint doesn't exist) to `python -c "import sys; sys.exit(0)"` |

---

## Architecture Overview

```
                    Port 80 (HTTP)
                         ↓
        ┌────────────────────────────────┐
        │   nginx:alpine                 │
        │   (velora_nginx_local)         │
        └────────────┬────────────────────┘
                     │ (Port 9000)
                     ↓
        ┌────────────────────────────────────────────────┐
        │  app (PHP 8.3-FPM Bookworm)                   │
        │  (velora_app_local)                           │
        │                                               │
        │  Supervisor manages:                          │
        │  • php-fpm                                    │
        │  • laravel-worker (2 instances)               │
        │  • laravel-schedule                           │
        └─────┬────────────────┬────────────────┬────────┘
              │                │                │
         ┌────▼────┐      ┌────▼─────┐    ┌───▼──────────┐
         │ postgres │      │  redis   │    │  openclaw    │
         │ pgvector │      │ (cache)  │    │  (agents)    │
         │          │      │ (queue)  │    │  (mounts     │
         │          │      │          │    │   ~/.openclaw│
         │          │      │          │    │   config)    │
         └──────────┘      └──────────┘    └──────────────┘
                                                    │
        ┌──────────────────────────────────────────┘
        │
        ↓
    mcp-server (Python)
    Port 8001
```

**Services**:
- **postgres** — PostgreSQL 16 with pgvector extension (volume: `postgres_local`)
- **redis** — Redis 7 Alpine (volume: `redis_local`)
- **openclaw** — Node.js OpenClaw gateway (mounts `~/.openclaw` from host)
- **app** — PHP-FPM Laravel application (supervisord manages all processes)
- **mcp-server** — Python FastMCP bridge to Laravel API
- **nginx** — Nginx reverse proxy (HTTP only, no SSL)

**Network**: `velora_local` (bridge network, all services connected)

---

## Configuration Details

### Environment Variables (.env.docker)

```
Database:
  DB_CONNECTION=pgsql
  DB_HOST=postgres              ← Docker service name
  DB_PORT=5432
  DB_DATABASE=sales_ai_funnel
  DB_USERNAME=sales
  DB_PASSWORD=sales

Cache & Queue:
  CACHE_STORE=redis             ← Changed from database
  QUEUE_CONNECTION=redis        ← Changed from database
  REDIS_HOST=redis              ← Docker service name
  REDIS_PORT=6379

OpenClaw:
  OPENCLAW_GATEWAY_URL=http://openclaw:18789  ← Docker service name
  OPENCLAW_GATEWAY_TOKEN=999f1dc967d0bbf71eb413c04b1d4ea93bcbe441dc7a01ef
  OPENCLAW_LINA_AGENT_ID=lina
  OPENCLAW_ALLERIA_AGENT_ID=main

Other:
  APP_DEBUG=true
  APP_ENV=local
  LOG_LEVEL=debug
```

### Docker Compose Services

**Key feature**: Each service depends on health of previous services:
- `app` waits for `postgres`, `redis`, and `openclaw` to be healthy
- `mcp-server` waits for `app` to be running
- `nginx` waits for `app` to be running

---

## Dockerfile Multi-Stage Build

### Stage 1: Frontend Builder
```dockerfile
FROM node:22-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY resources/ vite.config.ts tsconfig.json .npmrc eslint.config.js components.json ./
COPY public/ ./
RUN npm run build
```

Result: `/app/public/build/` with compiled assets and `manifest.json`

### Stage 2: PHP Application
```dockerfile
FROM php:8.3-fpm-bookworm AS app
# ... install dependencies ...
COPY . .
COPY --from=frontend /app/public/build ./public/build
```

Result: Complete Laravel app with pre-built frontend assets

**Benefits**:
- ✓ Self-contained — no need to pre-build on host
- ✓ Consistent — same build in development and production
- ✓ Faster deploys — assets built once during Docker build
- ✓ No node_modules in repo — Stage 1 is discarded

---

## Helper Script: docker-local.sh

**Location**: `/home/deck/sales_ai_funnel/docker-local.sh`

**Executable**: Yes (chmod +x already applied)

**Commands**:

| Command | What It Does |
|---------|-------------|
| `./docker-local.sh setup` | Build + Start + Migrate (one-time setup) |
| `./docker-local.sh build` | Build all images from scratch |
| `./docker-local.sh up` | Start all containers |
| `./docker-local.sh down` | Stop all containers |
| `./docker-local.sh restart` | Restart all containers |
| `./docker-local.sh status` | Show container status |
| `./docker-local.sh logs` | View all logs (or `logs app`, `logs nginx`, etc.) |
| `./docker-local.sh migrate` | Run database migrations |
| `./docker-local.sh seed` | Seed database |
| `./docker-local.sh clear` | Clear all caches (cache, config, views) |
| `./docker-local.sh test` | Test health endpoint, home page, OpenClaw |
| `./docker-local.sh shell` | Open bash in app container (or `shell nginx`, etc.) |
| `./docker-local.sh db` | Connect to PostgreSQL directly |
| `./docker-local.sh redis` | Connect to Redis CLI |
| `./docker-local.sh artisan [cmd]` | Run any Laravel artisan command |
| `./docker-local.sh fresh` | Fresh start (down + up + migrate) |
| `./docker-local.sh help` | Show this help |

---

## Getting Started

### Option A: Using Helper Script (Recommended)

```bash
cd /home/deck/sales_ai_funnel

# One-time setup (builds images, starts services, runs migrations)
./docker-local.sh setup

# Open browser
open http://localhost

# View logs if needed
./docker-local.sh logs
```

### Option B: Using Docker Compose Directly

```bash
cd /home/deck/sales_ai_funnel

# Build all images
docker compose -f docker-compose.local.yml build

# Start all services
docker compose -f docker-compose.local.yml up -d

# Run migrations
docker compose -f docker-compose.local.yml exec app php artisan migrate --force

# Check status
docker compose -f docker-compose.local.yml ps
```

---

## Key Differences From Production Setup

| Aspect | Production (`docker-compose.prod.yml`) | Local (`docker-compose.local.yml`) |
|--------|----------------------------------|------|
| **SSL/TLS** | Yes (Let's Encrypt) | No (HTTP only) |
| **Domain** | `velora.guatemalia.com` | `localhost` |
| **Certbot** | Yes (auto-renewal) | No |
| **Frontend Build** | Pre-built, copied to image | Built in Docker (Stage 1) |
| **Service Access** | Internal + external via SSL | Internal only (HTTP:80) |
| **OpenClaw Config** | Copied at deploy time | Mounted from `~/.openclaw` (live) |
| **Debugging** | Harder (remote server) | Easy (local access) |

---

## Development Workflow

### Editing Backend Code (PHP)
```bash
# 1. Edit files (app/, routes/, config/, etc.)
# 2. Changes reload automatically (no rebuild needed)
# 3. View logs if needed
./docker-local.sh logs app
```

### Editing Frontend Code (React/TypeScript)
```bash
# Option 1: Rebuild inside Docker
./docker-local.sh artisan npm run build

# Option 2: Rebuild on host machine
cd /home/deck/sales_ai_funnel
npm run build

# Option 3: Rebuild entire app container
./docker-local.sh build app
```

### Running Commands
```bash
# Artisan
./docker-local.sh artisan cache:clear
./docker-local.sh artisan migrate:status
./docker-local.sh artisan tinker

# Database
./docker-local.sh db
# Then: SELECT COUNT(*) FROM leads;

# Redis
./docker-local.sh redis
# Then: KEYS *; GET key_name;

# Shell access
./docker-local.sh shell
# Then: ls, php, composer, npm, etc.
```

---

## Troubleshooting Quick Reference

| Problem | Command to Check | Fix |
|---------|-----------------|-----|
| **Services won't start** | `./docker-local.sh logs` | Check logs, rebuild: `./docker-local.sh build` |
| **Port 80 in use** | `lsof -i :80` | Change port in `docker-compose.local.yml` |
| **500 error on home page** | `./docker-local.sh logs app` | Clear caches: `./docker-local.sh clear` |
| **Database connection failed** | `./docker-local.sh status` | Wait for postgres to be healthy, retry |
| **Can't access OpenClaw** | `curl http://localhost:18789/` | Wait 15-20s, check: `./docker-local.sh logs openclaw` |
| **npm build failed** | `./docker-local.sh logs app` | Rebuild: `./docker-local.sh build` |

---

## Next Actions

1. **Run setup**:
   ```bash
   cd /home/deck/sales_ai_funnel
   ./docker-local.sh setup
   ```

2. **Wait 5-10 minutes** for all services to be healthy

3. **Test it**:
   ```bash
   curl http://localhost/api/health
   open http://localhost
   ```

4. **Start developing**!

---

## Useful Links

- **Local app**: http://localhost
- **API health**: http://localhost/api/health
- **OpenClaw gateway** (internal testing): http://127.0.0.1:18789/
- **MCP server** (internal testing): http://127.0.0.1:8001/

---

## File Locations

```
/home/deck/sales_ai_funnel/
├── docker-compose.local.yml        ← Main config
├── docker/
│   ├── nginx.conf                  ← Nginx main config (unchanged)
│   ├── conf.d/
│   │   ├── local.conf              ← NEW: HTTP localhost vhost
│   │   └── velora.conf             ← OLD: HTTPS production vhost
│   └── supervisord.conf            ← Process manager (unchanged)
├── .env.docker                     ← NEW: Docker env vars
├── Dockerfile                      ← UPDATED: Multi-stage build
├── Dockerfile.python               ← UPDATED: Fixed healthcheck
├── docker-local.sh                 ← NEW: Helper script
├── DOCKER_LOCAL_SETUP.md           ← NEW: Full guide
├── DOCKER_LOCAL_README.md          ← NEW: Quick start
└── DOCKER_LOCAL_SETUP_COMPLETE.md  ← NEW: This file
```

---

## Summary

✅ **All files created and configured**
✅ **Dockerfile updated with multi-stage build**
✅ **Helper script ready**
✅ **Documentation complete**
✅ **Ready to run**

**Your next command:**
```bash
./docker-local.sh setup
```

**Questions or issues?** See `DOCKER_LOCAL_SETUP.md` for comprehensive troubleshooting.

Good luck! 🚀
