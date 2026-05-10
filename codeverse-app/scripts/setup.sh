#!/bin/bash

# CodeVerse Deployment Setup Script
# This script initializes and deploys CodeVerse

set -e

echo "🚀 CodeVerse Deployment Setup"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check dependencies
log_info "Checking dependencies..."

command -v docker >/dev/null 2>&1 || log_error "Docker is not installed"
command -v docker-compose >/dev/null 2>&1 || log_error "Docker Compose is not installed"

log_info "All dependencies found ✓"

# Setup environment
log_info "Setting up environment files..."

if [ ! -f backend/.env.local ]; then
    log_warn "Creating .env.local from .env.example"
    cp backend/.env.example backend/.env.local
    log_warn "Please update backend/.env.local with your configuration"
fi

# Create directories
log_info "Creating required directories..."
mkdir -p logs
mkdir -p data/postgres
mkdir -p data/redis

log_info "Directories created ✓"

# Build images
log_info "Building Docker images..."
docker-compose build

log_info "Images built ✓"

# Start services
log_info "Starting services..."
docker-compose up -d

log_info "Services started ✓"

# Wait for services to be ready
log_info "Waiting for services to be ready..."
sleep 10

# Check service health
log_info "Checking service health..."

for i in {1..30}; do
    if curl -f http://localhost:3000/health >/dev/null 2>&1; then
        log_info "Backend is ready ✓"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "Backend failed to start"
    fi
    sleep 1
done

for i in {1..30}; do
    if curl -f http://localhost/health.html >/dev/null 2>&1; then
        log_info "Frontend is ready ✓"
        break
    fi
    if [ $i -eq 30 ]; then
        log_warn "Frontend health check failed (this may be normal)"
    fi
    sleep 1
done

# Display URLs
echo ""
echo "===================================="
echo -e "${GREEN}✅ CodeVerse is ready!${NC}"
echo "===================================="
echo ""
echo "URLs:"
echo "  Frontend:  http://localhost"
echo "  Backend:   http://localhost:3000"
echo "  API Docs:  http://localhost:3000/health"
echo "  Database:  localhost:5432"
echo "  Cache:     localhost:6379"
echo "  pgAdmin:   http://localhost:5050"
echo ""
echo "Default Credentials (pgAdmin):"
echo "  Email:    admin@codeverse.dev"
echo "  Password: admin"
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f backend     # View backend logs"
echo "  docker-compose logs -f frontend    # View frontend logs"
echo "  docker-compose down                # Stop services"
echo "  docker-compose ps                  # Show service status"
echo ""
