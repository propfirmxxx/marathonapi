# Secrets Management

## ⚠️ امنیت

این دایرکتوری شامل فایل‌های حساس است. **هرگز** این فایل‌ها را به git commit نکنید!

## فایل‌های مورد نیاز

ایجاد کنید:

1. **db_user.txt** - نام کاربری PostgreSQL
   ```
   postgres
   ```

2. **db_password.txt** - رمز عبور PostgreSQL (قوی!)
   ```
   YourStrongPasswordHere123!
   ```

3. **jwt_secret.txt** - Secret key برای JWT tokens
   ```
   YourVeryLongAndRandomJWTSecretKeyHere
   ```

4. **api_key.txt** - API key برای authentication
   ```
   YourAPIKeyHere
   ```

## نحوه ایجاد

```bash
cd deploy/secrets

# Create files
echo "postgres" > db_user.txt
echo "YourStrongPassword123!" > db_password.txt
echo "YourJWTSecretKey" > jwt_secret.txt
echo "YourAPIKey" > api_key.txt

# Set proper permissions (Linux/Mac)
chmod 600 *.txt
```

## Windows

در Windows از PowerShell:

```powershell
cd deploy\secrets
"postgres" | Out-File -FilePath db_user.txt -Encoding utf8 -NoNewline
"YourStrongPassword123!" | Out-File -FilePath db_password.txt -Encoding utf8 -NoNewline
"YourJWTSecretKey" | Out-File -FilePath jwt_secret.txt -Encoding utf8 -NoNewline
"YourAPIKey" | Out-File -FilePath api_key.txt -Encoding utf8 -NoNewline
```

## استفاده در docker-compose

Secrets به صورت خودکار در `/run/secrets/` mount می‌شوند:

```yaml
secrets:
  - db_password

environment:
  POSTGRES_PASSWORD_FILE: /run/secrets/db_password
```

یا در کد:

```python
with open('/run/secrets/db_password', 'r') as f:
    password = f.read().strip()
```

## Backup و Restore

برای backup کردن secrets (⚠️ با احتیاط):

```bash
# Encrypt before backup
tar czf secrets-backup.tar.gz secrets/
gpg --encrypt secrets-backup.tar.gz
```

## Best Practices

1. ✅ **هرگز commit نکنید** - در `.gitignore` اضافه شده
2. ✅ **Permissions محدود** - فقط owner بخواند (600)
3. ✅ **Rotation منظم** - رمزها را به صورت دوره‌ای تغییر دهید
4. ✅ **Backup امن** - فقط encrypted backup
5. ✅ **Environment separation** - secrets جدا برای dev/staging/prod

