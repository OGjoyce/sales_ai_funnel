# OpenClaw Migration Guide for VPS Deployment

This guide explains how to migrate your OpenClaw setup from local to VPS with Docker.

## Current Local Setup

Your OpenClaw installation:
- **Installed at**: `/home/deck/.local/node-v22.22.0/bin/openclaw`
- **Version**: 2026.3.8
- **Node**: v22.22.0
- **Config file**: `/home/deck/.openclaw/openclaw.json`
- **Gateway Port**: 18789
- **Gateway Token**: `999f1dc967d0bbf71eb413c04b1d4ea93bcbe441dc7a01ef`

## Files to Migrate

Your OpenClaw data that must be copied to VPS:

### 1. Config File (Required)
```
/home/deck/.openclaw/openclaw.json
```
This file contains:
- Gateway configuration (port, bind, auth)
- Agent definitions (main, amo, lina, etc.)
- Workspace paths
- WhatsApp/channel bindings
- Authentication tokens
- Email/API integrations

### 2. Workspaces (Required)
All your workspace directories with skills, memory, and data:

```
/home/deck/.openclaw/workspace           # Main (Alleria)
/home/deck/.openclaw/workspace-amo       # Amo agent
/home/deck/.openclaw/workspace-lina      # Lina agent
/home/deck/.openclaw/workspace-public    # Public agent
/home/deck/.openclaw/workspace-lanaya    # Lanaya agent
/home/deck/.openclaw/workspace-rubick    # Rubick agent
/home/deck/.openclaw/workspace-cotizador # Cotizador agent
/home/deck/.openclaw/workspace-ax86_1_6  # Whatsapp test agent
/home/deck/.openclaw/workspace-ax86_1_1  # T agent
```

### 3. Agent Definitions (Recommended)
```
/home/deck/.openclaw/agents/<agentId>/agent
```
Contains agent templates and configuration for each agent.

## VPS Deployment Strategy

### Docker Volumes Structure

On VPS, OpenClaw will be containerized with this structure:

```
/var/www/velora/
├── openclaw/
│   └── .openclaw/              # Mounted to container:/home/node/.openclaw
│       ├── openclaw.json       # Config file
│       ├── workspace/          # Main workspace
│       ├── workspace-amo/
│       ├── workspace-lina/
│       ├── workspace-public/
│       ├── workspace-lanaya/
│       ├── workspace-rubick/
│       ├── workspace-cotizador/
│       ├── workspace-ax86_1_6/
│       ├── workspace-ax86_1_1/
│       └── agents/             # Agent definitions
│           ├── main/
│           ├── amo/
│           ├── lina/
│           └── [... rest of agents]
│
├── docker-compose.prod.yml
├── Dockerfile.openclaw
└── [... other files]
```

## Migration Steps

### Step 1: Prepare Local Files

On your local machine, package the OpenClaw directory:

```bash
cd /home/deck/.openclaw

# Create a tarball of all OpenClaw data
tar -czf openclaw-backup.tar.gz \
  openclaw.json \
  workspace/ \
  workspace-amo/ \
  workspace-lina/ \
  workspace-public/ \
  workspace-lanaya/ \
  workspace-rubick/ \
  workspace-cotizador/ \
  workspace-ax86_1_6/ \
  workspace-ax86_1_1/ \
  agents/

# Optional: also backup browser config
tar -czf openclaw-full-backup.tar.gz .openclaw/
```

### Step 2: Copy to VPS

**Option A: Via SCP (if you have the file locally)**

```bash
# From your machine:
scp -i ssh-carlo.pem openclaw-backup.tar.gz \
    ubuntu@18.221.208.60:/var/www/velora/

# SSH into VPS
ssh -i ssh-carlo.pem ubuntu@18.221.208.60
```

**Option B: Via SSH (direct from this machine)**

```bash
# From your machine, if /home/deck is accessible:
ssh -i ssh-carlo.pem ubuntu@18.221.208.60 << 'EOF'
cd /var/www/velora
mkdir -p openclaw/.openclaw
cd openclaw/.openclaw
EOF

# Then transfer files individually or tarball
```

### Step 3: Extract on VPS

```bash
# SSH into VPS
ssh -i ssh-carlo.pem ubuntu@18.221.208.60

# Navigate to application
cd /var/www/velora/openclaw/.openclaw

# Extract the backup
tar -xzf ../openclaw-backup.tar.gz

# Verify files
ls -la
# Should see: openclaw.json, workspace/, workspace-amo/, etc.
```

### Step 4: Update openclaw.json for Docker

The config file needs updates for Docker networking. Edit:

```bash
cd /var/www/velora/openclaw/.openclaw
nano openclaw.json
```

**Changes needed in openclaw.json:**

```json
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "0.0.0.0",          // Changed from "loopback" to "0.0.0.0"
    "controlUi": {
      "dangerouslyDisableDeviceAuth": true
    },
    "auth": {
      "mode": "token",
      "token": "999f1dc967d0bbf71eb413c04b1d4ea93bcbe441dc7a01ef"  // Keep same
    },
    "http": {
      "endpoints": {
        "chatCompletions": {
          "enabled": true
        }
      }
    }
  }
}
```

**Important workspace path changes:**

In the `agents.list`, update workspace paths. Since they're mounted to `/home/node/.openclaw/` in Docker:

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "name": "Alleria",
        "workspace": "/home/node/.openclaw/workspace",        // Update from /home/deck/...
        "agentDir": "/home/node/.openclaw/agents/main/agent"  // Update from /home/deck/...
      },
      {
        "id": "amo",
        "workspace": "/home/node/.openclaw/workspace-amo",
        "agentDir": "/home/node/.openclaw/agents/amo/agent"
      }
      // ... etc for all agents
    ]
  }
}
```

### Step 5: Update Laravel .env for Docker Network

When you run `deploy.sh` on VPS, it will update `.env` automatically. Verify these are set:

```env
OPENCLAW_GATEWAY_URL=http://openclaw:18789
OPENCLAW_GATEWAY_TOKEN=999f1dc967d0bbf71eb413c04b1d4ea93bcbe441dc7a01ef
OPENCLAW_ALLERIA_AGENT_ID=main
OPENCLAW_LINA_AGENT_ID=lina
```

The deploy script will auto-update `OPENCLAW_GATEWAY_URL` to point to the Docker service.

### Step 6: Start Services

```bash
cd /var/www/velora

# Start all services including OpenClaw
docker compose -f docker-compose.prod.yml up -d

# Wait for services to start
sleep 10

# Check OpenClaw is healthy
docker compose -f docker-compose.prod.yml exec openclaw wget --quiet --tries=1 --spider http://localhost:18789/ && echo "OpenClaw is running" || echo "OpenClaw failed to start"

# View OpenClaw logs
docker compose -f docker-compose.prod.yml logs -f openclaw
```

## Verification

### 1. Check OpenClaw Gateway

```bash
# From inside the VPS container
docker compose -f docker-compose.prod.yml exec openclaw \
  openclaw gateway status

# Or from your machine
curl -H "Authorization: Bearer 999f1dc967d0bbf71eb413c04b1d4ea93bcbe441dc7a01ef" \
  http://127.0.0.1:18789/api/status

# Should return: gateway is running with your agents
```

### 2. Check Laravel Connection

```bash
docker compose -f docker-compose.prod.yml exec app \
  php artisan tinker

# In tinker:
$ch = curl_init('http://openclaw:18789/api/status');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer 999f1dc967d0bbf71eb413c04b1d4ea93bcbe441dc7a01ef']);
$response = curl_exec($ch);
echo $response;
```

### 3. Test Agent Access

```bash
# Access an agent through the gateway
curl -X POST http://127.0.0.1:18789/v1/chat/completions \
  -H "Authorization: Bearer 999f1dc967d0bbf71eb413c04b1d4ea93bcbe441dc7a01ef" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "hello"}],
    "model": "openclaw/main"
  }'
```

## Troubleshooting

### OpenClaw Container Won't Start

```bash
# View logs
docker compose -f docker-compose.prod.yml logs openclaw

# Common issues:
# 1. Config file path wrong: check openclaw.json in /var/www/velora/openclaw/.openclaw/
# 2. Node modules not installed: the Dockerfile handles this
# 3. Port conflicts: 18789 might be in use
```

### Can't Connect to OpenClaw from Laravel

```bash
# Check network connectivity between containers
docker compose -f docker-compose.prod.yml exec app \
  curl -v http://openclaw:18789/

# Check if openclaw service is healthy
docker compose -f docker-compose.prod.yml ps openclaw
# Should show "healthy"

# Check gateway token
grep OPENCLAW_GATEWAY_TOKEN /var/www/velora/.env
```

### WhatsApp Integration Not Working

The WhatsApp bindings in `openclaw.json` require the WhatsApp plugin to be properly configured. Key things to check:

```bash
# In openclaw.json, verify:
# 1. channels.whatsapp.enabled is true
# 2. Account credentials are set (if using external WhatsApp business API)
# 3. Bindings are present

# View WhatsApp status
docker compose -f docker-compose.prod.yml exec openclaw \
  openclaw plugins status
```

### Workspaces Not Loading

```bash
# Verify workspace files exist
docker compose -f docker-compose.prod.yml exec openclaw \
  ls -la /home/node/.openclaw/workspace*/

# Check permissions
docker compose -f docker-compose.prod.yml exec openclaw \
  ls -la /home/node/.openclaw/ | grep workspace

# If permissions are wrong:
docker compose -f docker-compose.prod.yml exec openclaw \
  chmod -R 755 /home/node/.openclaw/workspace*/
```

## Security Notes

1. **Token Rotation** (Recommended after migration)
   ```bash
   # Generate new token
   openssl rand -hex 32
   
   # Update in openclaw.json and .env
   ```

2. **Port Exposure** (Already handled)
   - OpenClaw gateway only listens on internal Docker network
   - Not exposed to public internet
   - Only accessible from Laravel/MCP containers

3. **Config File Permissions**
   ```bash
   # Secure the config
   chmod 600 /var/www/velora/openclaw/.openclaw/openclaw.json
   ```

## Backup & Recovery

### Regular Backups

```bash
# Backup OpenClaw data
cd /var/www/velora
tar -czf openclaw-backup-$(date +%Y%m%d).tar.gz openclaw/

# Store off-server:
# scp openclaw-backup-20260512.tar.gz yourcloud:backups/
```

### Restore from Backup

```bash
cd /var/www/velora
rm -rf openclaw/
tar -xzf openclaw-backup-20260512.tar.gz

# Restart OpenClaw
docker compose -f docker-compose.prod.yml restart openclaw
```

## Docker Commands for OpenClaw

```bash
cd /var/www/velora

# View OpenClaw logs
docker compose -f docker-compose.prod.yml logs -f openclaw

# Restart OpenClaw
docker compose -f docker-compose.prod.yml restart openclaw

# Shell into OpenClaw container
docker compose -f docker-compose.prod.yml exec openclaw sh

# Run OpenClaw commands inside container
docker compose -f docker-compose.prod.yml exec openclaw openclaw status
docker compose -f docker-compose.prod.yml exec openclaw openclaw agents list
docker compose -f docker-compose.prod.yml exec openclaw openclaw logs --follow

# Rebuild OpenClaw image (if needed)
docker compose -f docker-compose.prod.yml build --no-cache openclaw

# Stop only OpenClaw
docker compose -f docker-compose.prod.yml stop openclaw

# Start only OpenClaw
docker compose -f docker-compose.prod.yml up -d openclaw
```

## Summary

Migration checklist:

- [ ] Backup `/home/deck/.openclaw/` locally
- [ ] Upload `openclaw-backup.tar.gz` to VPS
- [ ] Extract files to `/var/www/velora/openclaw/.openclaw/`
- [ ] Update `openclaw.json` with Docker paths and bind address
- [ ] Update `.env` with OpenClaw configuration
- [ ] Run `deploy.sh` or start docker-compose
- [ ] Verify OpenClaw gateway is healthy
- [ ] Test Laravel → OpenClaw connectivity
- [ ] Test agents are accessible
- [ ] Backup everything off-server

That's it! OpenClaw will run as a containerized service on your VPS, integrated with the rest of your Velora deployment.
