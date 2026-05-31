#!/bin/sh
# Usage (on VPS): bash docker/set-prod-openai-key.sh /path/to/key-file
# File must contain one line: OPENAI_API_KEY=sk-proj-...
set -e
cd /var/www/velora

KEY_FILE="${1:-}"
if [ -z "$KEY_FILE" ] || [ ! -f "$KEY_FILE" ]; then
  echo "Usage: bash docker/set-prod-openai-key.sh /path/to/openai-key.env"
  echo "File format: OPENAI_API_KEY=sk-proj-..."
  exit 1
fi

# shellcheck disable=SC1090
. "$KEY_FILE"

if [ -z "$OPENAI_API_KEY" ] || echo "$OPENAI_API_KEY" | grep -qE 'YOUR_OPENAI|HERE$'; then
  echo "ERROR: OPENAI_API_KEY is missing or still a placeholder."
  exit 1
fi

grep -v '^OPENAI_API_KEY=' .env > .env.tmp
printf '%s\n' "OPENAI_API_KEY=${OPENAI_API_KEY}" >> .env.tmp
mv .env.tmp .env

echo "OPENAI_API_KEY updated in .env"
docker compose -f docker-compose.prod.yml up -d --force-recreate openclaw app
sleep 20
docker compose -f docker-compose.prod.yml exec -T app php artisan config:clear
docker compose -f docker-compose.prod.yml exec -T app php artisan config:cache
echo "Smoke test:"
docker compose -f docker-compose.prod.yml exec -T app php artisan tinker --execute="echo json_encode(app(\App\Services\OpenClawGateway::class)->callLinaAgent('Responde solo JSON: {\"leads\":[]}', 1));"
