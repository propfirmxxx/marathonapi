# راهنمای پیاده‌سازی RabbitMQ برای سرویس Tokyo - فارسی

## 🎯 هدف

ارسال بهینه داده‌های حساب‌های MetaTrader از سرویس Tokyo به Marathon API از طریق RabbitMQ

---

## 📋 خلاصه اجرایی

### چرا تغییر دادیم؟

**قبلاً**:
- ارسال کل اطلاعات حساب هر 3-5 ثانیه
- حجم بالای داده (1000 بایت × 20 بار در دقیقه = 20KB/دقیقه)
- فشار زیاد روی RabbitMQ و شبکه

**حالا**:
- ارسال هوشمند: فقط تغییرات مهم ارسال می‌شود
- حجم کم داده (200 بایت × 18 بار + 1000 بایت × 2 بار = 5.6KB/دقیقه)
- **کاهش 72% حجم داده**
- پشتیبانی از 500+ حساب همزمان

---

## 🚀 پیاده‌سازی سریع

### گام 1: نصب کتابخانه

```bash
pip install pika
```

### گام 2: کپی کردن کد زیر

```python
import pika
import json
from datetime import datetime

class RabbitMQPublisher:
    def __init__(self):
        self.connection = pika.BlockingConnection(
            pika.URLParameters('amqp://guest:guest@rabbitmq:5672/')
        )
        self.channel = self.connection.channel()
        self.channel.queue_declare(queue='socket_data', durable=True)
        self.channel.confirm_delivery()
    
    def publish(self, message):
        """ارسال یک پیام به RabbitMQ"""
        # اضافه کردن timestamp
        message['timestamp'] = datetime.utcnow().isoformat() + 'Z'
        
        # تبدیل login به string (خیلی مهم!)
        message['login'] = str(message['login'])
        
        # ارسال
        self.channel.basic_publish(
            exchange='',
            routing_key='socket_data',
            body=json.dumps(message),
            properties=pika.BasicProperties(
                delivery_mode=2,  # پیام ماندگار
                content_type='application/json'
            ),
            mandatory=True
        )
        
        return True

# استفاده
publisher = RabbitMQPublisher()

# مثال: ارسال اطلاعات کامل حساب
publisher.publish({
    "type": "account",
    "login": "261632689",
    "balance": 10000.00,
    "equity": 10150.25,
    "profit": 150.25,
    "margin": 500.00,
    "freeMargin": 9650.25,
    "currency": "USD",
    "leverage": 100,
    "positions": [],
    "orders": []
})

print("✅ پیام ارسال شد!")
```

---

## 📨 4 نوع پیام

### 1. اطلاعات کامل (`type: "account"`)
**زمان ارسال**: هر 30 ثانیه یک‌بار

```python
message = {
    "type": "account",
    "login": "261632689",
    "balance": 10000.00,
    "equity": 10150.25,
    "profit": 150.25,
    "margin": 500.00,
    "freeMargin": 9650.25,
    "currency": "USD",
    "leverage": 100,
    "positions": [],
    "orders": []
}
publisher.publish(message)
```

---

### 2. به‌روزرسانی سریع (`type: "update"`)
**زمان ارسال**: هر 3-5 ثانیه (فقط اگر تغییر کرده باشد)

```python
message = {
    "type": "update",
    "login": "261632689",
    "equity": 10200.50,
    "profit": 200.50,
    "freeMargin": 9700.50
}
publisher.publish(message)
```

💡 **نکته**: فقط فیلدهایی که تغییر کرده‌اند را ارسال کنید!

---

### 3. تغییر موقعیت‌ها (`type: "positions"`)
**زمان ارسال**: فوراً وقتی position باز/بسته می‌شود

```python
message = {
    "type": "positions",
    "login": "261632689",
    "positions": [
        {
            "ticket": 123456789,
            "symbol": "EURUSD",
            "type": "BUY",
            "volume": 0.1,
            "openPrice": 1.10000,
            "currentPrice": 1.10500,
            "profit": 50.00,
            "swap": -1.20,
            "commission": 0.00,
            "openTime": "2025-11-14T08:00:00.000Z"
        }
    ]
}
publisher.publish(message)
```

---

### 4. تغییر سفارش‌ها (`type: "orders"`)
**زمان ارسال**: فوراً وقتی order ثبت/حذف می‌شود

```python
message = {
    "type": "orders",
    "login": "261632689",
    "orders": [
        {
            "ticket": 987654321,
            "symbol": "GBPUSD",
            "type": "BUY_LIMIT",
            "volume": 0.05,
            "price": 1.25000,
            "currentPrice": 1.25500,
            "time": "2025-11-14T09:00:00.000Z"
        }
    ]
}
publisher.publish(message)
```

---

## ⏰ جدول زمانبندی ارسال

| نوع پیام | چه زمانی ارسال شود؟ | چند بار در دقیقه؟ |
|----------|---------------------|-------------------|
| `account` | هر 30 ثانیه | 2 بار |
| `update` | هر 3-5 ثانیه (فقط اگر تغییر کرده) | 12-20 بار |
| `positions` | فوری + هر 5 ثانیه | 0-12 بار |
| `orders` | فوری + هر 10 ثانیه | 0-6 بار |

---

## ✅ چک‌لیست قبل از اجرا

### قبل از deploy حتماً چک کنید:

- [ ] آیا `login` به‌صورت **string** است؟ (نه number!)
  ```python
  # ❌ اشتباه
  {"login": 261632689}
  
  # ✅ درست
  {"login": "261632689"}
  ```

- [ ] آیا `timestamp` اضافه شده است؟
  ```python
  from datetime import datetime
  message['timestamp'] = datetime.utcnow().isoformat() + 'Z'
  ```

- [ ] آیا فیلدهای عددی به‌صورت **number** هستند؟ (نه string!)
  ```python
  # ✅ درست
  {"balance": 10000.00, "equity": 10150.25}
  
  # ❌ اشتباه
  {"balance": "10000.00", "equity": "10150.25"}
  ```

- [ ] آیا اتصال به RabbitMQ موفق است؟
  ```bash
  docker-compose ps rabbitmq
  # باید running باشد
  ```

- [ ] آیا queue با نام `socket_data` ساخته شده است؟

---

## 🧪 تست سریع

### 1. تست ارسال پیام

```python
import pika
import json

# اتصال
conn = pika.BlockingConnection(
    pika.URLParameters('amqp://guest:guest@rabbitmq:5672/')
)
ch = conn.channel()

# ارسال پیام تست
test_message = {
    "type": "account",
    "login": "261632689",
    "balance": 10000,
    "equity": 10000,
    "profit": 0,
    "margin": 0,
    "freeMargin": 10000,
    "currency": "USD",
    "leverage": 100,
    "positions": [],
    "orders": []
}

ch.basic_publish(
    exchange='',
    routing_key='socket_data',
    body=json.dumps(test_message)
)

print("✅ پیام تست ارسال شد!")
conn.close()
```

### 2. بررسی دریافت در Marathon API

```bash
# لاگ‌های Marathon API را ببینید
docker-compose logs -f marathon-api | grep RabbitMQ

# باید ببینید:
# [LiveAccountDataService] Connected to RabbitMQ queue "socket_data"
# [LiveAccountDataService] Processed ... messages
```

### 3. بررسی وضعیت در WebUI

**آدرس**: http://localhost:15672  
**نام کاربری**: guest  
**رمز عبور**: guest

مراحل:
1. به صفحه "Queues" بروید
2. `socket_data` را پیدا کنید
3. "Get messages" را بزنید
4. پیام‌های ارسالی را ببینید

---

## 🔥 مشکلات رایج و راه‌حل

### ❌ مشکل: پیام‌ها ارسال نمی‌شوند

**راه‌حل**:
```bash
# بررسی کنید RabbitMQ در حال اجراست
docker-compose ps rabbitmq

# اگر running نبود
docker-compose up -d rabbitmq

# لاگ‌ها را ببینید
docker-compose logs -f rabbitmq
```

---

### ❌ مشکل: Marathon API پیام‌ها را دریافت نمی‌کند

**راه‌حل**:
```bash
# 1. بررسی لاگ‌های Marathon API
docker-compose logs -f marathon-api

# 2. بررسی health endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/apiv1/marathons/rabbitmq-health

# باید connected: true باشد
```

---

### ❌ مشکل: خطای "login is not a string"

**راه‌حل**:
```python
# همیشه login را به string تبدیل کنید
message['login'] = str(account.login)
```

---

### ❌ مشکل: خطای "Invalid payload"

**راه‌حل**:
```python
# اطمینان حاصل کنید که:
# 1. type وجود دارد
# 2. login وجود دارد
# 3. حداقل یکی از balance/equity/profit موجود و number است

message = {
    "type": "account",  # ✅
    "login": "261632689",  # ✅ string
    "balance": 10000.00,  # ✅ number
    # ...
}
```

---

## 📊 بهینه‌سازی برای چند حساب

### استفاده از Batching

اگر چند حساب دارید، می‌توانید پیام‌ها را دسته‌بندی کنید:

```python
def publish_batch(messages):
    """ارسال چند پیام یکجا"""
    for msg in messages:
        msg['timestamp'] = datetime.utcnow().isoformat() + 'Z'
        msg['login'] = str(msg['login'])
    
    # ترکیب پیام‌ها با \n
    batch = '\n'.join(json.dumps(m) for m in messages)
    
    channel.basic_publish(
        exchange='',
        routing_key='socket_data',
        body=batch,
        properties=pika.BasicProperties(delivery_mode=2),
        mandatory=True
    )

# استفاده
messages = [
    {"type": "update", "login": "261632689", "equity": 10050, "profit": 50},
    {"type": "update", "login": "261632690", "equity": 9950, "profit": -50}
]
publish_batch(messages)
```

**مزایا**:
- کاهش 60-70% تعداد network calls
- سرعت بیشتر
- فشار کمتر روی RabbitMQ

**محدودیت**:
- حداکثر 10 پیام در هر batch

---

## 📚 مستندات کامل

برای اطلاعات بیشتر:

- **پرامپت سریع (انگلیسی)**: `docs/TOKYO_SERVICE_PROMPT.md`
- **استراتژی کامل**: `docs/TOKYO_SERVICE_RABBITMQ_STRATEGY.md`
- **فرمت داده**: `docs/TOKYO_SERVICE_DATA_FORMAT.md`
- **خلاصه بهینه‌سازی**: `docs/RABBITMQ_OPTIMIZATION_SUMMARY.md`

---

## 🎓 آموزش گام‌به‌گام

### مثال کامل: مانیتورینگ یک حساب

```python
import pika
import json
import time
from datetime import datetime

class AccountMonitor:
    def __init__(self, login):
        self.login = str(login)
        self.last_snapshot_time = 0
        self.last_update_time = 0
        self.last_data = {}
        
        # اتصال به RabbitMQ
        self.connection = pika.BlockingConnection(
            pika.URLParameters('amqp://guest:guest@rabbitmq:5672/')
        )
        self.channel = self.connection.channel()
        self.channel.queue_declare(queue='socket_data', durable=True)
        self.channel.confirm_delivery()
    
    def get_account_data_from_mt5(self):
        """دریافت داده از MT5 - شما باید این را پیاده‌سازی کنید"""
        # TODO: دریافت اطلاعات واقعی از MT5
        return {
            'login': self.login,
            'balance': 10000.00,
            'equity': 10150.25,
            'profit': 150.25,
            'margin': 500.00,
            'free_margin': 9650.25,
            'currency': 'USD',
            'leverage': 100,
            'positions': [],
            'orders': []
        }
    
    def should_send_snapshot(self):
        """آیا زمان ارسال snapshot کامل است؟"""
        now = time.time()
        return (now - self.last_snapshot_time) >= 30
    
    def should_send_update(self):
        """آیا زمان ارسال update است؟"""
        now = time.time()
        return (now - self.last_update_time) >= 5
    
    def has_changed(self, new_data):
        """آیا داده تغییر کرده است؟"""
        if not self.last_data:
            return True
        
        return (
            new_data['balance'] != self.last_data.get('balance') or
            new_data['equity'] != self.last_data.get('equity') or
            new_data['profit'] != self.last_data.get('profit')
        )
    
    def publish(self, message):
        """ارسال پیام"""
        message['timestamp'] = datetime.utcnow().isoformat() + 'Z'
        message['login'] = self.login
        
        self.channel.basic_publish(
            exchange='',
            routing_key='socket_data',
            body=json.dumps(message),
            properties=pika.BasicProperties(delivery_mode=2),
            mandatory=True
        )
    
    def monitor(self):
        """مانیتورینگ مداوم"""
        print(f"🚀 شروع مانیتورینگ حساب {self.login}")
        
        while True:
            try:
                # دریافت داده از MT5
                account_data = self.get_account_data_from_mt5()
                now = time.time()
                
                # اگر زمان snapshot رسیده
                if self.should_send_snapshot():
                    message = {
                        "type": "account",
                        "login": self.login,
                        "balance": account_data['balance'],
                        "equity": account_data['equity'],
                        "profit": account_data['profit'],
                        "margin": account_data['margin'],
                        "freeMargin": account_data['free_margin'],
                        "currency": account_data['currency'],
                        "leverage": account_data['leverage'],
                        "positions": account_data['positions'],
                        "orders": account_data['orders']
                    }
                    
                    self.publish(message)
                    self.last_snapshot_time = now
                    self.last_update_time = now
                    self.last_data = account_data
                    print(f"📸 ارسال snapshot کامل برای {self.login}")
                
                # اگر زمان update رسیده و داده تغییر کرده
                elif self.should_send_update() and self.has_changed(account_data):
                    message = {
                        "type": "update",
                        "login": self.login,
                        "equity": account_data['equity'],
                        "profit": account_data['profit'],
                        "freeMargin": account_data['free_margin']
                    }
                    
                    # اگر balance تغییر کرده، اضافه کن
                    if account_data['balance'] != self.last_data.get('balance'):
                        message['balance'] = account_data['balance']
                    
                    self.publish(message)
                    self.last_update_time = now
                    self.last_data = account_data
                    print(f"🔄 ارسال update برای {self.login}")
                
                # صبر کن
                time.sleep(3)
                
            except Exception as e:
                print(f"❌ خطا: {e}")
                time.sleep(5)

# استفاده
monitor = AccountMonitor("261632689")
monitor.monitor()
```

---

## ✨ نکات طلایی

1. **همیشه `login` را string کنید**: `str(login)`
2. **همیشه `timestamp` اضافه کنید**: `datetime.utcnow().isoformat() + 'Z'`
3. **فقط تغییرات را ارسال کنید**: در `update` فقط فیلدهای تغییر یافته
4. **از batching استفاده کنید**: برای چند حساب
5. **error handling داشته باشید**: برای مشکلات شبکه
6. **لاگ بگذارید**: برای debugging

---

## 📞 نیاز به کمک؟

- بررسی health: `GET /apiv1/marathons/rabbitmq-health`
- لاگ‌های Marathon API: `docker-compose logs -f marathon-api`
- لاگ‌های RabbitMQ: `docker-compose logs -f rabbitmq`
- RabbitMQ UI: http://localhost:15672

---

**موفق باشید! 🚀**

در صورت بروز مشکل، با تیم توسعه Marathon API تماس بگیرید.

