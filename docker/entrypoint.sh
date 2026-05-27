#!/bin/bash
set -e

echo "🚀 Velora Application Startup"
echo "════════════════════════════════════════════════"

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -U ${DB_USERNAME} -d ${DB_DATABASE} -c "\q" 2>/dev/null; do
  echo "   PostgreSQL is unavailable - sleeping..."
  sleep 2
done
echo "✅ PostgreSQL is ready"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis..."
until timeout 1 redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} ping >/dev/null 2>&1; do
  echo "   Redis is unavailable - sleeping..."
  sleep 2
done
echo "✅ Redis is ready"

# Generate APP_KEY if not set
if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "base64:" ]; then
  echo "🔑 Generating APP_KEY..."
  php artisan key:generate --force
fi

# Run migrations
echo "🗄️  Running database migrations..."
php artisan migrate --force

# Clear all caches
echo "🧹 Clearing application caches..."
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Cache configuration
echo "⚡ Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Create storage links
echo "🔗 Creating storage links..."
php artisan storage:link || true

# Fix permissions
echo "🔐 Setting permissions..."
chown -R www-data:www-data storage bootstrap/cache

echo ""
echo "════════════════════════════════════════════════"
echo "✅ Laravel initialization complete"
echo "════════════════════════════════════════════════"
echo ""

# Start supervisord
echo "🎯 Starting supervisord..."
exec supervisord -c /etc/supervisord.conf
