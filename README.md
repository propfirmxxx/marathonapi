<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

<p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# Marathon API

## Database Migration from MySQL to PostgreSQL

This project has been migrated from MySQL to PostgreSQL. Here are the steps to set up the database:

1. Install PostgreSQL on your system if you haven't already
2. Create a new PostgreSQL database for the project
3. Update your `.env` file with PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_NAME=your_database_name
DB_SSL=false
```

4. Install project dependencies:
```bash
npm install
```

5. Run database migrations:
```bash
npm run migration:run
```

## Development

1. Start the development server:
```bash
npm run start:dev
```

2. The API will be available at `http://localhost:3000/apiv1`
3. Swagger documentation is available at `http://localhost:3000/swagger`

## Database Management

- Create a new migration:
```bash
npm run migration:create -- -n MigrationName
```

- Generate a migration from entity changes:
```bash
npm run migration:generate -- -n MigrationName
```

- Run migrations:
```bash
npm run migration:run
```

- Revert last migration:
```bash
npm run migration:revert
```

## Environment Variables

Make sure to set up all required environment variables in your `.env` file:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_NAME=your_database_name
DB_SSL=false

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=24h

# Other configurations
PORT=3000
NODE_ENV=development
SWAGGER_PATH=swagger
META_API_TOKEN=your_meta_api_token
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Tokyo deployment service
TOKYO_SERVICE_BASE_URL=https://tokyo-service.example.com

# Live trading stream (RabbitMQ)
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
RABBITMQ_QUEUE=socket_data

# Data Seeding (optional)
# Set to 'true' to enable mock data seeding (FAQ and Marathon data)
SEED_MOCK_DATA=false
```

### Live trading & deployment notes

- `TOKYO_SERVICE_BASE_URL` must resolve to the `ap-tokyo` service responsible for deploying participant MetaTrader containers. Accounts remain `undeployed` if the service is unreachable; the API logs a warning but still serves participant data.
- `RABBITMQ_URL` and `RABBITMQ_QUEUE` configure the live data consumer. When these are missing or RabbitMQ is offline, the participants endpoint falls back to returning static user details until connectivity is restored.
- Ensure the `socket_data` queue is durable and populated by the MetaTrader bridge (see `ap/ap-tokyo` and `ap/ap-berllin/DataPusher.mq5`) to surface balances, equity, open positions, and order history in marathon responses.

## WebSocket Live Data Streaming

The Marathon API provides real-time WebSocket streaming for MetaTrader account data with calculated leaderboard positions.

### Connection

Connect to the WebSocket endpoint with your JWT token:

```javascript
import io from 'socket.io-client';

const token = 'your-jwt-token';
const socket = io('http://localhost:3000/marathon-live', {
  query: { token }
});
```

### Subscription Options

#### 1. Subscribe to Marathon (All Accounts)

Receive updates for all accounts participating in a marathon:

```javascript
socket.emit('subscribe_marathon', { marathonId: 'marathon-uuid' });

socket.on('marathon_leaderboard', (leaderboard) => {
  console.log('Leaderboard:', leaderboard);
  // leaderboard.entries contains all participants with rankings
});
```

#### 2. Subscribe to Specific Account

Receive updates for a single trading account:

```javascript
socket.emit('subscribe_account', { accountLogin: '261632689' });

socket.on('account_update', (entry) => {
  console.log('Account update:', entry);
  // entry contains account data with current rank
});
```

### Data Structure

**Leaderboard Entry:**
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
  "positions": [],
  "orders": [],
  "updatedAt": "2024-01-01T12:00:00Z",
  "joinedAt": "2024-01-01T10:00:00Z"
}
```

### Events

**Client → Server:**
- `subscribe_marathon` - Subscribe to marathon leaderboard
- `subscribe_account` - Subscribe to specific account
- `unsubscribe_marathon` - Unsubscribe from marathon
- `unsubscribe_account` - Unsubscribe from account

**Server → Client:**
- `connected` - Connection established
- `marathon_leaderboard` - Full leaderboard update
- `account_update` - Individual account update
- `subscribed` - Subscription confirmation
- `unsubscribed` - Unsubscription confirmation
- `error` - Error message

### Documentation

- Full WebSocket API documentation: See `docs/WEBSOCKET.md`
- Swagger UI: `http://localhost:3000/swagger` → GET `/apiv1/marathons/websocket-docs`