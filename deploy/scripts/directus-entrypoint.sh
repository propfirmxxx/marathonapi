#!/bin/sh
# Entrypoint wrapper for Directus to read secrets

set -e

# Read secrets if they exist
if [ -f /run/secrets/db_user ]; then
    export DB_USER=$(cat /run/secrets/db_user)
fi

if [ -f /run/secrets/db_password ]; then
    export DB_PASSWORD=$(cat /run/secrets/db_password)
fi

# Execute original entrypoint
exec /directus-entrypoint.sh "$@"

