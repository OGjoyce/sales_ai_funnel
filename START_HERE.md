# 🚀 START HERE - Local Docker Setup

Welcome! Everything is ready to go. Here's what you need to do.

---

## ⚡ TL;DR - Get Running in 3 Steps

```bash
# Step 1: Navigate to project
cd /home/deck/sales_ai_funnel

# Step 2: Run setup (builds + starts + migrates)
./docker-local.sh setup

# Step 3: Open browser
open http://localhost
```

**That's it!** The app will be running at `http://localhost` with:
- ✓ PostgreSQL database (populated)
- ✓ Redis cache & queue
- ✓ OpenClaw agents (from your `~/.openclaw`)
- ✓ Laravel API
- ✓ React frontend
- ✓ Nginx reverse proxy

---

## 📋 What Was Created

### 7 New Files

| File | Size | Purpose |
|------|------|---------|
| `docker-compose.local.yml` | 2.7K | Docker stack definition (6 services) |
| `docker/conf.d/local.conf` | 1.3K | Nginx config for localhost |
| `.env.docker` | 1.6K | Environment variables for Docker |
| `docker-local.sh` | 6.2K | Helper script with 15+ commands |
| `DOCKER_LOCAL_README.md` | 9K | Quick start guide |
| `DOCKER_LOCAL_SETUP.md` | 14K | Comprehensive guide + troubleshooting |
| `DOCKER_LOCAL_SETUP_COMPLETE.md` | 12K | Checklist of what was done |

### 2 Files Updated

| File | Changes |
|------|---------|
| `Dockerfile` | Added multi-stage build: Stage 1 builds frontend, Stage 2 builds PHP app |
| `Dockerfile.python` | Fixed broken healthcheck |

---

## 🎯 The Big Picture

### Before
```
Local development was fragile:
- Had to run Laravel serve + npm dev on host
- Required Node.js, PHP, PostgreSQL installed locally
- Hard to replicate production environment
- Debugging 500 errors on VPS was nearly impossible
```

### After
```
Everything runs in Docker:
- Isolated environment (no local dependencies)
- Matches production setup
- Easy to test frontend + backend + agents together
- Debug locally before deploying to VPS
- One command to start everything: ./docker-local.sh setup
```

---

## 🏗️ Architecture

```
Your Computer
┌─────────────────────────────────────────┐
│ Port 80                                 │
│    ↓                                    │
│ ┌────────────────┐                      │
│ │   nginx        │ (HTTP reverse proxy) │
│ │ localhost:80   │                      │
│ └────────────────┘                      │
│    ↓ (FastCGI port 9000)                │
│ ┌──────────────────────────────────┐   │
│ │ PHP-FPM (Laravel app)            │   │
│ │ • supervisord manages            │   │
│ │ • php-fpm                        │   │
│ │ • laravel-worker (2x)            │   │
│ │ • laravel-schedule               │   │
│ └──────────────────────────────────┘   │
└────┬──────────────────────────┬─────────┘
     │                          │
  ┌──▼──────────────────────────▼──┐
  │ Docker Internal Network         │
  │ (velora_local)                  │
  │                                 │
  │ ┌─────────────┐  ┌──────────┐  │
  │ │ PostgreSQL  │  │  Redis   │  │
  │ │ pgvector    │  │ (cache)  │  │
  │ └─────────────┘  └──────────┘  │
  │                                 │
  │ ┌──────────────────────────┐   │
  │ │   OpenClaw Gateway       │   │
  │ │ (mounts ~/.openclaw)     │   │
  │ │ (your live agents work!) │   │
  │ └──────────────────────────┘   │
  │                                 │
  │ ┌──────────────────────────┐   │
  │ │   MCP Server (Python)    │   │
  │ │ (CRM bridge)             │   │
  │ └──────────────────────────┘   │
  └─────────────────────────────────┘
```

**Services**:
- **nginx** — Reverse proxy (HTTP)
- **app** — PHP-FPM with Laravel
- **postgres** — Database with pgvector
- **redis** — Cache & queue
- **openclaw** — AI agents gateway
- **mcp-server** — FastMCP service

All services auto-start, auto-restart, and auto-healthcheck.

---

## 🎮 Common Commands

### Basic Operations

```bash
# Start (first time takes 5-10 min to build)
./docker-local.sh setup

# Stop
./docker-local.sh down

# Restart
./docker-local.sh restart

# Fresh start (like new database)
./docker-local.sh fresh
```

### Viewing & Debugging

```bash
# See what's running
./docker-local.sh status

# View logs (all services)
./docker-local.sh logs

# View logs (just app)
./docker-local.sh logs app

# Real-time tail of app logs
./docker-local.sh logs -f app
```

### Running Commands

```bash
# Run any Laravel command
./docker-local.sh artisan migrate:status
./docker-local.sh artisan cache:clear
./docker-local.sh artisan tinker

# Open a shell in the app
./docker-local.sh shell

# Connect to database
./docker-local.sh db

# Connect to Redis
./docker-local.sh redis
```

### Testing

```bash
# Quick test of all endpoints
./docker-local.sh test

# Test health endpoint
curl http://localhost/api/health

# Test home page
open http://localhost
```

See `./docker-local.sh help` for all commands.

---

## 🔧 Development Notes

### Frontend Changes

If you modify frontend code (`resources/js/`, `resources/css/`):

```bash
# Option 1: Rebuild in Docker (fast)
./docker-local.sh artisan npm run build

# Option 2: Rebuild on host then restart
npm run build
./docker-local.sh restart

# Option 3: Full rebuild of app image
./docker-local.sh build
```

### Backend Changes

PHP/Laravel code changes reload automatically. Just:
- Edit the file
- Refresh browser (or wait a few seconds)
- Changes are live

### Database Changes

To reset the database:
```bash
./docker-local.sh down -v    # Remove volumes
./docker-local.sh setup       # Fresh start with migrations
```

### OpenClaw Integration

Your **live OpenClaw config** at `~/.openclaw` is mounted in the container:
- Agents work exactly as they do locally
- Configuration persists
- Use the same credentials everywhere

---

## 📚 Documentation

- **`DOCKER_LOCAL_README.md`** — Overview & quick start
- **`DOCKER_LOCAL_SETUP.md`** — Complete guide with all commands & troubleshooting
- **`DOCKER_LOCAL_SETUP_COMPLETE.md`** — Detailed checklist of what was created
- **`./docker-local.sh help`** — List all script commands

Pick any of these if you need more details.

---

## ❓ Common Issues

### "docker: command not found"
→ Install Docker Desktop: https://www.docker.com/products/docker-desktop

### "Port 80 is in use"
→ Edit `docker-compose.local.yml` and change the port:
```yaml
nginx:
  ports:
    - "8080:80"  # Then access http://localhost:8080
```

### "Services not starting"
```bash
./docker-local.sh logs          # See what failed
./docker-local.sh build         # Try rebuilding
```

### "500 error on home page"
```bash
./docker-local.sh logs app      # Check Laravel logs
./docker-local.sh clear         # Clear caches
./docker-local.sh migrate       # Ensure DB is migrated
```

More troubleshooting in `DOCKER_LOCAL_SETUP.md`.

---

## ✅ Ready?

You have everything you need. Run this now:

```bash
cd /home/deck/sales_ai_funnel
./docker-local.sh setup
```

Then open:
```
http://localhost
```

That's all! 🎉

---

## 💬 Key Facts

- **Build time**: ~5-10 minutes (first time only)
- **Startup time**: ~30-45 seconds (subsequent times)
- **Disk space**: ~5-8 GB for all images and volumes
- **Services**: 6 (postgres, redis, openclaw, app, mcp-server, nginx)
- **Frontend**: Built in Docker (multi-stage, no need to pre-build)
- **Agents**: Use your live `~/.openclaw` config
- **Database**: PostgreSQL with pgvector (persistent volume)
- **Cache/Queue**: Redis (persistent volume)

---

## Next Step

Run this command now:

```bash
./docker-local.sh setup
```

See you at `http://localhost`! 🚀
