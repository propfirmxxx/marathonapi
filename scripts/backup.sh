#!/bin/bash

# Marathon API Backup Script
# Creates backups of database, uploads, and Directus data

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Marathon API Backup ===${NC}\n"

# Create backup directory
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}Backup directory: $BACKUP_DIR${NC}\n"

# Check if containers are running
if ! docker ps | grep -q marathonapi; then
    echo -e "${RED}Error: Marathon API containers are not running${NC}"
    exit 1
fi

# Backup database
echo -e "${YELLOW}Backing up database...${NC}"
docker exec marathonapi-db-1 pg_dump -U postgres marathon > "$BACKUP_DIR/database.sql" 2>/dev/null || \
docker exec marathonapi_db_1 pg_dump -U postgres marathon > "$BACKUP_DIR/database.sql"
echo -e "${GREEN}Database backup created${NC}"

# Backup uploads directory
echo -e "${YELLOW}Backing up uploads...${NC}"
if [ -d "uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads.tar.gz" uploads/
    echo -e "${GREEN}Uploads backup created${NC}"
else
    echo -e "${YELLOW}No uploads directory found${NC}"
fi

# Backup Directus directories
echo -e "${YELLOW}Backing up Directus data...${NC}"
if [ -d "directus-database" ] || [ -d "directus-uploads" ] || [ -d "directus-extensions" ]; then
    tar -czf "$BACKUP_DIR/directus.tar.gz" \
        directus-database/ directus-uploads/ directus-extensions/ \
        2>/dev/null || true
    echo -e "${GREEN}Directus backup created${NC}"
else
    echo -e "${YELLOW}No Directus directories found${NC}"
fi

# Create metadata
echo -e "${YELLOW}Creating backup metadata...${NC}"
cat > "$BACKUP_DIR/metadata.txt" << EOF
Backup Date: $(date)
Backup Directory: $BACKUP_DIR

Contents:
- database.sql: PostgreSQL database dump
- uploads.tar.gz: Application uploads
- directus.tar.gz: Directus data and extensions

Database Size: $(du -h "$BACKUP_DIR/database.sql" | cut -f1)
Uploads Size: $(du -h "$BACKUP_DIR/uploads.tar.gz" 2>/dev/null | cut -f1 || echo "N/A")
Directus Size: $(du -h "$BACKUP_DIR/directus.tar.gz" 2>/dev/null | cut -f1 || echo "N/A")
EOF

# Get total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

echo -e "\n${GREEN}=== Backup Complete ===${NC}"
echo -e "Backup location: ${YELLOW}$BACKUP_DIR${NC}"
echo -e "Total size: ${YELLOW}$TOTAL_SIZE${NC}"
echo -e "\nBackup contents:"
ls -lh "$BACKUP_DIR"

# Cleanup old backups (keep last 7 days)
echo -e "\n${YELLOW}Cleaning up old backups (keeping last 7 days)...${NC}"
find backups/ -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
echo -e "${GREEN}Old backups cleaned${NC}"


