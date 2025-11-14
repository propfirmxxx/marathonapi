# استراتژی ارسال داده از Tokyo Service به RabbitMQ

## 🎯 اهداف کلیدی

1. **سرعت بالا**: انتقال سریع داده‌ها با حداقل تاخیر
2. **کارایی**: کاهش overhead و استفاده بهینه از منابع
3. **قابل اطمینان**: جلوگیری از گم شدن داده‌ها
4. **Real-time**: به‌روزرسانی‌های آنی برای WebSocket clients
5. **Scalability**: مدیریت همزمان چندین حساب MT5

---

## 📋 استراتژی ارسال داده

### 1. نوع پیام‌ها (Message Types)

#### Type 1: Full Snapshot (`type: "account"`)
**استفاده**: برای اولین بار یا به‌عنوان heartbeat

**زمان ارسال**:
- وقتی حساب اولین بار deploy می‌شود
- هر **30 ثانیه** یک‌بار به‌عنوان heartbeat
- بعد از reconnect به RabbitMQ

**محتوا**: تمام فیلدهای حساب شامل:
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
  "positions": [...],
  "orders": [...],
  "timestamp": "2025-11-14T10:30:00.000Z"
}
```

---

#### Type 2: Incremental Update (`type: "update"`)
**استفاده**: برای به‌روزرسانی‌های مکرر و سریع

**زمان ارسال**:
- هر **3-5 ثانیه** یک‌بار برای حساب‌های فعال
- فقط وقتی تغییر رخ داده باشد

**محتوا**: فقط فیلدهای تغییر کرده:
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

**مزایا**:
- حجم پیام کمتر (کاهش 70-80% حجم)
- سرعت بیشتر
- فشار کمتر روی RabbitMQ

---

#### Type 3: Position Update (`type: "positions"`)
**استفاده**: وقتی position‌ها تغییر می‌کنند

**زمان ارسال**:
- **فوری** هنگام باز/بسته شدن position
- **هر 5 ثانیه** برای به‌روزرسانی profit فعلی

**محتوا**:
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

---

#### Type 4: Order Update (`type: "orders"`)
**استفاده**: وقتی pending orders تغییر می‌کنند

**زمان ارسال**:
- **فوری** هنگام ثبت/حذف/اجرای order
- **هر 10 ثانیه** برای به‌روزرسانی current price

**محتوا**:
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

## 🚀 تنظیمات بهینه RabbitMQ

### 1. Connection Settings

```python
import pika

# بهترین تنظیمات برای connection
connection_params = pika.ConnectionParameters(
    host='rabbitmq',
    port=5672,
    credentials=pika.PlainCredentials('guest', 'guest'),
    heartbeat=30,  # هر 30 ثانیه heartbeat
    blocked_connection_timeout=300,  # 5 دقیقه timeout
    connection_attempts=5,  # 5 تلاش برای اتصال
    retry_delay=3,  # 3 ثانیه بین هر تلاش
)
```

### 2. Channel Settings

```python
channel = connection.channel()

# Queue durable برای reliability
channel.queue_declare(
    queue='socket_data',
    durable=True,
    arguments={
        'x-message-ttl': 60000,  # پیام‌ها بعد از 60 ثانیه expire می‌شوند
        'x-max-length': 10000,  # حداکثر 10000 پیام در queue
    }
)

# Confirm mode برای reliability
channel.confirm_delivery()
```

### 3. Publishing Settings

```python
# تنظیمات publish برای هر پیام
properties = pika.BasicProperties(
    delivery_mode=2,  # persistent message
    content_type='application/json',
    timestamp=int(time.time()),
)

channel.basic_publish(
    exchange='',
    routing_key='socket_data',
    body=json.dumps(message_data),
    properties=properties,
    mandatory=True  # اطمینان از delivery
)
```

---

## 📊 استراتژی Batching (برای بهینه‌سازی)

برای کاهش overhead، می‌توانید چند پیام را با `\n` جدا کنید:

```python
# ترکیب چند update در یک پیام
batch_messages = [
    {"type": "update", "login": "261632689", "equity": 10200.50, "profit": 200.50},
    {"type": "update", "login": "261632690", "equity": 9800.25, "profit": -199.75},
]

# ارسال به‌صورت batch
batch_payload = "\n".join(json.dumps(msg) for msg in batch_messages)
channel.basic_publish(
    exchange='',
    routing_key='socket_data',
    body=batch_payload,
    properties=properties
)
```

**توجه**: LiveAccountDataService در Marathon API از خط 124 این batching را پشتیبانی می‌کند:
```typescript
const segments = content.split(/\s*\n+\s*/).filter((segment) => segment.length > 0);
```

**مزایای Batching**:
- کاهش 60-70% تعداد publish calls
- کاهش overhead شبکه
- افزایش throughput

**محدودیت**:
- حداکثر 10 پیام در هر batch
- هر پیام باید کمتر از 1KB باشد
- کل batch باید کمتر از 10KB باشد

---

## ⚡ الگوریتم پیشنهادی برای Tokyo Service

```python
import asyncio
import json
import time
import pika
from typing import Dict, Any
from datetime import datetime

class MT5DataPublisher:
    def __init__(self):
        self.connection = None
        self.channel = None
        self.last_snapshot_time: Dict[str, float] = {}
        self.last_update_time: Dict[str, float] = {}
        self.last_data: Dict[str, Dict] = {}
        
        self.SNAPSHOT_INTERVAL = 30  # ثانیه
        self.UPDATE_INTERVAL = 3  # ثانیه
        self.POSITION_UPDATE_INTERVAL = 5  # ثانیه
        self.ORDER_UPDATE_INTERVAL = 10  # ثانیه
        
    def connect_rabbitmq(self):
        """اتصال به RabbitMQ با retry logic"""
        for attempt in range(5):
            try:
                self.connection = pika.BlockingConnection(
                    pika.ConnectionParameters(
                        host='rabbitmq',
                        port=5672,
                        heartbeat=30,
                        connection_attempts=5,
                        retry_delay=3,
                    )
                )
                self.channel = self.connection.channel()
                self.channel.queue_declare(
                    queue='socket_data',
                    durable=True,
                    arguments={
                        'x-message-ttl': 60000,
                        'x-max-length': 10000,
                    }
                )
                self.channel.confirm_delivery()
                print("✅ Connected to RabbitMQ successfully")
                return True
            except Exception as e:
                print(f"❌ Failed to connect to RabbitMQ (attempt {attempt + 1}): {e}")
                time.sleep(3)
        return False
    
    def publish_message(self, message_data: Dict[str, Any]) -> bool:
        """ارسال پیام با error handling"""
        try:
            body = json.dumps(message_data)
            self.channel.basic_publish(
                exchange='',
                routing_key='socket_data',
                body=body,
                properties=pika.BasicProperties(
                    delivery_mode=2,
                    content_type='application/json',
                    timestamp=int(time.time()),
                ),
                mandatory=True
            )
            return True
        except Exception as e:
            print(f"❌ Failed to publish message: {e}")
            # تلاش برای reconnect
            self.connect_rabbitmq()
            return False
    
    def should_send_snapshot(self, login: str) -> bool:
        """آیا زمان ارسال snapshot کامل است؟"""
        now = time.time()
        last_time = self.last_snapshot_time.get(login, 0)
        return (now - last_time) >= self.SNAPSHOT_INTERVAL
    
    def should_send_update(self, login: str) -> bool:
        """آیا زمان ارسال update است؟"""
        now = time.time()
        last_time = self.last_update_time.get(login, 0)
        return (now - last_time) >= self.UPDATE_INTERVAL
    
    def has_data_changed(self, login: str, new_data: Dict) -> bool:
        """آیا داده تغییر کرده است؟"""
        if login not in self.last_data:
            return True
        
        old_data = self.last_data[login]
        
        # بررسی تغییر در فیلدهای مهم
        important_fields = ['balance', 'equity', 'profit', 'margin', 'freeMargin']
        for field in important_fields:
            if new_data.get(field) != old_data.get(field):
                return True
        
        return False
    
    async def publish_account_data(self, account_info: Dict[str, Any]):
        """
        تصمیم‌گیری هوشمند برای نوع پیام
        
        Args:
            account_info: اطلاعات کامل حساب از MT5
        """
        login = str(account_info['login'])
        now = time.time()
        
        # 1. اگر اولین بار است یا زمان snapshot رسیده
        if self.should_send_snapshot(login):
            message = {
                "type": "account",
                "login": login,
                "balance": account_info['balance'],
                "equity": account_info['equity'],
                "profit": account_info['profit'],
                "margin": account_info['margin'],
                "freeMargin": account_info['free_margin'],
                "currency": account_info.get('currency', 'USD'),
                "leverage": account_info.get('leverage', 100),
                "positions": account_info.get('positions', []),
                "orders": account_info.get('orders', []),
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            
            if self.publish_message(message):
                self.last_snapshot_time[login] = now
                self.last_update_time[login] = now
                self.last_data[login] = account_info
                print(f"📸 Sent full snapshot for account {login}")
        
        # 2. اگر زمان update رسیده و داده تغییر کرده
        elif self.should_send_update(login) and self.has_data_changed(login, account_info):
            message = {
                "type": "update",
                "login": login,
                "equity": account_info['equity'],
                "profit": account_info['profit'],
                "margin": account_info['margin'],
                "freeMargin": account_info['free_margin'],
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            
            # اگر balance تغییر کرده، اضافه کن
            if account_info['balance'] != self.last_data.get(login, {}).get('balance'):
                message['balance'] = account_info['balance']
            
            if self.publish_message(message):
                self.last_update_time[login] = now
                self.last_data[login] = account_info
                print(f"🔄 Sent incremental update for account {login}")
    
    async def publish_position_update(self, login: str, positions: list):
        """ارسال به‌روزرسانی position‌ها"""
        message = {
            "type": "positions",
            "login": str(login),
            "positions": positions,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        if self.publish_message(message):
            print(f"📊 Sent position update for account {login}")
    
    async def publish_order_update(self, login: str, orders: list):
        """ارسال به‌روزرسانی orders"""
        message = {
            "type": "orders",
            "login": str(login),
            "orders": orders,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        if self.publish_message(message):
            print(f"📋 Sent order update for account {login}")
    
    async def monitor_account(self, login: str):
        """
        مانیتورینگ مداوم یک حساب MT5
        این متد باید در یک loop جدا برای هر حساب اجرا شود
        """
        while True:
            try:
                # دریافت اطلاعات از MT5
                account_info = self.get_mt5_account_info(login)
                
                if account_info:
                    await self.publish_account_data(account_info)
                
                # صبر برای interval بعدی
                await asyncio.sleep(self.UPDATE_INTERVAL)
                
            except Exception as e:
                print(f"❌ Error monitoring account {login}: {e}")
                await asyncio.sleep(5)
    
    def get_mt5_account_info(self, login: str) -> Dict:
        """
        دریافت اطلاعات حساب از MT5
        این متد باید با MetaTrader5 API پیاده‌سازی شود
        """
        # TODO: پیاده‌سازی با MT5 API
        pass

# استفاده
publisher = MT5DataPublisher()
publisher.connect_rabbitmq()

# برای هر حساب deployed، یک task جدا ایجاد کنید
async def main():
    deployed_accounts = ["261632689", "261632690"]  # لیست حساب‌های deploy شده
    
    tasks = [
        publisher.monitor_account(login)
        for login in deployed_accounts
    ]
    
    await asyncio.gather(*tasks)

# اجرا
asyncio.run(main())
```

---

## 🎯 نکات کلیدی پیاده‌سازی

### 1. Error Handling

```python
def publish_with_retry(channel, message, max_retries=3):
    """ارسال با retry در صورت خطا"""
    for attempt in range(max_retries):
        try:
            channel.basic_publish(
                exchange='',
                routing_key='socket_data',
                body=json.dumps(message),
                properties=pika.BasicProperties(delivery_mode=2),
                mandatory=True
            )
            return True
        except pika.exceptions.AMQPError as e:
            print(f"Publish failed (attempt {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # exponential backoff
    return False
```

### 2. Connection Management

```python
class RabbitMQConnection:
    """مدیریت اتصال با auto-reconnect"""
    
    def __init__(self):
        self.connection = None
        self.channel = None
        self.is_connected = False
    
    def ensure_connected(self):
        """اطمینان از اتصال فعال"""
        if not self.is_connected or not self.connection or self.connection.is_closed:
            self.connect()
    
    def connect(self):
        """اتصال با retry logic"""
        # پیاده‌سازی...
        pass
```

### 3. Monitoring & Logging

```python
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('MT5Publisher')

# در هر publish
logger.info(f"Published {message_type} for account {login}")
logger.debug(f"Message size: {len(json.dumps(message))} bytes")
```

---

## 📈 معیارهای Performance

### حجم داده پیش‌بینی شده:

- **Full Snapshot**: ~500-1000 bytes
- **Incremental Update**: ~100-200 bytes
- **Position Update**: ~300-500 bytes (بسته به تعداد positions)

### فرکانس ارسال (برای هر حساب):

- Full Snapshot: هر 30 ثانیه = **2 پیام/دقیقه**
- Incremental Update: هر 3-5 ثانیه = **12-20 پیام/دقیقه**
- Position Updates: متغیر = **0-12 پیام/دقیقه**

### مجموع برای 100 حساب:

- **پیام‌ها**: ~1400-3200 پیام/دقیقه
- **حجم داده**: ~280-640 KB/دقیقه
- **پهنای باند**: ~4.5-10 KB/ثانیه

این تنظیمات برای **تا 500 حساب همزمان** مناسب است.

---

## 🔧 تنظیمات RabbitMQ Server

در `rabbitmq.conf`:

```conf
# افزایش memory limit
vm_memory_high_watermark.relative = 0.6

# تنظیمات disk
disk_free_limit.absolute = 2GB

# افزایش max connections
channel_max = 2048

# افزایش frame size
frame_max = 131072

# تنظیمات heartbeat
heartbeat = 30
```

---

## ✅ Checklist پیاده‌سازی

- [ ] پیاده‌سازی connection با retry logic
- [ ] پیاده‌سازی 4 نوع پیام (account, update, positions, orders)
- [ ] اضافه کردن timestamp به همه پیام‌ها
- [ ] تبدیل login به string
- [ ] تنظیم interval‌های مناسب
- [ ] پیاده‌سازی error handling
- [ ] اضافه کردن logging
- [ ] تست با یک حساب
- [ ] تست با چند حساب همزمان
- [ ] مانیتور کردن RabbitMQ queue از UI
- [ ] تست با WebSocket client در Marathon API

---

## 🐛 Debugging

### بررسی اتصال:

```bash
# وضعیت RabbitMQ
docker-compose ps rabbitmq

# لاگ‌های RabbitMQ
docker-compose logs -f rabbitmq

# دسترسی به Management UI
# http://localhost:15672
# username: guest, password: guest
```

### بررسی Queue:

در RabbitMQ Management UI:
1. رفتن به "Queues" tab
2. انتخاب `socket_data` queue
3. بررسی "Ready" و "Total" messages
4. استفاده از "Get messages" برای مشاهده محتوا

### تست دستی:

```python
# تست ارسال یک پیام
import pika
import json

connection = pika.BlockingConnection(
    pika.URLParameters('amqp://guest:guest@localhost:5672/')
)
channel = connection.channel()

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

channel.basic_publish(
    exchange='',
    routing_key='socket_data',
    body=json.dumps(test_message)
)

print("✅ Test message published")
connection.close()
```

---

## 📞 پشتیبانی

در صورت مشکل:
1. بررسی لاگ‌های Tokyo Service
2. بررسی RabbitMQ Management UI
3. بررسی لاگ‌های Marathon API
4. تست با WebSocket client

**مستندات مرتبط**:
- [TOKYO_SERVICE_DATA_FORMAT.md](./TOKYO_SERVICE_DATA_FORMAT.md)
- [WEBSOCKET.md](./WEBSOCKET.md)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)

