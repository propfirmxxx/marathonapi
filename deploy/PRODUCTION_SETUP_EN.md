# Production Setup Guide (English)

Complete guide for setting up Marathon API in production environment.

## Overview

This guide covers the complete setup process for deploying Marathon API stack to a production server, including security best practices, backup configuration, and maintenance procedures.

---

## 1. Environment Variables

### Creating .env.compose.prod

```bash
cd deploy

# Copy template
cp env.compose.prod.example .env.compose.prod

# Edit with your values
nano .env.compose.prod
# or
vim .env.compose.prod

# Set secure permissions
chmod 600 .env.compose.prod
```

**Required variables:**
```env
# Database Configuration
POSTGRES_DB=marathon
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YourStrongDatabasePassword123!

# Directus CMS Configuration
DIRECTUS_ADMIN_EMAIL=admin@yourdomain.com
DIRECTUS_ADMIN_PASSWORD=YourStrongDirectusPassword123!
DIRECTUS_SECRET=YourDirectusSecretKey

# RabbitMQ Configuration
RABBITMQ_USER=rabbitmq_user
RABBITMQ_PASS=YourStrongRabbitMQPassword123!

# MinIO Object Storage Configuration
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=YourStrongMinIOPassword123!

# Application Secrets
JWT_SECRET=YourJWTSecretKeyHere
API_KEY=YourAPIKeyHere

# Logging Configuration
LOG_MAX_SIZE=10m
LOG_MAX_FILES=3
LOG_COMPRESS=true

# Marathon MT5 Python Configuration
CONFIG_DIRECTORY_HOST=/opt/marathonapi/meta-configs
```

**Generate secure secrets:**
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate API key
openssl rand -base64 32

# Or use Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**⚠️ Important:** Never commit this file to git! (Already in `.gitignore`)

---

## 2. Log Rotation (Production)

### Using docker-compose.prod.yml

For production, use the override file for optimized log rotation:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Production Log Settings:**
- **max-size**: 50-100m (depending on service)
- **max-file**: 10-20
- **compress**: true

**Development Log Settings (default):**
- **max-size**: 10m
- **max-file**: 3
- **compress**: true

### Custom Log Settings

You can override in `.env.compose.prod`:
```env
LOG_MAX_SIZE=50m
LOG_MAX_FILES=10
LOG_COMPRESS=true
```

---

## 3. PostgreSQL Backup

### Automatic Backup

```bash
cd deploy

# Make script executable
chmod +x scripts/backup-postgres.sh

# Manual backup
./scripts/backup-postgres.sh

# Backup with custom retention (days)
./scripts/backup-postgres.sh 7
```

### Scheduled Backup (Cron)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM (keeps backups for 30 days)
0 2 * * * cd /opt/marathonapi/deploy && ./scripts/backup-postgres.sh 30 >> /var/log/postgres-backup.log 2>&1
```

### Restore from Backup

```bash
cd deploy
chmod +x scripts/restore-postgres.sh

# List available backups
ls -lh backups/postgres/*.dump.gz

# Restore
./scripts/restore-postgres.sh backups/postgres/marathon_YYYYMMDD_HHMMSS.dump.gz
```

For detailed backup information, see [BACKUP_GUIDE.md](./BACKUP_GUIDE.md)

---

## 4. Security Checklist

Before deploying to production:

- [ ] **.env.compose.prod created** with all required variables and strong passwords
- [ ] **`.env.compose.prod` created** and not committed
- [ ] **Firewall configured** (only nginx public)
- [ ] **docker-socket-proxy active** (no direct docker.sock access)
- [ ] **Named volumes used** (not bind mounts for sensitive data)
- [ ] **Resource limits set** (mem_limit, cpus)
- [ ] **Log rotation configured** for production
- [ ] **Backup schedule configured**
- [ ] **SSL/TLS configured** (if using domain)
- [ ] **Regular updates scheduled**

---

## 5. Deployment Steps

### Initial Setup

```bash
# 1. Create .env.compose.prod
cd deploy
cp env.compose.prod.example .env.compose.prod
# Edit .env.compose.prod with your values (see section 1)

# 3. Start services (development - for testing)
docker compose up -d

# 4. Verify everything works
docker compose ps
docker compose logs

# 5. Stop development services
docker compose down
```

### Production Deployment

```bash
# 1. Start services with production config
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 2. Setup MinIO (optional)
./minio-setup.sh

# 3. Configure firewall (Docker-compatible iptables)
cd firewall
sudo ./configure-firewall.sh

# 4. Verify services
docker compose ps
curl http://localhost/nginx-health
```

---

## 6. Monitoring

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f marathon-api

# Last 100 lines
docker compose logs --tail=100 marathon-api
```

### Health Checks

```bash
# Check service health
docker compose ps

# Manual health check
curl http://localhost/nginx-health
curl http://localhost:3000/health
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Volume usage
docker volume ls
```

---

## 7. Maintenance

### Update Services

```bash
# Pull latest images
docker compose pull

# Restart services
docker compose restart

# Or recreate with new images
docker compose up -d --force-recreate
```

### Cleanup

```bash
# Remove old backups
find backups/postgres -name "*.dump.gz" -mtime +30 -delete

# Clean Docker system
docker system prune -a
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose logs

# Check if ports are in use
sudo netstat -tulpn | grep -E ':(80|443|3000)'

# Check Docker daemon
sudo systemctl status docker
```

### Database Connection Issues

```bash
# Check database status
docker compose ps db

# Check database logs
docker compose logs db

# Test connection
docker compose exec db pg_isready -U $(cat secrets/db_user.txt)
```

### Permission Issues

```bash
# Fix .env permissions
chmod 600 .env.compose.prod
```

---

## File Structure

```
deploy/
├── docker-compose.yml          # Main compose file
├── docker-compose.prod.yml     # Production overrides
├── .env.compose.prod           # Environment variables (not in git)
├── env.compose.prod.example    # Environment template (safe to commit)
├── backups/                    # Database backups
│   └── postgres/
├── scripts/                    # Utility scripts
│   ├── backup-postgres.sh
│   └── restore-postgres.sh
├── nginx/                      # Nginx configuration
│   └── nginx.conf
└── firewall/                   # Firewall scripts
    └── configure-ufw.sh
```

---

## Quick Reference

### Essential Commands

```bash
# Start (production)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Stop
docker compose down

# View logs
docker compose logs -f

# Restart service
docker compose restart <service-name>

# Backup
./scripts/backup-postgres.sh

# Status
docker compose ps
```

### Important Files

- **Environment**: `deploy/.env.compose.prod` (never commit! Contains all secrets)
- **Template**: `deploy/env.compose.prod.example` (safe to commit)
- **Compose**: `deploy/docker-compose.yml`
- **Production**: `deploy/docker-compose.prod.yml`

---

## Additional Resources

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete step-by-step deployment guide
- [BACKUP_GUIDE.md](./BACKUP_GUIDE.md) - Backup and restore procedures
- [firewall/README.md](./firewall/README.md) - Firewall configuration

---

## Support

For issues:
1. Check logs: `docker compose logs`
2. Review documentation in `deploy/` directory
3. Check service-specific logs
4. Verify configuration files

