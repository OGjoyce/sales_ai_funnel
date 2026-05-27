# ✨ Local Docker Environment - Complete Setup

Your local Docker development environment is now ready! This folder contains everything you need to run Velora locally with Docker.

---

## 📦 What's New

The following files have been created for you:

| File | Purpose |
|------|---------|
| **`docker-compose.local.yml`** | Complete local Docker stack (6 services: postgres, redis, openclaw, app, mcp-server, nginx) |
| **`docker/conf.d/local.conf`** | Nginx configuration for localhost (HTTP only, no SSL) |
| **`.env.docker`** | Environment variables configured for Docker (service hostnames, Redis cache/queue) |
| **`docker-local.sh`** | Helper script with commands: `setup`, `up`, `down`, `logs`, `migrate`, `shell`, etc. |
| **`Dockerfile`** (updated) | Added multi-stage build: **Stage 1** compiles frontend (npm), **Stage 2** builds PHP app |
| **`Dockerfile.python`** (updated) | Fixed healthcheck (was trying to curl `/health` endpoint that doesn't exist) |
| **`DOCKER_LOCAL_SETUP.md`** | Comprehensive guide with troubleshooting, commands, and architecture |

---

## 🚀 Quick Start (3 Steps)

### 1. Build everything
```bash
cd /home/deck/sales_ai_funnel
./docker-local.sh setup
```

This will:
- ✓ Build all 6 Docker images (first time: ~5-10 minutes)
- ✓ Start all containers
- ✓ Run database migrations automatically
- ✓ Be ready to use

### 2. Open in browser
```bash
open http://localhost
# or just go to http://localhost in your browser
```

### 3. Test it works
```bash
# Health endpoint (should return JSON)
curl http://localhost/api/health

# Or use the helper:
./docker-local.sh test
```

---

## 📋 What's Running

After `./docker-local.sh setup`, you'll have:

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **nginx** | `80` | Running | Reverse proxy (localhost) |
| **app** | `8000` (internal) | Running | Laravel PHP-FPM |
| **postgres** | `5432` (internal) | Healthy | PostgreSQL with pgvector |
| **redis** | `6379` (internal) | Healthy | Cache + Queue |
| **openclaw** | `18789` | Healthy | AI Agent Gateway |
| **mcp-server** | `8001` | Running | Python FastMCP bridge |

All services are **internal** to the Docker network except:
- Port **80** (HTTP) exposed on your machine
- Port **18789** (OpenClaw) exposed at `127.0.0.1:18789` for local testing
- Port **8001** (MCP) exposed at `127.0.0.1:8001` for local testing

---

## 🎮 Common Commands

```bash
# Start services
./docker-local.sh up

# Stop services
./docker-local.sh down

# View logs
./docker-local.sh logs          # All services
./docker-local.sh logs app      # Just app

# Run migrations
./docker-local.sh migrate

# Clear caches
./docker-local.sh clear

# Open shell in app container
./docker-local.sh shell

# Connect to PostgreSQL
./docker-local.sh db

# Connect to Redis
./docker-local.sh redis

# Run any Laravel artisan command
./docker-local.sh artisan migrate:status
./docker-local.sh artisan tinker

# Restart everything
./docker-local.sh restart

# Fresh start (stop + start + migrate)
./docker-local.sh fresh
```

See `./docker-local.sh help` for all commands.

---

## 🔧 How It Works

### Frontend Assets (Key Change!)

**Before**: Frontend assets had to be pre-built on your machine and committed to `public/build/`

**Now**: Docker builds them automatically:
1. **Stage 1** in `Dockerfile` runs `npm install` and `npm run build`
2. **Stage 2** copies the built assets into the PHP container

This means:
- ✓ No need to commit `node_modules` or `public/build/`
- ✓ Containers are self-contained
- ✓ Same assets run locally and in production

If you **modify frontend code** (`resources/js/pages/*.tsx`, `resources/css/app.css`, etc.):
```bash
# Option 1: Rebuild the whole image
./docker-local.sh build app

# Option 2: Rebuild inside the container (faster)
./docker-local.sh artisan npm run build

# Option 3: Rebuild on your machine and restart containers
cd /home/deck/sales_ai_funnel
npm run build
./docker-local.sh restart
```

### Database & Cache

Local environment uses:
- **Database**: PostgreSQL in Docker (with pgvector extension)
- **Cache**: Redis (replaces database cache)
- **Queue**: Redis (instead of database)
- **Session**: Database

All data is persisted in Docker volumes:
- `postgres_local` — database data
- `redis_local` — cache/queue data

If you want to **reset everything**:
```bash
./docker-local.sh down -v
./docker-local.sh setup
```

### OpenClaw Integration

The compose file mounts your **live OpenClaw config** from `~/.openclaw`:

```yaml
volumes:
  - ${HOME}/.openclaw:/home/node/.openclaw:rw
```

This means:
- ✓ Your local agents work exactly as they do in production
- ✓ Use the same credentials and configuration
- ✓ No need to reconfigure OpenClaw for local testing
- ✓ Changes to agents persist (synced with your host)

---

## 🐛 Troubleshooting

### "docker: command not found"
→ Install Docker Desktop: https://www.docker.com/products/docker-desktop

### "Port 80 already in use"
→ Change port in `docker-compose.local.yml`:
```yaml
nginx:
  ports:
    - "8080:80"  # Use http://localhost:8080
```

### Services not starting
```bash
# Check logs
./docker-local.sh logs

# See which services failed
./docker-local.sh status

# Rebuild from scratch
./docker-local.sh build
```

### 500 errors on home page
```bash
# Check Laravel logs
./docker-local.sh logs app

# Clear caches
./docker-local.sh clear

# Run migrations
./docker-local.sh migrate
```

### Can't connect to OpenClaw
→ It takes 15-20 seconds to start. Check status:
```bash
./docker-local.sh status
curl http://localhost:18789/
```

More troubleshooting: see `DOCKER_LOCAL_SETUP.md`

---

## 📁 File Structure After Setup

```
/home/deck/sales_ai_funnel/
├── docker-compose.local.yml    (new)
├── docker/
│   └── conf.d/
│       └── local.conf          (new - HTTP nginx vhost)
├── .env.docker                 (new - Docker env vars)
├── Dockerfile                  (updated - multi-stage build)
├── Dockerfile.python           (updated - healthcheck fix)
├── docker-local.sh            (new - helper script)
├── DOCKER_LOCAL_SETUP.md       (new - comprehensive guide)
├── DOCKER_LOCAL_README.md      (new - this file)
│
├── app/                        (Laravel code - unchanged)
├── config/                     (Config - unchanged)
├── resources/                  (Frontend code - unchanged)
├── routes/                     (Routes - unchanged)
├── public/                     (Assets - built in Docker now)
├── storage/                    (Volumes mount here)
└── ...
```

---

## ✅ Verification

After running `./docker-local.sh setup`, verify everything works:

```bash
# 1. Check services are healthy
./docker-local.sh status
# Expected: All showing "Up" or "Healthy"

# 2. Test API
curl http://localhost/api/health
# Expected: JSON with "status":"ok"

# 3. Test home page
open http://localhost
# Expected: Velora landing page loads

# 4. Test database
./docker-local.sh artisan migrate:status
# Expected: All migrations show "Ran"

# 5. Test cache
./docker-local.sh artisan tinker
# Then: Cache::put('test', 1); Cache::get('test');
# Expected: 1

# 6. Test OpenClaw
curl http://localhost:18789/
# Expected: 200 status
```

---

## 🎯 Next Steps

1. **Run setup**: `./docker-local.sh setup`
2. **Open browser**: `http://localhost`
3. **Check logs if needed**: `./docker-local.sh logs`
4. **Start developing**!

### For Development

- Edit PHP/Laravel code → changes reload instantly
- Edit frontend code → run `npm run build` on your machine
- Access database → `./docker-local.sh db`
- Run artisan commands → `./docker-local.sh artisan [command]`
- Debug by reading logs → `./docker-local.sh logs -f app`

### For Production Testing

This local environment mirrors the production setup:
- Same container images
- Same service architecture
- Same PHP-FPM + Nginx routing
- Same environment variables (just with localhost/Docker hostnames)

The only difference: **no SSL** (uses HTTP locally for simplicity).

---

## 📚 Full Documentation

For complete details, see:
- **`DOCKER_LOCAL_SETUP.md`** — Comprehensive guide with all commands and troubleshooting
- **`./docker-local.sh help`** — List all helper script commands

---

## 💡 Tips

1. **First-time setup takes ~10 minutes** — mostly building images. Subsequent starts are instant.

2. **Keep OpenClaw config synced** — the local OpenClaw container uses your `~/.openclaw` directory, so agents work exactly as they do in your dev environment.

3. **Database is persistent** — if you want a fresh database, run:
   ```bash
   ./docker-local.sh down -v
   ./docker-local.sh setup
   ```

4. **You can edit docker-compose.local.yml** — feel free to adjust ports, add services, change environment variables, etc.

5. **All logs are accessible** — check `./docker-local.sh logs` if anything seems wrong.

---

## 🚀 You're Ready!

Everything is set up. Your next command should be:

```bash
./docker-local.sh setup
```

Then go to **http://localhost** in your browser.

Good luck! 🎉
