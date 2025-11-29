# راهنمای تنظیم SSL برای trademarathon.com

این راهنما نحوه دریافت و تنظیم SSL certificate از Let's Encrypt را برای دامنه `trademarathon.com` و تمام subdomain ها توضیح می‌دهد.

## پیش‌نیازها

1. دامنه `trademarathon.com` باید به IP سرور شما اشاره کند
2. پورت 80 باید از اینترنت قابل دسترسی باشد (برای HTTP challenge)
3. Docker و Docker Compose نصب شده باشند
4. دسترسی root یا sudo

## روش 1: Single Domain Certificate (ساده‌تر)

این روش برای `trademarathon.com` و `www.trademarathon.com` certificate می‌گیرد.

### مراحل:

1. **اجرای اسکریپت:**
```bash
cd /opt/marathonapi/deploy
sudo chmod +x scripts/setup-ssl.sh
sudo ./scripts/setup-ssl.sh
```

2. **انتخاب گزینه 1** (Single domain certificate)

3. اسکریپت به صورت خودکار:
   - nginx را راه‌اندازی می‌کند
   - Certificate را از Let's Encrypt دریافت می‌کند
   - Certificate ها را در `./letsencrypt/conf/live/trademarathon.com/` ذخیره می‌کند

4. **فعال‌سازی HTTPS در nginx:**
   - فایل `nginx/nginx.conf` را باز کنید
   - Server block مربوط به HTTPS (خطوط 124-245) را uncomment کنید
   - Server block مربوط به HTTP redirect (خطوط 53-60) را uncomment کنید
   - Server block HTTP فعلی (خطوط 65-122) را comment کنید

5. **راه‌اندازی مجدد nginx:**
```bash
docker compose restart nginx
```

## روش 2: Wildcard Certificate (برای همه subdomain ها)

این روش برای `*.trademarathon.com` و `trademarathon.com` certificate می‌گیرد.

### مراحل:

1. **اجرای اسکریپت:**
```bash
cd /opt/marathonapi/deploy
sudo chmod +x scripts/setup-ssl.sh
sudo ./scripts/setup-ssl.sh
```

2. **انتخاب گزینه 2** (Wildcard certificate)

3. **DNS Challenge:**
   - اسکریپت یک TXT record به شما می‌دهد
   - این TXT record را در DNS provider خود اضافه کنید:
     - Name: `_acme-challenge.trademarathon.com`
     - Type: `TXT`
     - Value: (مقداری که اسکریپت نمایش می‌دهد)
   - بعد از اضافه کردن، Enter را بزنید

4. **فعال‌سازی HTTPS** (همانند روش 1)

## تمدید خودکار Certificate

Let's Encrypt certificates هر 90 روز منقضی می‌شوند. برای تمدید:

### تمدید دستی:
```bash
cd /opt/marathonapi/deploy
sudo chmod +x scripts/renew-ssl.sh
sudo ./scripts/renew-ssl.sh
```

### تمدید خودکار با Cron:

یک cron job اضافه کنید:
```bash
sudo crontab -e
```

این خط را اضافه کنید (هر هفته یکبار بررسی می‌کند):
```cron
0 3 * * 0 cd /opt/marathonapi/deploy && ./scripts/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1
```

## بررسی Certificate

برای بررسی وضعیت certificate:
```bash
docker run --rm \
  -v $(pwd)/letsencrypt/conf:/etc/letsencrypt \
  certbot/certbot certificates
```

## عیب‌یابی

### خطا: "Failed to obtain certificate"
- مطمئن شوید پورت 80 از اینترنت قابل دسترسی است
- بررسی کنید DNS به درستی تنظیم شده است
- لاگ‌ها را بررسی کنید: `./letsencrypt/logs/letsencrypt.log`

### خطا: "Connection refused"
- بررسی کنید nginx در حال اجرا است: `docker compose ps nginx`
- بررسی کنید پورت 80 باز است: `sudo netstat -tulpn | grep 80`

### Certificate منقضی شده
- اجرای اسکریپت renew: `sudo ./scripts/renew-ssl.sh`
- یا اجرای مجدد setup: `sudo ./scripts/setup-ssl.sh`

## ساختار فایل‌ها

```
deploy/
├── letsencrypt/
│   ├── conf/
│   │   └── live/
│   │       └── trademarathon.com/
│   │           ├── fullchain.pem    # Certificate + chain
│   │           ├── privkey.pem       # Private key
│   │           └── chain.pem         # Certificate chain
│   ├── www/                          # Webroot for HTTP challenge
│   └── logs/                         # Let's Encrypt logs
└── scripts/
    ├── setup-ssl.sh                  # Setup script
    └── renew-ssl.sh                  # Renewal script
```

## نکات امنیتی

1. **Permissions:** Certificate ها با permission مناسب ذخیره می‌شوند
2. **Backup:** Certificate ها را به صورت منظم backup کنید
3. **Monitoring:** از cron job برای تمدید خودکار استفاده کنید

## پشتیبانی

در صورت بروز مشکل:
1. لاگ‌های nginx: `docker compose logs nginx`
2. لاگ‌های certbot: `./letsencrypt/logs/letsencrypt.log`
3. بررسی وضعیت services: `docker compose ps`

