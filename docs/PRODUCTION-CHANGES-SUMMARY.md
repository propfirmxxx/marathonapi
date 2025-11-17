# Production Deployment Changes Summary

This document summarizes all changes made to prepare the MarathonAPI application for production deployment.

## Overview

The `docker-compose.yml` file has been hardened for production use with security best practices, health monitoring, resource management, and proper configuration management.

## Key Changes Made

### 1. Security Enhancements

#### Removed Hardcoded Credentials
- **Before**: Hardcoded `postgres/postgres` database credentials
- **After**: Uses environment variables with placeholder defaults
- **Before**: Hardcoded Directus credentials (`admin/admin`)
- **After**: Uses environment variables from `compose.env`
- **Location**: All service environment configurations

#### Database Access Control
- **Before**: Database port exposed on host (`54321:5432`)
- **After**: Port commented out, database only accessible via internal Docker network
- **Impact**: Prevents external database access attempts
- **Note**: Database can still be accessed by removing comment if debugging is needed

#### Docker Socket Security
- **Before**: Full read-write access to Docker socket
- **After**: Read-only mount (`:ro`)
- **Service**: marathon-api

#### PostgreSQL Authentication
- **Added**: `POSTGRES_INITDB_ARGS` with scram-sha-256 authentication
- **Impact**: Stronger password hashing and authentication

### 2. Health Checks

Added health checks for all services:
- **marathon-api**: `GET /health` endpoint every 30s
- **marathon-front**: `GET /health` endpoint every 30s  
- **marathon-mt5-python**: `GET /health` endpoint every 30s
- **db**: `pg_isready` every 10s
- **directus**: `GET /server/health` every 30s

**Implementation Details**:
- Health checks use `interval`, `timeout`, `retries`, and `start_period`
- Services wait for database to be healthy before starting
- Configured with proper timeouts to avoid false positives

### 3. Resource Management

Added resource limits and reservations for all services:

| Service | CPU Limit | Memory Limit | CPU Reservation | Memory Reservation |
|---------|-----------|--------------|-----------------|-------------------|
| marathon-api | 2.0 | 2GB | 0.5 | 512MB |
| marathon-front | 1.0 | 1GB | 0.25 | 256MB |
| marathon-mt5-python | 2.0 | 2GB | 0.5 | 512MB |
| db | 2.0 | 2GB | 0.5 | 512MB |
| directus | 1.0 | 1GB | 0.25 | 256MB |

**Benefits**: Prevents resource exhaustion and ensures fair resource allocation.

### 4. Logging Configuration

Added centralized logging with rotation:
- **Driver**: `json-file`
- **Max size**: 10MB per file
- **Max files**: 3 (keeps last 30MB of logs total)

**Benefits**: Prevents disk space issues and maintains log history.

### 5. Security Options

Added `security_opt` to all services:
- `no-new-privileges:true` - Prevents privilege escalation

**Benefits**: Reduces attack surface.

### 6. Service Dependencies

Improved dependency management:
- **marathon-api**: Waits for `db` health check before starting
- **directus**: Waits for `db` health check before starting

**Implementation**: Uses `depends_on` with `condition: service_healthy`

### 7. Volume Mounts

#### Read-Only Configs
- **meta-configs**: Changed to read-only (`:ro`)
  - **Service**: marathon-mt5-python
  - **Reason**: Configuration files shouldn't be modified by container

#### Environment Variables
- All services now use `compose.env` file
- Template file created: `compose.env.example`
- Added proper PostgreSQL, Directus, and JWT secret placeholders

### 8. Dockerfile Improvements

Added `curl` for health checks:
- **Reason**: Required by Docker health check commands
- **Implementation**: Installed during image build, cleaned up after

Added `--frozen-lockfile` to yarn install:
- **Reason**: Ensures consistent builds in production

### 9. Application Changes

#### Health Check Endpoint
- **Added**: `GET /health` endpoint to API
  - Returns status, timestamp, and service name
  - Location: `src/app.controller.ts`

#### .dockerignore File
- **Added**: `.dockerignore` to exclude unnecessary files from builds
  - Reduces image size
  - Speeds up builds
  - Excludes secrets and development files

### 10. Documentation and Scripts

#### Production Guide
- **Created**: `PRODUCTION.md`
  - Comprehensive deployment guide
  - Security checklist
  - Troubleshooting section
  - Backup/restore procedures
  - Monitoring recommendations

#### Helper Scripts
Created in `scripts/` directory:

1. **deploy.sh**: Automated deployment script
   - Checks prerequisites
   - Validates configuration
   - Pulls images
   - Starts services
   - Checks health

2. **backup.sh**: Backup script
   - Backs up database (pg_dump)
   - Backs up uploads directory
   - Backs up Directus data
   - Creates metadata file
   - Cleans up old backups (7+ days)

3. **restore.sh**: Restore script
   - Interactive confirmation
   - Restores database
   - Restores uploads
   - Restores Directus data
   - Safety checks

#### Configuration Template
- **Created**: `compose.env.example`
  - Template with all required environment variables
  - Placeholder values for secrets
  - Clear comments
  - Production-ready defaults

### 11. Environment Configuration

#### compose.env.example Structure
- PostgreSQL configuration
- Database connection settings
- JWT secrets and expiration
- Google OAuth credentials
- Email/SMTP configuration
- MetaAPI configuration
- Directus configuration
- Application settings

## Migration Steps

### For Existing Deployments

1. **Backup current data**:
   ```bash
   ./scripts/backup.sh
   ```

2. **Create production environment**:
   ```bash
   cp compose.env.example compose.env
   # Edit compose.env with your values
   chmod 600 compose.env
   ```

3. **Update docker-compose.yml**:
   - Pull latest changes
   - Review all modifications

4. **Deploy**:
   ```bash
   ./scripts/deploy.sh
   ```

### For New Deployments

1. **Clone and configure**:
   ```bash
   git clone <repo>
   cd marathonapi
   cp compose.env.example compose.env
   # Edit compose.env
   chmod 600 compose.env
   ```

2. **Deploy**:
   ```bash
   ./scripts/deploy.sh
   ```

## Security Checklist

Use this checklist before deploying to production:

- [ ] All secrets changed from defaults in `compose.env`
- [ ] Strong passwords for PostgreSQL (32+ characters)
- [ ] Strong JWT secret (32+ characters)
- [ ] Strong Directus secret (32+ characters)
- [ ] Directus admin credentials changed
- [ ] `compose.env` has permissions 600
- [ ] Database port not exposed externally
- [ ] Resource limits appropriate for server
- [ ] Log rotation configured
- [ ] Backup strategy implemented
- [ ] Reverse proxy configured (recommended)
- [ ] SSL/TLS certificates configured
- [ ] Firewall rules configured
- [ ] Health checks passing
- [ ] Monitoring configured

## Breaking Changes

### Database Port
- **Breaking**: Database port no longer exposed by default
- **Impact**: Cannot connect from host without modification
- **Solution**: Uncomment port mapping if needed for debugging

### Environment Variables
- **Breaking**: Must provide all environment variables
- **Impact**: Application won't start without proper configuration
- **Solution**: Use `compose.env.example` as template

### Health Endpoints
- **New Requirement**: Services must expose health endpoints
- **Impact**: If health checks fail, containers marked unhealthy
- **Solution**: Already implemented for all services

## Rollback Procedure

If issues arise, rollback is straightforward:

1. **Stop services**:
   ```bash
   docker-compose down
   ```

2. **Restore from backup**:
   ```bash
   ./scripts/restore.sh backups/<backup-timestamp>
   ```

3. **Restart**:
   ```bash
   docker-compose up -d
   ```

## Performance Considerations

### Resource Limits
Adjust based on actual usage:
- Monitor CPU and memory usage
- Scale limits up if services are constrained
- Scale down to optimize for smaller deployments

### Database Performance
- Consider adding connection pooling
- Monitor slow queries
- Adjust PostgreSQL configuration as needed

### Logging
- Default 30MB total per service
- Adjust if logs are critical
- Consider centralized logging (ELK, Loki, etc.)

## Additional Recommendations

### High Availability
For production:
- Use Docker Swarm or Kubernetes
- Set up database replication
- Implement load balancing
- Use shared storage for uploads

### Monitoring
Recommended tools:
- Prometheus + Grafana for metrics
- ELK stack for logs
- Sentry for error tracking
- Uptime monitoring

### Backup Automation
Schedule regular backups:
```bash
# Add to crontab (daily at 2 AM)
0 2 * * * /path/to/marathonapi/scripts/backup.sh
```

### SSL/TLS
Required for production:
- Use Let's Encrypt certificates
- Set up reverse proxy (nginx/traefik)
- Redirect HTTP to HTTPS
- Use HSTS headers

## Support

For questions or issues:
1. Check `PRODUCTION.md` for detailed guide
2. Review logs: `docker-compose logs -f`
3. Check health: `docker-compose ps`
4. Contact support team

## Version History

- **2024-11-01**: Initial production hardening
  - Security enhancements
  - Health checks
  - Resource limits
  - Logging configuration
  - Helper scripts
  - Documentation


