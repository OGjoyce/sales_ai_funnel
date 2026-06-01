# OpenClaw Configuration

This directory contains OpenClaw agent gateway configuration for the Velora application.

## Structure

```
openclaw/
├── .openclaw/
│   ├── openclaw.json          # Main gateway configuration
│   ├── workspace/             # Main agent workspace (Alleria)
│   ├── workspace-lina/        # Lina agent workspace
│   ├── workspace-amo/         # Amo agent workspace
│   └── [other-workspaces]
├── skills/                    # Shared skills
└── memory/                    # Persistent memory storage
```

## Docker bootstrap (prod + local)

Every `openclaw` container start runs `docker/openclaw-entrypoint.sh`:

1. Creates `openclaw.json` from example if missing
2. `docker/openclaw-bootstrap.js` — `chatCompletions` on, agents **`lina`** and **`fernando`**, token from `OPENCLAW_GATEWAY_TOKEN`
3. `openclaw agents add lina` / `fernando` if the CLI does not list them yet
4. `docker/sync-fernando-docs.sh` — copies Velora markdown into `workspace-fernando/docs/`

Set `OPENCLAW_LINA_AGENT_ID=lina` and `OPENCLAW_FERNANDO_AGENT_ID=fernando` in Laravel `.env`.

**Fernando** (help / how-to / contact): edit `openclaw/workspace-fernando/SOUL.md`, `AGENTS.md`, and synced docs — not Laravel prompts. CRM chat: `/crm/help`. VPS checklist: [PROD_DEPLOY.md](../PROD_DEPLOY.md).

## Quick Setup

### Option 1: Using Existing OpenClaw Setup (Recommended)

If you already have OpenClaw installed locally at `~/.openclaw`:

```bash
# Copy your existing OpenClaw config to this folder
cp -r ~/.openclaw/* ./openclaw/.openclaw/

# Ensure openclaw.json exists
ls -la openclaw/.openclaw/openclaw.json
```

### Option 2: Create New OpenClaw Setup

1. **Install OpenClaw** (if not already installed):
   ```bash
   npm install -g openclaw
   ```

2. **Initialize OpenClaw**:
   ```bash
   # Create default config
   openclaw init --path ./openclaw/.openclaw
   ```

3. **Edit Configuration**:
   ```bash
   # Copy example and edit
   cp openclaw/.openclaw/openclaw.json.example openclaw/.openclaw/openclaw.json
   
   # Edit with your token and agent configuration
   nano openclaw/.openclaw/openclaw.json
   ```

## Configuration

### openclaw.json

Key sections:

```json
{
  "gateway": {
    "port": 18789,              // Port the gateway listens on
    "auth": {
      "token": "your-token"     // Your gateway authentication token
    }
  },
  "agents": [
    {
      "id": "main",
      "workspace": "./workspace"  // Path to agent workspace
    }
  ]
}
```

### Required Fields

- `gateway.port` - Port number (default: 18789)
- `gateway.auth.token` - Authentication token (from OpenClaw)
- `agents[].id` - Agent identifier (e.g., "main", "lina")
- `agents[].workspace` - Path to workspace directory

## Docker bootstrap (prod + local)

On every `openclaw` container start, `docker/openclaw-entrypoint.sh`:

1. Creates `openclaw.json` from `openclaw.json.example` if missing
2. Runs `docker/openclaw-bootstrap.js` — enables `chatCompletions`, ensures agent **`lina`**, syncs `OPENCLAW_GATEWAY_TOKEN`
3. Runs `openclaw agents add lina` if the CLI does not list it yet

Laravel must set `OPENCLAW_LINA_AGENT_ID=lina` and `OPENCLAW_GATEWAY_URL=http://openclaw:18789`.

See [PROD_DEPLOY.md](../PROD_DEPLOY.md) for VPS SSH checklist.

## Docker Integration

When Docker starts, it mounts this folder:

```bash
docker compose -f docker-compose.local.yml up -d

# OpenClaw config is mounted as:
# ./openclaw/.openclaw → /home/node/.openclaw (in container)
```

The gateway will be available at: `http://localhost:18789`

## Workspace Structure

Each agent needs a workspace directory:

```
workspace/
├── skills/              # Agent skills
├── memory/              # Agent memory
├── prompts/             # System prompts
└── config.json          # Agent config
```

## Environment Variables

In `.env` or `.env.docker`, configure:

```env
OPENCLAW_GATEWAY_URL=http://openclaw:18789
OPENCLAW_GATEWAY_TOKEN=your_token_here
OPENCLAW_LINA_AGENT_ID=lina
OPENCLAW_ALLERIA_AGENT_ID=main
OPENCLAW_HTTP_TIMEOUT_SECONDS=900
```

## Testing OpenClaw

```bash
# Check gateway health
curl http://localhost:18789/

# View logs
docker compose -f docker-compose.local.yml logs -f openclaw

# Connect to container
docker compose -f docker-compose.local.yml exec openclaw sh

# List agents
docker compose -f docker-compose.local.yml exec openclaw openclaw agents list
```

## Troubleshooting

### OpenClaw Container Won't Start

1. **Check config file exists**:
   ```bash
   ls -la openclaw/.openclaw/openclaw.json
   ```

2. **Check logs**:
   ```bash
   docker compose -f docker-compose.local.yml logs openclaw
   ```

3. **Verify JSON syntax**:
   ```bash
   cat openclaw/.openclaw/openclaw.json | jq .
   ```

### Can't Connect to Gateway

1. **Check port**:
   ```bash
   curl -v http://localhost:18789/
   ```

2. **Check container is running**:
   ```bash
   docker compose -f docker-compose.local.yml ps openclaw
   ```

3. **Check environment variable**:
   ```bash
   grep OPENCLAW_GATEWAY_URL .env
   ```

## Migration from Existing Setup

If you have OpenClaw running elsewhere:

```bash
# Copy entire config
cp -r ~/.openclaw/* ./openclaw/.openclaw/

# Or specific files
cp ~/.openclaw/openclaw.json ./openclaw/.openclaw/
cp -r ~/.openclaw/workspace* ./openclaw/.openclaw/
```

## Security Notes

- **Do NOT** commit actual `openclaw.json` with real tokens
- Use `.gitignore` to exclude: `openclaw/**/*.json` (except examples)
- Store tokens in `.env` instead
- Regenerate tokens regularly

## See Also

- [OPENCLAW_MIGRATION.md](../OPENCLAW_MIGRATION.md) - VPS migration guide
- [OPENCLAW_DOCKER_SETUP.md](../OPENCLAW_DOCKER_SETUP.md) - Docker-specific setup
- `docker-compose.local.yml` - Volume mounting configuration
- `Dockerfile.openclaw` - OpenClaw container image
