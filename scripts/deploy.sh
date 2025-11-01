#!/bin/bash

# Marathon API Production Deployment Script
# This script helps deploy the application in production

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Marathon API Production Deployment ===${NC}\n"

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker daemon is not running${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi

# Check if compose.env exists
if [ ! -f "compose.env" ]; then
    echo -e "${YELLOW}Warning: compose.env not found. Creating from example...${NC}"
    if [ -f "compose.env.example" ]; then
        cp compose.env.example compose.env
        echo -e "${RED}Please edit compose.env with your production values before continuing!${NC}"
        exit 1
    else
        echo -e "${RED}Error: compose.env.example not found${NC}"
        exit 1
    fi
fi

# Check permissions on compose.env
if [ -z "$(stat -c %a compose.env 2>/dev/null | grep -E '^[0-6]00$' 2>/dev/null)" ] && [ "$(uname)" != "Darwin" ]; then
    echo -e "${YELLOW}Warning: compose.env should have restricted permissions (600)${NC}"
    read -p "Fix permissions now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        chmod 600 compose.env
        echo -e "${GREEN}Permissions fixed${NC}"
    fi
fi

# Pull latest images
echo -e "\n${GREEN}Pulling latest images...${NC}"
if command -v docker-compose &> /dev/null; then
    docker-compose pull
else
    docker compose pull
fi

# Build API image
echo -e "\n${GREEN}Building API image...${NC}"
if command -v docker-compose &> /dev/null; then
    docker-compose build marathon-api
else
    docker compose build marathon-api
fi

# Start services
echo -e "\n${GREEN}Starting services...${NC}"
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    docker compose up -d
fi

# Wait for services to be healthy
echo -e "\n${GREEN}Waiting for services to become healthy...${NC}"
sleep 10

# Check service health
echo -e "\n${GREEN}Checking service health...${NC}"
if command -v docker-compose &> /dev/null; then
    docker-compose ps
else
    docker compose ps
fi

echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "Check logs with: ${YELLOW}docker-compose logs -f${NC}"
echo -e "View status with: ${YELLOW}docker-compose ps${NC}"


