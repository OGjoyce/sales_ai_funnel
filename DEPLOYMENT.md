# Velora Deployment Guide

Complete guide to deploy Velora to a VPS with Docker, SSL, and automatic renewal.

## Prerequisites

- VPS with Ubuntu 22.04+ (or similar Debian-based Linux)
- SSH access to the VPS
- Domain name pointing to the VPS (velora.guatemalia.com)
- At least 2GB RAM and 20GB disk space

## Quick Deployment

### 1. Convert SSH Key (if using .ppk format)

If your SSH key is in PuTTY format (.ppk), convert it to OpenSSH format:

```bash
# Using PuTTY's puttygen (Windows):
# puttygen SSH-Carlo.ppk -O private-openssh -o -C "" -o ssh-carlo.pem

# Using puttygen command line (if available):
# puttygen SSH-Carlo.ppk -O private-openssh -o ssh-carlo.pem

# Or use OpenSSH directly (if puttygen not available):
ssh-keygen -i -f "SSH-Carlo (1).ppk" > ssh-carlo.pem
chmod 600 ssh-carlo.pem
```

### 2. Upload Project Files to VPS

```bash
# From your local machine:
scp -r -i ssh-carlo.pem \
  /path/to/sales_ai_funnel/* \
  ubuntu@18.221.208.60:/var/www/velora/

# Or use rsync for faster incremental transfers:
rsync -avz -e "ssh -i ssh-carlo.pem" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'vendor' \
  --exclude 'storage/logs' \
  /path/to/sales_ai_funnel/ \
  ubuntu@18.221.208.60:/var/www/velora/
```

### 3. Connect to VPS and Run Deployment

```bash
# SSH into VPS
ssh -i ssh-carlo.pem ubuntu@18.221.208.60

# Switch to the application directory
cd /var/www/velora

# Run deployment script (requires sudo)
sudo bash deploy.sh
```

The script will:
- ✅ Update system packages
- ✅ Install Docker and Docker Compose
- ✅ Create necessary directories
- ✅ Configure environment (.env)
- ✅ Start PostgreSQL and Redis
- ✅ Run database migrations
- ✅ Obtain SSL certificate from Let's Encrypt
- ✅ Start Nginx with HTTPS
- ✅ Configure automatic SSL renewal
- ✅ Setup systemd service for auto-restart

### 4. Verify Installation

```bash
# Check all services are running:
docker compose -f docker-compose.prod.yml ps

# View logs:
docker compose -f docker-compose.prod.yml logs -f app

# Test the application:
curl https://velora.guatemalia.com
```

## Docker Architecture

### Services

1. **nginx** - Reverse proxy & SSL termination
   - Listens on 80 (HTTP → HTTPS redirect) and 443 (HTTPS)
   - Serves static files with caching
   - Forwards dynamic requests to Laravel app

2. **app** - Laravel application
   - PHP-FPM server
   - Supervisord manages:
     - PHP-FPM
     - Laravel queue workers
     - Task scheduler

3. **mcp-server** - Python MCP service
   - FastMCP server for OpenClaw integration
   - Runs on port 8001 (internal)

4. **postgres** - PostgreSQL database
   - pgvector extension for AI embeddings
   - Persistent volume storage
   - Health checks enabled

5. **redis** - Redis cache & queue
   - Used for caching and queue jobs
   - Persistent storage with AOF

6. **certbot** - Let's Encrypt SSL management
   - Automatically renews certificates every 12 hours
   - Uses webroot authentication

## Configuration

### Environment Variables (.env)

Key variables to configure:

```env
APP_NAME=Velora
APP_ENV=production
APP_KEY=base64:xxxxx (auto-generated)
APP_DEBUG=false
APP_URL=https://velora.guatemalia.com

# Database
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_DATABASE=sales_ai_funnel
DB_USERNAME=sales
DB_PASSWORD=xxxxx (change this!)

# Cache & Queue
CACHE_STORE=redis
QUEUE_CONNECTION=redis
REDIS_HOST=redis

# Email
MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-email
MAIL_PASSWORD=your-password
MAIL_FROM_ADDRESS=hello@velora.guatemalia.com

# AI APIs
OPENAI_API_KEY=sk-xxxxx
OPENCLAW_GATEWAY_URL=https://your-openclaw-gateway
OPENCLAW_API_KEY=xxxxx
OPENCLAW_GATEWAY_TOKEN=xxxxx
MCP_SERVICE_TOKEN=xxxxx
```

## Management

### Useful Commands

```bash
cd /var/www/velora

# View all logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f postgres
docker compose -f docker-compose.prod.yml logs -f nginx

# Access database shell
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U sales -d sales_ai_funnel

# Access app shell
docker compose -f docker-compose.prod.yml exec app sh

# Run artisan commands
docker compose -f docker-compose.prod.yml exec app php artisan migrate
docker compose -f docker-compose.prod.yml exec app php artisan tinker
docker compose -f docker-compose.prod.yml exec app php artisan queue:work

# Restart a service
docker compose -f docker-compose.prod.yml restart app

# Stop all services
docker compose -f docker-compose.prod.yml down

# Start all services
docker compose -f docker-compose.prod.yml up -d
```

### Backup

```bash
# Backup database
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U sales sales_ai_funnel > backup.sql

# Backup storage files
tar -czf storage_backup.tar.gz storage/

# Backup entire application
tar -czf velora_backup.tar.gz \
  --exclude=node_modules \
  --exclude=vendor \
  --exclude=.git \
  --exclude=bootstrap/cache \
  --exclude=storage/logs \
  /var/www/velora
```

### Update Application

```bash
cd /var/www/velora

# Pull latest code
git pull origin master

# Rebuild Docker images
docker compose -f docker-compose.prod.yml build app mcp-server

# Restart services
docker compose -f docker-compose.prod.yml up -d

# Run any pending migrations
docker compose -f docker-compose.prod.yml exec app php artisan migrate
```

## SSL Certificate Management

Certificates are automatically renewed by Certbot. To check certificate status:

```bash
# View certificate details
openssl x509 -in /etc/letsencrypt/live/velora.guatemalia.com/fullchain.pem -text

# Check renewal logs
tail -f /var/log/letsencrypt/letsencrypt.log

# Manual renewal (if needed)
docker compose -f docker-compose.prod.yml exec certbot \
  certbot renew --force-renewal
```

## Troubleshooting

### Port 80/443 already in use

```bash
# Check what's using the ports
sudo lsof -i :80
sudo lsof -i :443

# Kill the process if needed
sudo kill -9 <PID>
```

### Database connection errors

```bash
# Check database is running and healthy
docker compose -f docker-compose.prod.yml ps postgres

# Check database credentials in .env
cat .env | grep DB_

# Test connection
docker compose -f docker-compose.prod.yml exec app \
  php artisan tinker
# In tinker: DB::connection()->getPdo();
```

### SSL certificate errors

```bash
# Check certificate expiration
docker compose -f docker-compose.prod.yml exec certbot \
  certbot certificates

# Force renewal
docker compose -f docker-compose.prod.yml exec certbot \
  certbot renew --force-renewal

# View renewal logs
docker compose -f docker-compose.prod.yml logs certbot
```

### High disk usage

```bash
# Check disk usage
docker system df

# Clean up Docker
docker system prune -a

# View largest directories
du -sh /var/www/velora/*
```

## Security Recommendations

1. **Change default passwords in .env**
   - Database password
   - Redis password (if setting one)
   - API keys

2. **Update firewall rules**
   - Only allow 80, 443, and 22 (SSH) ports
   - Restrict SSH access by IP if possible

3. **Enable automatic updates**
   ```bash
   sudo apt-get install unattended-upgrades
   sudo dpkg-reconfigure unattended-upgrades
   ```

4. **Monitor resources**
   ```bash
   docker stats
   ```

5. **Regular backups**
   - Backup database daily
   - Backup application files weekly
   - Store backups offsite

## Performance Optimization

### Database Query Optimization

```bash
# Enable query logging
docker compose -f docker-compose.prod.yml exec app \
  php artisan tinker
# DB::enableQueryLog(); 
# // Run your queries
# dd(DB::getQueryLog());
```

### Caching

Redis is configured for caching. Use it in your code:
```php
Cache::put('key', $value, now()->addHours(24));
Cache::get('key');
```

### Static File Caching

Nginx is configured to cache static assets for 1 year with immutable flag.

## Support

For issues or questions:
1. Check logs: `docker compose -f docker-compose.prod.yml logs -f`
2. Review .env configuration
3. Test database connectivity
4. Verify SSL certificate status
5. Check system resources (disk, RAM, CPU)
