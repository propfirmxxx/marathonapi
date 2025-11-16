# پرامپت ارسال داده از Tokyo Service به RabbitMQ

## دستورالعمل سریع

### 📡 اطلاعات اتصال

```python
RABBITMQ_URL = "amqp://guest:guest@rabbitmq:5672/"
RABBITMQ_QUEUE = "socket_data"
```

### 🎯 قوانین طلایی

1. **همیشه `login` را به‌صورت STRING ارسال کنید** ❌ `123456` ✅ `"123456"`
2. **همیشه `timestamp` اضافه کنید** در فرمت ISO 8601
3. **فیلدهای عددی را به‌صورت NUMBER ارسال کنید** (نه string)
4. **از batching استفاده کنید** برای ارسال چند پیام (با `\n` جدا کنید)

---

## 📋 4 نوع پیام

### 1️⃣ Full Snapshot - هر 30 ثانیه

```json
{
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
  "orders": [],
  "timestamp": "2025-11-14T10:30:00.000Z"
}
```

### 2️⃣ Quick Update - هر 3-5 ثانیه (فقط اگر تغییر کرده)

```json
{
  "type": "update",
  "login": "261632689",
  "equity": 10200.50,
  "profit": 200.50,
  "freeMargin": 9700.50,
  "timestamp": "2025-11-14T10:30:05.000Z"
}
```

### 3️⃣ Position Change - فوری وقتی position باز/بسته می‌شود

```json
{
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
  ],
  "timestamp": "2025-11-14T10:30:05.500Z"
}
```

### 4️⃣ Order Change - فوری وقتی order ثبت/حذف می‌شود

```json
{
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
  ],
  "timestamp": "2025-11-14T10:30:06.000Z"
}
```

---

## 💻 کد Python - کپی و استفاده کنید

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
        """ارسال یک پیام"""
        message['timestamp'] = datetime.utcnow().isoformat() + 'Z'
        message['login'] = str(message['login'])  # مهم: تبدیل به string
        
        self.channel.basic_publish(
            exchange='',
            routing_key='socket_data',
            body=json.dumps(message),
            properties=pika.BasicProperties(
                delivery_mode=2,  # persistent
                content_type='application/json'
            ),
            mandatory=True
        )
    
    def publish_batch(self, messages):
        """ارسال چند پیام یکجا (بهتر)"""
        for msg in messages:
            msg['timestamp'] = datetime.utcnow().isoformat() + 'Z'
            msg['login'] = str(msg['login'])
        
        # ترکیب پیام‌ها با \n
        batch = '\n'.join(json.dumps(m) for m in messages)
        
        self.channel.basic_publish(
            exchange='',
            routing_key='socket_data',
            body=batch,
            properties=pika.BasicProperties(
                delivery_mode=2,
                content_type='application/json'
            ),
            mandatory=True
        )

# استفاده:
publisher = RabbitMQPublisher()

# ارسال snapshot
publisher.publish({
    "type": "account",
    "login": "261632689",
    "balance": 10000.00,
    "equity": 10000.00,
    "profit": 0.00,
    "margin": 0.00,
    "freeMargin": 10000.00,
    "currency": "USD",
    "leverage": 100,
    "positions": [],
    "orders": []
})

# یا ارسال چند update یکجا (بهتر برای performance)
publisher.publish_batch([
    {"type": "update", "login": "261632689", "equity": 10050, "profit": 50},
    {"type": "update", "login": "261632690", "equity": 9950, "profit": -50}
])
```

---

## ⏰ جدول زمانبندی ارسال

| نوع پیام | فرکانس | شرط |
|----------|---------|------|
| `account` (full snapshot) | هر 30 ثانیه | همیشه |
| `update` (incremental) | هر 3-5 ثانیه | فقط اگر تغییر کرده |
| `positions` | فوری + هر 5 ثانیه | وقتی position باز/بسته شود یا profit تغییر کند |
| `orders` | فوری + هر 10 ثانیه | وقتی order ثبت/حذف شود |

---

## ✅ چک‌لیست قبل از Deploy

1. - [ ] login به‌صورت string است؟ `str(login)`
2. - [ ] timestamp اضافه شده؟ `datetime.utcnow().isoformat() + 'Z'`
3. - [ ] فیلدهای عددی number هستند؟ (نه string)
4. - [ ] queue با نام `socket_data` ساخته شده؟
5. - [ ] connection به `rabbitmq:5672` موفق است؟
6. - [ ] error handling اضافه شده؟

---

## 🧪 تست سریع

```python
# تست ارسال
import pika
import json

conn = pika.BlockingConnection(pika.URLParameters('amqp://guest:guest@rabbitmq:5672/'))
ch = conn.channel()

ch.basic_publish(
    exchange='',
    routing_key='socket_data',
    body=json.dumps({
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
    })
)

print("✅ Test message sent!")
conn.close()
```

بعد بررسی کنید در Marathon API لاگ ببینید:
```
[LiveAccountDataService] Connected to RabbitMQ queue "socket_data"
```

---

## 🐛 مشکلات متداول

### ❌ `login` number است
```python
# اشتباه
{"login": 261632689}

# درست
{"login": "261632689"}
```

### ❌ timestamp ندارد
```python
# همیشه اضافه کنید
from datetime import datetime
message['timestamp'] = datetime.utcnow().isoformat() + 'Z'
```

### ❌ اتصال برقرار نمی‌شود
```bash
# بررسی RabbitMQ
docker-compose ps rabbitmq

# اگر running نبود
docker-compose up -d rabbitmq
```

### ❌ پیام‌ها مصرف نمی‌شوند
```bash
# بررسی Marathon API logs
docker-compose logs -f marathon-api | grep RabbitMQ

# باید ببینید:
# [LiveAccountDataService] Connected to RabbitMQ queue "socket_data"
```

---

## 📊 مانیتورینگ

**RabbitMQ Management UI**: http://localhost:15672  
**Username**: guest  
**Password**: guest

در UI:
1. به "Queues" بروید
2. `socket_data` را انتخاب کنید
3. "Get messages" را بزنید تا پیام‌ها را ببینید

---

## 📚 مستندات کامل

برای جزئیات بیشتر:
- [TOKYO_SERVICE_RABBITMQ_STRATEGY.md](./TOKYO_SERVICE_RABBITMQ_STRATEGY.md) - استراتژی کامل
- [TOKYO_SERVICE_DATA_FORMAT.md](./TOKYO_SERVICE_DATA_FORMAT.md) - فرمت داده‌ها
- [WEBSOCKET.md](./WEBSOCKET.md) - WebSocket API

---

## 🎯 خلاصه کلیدی

```
✅ استفاده از "update" برای سرعت بیشتر
✅ استفاده از batching برای کاهش overhead
✅ همیشه login به‌صورت string
✅ همیشه timestamp اضافه کنید
✅ فقط وقتی تغییر کرده ارسال کنید (در update)
```

**سوالی هست؟** تیم توسعه Marathon API آماده کمک است! 🚀


