╔════════════════════════════════════════════════════════════════════════════╗
║              OPENCLAW DOCKER DEPLOYMENT - COMPLETE SETUP                   ║
╚════════════════════════════════════════════════════════════════════════════╝

YOUR OPENCLAW CONFIGURATION:
  Version: 2026.3.8
  Node: v22.22.0
  Gateway Port: 18789
  Gateway Token: 999f1dc967d0bbf71eb413c04b1d4ea93bcbe441dc7a01ef
  
  Current Local Setup:
  - Config: /home/deck/.openclaw/openclaw.json
  - Workspaces: /home/deck/.openclaw/workspace*
  - Agents: /home/deck/.openclaw/agents/

═════════════════════════════════════════════════════════════════════════════

📦 OPENCLAW DOCKER FILES CREATED:

Core Files:
  ✅ Dockerfile.openclaw              - OpenClaw container image (Node.js 22)
  ✅ Updated docker-compose.prod.yml  - Added openclaw service
  ✅ Updated deploy.sh                - Added OpenClaw startup & health checks

Documentation:
  ✅ OPENCLAW_MIGRATION.md            - Step-by-step migration guide
  ✅ OPENCLAW_DOCKER_SETUP.md         - Complete Docker setup reference
  ✅ OPENCLAW_README.txt              - This file

═════════════════════════════════════════════════════════════════════════════

🚀 DEPLOYMENT FLOW:

1. Local → VPS (File Transfer)
   ┌─────────────────────────────────────────────────────┐
   │ ./upload-to-vps.sh uploads:                         │
   │  - All project files                                │
   │  - Dockerfile.openclaw                              │
   │  - docker-compose.prod.yml (with openclaw service)  │
   │  - deploy.sh (updated for OpenClaw)                 │
   └─────────────────────────────────────────────────────┘
                          ↓
                      (SSH uploads)
                          ↓
   ┌─────────────────────────────────────────────────────┐
   │ Then manually copy OpenClaw config:                 │
   │  /home/deck/.openclaw/ → /var/www/velora/openclaw/ │
   └─────────────────────────────────────────────────────┘
                          ↓
2. VPS Deployment
   ┌─────────────────────────────────────────────────────┐
   │ sudo bash deploy.sh                                 │
   │  1. Install Docker                                  │
   │  2. Setup directories                               │
   │  3. Configure .env                                  │
   │  4. Start PostgreSQL & Redis                        │
   │  5. Build & start OpenClaw container ✨            │
   │  6. Build & start Laravel app                       │
   │  7. Run migrations                                  │
   │  8. Setup SSL (Let's Encrypt)                       │
   │  9. Start Nginx                                     │
   └─────────────────────────────────────────────────────┘
                          ↓
3. Verify Installation
   ┌─────────────────────────────────────────────────────┐
   │ docker compose ps                                   │
   │  - postgres ✓                                       │
   │  - redis ✓                                          │
   │  - openclaw ✓ healthy                               │
   │  - app ✓                                            │
   │  - mcp-server ✓                                     │
   │  - nginx ✓                                          │
   │  - certbot ✓                                        │
   └─────────────────────────────────────────────────────┘

═════════════════════════════════════════════════════════════════════════════

🔗 DOCKER NETWORK ARCHITECTURE:

Public (Internet)
       │
       ↓ 80/443
    Nginx (reverse proxy + SSL)
       │
       ├─────────────────────────────────────────┐
       │                                         │
       ↓ Internal Docker Network                 ↓
    Laravel App                             (not exposed)
    (port 8000)                                  │
       │                                         │
       ├──────────────────┬──────────────────────┤
       ↓                  ↓                      ↓
    PostgreSQL        Redis              OpenClaw Gateway
    (port 5432)    (port 6379)          (port 18789)
                                              │
                                         Agents:
                                         - main (Alleria)
                                         - amo
                                         - lina
                                         - public
                                         - + others

Key Point:
  OpenClaw is NOT accessible from internet (good for security!)
  Only Laravel, MCP, and other containers can reach it

═════════════════════════════════════════════════════════════════════════════

📋 OPENL AW MIGRATION STEPS:

Step 1: Backup Local OpenClaw
  cd /home/deck/.openclaw
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

Step 2: Upload Project Files
  cd /home/deck/sales_ai_funnel
  ./upload-to-vps.sh ~/path/to/ssh-carlo.pem ubuntu 18.221.208.60

Step 3: Upload OpenClaw Backup to VPS
  scp -i ~/path/to/ssh-carlo.pem openclaw-backup.tar.gz \
      ubuntu@18.221.208.60:/var/www/velora/

Step 4: Extract on VPS
  ssh -i ~/path/to/ssh-carlo.pem ubuntu@18.221.208.60
  cd /var/www/velora
  mkdir -p openclaw/.openclaw
  cd openclaw/.openclaw
  tar -xzf ../../openclaw-backup.tar.gz

Step 5: Update OpenClaw Config for Docker
  nano openclaw.json
  
  Find and change:
  "bind": "loopback"  →  "bind": "0.0.0.0"
  
  Update all workspace paths:
  "/home/deck/.openclaw"  →  "/home/node/.openclaw"

Step 6: Deploy
  cd /var/www/velora
  sudo bash deploy.sh

═════════════════════════════════════════════════════════════════════════════

⚙️  OPENCLAW ENVIRONMENT VARIABLES:

Laravel .env after deployment will have:
  OPENCLAW_GATEWAY_URL=http://openclaw:18789
  OPENCLAW_GATEWAY_TOKEN=999f1dc967d0bbf71eb413c04b1d4ea93bcbe441dc7a01ef
  OPENCLAW_ALLERIA_AGENT_ID=main
  OPENCLAW_LINA_AGENT_ID=lina
  OPENCLAW_HTTP_TIMEOUT_SECONDS=900
  OPENAI_API_KEY=sk-...                (add your key)

Docker Compose automatically sets:
  - NODE_ENV=production
  - OPENAI_API_KEY (passed from Laravel .env)
  - OPENCLAW_GATEWAY_TOKEN (for auth)

═════════════════════════════════════════════════════════════════════════════

🧪 TESTING OPENL AW AFTER DEPLOYMENT:

Check Gateway Status:
  docker compose -f docker-compose.prod.yml logs -f openclaw

List Agents:
  docker compose -f docker-compose.prod.yml exec openclaw \
    openclaw agents list

Test Connectivity from Laravel:
  docker compose -f docker-compose.prod.yml exec app \
    curl -v http://openclaw:18789/

Test Agent:
  curl -X POST http://127.0.0.1:18789/v1/chat/completions \
    -H "Authorization: Bearer 999f1dc967d0bbf71eb413c04b1d4ea93bcbe441dc7a01ef" \
    -H "Content-Type: application/json" \
    -d '{
      "messages": [{"role": "user", "content": "hello"}],
      "model": "openclaw/main"
    }'

═════════════════════════════════════════════════════════════════════════════

📚 DOCUMENTATION:

Read these for complete details:

1. OPENCLAW_MIGRATION.md (REQUIRED)
   - Step-by-step migration instructions
   - File structure and permissions
   - Verification and troubleshooting

2. OPENCLAW_DOCKER_SETUP.md (REFERENCE)
   - Docker architecture and networking
   - Complete configuration reference
   - Managing OpenClaw (logs, commands)
   - Backup & restore procedures
   - Production considerations

3. DEPLOYMENT.md (GENERAL)
   - Full VPS deployment guide
   - All Docker services
   - Useful commands

═════════════════════════════════════════════════════════════════════════════

✅ WHAT'S READY:

All Docker files and configurations for OpenClaw are complete:
  ✓ Dockerfile.openclaw configured
  ✓ docker-compose.prod.yml updated with openclaw service
  ✓ deploy.sh updated to handle OpenClaw startup
  ✓ Health checks configured
  ✓ Volume mounting ready
  ✓ Network isolation configured
  ✓ Auto-restart enabled
  ✓ Comprehensive documentation provided

═════════════════════════════════════════════════════════════════════════════

⚠️  IMPORTANT NOTES:

1. OpenClaw is NOT public by default (secure!)
   - Only accessible via internal Docker network
   - Port 18789 bound to 127.0.0.1 only
   - Laravel accesses via: http://openclaw:18789

2. You MUST migrate your .openclaw directory
   - Config file: openclaw.json
   - All workspaces: workspace, workspace-amo, etc.
   - Agent definitions
   - See OPENCLAW_MIGRATION.md for exact steps

3. Update config paths before starting
   - All paths must change from /home/deck → /home/node
   - Bind address from "loopback" → "0.0.0.0"
   - Gateway will fail to start otherwise

4. OpenClaw startup is part of deploy.sh
   - No manual setup needed after migration
   - Health checks ensure it starts properly
   - Logs show exactly what's happening

═════════════════════════════════════════════════════════════════════════════

🎯 NEXT STEPS:

1. Backup your local OpenClaw:
   cd /home/deck/.openclaw && tar -czf openclaw-backup.tar.gz ...

2. Upload project files:
   ./upload-to-vps.sh ~/ssh-carlo.pem ubuntu 18.221.208.60

3. Upload and extract OpenClaw on VPS (see OPENCLAW_MIGRATION.md)

4. Update openclaw.json for Docker paths

5. Deploy:
   ssh -i ssh-carlo.pem ubuntu@18.221.208.60
   cd /var/www/velora
   sudo bash deploy.sh

6. Verify:
   docker compose -f docker-compose.prod.yml ps openclaw
   Should show: "healthy"

═════════════════════════════════════════════════════════════════════════════

✨ YOUR OPENCLAW IS READY FOR PRODUCTION DEPLOYMENT! 🚀

Everything is configured and ready. Just follow the migration steps in
OPENCLAW_MIGRATION.md and run the deploy script.

