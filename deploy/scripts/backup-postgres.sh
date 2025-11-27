#!/bin/bash

# PostgreSQL Backup Script
# Usage: ./backup-postgres.sh [retention_days]

set -e

RETENTION_DAYS=${1:-30}  # Default: keep backups for 30 days
BACKUP_DIR="./backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="marathon_${TIMESTAMP}.dump"

echo "Starting PostgreSQL backup..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Run backup using docker-compose
# Note: Ensure .env.compose.prod has POSTGRES_USER and POSTGRES_PASSWORD
docker compose -f docker-compose.yml run --rm postgres-backup

# Find the latest backup file
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/marathon_*.dump 2>/dev/null | head -1)

if [ -n "$LATEST_BACKUP" ]; then
    echo "Backup completed: $(basename "$LATEST_BACKUP")"
    echo "Backup size: $(du -h "$LATEST_BACKUP" | cut -f1)"
    
    # Compress backup
    echo "Compressing backup..."
    gzip "$LATEST_BACKUP"
    COMPRESSED_BACKUP="${LATEST_BACKUP}.gz"
    echo "Compressed backup: $(basename "$COMPRESSED_BACKUP")"
    echo "Compressed size: $(du -h "$COMPRESSED_BACKUP" | cut -f1)"
    
    # Cleanup old backups
    echo "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "marathon_*.dump.gz" -type f -mtime +$RETENTION_DAYS -delete
    echo "Cleanup completed."
    
    # List remaining backups
    echo ""
    echo "Remaining backups:"
    ls -lh "$BACKUP_DIR"/marathon_*.dump.gz 2>/dev/null | awk '{print $9, $5, $6, $7, $8}'
else
    echo "Error: Backup file not found!"
    exit 1
fi

echo ""
echo "Backup process completed successfully!"

