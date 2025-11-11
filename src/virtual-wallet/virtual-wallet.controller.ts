import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@/auth/decorators/get-user.decorator';
import { VirtualWalletService } from './virtual-wallet.service';
import { GetVirtualWalletTransactionsDto } from './dto/get-transactions.dto';

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
  })
  @Get()
  async getWallet(@GetUser('id') userId: string) {
    const wallet = await this.virtualWalletService.getOrCreateWallet(userId);

    return {
      id: wallet.id,
      balance: Number(wallet.balance),
      currency: wallet.currency,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  @ApiOperation({ summary: 'Get the current user virtual wallet balance' })
  @ApiResponse({
    status: 200,
    description: 'Returns the virtual wallet balance',
  })
  @Get('balance')
  async getBalance(@GetUser('id') userId: string) {
    return {
      balance: await this.virtualWalletService.getBalance(userId),
    };
  }

  @ApiOperation({ summary: 'Get recent virtual wallet transactions' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of recent transactions',
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
  ) {
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
}

