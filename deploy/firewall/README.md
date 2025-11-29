# Firewall Configuration for Marathon API

This directory contains firewall configuration scripts to restrict public access to only nginx (ports 80, 443), while keeping all other services accessible only internally.

## Services and Ports

- **nginx**: Ports 80, 443 (PUBLIC - allowed)
- **marathon-api**: Port 3000 (INTERNAL ONLY - blocked from external)
- **marathon-front**: Port 4010 (INTERNAL ONLY - blocked from external)
- **marathon-mt5-python**: Ports 8000, 8888 (INTERNAL ONLY - blocked from external)
- **directus**: Port 8055 (INTERNAL ONLY - blocked from external)
- **rabbitmq**: Ports 15672, 5672 (INTERNAL ONLY - blocked from external)

## ⚠️ Important: Docker and Firewall Compatibility

**Docker routes container traffic through the NAT table BEFORE it reaches firewall INPUT chains.** This means:

- **UFW rules are BYPASSED** for Docker-published ports
- **iptables INPUT chain rules are BYPASSED** for Docker-published ports
- **Solution:** Use the `DOCKER-USER` chain for Docker containers

For more information, see: [Docker and ufw documentation](https://docs.docker.com/engine/network/packet-filtering-firewalls/#docker-and-ufw)

## Configuration Methods

### Option 1: iptables with DOCKER-USER Chain (Recommended for Docker)

Use `configure-firewall.sh` for Docker-compatible firewall rules:

```bash
sudo chmod +x firewall/configure-firewall.sh
sudo ./firewall/configure-firewall.sh
```

**Features:**
- ✅ **Docker-compatible** - Uses DOCKER-USER chain for Docker-published ports
- Allows access from localhost (127.0.0.1)
- Allows access from Docker networks (172.16.0.0/12, 10.0.0.0/8)
- Blocks all external access to non-nginx ports
- Works correctly with Docker's NAT routing

**How it works:**
- Rules for Docker containers are added to the `DOCKER-USER` chain
- This chain is processed AFTER Docker's NAT rules but BEFORE final routing
- This is the correct way to filter traffic to Docker containers

**Note:** Make sure to save iptables rules for persistence:
```bash
# Ubuntu/Debian
sudo apt-get install iptables-persistent
sudo netfilter-persistent save

# Or manually
sudo iptables-save > /etc/iptables/rules.v4
```

### Option 2: UFW (Not Recommended for Docker)

⚠️ **Warning:** UFW rules are bypassed by Docker-published ports due to Docker's NAT routing.

Use `configure-ufw.sh` only if you understand the limitations:

```bash
sudo chmod +x firewall/configure-ufw.sh
sudo ./firewall/configure-ufw.sh
```

**Limitations:**
- ❌ Docker-published ports will bypass UFW rules
- ❌ Not suitable for protecting Docker containers
- ✅ May still work for non-Docker services
- ✅ Simpler configuration for non-Docker setups

**When to use:** Only if you're not using Docker or if you understand that Docker containers won't be protected by these rules.

## Verification

After applying firewall rules, verify that:

1. **Nginx is accessible:**
   ```bash
   curl http://your-server-ip/
   ```

2. **Other services are blocked:**
   ```bash
   curl http://your-server-ip:3000/  # Should timeout or be refused
   curl http://your-server-ip:4010/  # Should timeout or be refused
   ```

3. **Services are accessible internally:**
   ```bash
   curl http://localhost:3000/  # Should work
   curl http://localhost:4010/  # Should work
   ```

## Important Notes

1. **Docker Networking:** Docker containers communicate through an internal bridge network. Even with firewall rules blocking external access, containers can still reach each other internally.

2. **Docker and UFW Incompatibility:** Docker routes traffic through NAT before UFW's INPUT chain, so UFW rules don't apply to Docker-published ports. Always use `configure-firewall.sh` (iptables with DOCKER-USER chain) for Docker deployments.

3. **SSH Access:** Make sure SSH (port 22) is allowed before applying rules, or you may lock yourself out!

4. **Cloud Provider Firewalls:** If you're using a cloud provider (AWS, Azure, GCP), you may also need to configure their security groups/firewall rules.

5. **Testing:** Always test firewall rules on a non-production environment first.

6. **DOCKER-USER Chain:** Docker automatically creates the DOCKER-USER chain. Rules added here are processed after Docker's NAT rules, making them the correct way to filter Docker container traffic.

## Troubleshooting

### Can't access services from Docker containers
- Docker uses its own network bridge. Check Docker network configuration.
- Verify containers are on the same Docker network.

### Locked out of SSH
- If you're locked out, you may need console access to fix firewall rules.
- Consider using a cloud provider's console or physical access.

### Rules not persisting after reboot
- Install `iptables-persistent` or use UFW which auto-saves rules.
- Check systemd services for firewall management.

