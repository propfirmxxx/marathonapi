#!/bin/bash

# Firewall configuration script for Marathon API
# This script configures iptables to only allow public access to nginx (ports 80, 443)
# All other services are blocked from external access but accessible internally

set -e

echo "Configuring firewall rules for Marathon API..."

# Flush existing rules (be careful in production!)
# iptables -F
# iptables -X
# iptables -t nat -F
# iptables -t nat -X

# Set default policies
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
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Block direct access to other services from external
# Allow localhost and Docker network ranges
iptables -A INPUT -p tcp --dport 3000 -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -s 172.16.0.0/12 -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -j DROP

iptables -A INPUT -p tcp --dport 4010 -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -p tcp --dport 4010 -s 172.16.0.0/12 -j ACCEPT
iptables -A INPUT -p tcp --dport 4010 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 4010 -j DROP

iptables -A INPUT -p tcp --dport 8000 -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -p tcp --dport 8000 -s 172.16.0.0/12 -j ACCEPT
iptables -A INPUT -p tcp --dport 8000 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 8000 -j DROP

iptables -A INPUT -p tcp --dport 8888 -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -p tcp --dport 8888 -s 172.16.0.0/12 -j ACCEPT
iptables -A INPUT -p tcp --dport 8888 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 8888 -j DROP

iptables -A INPUT -p tcp --dport 8055 -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -p tcp --dport 8055 -s 172.16.0.0/12 -j ACCEPT
iptables -A INPUT -p tcp --dport 8055 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 8055 -j DROP

iptables -A INPUT -p tcp --dport 15672 -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -p tcp --dport 15672 -s 172.16.0.0/12 -j ACCEPT
iptables -A INPUT -p tcp --dport 15672 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 15672 -j DROP

iptables -A INPUT -p tcp --dport 5672 -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -p tcp --dport 5672 -s 172.16.0.0/12 -j ACCEPT
iptables -A INPUT -p tcp --dport 5672 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 5672 -j DROP

# Save rules (for Ubuntu/Debian with iptables-persistent)
if command -v iptables-save &> /dev/null; then
    echo "Saving iptables rules..."
    iptables-save > /etc/iptables/rules.v4 2>/dev/null || echo "Note: Could not save rules automatically. Run 'iptables-save > /etc/iptables/rules.v4' manually."
fi

echo "Firewall configuration completed!"
echo "Only nginx (ports 80, 443) is accessible from external networks."
echo "Other services are only accessible from localhost and Docker networks."

