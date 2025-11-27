#!/bin/bash

# PostgreSQL Restore Script
# Usage: ./restore-postgres.sh <backup_file.dump.gz>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.dump.gz>"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/postgres/*.dump.gz 2>/dev/null | awk '{print $9, $5, $6, $7, $8}'
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will restore database from backup!"
echo "⚠️  This will OVERWRITE the current database!"
read -p "Are you sure? Type 'yes' to continue: " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Starting PostgreSQL restore from: $BACKUP_FILE"

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Decompressing backup..."
    DECOMPRESSED_FILE="${BACKUP_FILE%.gz}"
    gunzip -c "$BACKUP_FILE" > "$DECOMPRESSED_FILE"
    RESTORE_FILE="$DECOMPRESSED_FILE"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Restore using docker-compose
echo "Restoring database..."
# Load environment variables
source .env.compose.prod 2>/dev/null || true
docker compose -f docker-compose.yml exec -T db pg_restore \
    -U ${POSTGRES_USER:-postgres} \
    -d ${POSTGRES_DB:-marathon} \
    --clean \
    --if-exists \
    --verbose \
    < "$RESTORE_FILE"

# Cleanup decompressed file if it was compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    rm -f "$DECOMPRESSED_FILE"
fi

echo ""
echo "Database restore completed successfully!"

