#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="velora.guatemalia.com"
APP_DIR="/var/www/velora"
DOCKER_COMPOSE_CMD="docker compose"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Velora Deployment Script${NC}"
echo -e "${BLUE}Domain: ${DOMAIN}${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to print step
print_step() {
    echo -e "${YELLOW}[STEP] ${1}${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}[✓] ${1}${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}[ERROR] ${1}${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root (sudo)"
    exit 1
fi

# Step 1: Update system
print_step "Updating system packages"
apt-get update
apt-get upgrade -y
print_success "System updated"

# Step 2: Install Docker
print_step "Installing Docker and Docker Compose"
apt-get install -y curl gnupg2 lsb-release ubuntu-keyring

mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker-archive-keyring.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

usermod -aG docker ubuntu
systemctl enable docker
systemctl start docker
print_success "Docker installed"

# Step 3: Create application directory
print_step "Creating application directory"
mkdir -p "${APP_DIR}"
cd "${APP_DIR}"
print_success "Directory created at ${APP_DIR}"

# Step 4: Clone or copy application
print_step "Setting up application files"
if [ -d ".git" ]; then
    git pull origin master
else
    # Files should be copied by the user via SCP/SFTP
    echo -e "${YELLOW}Please copy the application files to ${APP_DIR} and run this script again${NC}"
    exit 1
fi
print_success "Application files ready"

# Step 5: Create .env file if it doesn't exist
print_step "Configuring environment"
if [ ! -f ".env" ]; then
    cp .env.example .env

    # Generate APP_KEY
    APP_KEY=$(php -r "echo bin2hex(random_bytes(32));")
    sed -i "s|APP_KEY=.*|APP_KEY=${APP_KEY}|g" .env

    # Set production values
    sed -i "s|APP_ENV=.*|APP_ENV=production|g" .env
    sed -i "s|APP_DEBUG=.*|APP_DEBUG=false|g" .env
    sed -i "s|APP_URL=.*|APP_URL=https://${DOMAIN}|g" .env

    # Database
    sed -i "s|DB_HOST=.*|DB_HOST=postgres|g" .env
    sed -i "s|DB_PORT=.*|DB_PORT=5432|g" .env

    # Redis
    sed -i "s|REDIS_HOST=.*|REDIS_HOST=redis|g" .env

    # OpenClaw Gateway (Docker internal network)
    sed -i "s|OPENCLAW_GATEWAY_URL=.*|OPENCLAW_GATEWAY_URL=http://openclaw:18789|g" .env

    print_success ".env file created"
else
    print_success ".env file already exists"
    # Update OpenClaw URL to Docker service (if not already)
    if ! grep -q "OPENCLAW_GATEWAY_URL=http://openclaw" .env; then
        sed -i "s|OPENCLAW_GATEWAY_URL=.*|OPENCLAW_GATEWAY_URL=http://openclaw:18789|g" .env
        print_success "Updated OPENCLAW_GATEWAY_URL to Docker service"
    fi
fi

# Step 5b: Create OpenClaw directory structure
print_step "Setting up OpenClaw directories"
mkdir -p openclaw/.openclaw
if [ ! -f "openclaw/.openclaw/openclaw.json" ]; then
    echo -e "${YELLOW}⚠️  OpenClaw config file not found at ./openclaw/.openclaw/openclaw.json${NC}"
    echo -e "${YELLOW}You must copy your OpenClaw configuration before deployment completes.${NC}"
    echo -e "${YELLOW}See OPENCLAW_MIGRATION.md for instructions.${NC}"
else
    print_success "OpenClaw config found"
fi
chmod -R 755 openclaw/

# Step 6: Create SSL certificate directory
print_step "Setting up SSL certificate directory"
mkdir -p /etc/letsencrypt/live/${DOMAIN}
mkdir -p /var/www/certbot
chmod 755 /var/www/certbot
print_success "SSL directory created"

# Step 7: Start core services
print_step "Starting Docker services (postgres, redis, openclaw)"
${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml up -d postgres redis openclaw
print_success "Core services started"

# Wait for database to be ready
print_step "Waiting for PostgreSQL to be ready"
sleep 10
max_attempts=30
attempt=0
while ! ${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml exec -T postgres pg_isready -U $(grep DB_USERNAME .env | cut -d '=' -f2) >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        print_error "Database failed to start after ${max_attempts} attempts"
        exit 1
    fi
    echo "Waiting for database... ($attempt/$max_attempts)"
    sleep 2
done
print_success "PostgreSQL is ready"

# Wait for OpenClaw to be healthy
print_step "Waiting for OpenClaw gateway to be ready"
sleep 5
max_attempts=30
attempt=0
while ! ${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml exec -T openclaw wget --quiet --tries=1 --spider http://localhost:18789/ >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        print_error "OpenClaw failed to start after ${max_attempts} attempts"
        echo -e "${YELLOW}Check OPENCLAW_MIGRATION.md and verify:${NC}"
        echo -e "  1. openclaw/.openclaw/openclaw.json exists"
        echo -e "  2. openclaw/.openclaw/workspace* directories exist"
        ${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml logs openclaw
        exit 1
    fi
    echo "Waiting for OpenClaw... ($attempt/$max_attempts)"
    sleep 2
done
print_success "OpenClaw gateway is ready"

# Step 8: Build and start app
print_step "Building and starting application"
${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml build app mcp-server
${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml up -d app mcp-server
print_success "Application containers started"

# Wait a moment for app to start
sleep 5

# Step 9: Run migrations
print_step "Running database migrations"
${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml exec -T app php artisan migrate --force
print_success "Migrations completed"

# Step 10: Setup SSL with Let's Encrypt
print_step "Obtaining SSL certificate from Let's Encrypt"
${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml up -d nginx certbot

sleep 5

# Generate certificate
${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml exec -T certbot certbot certonly \
    --webroot \
    -w /var/www/certbot \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --agree-tos \
    --non-interactive \
    --email "hello@${DOMAIN}" \
    --rsa-key-size 2048

print_success "SSL certificate obtained"

# Step 11: Restart nginx with SSL
print_step "Restarting Nginx with SSL"
${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml restart nginx
print_success "Nginx restarted with SSL"

# Step 12: Setup automatic restarts
print_step "Configuring auto-restart on reboot"
cat > /etc/systemd/system/velora-docker.service << EOF
[Unit]
Description=Velora Docker Compose Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
User=root
WorkingDirectory=${APP_DIR}
ExecStart=${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml up -d
ExecStop=${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml down
RemainAfterExit=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable velora-docker.service
print_success "Auto-restart configured"

# Step 13: Setup log rotation
print_step "Configuring log rotation"
cat > /etc/logrotate.d/velora << EOF
${APP_DIR}/storage/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
EOF
print_success "Log rotation configured"

# Step 14: Final status
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Domain: ${GREEN}https://${DOMAIN}${NC}"
echo -e "App Directory: ${GREEN}${APP_DIR}${NC}"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  View logs:          cd ${APP_DIR} && docker compose -f docker-compose.prod.yml logs -f"
echo -e "  OpenClaw logs:      cd ${APP_DIR} && docker compose -f docker-compose.prod.yml logs -f openclaw"
echo -e "  Stop services:      cd ${APP_DIR} && docker compose -f docker-compose.prod.yml down"
echo -e "  Restart services:   cd ${APP_DIR} && docker compose -f docker-compose.prod.yml up -d"
echo -e "  Database shell:     cd ${APP_DIR} && docker compose -f docker-compose.prod.yml exec postgres psql -U sales -d sales_ai_funnel"
echo -e "  App shell:          cd ${APP_DIR} && docker compose -f docker-compose.prod.yml exec app /bin/sh"
echo -e "  OpenClaw shell:     cd ${APP_DIR} && docker compose -f docker-compose.prod.yml exec openclaw sh"
echo ""
echo -e "${YELLOW}OpenClaw Gateway:${NC}"
echo -e "  Status check: docker compose -f docker-compose.prod.yml exec openclaw openclaw gateway status"
echo -e "  View agents:  docker compose -f docker-compose.prod.yml exec openclaw openclaw agents list"
echo -e "  Note: If OpenClaw failed to start, see OPENCLAW_MIGRATION.md"
echo ""
echo -e "${YELLOW}Certificates:${NC}"
echo -e "  Renewal: Automatic (every 12 hours)"
echo -e "  Location: /etc/letsencrypt/live/${DOMAIN}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. If OpenClaw didn't start, copy your .openclaw folder - see OPENCLAW_MIGRATION.md"
echo -e "  2. Update your DNS to point to this server IP"
echo -e "  3. Verify SSL certificate: curl https://${DOMAIN}"
echo -e "  4. Check application: https://${DOMAIN}"
echo -e "  5. Configure email and API keys in .env if needed"
echo ""
