#!/bin/sh
set -e
cd /var/www/velora

# Generate production gateway token if still placeholder
if grep -q 'your_openclaw_gateway_token_here' .env 2>/dev/null; then
  TOKEN=$(openssl rand -hex 32)
  sed -i "s|^OPENCLAW_GATEWAY_TOKEN=.*|OPENCLAW_GATEWAY_TOKEN=${TOKEN}|" .env
  echo "Set new OPENCLAW_GATEWAY_TOKEN in .env"
else
  TOKEN=$(grep '^OPENCLAW_GATEWAY_TOKEN=' .env | cut -d= -f2-)
  echo "Using existing OPENCLAW_GATEWAY_TOKEN from .env"
fi

export OPENCLAW_GATEWAY_TOKEN="$TOKEN"
export OPENCLAW_CONFIG_PATH=/home/node/.openclaw/openclaw.json

# Sync token + chatCompletions + lina into openclaw.json on disk
docker compose -f docker-compose.prod.yml exec -T -e OPENCLAW_GATEWAY_TOKEN="$TOKEN" openclaw node /usr/local/bin/openclaw-bootstrap.js

docker compose -f docker-compose.prod.yml exec -T openclaw openclaw config set gateway.http.endpoints.chatCompletions.enabled true

# Recreate app/openclaw so env + config apply
docker compose -f docker-compose.prod.yml up -d --force-recreate openclaw app

echo "Waiting for OpenClaw..."
sleep 25

docker compose -f docker-compose.prod.yml exec -T openclaw openclaw agents list | grep -E '^- lina|chatCompletions' || true

docker compose -f docker-compose.prod.yml exec -T app php artisan config:clear
docker compose -f docker-compose.prod.yml exec -T app php artisan config:cache

echo "Lina smoke test from Laravel:"
docker compose -f docker-compose.prod.yml exec -T app php artisan tinker --execute="echo json_encode(app(\App\Services\OpenClawGateway::class)->callLinaAgent('Responde solo JSON: {\"leads\":[]}', 1));"
