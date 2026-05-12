#!/bin/bash

# Velora VPS Upload Script
# Uploads project files to VPS via SCP/rsync

set -e

# Configuration
SSH_KEY="${1:-}"
VPS_USER="${2:-ubuntu}"
VPS_IP="${3:-18.221.208.60}"
VPS_PATH="/var/www/velora"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_error() {
    echo -e "${RED}[ERROR] ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}[✓] ${1}${NC}"
}

print_step() {
    echo -e "${YELLOW}[STEP] ${1}${NC}"
}

# Check arguments
if [ -z "$SSH_KEY" ]; then
    print_error "Usage: ./upload-to-vps.sh <ssh-key-path> [vps-user] [vps-ip]"
    echo ""
    echo "Example:"
    echo "  ./upload-to-vps.sh ~/Downloads/ssh-carlo.pem ubuntu 18.221.208.60"
    exit 1
fi

# Check SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    print_error "SSH key not found: $SSH_KEY"
    exit 1
fi

# Check SSH key permissions
if [ $(stat -f%A "$SSH_KEY" 2>/dev/null || stat -c%a "$SSH_KEY") != "600" ]; then
    print_step "Fixing SSH key permissions"
    chmod 600 "$SSH_KEY"
    print_success "Permissions fixed"
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Velora VPS Upload${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "SSH Key:  ${YELLOW}${SSH_KEY}${NC}"
echo -e "User:     ${YELLOW}${VPS_USER}${NC}"
echo -e "IP:       ${YELLOW}${VPS_IP}${NC}"
echo -e "Remote:   ${YELLOW}${VPS_PATH}${NC}"
echo ""

# Test SSH connection
print_step "Testing SSH connection"
if ssh -i "$SSH_KEY" -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new \
    "$VPS_USER@$VPS_IP" "echo 'SSH connection successful'" > /dev/null 2>&1; then
    print_success "SSH connection successful"
else
    print_error "Cannot connect to VPS. Check IP, user, and SSH key."
    exit 1
fi

# Create remote directory
print_step "Creating remote directory"
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_IP" "sudo mkdir -p $VPS_PATH && sudo chown $VPS_USER:$VPS_USER $VPS_PATH"
print_success "Remote directory ready"

# Upload using rsync (faster for incremental updates)
print_step "Uploading files to VPS (this may take a few minutes)"
echo ""

rsync -avz \
    --delete \
    -e "ssh -i $SSH_KEY" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'vendor' \
    --exclude 'bootstrap/cache/*' \
    --exclude 'storage/logs/*' \
    --exclude 'storage/app/*' \
    --exclude 'storage/framework/cache/*' \
    --exclude 'storage/framework/sessions/*' \
    --exclude 'storage/framework/views/*' \
    --exclude '.env' \
    --exclude '.env.local' \
    --exclude '*.pem' \
    --exclude '*.ppk' \
    --exclude '.DS_Store' \
    --exclude '.vscode' \
    --exclude '.idea' \
    ./ "$VPS_USER@$VPS_IP:$VPS_PATH/"

print_success "Upload complete"

# Make deploy script executable
print_step "Setting up deploy script"
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_IP" "chmod +x $VPS_PATH/deploy.sh"
print_success "Deploy script ready"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Upload Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. SSH into the VPS:"
echo -e "     ${GREEN}ssh -i $SSH_KEY $VPS_USER@$VPS_IP${NC}"
echo ""
echo -e "  2. Run the deployment script:"
echo -e "     ${GREEN}cd $VPS_PATH && sudo bash deploy.sh${NC}"
echo ""
echo -e "${YELLOW}Or combine both in one command:${NC}"
echo -e "  ${GREEN}ssh -i $SSH_KEY $VPS_USER@$VPS_IP 'cd $VPS_PATH && sudo bash deploy.sh'${NC}"
echo ""
