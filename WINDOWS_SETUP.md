# Windows Setup Guide - Docker Desktop

This guide walks you through setting up the Velora application on Windows using Docker Desktop.

## Prerequisites

### System Requirements
- **Windows 10/11** with Docker Desktop installed
- **RAM**: 8GB minimum (16GB recommended)
- **Disk Space**: 10GB free for Docker images and volumes
- **Port 80**: Available (nginx web server)

### Installation

1. **Install Docker Desktop**
   - Download from: https://www.docker.com/products/docker-desktop
   - Run the installer and follow the setup wizard
   - Enable WSL2 (Windows Subsystem for Linux 2) when prompted for better performance
   - Restart your computer when installation completes

2. **Verify Docker Installation**
   ```bash
   docker --version
   docker compose version
   ```

3. **Clone the Repository**
   ```bash
   git clone https://github.com/OGjoyce/sales_ai_funnel.git
   cd sales_ai_funnel
   ```

4. **Configure OpenClaw** (if using agents)
   ```bash
   # Option A: Copy existing OpenClaw config
   xcopy %USERPROFILE%\.openclaw openclaw\.openclaw /E /I /Y
   
   # Option B: Create new OpenClaw setup
   # - Edit openclaw\.openclaw\openclaw.json
   # - Add your gateway token
   # See openclaw/README.md for details
   ```

5. **Configure Environment**
   ```bash
   # Copy template to .env
   copy .env.example .env
   
   # Edit .env with your credentials
   # - OPENAI_API_KEY: Get from https://platform.openai.com/api-keys
   # - OPENCLAW_GATEWAY_TOKEN: Your OpenClaw token
   # - MCP_SERVICE_TOKEN: Your MCP service token
   notepad .env
   ```

   **Key Configuration for Docker:**
   ```env
   APP_ENV=local
   DB_HOST=postgres
   DB_PASSWORD=sales
   QUEUE_CONNECTION=redis
   CACHE_STORE=redis
   OPENCLAW_GATEWAY_URL=http://openclaw:18789
   OPENCLAW_GATEWAY_TOKEN=your_token_here
   OPENCLAW_LINA_AGENT_ID=lina
   OPENCLAW_ALLERIA_AGENT_ID=main
   OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
   MCP_SERVICE_TOKEN=your_token_here
   ```

---

## Quick Start - 3 Steps

### Step 1: Start Services
```bash
docker compose -f docker-compose.local.yml up -d
```

This will:
- ✅ Download Docker images (takes ~5-10 minutes on first run)
- ✅ Create PostgreSQL and Redis containers
- ✅ Start OpenClaw, Laravel app, and MCP server
- ✅ Setup nginx reverse proxy

### Step 2: Initialize Database
```bash
docker compose -f docker-compose.local.yml exec app php artisan migrate
```

### Step 3: Access the Application
Open your browser to:
```
http://localhost
```

That's it! The app should be running with:
- React frontend at http://localhost
- OpenClaw gateway at http://localhost:18789
- MCP server at http://localhost:8001

---

## Common Commands

```bash
# View all running services
docker compose -f docker-compose.local.yml ps

# View logs
docker compose -f docker-compose.local.yml logs -f app

# View logs for specific service
docker compose -f docker-compose.local.yml logs -f openclaw

# Stop all services
docker compose -f docker-compose.local.yml down

# Restart all services
docker compose -f docker-compose.local.yml restart

# Open Laravel shell
docker compose -f docker-compose.local.yml exec app sh

# Connect to PostgreSQL
docker compose -f docker-compose.local.yml exec postgres psql -U sales -d sales_ai_funnel

# Run artisan commands
docker compose -f docker-compose.local.yml exec app php artisan tinker
```

---

## Ports Reference

See [PORT_REFERENCE.md](./PORT_REFERENCE.md) for complete port documentation.

| Service | Port | URL |
|---------|------|-----|
| **Nginx (Web UI)** | 80 | http://localhost |
| **OpenClaw Gateway** | 18789 | http://localhost:18789 |
| **MCP Server** | 8001 | http://localhost:8001 |
| **PostgreSQL** | 5432 | Internal only |
| **Redis** | 6379 | Internal only |

---

## Troubleshooting

### Port Already in Use

**Error**: `Error response from daemon: driver failed programming external connectivity on endpoint ... (Dn53): Error starting userland proxy: listen tcp 0.0.0.0:80: bind: An attempt was made to use a port in its exclusive use.`

**Solution 1: Find what's using the port**
```bash
netstat -ano | findstr :80
```

**Solution 2: Change Docker port**
Edit `docker-compose.local.yml`:
```yaml
services:
  nginx:
    ports:
      - "8080:80"  # Change 80 to 8080 or another free port
```

Then access: `http://localhost:8080`

---

### Docker Daemon Not Running

**Error**: `error during connect: cannot connect to the Docker daemon`

**Solution**: Open Docker Desktop from the Start menu or system tray. Wait for it to fully load.

---

### Services Won't Start / Container Exits Immediately

**Check logs:**
```bash
docker compose -f docker-compose.local.yml logs app
docker compose -f docker-compose.local.yml logs postgres
```

**Common causes:**
1. **Database credentials wrong** - Check .env (DB_USERNAME, DB_PASSWORD)
2. **Database not ready** - PostgreSQL container might not have finished initializing
   - Wait 10 seconds and try again
3. **APP_KEY missing** - Run: `docker compose -f docker-compose.local.yml exec app php artisan key:generate`

---

### 500 Error on Homepage

**Step 1: Check PHP error logs**
```bash
docker compose -f docker-compose.local.yml logs app
```

**Step 2: Clear Laravel cache**
```bash
docker compose -f docker-compose.local.yml exec app php artisan cache:clear
docker compose -f docker-compose.local.yml exec app php artisan config:clear
```

**Step 3: Check database migrations**
```bash
docker compose -f docker-compose.local.yml exec app php artisan migrate:status
```

---

### Cannot Connect to OpenClaw

**Error**: Connection refused to `http://localhost:18789`

**Solution:**
1. Check if OpenClaw container is running:
   ```bash
   docker compose -f docker-compose.local.yml ps openclaw
   ```

2. Check OpenClaw logs:
   ```bash
   docker compose -f docker-compose.local.yml logs openclaw
   ```

3. Verify `~/.openclaw` exists with valid configuration

---

### Disk Space Running Out

**Check Docker disk usage:**
```bash
docker system df
```

**Clean up Docker images and volumes:**
```bash
docker system prune -a --volumes
```

**Then rebuild:**
```bash
docker compose -f docker-compose.local.yml build
docker compose -f docker-compose.local.yml up -d
```

---

## File Structure

```
sales_ai_funnel/
├── app/                          # Laravel backend
├── resources/                     # React frontend
├── docker-compose.local.yml       # Docker services (main config)
├── docker/                        # Docker configuration
│   ├── nginx.conf
│   └── conf.d/local.conf
├── Dockerfile                     # Laravel app image
├── Dockerfile.openclaw            # OpenClaw image
├── Dockerfile.python              # MCP server image
├── .env.example                   # Template environment file
├── .env.docker                    # Docker-specific environment
├── WINDOWS_SETUP.md               # This file
└── PORT_REFERENCE.md              # Port configuration details
```

---

## Development Workflow

### Making Frontend Changes

If you modify code in `resources/js/` or `resources/css/`:

```bash
# Rebuild frontend inside Docker
docker compose -f docker-compose.local.yml exec app npm run build

# Or rebuild on your host machine, then restart
npm run build
docker compose -f docker-compose.local.yml restart app
```

### Making Backend Changes

PHP code changes reload automatically. Just:
1. Edit the file
2. Refresh browser (or wait a few seconds)
3. Changes are live

### Database Changes

```bash
# Create a new migration
docker compose -f docker-compose.local.yml exec app php artisan make:migration create_table_name

# Run migrations
docker compose -f docker-compose.local.yml exec app php artisan migrate

# Reset database (delete all data)
docker compose -f docker-compose.local.yml down -v
docker compose -f docker-compose.local.yml up -d
docker compose -f docker-compose.local.yml exec app php artisan migrate
```

---

## Advanced: WSL2 Configuration (Optional)

For better Docker performance on Windows 10/11 with WSL2:

1. **Enable WSL2** in Docker Desktop settings
2. **Allocate resources** in Docker Desktop:
   - Go to Settings > Resources
   - CPUs: 4+ (half your available cores)
   - Memory: 4-6GB (half your available RAM)
   - Disk image size: 50GB+

---

## Need Help?

1. Check Docker Desktop logs:
   - Settings > Troubleshoot > View diagnostic logs

2. Check application logs:
   ```bash
   docker compose -f docker-compose.local.yml logs -f
   ```

3. See [DOCKER_LOCAL_SETUP.md](./DOCKER_LOCAL_SETUP.md) for comprehensive troubleshooting

---

## Next Steps

- [ ] Docker Desktop installed
- [ ] Repository cloned
- [ ] .env configured with API keys
- [ ] Services started with `docker compose up -d`
- [ ] Database migrated
- [ ] Access http://localhost
- [ ] OpenClaw testing at http://localhost:18789
- [ ] MCP server at http://localhost:8001

Once you've verified everything works locally, you can deploy to production. See [DEPLOYMENT.md](./DEPLOYMENT.md).
