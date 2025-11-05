import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { MarathonService } from './marathon.service';
import { CreateMarathonDto } from './dto/create-marathon.dto';
import { UpdateMarathonDto } from './dto/update-marathon.dto';
import { GetMarathonsDto } from './dto/get-marathons.dto';
import { UserRole } from '@/users/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '@/auth/guards/admin.guard';
import { GetUser } from '@/auth/decorators/get-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { 
  MarathonResponseDto, 
  MarathonListResponseDto, 
  MarathonParticipantResponseDto, 
  MarathonParticipantListResponseDto 
} from './dto/marathon-response.dto';
import { PaymentService } from '../payment/payment.service';
import { PaginatedResponseDto } from '@/common/dto/paginated-response.dto';

@ApiTags('Marathons')
@ApiBearerAuth()
@Controller('marathons')
@UseGuards(AuthGuard('jwt'))
export class MarathonController {
  constructor(
    private readonly marathonService: MarathonService,
    private readonly paymentService: PaymentService,
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
    type: PaginatedResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'myMarathons', required: false, type: Boolean, description: 'Filter marathons where current user is a participant' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by marathon name' })
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
  findOne(@Param('id') id: string) {
    return this.marathonService.findOne(id);
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

  @ApiOperation({ summary: 'Get marathon participants' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all participants of the marathon',
    type: MarathonParticipantListResponseDto
  })
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @Get(':id/participants')
  async getMarathonParticipants(@Param('id') id: string) {
    const { participants, total } = await this.marathonService.getMarathonParticipants(id);
    
    return {
      items: participants.map(p => ({
        id: p.id,
        marathonId: p.marathon.id,
        userId: p.user.id,
        joinedAt: p.createdAt,
        status: p.isActive ? 'active' : 'inactive',
        user: {
          id: p.user.id,
          firstName: p.user.profile?.firstName || '',
          lastName: p.user.profile?.lastName || '',
          email: p.user.email || '',
        },
        metaTraderAccountId: p.metaTraderAccountId,
      })),
      total,
    };
  }
} 