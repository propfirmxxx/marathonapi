#!/bin/bash

# SSL Certificate Renewal Script
# This script renews Let's Encrypt certificates and reloads nginx

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
LETSENCRYPT_DIR="$DEPLOY_DIR/letsencrypt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== SSL Certificate Renewal ===${NC}"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root or with sudo${NC}"
    exit 1
fi

# Check if certificates exist
if [ ! -d "$LETSENCRYPT_DIR/conf/live" ]; then
    echo -e "${RED}Error: No certificates found. Run setup-ssl.sh first${NC}"
    exit 1
fi

# Renew certificates
echo -e "${YELLOW}Renewing certificates...${NC}"
docker run --rm \
    -v "$LETSENCRYPT_DIR/conf:/etc/letsencrypt" \
    -v "$LETSENCRYPT_DIR/www:/var/www/certbot" \
    -v "$LETSENCRYPT_DIR/logs:/var/log/letsencrypt" \
    certbot/certbot renew \
    --quiet

# Check if renewal was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Certificates renewed successfully${NC}"
    
    # Reload nginx
    echo -e "${YELLOW}Reloading nginx...${NC}"
    cd "$DEPLOY_DIR"
    docker compose exec nginx nginx -s reload 2>/dev/null || docker compose restart nginx
    
    echo -e "${GREEN}✓ Nginx reloaded${NC}"
else
    echo -e "${RED}✗ Certificate renewal failed${NC}"
    exit 1
fi

