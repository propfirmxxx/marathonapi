# Production Deployment Guide

Complete step-by-step guide for deploying Marathon API to a production server.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Preparation](#server-preparation)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Deployment](#deployment)
6. [Verification](#verification)
7. [Maintenance](#maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Server Requirements

- **OS**: Ubuntu 20.04 LTS or later (recommended)
- **RAM**: Minimum 8GB (16GB recommended)
- **CPU**: 4 cores minimum (8 cores recommended)
- **Disk**: 50GB+ free space (SSD recommended)
- **Network**: Static IP address, ports 80, 443 open

### Software Requirements

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- Basic firewall (UFW or iptables)

### Access Requirements

- SSH access to server
- Sudo/root privileges
- Domain name (optional, for SSL)

---

## Server Preparation

### Step 1: Update System

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y \
    curl \
    wget \
    git \
    vim \
    ufw \
    ca-certificates \
    gnupg \
    lsb-release
```

### Step 2: Install Docker

```bash
# Remove old versions
sudo apt remove -y docker docker-engine docker.io containerd runc

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (optional, for non-sudo usage)
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect
```

### Step 3: Verify Docker Installation

```bash
# Check Docker version
docker --version
docker compose version

# Test Docker
sudo docker run hello-world
```

### Step 4: Configure Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check firewall status
sudo ufw status verbose
```

---

## Installation

### Step 1: Clone Repository

```bash
# Navigate to deployment directory
cd /opt
sudo git clone <your-repository-url> marathonapi
cd marathonapi

# Or if you have the code locally, upload it via SCP
# scp -r deploy/ user@server:/opt/marathonapi/
```

### Step 2: Navigate to Deploy Directory

```bash
cd deploy
```

### Step 3: Create Directory Structure

```bash
# Create necessary directories
mkdir -p secrets backups/postgres scripts nginx/logs
```

---

## Configuration

### Step 1: Create Environment File

```bash
# Create .env.compose.prod from template
cp env.compose.prod.example .env.compose.prod

# Edit with your values
nano .env.compose.prod
# or
vim .env.compose.prod

# Set secure permissions
chmod 600 .env.compose.prod
```

**Required variables in .env.compose.prod:**
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

### Step 2: Setup Nginx Configuration

```bash
# Copy nginx config to volume (if using named volumes)
# Or ensure nginx/nginx.conf exists with your configuration

# If using setup script:
./scripts/setup-volumes.sh  # If you have this script
```

### Step 3: Setup Meta Configs (if needed)

```bash
# If meta-configs directory doesn't exist, create it
mkdir -p ../meta-configs

# Copy your MT5 configuration files here
# cp /path/to/your/configs/*.ini ../meta-configs/
```

---

## Deployment

### Step 1: Review Configuration

```bash
# Check docker-compose.yml
cat docker-compose.yml | head -50

# Verify .env.compose.prod exists and has required variables
ls -la .env.compose.prod
cat .env.compose.prod | grep -E "POSTGRES_|DIRECTUS_|RABBITMQ_|MINIO_|JWT_SECRET|API_KEY"
```

### Step 2: Pull Docker Images

```bash
# Pull all required images
docker compose pull

# This may take several minutes depending on your connection
```

### Step 3: Start Services (Development Mode)

For initial testing, start without production overrides:

```bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Step 4: Start Services (Production Mode)

Once everything is verified, use production configuration:

```bash
# Stop development services
docker compose down

# Start with production overrides
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Step 5: Setup MinIO (Optional)

If using MinIO for object storage:

```bash
# Start MinIO service first
docker compose up -d minio

# Wait for MinIO to be ready
sleep 10

# Setup bucket
chmod +x minio-setup.sh
./minio-setup.sh
```

### Step 6: Configure Firewall Rules

```bash
cd firewall

# Review firewall configuration
cat README.md

# Apply firewall rules (only allows nginx, blocks other services)
sudo chmod +x configure-ufw.sh
sudo ./configure-ufw.sh

# Verify rules
sudo ufw status verbose
```

---

## Verification

### Step 1: Check Service Health

```bash
# Check all services are running
docker compose ps

# Check health status
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

### Step 2: Test Endpoints

```bash
# Test nginx health
curl http://localhost/nginx-health

# Test API health (if exposed)
curl http://localhost:3000/health

# Test frontend (if exposed)
curl http://localhost:4010/health
```

### Step 3: Check Logs

```bash
# View all logs
docker compose logs --tail=50

# View specific service logs
docker compose logs marathon-api --tail=50
docker compose logs db --tail=50
docker compose logs nginx --tail=50
```

### Step 4: Verify Database Connection

```bash
# Load environment variables
source .env.compose.prod

# Test PostgreSQL connection
docker compose exec db psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-marathon} -c "SELECT version();"
```

### Step 5: Verify Volumes

```bash
# List volumes
docker volume ls | grep marathonapi

# Check volume usage
docker system df -v
```

---

## Maintenance

### Daily Operations

#### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f marathon-api

# Last 100 lines
docker compose logs --tail=100
```

#### Restart Services

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart marathon-api
```

#### Update Services

```bash
# Pull latest images
docker compose pull

# Recreate containers with new images
docker compose up -d --force-recreate

# Or restart specific service
docker compose up -d --force-recreate marathon-api
```

### Backup Operations

#### PostgreSQL Backup

```bash
# Manual backup
cd /opt/marathonapi/deploy
chmod +x scripts/backup-postgres.sh
./scripts/backup-postgres.sh

# Scheduled backup (add to crontab)
crontab -e
# Add: 0 2 * * * cd /opt/marathonapi/deploy && ./scripts/backup-postgres.sh 30 >> /var/log/postgres-backup.log 2>&1
```

#### Restore from Backup

```bash
cd /opt/marathonapi/deploy
chmod +x scripts/restore-postgres.sh
./scripts/restore-postgres.sh backups/postgres/marathon_YYYYMMDD_HHMMSS.dump.gz
```

### Monitoring

#### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Volume usage
docker volume ls
du -sh /var/lib/docker/volumes/marathonapi_*
```

#### Health Checks

```bash
# Check service health
docker compose ps

# Manual health check
curl http://localhost/nginx-health
curl http://localhost:3000/health
```

### Cleanup

#### Remove Old Backups

```bash
# Remove backups older than 30 days
find backups/postgres -name "*.dump.gz" -mtime +30 -delete
```

#### Clean Docker System

```bash
# Remove unused images, containers, networks
docker system prune -a

# Remove unused volumes (⚠️ be careful!)
docker volume prune
```

---

## Troubleshooting

### Common Issues

#### Services Won't Start

```bash
# Check logs for errors
docker compose logs

# Check if ports are already in use
sudo netstat -tulpn | grep -E ':(80|443|3000|4010|8055)'

# Check Docker daemon
sudo systemctl status docker
```

#### Database Connection Issues

```bash
# Check database is running
docker compose ps db

# Check database logs
docker compose logs db

# Test connection
docker compose exec db pg_isready -U $(cat secrets/db_user.txt)
```

#### Permission Issues

```bash
# Fix secret file permissions
chmod 600 secrets/*.txt

# Fix .env file permissions
chmod 600 .env.compose.prod

# Check Docker socket permissions
ls -la /var/run/docker.sock
```

#### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a --volumes

# Remove old logs
docker compose logs --no-log-prefix | head -n 0
```

#### Network Issues

```bash
# Check network
docker network ls
docker network inspect marathonapi_marathon-network

# Restart network
docker compose down
docker compose up -d
```

### Getting Help

1. **Check Logs**: Always start with `docker compose logs`
2. **Check Status**: `docker compose ps`
3. **Check Resources**: `docker stats`
4. **Review Configuration**: Verify secrets and .env files
5. **Check Documentation**: Review PRODUCTION_SETUP.md and BACKUP_GUIDE.md

---

## Security Checklist

Before going live, ensure:

- [ ] All environment variables are set with strong passwords in .env.compose.prod
- [ ] `.env.compose.prod` is not committed to git
- [ ] Firewall is configured (only nginx public)
- [ ] docker-socket-proxy is active
- [ ] All services use named volumes (not bind mounts)
- [ ] Resource limits are set
- [ ] Log rotation is configured for production
- [ ] Backup schedule is configured
- [ ] SSL/TLS is configured (if using domain)
- [ ] Regular security updates are scheduled

---

## Quick Reference

### Essential Commands

```bash
# Start services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart service
docker compose restart <service-name>

# Backup database
./scripts/backup-postgres.sh

# Check status
docker compose ps
```

### File Locations

- **Configuration**: `/opt/marathonapi/deploy/`
- **Secrets**: `/opt/marathonapi/deploy/secrets/`
- **Backups**: `/opt/marathonapi/deploy/backups/postgres/`
- **Logs**: Docker volumes (use `docker compose logs`)

---

## Next Steps

After successful deployment:

1. Configure domain name and SSL (if applicable)
2. Set up monitoring and alerting
3. Configure automated backups
4. Set up log aggregation
5. Document your specific configuration
6. Train team on maintenance procedures

---

## Support

For issues or questions:
- Review logs: `docker compose logs`
- Check documentation in `deploy/` directory
- Review service-specific documentation

