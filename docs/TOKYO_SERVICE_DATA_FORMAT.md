# Tokyo Service Data Format - Instructions for Integration

This document contains instructions for verifying and configuring the Tokyo Service (marathon-mt5-python) to properly send MetaTrader account data to RabbitMQ for consumption by the Marathon API WebSocket service.

## Overview

The Tokyo Service is responsible for:
1. Managing MetaTrader 5 accounts in Docker containers
2. Monitoring account activity and positions
3. Publishing account data to RabbitMQ queue for real-time streaming

The Marathon API's WebSocket service consumes this data to provide live leaderboards and account updates to clients.

## Required RabbitMQ Configuration

### Queue Settings

- **Queue Name**: `socket_data` (configurable via `RABBITMQ_QUEUE` environment variable)
- **Queue Type**: Durable
- **Connection URL**: `amqp://guest:guest@rabbitmq:5672/` (configurable via `RABBITMQ_URL`)

### Message Format

The Tokyo Service must publish JSON messages to the `socket_data` queue in the following format:

## Expected Data Format

### Message Structure

Each message should be a JSON object with the following fields:

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
      "openTime": "2024-01-01T10:00:00Z"
    }
  ],
  "orders": [
    {
      "ticket": 987654321,
      "symbol": "GBPUSD",
      "type": "BUY_LIMIT",
      "volume": 0.05,
      "price": 1.25000,
      "currentPrice": 1.25500,
      "time": "2024-01-01T11:00:00Z"
    }
  ]
}
```

### Field Descriptions

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Message type. Supported values: `"account"`, `"update"`, `"positions"`, `"orders"` |
| `login` | string | MetaTrader account login number (e.g., "261632689") |

#### Account Data Fields (type: "account" or "update")

| Field | Type | Description |
|-------|------|-------------|
| `balance` | number | Account balance (excluding open positions) |
| `equity` | number | Account equity (balance + floating P/L) |
| `profit` | number | Total floating profit/loss from open positions |
| `margin` | number | Used margin for open positions |
| `freeMargin` | number | Available margin (equity - margin) |
| `currency` | string | Account currency (e.g., "USD", "EUR") |
| `leverage` | number | Account leverage (e.g., 100, 500) |

#### Position Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `ticket` | number | Position ticket number |
| `symbol` | string | Trading symbol (e.g., "EURUSD") |
| `type` | string | Position type ("BUY" or "SELL") |
| `volume` | number | Position volume in lots |
| `openPrice` | number | Position open price |
| `currentPrice` | number | Current market price |
| `profit` | number | Current profit/loss |
| `swap` | number | Swap/rollover cost (optional) |
| `commission` | number | Trading commission (optional) |
| `openTime` | string | ISO 8601 timestamp of position open time (optional) |

#### Order Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `ticket` | number | Order ticket number |
| `symbol` | string | Trading symbol |
| `type` | string | Order type ("BUY_LIMIT", "SELL_LIMIT", "BUY_STOP", "SELL_STOP") |
| `volume` | number | Order volume in lots |
| `price` | number | Order price |
| `currentPrice` | number | Current market price |
| `time` | string | ISO 8601 timestamp (optional) |

## Message Types

### 1. Full Account Update (type: "account")

Send complete account information including balance, equity, positions, and orders. This should be sent:
- When account is first deployed
- Periodically (e.g., every 10-30 seconds) as heartbeat
- When significant changes occur

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
  "orders": [...]
}
```

### 2. Incremental Update (type: "update")

Send only changed fields. The Marathon API will merge these with existing snapshot data.

```json
{
  "type": "update",
  "login": "261632689",
  "balance": 10050.00,
  "equity": 10100.00,
  "profit": 50.00
}
```

### 3. Positions Update (type: "positions")

Send only position updates when positions change.

```json
{
  "type": "positions",
  "login": "261632689",
  "positions": [...]
}
```

### 4. Orders Update (type: "orders")

Send only pending orders when they change.

```json
{
  "type": "orders",
  "login": "261632689",
  "orders": [...]
}
```

## Publishing to RabbitMQ

### Python Example (amqplib)

```python
import json
import pika

# Connect to RabbitMQ
connection = pika.BlockingConnection(
    pika.URLParameters('amqp://guest:guest@rabbitmq:5672/')
)
channel = connection.channel()

# Declare queue
channel.queue_declare(queue='socket_data', durable=True)

# Prepare account data
account_data = {
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

# Publish message
channel.basic_publish(
    exchange='',
    routing_key='socket_data',
    body=json.dumps(account_data),
    properties=pika.BasicProperties(
        delivery_mode=2,  # make message persistent
    )
)

print(f"Published data for account {account_data['login']}")
connection.close()
```

### JavaScript Example (amqplib)

```javascript
const amqp = require('amqplib');

async function publishAccountData(accountData) {
  const connection = await amqp.connect('amqp://guest:guest@rabbitmq:5672/');
  const channel = await connection.createChannel();
  
  await channel.assertQueue('socket_data', { durable: true });
  
  channel.sendToQueue(
    'socket_data',
    Buffer.from(JSON.dumps(accountData)),
    { persistent: true }
  );
  
  console.log(`Published data for account ${accountData.login}`);
  
  await channel.close();
  await connection.close();
}

const accountData = {
  type: 'account',
  login: '261632689',
  balance: 10000.00,
  equity: 10150.25,
  profit: 150.25,
  margin: 500.00,
  freeMargin: 9650.25,
  currency: 'USD',
  leverage: 100,
  positions: [],
  orders: []
};

publishAccountData(accountData);
```

## Update Frequency Recommendations

- **Full Account Update**: Every 10-30 seconds
- **Incremental Updates**: When any field changes (balance, equity, profit, margin)
- **Position Updates**: When positions are opened, modified, or closed
- **Order Updates**: When pending orders are placed, modified, or triggered

## Testing Data Flow

### 1. Verify RabbitMQ Connection

```bash
# Check RabbitMQ is running
docker-compose ps rabbitmq

# Access RabbitMQ Management UI
# URL: http://localhost:15672
# Default credentials: guest/guest
```

### 2. Monitor Queue

In RabbitMQ Management UI:
1. Go to "Queues" tab
2. Find `socket_data` queue
3. Check "Ready" and "Total" message counts
4. Use "Get messages" to inspect message content

### 3. Test Message Publishing

```bash
# Publish test message using rabbitmqadmin (if installed)
rabbitmqadmin publish \
  routing_key=socket_data \
  payload='{"type":"account","login":"261632689","balance":10000,"equity":10000,"profit":0,"margin":0,"freeMargin":10000,"currency":"USD","leverage":100,"positions":[],"orders":[]}'
```

### 4. Verify Marathon API Consumption

Check Marathon API logs:
```bash
docker-compose logs -f marathon-api
```

Look for log entries like:
```
[LiveAccountDataService] Connected to RabbitMQ queue "socket_data"
```

### 5. Test WebSocket Connection

Use the WebSocket test client in Swagger UI:
1. Navigate to `http://localhost:3000/swagger`
2. Get JWT token from login endpoint
3. Connect to WebSocket: `ws://localhost:3000/marathon-live?token=YOUR_TOKEN`
4. Subscribe to an account
5. Verify you receive updates when Tokyo Service publishes data

## Troubleshooting

### Problem: Messages not appearing in Marathon API

**Checklist:**
1. ✓ RabbitMQ is running and accessible
2. ✓ Queue name matches (`socket_data`)
3. ✓ Messages are properly formatted JSON
4. ✓ Tokyo Service is connected to correct RabbitMQ instance
5. ✓ Marathon API environment variables are correct

**Solution:**
```bash
# Check Marathon API RabbitMQ configuration
docker-compose exec marathon-api env | grep RABBITMQ

# Should show:
# RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
# RABBITMQ_QUEUE=socket_data
```

### Problem: Data format errors

**Common issues:**
- Login sent as number instead of string → Convert to string: `"login": str(account_login)`
- Missing required fields → Ensure type and login are always present
- Malformed JSON → Validate JSON before publishing

**Validation:**
```python
import json
from jsonschema import validate

schema = {
    "type": "object",
    "required": ["type", "login"],
    "properties": {
        "type": {"type": "string", "enum": ["account", "update", "positions", "orders"]},
        "login": {"type": "string"},
        "balance": {"type": "number"},
        "equity": {"type": "number"},
        "profit": {"type": "number"}
    }
}

# Validate before publishing
validate(instance=account_data, schema=schema)
```

### Problem: WebSocket clients not receiving updates

**Checklist:**
1. ✓ Marathon API is consuming from RabbitMQ
2. ✓ Account login matches participant account
3. ✓ Client is properly subscribed
4. ✓ JWT token is valid

**Debug:**
```javascript
// Enable socket.io debug logging
const socket = io('http://localhost:3000/marathon-live', {
  query: { token },
  transports: ['websocket'],
  debug: true
});

socket.onAny((event, ...args) => {
  console.log('Event:', event, args);
});
```

## Integration Checklist

Use this checklist to verify Tokyo Service integration:

- [ ] RabbitMQ connection configured with correct URL
- [ ] Queue `socket_data` is declared as durable
- [ ] Messages include required fields: `type`, `login`
- [ ] Account login is sent as string, not number
- [ ] Balance, equity, profit, margin are sent as numbers
- [ ] Currency is sent as string (e.g., "USD")
- [ ] Positions array includes all open positions
- [ ] Orders array includes all pending orders
- [ ] Messages are valid JSON
- [ ] Publishing occurs at regular intervals (10-30 seconds)
- [ ] Publishing occurs when positions/orders change
- [ ] Messages are persistent (durable)
- [ ] Error handling is implemented for RabbitMQ connection issues
- [ ] Logging is enabled for debugging

## Support

If you encounter issues with the integration:

1. Check Tokyo Service logs for errors
2. Verify RabbitMQ Management UI shows messages in queue
3. Check Marathon API logs for consumption errors
4. Test with WebSocket client to verify end-to-end flow
5. Consult the Marathon API development team

## Additional Resources

- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [Marathon API WebSocket Documentation](./WEBSOCKET.md)
- [Docker Compose Configuration](../docker-compose.yml)

