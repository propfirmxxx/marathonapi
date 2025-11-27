#!/bin/bash

# UFW (Uncomplicated Firewall) configuration script for Marathon API
# This script configures UFW to only allow public access to nginx (ports 80, 443)
# All other services are blocked from external access but accessible internally

set -e

echo "Configuring UFW firewall rules for Marathon API..."

# Enable UFW if not already enabled
ufw --force enable || true

# Reset UFW to defaults (optional - uncomment if you want a clean slate)
# ufw --force reset

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (adjust port if needed)
ufw allow 22/tcp

# Allow nginx (HTTP and HTTPS) - ONLY PUBLIC SERVICE
ufw allow 80/tcp comment 'Nginx HTTP'
ufw allow 443/tcp comment 'Nginx HTTPS'

# Deny direct access to other services from external
# Note: UFW doesn't easily support source-based rules for specific ports
# These rules will block external access, but localhost and Docker networks
# will still be accessible through Docker's internal networking

# Block external access to marathon-api
ufw deny 3000/tcp comment 'Marathon API - internal only'

# Block external access to marathon-front
ufw deny 4010/tcp comment 'Marathon Front - internal only'

# Block external access to marathon-mt5-python
ufw deny 8000/tcp comment 'MT5 Python API - internal only'
ufw deny 8888/tcp comment 'MT5 Python Socket - internal only'

# Block external access to directus
ufw deny 8055/tcp comment 'Directus CMS - internal only'

# Block external access to rabbitmq
ufw deny 15672/tcp comment 'RabbitMQ Management - internal only'
ufw deny 5672/tcp comment 'RabbitMQ AMQP - internal only'

echo "UFW firewall configuration completed!"
echo "Only nginx (ports 80, 443) is accessible from external networks."
echo "Other services are only accessible from localhost and Docker networks."
echo ""
echo "Current UFW status:"
ufw status verbose

