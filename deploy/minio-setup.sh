#!/bin/bash

# MinIO Setup Script
# This script creates the necessary bucket for Marathon API uploads

set -e

MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
BUCKET_NAME="${BUCKET_NAME:-marathon-uploads}"

echo "Setting up MinIO bucket: $BUCKET_NAME"

# Wait for MinIO to be ready
echo "Waiting for MinIO to be ready..."
until curl -f "$MINIO_ENDPOINT/minio/health/live" > /dev/null 2>&1; do
    echo "MinIO is not ready yet. Waiting..."
    sleep 2
done

echo "MinIO is ready!"

# Install mc (MinIO Client) if not available
if ! command -v mc &> /dev/null; then
    echo "Installing MinIO Client (mc)..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        wget https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
        chmod +x /usr/local/bin/mc
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install minio/stable/mc || echo "Please install mc manually: brew install minio/stable/mc"
    else
        echo "Please install MinIO Client manually from https://min.io/download"
        exit 1
    fi
fi

# Configure MinIO client
mc alias set marathon "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"

# Create bucket if it doesn't exist
if mc ls marathon | grep -q "$BUCKET_NAME"; then
    echo "Bucket $BUCKET_NAME already exists"
else
    echo "Creating bucket $BUCKET_NAME..."
    mc mb "marathon/$BUCKET_NAME"
    echo "Bucket $BUCKET_NAME created successfully!"
fi

# Set bucket policy (optional - adjust based on your needs)
# Public read access (adjust as needed)
# mc anonymous set download "marathon/$BUCKET_NAME"

# Or private bucket (recommended)
mc anonymous set none "marathon/$BUCKET_NAME"

echo ""
echo "MinIO setup completed!"
echo "Bucket: $BUCKET_NAME"
echo "Endpoint: $MINIO_ENDPOINT"
echo "Access Key: $MINIO_ACCESS_KEY"
echo ""
echo "MinIO Console: http://localhost:9001"
echo "Login with: $MINIO_ACCESS_KEY / $MINIO_SECRET_KEY"

