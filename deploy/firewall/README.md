# Firewall Configuration for Marathon API

This directory contains firewall configuration scripts to restrict public access to only nginx (ports 80, 443), while keeping all other services accessible only internally.

## Services and Ports

- **nginx**: Ports 80, 443 (PUBLIC - allowed)
- **marathon-api**: Port 3000 (INTERNAL ONLY - blocked from external)
- **marathon-front**: Port 4010 (INTERNAL ONLY - blocked from external)
- **marathon-mt5-python**: Ports 8000, 8888 (INTERNAL ONLY - blocked from external)
- **directus**: Port 8055 (INTERNAL ONLY - blocked from external)
- **rabbitmq**: Ports 15672, 5672 (INTERNAL ONLY - blocked from external)

## Configuration Methods

### Option 1: iptables (Advanced)

Use `configure-firewall.sh` for fine-grained control with iptables:

```bash
sudo chmod +x firewall/configure-firewall.sh
sudo ./firewall/configure-firewall.sh
```

**Features:**
- Allows access from localhost (127.0.0.1)
- Allows access from Docker networks (172.16.0.0/12, 10.0.0.0/8)
- Blocks all external access to non-nginx ports

**Note:** Make sure to save iptables rules for persistence:
```bash
# Ubuntu/Debian
sudo apt-get install iptables-persistent
sudo netfilter-persistent save

# Or manually
sudo iptables-save > /etc/iptables/rules.v4
```

### Option 2: UFW (Uncomplicated Firewall)

Use `configure-ufw.sh` for simpler UFW-based configuration:

```bash
sudo chmod +x firewall/configure-ufw.sh
sudo ./firewall/configure-ufw.sh
```

**Features:**
- Simpler configuration
- Easier to manage
- Automatically saves rules

**Note:** Docker containers can still communicate internally through Docker's network bridge, even with UFW rules blocking external access.

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

2. **SSH Access:** Make sure SSH (port 22) is allowed before applying rules, or you may lock yourself out!

3. **Cloud Provider Firewalls:** If you're using a cloud provider (AWS, Azure, GCP), you may also need to configure their security groups/firewall rules.

4. **Testing:** Always test firewall rules on a non-production environment first.

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

