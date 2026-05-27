# Local Docker Setup - Quick Start Guide

This guide will help you run the entire Velora stack locally using Docker Compose.

---

## Prerequisites

Before starting, ensure you have installed:

- **Docker Desktop** (Mac/Windows) or **Docker Engine + Docker Compose** (Linux)
  - [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
  - For Linux: `sudo apt-get install docker.io docker-compose`
- **~5-10 GB free disk space** (for images and data volumes)
- **Port 80 available** (nginx)
- **Ports 18789, 8001 available** (OpenClaw, MCP server)

Verify installation:
```bash
docker --version
docker compose version
```

---

## Quick Start

### Step 1: Copy `.env.docker` Settings (Optional)

If you need custom OpenAI or OpenClaw tokens, edit `.env.docker`:

```bash
nano .env.docker
```

Key variables:
- `OPENAI_API_KEY` - your OpenAI key
- `OPENCLAW_GATEWAY_TOKEN` - OpenClaw gateway token
- `MCP_SERVICE_TOKEN` - Laravel MCP service token

If you want to use **your live OpenClaw config** (recommended for testing agents):
- The compose file automatically mounts `~/.openclaw` from your host
- No additional setup needed — it will use your existing OpenClaw workspace

### Step 2: Build All Images

From `/home/deck/sales_ai_funnel/`:

```bash
cd /home/deck/sales_ai_funnel

# Build all 5 images (postgres, redis, openclaw, app, mcp-server, nginx)
# First time: ~5-10 minutes
docker compose -f docker-compose.local.yml build
```

**What gets built:**
1. **postgres** — ramsrib/pgvector (pre-built)
2. **redis** — redis:7-alpine (pre-built)
3. **openclaw** — from `Dockerfile.openclaw` (Node.js)
4. **app** — from `Dockerfile` (PHP with Node.js frontend build)
5. **mcp-server** — from `Dockerfile.python` (Python FastMCP)
6. **nginx** — nginx:alpine (pre-built)

### Step 3: Start All Services

```bash
# Start all containers in background (-d = detached)
docker compose -f docker-compose.local.yml up -d

# Check status
docker compose -f docker-compose.local.yml ps

# Expected output:
# NAME                    STATUS
# velora_postgres_local   Healthy
# velora_redis_local      Healthy
# velora_openclaw_local   Healthy (after ~15s)
# velora_app_local        Healthy (after postgres/redis/openclaw)
# velora_mcp_local        Healthy (after app)
# velora_nginx_local      Up (no healthcheck)
```

Wait 30-45 seconds for all health checks to pass.

### Step 4: Initialize Database

```bash
# Run migrations
docker compose -f docker-compose.local.yml exec app php artisan migrate --force

# Seed initial data (if seeders exist)
docker compose -f docker-compose.local.yml exec app php artisan db:seed --force

# Check migration status
docker compose -f docker-compose.local.yml exec app php artisan migrate:status
```

Expected output:
```
  Migration name .............................................. Batch / Status
  0001_01_01_000000_create_users_table ............................... [1] Ran
  0001_01_01_000001_create_cache_table ............................... [1] Ran
  ...
```

### Step 5: Test the Stack

```bash
# API health endpoint
curl http://localhost/api/health

# Expected:
# {"status":"ok","timestamp":"2026-05-14T20:00:00+00:00","app_name":"Velora",...}

# Home page
curl -s http://localhost/ | head -20

# Expected: HTML with <!DOCTYPE html>

# Test OpenClaw
curl http://localhost:18789/

# Expected: 200 status
```

### Step 6: Open in Browser

```bash
open http://localhost
# or
firefox http://localhost
# or navigate to http://localhost in your browser
```

---

## Useful Commands

### View Logs

```bash
# All services
docker compose -f docker-compose.local.yml logs -f

# Specific service
docker compose -f docker-compose.local.yml logs -f app
docker compose -f docker-compose.local.yml logs -f nginx
docker compose -f docker-compose.local.yml logs -f openclaw

# Last 100 lines of Laravel logs
docker compose -f docker-compose.local.yml exec app tail -100 /app/storage/logs/laravel.log

# Real-time tail
docker compose -f docker-compose.local.yml exec app tail -f /app/storage/logs/laravel.log
```

### Execute Artisan Commands

```bash
# Run any Laravel command
docker compose -f docker-compose.local.yml exec app php artisan <command>

# Examples
docker compose -f docker-compose.local.yml exec app php artisan tinker
docker compose -f docker-compose.local.yml exec app php artisan cache:clear
docker compose -f docker-compose.local.yml exec app php artisan db:show
```

### Database Access

```bash
# Connect to PostgreSQL directly
docker compose -f docker-compose.local.yml exec postgres psql -U sales -d sales_ai_funnel

# Inside psql:
# \dt                    -- list tables
# \d leads               -- describe leads table
# SELECT COUNT(*) FROM leads;  -- count leads
# \q                    -- quit
```

### Redis Access

```bash
# Connect to Redis
docker compose -f docker-compose.local.yml exec redis redis-cli

# Inside redis-cli:
# PING                   -- test connection
# KEYS *                 -- list all keys
# GET <key>              -- get a key
# FLUSHALL               -- clear all data
# EXIT                   -- quit
```

### Shell Access

```bash
# PHP-FPM / Laravel container
docker compose -f docker-compose.local.yml exec app bash

# Nginx container
docker compose -f docker-compose.local.yml exec nginx sh

# Inside container: common commands work as normal
```

### Rebuild a Single Service

```bash
# Rebuild just the app without rebuilding everything
docker compose -f docker-compose.local.yml build app --no-cache

# Rebuild and restart
docker compose -f docker-compose.local.yml up -d app
```

### Stop All Services

```bash
docker compose -f docker-compose.local.yml down

# Also remove volumes (clears all data)
docker compose -f docker-compose.local.yml down -v
```

### Restart All Services

```bash
docker compose -f docker-compose.local.yml restart
```

---

## Verification Checklist

| Check | Command | Expected Result |
|-------|---------|-----------------|
| **Postgres running** | `docker compose -f docker-compose.local.yml ps \| grep postgres` | `Healthy` |
| **Redis running** | `docker compose -f docker-compose.local.yml ps \| grep redis` | `Healthy` |
| **OpenClaw running** | `curl http://localhost:18789/` | `200` or `Connection Established` |
| **App running** | `curl http://localhost/api/health` | JSON response with `"status":"ok"` |
| **Home page loads** | `curl http://localhost/` | HTML starts with `<!DOCTYPE html>` |
| **DB connected** | `docker compose -f docker-compose.local.yml exec app php artisan migrate:status` | All migrations `Ran` |
| **Redis cache works** | `docker compose -f docker-compose.local.yml exec app php artisan tinker` then `Cache::put('test', 1); Cache::get('test');` | `1` |

---

## Troubleshooting

### "docker: command not found"

Install Docker Desktop or Docker Engine:
- **Mac/Windows**: Download [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: `sudo apt-get install docker.io docker-compose`

Then start Docker:
```bash
# Mac/Windows: Open Docker Desktop app
# Linux: systemctl start docker
```

### "Port 80 already in use"

Another service is using port 80. Options:
1. Stop the other service
2. Change the Nginx port in `docker-compose.local.yml`:
   ```yaml
   ports:
     - "8080:80"  # Host:Container
   ```
   Then access at `http://localhost:8080`

### "Service 'app' is unhealthy"

Usually means the app container failed to start. Check logs:

```bash
docker compose -f docker-compose.local.yml logs app
```

Common issues:
- **Missing dependencies**: run `docker compose -f docker-compose.local.yml build app --no-cache`
- **Migrations failed**: `docker compose -f docker-compose.local.yml exec app php artisan migrate:fresh --seed`
- **Permission issues**: `docker compose -f docker-compose.local.yml exec app chown -R www-data:www-data /app`

### "Can't reach http://localhost"

1. Verify nginx is running: `docker compose -f docker-compose.local.yml ps nginx`
2. Check nginx logs: `docker compose -f docker-compose.local.yml logs nginx`
3. Verify PHP-FPM is reachable:
   ```bash
   docker compose -f docker-compose.local.yml exec nginx wget -O- http://app:9000/index.php
   ```

### "500 error on home page"

Check Laravel logs for the actual error:

```bash
docker compose -f docker-compose.local.yml exec app tail -50 /app/storage/logs/laravel.log
```

Common causes:
- **Missing migrations**: Run `docker compose -f docker-compose.local.yml exec app php artisan migrate --force`
- **Cache/config stale**: Run `docker compose -f docker-compose.local.yml exec app php artisan cache:clear && php artisan config:clear`
- **File permissions**: Run `docker compose -f docker-compose.local.yml exec app chmod -R 755 storage bootstrap/cache`

### "OpenClaw not responding"

OpenClaw takes ~15-20 seconds to start. Check status:

```bash
docker compose -f docker-compose.local.yml logs openclaw | tail -30

# If stuck on "Starting gateway", check:
curl -v http://localhost:18789/
```

If it keeps failing:
1. Ensure `~/.openclaw` exists and has valid `openclaw.json`
2. Check OpenClaw logs in detail:
   ```bash
   docker compose -f docker-compose.local.yml exec openclaw openclaw --version
   ```

---

## Development Workflow

### Editing Code

Code changes are reflected **immediately** (no rebuild needed):
- **PHP/Laravel code** → changes in `app/`, `routes/`, `config/` reload automatically
- **Frontend code** → **requires `npm run build`** on your host machine (or inside the container)

```bash
# To rebuild frontend after changes
cd /home/deck/sales_ai_funnel
npm run build

# Or inside the container
docker compose -f docker-compose.local.yml exec app npm run build
```

### Debugging with Xdebug

If you need to add Xdebug support:
1. Edit `Dockerfile` to add Xdebug during the PHP stage
2. Configure your IDE (VS Code, PhpStorm) to listen on port 9003
3. Rebuild: `docker compose -f docker-compose.local.yml build app --no-cache`

Contact if you need help setting this up.

### Testing

```bash
# Run PHP tests
docker compose -f docker-compose.local.yml exec app php artisan test

# Run specific test
docker compose -f docker-compose.local.yml exec app php artisan test --filter=TestClassName
```

---

## Cleanup & Storage

**Volumes persist data even after stopping containers.** To reset:

```bash
# Stop and remove containers (keeps volumes/data)
docker compose -f docker-compose.local.yml down

# Stop and remove containers AND volumes
docker compose -f docker-compose.local.yml down -v

# Remove images too (will rebuild on next 'up')
docker compose -f docker-compose.local.yml down -v && docker rmi velora-app velora-openclaw
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Your Machine (Host)                                        │
│                                                             │
│  Port 80 ──→ ┌──────────────────┐                           │
│              │   nginx:alpine   │ (HTTP reverse proxy)       │
│              │  velora_nginx    │                           │
│              └────────┬─────────┘                           │
│                       │ (Port 9000)                         │
│              ┌────────▼─────────┐                           │
│              │   app (PHP 8.3)  │ Docker Service            │
│              │  velora_app      │ (supervisord runs:         │
│              │                  │  • php-fpm                 │
│              │                  │  • laravel-worker (2)      │
│              │                  │  • laravel-schedule)       │
│              └────────┬─────────┘                           │
│                       │                                     │
│        ┌──────────────┼──────────────┐                      │
│        │              │              │                      │
│   ┌────▼────┐  ┌─────▼──────┐  ┌───▼────────┐              │
│   │ postgres │  │   redis    │  │ openclaw   │              │
│   │ pgvector │  │ (cache,q)  │  │  (agents)  │              │
│   └──────────┘  └────────────┘  └────────────┘              │
│                                                             │
│  Port 8001 ──→ mcp-server (Python FastMCP)                 │
│  Port 18789 ──→ openclaw gateway                           │
│                                                             │
│  ~/.openclaw (mounted) ──→ OpenClaw config/creds           │
└─────────────────────────────────────────────────────────────┘
```

---

## Support

If you hit issues:

1. **Check logs first**: `docker compose -f docker-compose.local.yml logs -f`
2. **Restart everything**: `docker compose -f docker-compose.local.yml restart`
3. **Rebuild from scratch**: `docker compose -f docker-compose.local.yml down -v && docker compose -f docker-compose.local.yml build`
4. **Check file permissions**: `ls -la /home/deck/sales_ai_funnel/`

Good luck! 🚀
