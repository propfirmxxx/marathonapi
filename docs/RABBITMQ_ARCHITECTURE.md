# RabbitMQ Architecture Documentation

## 📋 Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Exchange-Based Routing](#exchange-based-routing)
- [Dynamic Queue Management](#dynamic-queue-management)
- [Message Flow](#message-flow)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Overview

This document describes the **Exchange-based RabbitMQ architecture** implemented for the Marathon API ecosystem. The system uses **Topic Exchange** for flexible routing and **Dynamic Queue Management** for scalability.

### Key Features

✅ **Exchange-Based Routing** - Flexible message routing using topic patterns  
✅ **Dynamic Queue Management** - Auto-create/destroy queues per marathon  
✅ **Dead Letter Queue (DLQ)** - Handle failed messages  
✅ **Retry Mechanism** - Automatic retry with exponential backoff  
✅ **Connection Pooling** - Efficient resource management  
✅ **Circuit Breaker** - Prevent cascading failures  
✅ **Health Checks** - Monitor system health  
✅ **Type Safety** - Full TypeScript support  

---

## Architecture

### System Overview

```
┌─────────────────┐
│  MetaTrader     │
│  Containers     │
└────────┬────────┘
         │ TCP Socket
         ▼
┌─────────────────┐
│   ap-tokyo      │
│   (Producer)    │
└────────┬────────┘
         │ AMQP (Exchange + Routing Key)
         ▼
┌─────────────────────────────────────────┐
│          RabbitMQ Server                │
│  ┌───────────────────────────────────┐  │
│  │   marathon.live.exchange (Topic)  │  │
│  └───────────────────────────────────┘  │
│           │                              │
│  ┌────────┴─────────┬──────────────┐   │
│  ▼                  ▼              ▼    │
│ marathon_uuid1   marathon_uuid2  DLQ   │
└─────────────────────────────────────────┘
         │
         ▼ AMQP (Dynamic Consumers)
┌─────────────────┐
│   marathonapi   │
│   (Consumer)    │
└─────────────────┘
```

### Components

#### 1. **ap-tokyo (Producer)**
- Receives data from MetaTrader containers via TCP
- Publishes to RabbitMQ with routing keys: `marathon.{marathonId}.account.{login}`
- Features: Connection pooling, Circuit breaker, Retry logic

#### 2. **RabbitMQ Server**
- **Main Exchange**: `marathon.live.exchange` (Topic)
- **Dead Letter Exchange**: `marathon.dlx`
- **Retry Exchange**: `marathon.retry.exchange`
- **Policies**: HA, TTL, Max length

#### 3. **marathonapi (Consumer)**
- Dynamically subscribes to marathons
- Processes messages and updates database
- Features: Prefetch control, Auto-ack, Error handling

---

## Exchange-Based Routing

### Routing Key Pattern

```
marathon.{marathonId}.account.{accountLogin}
```

**Examples:**
```
marathon.uuid-123-456.account.261632689
marathon.uuid-789-abc.account.987654321
```

### Binding Patterns

Consumers can subscribe using wildcards:

| Pattern | Matches | Use Case |
|---------|---------|----------|
| `marathon.{id}.#` | All messages for specific marathon | Marathon-specific consumer |
| `marathon.#` | All marathon messages | Monitoring service |
| `marathon.*.account.{login}` | Specific account across marathons | Account tracking |
| `marathon.{id}.account.*` | All accounts in a marathon | Leaderboard service |

### Message Headers

```typescript
{
  'marathon_id': 'uuid-123-456',
  'account_login': '261632689',
  'timestamp': 1700000000.123,
  'x-retry-count': 0
}
```

---

## Dynamic Queue Management

### Queue Lifecycle

#### 1. Marathon Starts
```typescript
// marathonapi automatically creates queue
await liveDataService.subscribeToMarathon(marathonId);

// Creates:
// - Queue: marathon_{marathonId}_live
// - Binding: marathon.{marathonId}.# → queue
```

#### 2. Marathon Running
- Messages flow to dedicated queue
- Consumer processes with prefetch=10
- Failed messages retry or go to DLQ

#### 3. Marathon Ends
```typescript
// Cleanup (optional)
await liveDataService.unsubscribeFromMarathon(marathonId);

// Queue can be kept for analytics or deleted
```

### Queue Configuration

```typescript
{
  name: `marathon_${marathonId}_live`,
  durable: true,
  exclusive: false,
  autoDelete: false,
  arguments: {
    'x-message-ttl': 60000,        // 60 seconds
    'x-max-length': 10000,         // Max 10k messages
    'x-dead-letter-exchange': 'marathon.dlx',
    'x-overflow': 'reject-publish'
  }
}
```

---

## Message Flow

### 1. Normal Flow

```mermaid
sequenceDiagram
    participant MT5 as MetaTrader
    participant APT as ap-tokyo
    participant RMQ as RabbitMQ
    participant API as marathonapi
    participant DB as PostgreSQL

    MT5->>APT: Send account data (TCP)
    APT->>APT: Extract marathon_id, login
    APT->>RMQ: Publish with routing key
    RMQ->>API: Route to marathon queue
    API->>API: Process message
    API->>DB: Update data
    API-->>RMQ: ACK
```

### 2. Error Flow with Retry

```mermaid
sequenceDiagram
    participant RMQ as RabbitMQ
    participant API as marathonapi
    participant Retry as Retry Queue
    participant DLQ as Dead Letter Queue

    RMQ->>API: Deliver message
    API->>API: Processing fails
    API->>Retry: Send to retry (retry_count++)
    Note over Retry: Wait 5 seconds
    Retry->>RMQ: Re-publish to main exchange
    RMQ->>API: Deliver again (retry_count=1)
    API->>API: Processing fails again
    API->>Retry: Send to retry (retry_count++)
    Note over Retry: Wait 5 seconds
    Retry->>RMQ: Re-publish (retry_count=2)
    RMQ->>API: Deliver (retry_count=2)
    API->>API: Processing fails (max retries)
    API->>DLQ: Send to DLQ
```

---

## Configuration

### Environment Variables

#### ap-tokyo
```bash
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
LOG_LEVEL=INFO
```

#### marathonapi
```bash
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
RABBITMQ_ENABLED=true
RABBITMQ_EXCHANGE=marathon.live.exchange
RABBITMQ_PREFETCH=10
```

### RabbitMQ Policies

Defined in `rabbitmq-configs/definitions.json`:

```json
{
  "name": "marathon-ha-policy",
  "pattern": "marathon.*",
  "definition": {
    "ha-mode": "all",
    "message-ttl": 60000,
    "max-length": 10000,
    "overflow": "reject-publish"
  }
}
```

---

## Usage Examples

### ap-tokyo (Producer)

```python
from app.rabbitmq import RabbitMQPublisher
from app.rabbitmq.config import create_config_from_env

# Initialize
config = create_config_from_env(settings.rabbitmq_url)
publisher = RabbitMQPublisher(config)

# Publish account data
publisher.publish_account_data(
    marathon_id="uuid-123-456",
    account_login="261632689",
    data={
        "login": "261632689",
        "balance": 10150.25,
        "equity": 10200.50,
        "profit": 150.25,
        "positions": [...],
    }
)

# Get statistics
stats = publisher.get_stats()
print(f"Messages published: {stats['metrics']['message_count']}")

# Cleanup
publisher.close()
```

### marathonapi (Consumer)

```typescript
import { Injectable } from '@nestjs/common';
import { LiveAccountDataService } from './live-account-data.service';

@Injectable()
export class MarathonService {
  constructor(
    private readonly liveDataService: LiveAccountDataService,
  ) {}

  async startMarathon(marathonId: string) {
    // Subscribe to marathon data
    await this.liveDataService.subscribeToMarathon(marathonId);
    console.log(`Subscribed to marathon ${marathonId}`);
  }

  async stopMarathon(marathonId: string) {
    // Unsubscribe
    await this.liveDataService.unsubscribeFromMarathon(marathonId);
    console.log(`Unsubscribed from marathon ${marathonId}`);
  }

  getAccountData(login: string) {
    return this.liveDataService.getSnapshot(login);
  }
}
```

### Custom Message Handler

```typescript
import { ConsumeMessage } from 'amqplib';
import { MessageHandler, AccountSnapshot } from '../rabbitmq/interfaces';

class CustomHandler implements MessageHandler {
  async handle(message: ConsumeMessage, snapshot: AccountSnapshot): Promise<boolean> {
    try {
      // Your custom logic
      console.log(`Processing account ${snapshot.login}`);
      
      // Return true for success
      return true;
    } catch (error) {
      // Return false to trigger retry
      return false;
    }
  }
}

// Use custom handler
const handler = new CustomHandler();
await consumerService.subscribeToMarathon(marathonId, handler);
```

---

## Monitoring

### Health Check Endpoints

#### ap-tokyo
```bash
GET http://localhost:8000/health

Response:
{
  "status": "healthy",
  "service": "AP Tokyo",
  "rabbitmq": {
    "pool": {
      "connected": true,
      "current_size": 5,
      "available": 4
    },
    "metrics": {
      "message_count": 15234,
      "bytes_sent": 5242880,
      "messages_per_second": 125.4
    },
    "circuit_breaker": {
      "state": "closed",
      "failure_count": 0
    }
  }
}
```

#### marathonapi
```bash
GET http://localhost:3000/apiv1/marathons/rabbitmq-health

Response:
{
  "enabled": true,
  "connected": true,
  "exchangeName": "marathon.live.exchange",
  "activeConsumers": 3,
  "messageCount": 45678,
  "lastMessageTime": "2025-11-17T10:30:00.000Z",
  "consumers": [
    {
      "marathonId": "uuid-123",
      "queueName": "marathon_uuid-123_live"
    }
  ]
}
```

### RabbitMQ Management UI

Access at: `http://localhost:15672`
- Username: `guest`
- Password: `guest`

**Key Metrics to Monitor:**
- Message rate
- Queue length
- Consumer count
- Memory usage
- Connection count

---

## Troubleshooting

### Common Issues

#### 1. Messages Not Being Consumed

**Symptoms:** Messages accumulating in queue

**Solutions:**
```bash
# Check if consumer is subscribed
curl http://localhost:3000/apiv1/marathons/rabbitmq-health

# Check RabbitMQ queue
docker exec marathonapi-rabbitmq-1 rabbitmqctl list_queues

# Restart consumer
docker-compose restart marathon-api
```

#### 2. Connection Pool Exhausted

**Symptoms:** `Pool exhausted, waiting for available connection`

**Solutions:**
```python
# Increase pool size in config
config = RabbitMQConfig(
    url=url,
    pool_size=10,  # Increase from 5
    pool_max_overflow=20,  # Increase from 10
)
```

#### 3. Circuit Breaker Open

**Symptoms:** `Circuit breaker is OPEN`

**Solutions:**
```bash
# Check RabbitMQ is running
docker ps | grep rabbitmq

# Check logs
docker logs marathonapi-rabbitmq-1

# Wait for circuit breaker to retry (default 60s)
# Or restart service
```

#### 4. Messages Going to DLQ

**Symptoms:** High DLQ message count

**Solutions:**
```bash
# Check DLQ
docker exec marathonapi-rabbitmq-1 rabbitmqctl list_queues name messages | grep dead_letter

# Inspect messages in RabbitMQ UI
# Navigate to Queues → marathon_dead_letter → Get Messages

# Fix the issue and re-queue from DLQ (manual process)
```

### Debug Commands

```bash
# Check RabbitMQ status
docker exec marathonapi-rabbitmq-1 rabbitmq-diagnostics status

# List all queues
docker exec marathonapi-rabbitmq-1 rabbitmqctl list_queues

# List exchanges
docker exec marathonapi-rabbitmq-1 rabbitmqctl list_exchanges

# List bindings
docker exec marathonapi-rabbitmq-1 rabbitmqctl list_bindings

# Purge a queue
docker exec marathonapi-rabbitmq-1 rabbitmqctl purge_queue marathon_uuid-123_live
```

---

## Performance Tips

1. **Adjust Prefetch Count**
   ```typescript
   // Higher for fast processing, lower for slow
   prefetchCount: 20  // Default: 10
   ```

2. **Tune Pool Size**
   ```python
   pool_size=10,
   pool_max_overflow=20
   ```

3. **Monitor Queue Lengths**
   - Keep < 1000 messages for optimal performance
   - Scale consumers if queues grow

4. **Use Persistent Connections**
   - Connection pooling avoids connection overhead

5. **Batch Processing**
   - Process multiple messages in one transaction

---

## Security Considerations

1. **Change Default Credentials**
   ```bash
   RABBITMQ_DEFAULT_USER=marathon_user
   RABBITMQ_DEFAULT_PASS=secure_password_here
   ```

2. **Use TLS in Production**
   ```bash
   RABBITMQ_URL=amqps://user:pass@rabbitmq:5671/
   ```

3. **Network Isolation**
   - Keep RabbitMQ in internal Docker network
   - Only expose management UI to VPN

4. **Resource Limits**
   - Set memory/CPU limits in docker-compose
   - Configure disk free limits

---

## References

- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [AMQP 0-9-1 Protocol](https://www.rabbitmq.com/resources/specs/amqp0-9-1.pdf)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Docker Compose](https://docs.docker.com/compose/)

---

**Last Updated:** November 17, 2025  
**Version:** 2.0.0

