import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { GetWithdrawalsDto } from './dto/get-withdrawals.dto';
import { WithdrawalResponseDto } from './dto/withdrawal-response.dto';
import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalStatus } from './enums/withdrawal-status.enum';

@ApiTags('Withdrawals')
@ApiBearerAuth()
@Controller('withdrawals')
@UseGuards(AuthGuard('jwt'))
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @ApiOperation({ summary: 'Create a new withdrawal request' })
  @ApiResponse({
    status: 201,
    description: 'Withdrawal request created successfully',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Insufficient balance or invalid wallet',
  })
  @ApiBody({ type: CreateWithdrawalDto })
  @Post()
  async create(
    @GetUser('id') userId: string,
    @Body() createWithdrawalDto: CreateWithdrawalDto,
  ): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.withdrawalsService.create(userId, createWithdrawalDto);
    
    return {
      id: withdrawal.id,
      amount: Number(withdrawal.amount),
      status: withdrawal.status,
      transactionHash: withdrawal.transactionHash,
      description: withdrawal.description,
      transactionNumber: withdrawal.transactionNumber,
      wallet: {
        id: withdrawal.wallet.id,
        name: withdrawal.wallet.name,
        address: withdrawal.wallet.address,
        network: withdrawal.wallet.network,
        currency: withdrawal.wallet.currency,
      },
      createdAt: withdrawal.createdAt,
      updatedAt: withdrawal.updatedAt,
      processedAt: withdrawal.processedAt,
    };
  }

  @ApiOperation({ summary: 'Get all withdrawal requests for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns filtered and paginated withdrawal requests',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/WithdrawalResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: WithdrawalStatus,
    description: 'Filter by withdrawal status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by transaction number or description',
  })
  @Get()
  async findAll(
    @GetUser('id') userId: string,
    @Query() query: GetWithdrawalsDto,
  ): Promise<PaginatedResponseDto<WithdrawalResponseDto>> {
    const pageNum = query.page && Number(query.page) > 0 ? Number(query.page) : 1;
    const limitNum = query.limit && Number(query.limit) > 0 ? Number(query.limit) : 10;

    const { withdrawals, total } = await this.withdrawalsService.findAllByUser(
      userId,
      pageNum,
      limitNum,
      query.status,
      query.search,
    );

    const data = withdrawals.map((withdrawal) => ({
      id: withdrawal.id,
      amount: Number(withdrawal.amount),
      status: withdrawal.status,
      transactionHash: withdrawal.transactionHash,
      description: withdrawal.description,
      transactionNumber: withdrawal.transactionNumber,
      wallet: {
        id: withdrawal.wallet.id,
        name: withdrawal.wallet.name,
        address: withdrawal.wallet.address,
        network: withdrawal.wallet.network,
        currency: withdrawal.wallet.currency,
      },
      createdAt: withdrawal.createdAt,
      updatedAt: withdrawal.updatedAt,
      processedAt: withdrawal.processedAt,
    }));

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  @ApiOperation({ summary: 'Get withdrawal request by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the withdrawal request',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Withdrawal request not found',
  })
  @ApiParam({ name: 'id', description: 'Withdrawal ID' })
  @Get(':id')
  async findOne(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.withdrawalsService.findOne(userId, id);

    return {
      id: withdrawal.id,
      amount: Number(withdrawal.amount),
      status: withdrawal.status,
      transactionHash: withdrawal.transactionHash,
      description: withdrawal.description,
      transactionNumber: withdrawal.transactionNumber,
      wallet: {
        id: withdrawal.wallet.id,
        name: withdrawal.wallet.name,
        address: withdrawal.wallet.address,
        network: withdrawal.wallet.network,
        currency: withdrawal.wallet.currency,
      },
      createdAt: withdrawal.createdAt,
      updatedAt: withdrawal.updatedAt,
      processedAt: withdrawal.processedAt,
    };
  }
}

