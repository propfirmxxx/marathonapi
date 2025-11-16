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
  MarathonParticipantListResponseDto,
  MarathonResponseDto,
  MarathonLeaderboardResponseDto,
  MarathonPnLHistoryResponseDto,
  MarathonTransactionHistoryResponseDto,
} from './dto/marathon-response.dto';
import { UpdateMarathonDto } from './dto/update-marathon.dto';
import { LiveAccountDataService } from './live-account-data.service';
import { MarathonService } from './marathon.service';
import { CancelMarathonResponseDto } from './dto/cancel-marathon.dto';
import { MarathonStatus } from './enums/marathon-status.enum';

@ApiTags('Marathons')
@Controller('marathons')
export class MarathonController {
  constructor(
    private readonly marathonService: MarathonService,
    private readonly paymentService: PaymentService,
    private readonly liveAccountDataService: LiveAccountDataService,
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

    return {
      data: marathons as any,
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

  @ApiOperation({ summary: 'Cancel marathon participation (before start)' })
  @ApiResponse({
    status: 200,
    description: 'Cancels participation and refunds 80% entry fee to virtual wallet',
    type: CancelMarathonResponseDto,
  })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @Post(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  async cancelParticipation(@Param('id') id: string, @Req() req: any): Promise<CancelMarathonResponseDto> {
    return this.marathonService.cancelParticipation(req.user.id, id);
  }

  @ApiOperation({ summary: 'Get marathon participants (public endpoint, authentication optional)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all participants of the marathon',
    type: MarathonParticipantListResponseDto
  })
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @Get(':id/participants')
  async getMarathonParticipants(@Param('id') id: string) {
    const { participants, total, marathon } = await this.marathonService.getMarathonParticipants(id);
    const marathonStarted = marathon.startDate ? marathon.startDate.getTime() <= Date.now() : false;

    const items = participants.map((p) => {
      const marathonId = p.marathon?.id ?? marathon.id;
      const user = p.user;
      const profile = user?.profile;

      const base = {
        id: p.id,
        marathonId,
        userId: user?.id ?? '',
        joinedAt: p.createdAt,
        status: p.isActive ? 'active' : 'inactive',
        user: {
          id: user?.id ?? '',
          firstName: profile?.firstName || '',
          lastName: profile?.lastName || '',
          email: user?.email || '',
        },
        metaTraderAccountId: p.metaTraderAccountId,
      };

      if (!marathonStarted) {
        return base;
      }

      const account = p.metaTraderAccount;
      const snapshot = account?.login ? this.liveAccountDataService.getSnapshot(account.login) : null;

      return {
        ...base,
        currentBalance: snapshot?.balance ?? null,
        profit: snapshot?.profit ?? null,
        trades: snapshot?.positions ? snapshot.positions.length : null,
        equity: snapshot?.equity ?? null,
        metaTraderAccount: account
          ? {
              id: account.id,
              login: account.login,
              investorPassword: account.investorPassword ?? null,
              server: account.server,
              platform: account.platform,
              status: account.status,
              updatedAt: account.updatedAt ?? null,
            }
          : null,
        liveData: snapshot
          ? {
              balance: snapshot.balance ?? null,
              equity: snapshot.equity ?? null,
              profit: snapshot.profit ?? null,
              margin: snapshot.margin ?? null,
              freeMargin: snapshot.freeMargin ?? null,
              currency: snapshot.currency ?? null,
              positions: snapshot.positions ?? null,
              orders: snapshot.orders ?? null,
              updatedAt: snapshot.updatedAt ?? null,
            }
          : null,
      };
    });

    return {
      items,
      total,
      marathonStarted,
    };
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

  @ApiOperation({ summary: 'Get transaction history for marathon participants (public endpoint, authentication optional)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns transaction history for all participants',
    type: MarathonTransactionHistoryResponseDto
  })
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'Start date (ISO string)', example: '2024-01-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'End date (ISO string)', example: '2024-12-31T23:59:59Z' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of transactions per participant', example: 100 })
  @Get(':id/transactions')
  async getMarathonTransactionHistory(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ): Promise<MarathonTransactionHistoryResponseDto> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return await this.marathonService.getMarathonTransactionHistory(id, fromDate, toDate, limitNum);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ 
    summary: 'WebSocket Live Data Documentation',
    description: `
## Marathon Live Data WebSocket

Connect to real-time MetaTrader account data streams with calculated leaderboard positions.

### Connection URL
\`\`\`
ws://localhost:3000/marathon-live?token=YOUR_JWT_TOKEN
\`\`\`

### Authentication
Pass your JWT token as a query parameter when connecting.

### Events to Emit (Client → Server)

#### 1. subscribe_marathon
Subscribe to all accounts in a marathon.
\`\`\`json
{
  "marathonId": "uuid-of-marathon"
}
\`\`\`

#### 2. subscribe_account
Subscribe to a specific account.
\`\`\`json
{
  "accountLogin": "261632689"
}
\`\`\`

#### 3. unsubscribe_marathon
Unsubscribe from a marathon.
\`\`\`json
{
  "marathonId": "uuid-of-marathon"
}
\`\`\`

#### 4. unsubscribe_account
Unsubscribe from an account.
\`\`\`json
{
  "accountLogin": "261632689"
}
\`\`\`

### Events to Listen (Server → Client)

#### 1. connected
Confirmation of successful connection.

#### 2. marathon_leaderboard
Full leaderboard data for a subscribed marathon.
\`\`\`json
{
  "marathonId": "uuid",
  "marathonName": "Marathon Name",
  "totalParticipants": 10,
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
      "positions": [],
      "orders": [],
      "updatedAt": "2024-01-01T12:00:00Z",
      "joinedAt": "2024-01-01T10:00:00Z"
    }
  ],
  "updatedAt": "2024-01-01T12:00:00Z"
}
\`\`\`

#### 3. account_update
Individual account update with calculated leaderboard position.
\`\`\`json
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
\`\`\`

#### 4. subscribed
Confirmation of subscription.

#### 5. unsubscribed
Confirmation of unsubscription.

#### 6. error
Error message.

### Example Client Code (JavaScript)

\`\`\`javascript
import io from 'socket.io-client';

const token = 'your-jwt-token';
const socket = io('http://localhost:3000/marathon-live', {
  query: { token }
});

socket.on('connected', (data) => {
  console.log('Connected:', data);
  
  // Subscribe to marathon
  socket.emit('subscribe_marathon', { marathonId: 'marathon-uuid' });
  
  // Or subscribe to specific account
  socket.emit('subscribe_account', { accountLogin: '261632689' });
});

socket.on('marathon_leaderboard', (leaderboard) => {
  console.log('Leaderboard updated:', leaderboard);
});

socket.on('account_update', (entry) => {
  console.log('Account updated:', entry);
});

socket.on('error', (error) => {
  console.error('Error:', error);
});
\`\`\`
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
} 