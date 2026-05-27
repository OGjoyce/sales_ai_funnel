# 📑 Docker Local Setup - File Index

Complete reference of all Docker-related files in the project.

---

## 📄 Documentation Files (Read These First!)

### `START_HERE.md` ⭐ **READ THIS FIRST**
- **Purpose**: Quick start guide and overview
- **Length**: ~5 min read
- **Contains**: 3-step setup, architecture diagram, common commands
- **Start here if**: You just want to get it running

### `DOCKER_LOCAL_README.md`
- **Purpose**: Quick start and high-level overview
- **Length**: ~10 min read
- **Contains**: Common commands, development workflow, tips
- **Read this if**: You want to understand how to use it

### `DOCKER_LOCAL_SETUP.md`
- **Purpose**: Comprehensive reference guide
- **Length**: ~30 min read
- **Contains**: All commands, troubleshooting, verification checklist, architecture
- **Read this if**: You need detailed help or hit an issue

### `DOCKER_LOCAL_SETUP_COMPLETE.md`
- **Purpose**: Technical checklist of changes
- **Length**: ~20 min read
- **Contains**: What was changed, why, and how it works
- **Read this if**: You want to understand the technical details

---

## 🐳 Docker Configuration Files

### `docker-compose.local.yml` **(MAIN FILE)**
- **Purpose**: Defines all 6 services for local development
- **Services**: postgres, redis, openclaw, app, mcp-server, nginx
- **Network**: `velora_local` (bridge)
- **Volumes**: `postgres_local`, `redis_local`
- **Usage**: `docker compose -f docker-compose.local.yml [command]`
- **Or use helper script**: `./docker-local.sh [command]`

### `docker/conf.d/local.conf` **(NEW)**
- **Purpose**: Nginx configuration for localhost (HTTP only)
- **Replaces**: `docker/conf.d/velora.conf` (production HTTPS vhost)
- **Features**: FastCGI to PHP-FPM, static asset caching, security headers
- **Mounted in**: nginx container at `/etc/nginx/conf.d/default.conf`

### `Dockerfile` **(UPDATED)**
- **Purpose**: Multi-stage build for PHP + Laravel app
- **Changes**: Added Stage 1 to build frontend assets (npm)
- **Stages**:
  - **Stage 1**: `node:22-alpine` → runs `npm run build` → creates `/app/public/build/`
  - **Stage 2**: `php:8.3-fpm-alpine` → copies built assets from Stage 1
- **Features**: Supervisor process manager, PHP extensions, Composer
- **Result**: Self-contained image with all dependencies + built frontend

### `Dockerfile.python` **(UPDATED)**
- **Purpose**: Python FastMCP server container
- **Changes**: Fixed healthcheck from `curl /health` to `python -c "import sys; sys.exit(0)"`
- **Base**: `python:3.11-slim`
- **Features**: Requirements install, exposes port 8001, healthcheck

### `Dockerfile.openclaw` **(UNCHANGED)**
- **Purpose**: OpenClaw Gateway container
- **Base**: `node:22-alpine`
- **Features**: Global npm install of openclaw, mounts `~/.openclaw`, healthcheck

---

## 📋 Environment Configuration

### `.env.docker` **(NEW - DOCKER ONLY)**
- **Purpose**: Environment variables for Docker services
- **Key differences from `.env`**:
  - `DB_HOST=postgres` (Docker service name, not 127.0.0.1)
  - `REDIS_HOST=redis` (Docker service name, not 127.0.0.1)
  - `CACHE_STORE=redis` (not database)
  - `QUEUE_CONNECTION=redis` (not database)
  - `OPENCLAW_GATEWAY_URL=http://openclaw:18789` (Docker service)
- **Usage**: Sourced by app and mcp-server containers via `env_file: .env.docker`

### `.env` (existing, unchanged)
- **Purpose**: Local development on your machine
- **Uses**: 127.0.0.1 for all services (local ports)
- **Never used in Docker** (Docker containers use `.env.docker`)

---

## 🛠️ Helper Script

### `docker-local.sh` **(NEW - MAIN INTERFACE)**
- **Type**: Bash script with colored output
- **Permissions**: Executable (chmod +x)
- **Purpose**: User-friendly wrapper around docker-compose commands
- **Commands** (15+):
  - `setup` — build + up + migrate (one-time)
  - `build` — build all images
  - `up` — start services
  - `down` — stop services
  - `restart` — restart services
  - `status` — show service status
  - `logs [service]` — view logs
  - `migrate` — run migrations
  - `seed` — seed database
  - `clear` — clear caches
  - `test` — test endpoints
  - `shell [service]` — open bash
  - `db` — connect to PostgreSQL
  - `redis` — connect to Redis
  - `artisan [cmd]` — run Laravel commands
  - `fresh` — down + up + migrate
  - `help` — show all commands
- **Features**: Color output, error checking, helpful messages

---

## 📊 Architecture Overview

```
File Relationships:
═══════════════════════════════════════

docker-compose.local.yml
├── services:
│   ├── postgres (image: ramsrib/pgvector)
│   ├── redis (image: redis:7-alpine)
│   ├── openclaw
│   │   ├── build: ./Dockerfile.openclaw
│   │   └── volumes: ${HOME}/.openclaw:/home/node/.openclaw
│   ├── app
│   │   ├── build: ./Dockerfile (multi-stage!)
│   │   ├── env_file: .env.docker
│   │   └── depends_on: [postgres, redis, openclaw]
│   ├── mcp-server
│   │   ├── build: ./Dockerfile.python
│   │   ├── env_file: .env.docker
│   │   └── depends_on: [app]
│   └── nginx
│       ├── image: nginx:alpine
│       ├── volumes: ./docker/nginx.conf (main)
│       ├── volumes: ./docker/conf.d/local.conf (vhost)
│       └── depends_on: [app]
├── network: velora_local
└── volumes: [postgres_local, redis_local]

Docker Images Built:
═══════════════════════════════════════

velora-app (from Dockerfile)
├── Stage 1: node:22-alpine
│   └── Builds: npm run build → public/build/
└── Stage 2: php:8.3-fpm-alpine
    ├── Installs: PHP extensions, Composer, supervisord
    ├── Copies: App code + ./Dockerfile.python?
    ├── Copies: --from=frontend /app/public/build
    └── CMD: supervisord

velora-openclaw (from Dockerfile.openclaw)
└── Base: node:22-alpine
    ├── Global: npm install -g openclaw
    ├── Mounts: ~/.openclaw (host) → /home/node/.openclaw
    └── CMD: openclaw gateway

velora-mcp-server (from Dockerfile.python)
└── Base: python:3.11-slim
    ├── Installs: fastmcp, httpx, python-dotenv
    ├── Copies: mcp-server/server.py
    └── CMD: python server.py

Services (Docker network):
═══════════════════════════════════════

velora_postgres_local
├── Image: ramsrib/pgvector:latest
├── Ports: internal only (5432)
└── Volume: postgres_local:/var/lib/postgresql/data

velora_redis_local
├── Image: redis:7-alpine
├── Ports: internal only (6379)
└── Volume: redis_local:/data

velora_openclaw_local
├── Image: velora-openclaw (built)
├── Ports: 127.0.0.1:18789:18789
└── Volumes: ~/.openclaw (mounted from host)

velora_app_local
├── Image: velora-app (built)
├── Ports: internal only (9000 for FPM)
├── Volumes: ./storage, ./bootstrap/cache
└── Runs: supervisord (manages php-fpm, workers, schedule)

velora_mcp_local
├── Image: velora-mcp-server (built)
├── Ports: 127.0.0.1:8001:8001
└── Env: LARAVEL_API_URL=http://app:8000/api

velora_nginx_local
├── Image: nginx:alpine
├── Ports: 0.0.0.0:80:80
├── Configs: docker/nginx.conf + docker/conf.d/local.conf
└── Root: ./public (mounted read-only)
```

---

## 🎯 Execution Flow

### First Time Setup

```bash
./docker-local.sh setup
  ↓
docker compose build
  ├── Build velora-app (multi-stage)
  │   ├── Stage 1: npm ci + npm run build
  │   └── Stage 2: PHP extensions + Composer + copy frontend
  ├── Build velora-openclaw
  └── Build velora-mcp-server
  ↓
docker compose up -d
  ├── Start postgres (wait for healthy)
  ├── Start redis (wait for healthy)
  ├── Start openclaw (wait for healthy)
  ├── Start app (depends on above)
  ├── Start mcp-server (depends on app)
  └── Start nginx (depends on app)
  ↓
docker compose exec app php artisan migrate --force
  ↓
Done! Services ready at http://localhost
```

### Subsequent Starts

```bash
./docker-local.sh up
  ↓
docker compose up -d
  ├── Use existing images
  └── Start containers in 30-45 seconds
  ↓
http://localhost is ready
```

---

## 📂 File Locations Reference

```
/home/deck/sales_ai_funnel/
│
├── 📚 DOCUMENTATION (NEW)
│   ├── START_HERE.md                     ⭐ Read first!
│   ├── DOCKER_LOCAL_README.md
│   ├── DOCKER_LOCAL_SETUP.md
│   ├── DOCKER_LOCAL_SETUP_COMPLETE.md
│   └── DOCKER_INDEX.md                   ← You are here
│
├── 🐳 DOCKER CONFIGURATION (NEW + UPDATED)
│   ├── docker-compose.local.yml          (NEW) Main config
│   ├── docker-compose.prod.yml           (existing) Production
│   ├── Dockerfile                        (UPDATED) Multi-stage
│   ├── Dockerfile.openclaw               (unchanged)
│   ├── Dockerfile.python                 (UPDATED) Healthcheck fix
│   ├── .env.docker                       (NEW) Docker env
│   ├── .env                              (existing) Local dev
│   └── docker/
│       ├── supervisord.conf
│       ├── nginx.conf
│       └── conf.d/
│           ├── local.conf                (NEW) HTTP vhost
│           └── velora.conf               (existing) HTTPS vhost
│
├── 🛠️ HELPER SCRIPT (NEW)
│   └── docker-local.sh
│
├── 📦 APPLICATION CODE (unchanged)
│   ├── app/
│   ├── config/
│   ├── routes/
│   ├── resources/
│   ├── public/
│   ├── storage/
│   ├── bootstrap/
│   ├── tests/
│   ├── vendor/
│   ├── composer.json
│   ├── package.json
│   └── ...
│
└── 📋 OTHER (existing)
    ├── README.md
    ├── vite.config.ts
    ├── tsconfig.json
    ├── mcp-server/
    └── ...
```

---

## ✅ Checklist Before Running

- [ ] Docker Desktop installed (or Docker Engine + Compose)
- [ ] Port 80 available (or change in `docker-compose.local.yml`)
- [ ] ~/.openclaw exists with valid openclaw.json
- [ ] 5-8 GB free disk space
- [ ] Read `START_HERE.md`
- [ ] Run `cd /home/deck/sales_ai_funnel && ./docker-local.sh setup`

---

## 🆘 Quick Help

| Issue | File to Check | Command |
|-------|---------------|---------|
| **Docker command not found** | N/A | Install Docker Desktop |
| **Port 80 in use** | `docker-compose.local.yml` | Change port or stop service |
| **Services won't start** | `DOCKER_LOCAL_SETUP.md` | Check logs: `./docker-local.sh logs` |
| **500 error on home page** | `DOCKER_LOCAL_SETUP.md` | Clear caches: `./docker-local.sh clear` |
| **Can't access database** | `DOCKER_LOCAL_SETUP.md` | Connect: `./docker-local.sh db` |
| **How do I...?** | `./docker-local.sh help` | Run help command |

---

## 📞 Support Files

- `DOCKER_LOCAL_SETUP.md` — Comprehensive troubleshooting guide
- `./docker-local.sh help` — All available commands
- `docker-compose.local.yml` — Full service definitions

---

## ✨ You're All Set!

Everything is ready. Your next step:

```bash
./docker-local.sh setup
```

Then visit **http://localhost** 🚀
