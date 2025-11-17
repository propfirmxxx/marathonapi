# WebSocket Smart Subscription System

## 🎯 Overview

سیستم **Smart Subscription** برای کاهش بار RabbitMQ و بهینه‌سازی منابع طراحی شده است.

### مشکل قبلی:
❌ همیشه از RabbitMQ listen می‌کرد، حتی بدون کلاینت  
❌ اتلاف منابع برای marathonهای بدون subscriber  
❌ بار اضافی روی RabbitMQ  

### راه‌حل فعلی:
✅ فقط وقتی کلاینت subscribe کرد، از RabbitMQ listen می‌کنه  
✅ Reference counting برای هر marathon  
✅ Auto-cleanup وقتی آخرین کلاینت disconnect میشه  

---

## 🔄 جریان کار

### سناریو 1: اولین کلاینت Subscribe می‌کنه

```
Client 1 connects → WebSocket
    ↓
Client 1 subscribes to Marathon A
    ↓
Gateway: marathonSubscriptionCount[A] = 0 → 1
    ↓
📡 Gateway subscribes to RabbitMQ for Marathon A
    ↓
🎧 Gateway starts listening to RabbitMQ updates (EventEmitter)
    ↓
✅ Live data flows: RabbitMQ → Gateway → Client 1
```

### سناریو 2: کلاینت دوم به همون Marathon Subscribe می‌کنه

```
Client 2 connects → WebSocket
    ↓
Client 2 subscribes to Marathon A
    ↓
Gateway: marathonSubscriptionCount[A] = 1 → 2
    ↓
✅ No new RabbitMQ subscription (already subscribed)
    ↓
✅ Live data flows: RabbitMQ → Gateway → Client 1 & 2
```

### سناریو 3: یک کلاینت Disconnect می‌شه

```
Client 1 disconnects
    ↓
Gateway: marathonSubscriptionCount[A] = 2 → 1
    ↓
✅ Still has subscribers, keep RabbitMQ subscription
    ↓
✅ Live data flows: RabbitMQ → Gateway → Client 2
```

### سناریو 4: آخرین کلاینت Disconnect می‌شه

```
Client 2 disconnects
    ↓
Gateway: marathonSubscriptionCount[A] = 1 → 0
    ↓
📴 Gateway unsubscribes from RabbitMQ for Marathon A
    ↓
marathonSubscriptionCount.size === 0?
    ↓ YES
🔇 Gateway stops listening to RabbitMQ updates
    ↓
✅ No resource consumption
```

---

## 📊 Architecture

```
┌──────────────────────────────────────────┐
│   MarathonLiveDataGateway                │
├──────────────────────────────────────────┤
│                                          │
│  clientSubscriptions: Map                │
│  └─> client1 → {                        │
│       marathons: [A, B],                 │
│       accounts: [123],                   │
│       participants: [p1, p2]             │
│     }                                    │
│                                          │
│  marathonSubscriptionCount: Map          │
│  └─> Marathon A → 2 clients            │
│  └─> Marathon B → 1 client             │
│                                          │
│  participantSubscriptionCount: Map       │
│  └─> Participant p1 → 2 clients        │
│  └─> Participant p2 → 1 client         │
│                                          │
│  isListeningToUpdates: boolean           │
│  accountUpdateHandler: Function          │
│                                          │
└──────────────────────────────────────────┘
         │                        │
         │ (when count > 0)      │ (when count = 0)
         ▼                        ▼
    Subscribe to RabbitMQ    Unsubscribe from RabbitMQ
```

---

## 💻 Implementation Details

### 1. Reference Counting

```typescript
private marathonSubscriptionCount = new Map<string, number>();

// When client subscribes:
marathonSubscriptionCount[marathonId] = (current || 0) + 1

// When client unsubscribes:
marathonSubscriptionCount[marathonId] = current - 1
if (count === 0) {
  delete marathonSubscriptionCount[marathonId]
  unsubscribeFromRabbitMQ(marathonId)
}
```

### 2. EventEmitter Lifecycle

```typescript
// Start listening (first subscription)
private startListeningToUpdates() {
  this.accountUpdateHandler = (snapshot) => {
    this.handleAccountUpdate(snapshot);
  };
  this.liveAccountDataService.onAccountUpdate(this.accountUpdateHandler);
  this.isListeningToUpdates = true;
}

// Stop listening (no more subscriptions)
private stopListeningToUpdates() {
  this.liveAccountDataService.removeAccountUpdateListener(this.accountUpdateHandler);
  this.accountUpdateHandler = null;
  this.isListeningToUpdates = false;
}
```

### 3. RabbitMQ Queue Management

```typescript
// Subscribe to marathon queue
if (currentCount === 0) {
  await this.liveAccountDataService.subscribeToMarathon(marathonId);
  // Creates: marathon_{marathonId}_live queue
  // Binds: marathon.{marathonId}.# → queue
}

// Unsubscribe from marathon queue
if (newCount === 0) {
  await this.liveAccountDataService.unsubscribeFromMarathon(marathonId);
  // Cancels consumer
  // Queue remains but no active consumer
}
```

---

## 🔍 Monitoring

### Check Subscription Stats

```bash
# Admin endpoint
GET /apiv1/marathons/websocket-stats
Authorization: Bearer <admin-token>

Response:
{
  "connectedClients": 5,
  "activeMarathons": 3,
  "activeParticipants": 2,
  "isListeningToRabbitMQ": true,
  "marathonSubscriptions": [
    { "marathonId": "uuid-123", "subscribers": 3 },
    { "marathonId": "uuid-456", "subscribers": 1 },
    { "marathonId": "uuid-789", "subscribers": 1 }
  ],
  "participantSubscriptions": [
    { "participantId": "participant-abc", "subscribers": 2 },
    { "participantId": "participant-def", "subscribers": 1 }
  ]
}
```

### Logs

```bash
# Watch logs
docker logs -f marathonapi-marathon-api-1 | grep -E "(🎧|🔇|📡|📴)"

# Examples:
🎧 Started listening to RabbitMQ updates
📡 Subscribed to RabbitMQ for marathon uuid-123 (1 subscriber)
📡 Subscribed to RabbitMQ for marathon uuid-456 (1 subscriber)
📴 Unsubscribed from RabbitMQ for marathon uuid-123 (0 subscribers)
🔇 Stopped listening to RabbitMQ updates (no active subscriptions)
```

---

## 📈 Performance Benefits

### Scenario: 10 Marathons, 0-5 Active Viewers Each

| Metric | Before (Always Listen) | After (Smart Subscription) |
|--------|----------------------|---------------------------|
| RabbitMQ Consumers | 10 (all marathons) | 0-5 (only active) |
| EventEmitter Listeners | 1 (always) | 0-1 (on-demand) |
| Message Processing | All messages | Only subscribed |
| Memory Usage | High | Low (proportional) |
| CPU Usage | Constant | Variable (efficient) |

### Example:
- **10 marathons**, **3 active** (with viewers)
- **Before:** 10 RabbitMQ consumers processing all messages
- **After:** 3 RabbitMQ consumers, 7 inactive = **70% reduction**

### Subscription Types:

```
Client can subscribe to:
├── Marathon (full leaderboard)
├── Account (specific trading account)
└── Participant (specific marathon participant) ✨ NEW
```

---

## 🧪 Testing

### Test 1: Single Client Subscribe/Unsubscribe

```javascript
// Connect
const socket = io('http://localhost:3000/marathon-live', {
  query: { token: 'your-jwt-token' }
});

// Subscribe
socket.emit('subscribe_marathon', { marathonId: 'test-uuid' });

// Check stats (should show 1 client, 1 marathon)
// curl http://localhost:3000/apiv1/marathons/websocket-stats

// Unsubscribe
socket.emit('unsubscribe_marathon', { marathonId: 'test-uuid' });

// Check stats (should show 0 marathons, isListeningToRabbitMQ: false)
```

### Test 2: Multiple Clients Same Marathon

```javascript
// Client 1 subscribes
socket1.emit('subscribe_marathon', { marathonId: 'test-uuid' });
// Stats: 1 client, 1 marathon, 1 subscriber

// Client 2 subscribes
socket2.emit('subscribe_marathon', { marathonId: 'test-uuid' });
// Stats: 2 clients, 1 marathon, 2 subscribers

// Client 1 disconnects
socket1.disconnect();
// Stats: 1 client, 1 marathon, 1 subscriber (still active)

// Client 2 disconnects
socket2.disconnect();
// Stats: 0 clients, 0 marathons, isListeningToRabbitMQ: false
```

### Test 3: Multiple Marathons

```javascript
socket1.emit('subscribe_marathon', { marathonId: 'marathon-A' });
socket2.emit('subscribe_marathon', { marathonId: 'marathon-B' });
// Stats: 2 clients, 2 marathons, listening: true

socket1.disconnect();
// Stats: 1 client, 1 marathon (B), listening: true

socket2.disconnect();
// Stats: 0 clients, 0 marathons, listening: false
```

### Test 4: Participant Subscription ✨

```javascript
// Subscribe به یک participant
socket1.emit('subscribe_participant', { participantId: 'participant-123' });
// Stats: 1 client, 0 marathons, 1 participant, listening: true
// RabbitMQ: Subscribe to participant's marathon

// Listen برای آپدیت‌ها
socket1.on('participant_update', (data) => {
  console.log('Participant:', data.participantId);
  console.log('Rank:', data.rank);
  console.log('Balance:', data.balance);
});

// Unsubscribe
socket1.emit('unsubscribe_participant', { participantId: 'participant-123' });
// Stats: 1 client, 0 marathons, 0 participants, listening: false
```

---

## 🔧 Configuration

### Enable/Disable Smart Subscription

Currently always enabled. To revert to old behavior (always listen):

```typescript
// In marathon-live-data.gateway.ts
async onModuleInit() {
  // Old behavior (always listen):
  this.startListeningToUpdates();
  
  // Or keep new behavior (smart subscription):
  this.logger.log('Smart subscription mode enabled');
}
```

---

## 🐛 Troubleshooting

### Problem: Messages not received by clients

**Check:**
```bash
# 1. Is Gateway listening?
curl http://localhost:3000/apiv1/marathons/websocket-stats

# 2. Check RabbitMQ consumers
docker exec marathonapi-rabbitmq-1 rabbitmqctl list_consumers

# 3. Check logs
docker logs marathonapi-marathon-api-1 | grep -i "subscri"
```

**Solutions:**
- Verify client is subscribed: `socket.emit('subscribe_marathon', ...)`
- Check RabbitMQ is publishing: Look at ap-tokyo logs
- Restart if needed: `docker-compose restart marathon-api`

### Problem: Memory leak (subscriptions not cleaning up)

**Check:**
```bash
# Monitor over time
watch -n 5 'curl -s http://localhost:3000/apiv1/marathons/websocket-stats | jq'
```

**Solutions:**
- Check logs for disconnect events
- Verify `handleDisconnect` is called
- Restart gateway: `docker-compose restart marathon-api`

---

## 📚 Code References

### Key Files:
- `src/marathon/marathon-live-data.gateway.ts` - Main WebSocket Gateway
- `src/marathon/live-account-data.service.ts` - RabbitMQ Consumer Service
- `src/rabbitmq/services/rabbitmq-consumer.service.ts` - RabbitMQ Consumer Logic

### Key Methods:
- `incrementMarathonSubscription()` - Add subscriber
- `decrementMarathonSubscription()` - Remove subscriber
- `startListeningToUpdates()` - Start EventEmitter
- `stopListeningToUpdates()` - Stop EventEmitter
- `getSubscriptionStats()` - Get statistics

---

## 🎓 Best Practices

1. **Monitor Stats Regularly** - Check `/websocket-stats` endpoint
2. **Set Alerts** - Alert if `activeMarathons` unexpectedly high
3. **Log Analysis** - Monitor subscribe/unsubscribe patterns
4. **Load Testing** - Test with realistic client counts
5. **Cleanup** - Ensure all connections properly disconnect

---

---

## 🆕 What's New in 2.2.0

### Participant Subscription

کلاینت‌ها حالا می‌تونن به یک شرکت‌کننده خاص subscribe کنن:

```javascript
// Subscribe
socket.emit('subscribe_participant', { participantId: 'uuid' });

// دریافت آپدیت‌ها
socket.on('participant_update', (data) => {
  console.log(data.participantId, data.rank, data.balance);
});
```

**مزایا:**
- ✅ دریافت آپدیت فقط برای یک شرکت‌کننده
- ✅ Smart subscription management (مثل marathon)
- ✅ بهینه برای پروفایل‌های شخصی
- ✅ کاهش بار (به جای subscribe به کل marathon)

**استفاده‌های کاربردی:**
- پروفایل شخصی کاربر
- Dashboard شخصی
- نمایش وضعیت یک trader خاص

---

**Last Updated:** November 17, 2025  
**Version:** 2.2.0 (Participant Subscription Support)

