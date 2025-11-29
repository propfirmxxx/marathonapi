#!/bin/bash

# UFW (Uncomplicated Firewall) configuration script for Marathon API
# This script configures UFW to only allow public access to nginx (ports 80, 443)
# All other services are blocked from external access but accessible internally
#
# ⚠️  WARNING: Docker Compatibility Issue
# Docker routes container traffic through the NAT table BEFORE it reaches UFW's
# INPUT/OUTPUT chains. This means UFW rules are BYPASSED for Docker-published ports.
# For proper Docker firewall control, use configure-firewall.sh instead, which
# uses the DOCKER-USER chain.
# See: https://docs.docker.com/engine/network/packet-filtering-firewalls/#docker-and-ufw
#
# This script may still work for non-Docker services, but Docker containers
# will bypass these rules. Use at your own risk!

set -e

echo "⚠️  WARNING: UFW and Docker are incompatible!"
echo "Docker-published ports will BYPASS UFW rules."
echo "For proper Docker firewall control, use configure-firewall.sh instead."
echo ""
read -p "Continue anyway? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted. Use configure-firewall.sh for Docker-compatible rules."
    exit 1
fi

echo ""
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

echo ""
echo "UFW firewall configuration completed!"
echo ""
echo "⚠️  IMPORTANT REMINDER:"
echo "Docker-published ports (3000, 4010, 8000, 8888, 8055, 15672, 5672)"
echo "will BYPASS these UFW rules due to Docker's NAT routing."
echo "For proper protection, use configure-firewall.sh instead."
echo ""
echo "Current UFW status:"
ufw status verbose

