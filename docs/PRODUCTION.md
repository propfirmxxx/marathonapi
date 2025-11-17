# Production Deployment Guide

This guide explains how to deploy the MarathonAPI application to production using Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Sufficient resources:
  - CPU: Minimum 4 cores
  - RAM: Minimum 8GB
  - Disk: 50GB+ free space

## Security Checklist

### 1. Environment Configuration

**CRITICAL**: Never commit the `compose.env` file to version control!

1. Copy the example environment file:
   ```bash
   cp compose.env.example compose.env
   ```

2. Generate strong secrets:
   ```bash
   # Generate JWT secret (32+ characters)
   openssl rand -base64 32

   # Generate Directus secret
   openssl rand -base64 32

   # Generate PostgreSQL password
   openssl rand -base64 32
   ```

3. Update all values in `compose.env`:
   - Replace all `CHANGE_THIS_*` placeholders
   - Update database credentials
   - Configure OAuth credentials
   - Set email service credentials
   - Update Directus admin credentials

4. Set appropriate file permissions:
   ```bash
   chmod 600 compose.env
   ```

### 2. PostgreSQL Security

The production configuration:
- ✅ Uses strong authentication (scram-sha-256)
- ✅ Does NOT expose database port to host
- ✅ Database is only accessible via internal Docker network
- ⚠️ Ensure `POSTGRES_PASSWORD` is set in `compose.env`

### 3. Network Security

**Important**: Consider using a reverse proxy (nginx/traefik) in front of services:
- Place services behind HTTPS
- Hide internal ports
- Add rate limiting
- Implement proper firewall rules

Recommended ports to expose publicly:
- `3000` - marathon-api (via reverse proxy)
- `4010` - marathon-front (via reverse proxy)
- `8055` - directus (via reverse proxy)

**Internal only** (remove from docker-compose.yml if needed):
- `8888` - marathon-mt5-python (if only accessed internally)
- `8000` - marathon-mt5-python (if only accessed internally)

### 4. Volumes and Data Persistence

Ensure persistent volumes are configured:
```bash
# Check volume locations
docker volume inspect marathonapi_pgdata

# Create backups regularly
docker exec marathonapi-db-1 pg_dump -U postgres marathon > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 5. Resource Limits

The compose file includes resource limits. Adjust based on your server capacity:
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
```

### 6. Health Checks

All services include health checks. Monitor with:
```bash
docker-compose ps
```

## Deployment Steps

### 1. Initial Setup

```bash
# Clone repository
git clone <your-repo>
cd marathonapi

# Create production environment
cp compose.env.example compose.env
# Edit compose.env with production values
chmod 600 compose.env

# Ensure docker socket permissions (if using Docker-in-Docker)
sudo chmod 666 /var/run/docker.sock
```

### 2. Build and Start Services

```bash
# Build and start all services
docker-compose up -d --build

# Check service health
docker-compose ps
docker-compose logs -f marathon-api

# Verify all services are healthy
docker-compose ps | grep -E "(marathon-api|db|directus)" | grep "Up (healthy)"
```

### 3. Verify Deployment

```bash
# Check API health endpoint
curl http://localhost:3000/health

# Check database connection
docker exec marathonapi-db-1 psql -U postgres -d marathon -c "SELECT 1"

# Check logs for errors
docker-compose logs marathon-api | grep -i error
```

### 4. Run Database Migrations

```bash
# Migrations should run automatically on startup (migrationsRun: true)
# To run manually if needed:
docker-compose exec marathon-api yarn migration:run
```

## Monitoring and Maintenance

### Logs

View logs for specific services:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f marathon-api

# Last 100 lines
docker-compose logs --tail=100 marathon-api
```

Logs are configured with rotation:
- Max 10MB per file
- Keep 3 files

### Updates

```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build

# Zero-downtime deployment (requires custom setup)
# Consider using docker-compose with rolling updates
```

### Backup

#### Database Backup
```bash
# Create backup
docker-compose exec -T db pg_dump -U postgres marathon > backup.sql

# Restore backup
docker-compose exec -T db psql -U postgres marathon < backup.sql
```

#### Volume Backup
```bash
# Backup all volumes
docker run --rm -v marathonapi_pgdata:/data -v $(pwd):/backup \
  alpine tar czf /backup/pgdata-backup.tar.gz -C / data

# Backup uploads
tar czf uploads-backup.tar.gz ./uploads

# Backup Directus
tar czf directus-backup.tar.gz ./directus-database ./directus-uploads
```

### Health Monitoring

Set up automated monitoring:
- Use `docker-compose ps` to check health status
- Monitor logs for errors
- Set up external monitoring (e.g., Prometheus, Grafana)
- Configure alerts for service failures

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs <service-name>

# Check resource usage
docker stats

# Verify environment variables
docker-compose config
```

### Database Connection Issues

```bash
# Test connection from API container
docker-compose exec marathon-api ping db

# Check database logs
docker-compose logs db

# Verify credentials
docker-compose exec db psql -U postgres -d marathon
```

### Out of Memory

```bash
# Check resource usage
docker stats

# Increase limits in docker-compose.yml
# Or add swap space
```

### Health Checks Failing

```bash
# Check if services are actually running
docker-compose exec marathon-api curl http://localhost:3000/health

# Adjust health check intervals if services are slow to start
```

## Additional Security Recommendations

1. **Use Docker Secrets** (Swarm mode):
   ```bash
   # In production, consider using Docker Swarm secrets
   echo "mysecretpassword" | docker secret create postgres_password -
   ```

2. **Enable SSL/TLS**:
   - Use a reverse proxy (nginx/traefik) with Let's Encrypt
   - Configure services to use HTTPS internally

3. **Regular Updates**:
   ```bash
   # Update base images regularly
   docker-compose pull
   docker-compose up -d --build
   ```

4. **Firewall Configuration**:
   ```bash
   # Only expose necessary ports
   sudo ufw allow 22/tcp     # SSH
   sudo ufw allow 80/tcp     # HTTP (redirect to HTTPS)
   sudo ufw allow 443/tcp    # HTTPS
   sudo ufw enable
   ```

5. **Restrict Docker Socket Access**:
   - Consider removing Docker socket mount if not needed
   - Use Docker-in-Docker or separate CI/CD for container management

6. **Enable PostgreSQL Audit Logging**:
   Add to `db` service:
   ```yaml
   environment:
     - shared_preload_libraries=pg_stat_statements
   ```

## Production Checklist

- [ ] All secrets changed from defaults
- [ ] `compose.env` has restricted permissions (600)
- [ ] Database password is strong and unique
- [ ] JWT secret is strong (32+ characters)
- [ ] Directus admin credentials changed
- [ ] Database port not exposed externally
- [ ] Resource limits configured appropriately
- [ ] Log rotation configured
- [ ] Backup strategy implemented
- [ ] Health checks passing
- [ ] Reverse proxy configured (optional but recommended)
- [ ] SSL/TLS certificates configured
- [ ] Monitoring and alerts set up
- [ ] Firewall rules configured
- [ ] Documentation updated

## Scaling

To scale services horizontally:

```bash
# Scale API instances
docker-compose up -d --scale marathon-api=3

# Note: Requires additional configuration for load balancing
# Consider using Docker Swarm or Kubernetes for production scaling
```

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review this guide
3. Check application documentation
4. Contact support team


