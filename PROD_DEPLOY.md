# Production deploy (Docker + OpenClaw + Lina)

Use this checklist when deploying on the VPS over SSH. OpenClaw **auto-creates agent `lina`** and enables **chat completions** on every container start (`docker/openclaw-entrypoint.sh` + `docker/openclaw-bootstrap.js`).

## Prerequisites on the server

- Docker + Docker Compose plugin
- Git clone at e.g. `/var/www/velora` (or your path)
- Domain DNS → server IP (for nginx / certbot)

## 1. Environment file

Create `.env` on the server (do **not** commit secrets):

```bash
cp .env.example .env
nano .env
```

**Required for CRM + Lina:**

| Variable | Example / notes |
|----------|-----------------|
| `APP_KEY` | `php artisan key:generate` on host or set in `.env` |
| `APP_URL` | `https://your-domain.com` |
| `DB_*` | Postgres credentials (match compose) |
| `OPENAI_API_KEY` | Your OpenAI key |
| `OPENCLAW_GATEWAY_URL` | `http://openclaw:18789` (Docker service name) |
| `OPENCLAW_GATEWAY_TOKEN` | Strong random token — **same** value synced into OpenClaw on boot |
| `OPENCLAW_LINA_AGENT_ID` | `lina` |
| `OPENCLAW_FERNANDO_AGENT_ID` | `fernando` |
| `VELORA_SUPPORT_EMAIL` | Support inbox for welcome mail / billing |
| `VELORA_CALENDLY_URL` | Consultation link |
| `MAIL_*` | Real SMTP (not `log`) for verification + welcome |
| `OPENCLAW_ALLERIA_AGENT_ID` | `main` |
| `OPENCLAW_HTTP_TIMEOUT_SECONDS` | `900` |
| `MCP_SERVICE_TOKEN` | Strong random token for MCP → Laravel |

`OPENCLAW_API_KEY` can be empty; Laravel uses `OPENCLAW_GATEWAY_TOKEN` as Bearer token.

## 2. OpenClaw data directory

Either:

- **Fresh:** commit includes `openclaw/.openclaw/openclaw.json.example` — first start copies/bootstraps `openclaw.json` with **lina** + chatCompletions.
- **Migrate from old server:** copy entire `openclaw/.openclaw/` (especially `workspace-lina/` for custom scraping skills).

```bash
mkdir -p openclaw/.openclaw
# optional: restore tarball from old machine into openclaw/.openclaw/
```

## 3. Build and start

```bash
cd /var/www/velora   # your app root

docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

docker compose -f docker-compose.prod.yml ps
```

## 4. Verify OpenClaw + Lina

```bash
# Agents must list "lina"
docker compose -f docker-compose.prod.yml exec openclaw openclaw agents list

# Gateway up
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:18789/

# From app container (optional)
docker compose -f docker-compose.prod.yml exec app php artisan tinker --execute="
  echo json_encode(app(\App\Services\OpenClawGateway::class)->callLinaAgent('Responde {\"leads\":[]} solo JSON.', 1));
"
```

## 5. Fernando (help agent) + docs sync

```bash
chmod +x docker/sync-fernando-docs.sh
REPO_ROOT="$(pwd)" ./docker/sync-fernando-docs.sh
docker compose -f docker-compose.prod.yml exec openclaw openclaw agents list   # must show fernando
docker compose -f docker-compose.prod.yml restart openclaw
```

CRM UI: `/crm/help`. Edit behavior in `openclaw/workspace-fernando/SOUL.md` and `AGENTS.md`, then re-sync and restart OpenClaw.

## 6. Laravel

Migrations run on app container start. If needed:

```bash
docker compose -f docker-compose.prod.yml exec app php artisan migrate --force
docker compose -f docker-compose.prod.yml exec app php artisan db:seed --class=FunnelStageSeeder --force
docker compose -f docker-compose.prod.yml exec app php artisan config:cache
```

**Trial / billing:** new users get 7-day trial. Extend manually:

```bash
docker compose -f docker-compose.prod.yml exec app php artisan user:grant-trial user@example.com --days=14
```

## 7. Frontend assets

Ensure queue workers run (supervisord in `app` image).

Production nginx serves `public/`. Build on CI or server before deploy:

```bash
npm ci && npm run build
# commit public/build or rsync to server
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Lina 404 / chatCompletions | `docker compose -f docker-compose.prod.yml restart openclaw` — entrypoint re-runs bootstrap |
| Token 401 | `OPENCLAW_GATEWAY_TOKEN` in `.env` must match; restart `openclaw` |
| App waits on OpenClaw | Check `docker compose logs openclaw`; healthcheck needs ~60s on first boot |
| Empty / weak leads | Restore old `workspace-lina/` from previous OpenClaw host |

## SSH session

When you connect, share: app path, `docker compose ps`, and `openclaw agents list` output. We can walk through `.env`, compose up, and a test **Agregar leads** on the kanban together.
