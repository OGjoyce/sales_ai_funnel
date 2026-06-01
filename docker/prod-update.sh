#!/bin/bash
# Incremental production update (run on VPS as ubuntu in /var/www/velora)
set -euo pipefail

cd /var/www/velora
COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> Git pull"
git stash push -m "pre-deploy-$(date +%s)" -u 2>/dev/null || true
git fetch origin master
git reset --hard origin/master

echo "==> Frontend build (host public/ — app mounts ./public read-only)"
$COMPOSE build app
$COMPOSE up -d --force-recreate app 2>/dev/null || true
$COMPOSE exec -T app php artisan wayfinder:generate --with-form
docker cp velora_app:/app/resources/js/routes/. ./resources/js/routes/
docker cp velora_app:/app/resources/js/actions/. ./resources/js/actions/ 2>/dev/null || true
docker run --rm -v "$(pwd):/app" -w /app node:22-alpine sh -c 'npm ci && VITE_SKIP_WAYFINDER=1 npm run build'

echo "==> Docker build"
$COMPOSE build app openclaw mcp-server

echo "==> Up services (recreate app so entrypoint runs migrations)"
$COMPOSE up -d --force-recreate app
$COMPOSE up -d

echo "==> Migrate + funnel seed (explicit; entrypoint also migrates on app start)"
$COMPOSE exec -T app php artisan migrate --force
$COMPOSE exec -T app php artisan db:seed --class=Database\\Seeders\\FunnelStageSeeder --force --no-interaction 2>/dev/null || true

echo "==> Fernando docs"
chmod +x docker/sync-fernando-docs.sh
REPO_ROOT="$(pwd)" ./docker/sync-fernando-docs.sh
$COMPOSE exec -T app php artisan velora:sync-fernando-docs 2>/dev/null || true

echo "==> Cache + restart"
$COMPOSE exec -T app php artisan config:cache
$COMPOSE exec -T app php artisan route:cache
$COMPOSE restart openclaw app nginx

echo "==> Status"
$COMPOSE ps
$COMPOSE exec -T openclaw openclaw agents list 2>/dev/null | grep -E 'lina|fernando|invoker|main' || true
curl -s -o /dev/null -w "HTTPS home: %{http_code}\n" https://velora.guatemalia.com/ || true
echo "Deploy update finished."
