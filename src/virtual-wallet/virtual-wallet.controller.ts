import { Controller, Get, Query, UseGuards, Post, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { GetUser } from '@/auth/decorators/get-user.decorator';
import { AdminGuard } from '@/auth/guards/admin.guard';
import { VirtualWalletService } from './virtual-wallet.service';
import { GetVirtualWalletTransactionsDto } from './dto/get-transactions.dto';
import {
  VirtualWalletBalanceResponseDto,
  VirtualWalletResponseDto,
  VirtualWalletTransactionResponseDto,
} from './dto/virtual-wallet-response.dto';

@ApiTags('Virtual Wallet')
@ApiBearerAuth()
@Controller('virtual-wallet')
@UseGuards(AuthGuard('jwt'))
export class VirtualWalletController {
  constructor(private readonly virtualWalletService: VirtualWalletService) {}

  @ApiOperation({ summary: 'Get or create the current user virtual wallet' })
  @ApiResponse({
    status: 200,
    description: 'Returns the virtual wallet',
    type: VirtualWalletResponseDto,
  })
  @Get()
  async getWallet(@GetUser('id') userId: string): Promise<VirtualWalletResponseDto> {
    const wallet = await this.virtualWalletService.getOrCreateWallet(userId);

    return {
      id: wallet.id,
      balance: Number(wallet.balance),
      currency: wallet.currency,
      isFrozen: wallet.isFrozen,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  @ApiOperation({ summary: 'Get the current user virtual wallet balance' })
  @ApiResponse({
    status: 200,
    description: 'Returns the virtual wallet balance',
    type: VirtualWalletBalanceResponseDto,
  })
  @Get('balance')
  async getBalance(@GetUser('id') userId: string): Promise<VirtualWalletBalanceResponseDto> {
    return {
      balance: await this.virtualWalletService.getBalance(userId),
    };
  }

  @ApiOperation({ summary: 'Get recent virtual wallet transactions' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of recent transactions',
    type: VirtualWalletTransactionResponseDto,
    isArray: true,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of transactions to retrieve (default 50)',
  })
  @Get('transactions')
  async getTransactions(
    @GetUser('id') userId: string,
    @Query() query: GetVirtualWalletTransactionsDto,
  ): Promise<VirtualWalletTransactionResponseDto[]> {
    const limit = query.limit ?? 50;
    const transactions = await this.virtualWalletService.getTransactions(userId, limit);

    return transactions.map(transaction => ({
      id: transaction.id,
      type: transaction.type,
      amount: Number(transaction.amount),
      balanceBefore: Number(transaction.balanceBefore),
      balanceAfter: Number(transaction.balanceAfter),
      referenceType: transaction.referenceType,
      referenceId: transaction.referenceId,
      description: transaction.description,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
    }));
  }

  @ApiOperation({ summary: 'Freeze virtual wallet (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Virtual wallet frozen successfully',
    type: VirtualWalletResponseDto,
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Post('admin/:userId/freeze')
  @UseGuards(AdminGuard)
  async freezeWallet(@Param('userId') userId: string): Promise<VirtualWalletResponseDto> {
    const wallet = await this.virtualWalletService.freezeWallet(userId);
    return {
      id: wallet.id,
      balance: Number(wallet.balance),
      currency: wallet.currency,
      isFrozen: wallet.isFrozen,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  @ApiOperation({ summary: 'Unfreeze virtual wallet (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Virtual wallet unfrozen successfully',
    type: VirtualWalletResponseDto,
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Post('admin/:userId/unfreeze')
  @UseGuards(AdminGuard)
  async unfreezeWallet(@Param('userId') userId: string): Promise<VirtualWalletResponseDto> {
    const wallet = await this.virtualWalletService.unfreezeWallet(userId);
    return {
      id: wallet.id,
      balance: Number(wallet.balance),
      currency: wallet.currency,
      isFrozen: wallet.isFrozen,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}

