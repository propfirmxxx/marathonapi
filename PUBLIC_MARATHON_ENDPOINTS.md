# Public Marathon Endpoints - Implementation Summary

## Overview
Modified the Marathon API to allow public access to list and detail endpoints while maintaining authentication for protected operations.

## Changes Made

### 1. Marathon Controller (`src/marathon/marathon.controller.ts`)

#### Removed Global Authentication
- Removed `@UseGuards(AuthGuard('jwt'))` from controller level
- Removed global `@ApiBearerAuth()` decorator

#### Public Endpoints (No Authentication Required)

**GET /apiv1/marathons**
- Returns list of marathons with pagination and filters
- Authentication is **optional**
- If authenticated: `myMarathons` filter works
- If not authenticated: `myMarathons` filter is ignored
- Updated to use `@Req() req` instead of `@GetUser()` decorator
- Checks `req.user?.id` to determine if user is authenticated

**GET /apiv1/marathons/:id**
- Returns marathon details by ID
- Authentication is **optional**
- If authenticated: `isParticipant` flag is checked and returned
- If not authenticated: `isParticipant` is always `false`

**GET /apiv1/marathons/:id/participants**
- Returns list of participants and leaderboard
- Authentication is **optional**
- Public data (participant names, balances, rankings) visible to everyone

#### Protected Endpoints (Authentication Required)

All the following endpoints now have explicit authentication guards:

**POST /apiv1/marathons** - Create marathon
- Requires: `@UseGuards(AuthGuard('jwt'), AdminGuard)`
- Admin only

**PATCH /apiv1/marathons/:id** - Update marathon
- Requires: `@UseGuards(AuthGuard('jwt'), AdminGuard)`
- Admin only

**DELETE /apiv1/marathons/:id** - Delete marathon
- Requires: `@UseGuards(AuthGuard('jwt'), AdminGuard)`
- Admin only

**POST /apiv1/marathons/:id/join** - Join marathon
- Requires: `@UseGuards(AuthGuard('jwt'))`
- Authenticated users only

**POST /apiv1/marathons/:id/cancel** - Cancel participation
- Requires: `@UseGuards(AuthGuard('jwt'))`
- Authenticated users only

**GET /apiv1/marathons/websocket-docs** - WebSocket documentation
- Requires: `@UseGuards(AuthGuard('jwt'))`
- Authenticated users only

**GET /apiv1/marathons/rabbitmq-health** - RabbitMQ health status
- Requires: `@UseGuards(AuthGuard('jwt'))`
- Authenticated users only

### 2. Live Account Data Service (`src/marathon/live-account-data.service.ts`)

#### Added Health Monitoring
- Added `messageCount` property to track total messages received
- Added `lastMessageTime` property to track when last message was received
- Implemented `getHealth()` method that returns:
  - `enabled`: boolean - Whether RabbitMQ is enabled
  - `connected`: boolean - RabbitMQ connection status
  - `queueName`: string - Name of the queue
  - `messageCount`: number - Total messages processed
  - `snapshotCount`: number - Number of active account snapshots
  - `lastMessageTime`: Date | null - Time of last message

#### RabbitMQ Enable/Disable Feature
- Added `RABBITMQ_ENABLED` environment variable to control RabbitMQ connection
- When set to `false`, the service will not attempt to connect to RabbitMQ
- Default value is `true` (enabled)
- Useful for development or testing environments where RabbitMQ is not available

## API Usage Examples

### Public Access (No Token Required)

```javascript
// Get list of marathons
fetch('http://localhost:3000/apiv1/marathons')
  .then(res => res.json())
  .then(data => console.log(data));

// Get marathon details
fetch('http://localhost:3000/apiv1/marathons/{marathonId}')
  .then(res => res.json())
  .then(data => console.log(data));

// Get marathon participants/leaderboard
fetch('http://localhost:3000/apiv1/marathons/{marathonId}/participants')
  .then(res => res.json())
  .then(data => console.log(data));
```

### Authenticated Access (Token Required)

```javascript
const token = 'your-jwt-token';

// Get my marathons (requires authentication)
fetch('http://localhost:3000/apiv1/marathons?myMarathons=true', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
  .then(res => res.json())
  .then(data => console.log(data));

// Join a marathon (requires authentication)
fetch('http://localhost:3000/apiv1/marathons/{marathonId}/join', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
  .then(res => res.json())
  .then(data => console.log(data));
```

## Security Considerations

1. **Public Data Only**: Public endpoints return only non-sensitive data
2. **Optional Authentication**: User-specific data (like `isParticipant`, `myMarathons`) only available when authenticated
3. **Protected Operations**: All write operations and administrative tasks require authentication
4. **Backward Compatible**: Existing authenticated clients continue to work without changes

## Environment Variables

### RabbitMQ Configuration

```bash
# Enable/disable RabbitMQ connection (default: true)
RABBITMQ_ENABLED=true

# RabbitMQ connection URL
RABBITMQ_URL=amqp://guest:guest@localhost:5672/

# RabbitMQ queue name
RABBITMQ_QUEUE=socket_data
```

### Example: Disable RabbitMQ for Development

Add to your `.env` file:
```bash
RABBITMQ_ENABLED=false
```

This will prevent the application from attempting to connect to RabbitMQ, which is useful when:
- RabbitMQ is not available in your development environment
- Testing without live data feeds
- Running the API without MetaTrader integration

## Testing

The changes have been tested with:
- ✅ TypeScript compilation successful
- ✅ No linter errors
- ✅ Build process completed successfully

## Migration Notes

- No database migrations required
- No breaking changes for existing authenticated clients
- Frontend applications can now display marathon lists and details without requiring user login
- Authentication still required for user-specific operations (join, cancel, my marathons)
- New `RABBITMQ_ENABLED` environment variable added (optional, defaults to `true`)

