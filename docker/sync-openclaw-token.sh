#!/bin/sh
set -e
cd /var/www/velora
TOKEN=$(grep '^OPENCLAW_GATEWAY_TOKEN=' .env | cut -d= -f2-)
if [ -z "$TOKEN" ] || echo "$TOKEN" | grep -q 'your_openclaw'; then
  echo "ERROR: Set OPENCLAW_GATEWAY_TOKEN in .env first"
  exit 1
fi
export OPENCLAW_GATEWAY_TOKEN="$TOKEN"
export OPENCLAW_CONFIG_PATH=/home/node/.openclaw/openclaw.json
docker compose -f docker-compose.prod.yml exec -T -e OPENCLAW_GATEWAY_TOKEN="$TOKEN" openclaw node /usr/local/bin/openclaw-bootstrap.js
docker compose -f docker-compose.prod.yml restart openclaw
sleep 20
echo "Token synced. Restarting app..."
docker compose -f docker-compose.prod.yml restart app
sleep 10
echo done
