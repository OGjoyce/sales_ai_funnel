#!/bin/bash
# Incremental production update (run on VPS as ubuntu in /var/www/velora)
set -euo pipefail

cd /var/www/velora
COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> Git pull"
git stash push -m "pre-deploy-$(date +%s)" -u 2>/dev/null || true
git fetch origin master
git reset --hard origin/master

echo "==> Frontend build (inside app container; copies to host for nginx)"
$COMPOSE up -d app 2>/dev/null || true
$COMPOSE exec -u root -T app sh -c 'apk add --no-cache nodejs npm 2>/dev/null; cd /app && npm ci && npm run build'
docker cp velora_app:/app/public/build/. ./public/build/

echo "==> Docker build"
$COMPOSE build app openclaw mcp-server

echo "==> Up services"
$COMPOSE up -d

echo "==> Migrate + funnel seed"
$COMPOSE exec -T app php artisan migrate --force
$COMPOSE exec -T app php artisan db:seed --class=Database\\Seeders\\FunnelStageSeeder --force --no-interaction 2>/dev/null || true

echo "==> Fernando docs"
chmod +x docker/sync-fernando-docs.sh
REPO_ROOT="$(pwd)" ./docker/sync-fernando-docs.sh
$COMPOSE exec -T app php artisan velora:sync-fernando-docs 2>/dev/null || true

echo "==> Testing flags (skip verify + Invoker deploy)"
grep -q 'VELORA_ALLOW_SKIP_EMAIL_VERIFICATION=true' .env 2>/dev/null || echo "  Tip: add VELORA_ALLOW_SKIP_EMAIL_VERIFICATION=true to .env for bypass button"
grep -q 'VELORA_ADMIN_EMAILS=' .env 2>/dev/null || echo "  Tip: add VELORA_ADMIN_EMAILS=your@email.com for /admins/invoker"

echo "==> Cache + restart"
$COMPOSE exec -T app php artisan config:cache
$COMPOSE exec -T app php artisan route:cache
$COMPOSE restart openclaw app nginx

echo "==> Status"
$COMPOSE ps
$COMPOSE exec -T openclaw openclaw agents list 2>/dev/null | grep -E 'lina|fernando|invoker|main' || true
curl -s -o /dev/null -w "HTTPS home: %{http_code}\n" https://velora.guatemalia.com/ || true
echo "Deploy update finished."
