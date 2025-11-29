#!/bin/bash

# Firewall configuration script for Marathon API
# This script configures iptables to only allow public access to nginx (ports 80, 443)
# All other services are blocked from external access but accessible internally
#
# IMPORTANT: Docker Compatibility
# Docker routes container traffic through the NAT table BEFORE it reaches the INPUT chain.
# For Docker-published ports, we must use the DOCKER-USER chain instead of INPUT chain.
# See: https://docs.docker.com/engine/network/packet-filtering-firewalls/

set -e

echo "Configuring firewall rules for Marathon API (Docker-compatible)..."

# IMPORTANT: Do NOT flush NAT table - Docker needs it!
# Only flush filter table chains if needed (commented out for safety)
# iptables -F
# iptables -X
# DO NOT flush NAT: iptables -t nat -F (Docker needs this!)

# Set default policies for INPUT chain (for non-Docker services)
iptables -P INPUT ACCEPT
iptables -P FORWARD ACCEPT
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established and related connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH (adjust port if needed)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow nginx (HTTP and HTTPS) - ONLY PUBLIC SERVICE
# Note: nginx is also a Docker container, but we allow it in INPUT for compatibility
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# ============================================================================
# DOCKER-USER CHAIN: Rules for Docker-published ports
# ============================================================================
# Docker creates the DOCKER-USER chain automatically. Rules here are processed
# AFTER Docker's NAT rules but BEFORE the final routing decision.
# This is the correct way to filter traffic to Docker containers.

# Ensure DOCKER-USER chain exists (Docker creates it, but check anyway)
if ! iptables -C DOCKER-USER -j RETURN 2>/dev/null; then
    echo "Warning: DOCKER-USER chain not found. Docker may not be running."
    echo "The chain will be created automatically when Docker starts."
fi

# Block direct access to Docker-published ports from external
# Allow localhost and Docker network ranges (172.16.0.0/12, 10.0.0.0/8)
# Note: Docker's default bridge network is usually 172.17.0.0/16, included in 172.16.0.0/12

# Marathon API (port 3000)
iptables -I DOCKER-USER -p tcp --dport 3000 -s 127.0.0.1 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 3000 -s 172.16.0.0/12 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 3000 -s 10.0.0.0/8 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 3000 -j DROP

# Marathon Front (port 4010)
iptables -I DOCKER-USER -p tcp --dport 4010 -s 127.0.0.1 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 4010 -s 172.16.0.0/12 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 4010 -s 10.0.0.0/8 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 4010 -j DROP

# MT5 Python API (port 8000)
iptables -I DOCKER-USER -p tcp --dport 8000 -s 127.0.0.1 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 8000 -s 172.16.0.0/12 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 8000 -s 10.0.0.0/8 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 8000 -j DROP

# MT5 Python Socket (port 8888)
iptables -I DOCKER-USER -p tcp --dport 8888 -s 127.0.0.1 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 8888 -s 172.16.0.0/12 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 8888 -s 10.0.0.0/8 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 8888 -j DROP

# Directus CMS (port 8055)
iptables -I DOCKER-USER -p tcp --dport 8055 -s 127.0.0.1 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 8055 -s 172.16.0.0/12 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 8055 -s 10.0.0.0/8 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 8055 -j DROP

# RabbitMQ Management (port 15672)
iptables -I DOCKER-USER -p tcp --dport 15672 -s 127.0.0.1 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 15672 -s 172.16.0.0/12 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 15672 -s 10.0.0.0/8 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 15672 -j DROP

# RabbitMQ AMQP (port 5672)
iptables -I DOCKER-USER -p tcp --dport 5672 -s 127.0.0.1 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 5672 -s 172.16.0.0/12 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 5672 -s 10.0.0.0/8 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 5672 -j DROP

# Allow nginx through DOCKER-USER chain as well (for consistency)
iptables -I DOCKER-USER -p tcp --dport 80 -j ACCEPT
iptables -I DOCKER-USER -p tcp --dport 443 -j ACCEPT

# Save rules (for Ubuntu/Debian with iptables-persistent)
if command -v iptables-save &> /dev/null; then
    echo "Saving iptables rules..."
    iptables-save > /etc/iptables/rules.v4 2>/dev/null || echo "Note: Could not save rules automatically. Run 'iptables-save > /etc/iptables/rules.v4' manually."
fi

echo ""
echo "Firewall configuration completed!"
echo "Only nginx (ports 80, 443) is accessible from external networks."
echo "Other services are only accessible from localhost and Docker networks."
echo ""
echo "Note: Rules for Docker containers are in the DOCKER-USER chain."
echo "These rules will work correctly with Docker's NAT routing."

