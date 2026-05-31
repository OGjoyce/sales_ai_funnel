# OpenClaw Docker Setup for VPS

Complete guide for running OpenClaw as a containerized service on your VPS.

## Overview

Your OpenClaw deployment consists of:
- **Dockerfile.openclaw** - Builds a Node.js image with OpenClaw installed
- **docker-compose.prod.yml** - Includes openclaw service definition
- **Volume mounting** - Persists your workspaces and configuration

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Docker Network                          │
│  (velora_network - internal only)                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐     ┌──────────────┐                  │
│  │   Laravel    │────▶│  OpenClaw    │                  │
│  │     App      │     │   Gateway    │                  │
│  │ :8000        │     │  :18789      │                  │
│  └──────────────┘     └──────────────┘                  │
│         ▲                      ▲                         │
│         │                      │                         │
│  ┌──────▼──────┐    ┌──────────▼────┐                   │
│  │  PostgreSQL │    │  Redis        │                   │
│  │   :5432     │    │  :6379        │                   │
│  └─────────────┘    └───────────────┘                   │
│                                                          │
│  Volume Mounts:                                         │
│  openclaw/.openclaw → /home/node/.openclaw              │
│  storage/          → /app/storage (Laravel)             │
│  postgres_data/    → /var/lib/postgresql/data           │
│                                                          │
└─────────────────────────────────────────────────────────┘
         │
         │ Only exposed: 80, 443 (public)
         │ 18789, 8000 bound to 127.0.0.1 (internal)
         ▼
   Internet / Nginx
```

## Files Modified/Created

### New Files
- ✅ `Dockerfile.openclaw` - OpenClaw container image
- ✅ `OPENCLAW_MIGRATION.md` - Migration instructions
- ✅ `OPENCLAW_DOCKER_SETUP.md` - This file

### Modified Files
- ✅ `docker-compose.prod.yml` - Added openclaw service
- ✅ `deploy.sh` - Added OpenClaw startup steps

## Quick Start

### 1. Prepare Your OpenClaw Files Locally

```bash
# On your local machine, backup OpenClaw
cd /home/deck/.openclaw
tar -czf openclaw-backup.tar.gz openclaw.json workspace* agents/

# Note the location for Step 2
```

### 2. Upload Project + OpenClaw Config to VPS

```bash
# Run the upload script
cd /home/deck/sales_ai_funnel
./upload-to-vps.sh ~/path/to/ssh-carlo.pem ubuntu 18.221.208.60

# SSH into VPS
ssh -i ~/path/to/ssh-carlo.pem ubuntu@18.221.208.60

# Create openclaw directory
cd /var/www/velora
mkdir -p openclaw/.openclaw

# Copy your openclaw files (via SCP or paste openclaw-backup.tar.gz)
# Then extract:
cd openclaw/.openclaw
tar -xzf ~/openclaw-backup.tar.gz
```

### 3. Update OpenClaw Config for Docker

```bash
# Edit the config file
nano /var/www/velora/openclaw/.openclaw/openclaw.json

# Required changes (search and replace):
# "bind": "loopback"  →  "bind": "0.0.0.0"
# All workspace paths: "/home/deck/.openclaw" → "/home/node/.openclaw"
```

### 4. Deploy to VPS

```bash
cd /var/www/velora
sudo bash deploy.sh

# This will:
# ✓ Install Docker
# ✓ Start PostgreSQL, Redis
# ✓ Build and start OpenClaw container
# ✓ Build and start Laravel app
# ✓ Run migrations
# ✓ Setup SSL
```

### 5. Verify Installation

```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# Check OpenClaw is healthy
docker compose -f docker-compose.prod.yml exec openclaw \
  wget --quiet --tries=1 --spider http://localhost:18789/ && echo "✓ OpenClaw is running"

# View OpenClaw logs
docker compose -f docker-compose.prod.yml logs -f openclaw
```

## Configuration Details

### OpenClaw Service Definition

```yaml
openclaw:
  build:
    context: .
    dockerfile: Dockerfile.openclaw
  container_name: velora_openclaw
  restart: always
  environment:
    NODE_ENV: production
    OPENAI_API_KEY: ${OPENAI_API_KEY}
    OPENCLAW_GATEWAY_TOKEN: ${OPENCLAW_GATEWAY_TOKEN}
  volumes:
    - ./openclaw/.openclaw:/home/node/.openclaw:rw
  networks:
    - velora_network
  ports:
    - "127.0.0.1:18789:18789"  # Internal only
  healthcheck:
    test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:18789/"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### Laravel .env Settings

After deployment, your `.env` will have:

```env
# OpenClaw Gateway Configuration
OPENCLAW_GATEWAY_URL=http://openclaw:18789           # ← Docker service name
OPENCLAW_GATEWAY_TOKEN=999f1dc967d0bbf71eb413c04b1d4ea93bcbe441dc7a01ef
OPENCLAW_ALLERIA_AGENT_ID=main
OPENCLAW_LINA_AGENT_ID=lina
OPENCLAW_HTTP_TIMEOUT_SECONDS=900
```

**Key:** `OPENCLAW_GATEWAY_URL` points to the Docker service name `openclaw`, not localhost.

### Automatic bootstrap (Lina + chat completions)

On container start, `docker/openclaw-entrypoint.sh` runs `docker/openclaw-bootstrap.js` so production does not need manual `openclaw agents add lina`. See [PROD_DEPLOY.md](PROD_DEPLOY.md).

### OpenClaw JSON Configuration

Critical settings in `openclaw.json`:

```json
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "0.0.0.0",          // ← Changed from "loopback"
    "auth": {
      "mode": "token",
      "token": "999f1dc967d0bbf71eb413c04b1d4ea93bcbe441dc7a01ef"
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "name": "Alleria",
        "workspace": "/home/node/.openclaw/workspace",   // ← Docker path
        "agentDir": "/home/node/.openclaw/agents/main/agent"
      }
      // ... other agents
    ]
  }
}
```

## Docker Network

OpenClaw runs on an isolated Docker network (`velora_network`) that only Laravel and other internal services can access.

**Network isolation:**
- ✅ OpenClaw is NOT accessible from the internet
- ✅ Port 18789 only bound to 127.0.0.1 (localhost)
- ✅ Laravel connects via internal network: `http://openclaw:18789`
- ✅ MCP server can also reach OpenClaw

## Managing OpenClaw

### View Logs

```bash
# Real-time logs
docker compose -f docker-compose.prod.yml logs -f openclaw

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 openclaw

# Search for errors
docker compose -f docker-compose.prod.yml logs openclaw | grep -i error
```

### Execute Commands

```bash
# Check gateway status
docker compose -f docker-compose.prod.yml exec openclaw \
  openclaw gateway status

# List agents
docker compose -f docker-compose.prod.yml exec openclaw \
  openclaw agents list

# View OpenClaw version
docker compose -f docker-compose.prod.yml exec openclaw \
  openclaw --version

# Shell access
docker compose -f docker-compose.prod.yml exec openclaw sh
```

### Restart OpenClaw

```bash
# Stop
docker compose -f docker-compose.prod.yml stop openclaw

# Start
docker compose -f docker-compose.prod.yml start openclaw

# Restart (preferred)
docker compose -f docker-compose.prod.yml restart openclaw
```

### Rebuild Image

If you need to update OpenClaw version:

```bash
docker compose -f docker-compose.prod.yml build --no-cache openclaw
docker compose -f docker-compose.prod.yml up -d openclaw
```

## Data Persistence

### Volume Structure

```
/var/www/velora/
├── openclaw/
│   └── .openclaw/
│       ├── openclaw.json          # Config (persisted)
│       ├── workspace/             # Main workspace (persisted)
│       ├── workspace-amo/         # Amo workspace (persisted)
│       ├── workspace-lina/        # Lina workspace (persisted)
│       ├── agents/                # Agent definitions (persisted)
│       └── [other workspaces...]
└── [Docker volumes handle postgres_data, redis_data, etc.]
```

### Backup & Restore

**Backup:**
```bash
cd /var/www/velora
tar -czf openclaw-backup-$(date +%Y%m%d-%H%M%S).tar.gz openclaw/
# Copy to safe location:
# scp openclaw-backup-*.tar.gz your-backup-server:backups/
```

**Restore:**
```bash
cd /var/www/velora
rm -rf openclaw/
tar -xzf openclaw-backup-20260512-143000.tar.gz
docker compose -f docker-compose.prod.yml restart openclaw
```

## Troubleshooting

### OpenClaw Container Won't Start

**Check logs:**
```bash
docker compose -f docker-compose.prod.yml logs openclaw

# Common errors:
# - "Cannot find module": Missing npm packages → rebuild image
# - "ENOENT: no such file or directory": openclaw.json missing
# - "Address already in use": Port 18789 conflict
```

**Solution:**
```bash
# Verify config file exists
ls -la openclaw/.openclaw/openclaw.json

# Rebuild image
docker compose -f docker-compose.prod.yml build --no-cache openclaw

# Try again
docker compose -f docker-compose.prod.yml up -d openclaw
```

### Laravel Can't Connect to OpenClaw

**Check connectivity:**
```bash
# From Laravel container
docker compose -f docker-compose.prod.yml exec app \
  curl -v http://openclaw:18789/

# Should return: Connection successful (or a response)
```

**Check .env:**
```bash
grep OPENCLAW_GATEWAY_URL /var/www/velora/.env
# Should be: http://openclaw:18789 (not 127.0.0.1:18789)
```

**Check health:**
```bash
docker compose -f docker-compose.prod.yml ps openclaw
# Should show "healthy" under STATUS
```

### OpenClaw Agents Not Loading

**Check workspaces exist:**
```bash
docker compose -f docker-compose.prod.yml exec openclaw \
  ls -la /home/node/.openclaw/workspace*/

# Should show all workspace directories
```

**Verify JSON paths:**
```bash
# Inside the container
docker compose -f docker-compose.prod.yml exec openclaw sh

# Check paths are correct
ls /home/node/.openclaw/workspace
ls /home/node/.openclaw/agents/main/agent
exit
```

**Reload agents:**
```bash
docker compose -f docker-compose.prod.yml restart openclaw
```

### High Disk Usage

OpenClaw might accumulate logs or cache. Clean up:

```bash
# Check size
docker compose -f docker-compose.prod.yml exec openclaw \
  du -sh /home/node/.openclaw/

# View large directories
docker compose -f docker-compose.prod.yml exec openclaw \
  du -sh /home/node/.openclaw/*

# If needed, clean old logs (inside container)
docker compose -f docker-compose.prod.yml exec openclaw sh
# rm -rf logs/* (or wherever logs are)
exit
```

## Production Considerations

### Security

✅ **What's already secured:**
- OpenClaw bound to internal network only (not public)
- Port 18789 not exposed to internet
- Token authentication enabled
- Config file stored securely

⚠️ **Additional recommendations:**
- Rotate `OPENCLAW_GATEWAY_TOKEN` after migration
- Keep `openclaw.json` permissions strict: `chmod 600`
- Don't expose gateway port to public unless necessary
- Use strong `OPENAI_API_KEY`

### Scaling

If you need multiple OpenClaw instances:

```yaml
openclaw-1:
  # ... same config ...
  container_name: velora_openclaw_1
  
openclaw-2:
  # ... same config, different container name ...
  container_name: velora_openclaw_2
```

Then use a load balancer to distribute requests.

### Monitoring

Monitor OpenClaw health:

```bash
# Check container status
watch -n 5 'docker compose -f docker-compose.prod.yml ps openclaw'

# Monitor resource usage
docker stats velora_openclaw

# Alert on crashes
docker compose -f docker-compose.prod.yml logs openclaw | grep -i "error\|fatal"
```

## Summary

Your OpenClaw setup is now:
- ✅ Containerized with Docker
- ✅ Integrated with Laravel via Docker network
- ✅ Auto-restarting on failure
- ✅ Monitored for health
- ✅ Secure and isolated
- ✅ Easy to backup and restore
- ✅ Production-ready

For detailed migration steps, see `OPENCLAW_MIGRATION.md`.
