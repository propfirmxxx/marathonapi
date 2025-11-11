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
  MarathonResponseDto
} from './dto/marathon-response.dto';
import { UpdateMarathonDto } from './dto/update-marathon.dto';
import { LiveAccountDataService } from './live-account-data.service';
import { MarathonService } from './marathon.service';
import { CancelMarathonResponseDto } from './dto/cancel-marathon.dto';

@ApiTags('Marathons')
@ApiBearerAuth()
@Controller('marathons')
@UseGuards(AuthGuard('jwt'))
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
  @ApiBody({ type: CreateMarathonDto })
  @Post()
  @UseGuards(AdminGuard)
  create(@Body() createMarathonDto: CreateMarathonDto) {
    return this.marathonService.create(createMarathonDto);
  }

  @ApiOperation({ summary: 'Get all marathons with optional filters' })
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
  @ApiQuery({ name: 'myMarathons', required: false, type: Boolean, description: 'Filter marathons where current user is a participant' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by marathon name' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by marathon status' })
  @Get()
  async findAll(
    @Query() query: GetMarathonsDto,
    @GetUser('id') userId?: string,
  ): Promise<PaginatedResponseDto<MarathonResponseDto>> {
    const pageNum = query.page && Number(query.page) > 0 ? Number(query.page) : 1;
    const limitNum = query.limit && Number(query.limit) > 0 ? Number(query.limit) : 10;
    
    const userIdForFilter = query.myMarathons ? userId : undefined;
    
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

  @ApiOperation({ summary: 'Get marathon by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the marathon',
    type: MarathonResponseDto
  })
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @Get(':id')
  async findOne(@Param('id') id: string, @GetUser('id') userId: string) {
    const isParticipant = await this.marathonService.isUserParticipantOfMarathon(id, userId);
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
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @ApiBody({ type: UpdateMarathonDto })
  @Patch(':id')
  @UseGuards(AdminGuard)
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
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @Delete(':id')
  @UseGuards(AdminGuard)
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
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @Post(':id/join')
  async joinMarathon(@Param('id') id: string, @Req() req: any) {
    return this.paymentService.createMarathonPayment(req.user.id, id);
  }

  @ApiOperation({ summary: 'Cancel marathon participation (before start)' })
  @ApiResponse({
    status: 200,
    description: 'Cancels participation and refunds 80% entry fee to virtual wallet',
    type: CancelMarathonResponseDto,
  })
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @Post(':id/cancel')
  async cancelParticipation(@Param('id') id: string, @Req() req: any): Promise<CancelMarathonResponseDto> {
    return this.marathonService.cancelParticipation(req.user.id, id);
  }

  @ApiOperation({ summary: 'Get marathon participants' })
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
} 