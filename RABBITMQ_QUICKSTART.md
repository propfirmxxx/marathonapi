# RabbitMQ Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Start Services

```bash
cd /home/nima/Workspace/marathonapi
docker-compose up -d rabbitmq marathon-api
```

### Step 2: Verify RabbitMQ is Running

```bash
# Check containers
docker ps | grep rabbitmq

# Check health
curl http://localhost:15672  # Management UI (guest/guest)
```

### Step 3: Start ap-tokyo

```bash
cd /home/nima/Workspace/ap-tokyo
# Set environment
export RABBITMQ_URL=amqp://guest:guest@localhost:5672/

# Run
python main.py
```

### Step 4: Check Connection

```bash
# ap-tokyo health
curl http://localhost:8000/health

# marathonapi health
curl http://localhost:3000/apiv1/marathons/rabbitmq-health
```

---

## 📊 RabbitMQ Management UI

Access: `http://localhost:15672`
- Username: `guest`
- Password: `guest`

### What to Check:
1. **Exchanges** → Look for `marathon.live.exchange`
2. **Queues** → Should see marathon-specific queues
3. **Connections** → Both ap-tokyo and marathonapi connected
4. **Overview** → Message rates and resource usage

---

## 🎯 Test the Setup

### 1. Subscribe to a Marathon (marathonapi)

```bash
# In your marathonapi code
await liveDataService.subscribeToMarathon('test-marathon-123');
```

### 2. Send Test Data (ap-tokyo)

```python
# In ap-tokyo
publisher.publish_account_data(
    marathon_id='test-marathon-123',
    account_login='12345678',
    data={
        'login': '12345678',
        'balance': 10000,
        'equity': 10150,
    }
)
```

### 3. Verify Message Flow

Check RabbitMQ UI:
- Go to **Queues** → `marathon_test-marathon-123_live`
- Should see messages delivered

Check marathonapi logs:
```bash
docker logs marathonapi-marathon-api-1 | grep "Processing account"
```

---

## 🔍 Common Commands

```bash
# View RabbitMQ queues
docker exec marathonapi-rabbitmq-1 rabbitmqctl list_queues

# View exchanges
docker exec marathonapi-rabbitmq-1 rabbitmqctl list_exchanges

# View connections
docker exec marathonapi-rabbitmq-1 rabbitmqctl list_connections

# Purge a queue
docker exec marathonapi-rabbitmq-1 rabbitmqctl purge_queue marathon_test_live

# Check RabbitMQ logs
docker logs marathonapi-rabbitmq-1

# Check ap-tokyo logs
docker logs marathon-mt5-python

# Check marathonapi logs
docker logs marathonapi-marathon-api-1
```

---

## 📈 Monitoring Dashboard

### Key Metrics to Watch:

1. **Message Rate**
   - In: Messages/sec being published
   - Out: Messages/sec being consumed
   - Should be balanced

2. **Queue Length**
   - Should stay < 1000
   - High values = consumers can't keep up

3. **Consumer Count**
   - Number of active marathon consumers
   - Should match active marathons

4. **Memory Usage**
   - RabbitMQ should stay under 60% limit
   - Check in Management UI → Overview

---

## ⚡ Quick Troubleshooting

### Messages Not Flowing?

```bash
# 1. Check RabbitMQ
docker logs marathonapi-rabbitmq-1

# 2. Check bindings
docker exec marathonapi-rabbitmq-1 rabbitmqctl list_bindings

# 3. Check if consumer is subscribed
curl http://localhost:3000/apiv1/marathons/rabbitmq-health

# 4. Restart services
docker-compose restart rabbitmq marathon-api
```

### Connection Refused?

```bash
# Check RabbitMQ is listening
docker exec marathonapi-rabbitmq-1 netstat -tlnp | grep 5672

# Check docker network
docker network inspect marathonapi_marathon-network

# Verify URL in .env
echo $RABBITMQ_URL
```

### High CPU/Memory?

```bash
# Check resource usage
docker stats

# Check queue lengths
docker exec marathonapi-rabbitmq-1 rabbitmqctl list_queues name messages

# Restart if needed
docker-compose restart rabbitmq
```

---

## 🎓 Next Steps

1. **Read Full Documentation**
   - [RABBITMQ_ARCHITECTURE.md](./RABBITMQ_ARCHITECTURE.md) - Complete system design
   - [ap-tokyo/RABBITMQ_GUIDE.md](../ap-tokyo/RABBITMQ_GUIDE.md) - Producer guide

2. **Customize Configuration**
   - Edit `rabbitmq-configs/*.conf`
   - Adjust pool sizes
   - Tune performance settings

3. **Set Up Monitoring**
   - Integrate with Prometheus
   - Set up alerts
   - Monitor queue depths

4. **Production Checklist**
   - [ ] Change default credentials
   - [ ] Enable TLS
   - [ ] Set resource limits
   - [ ] Configure backups
   - [ ] Set up monitoring
   - [ ] Test failover

---

## 💡 Pro Tips

1. **Use Management UI** - Visual debugging is faster
2. **Monitor Queue Lengths** - Early warning for issues
3. **Check Logs First** - Most issues are logged
4. **Test Locally** - Use docker-compose for dev
5. **Start Simple** - Get basic flow working first

---

## 📞 Need Help?

- Check logs: `docker logs <container>`
- Check health endpoints
- Review architecture docs
- Ask the team

---

**Happy Coding! 🚀**

