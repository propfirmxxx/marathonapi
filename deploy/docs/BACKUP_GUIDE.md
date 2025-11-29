# PostgreSQL Backup Guide

## Backup خودکار

### استفاده از Script

```bash
cd deploy
./scripts/backup-postgres.sh [retention_days]
```

مثال:
```bash
# Backup با retention 30 روز (پیش‌فرض)
./scripts/backup-postgres.sh

# Backup با retention 7 روز
./scripts/backup-postgres.sh 7
```

### Backup دستی با docker-compose

```bash
docker-compose -f docker-compose.yml run --rm postgres-backup
```

## Restore

### استفاده از Script

```bash
cd deploy
./scripts/restore-postgres.sh <backup_file.dump.gz>
```

مثال:
```bash
./scripts/restore-postgres.sh backups/postgres/marathon_20241123_120000.dump.gz
```

### Restore دستی

```bash
# Decompress backup
gunzip backups/postgres/marathon_20241123_120000.dump.gz

# Restore
docker-compose exec -T db pg_restore \
    -U $(cat secrets/db_user.txt) \
    -d marathon \
    --clean \
    --if-exists \
    < backups/postgres/marathon_20241123_120000.dump
```

## Scheduled Backups (Cron)

برای backup خودکار روزانه:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/marathonapi/deploy && ./scripts/backup-postgres.sh 30 >> /var/log/postgres-backup.log 2>&1
```

## Backup Location

Backups در `deploy/backups/postgres/` ذخیره می‌شوند:
- Format: `marathon_YYYYMMDD_HHMMSS.dump.gz`
- Compression: gzip
- Retention: قابل تنظیم (پیش‌فرض 30 روز)

## Best Practices

1. ✅ **Backup منظم** - حداقل روزانه
2. ✅ **Test restore** - به صورت دوره‌ای restore را تست کنید
3. ✅ **Offsite backup** - backup را به مکان دیگری کپی کنید
4. ✅ **Encryption** - برای backup‌های حساس encryption استفاده کنید
5. ✅ **Monitoring** - لاگ‌های backup را مانیتور کنید

## Troubleshooting

### مشکل: "Permission denied"
```bash
chmod +x scripts/backup-postgres.sh
chmod +x scripts/restore-postgres.sh
```

### مشکل: "Backup file not found"
- بررسی کنید که secrets درست تنظیم شده‌اند
- بررسی کنید که database در حال اجرا است

### مشکل: "Disk space"
- Retention را کاهش دهید
- Backup‌های قدیمی را حذف کنید
- Backup را به volume دیگر منتقل کنید

