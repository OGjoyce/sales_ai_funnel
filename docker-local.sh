#!/bin/bash

# Velora Local Docker Helper Script
# Usage: ./docker-local.sh [command]

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.local.yml"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${GREEN}===================================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}===================================================${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ ${NC}$1"
}

print_error() {
    echo -e "${RED}✗ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓ ${NC}$1"
}

# Check if docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker Desktop or Docker Engine."
        exit 1
    fi
    if ! command -v docker compose &> /dev/null; then
        print_error "Docker Compose is not installed."
        exit 1
    fi
    print_success "Docker is installed"
}

# Build all images
build() {
    print_header "Building Docker Images"
    check_docker
    docker compose -f "$COMPOSE_FILE" build
    print_success "Build complete"
}

# Start all services
up() {
    print_header "Starting Services"
    check_docker
    docker compose -f "$COMPOSE_FILE" up -d
    print_info "Waiting for services to be healthy..."
    sleep 5
    docker compose -f "$COMPOSE_FILE" ps
    print_success "Services started"
}

# Stop all services
down() {
    print_header "Stopping Services"
    check_docker
    docker compose -f "$COMPOSE_FILE" down
    print_success "Services stopped"
}

# Restart all services
restart() {
    print_header "Restarting Services"
    check_docker
    docker compose -f "$COMPOSE_FILE" restart
    print_success "Services restarted"
}

# View logs
logs() {
    check_docker
    docker compose -f "$COMPOSE_FILE" logs -f "${1:-.}"
}

# Run migrations
migrate() {
    print_header "Running Migrations"
    check_docker
    docker compose -f "$COMPOSE_FILE" exec app php artisan migrate --force
    print_success "Migrations complete"
}

# Seed database
seed() {
    print_header "Seeding Database"
    check_docker
    docker compose -f "$COMPOSE_FILE" exec app php artisan db:seed --force
    print_success "Database seeded"
}

# Clear caches
clear() {
    print_header "Clearing Caches"
    check_docker
    docker compose -f "$COMPOSE_FILE" exec app php artisan cache:clear
    docker compose -f "$COMPOSE_FILE" exec app php artisan config:clear
    docker compose -f "$COMPOSE_FILE" exec app php artisan view:clear
    print_success "Caches cleared"
}

# Show status
status() {
    print_header "Service Status"
    check_docker
    docker compose -f "$COMPOSE_FILE" ps
}

# Test endpoints
test() {
    print_header "Testing Endpoints"
    check_docker

    print_info "Testing health endpoint..."
    curl -s http://localhost/api/health | jq . || print_error "Health endpoint failed"

    print_info "Testing home page..."
    if curl -s http://localhost/ | grep -q "<!DOCTYPE html>"; then
        print_success "Home page loads"
    else
        print_error "Home page failed"
    fi

    print_info "Testing OpenClaw..."
    if curl -s http://localhost:18789/ > /dev/null; then
        print_success "OpenClaw is responding"
    else
        print_error "OpenClaw is not responding"
    fi
}

# Shell access
shell() {
    check_docker
    SERVICE="${1:-app}"
    docker compose -f "$COMPOSE_FILE" exec "$SERVICE" bash
}

# Database access
db() {
    check_docker
    docker compose -f "$COMPOSE_FILE" exec postgres psql -U sales -d sales_ai_funnel
}

# Redis access
redis() {
    check_docker
    docker compose -f "$COMPOSE_FILE" exec redis redis-cli
}

# Artisan command pass-through
artisan() {
    check_docker
    docker compose -f "$COMPOSE_FILE" exec app php artisan "$@"
}

# Fresh start (down + up + migrate)
fresh() {
    print_header "Fresh Start"
    down
    up
    sleep 10
    migrate
    print_success "Fresh start complete"
}

# Build, up, and migrate
setup() {
    print_header "Setup (Build + Start + Migrate)"
    check_docker
    build
    up
    sleep 10
    migrate
    print_success "Setup complete - app is ready at http://localhost"
}

# Show help
help() {
    cat << EOF
${GREEN}Velora Local Docker Helper${NC}

Usage: ./docker-local.sh [command]

Commands:
  ${YELLOW}setup${NC}        Build, start, and migrate (one-time setup)
  ${YELLOW}build${NC}        Build all Docker images
  ${YELLOW}up${NC}           Start all services
  ${YELLOW}down${NC}         Stop all services
  ${YELLOW}restart${NC}      Restart all services
  ${YELLOW}status${NC}       Show service status
  ${YELLOW}logs${NC}         View logs (optionally: logs [service])
  ${YELLOW}migrate${NC}      Run database migrations
  ${YELLOW}seed${NC}         Seed database
  ${YELLOW}clear${NC}        Clear all caches
  ${YELLOW}test${NC}         Test endpoints
  ${YELLOW}shell${NC}        Open shell in app container (or: shell [service])
  ${YELLOW}db${NC}           Connect to PostgreSQL
  ${YELLOW}redis${NC}        Connect to Redis CLI
  ${YELLOW}artisan${NC}      Run Laravel artisan command
  ${YELLOW}fresh${NC}        Fresh start (down + up + migrate)
  ${YELLOW}help${NC}         Show this help message

Examples:
  ./docker-local.sh setup            # First time setup
  ./docker-local.sh up               # Start services
  ./docker-local.sh logs app         # View app logs
  ./docker-local.sh artisan migrate  # Run migrations
  ./docker-local.sh shell            # Open bash in app
  ./docker-local.sh shell nginx      # Open shell in nginx

Website: http://localhost
API Health: http://localhost/api/health

${YELLOW}For more info, see DOCKER_LOCAL_SETUP.md${NC}

EOF
}

# Main
case "${1:-help}" in
    build)      build ;;
    up)         up ;;
    down)       down ;;
    restart)    restart ;;
    status)     status ;;
    logs)       logs "$2" ;;
    migrate)    migrate ;;
    seed)       seed ;;
    clear)      clear ;;
    test)       test ;;
    shell)      shell "$2" ;;
    db)         db ;;
    redis)      redis ;;
    artisan)    artisan "${@:2}" ;;
    fresh)      fresh ;;
    setup)      setup ;;
    help)       help ;;
    *)          print_error "Unknown command: $1"; help; exit 1 ;;
esac
