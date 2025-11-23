import { GetUser } from '@/auth/decorators/get-user.decorator';
import { AdminGuard } from '@/auth/guards/admin.guard';
import { PaginatedResponseDto } from '@/common/dto/paginated-response.dto';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from '../payment/payment.service';
import { CreateMarathonDto } from './dto/create-marathon.dto';
import { GetMarathonsDto } from './dto/get-marathons.dto';
import {
  MarathonResponseDto,
  MarathonLeaderboardResponseDto,
  MarathonPnLHistoryResponseDto,
  MarathonTradeHistoryResponseDto,
  ParticipantTradeHistoryDto,
  ParticipantAnalysisDto,
} from './dto/marathon-response.dto';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { LiveResponseDto } from './dto/live-response.dto';
import { ParticipantAnalysisQueryDto } from './dto/participant-analysis-query.dto';
import { UpdateMarathonDto } from './dto/update-marathon.dto';
import { CancelMarathonResponseDto } from './dto/cancel-marathon.dto';
import { LiveAccountDataService } from './live-account-data.service';
import { MarathonService } from './marathon.service';
import { MarathonStatus } from './enums/marathon-status.enum';
import { MarathonLiveDataGateway } from './marathon-live-data.gateway';
import { transformRulesToArray } from './utils/marathon-rules.util';

@ApiTags('Marathons')
@Controller('marathons')
export class MarathonController {
  constructor(
    private readonly marathonService: MarathonService,
    private readonly paymentService: PaymentService,
    private readonly liveAccountDataService: LiveAccountDataService,
    private readonly liveDataGateway: MarathonLiveDataGateway,
  ) {}

  @ApiOperation({ summary: 'Create a new marathon' })
  @ApiResponse({ 
    status: 201, 
    description: 'Marathon created successfully',
    type: MarathonResponseDto
  })
  @ApiBearerAuth()
  @ApiBody({ type: CreateMarathonDto })
  @Post()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  create(@Body() createMarathonDto: CreateMarathonDto) {
    return this.marathonService.create(createMarathonDto);
  }

  @ApiOperation({ summary: 'Get all marathons with optional filters (public endpoint, authentication optional)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns filtered and paginated marathons',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/MarathonResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' }
      }
    }
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'myMarathons', required: false, type: Boolean, description: 'Filter marathons where current user is a participant (requires authentication)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by marathon name' })
  @ApiQuery({ name: 'status', required: false, enum: MarathonStatus, example: MarathonStatus.UPCOMING, description: 'Filter by marathon status' })
  @Get()
  async findAll(
    @Query() query: GetMarathonsDto,
    @Req() req: any,
  ): Promise<PaginatedResponseDto<MarathonResponseDto>> {
    const pageNum = query.page && Number(query.page) > 0 ? Number(query.page) : 1;
    const limitNum = query.limit && Number(query.limit) > 0 ? Number(query.limit) : 10;
    
    const userId = req.user?.id;
    const userIdForFilter = query.myMarathons && userId ? userId : undefined;
    
    const { marathons, total } = await this.marathonService.findAllWithFilters(
      pageNum,
      limitNum,
      query.isActive,
      userIdForFilter,
      query.search,
      query.status,
    );

    // Transform rules to array format
    const transformedMarathons = marathons.map(marathon => ({
      ...marathon,
      rules: transformRulesToArray(marathon.rules),
    }));

    return {
      data: transformedMarathons as any,
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  @ApiOperation({ summary: 'Get marathon by ID (public endpoint, authentication optional)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the marathon',
    type: MarathonResponseDto
  })
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    const isParticipant = userId 
      ? await this.marathonService.isUserParticipantOfMarathon(id, userId)
      : false;
    const marathon = await this.marathonService.findOne(id);

    return {
      ...marathon,
      isParticipant,
      rules: transformRulesToArray(marathon.rules),
    };
  }

  @ApiOperation({ summary: 'Update marathon' })
  @ApiResponse({ 
    status: 200, 
    description: 'Marathon updated successfully',
    type: MarathonResponseDto
  })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @ApiBody({ type: UpdateMarathonDto })
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  update(@Param('id') id: string, @Body() updateMarathonDto: UpdateMarathonDto) {
    return this.marathonService.update(id, updateMarathonDto);
  }

  @ApiOperation({ summary: 'Delete marathon' })
  @ApiResponse({ 
    status: 200, 
    description: 'Marathon deleted successfully',
    schema: {
      example: {
        message: 'Marathon deleted successfully'
      }
    }
  })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  remove(@Param('id') id: string) {
    return this.marathonService.remove(id);
  }

  @ApiOperation({ summary: 'Join a marathon' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns payment URL for marathon registration',
    schema: {
      example: {
        paymentUrl: 'https://nowpayments.io/payment/...'
      }
    }
  })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @Post(':id/join')
  @UseGuards(AuthGuard('jwt'))
  async joinMarathon(@Param('id') id: string, @Req() req: any) {
    return this.paymentService.createMarathonPayment(req.user.id, id);
  }

  @ApiOperation({ summary: 'Cancel marathon participation' })
  @ApiResponse({ 
    status: 200, 
    description: 'Participation cancelled successfully and refund processed',
    type: CancelMarathonResponseDto
  })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @Delete(':id/participation')
  @UseGuards(AuthGuard('jwt'))
  async cancelParticipation(@Param('id') id: string, @Req() req: any) {
    return this.marathonService.cancelParticipation(req.user.id, id);
  }

  @ApiOperation({ summary: 'Get marathon leaderboard (public endpoint, authentication optional)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns leaderboard sorted by P&L',
    type: MarathonLeaderboardResponseDto
  })
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @Get(':id/leaderboard')
  async getMarathonLeaderboard(@Param('id') id: string): Promise<MarathonLeaderboardResponseDto> {
    return await this.marathonService.getMarathonLeaderboard(id);
  }

  @ApiOperation({ summary: 'Get P&L history for marathon participants (public endpoint, authentication optional)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns P&L history for all participants',
    type: MarathonPnLHistoryResponseDto
  })
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'Start date (ISO string)', example: '2024-01-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'End date (ISO string)', example: '2024-12-31T23:59:59Z' })
  @Get(':id/pnl-history')
  async getMarathonPnLHistory(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<MarathonPnLHistoryResponseDto> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return await this.marathonService.getMarathonPnLHistory(id, fromDate, toDate);
  }

  @ApiOperation({ summary: 'Get trade history for a specific participant (public endpoint, authentication optional)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns trade history for the participant',
    type: ParticipantTradeHistoryDto
  })
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @ApiParam({ name: 'participantId', description: 'Participant ID' })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'Start date (ISO string)', example: '2024-01-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'End date (ISO string)', example: '2024-12-31T23:59:59Z' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of trades', example: 100 })
  @Get(':id/participants/:participantId/trade-history')
  async getParticipantTradeHistory(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ): Promise<ParticipantTradeHistoryDto> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const currentUserId = req.user?.id;
    const participant = await this.marathonService.getParticipantByIdInMarathon(id, participantId);
    const isPublic = !currentUserId || currentUserId !== participant.user.id;
    return await this.marathonService.getParticipantTradeHistory(id, participantId, fromDate, toDate, limitNum, isPublic);
  }

  @ApiOperation({ summary: 'Get trade history for marathon participants (public endpoint, authentication optional)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns trade history for all participants',
    type: MarathonTradeHistoryResponseDto
  })
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'Start date (ISO string)', example: '2024-01-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'End date (ISO string)', example: '2024-12-31T23:59:59Z' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of trades per participant', example: 100 })
  @Get(':id/trade-history')
  async getMarathonTradeHistory(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ): Promise<MarathonTradeHistoryResponseDto> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return await this.marathonService.getMarathonTradeHistory(id, fromDate, toDate, limitNum);
  }

  @ApiOperation({ 
    summary: 'Get dashboard data for a user (public endpoint, authentication optional)',
    description: `
Returns dashboard data in the format matching dashboard.json structure.

**Public Access:**
- When accessed by another user (public), includes user details (name, email, social media links)
- When accessed by the user themselves, user details are not included

**Data Included:**
- Trades winrate (total, successful, stopped trades)
- Currency pairs statistics
- Currency pairs treemap (by trades and performance)
- Currency pairs winrate chart data
- Trades short/long distribution
- Best marathons (top 5 finished marathons by rank)
- Last ongoing marathon participation
- Last 5 trades
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns dashboard data',
    type: DashboardResponseDto
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Get('users/:userId/analysis')
  async getUserDashboard(
    @Param('userId') userId: string,
    @Req() req: any,
  ): Promise<DashboardResponseDto> {
    const currentUserId = req.user?.id;
    const isPublic = !currentUserId || currentUserId !== userId;
    return await this.marathonService.getUserDashboard(userId, isPublic);
  }

  @ApiOperation({ 
    summary: 'Get live participant analysis data (public endpoint, authentication optional)',
    description: `
Returns participant analysis data in live.json format.

**Public Access:**
- When accessed by another user (public), includes user details (name, email, social media links)
- When accessed by the participant themselves, user details are not included

**Data Included:**
- Marathon information (id, name, isLive, dates, rank, participants)
- Performance metrics (trades, winrate, equity, balance, profit/loss)
- Risk metrics (risk float, drawdown)
- Trade history with status (Win/Loss/Stopped)
- Currency pairs statistics
- Trades short/long distribution
- Equity/Balance history chart data
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns live participant analysis data',
    type: LiveResponseDto
  })
  @ApiParam({ name: 'marathonId', description: 'Marathon ID' })
  @ApiParam({ name: 'participantId', description: 'Participant ID' })
  @Get(':marathonId/participants/:participantId/analysis')
  async getParticipantAnalysis(
    @Param('marathonId') marathonId: string,
    @Param('participantId') participantId: string,
    @Req() req: any,
  ): Promise<LiveResponseDto> {
    const currentUserId = req.user?.id;
    const participant = await this.marathonService.getParticipantByIdInMarathon(marathonId, participantId);
    const isPublic = !currentUserId || currentUserId !== participant.user.id;
    return await this.marathonService.getParticipantLiveAnalysis(marathonId, participantId, isPublic);
  }

  @ApiOperation({ 
    summary: 'Get my analysis for a marathon (authenticated endpoint)',
    description: `
Returns the authenticated user's analysis data for the specified marathon without needing to provide participant ID.

**Data Included:**
- Marathon information (id, name, isLive, dates, rank, participants)
- Performance metrics (trades, winrate, equity, balance, profit/loss)
- Risk metrics (risk float, drawdown)
- Trade history with status (Win/Loss/Stopped)
- Currency pairs statistics
- Trades short/long distribution
- Equity/Balance history chart data
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns your analysis data for this marathon',
    type: LiveResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'You are not a participant in this marathon'
  })
  @ApiParam({ name: 'marathonId', description: 'Marathon ID' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get(':marathonId/my-analysis')
  async getMyMarathonAnalysis(
    @Param('marathonId') marathonId: string,
    @Req() req: any,
  ): Promise<LiveResponseDto> {
    const userId = req.user.id;
    const participant = await this.marathonService.getParticipantByUserInMarathon(marathonId, userId);
    // isPublic is false since it's the user's own data
    return await this.marathonService.getParticipantLiveAnalysis(marathonId, participant.id, false);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ 
    summary: 'Get RabbitMQ connection health status',
    description: 'Returns the health status of RabbitMQ connection, message count, and snapshot statistics'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'RabbitMQ health status',
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'Whether RabbitMQ is enabled via RABBITMQ_ENABLED env variable' },
        connected: { type: 'boolean', description: 'Whether RabbitMQ is connected' },
        queueName: { type: 'string', description: 'Name of the RabbitMQ queue' },
        messageCount: { type: 'number', description: 'Total messages processed' },
        snapshotCount: { type: 'number', description: 'Number of active account snapshots' },
        lastMessageTime: { type: 'string', format: 'date-time', description: 'Time of last message received', nullable: true },
      }
    }
  })
  @Get('rabbitmq-health')
  async getRabbitMQHealth() {
    return await this.liveAccountDataService.getHealth();
  }

  @ApiOperation({
    summary: 'Get WebSocket subscription statistics',
    description: 'Returns information about active WebSocket connections and RabbitMQ subscriptions'
  })
  @ApiResponse({
    status: 200,
    description: 'WebSocket subscription statistics',
    schema: {
      type: 'object',
      properties: {
        connectedClients: { type: 'number', description: 'Number of connected WebSocket clients' },
        activeMarathons: { type: 'number', description: 'Number of marathons with active subscriptions' },
        isListeningToRabbitMQ: { type: 'boolean', description: 'Whether Gateway is listening to RabbitMQ' },
        marathonSubscriptions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              marathonId: { type: 'string' },
              subscribers: { type: 'number' }
            }
          }
        }
      }
    }
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('websocket-stats')
  getWebSocketStats() {
    return this.liveDataGateway.getSubscriptionStats();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ 
    summary: 'WebSocket Live Data Documentation',
    description: `
## Marathon Live Data WebSocket

Connect to real-time MetaTrader account data streams with calculated leaderboard positions and participant analysis.

### Connection URL
\`\`\`
ws://localhost:3000/marathon-live?token=YOUR_JWT_TOKEN
\`\`\`

**Note:** Use Socket.IO client library (not raw WebSocket).

### Authentication
Pass your JWT token as a query parameter when connecting. The token will be verified on connection.

### Events to Emit (Client → Server)

#### 1. subscribe_marathon
Subscribe to all participants in a marathon. Receives batched updates (200ms intervals) when participant data changes.
\`\`\`json
{
  "marathonId": "uuid-of-marathon"
}
\`\`\`

#### 2. unsubscribe_marathon
Unsubscribe from a marathon.
\`\`\`json
{
  "marathonId": "uuid-of-marathon"
}
\`\`\`

#### 3. subscribe_participant
Subscribe to a specific participant's analysis data. Receives real-time analysis updates.
\`\`\`json
{
  "participantId": "uuid-of-participant"
}
\`\`\`

#### 4. unsubscribe_participant
Unsubscribe from a participant.
\`\`\`json
{
  "participantId": "uuid-of-participant"
}
\`\`\`

#### 5. subscribe_my_live
Subscribe to your own live data for a marathon. Only works if you are a participant in the marathon. Receives analysis updates, positions, and orders.
\`\`\`json
{
  "marathonId": "uuid-of-marathon"
}
\`\`\`

#### 6. unsubscribe_my_live
Unsubscribe from your own live data.
\`\`\`json
{
  "marathonId": "uuid-of-marathon"
}
\`\`\`

### Events to Listen (Server → Client)

#### 1. connected
Confirmation of successful connection.
\`\`\`json
{
  "message": "Connected to Marathon Live Data stream"
}
\`\`\`

#### 2. subscribed
Confirmation of subscription. Includes subscription type and ID.
\`\`\`json
{
  "type": "marathon" | "participant" | "my_live",
  "marathonId": "uuid" (if type is marathon or my_live),
  "participantId": "uuid" (if type is participant or my_live),
  "message": "Subscribed to..."
}
\`\`\`

#### 3. unsubscribed
Confirmation of unsubscription.
\`\`\`json
{
  "type": "marathon" | "participant" | "my_live",
  "marathonId": "uuid" (if type is marathon or my_live),
  "participantId": "uuid" (if type is participant),
  "message": "Unsubscribed from..."
}
\`\`\`

#### 4. marathon_participants_update
Batched updates for marathon participants (sent every 200ms when changes occur). Only includes changed fields (diff format).
\`\`\`json
{
  "type": "marathon_participants_update",
  "marathonId": "uuid",
  "participants": [
    {
      "participantId": "uuid",
      "balance": 10150.25,  // Only included if changed
      "equity": 10200.50,    // Only included if changed
      "profit": 150.25,      // Only included if changed
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ]
}
\`\`\`

#### 5. participant_analysis
Full analysis data for a subscribed participant. Sent on subscription and when data updates.
\`\`\`json
{
  "type": "participant_analysis",
  "participantId": "uuid",
  "data": {
    "marathon": { /* marathon info */ },
    "performance": { /* performance metrics */ },
    "trades": [ /* trade history */ ],
    "currencyPairs": { /* currency pairs stats */ },
    "equityHistory": [ /* equity chart data */ ],
    "balanceHistory": [ /* balance chart data */ ]
  }
}
\`\`\`

#### 6. my_live_analysis
Full analysis data for your own live data. Sent on subscription and when data updates.
\`\`\`json
{
  "type": "my_live_analysis",
  "marathonId": "uuid",
  "participantId": "uuid",
  "data": {
    "marathon": { /* marathon info */ },
    "performance": { /* performance metrics */ },
    "trades": [ /* trade history */ ],
    "currencyPairs": { /* currency pairs stats */ },
    "equityHistory": [ /* equity chart data */ ],
    "balanceHistory": [ /* balance chart data */ ]
  }
}
\`\`\`

#### 7. my_live_positions_update
Real-time positions update for your own account (only for my_live subscriptions).
\`\`\`json
{
  "marathonId": "uuid",
  "participantId": "uuid",
  "positions": [ /* array of open positions */ ],
  "timestamp": "2024-01-01T12:00:00Z"
}
\`\`\`

#### 8. my_live_orders_update
Real-time orders update for your own account (only for my_live subscriptions).
\`\`\`json
{
  "marathonId": "uuid",
  "participantId": "uuid",
  "orders": [ /* array of pending orders */ ],
  "timestamp": "2024-01-01T12:00:00Z"
}
\`\`\`

#### 9. error
Error message.
\`\`\`json
{
  "message": "Error description"
}
\`\`\`

### Example Client Code (JavaScript)

\`\`\`javascript
import io from 'socket.io-client';

const token = 'your-jwt-token';
const socket = io('http://localhost:3000/marathon-live', {
  query: { token }
});

// Connection confirmation
socket.on('connected', (data) => {
  console.log('Connected:', data);
  
  // Subscribe to marathon (receives batched participant updates)
  socket.emit('subscribe_marathon', { marathonId: 'marathon-uuid' });
  
  // Subscribe to specific participant (receives analysis updates)
  socket.emit('subscribe_participant', { participantId: 'participant-uuid' });
  
  // Subscribe to your own live data (receives analysis, positions, orders)
  socket.emit('subscribe_my_live', { marathonId: 'marathon-uuid' });
});

// Marathon updates (batched, every 200ms when changes occur)
socket.on('marathon_participants_update', (update) => {
  console.log('Marathon participants updated:', update);
  update.participants.forEach(participant => {
    console.log(\`Participant \${participant.participantId}: \${participant.equity}\`);
  });
});

// Participant analysis updates
socket.on('participant_analysis', (data) => {
  console.log('Participant analysis:', data);
});

// My live analysis updates
socket.on('my_live_analysis', (data) => {
  console.log('My live analysis:', data);
});

// My live positions update
socket.on('my_live_positions_update', (data) => {
  console.log('My positions updated:', data.positions);
});

// My live orders update
socket.on('my_live_orders_update', (data) => {
  console.log('My orders updated:', data.orders);
});

// Subscription confirmations
socket.on('subscribed', (data) => {
  console.log('Subscribed:', data);
});

socket.on('unsubscribed', (data) => {
  console.log('Unsubscribed:', data);
});

// Error handling
socket.on('error', (error) => {
  console.error('Error:', error);
});

// Disconnect handling
socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
\`\`\`

### Performance Notes

- **Marathon subscriptions**: Updates are batched every 200ms to reduce network traffic
- **Analysis data**: Cached for 5 seconds to reduce database load
- **Diff format**: Only changed fields are sent in marathon_participants_update
- **Smart subscriptions**: Gateway only listens to RabbitMQ when there are active subscriptions
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'WebSocket documentation - not an actual endpoint'
  })
  @Get('websocket-docs')
  getWebSocketDocs() {
    return {
      message: 'This endpoint provides documentation for the WebSocket API. See the Swagger UI for details.',
      connectionUrl: 'ws://localhost:3000/marathon-live?token=YOUR_JWT_TOKEN',
      namespace: 'marathon-live',
      documentation: 'See detailed documentation in WEBSOCKET.md',
    };
  }
} 