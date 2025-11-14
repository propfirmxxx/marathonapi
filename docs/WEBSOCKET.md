# Marathon Live Data WebSocket API

## Overview

The Marathon API provides real-time WebSocket streaming for MetaTrader account data with calculated leaderboard positions. This allows clients to receive live updates as trading activity occurs, including balance changes, equity updates, position changes, and dynamic ranking calculations.

## Architecture

```
RabbitMQ (socket_data queue)
    ↓
LiveAccountDataService (consumes and stores snapshots)
    ↓
MarathonLiveDataGateway (emits to WebSocket clients)
    ↓
Client Applications
```

## Connection

### Endpoint

```
ws://localhost:3000/marathon-live
```

In production, replace `localhost:3000` with your actual API domain.

### Authentication

Authentication is required via JWT token passed as a query parameter:

```javascript
const token = 'your-jwt-token-here';
const socket = io('http://localhost:3000/marathon-live', {
  query: { token }
});
```

If authentication fails, the connection will be automatically closed with an error event.

## Events

### Client → Server Events

Events that clients emit to subscribe or unsubscribe from data streams.

#### 1. subscribe_marathon

Subscribe to receive leaderboard updates for all accounts in a specific marathon.

**Payload:**
```json
{
  "marathonId": "uuid-of-marathon"
}
```

**Example:**
```javascript
socket.emit('subscribe_marathon', { 
  marathonId: '123e4567-e89b-12d3-a456-426614174000' 
});
```

**Response Events:**
- `subscribed` - Confirmation of subscription
- `marathon_leaderboard` - Initial leaderboard data
- Future `marathon_leaderboard` events as data updates

---

#### 2. subscribe_account

Subscribe to receive updates for a specific trading account.

**Payload:**
```json
{
  "accountLogin": "261632689"
}
```

**Example:**
```javascript
socket.emit('subscribe_account', { 
  accountLogin: '261632689' 
});
```

**Response Events:**
- `subscribed` - Confirmation of subscription
- `account_update` - Initial account data
- Future `account_update` events as data updates

---

#### 3. unsubscribe_marathon

Unsubscribe from marathon leaderboard updates.

**Payload:**
```json
{
  "marathonId": "uuid-of-marathon"
}
```

**Example:**
```javascript
socket.emit('unsubscribe_marathon', { 
  marathonId: '123e4567-e89b-12d3-a456-426614174000' 
});
```

**Response Events:**
- `unsubscribed` - Confirmation of unsubscription

---

#### 4. unsubscribe_account

Unsubscribe from account updates.

**Payload:**
```json
{
  "accountLogin": "261632689"
}
```

**Example:**
```javascript
socket.emit('unsubscribe_account', { 
  accountLogin: '261632689' 
});
```

**Response Events:**
- `unsubscribed` - Confirmation of unsubscription

---

### Server → Client Events

Events that the server emits to connected clients.

#### 1. connected

Emitted immediately after successful connection and authentication.

**Payload:**
```json
{
  "message": "Connected to Marathon Live Data stream"
}
```

---

#### 2. marathon_leaderboard

Full leaderboard data for a subscribed marathon. Emitted when:
- Client initially subscribes to a marathon
- Any account in the marathon receives an update from RabbitMQ

**Payload:**
```json
{
  "marathonId": "123e4567-e89b-12d3-a456-426614174000",
  "marathonName": "Weekly Trading Challenge",
  "totalParticipants": 15,
  "entries": [
    {
      "participantId": "uuid",
      "userId": "uuid",
      "userName": "John Doe",
      "accountLogin": "261632689",
      "rank": 1,
      "balance": 10150.25,
      "equity": 10200.50,
      "profit": 150.25,
      "profitPercentage": 1.5,
      "margin": 500.00,
      "freeMargin": 9700.50,
      "currency": "USD",
      "leverage": 100,
      "positions": [
        {
          "ticket": 123456,
          "symbol": "EURUSD",
          "type": "BUY",
          "volume": 0.1,
          "openPrice": 1.1000,
          "currentPrice": 1.1050,
          "profit": 50.00,
          "swap": -1.20,
          "commission": 0.00
        }
      ],
      "orders": [],
      "updatedAt": "2024-01-01T12:00:00.000Z",
      "joinedAt": "2024-01-01T10:00:00.000Z"
    },
    {
      "participantId": "uuid-2",
      "userId": "uuid-2",
      "userName": "Jane Smith",
      "accountLogin": "261632685",
      "rank": 2,
      "balance": 10075.00,
      "equity": 10100.00,
      "profit": 75.00,
      "profitPercentage": 0.75,
      "margin": 300.00,
      "freeMargin": 9800.00,
      "currency": "USD",
      "leverage": 100,
      "positions": [],
      "orders": [],
      "updatedAt": "2024-01-01T12:00:00.000Z",
      "joinedAt": "2024-01-01T10:00:00.000Z"
    }
  ],
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Field Descriptions:**
- `rank`: Current position in the leaderboard (1 = first place)
- `profitPercentage`: Profit as a percentage of initial balance
- `equity`: Current account equity (balance + floating profit/loss)
- `margin`: Used margin for open positions
- `freeMargin`: Available margin for new trades
- `positions`: Array of currently open positions
- `orders`: Array of pending orders

---

#### 3. account_update

Individual account update with calculated leaderboard position. Emitted when:
- Client initially subscribes to an account
- The subscribed account receives an update from RabbitMQ

**Payload:**
```json
{
  "participantId": "uuid",
  "userId": "uuid",
  "userName": "John Doe",
  "accountLogin": "261632689",
  "rank": 1,
  "balance": 10150.25,
  "equity": 10200.50,
  "profit": 150.25,
  "profitPercentage": 1.5,
  "margin": 500.00,
  "freeMargin": 9700.50,
  "currency": "USD",
  "leverage": 100,
  "positions": [
    {
      "ticket": 123456,
      "symbol": "EURUSD",
      "type": "BUY",
      "volume": 0.1,
      "openPrice": 1.1000,
      "currentPrice": 1.1050,
      "profit": 50.00
    }
  ],
  "orders": [],
  "updatedAt": "2024-01-01T12:00:00.000Z",
  "joinedAt": "2024-01-01T10:00:00.000Z"
}
```

---

#### 4. subscribed

Confirmation that a subscription was successful.

**Payload:**
```json
{
  "type": "marathon",
  "marathonId": "uuid-of-marathon",
  "message": "Subscribed to marathon {marathonId}"
}
```

Or for account subscriptions:
```json
{
  "type": "account",
  "accountLogin": "261632689",
  "message": "Subscribed to account 261632689"
}
```

---

#### 5. unsubscribed

Confirmation that an unsubscription was successful.

**Payload:**
```json
{
  "type": "marathon",
  "marathonId": "uuid-of-marathon",
  "message": "Unsubscribed from marathon {marathonId}"
}
```

Or for account unsubscriptions:
```json
{
  "type": "account",
  "accountLogin": "261632689",
  "message": "Unsubscribed from account 261632689"
}
```

---

#### 6. error

Error message for failed operations or authentication issues.

**Payload:**
```json
{
  "message": "Error description"
}
```

**Common errors:**
- `Authentication required` - No token provided
- `Invalid token` - Token verification failed
- `Not authenticated` - Connection not authenticated
- `marathonId is required` - Missing marathonId parameter
- `accountLogin is required` - Missing accountLogin parameter
- `Failed to subscribe to marathon` - Internal error during subscription
- `Failed to subscribe to account` - Internal error during subscription

---

## Complete Implementation Examples

### Example 1: React Component with Marathon Leaderboard

```typescript
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface LeaderboardEntry {
  rank: number;
  userName: string;
  accountLogin: string;
  balance: number;
  equity: number;
  profit: number;
  profitPercentage: number;
}

interface Leaderboard {
  marathonId: string;
  marathonName: string;
  totalParticipants: number;
  entries: LeaderboardEntry[];
  updatedAt: string;
}

export const MarathonLeaderboard = ({ marathonId, token }: { marathonId: string; token: string }) => {
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io('http://localhost:3000/marathon-live', {
      query: { token }
    });

    newSocket.on('connected', () => {
      console.log('Connected to live data stream');
      newSocket.emit('subscribe_marathon', { marathonId });
    });

    newSocket.on('marathon_leaderboard', (data: Leaderboard) => {
      setLeaderboard(data);
      setError(null);
    });

    newSocket.on('error', (err) => {
      setError(err.message);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      if (newSocket) {
        newSocket.emit('unsubscribe_marathon', { marathonId });
        newSocket.close();
      }
    };
  }, [marathonId, token]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!leaderboard) {
    return <div>Loading leaderboard...</div>;
  }

  return (
    <div>
      <h2>{leaderboard.marathonName}</h2>
      <p>Total Participants: {leaderboard.totalParticipants}</p>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Trader</th>
            <th>Account</th>
            <th>Balance</th>
            <th>Equity</th>
            <th>Profit</th>
            <th>Profit %</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.entries.map((entry) => (
            <tr key={entry.accountLogin}>
              <td>{entry.rank}</td>
              <td>{entry.userName}</td>
              <td>{entry.accountLogin}</td>
              <td>${entry.balance.toFixed(2)}</td>
              <td>${entry.equity.toFixed(2)}</td>
              <td className={entry.profit >= 0 ? 'profit' : 'loss'}>
                ${entry.profit.toFixed(2)}
              </td>
              <td className={entry.profitPercentage >= 0 ? 'profit' : 'loss'}>
                {entry.profitPercentage.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Last updated: {new Date(leaderboard.updatedAt).toLocaleString()}</p>
    </div>
  );
};
```

---

### Example 2: Vue.js Component with Account Monitoring

```vue
<template>
  <div class="account-monitor">
    <h3>Account: {{ accountLogin }}</h3>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="accountData">
      <div class="stats">
        <div class="stat">
          <label>Rank:</label>
          <span class="rank">#{{ accountData.rank }}</span>
        </div>
        <div class="stat">
          <label>Balance:</label>
          <span>${{ accountData.balance.toFixed(2) }}</span>
        </div>
        <div class="stat">
          <label>Equity:</label>
          <span>${{ accountData.equity.toFixed(2) }}</span>
        </div>
        <div class="stat">
          <label>Profit:</label>
          <span :class="profitClass">${{ accountData.profit.toFixed(2) }}</span>
        </div>
        <div class="stat">
          <label>Profit %:</label>
          <span :class="profitClass">{{ accountData.profitPercentage.toFixed(2) }}%</span>
        </div>
      </div>
      <div class="positions" v-if="accountData.positions.length > 0">
        <h4>Open Positions:</h4>
        <ul>
          <li v-for="position in accountData.positions" :key="position.ticket">
            {{ position.symbol }} {{ position.type }} {{ position.volume }} lots
            - Profit: ${{ position.profit.toFixed(2) }}
          </li>
        </ul>
      </div>
      <p class="updated">Updated: {{ formatDate(accountData.updatedAt) }}</p>
    </div>
    <div v-else>
      Loading account data...
    </div>
  </div>
</template>

<script>
import io from 'socket.io-client';

export default {
  props: {
    accountLogin: {
      type: String,
      required: true
    },
    token: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      socket: null,
      accountData: null,
      error: null
    };
  },
  computed: {
    profitClass() {
      return this.accountData?.profit >= 0 ? 'profit' : 'loss';
    }
  },
  mounted() {
    this.connectWebSocket();
  },
  beforeUnmount() {
    this.disconnectWebSocket();
  },
  methods: {
    connectWebSocket() {
      this.socket = io('http://localhost:3000/marathon-live', {
        query: { token: this.token }
      });

      this.socket.on('connected', () => {
        console.log('Connected to live data');
        this.socket.emit('subscribe_account', { 
          accountLogin: this.accountLogin 
        });
      });

      this.socket.on('account_update', (data) => {
        this.accountData = data;
        this.error = null;
      });

      this.socket.on('error', (err) => {
        this.error = err.message;
      });
    },
    disconnectWebSocket() {
      if (this.socket) {
        this.socket.emit('unsubscribe_account', { 
          accountLogin: this.accountLogin 
        });
        this.socket.close();
      }
    },
    formatDate(dateString) {
      return new Date(dateString).toLocaleString();
    }
  }
};
</script>

<style scoped>
.profit {
  color: green;
}
.loss {
  color: red;
}
.rank {
  font-size: 1.5em;
  font-weight: bold;
}
</style>
```

---

### Example 3: Node.js Backend Integration

```javascript
const io = require('socket.io-client');

class MarathonLiveDataClient {
  constructor(token) {
    this.token = token;
    this.socket = null;
    this.leaderboardCache = new Map();
    this.accountCache = new Map();
  }

  connect() {
    this.socket = io('http://localhost:3000/marathon-live', {
      query: { token: this.token }
    });

    this.socket.on('connected', () => {
      console.log('Connected to Marathon Live Data');
    });

    this.socket.on('marathon_leaderboard', (leaderboard) => {
      this.leaderboardCache.set(leaderboard.marathonId, leaderboard);
      console.log(`Leaderboard updated for marathon ${leaderboard.marathonId}`);
    });

    this.socket.on('account_update', (entry) => {
      this.accountCache.set(entry.accountLogin, entry);
      console.log(`Account ${entry.accountLogin} updated - Rank: ${entry.rank}`);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error.message);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Marathon Live Data');
    });
  }

  subscribeToMarathon(marathonId) {
    if (!this.socket) {
      throw new Error('Not connected');
    }
    this.socket.emit('subscribe_marathon', { marathonId });
  }

  subscribeToAccount(accountLogin) {
    if (!this.socket) {
      throw new Error('Not connected');
    }
    this.socket.emit('subscribe_account', { accountLogin });
  }

  unsubscribeFromMarathon(marathonId) {
    if (!this.socket) return;
    this.socket.emit('unsubscribe_marathon', { marathonId });
  }

  unsubscribeFromAccount(accountLogin) {
    if (!this.socket) return;
    this.socket.emit('unsubscribe_account', { accountLogin });
  }

  getLeaderboard(marathonId) {
    return this.leaderboardCache.get(marathonId);
  }

  getAccountData(accountLogin) {
    return this.accountCache.get(accountLogin);
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

// Usage
const client = new MarathonLiveDataClient('your-jwt-token');
client.connect();

// Subscribe to a marathon
client.subscribeToMarathon('marathon-uuid-here');

// Subscribe to specific accounts
client.subscribeToAccount('261632689');
client.subscribeToAccount('261632685');

// Later, get cached data
setTimeout(() => {
  const leaderboard = client.getLeaderboard('marathon-uuid-here');
  console.log('Current leaderboard:', leaderboard);
  
  const accountData = client.getAccountData('261632689');
  console.log('Account data:', accountData);
}, 5000);
```

---

## Best Practices

### 1. Connection Management

- **Reconnection Logic**: Implement automatic reconnection with exponential backoff
- **Token Refresh**: Handle JWT token expiration and refresh before reconnecting
- **Clean Disconnection**: Always unsubscribe and close connections properly

### 2. Subscription Management

- **Avoid Duplicate Subscriptions**: Track active subscriptions to prevent duplicates
- **Unsubscribe on Unmount**: Clean up subscriptions when components unmount
- **Batch Subscriptions**: If subscribing to multiple items, do it after connection is established

### 3. Data Handling

- **Update Frequency**: The server sends updates only when data changes
- **Data Validation**: Validate received data before updating UI
- **Error Handling**: Implement comprehensive error handling for all scenarios

### 4. Performance

- **Memory Management**: Clear old data from caches periodically
- **Update Throttling**: Consider throttling UI updates if data comes very frequently
- **Selective Rendering**: Only re-render affected components when data updates

### 5. Security

- **Token Storage**: Store JWT tokens securely (e.g., httpOnly cookies, secure storage)
- **Token Rotation**: Implement token rotation for long-lived connections
- **Connection Encryption**: Always use WSS (WebSocket Secure) in production

---

## Troubleshooting

### Connection Issues

**Problem**: Connection fails immediately

**Solutions**:
- Verify JWT token is valid and not expired
- Check that token is passed as query parameter correctly
- Ensure WebSocket port is accessible (check firewalls)

---

**Problem**: Connection succeeds but no data received

**Solutions**:
- Verify you've subscribed to marathon/account after connection
- Check that the marathon ID exists and has active participants
- Confirm account login is correct and belongs to an active participant
- Verify RabbitMQ is running and populated with data

---

### Data Issues

**Problem**: Stale data or missing updates

**Solutions**:
- Verify Tokyo service is sending data to RabbitMQ
- Check RabbitMQ queue `socket_data` has messages
- Ensure LiveAccountDataService is consuming from RabbitMQ correctly
- Check server logs for errors

---

**Problem**: Incorrect rankings

**Solutions**:
- Rankings are calculated based on profit percentage
- Initial balance is derived from current balance - profit
- Verify account data in RabbitMQ includes all required fields

---

## Data Flow

```
MetaTrader Account (Tokyo Service)
        ↓
    RabbitMQ (socket_data queue)
        ↓
LiveAccountDataService
    ├── Consumes messages
    ├── Stores snapshots in memory
    └── Emits 'account.update' events
        ↓
MarathonLiveDataGateway
    ├── Listens to account updates
    ├── Calculates leaderboards (via MarathonLeaderboardService)
    └── Emits to WebSocket clients
        ↓
    Client Applications
```

## Related Documentation

- [Marathon API Documentation](../README.md)
- [Payment Flow](./PAYMENT_FLOW.md)
- [Swagger UI](http://localhost:3000/swagger)
- WebSocket Endpoint Documentation: GET `/apiv1/marathons/websocket-docs`

## Support

For issues or questions about the WebSocket API:
1. Check the troubleshooting section above
2. Review server logs for error messages
3. Verify RabbitMQ and Tokyo service are operational
4. Contact the development team for assistance

