# Port Reference - Complete Port Configuration

This document describes all ports used by the Velora application and how they're accessed from different environments.

---

## Quick Reference Table

| Service | Internal Port | Host Binding | Access URL | Purpose |
|---------|---------------|--------------|-----------|---------|
| **nginx** (Reverse Proxy) | 80 | `0.0.0.0:80` | http://localhost | Web UI / API gateway |
| **app** (Laravel/PHP-FPM) | 9000 | Internal only | N/A | FastCGI backend |
| **postgres** (Database) | 5432 | Internal only | docker compose exec | PostgreSQL database |
| **redis** (Cache/Queue) | 6379 | Internal only | docker compose exec | Redis cache & queue |
| **openclaw** (Agent Gateway) | 18789 | `127.0.0.1:18789` | http://localhost:18789 | OpenClaw agent gateway |
| **mcp-server** (MCP Bridge) | 8001 | `127.0.0.1:8001` | http://localhost:8001 | MCP server / Claude integration |

---

## Detailed Service Information

### 1. Nginx (Web Server)

**Purpose**: Reverse proxy, HTTP routing, static file serving, SSL termination

**Configuration**:
- Internal port: 80
- Host binding: `0.0.0.0:80` (all interfaces)
- Access from Windows: `http://localhost`
- Access from Docker network: `http://nginx`

**What it does**:
- Routes incoming HTTP requests to Laravel app via FastCGI
- Serves static assets (CSS, JS, images)
- Provides caching headers for performance
- Acts as SSL terminator (on production)

**Access**:
```bash
# From Windows browser
http://localhost

# From Docker container
curl http://nginx
```

---

### 2. Laravel / PHP-FPM (App)

**Purpose**: Application logic, API endpoints, routing

**Configuration**:
- Internal port: 9000
- Host binding: None (internal only)
- Access method: Only via nginx (no direct access)

**What it does**:
- Runs Laravel application code
- Processes HTTP requests from nginx
- Manages database queries
- Executes queue jobs (workers)
- Runs scheduled tasks

**Access**:
```bash
# Enter app container shell
docker compose -f docker-compose.local.yml exec app sh

# Run artisan commands
docker compose -f docker-compose.local.yml exec app php artisan tinker
```

---

### 3. PostgreSQL (Database)

**Purpose**: Data persistence, relational data storage

**Configuration**:
- Internal port: 5432
- Host binding: None (internal only)
- Access method: Via `docker compose exec`
- Database name: `sales_ai_funnel`
- Username: `sales`
- Password: Set in `.env.docker`

**What it does**:
- Stores all application data (users, settings, etc.)
- Supports pgvector extension (AI embeddings)
- Provides persistent storage via Docker volume

**Access**:
```bash
# Connect with psql
docker compose -f docker-compose.local.yml exec postgres \
  psql -U sales -d sales_ai_funnel

# In psql, useful commands:
# \dt              - List tables
# SELECT * FROM users;  - Query users
# \q              - Quit
```

**From Laravel**:
- Configured in `.env`: `DB_HOST=postgres DB_PORT=5432`
- Laravel connects automatically

---

### 4. Redis (Cache & Queue)

**Purpose**: Caching, queue job processing, session storage

**Configuration**:
- Internal port: 6379
- Host binding: None (internal only)
- Access method: Via `docker compose exec`
- No authentication (PASSWORD=null)

**What it does**:
- Caches frequently accessed data
- Stores queued jobs (background tasks)
- Stores temporary session data
- Provides fast in-memory storage

**Access**:
```bash
# Connect to Redis
docker compose -f docker-compose.local.yml exec redis redis-cli

# Useful redis-cli commands:
# PING              - Check connection
# KEYS *            - List all keys
# GET <key>         - Get value
# DEL <key>         - Delete key
# FLUSHALL          - Clear all data
```

**From Laravel**:
- Configured in `.env`: `REDIS_HOST=redis REDIS_PORT=6379`
- Used for caching and queues

---

### 5. OpenClaw (Agent Gateway)

**Purpose**: OpenClaw agent integration, AI agent communication

**Configuration**:
- Internal port: 18789
- Host binding: `127.0.0.1:18789`
- Access from Windows: `http://localhost:18789`
- Access from Docker network: `http://openclaw:18789`
- Volume mount: `~/.openclaw` (your local OpenClaw config)

**What it does**:
- Runs OpenClaw gateway daemon
- Manages AI agents (Lina, Alleria, etc.)
- Provides REST API for agent operations
- Uses your local `~/.openclaw` configuration

**Access**:
```bash
# From Windows browser
http://localhost:18789

# From Docker container
curl http://openclaw:18789

# Check OpenClaw health
docker compose -f docker-compose.local.yml exec openclaw \
  wget --quiet --tries=1 --spider http://localhost:18789/

# List configured agents
docker compose -f docker-compose.local.yml exec openclaw \
  openclaw agents list
```

**Configuration**:
```env
OPENCLAW_GATEWAY_URL=http://openclaw:18789
OPENCLAW_GATEWAY_TOKEN=your_token_here
OPENCLAW_LINA_AGENT_ID=lina
OPENCLAW_ALLERIA_AGENT_ID=main
```

---

### 6. MCP Server (Python Service)

**Purpose**: MCP (Model Context Protocol) bridge, Claude integration

**Configuration**:
- Internal port: 8001
- Host binding: `127.0.0.1:8001`
- Access from Windows: `http://localhost:8001`
- Access from Docker network: `http://mcp-server:8001`
- Environment: `LARAVEL_API_URL=http://app:8000/api`

**What it does**:
- Provides MCP protocol implementation
- Bridges Laravel API to Claude
- Handles protocol serialization
- Manages tool/resource definitions

**Access**:
```bash
# From Windows browser
http://localhost:8001

# From Docker container
curl http://mcp-server:8001

# Check MCP server logs
docker compose -f docker-compose.local.yml logs mcp-server
```

**Configuration**:
```env
MCP_SERVICE_TOKEN=your_token_here
LARAVEL_API_URL=http://app:8000/api
```

---

## Port Configuration by Environment

### Local Development (Docker Desktop on Windows)

```yaml
Services access:
- nginx:       0.0.0.0:80      → http://localhost
- openclaw:    127.0.0.1:18789 → http://localhost:18789
- mcp-server:  127.0.0.1:8001  → http://localhost:8001
- postgres:    internal only
- redis:       internal only
- app:         internal only
```

**File**: `docker-compose.local.yml`

### Docker Network (Container-to-Container)

When containers communicate internally, they use service names:

```
nginx → http://app:9000         (FastCGI)
app → postgresql://postgres:5432 (Database)
app → redis://redis:6379         (Cache)
app → http://openclaw:18789      (Agents)
mcp-server → http://app:8000/api (API)
```

### Production (VPS)

```yaml
Services access:
- nginx:       0.0.0.0:80      → https://domain.com (HTTP redirect)
- nginx:       0.0.0.0:443     → https://domain.com (HTTPS)
- postgres:    internal only
- redis:       internal only
- app:         internal only
- openclaw:    internal only
- mcp-server:  internal only
- certbot:     8000 (webroot)   → internal only
```

**File**: `docker-compose.prod.yml`

---

## Port Conflicts & Troubleshooting

### Windows Port 80 Already in Use

**Check what's using it:**
```bash
netstat -ano | findstr :80
```

**Common services that use port 80:**
- IIS (Internet Information Services)
- Apache
- Other Docker containers
- Skype
- Hyper-V

**Solution 1: Change Docker port**

Edit `docker-compose.local.yml`:
```yaml
services:
  nginx:
    ports:
      - "8080:80"    # Change to any free port
```

Then access: `http://localhost:8080`

**Solution 2: Stop the conflicting service**

```bash
# Stop IIS
net stop W3SVC

# Or stop the problematic process
taskkill /PID <process_id> /F
```

**Solution 3: Use different ports for multiple services**

```yaml
services:
  nginx:
    ports:
      - "9000:80"      # Nginx on 9000
  openclaw:
    ports:
      - "19789:18789"  # OpenClaw on 19789
  mcp-server:
    ports:
      - "9001:8001"    # MCP on 9001
```

Then access:
- Web UI: `http://localhost:9000`
- OpenClaw: `http://localhost:19789`
- MCP: `http://localhost:9001`

---

### Port Already in Use on Mac/Linux

```bash
# Find process using port
lsof -i :80
sudo lsof -i :80

# Kill the process
kill -9 <PID>
sudo kill -9 <PID>
```

---

## Firewall Considerations

### Windows Firewall

Docker Desktop should automatically add firewall rules for:
- Port 80 (nginx)
- Port 18789 (OpenClaw)
- Port 8001 (MCP server)

If you have issues:
1. Open Windows Defender Firewall with Advanced Security
2. Go to Inbound Rules
3. Find "docker-desktop" or "Docker Desktop"
4. Ensure it allows the required ports

### Third-Party Firewalls

Some firewalls may block ports. Temporarily disable them to test:
```bash
# Disable Windows Firewall (admin only)
netsh advfirewall set allprofiles state off

# Re-enable
netsh advfirewall set allprofiles state on
```

---

## Docker Network Architecture

```
Docker Network: velora_local (bridge)
═════════════════════════════════════════

┌──────────────────────────────────────┐
│ Host Machine (Windows)               │
│                                      │
│  Port 80    → nginx:80               │
│  Port 18789 → openclaw:18789         │
│  Port 8001  → mcp-server:8001        │
│                                      │
└──────────────────────────────────────┘
             ↓ Docker Bridge ↓
┌──────────────────────────────────────┐
│ Docker Network: velora_local         │
│                                      │
│  nginx ←→ app:9000 (FastCGI)        │
│  app ←→ postgres:5432 (SQL)         │
│  app ←→ redis:6379 (Cache)          │
│  app ←→ openclaw:18789 (Agents)     │
│  mcp-server ←→ app:8000/api (API)   │
│                                      │
└──────────────────────────────────────┘
```

---

## Health Check Endpoints

Each service has health checks to ensure it's running:

```bash
# Nginx health (should return 200)
curl -i http://localhost/

# OpenClaw health
curl -i http://localhost:18789/

# MCP server health
curl -i http://localhost:8001/

# PostgreSQL health
docker compose -f docker-compose.local.yml exec postgres pg_isready -U sales

# Redis health
docker compose -f docker-compose.local.yml exec redis redis-cli ping
```

---

## Performance Tuning

### For Slow Network

If port access is slow, check:
1. Docker Desktop resource allocation (Settings > Resources)
2. Network adapter settings
3. Firewall blocking (temporarily disable to test)

### For Port Saturation

If you have many services running:
1. Use sequential port numbers: 8001, 8002, 8003, etc.
2. Bind only to `127.0.0.1` (localhost only), not `0.0.0.0`
3. Use Docker Compose override file for local customization

**Example override (docker-compose.override.yml)**:
```yaml
services:
  nginx:
    ports:
      - "8080:80"      # Override default
  openclaw:
    ports:
      - "19789:18789"  # Override default
```

---

## Summary

- **Nginx (80)**: Entry point for all HTTP traffic
- **OpenClaw (18789)**: AI agent gateway
- **MCP Server (8001)**: Claude integration
- **PostgreSQL (5432)**: Database (internal only)
- **Redis (6379)**: Cache & queue (internal only)
- **PHP-FPM (9000)**: App backend (internal only)

All internal services communicate via Docker network; only nginx, OpenClaw, and MCP are exposed to the host.

For Windows users: If port 80 is in use, change it in `docker-compose.local.yml` and access via the new port.
