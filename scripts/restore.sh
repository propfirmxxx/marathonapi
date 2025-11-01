#!/bin/bash

# Marathon API Restore Script
# Restores database, uploads, and Directus data from backup

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Marathon API Restore ===${NC}\n"

# Check if backup directory is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Backup directory not specified${NC}"
    echo "Usage: $0 <backup_directory>"
    echo "Example: $0 backups/20241201_120000"
    exit 1
fi

BACKUP_DIR="$1"

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}Error: Backup directory not found: $BACKUP_DIR${NC}"
    exit 1
fi

# Check if containers are running
if ! docker ps | grep -q marathonapi; then
    echo -e "${RED}Error: Marathon API containers are not running${NC}"
    echo "Please start containers first: docker-compose up -d"
    exit 1
fi

echo -e "${YELLOW}Backup directory: $BACKUP_DIR${NC}"
echo -e "${YELLOW}This will overwrite existing data. Are you sure?${NC}"
read -p "Continue? (yes/no) " -n 3 -r
echo
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo -e "${RED}Restore cancelled${NC}"
    exit 1
fi

# Restore database
if [ -f "$BACKUP_DIR/database.sql" ]; then
    echo -e "\n${YELLOW}Restoring database...${NC}"
    docker exec -T marathonapi-db-1 psql -U postgres -d marathon < "$BACKUP_DIR/database.sql" 2>/dev/null || \
    docker exec -i marathonapi_db_1 psql -U postgres -d marathon < "$BACKUP_DIR/database.sql"
    echo -e "${GREEN}Database restored${NC}"
else
    echo -e "${YELLOW}No database backup found${NC}"
fi

# Restore uploads
if [ -f "$BACKUP_DIR/uploads.tar.gz" ]; then
    echo -e "\n${YELLOW}Restoring uploads...${NC}"
    tar -xzf "$BACKUP_DIR/uploads.tar.gz" -C ./
    echo -e "${GREEN}Uploads restored${NC}"
else
    echo -e "${YELLOW}No uploads backup found${NC}"
fi

# Restore Directus
if [ -f "$BACKUP_DIR/directus.tar.gz" ]; then
    echo -e "\n${YELLOW}Restoring Directus data...${NC}"
    tar -xzf "$BACKUP_DIR/directus.tar.gz" -C ./
    echo -e "${GREEN}Directus data restored${NC}"
else
    echo -e "${YELLOW}No Directus backup found${NC}"
fi

echo -e "\n${GREEN}=== Restore Complete ===${NC}"
echo -e "${YELLOW}You may need to restart services:${NC} docker-compose restart"


