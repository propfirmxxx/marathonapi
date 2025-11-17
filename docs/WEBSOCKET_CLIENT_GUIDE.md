# WebSocket Client Guide - Marathon Live Data

## 🚀 اتصال به WebSocket

### نصب Socket.IO Client

```bash
npm install socket.io-client
# یا
yarn add socket.io-client
```

### اتصال با Authentication

```javascript
import io from 'socket.io-client';

const token = 'your-jwt-token'; // از API دریافت کنید
const socket = io('http://localhost:3000/marathon-live', {
  query: { token }
});

// Listen برای اتصال موفق
socket.on('connected', (data) => {
  console.log('✅ Connected:', data.message);
});

// Listen برای خطاها
socket.on('error', (error) => {
  console.error('❌ Error:', error.message);
});
```

---

## 📡 سه نوع Subscription

### 1️⃣ Subscribe به یک Marathon کامل

```javascript
// Subscribe
socket.emit('subscribe_marathon', { marathonId: 'uuid-123-456' });

// Listen برای تایید subscription
socket.on('subscribed', (data) => {
  if (data.type === 'marathon') {
    console.log('✅ Subscribed to marathon:', data.marathonId);
  }
});

// دریافت Leaderboard کامل (همه شرکت‌کنندگان)
socket.on('marathon_leaderboard', (leaderboard) => {
  console.log('📊 Leaderboard Update:');
  console.log('Marathon ID:', leaderboard.marathonId);
  console.log('Entries:', leaderboard.entries);
  
  // نمایش در UI
  leaderboard.entries.forEach((entry, index) => {
    console.log(
      `${index + 1}. ${entry.userName}: ` +
      `$${entry.balance} (Rank: ${entry.rank})`
    );
  });
});

// Unsubscribe
socket.emit('unsubscribe_marathon', { marathonId: 'uuid-123-456' });
```

### 2️⃣ Subscribe به یک Account خاص

```javascript
// Subscribe
socket.emit('subscribe_account', { accountLogin: '261632689' });

// Listen برای تایید
socket.on('subscribed', (data) => {
  if (data.type === 'account') {
    console.log('✅ Subscribed to account:', data.accountLogin);
  }
});

// دریافت آپدیت‌های account
socket.on('account_update', (entry) => {
  console.log('💰 Account Update:');
  console.log('Login:', entry.accountLogin);
  console.log('Balance:', entry.balance);
  console.log('Equity:', entry.equity);
  console.log('Profit:', entry.profit);
  console.log('Rank:', entry.rank);
  console.log('Positions:', entry.positions);
});

// Unsubscribe
socket.emit('unsubscribe_account', { accountLogin: '261632689' });
```

### 3️⃣ Subscribe به یک Participant (شرکت‌کننده) خاص ✨ NEW

```javascript
// Subscribe
socket.emit('subscribe_participant', { 
  participantId: 'participant-uuid-789' 
});

// Listen برای تایید
socket.on('subscribed', (data) => {
  if (data.type === 'participant') {
    console.log('✅ Subscribed to participant:', data.participantId);
  }
});

// دریافت آپدیت‌های participant
socket.on('participant_update', (data) => {
  console.log('👤 Participant Update:');
  console.log('Participant ID:', data.participantId);
  console.log('User Name:', data.userName);
  console.log('Balance:', data.balance);
  console.log('Equity:', data.equity);
  console.log('Rank:', data.rank);
  console.log('Profit %:', data.profitPercentage);
});

// Unsubscribe
socket.emit('unsubscribe_participant', { 
  participantId: 'participant-uuid-789' 
});
```

---

## 🎯 مثال‌های کاربردی

### مثال 1: نمایش Leaderboard یک Marathon

```javascript
const MarathonLeaderboard = ({ marathonId }) => {
  const [entries, setEntries] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    // اتصال
    const socket = io('http://localhost:3000/marathon-live', {
      query: { token: getAuthToken() }
    });
    socketRef.current = socket;

    // Subscribe به marathon
    socket.emit('subscribe_marathon', { marathonId });

    // دریافت آپدیت‌ها
    socket.on('marathon_leaderboard', (leaderboard) => {
      setEntries(leaderboard.entries);
    });

    // Cleanup
    return () => {
      socket.emit('unsubscribe_marathon', { marathonId });
      socket.disconnect();
    };
  }, [marathonId]);

  return (
    <div>
      <h2>Leaderboard</h2>
      {entries.map((entry, index) => (
        <div key={entry.participantId}>
          <span>#{entry.rank}</span>
          <span>{entry.userName}</span>
          <span>${entry.balance}</span>
          <span>{entry.profitPercentage}%</span>
        </div>
      ))}
    </div>
  );
};
```

### مثال 2: پروفایل یک Participant با Live Data

```javascript
const ParticipantProfile = ({ participantId }) => {
  const [participantData, setParticipantData] = useState(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:3000/marathon-live', {
      query: { token: getAuthToken() }
    });

    // Subscribe به participant
    socket.emit('subscribe_participant', { participantId });

    socket.on('subscribed', (data) => {
      if (data.type === 'participant') {
        setIsLive(true);
      }
    });

    socket.on('participant_update', (data) => {
      setParticipantData(data);
    });

    return () => {
      socket.emit('unsubscribe_participant', { participantId });
      socket.disconnect();
    };
  }, [participantId]);

  if (!participantData) return <div>Loading...</div>;

  return (
    <div>
      <div className="live-indicator">
        {isLive && <span>🔴 LIVE</span>}
      </div>
      
      <h2>{participantData.userName}</h2>
      
      <div className="stats">
        <div>Rank: #{participantData.rank}</div>
        <div>Balance: ${participantData.balance}</div>
        <div>Equity: ${participantData.equity}</div>
        <div>Profit: {participantData.profitPercentage}%</div>
      </div>

      <div className="positions">
        <h3>Open Positions ({participantData.positions?.length || 0})</h3>
        {participantData.positions?.map(pos => (
          <div key={pos.ticket}>
            {pos.symbol} - {pos.type} - {pos.volume} lots
            <span>P/L: ${pos.profit}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### مثال 3: Dashboard با Multiple Subscriptions

```javascript
const Dashboard = () => {
  const [socket, setSocket] = useState(null);
  const [activeMarathons, setActiveMarathons] = useState([]);
  const [myParticipant, setMyParticipant] = useState(null);

  useEffect(() => {
    const socket = io('http://localhost:3000/marathon-live', {
      query: { token: getAuthToken() }
    });
    setSocket(socket);

    // Subscribe به چند marathon
    ['marathon-1', 'marathon-2', 'marathon-3'].forEach(id => {
      socket.emit('subscribe_marathon', { marathonId: id });
    });

    // Subscribe به participant خودم
    socket.emit('subscribe_participant', { 
      participantId: 'my-participant-id' 
    });

    // Listen برای آپدیت‌ها
    socket.on('marathon_leaderboard', (leaderboard) => {
      setActiveMarathons(prev => {
        const updated = [...prev];
        const index = updated.findIndex(m => m.id === leaderboard.marathonId);
        if (index >= 0) {
          updated[index] = leaderboard;
        } else {
          updated.push(leaderboard);
        }
        return updated;
      });
    });

    socket.on('participant_update', (data) => {
      setMyParticipant(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <h1>My Dashboard</h1>
      
      {/* نمایش وضعیت خودم */}
      {myParticipant && (
        <div className="my-status">
          <h2>My Performance</h2>
          <div>Rank: #{myParticipant.rank}</div>
          <div>Balance: ${myParticipant.balance}</div>
          <div>Profit: {myParticipant.profitPercentage}%</div>
        </div>
      )}

      {/* نمایش marathonهای فعال */}
      <div className="marathons">
        {activeMarathons.map(marathon => (
          <div key={marathon.marathonId}>
            <h3>Marathon: {marathon.marathonId}</h3>
            <div>Top 3:</div>
            {marathon.entries.slice(0, 3).map(entry => (
              <div key={entry.participantId}>
                #{entry.rank} - {entry.userName}: ${entry.balance}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 📋 رویدادهای موجود

### Client → Server

| Event | Payload | توضیحات |
|-------|---------|---------|
| `subscribe_marathon` | `{ marathonId: string }` | Subscribe به یک marathon کامل |
| `unsubscribe_marathon` | `{ marathonId: string }` | Unsubscribe از marathon |
| `subscribe_account` | `{ accountLogin: string }` | Subscribe به یک account |
| `unsubscribe_account` | `{ accountLogin: string }` | Unsubscribe از account |
| `subscribe_participant` | `{ participantId: string }` | Subscribe به یک participant |
| `unsubscribe_participant` | `{ participantId: string }` | Unsubscribe از participant |

### Server → Client

| Event | Payload | توضیحات |
|-------|---------|---------|
| `connected` | `{ message: string }` | اتصال موفق |
| `subscribed` | `{ type, id, message }` | تایید subscription |
| `unsubscribed` | `{ type, id, message }` | تایید unsubscribe |
| `error` | `{ message: string }` | خطا |
| `marathon_leaderboard` | `LeaderboardData` | آپدیت leaderboard کامل |
| `account_update` | `EntryData` | آپدیت یک account |
| `participant_update` | `ParticipantData` | آپدیت یک participant |

---

## 🎨 Data Structures

### LeaderboardEntry

```typescript
{
  participantId: string;
  userId: string;
  userName: string;
  accountLogin: string;
  rank: number;
  balance: number;
  equity: number;
  profit: number;
  profitPercentage: number;
  margin: number;
  freeMargin: number;
  currency: string;
  leverage: number;
  positions: Position[];
  orders: Order[];
  updatedAt: string;
  joinedAt: string;
}
```

### ParticipantUpdate

```typescript
{
  participantId: string;
  // ... همه فیلدهای LeaderboardEntry
}
```

---

## ⚡ بهترین Practices

### 1. مدیریت اتصال

```javascript
// ✅ خوب - استفاده از useEffect cleanup
useEffect(() => {
  const socket = io(...);
  // subscriptions...
  
  return () => {
    socket.disconnect(); // همیشه disconnect کنید
  };
}, []);

// ❌ بد - فراموش کردن cleanup
useEffect(() => {
  const socket = io(...);
  // subscriptions...
  // اتصال باز می‌مونه!
}, []);
```

### 2. Error Handling

```javascript
// ✅ خوب
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
  toast.error(error.message);
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error);
});
```

### 3. Reconnection

```javascript
const socket = io('http://localhost:3000/marathon-live', {
  query: { token: getAuthToken() },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

socket.on('reconnect', () => {
  console.log('✅ Reconnected');
  // Re-subscribe به چیزهایی که لازم دارید
  socket.emit('subscribe_marathon', { marathonId });
});
```

### 4. Performance

```javascript
// ✅ خوب - فقط چیزی که نیاز دارید رو subscribe کنید
socket.emit('subscribe_participant', { participantId: myId });

// ❌ بد - subscribe به همه چیز
marathons.forEach(m => {
  socket.emit('subscribe_marathon', { marathonId: m.id });
});
```

---

## 🔍 Debug و Troubleshooting

### چک کردن اتصال

```javascript
console.log('Connected:', socket.connected);
console.log('Socket ID:', socket.id);
```

### مانیتورینگ همه Events

```javascript
// Listen به همه events برای debug
socket.onAny((eventName, ...args) => {
  console.log(`Event: ${eventName}`, args);
});
```

### چک کردن Stats (Admin فقط)

```bash
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:3000/apiv1/marathons/websocket-stats
```

---

## 💡 نکات مهم

1. **Authentication:** همیشه token معتبر ارسال کنید
2. **Cleanup:** حتماً `disconnect()` کنید
3. **Error Handling:** همیشه به `error` event گوش دهید
4. **Selective Subscription:** فقط چیزی که نیاز دارید subscribe کنید
5. **Reconnection:** برای reconnection برنامه‌ریزی کنید

---

## 📚 مثال کامل React

```javascript
import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

function useMarathonLiveData(marathonId, token) {
  const [leaderboard, setLeaderboard] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!marathonId || !token) return;

    const socket = io('http://localhost:3000/marathon-live', {
      query: { token }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('subscribe_marathon', { marathonId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('marathon_leaderboard', (data) => {
      setLeaderboard(data);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    return () => {
      if (socket.connected) {
        socket.emit('unsubscribe_marathon', { marathonId });
      }
      socket.disconnect();
    };
  }, [marathonId, token]);

  return { leaderboard, isConnected };
}

// استفاده
function MarathonPage({ marathonId }) {
  const token = getAuthToken();
  const { leaderboard, isConnected } = useMarathonLiveData(marathonId, token);

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Live' : '🔴 Offline'}</div>
      {leaderboard && (
        <div>
          {leaderboard.entries.map(entry => (
            <div key={entry.participantId}>
              #{entry.rank} - {entry.userName}: ${entry.balance}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

**آخرین آپدیت:** 17 نوامبر 2025  
**نسخه:** 2.2.0 (Participant Subscription Support)

