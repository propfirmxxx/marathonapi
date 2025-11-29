#!/bin/bash

# SSL Certificate Setup Script for trademarathon.com
# This script uses Let's Encrypt to obtain SSL certificates for the domain and all subdomains

set -e

DOMAIN="trademarathon.com"
EMAIL="${SSL_EMAIL:-admin@trademarathon.com}"  # Change this to your email
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
LETSENCRYPT_DIR="$DEPLOY_DIR/letsencrypt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== SSL Certificate Setup for $DOMAIN ===${NC}"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root or with sudo${NC}"
    exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi

# Create letsencrypt directory
echo -e "${YELLOW}Creating letsencrypt directory...${NC}"
mkdir -p "$LETSENCRYPT_DIR/conf" "$LETSENCRYPT_DIR/www" "$LETSENCRYPT_DIR/logs"
chmod 755 "$LETSENCRYPT_DIR"

# Check if certificates already exist
if [ -d "$LETSENCRYPT_DIR/conf/live/$DOMAIN" ]; then
    echo -e "${YELLOW}Certificates already exist for $DOMAIN${NC}"
    read -p "Do you want to renew them? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Renewing certificates...${NC}"
        docker run --rm \
            -v "$LETSENCRYPT_DIR/conf:/etc/letsencrypt" \
            -v "$LETSENCRYPT_DIR/www:/var/www/certbot" \
            -v "$LETSENCRYPT_DIR/logs:/var/log/letsencrypt" \
            certbot/certbot renew
        echo -e "${GREEN}Certificate renewal completed!${NC}"
        echo -e "${YELLOW}Restarting nginx...${NC}"
        cd "$DEPLOY_DIR"
        docker compose restart nginx
        exit 0
    else
        echo -e "${GREEN}Using existing certificates${NC}"
        exit 0
    fi
fi

# Method selection
echo ""
echo -e "${YELLOW}Select certificate type:${NC}"
echo "1) Single domain certificate (trademarathon.com)"
echo "2) Wildcard certificate (*.trademarathon.com) - requires DNS challenge"
echo ""
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        echo -e "${YELLOW}Obtaining single domain certificate...${NC}"
        echo -e "${YELLOW}Make sure port 80 is accessible from the internet${NC}"
        echo ""
        
        # Start nginx temporarily for HTTP challenge
        cd "$DEPLOY_DIR"
        echo -e "${YELLOW}Starting nginx for HTTP challenge...${NC}"
        docker compose up -d nginx
        
        # Wait for nginx to be ready
        echo -e "${YELLOW}Waiting for nginx to be ready...${NC}"
        sleep 10
        
        # Check if nginx is running
        if ! docker compose ps nginx | grep -q "Up"; then
            echo -e "${RED}Error: Nginx failed to start${NC}"
            exit 1
        fi
        
        # Obtain certificate using HTTP challenge
        echo -e "${YELLOW}Obtaining certificate...${NC}"
        docker run --rm \
            -v "$LETSENCRYPT_DIR/conf:/etc/letsencrypt" \
            -v "$LETSENCRYPT_DIR/www:/var/www/certbot" \
            -v "$LETSENCRYPT_DIR/logs:/var/log/letsencrypt" \
            --network marathonapi_marathon-network \
            certbot/certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email "$EMAIL" \
            --agree-tos \
            --no-eff-email \
            --force-renewal \
            -d "$DOMAIN" \
            -d "www.$DOMAIN"
        ;;
    2)
        echo -e "${YELLOW}Obtaining wildcard certificate...${NC}"
        echo -e "${RED}IMPORTANT: This requires DNS challenge${NC}"
        echo -e "${YELLOW}You need to add a TXT record to your DNS${NC}"
        echo ""
        read -p "Press Enter when you're ready to continue..."
        
        # Obtain certificate using DNS challenge
        docker run --rm -it \
            -v "$LETSENCRYPT_DIR/conf:/etc/letsencrypt" \
            -v "$LETSENCRYPT_DIR/logs:/var/log/letsencrypt" \
            certbot/certbot certonly \
            --manual \
            --preferred-challenges dns \
            --email "$EMAIL" \
            --agree-tos \
            --no-eff-email \
            --force-renewal \
            -d "$DOMAIN" \
            -d "*.$DOMAIN"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Check if certificate was obtained successfully
if [ -f "$LETSENCRYPT_DIR/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo ""
    echo -e "${GREEN}✓ Certificate obtained successfully!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Update nginx.conf to use the certificates"
    echo "2. Uncomment the HTTPS server block in nginx.conf"
    echo "3. Uncomment the HTTP redirect server block in nginx.conf"
    echo "4. Restart nginx: docker compose restart nginx"
    echo ""
    echo -e "${GREEN}Certificate location:${NC}"
    echo "  Full chain: $LETSENCRYPT_DIR/conf/live/$DOMAIN/fullchain.pem"
    echo "  Private key: $LETSENCRYPT_DIR/conf/live/$DOMAIN/privkey.pem"
    echo "  Chain: $LETSENCRYPT_DIR/conf/live/$DOMAIN/chain.pem"
    echo ""
    
    # Set proper permissions
    chmod 755 "$LETSENCRYPT_DIR/conf/live"
    chmod 755 "$LETSENCRYPT_DIR/conf/live/$DOMAIN"
    chmod 644 "$LETSENCRYPT_DIR/conf/live/$DOMAIN/fullchain.pem"
    chmod 600 "$LETSENCRYPT_DIR/conf/live/$DOMAIN/privkey.pem"
    chmod 644 "$LETSENCRYPT_DIR/conf/live/$DOMAIN/chain.pem"
    
    echo -e "${GREEN}Permissions set correctly${NC}"
else
    echo -e "${RED}✗ Failed to obtain certificate${NC}"
    exit 1
fi

