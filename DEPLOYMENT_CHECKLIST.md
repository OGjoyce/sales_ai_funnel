# Velora VPS Deployment Checklist

## Pre-Deployment

- [ ] SSH key converted from .ppk to .pem format (if needed)
- [ ] SSH key permissions set to 600: `chmod 600 ssh-carlo.pem`
- [ ] Tested SSH connection to VPS
- [ ] VPS IP verified: `18.221.208.60`
- [ ] VPS user: `ubuntu`
- [ ] Domain ready: `velora.guatemalia.com`

## Files Prepared

✅ All files created in `/home/deck/sales_ai_funnel/`:

### Docker Configuration
- ✅ `Dockerfile` - Laravel/PHP production image
- ✅ `Dockerfile.python` - Python MCP server image
- ✅ `docker-compose.prod.yml` - Production docker-compose config
- ✅ `.dockerignore` - Docker build exclusions

### Infrastructure
- ✅ `docker/nginx.conf` - Nginx main config
- ✅ `docker/conf.d/velora.conf` - Nginx server config with SSL
- ✅ `docker/supervisord.conf` - Process manager config

### Deployment Scripts
- ✅ `deploy.sh` - Automated VPS setup (install Docker, SSL, migrations, etc.)
- ✅ `upload-to-vps.sh` - Easy file upload to VPS via rsync
- ✅ `DEPLOYMENT.md` - Complete deployment guide
- ✅ `DEPLOYMENT_CHECKLIST.md` - This checklist

## Quick Start Commands

### 1. Convert SSH Key (if needed)

If you have a .ppk file:

```bash
# Using OpenSSH on macOS/Linux:
ssh-keygen -i -f "SSH-Carlo (1).ppk" > ssh-carlo.pem
chmod 600 ssh-carlo.pem
```

### 2. Upload to VPS

```bash
cd /path/to/sales_ai_funnel

./upload-to-vps.sh ~/path/to/ssh-carlo.pem ubuntu 18.221.208.60
```

This will:
- Test SSH connection
- Create `/var/www/velora` directory
- Upload all files via rsync (fast & efficient)
- Make deploy script executable

### 3. Deploy on VPS

```bash
ssh -i ~/path/to/ssh-carlo.pem ubuntu@18.221.208.60
cd /var/www/velora
sudo bash deploy.sh
```

The script will automatically:
- ✅ Update system
- ✅ Install Docker & Docker Compose
- ✅ Configure .env file
- ✅ Start PostgreSQL & Redis
- ✅ Build & start app containers
- ✅ Run database migrations
- ✅ Obtain SSL certificate from Let's Encrypt
- ✅ Configure Nginx with HTTPS
- ✅ Setup automatic SSL renewal
- ✅ Setup systemd auto-restart service

## Deployment Timeline

```
├─ Phase 1: System Setup (3-5 min)
│  ├─ Update packages
│  └─ Install Docker
│
├─ Phase 2: Database Setup (2-3 min)
│  ├─ Start PostgreSQL
│  └─ Wait for health check
│
├─ Phase 3: Application Setup (5-10 min)
│  ├─ Build Docker images
│  ├─ Start containers
│  └─ Run migrations
│
├─ Phase 4: SSL Configuration (2-3 min)
│  ├─ Obtain Let's Encrypt certificate
│  └─ Configure Nginx
│
└─ Total: 12-21 minutes
```

## Verification Steps

After deployment completes:

### 1. Check Services Status
```bash
cd /var/www/velora
docker compose -f docker-compose.prod.yml ps
```

Expected: All services show "healthy" or "up"

### 2. Test HTTPS Access
```bash
curl -I https://velora.guatemalia.com
```

Expected: HTTP 200 response with SSL certificate

### 3. View Application Logs
```bash
docker compose -f docker-compose.prod.yml logs -f app
```

Look for: "Laravel development server started"

### 4. Test Database
```bash
docker compose -f docker-compose.prod.yml exec app php artisan tinker
# In tinker shell:
DB::select('SELECT 1');
# Should return: Array()
```

### 5. Check SSL Certificate
```bash
openssl s_client -connect velora.guatemalia.com:443 -showcerts
```

Expected: Valid certificate for velora.guatemalia.com, expires in ~90 days

## Post-Deployment

- [ ] Access https://velora.guatemalia.com and verify working
- [ ] Update DNS to point to VPS IP (18.221.208.60)
- [ ] Verify SSL certificate (check browser warning)
- [ ] Configure email settings in .env if needed
- [ ] Configure API keys (OpenAI, OpenClaw) in .env
- [ ] Test user registration and login
- [ ] Setup backup strategy
- [ ] Configure monitoring/alerting if desired

## Common Commands After Deployment

```bash
cd /var/www/velora

# View all logs
docker compose -f docker-compose.prod.yml logs -f

# Access database
docker compose -f docker-compose.prod.yml exec postgres psql -U sales -d sales_ai_funnel

# Access app shell
docker compose -f docker-compose.prod.yml exec app sh

# Run artisan commands
docker compose -f docker-compose.prod.yml exec app php artisan migrate

# Restart all services
docker compose -f docker-compose.prod.yml restart

# Stop services
docker compose -f docker-compose.prod.yml down

# Start services
docker compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Deployment Script Fails

1. SSH into VPS manually:
   ```bash
   ssh -i ssh-carlo.pem ubuntu@18.221.208.60
   ```

2. Check system resources:
   ```bash
   free -h  # Check RAM
   df -h    # Check disk
   ```

3. Check Docker daemon:
   ```bash
   sudo systemctl status docker
   sudo systemctl start docker  # If not running
   ```

4. Re-run deploy script:
   ```bash
   cd /var/www/velora
   sudo bash deploy.sh
   ```

### SSL Certificate Issues

```bash
# Check certificate status
docker compose -f docker-compose.prod.yml exec certbot certbot certificates

# Force renewal
docker compose -f docker-compose.prod.yml exec certbot certbot renew --force-renewal

# View renewal logs
docker compose -f docker-compose.prod.yml logs certbot
```

### Database Migration Errors

```bash
# Check database logs
docker compose -f docker-compose.prod.yml logs postgres

# Manually run migrations
docker compose -f docker-compose.prod.yml exec app php artisan migrate --force

# Reset database (if needed - DESTRUCTIVE)
docker compose -f docker-compose.prod.yml exec app php artisan migrate:fresh --force
```

## Support

For detailed information, see:
- `DEPLOYMENT.md` - Complete deployment guide with all commands
- `docker-compose.prod.yml` - Service configuration
- Application logs: `docker compose -f docker-compose.prod.yml logs -f`

## Environment Variables Reference

Key .env variables configured by deploy script:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://velora.guatemalia.com

DB_HOST=postgres
DB_DATABASE=sales_ai_funnel
DB_USERNAME=sales
DB_PASSWORD=[auto-generated]

REDIS_HOST=redis
CACHE_STORE=redis
QUEUE_CONNECTION=redis

SESSION_DRIVER=database
MAIL_MAILER=log  # Change to smtp for real emails

# Add your API keys here:
OPENAI_API_KEY=sk-...
OPENCLAW_GATEWAY_URL=https://...
OPENCLAW_API_KEY=...
OPENCLAW_GATEWAY_TOKEN=...
MCP_SERVICE_TOKEN=...
```

---

**All files are ready for deployment!** 🚀

Once you run the deploy script, Velora will be live at `https://velora.guatemalia.com` with:
- ✅ HTTPS/SSL with auto-renewal
- ✅ PostgreSQL database
- ✅ Redis caching
- ✅ Queue workers
- ✅ MCP Python server
- ✅ Automatic restarts on reboot
