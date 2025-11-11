import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Withdrawal } from './entities/withdrawal.entity';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { WithdrawalStatus } from './enums/withdrawal-status.enum';
import { VirtualWalletService } from '@/virtual-wallet/virtual-wallet.service';
import { VirtualWalletTransactionType } from '@/virtual-wallet/entities/virtual-wallet-transaction.entity';
import { WalletService } from '@/wallet/wallet.service';

@Injectable()
export class WithdrawalsService {
  private readonly logger = new Logger(WithdrawalsService.name);

  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    private readonly virtualWalletService: VirtualWalletService,
    private readonly walletService: WalletService,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, createWithdrawalDto: CreateWithdrawalDto): Promise<Withdrawal> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify the wallet belongs to the user
      const wallet = await this.walletService.findOne(userId, createWithdrawalDto.walletId);
      if (!wallet) {
        throw new NotFoundException('Wallet not found or does not belong to you');
      }

      // Check if user has sufficient balance
      await this.virtualWalletService.assertSufficientBalance(userId, createWithdrawalDto.amount);

      // Debit the virtual wallet
      const transaction = await this.virtualWalletService.debit(
        {
          userId,
          amount: createWithdrawalDto.amount,
          type: VirtualWalletTransactionType.WITHDRAWAL,
          referenceType: 'withdrawal_request',
          referenceId: null, // Will update after creating withdrawal
          description: `Withdrawal request to ${wallet.name} (${wallet.network})`,
          metadata: {
            walletId: wallet.id,
            walletAddress: wallet.address,
            network: wallet.network,
          },
        },
        queryRunner,
      );

      // Generate unique transaction number
      const transactionNumber = await this.generateTransactionNumber();

      // Create withdrawal record
      const withdrawal = queryRunner.manager.create(Withdrawal, {
        userId,
        walletId: createWithdrawalDto.walletId,
        amount: createWithdrawalDto.amount,
        status: WithdrawalStatus.UNDER_REVIEW,
        transactionNumber,
        virtualWalletTransactionId: transaction.id,
      });

      const savedWithdrawal = await queryRunner.manager.save(Withdrawal, withdrawal);

      await queryRunner.commitTransaction();

      // Load the wallet relation
      return await this.withdrawalRepository.findOne({
        where: { id: savedWithdrawal.id },
        relations: ['wallet'],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: WithdrawalStatus,
    search?: string,
  ): Promise<{ withdrawals: Withdrawal[]; total: number }> {
    let query = this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .leftJoinAndSelect('withdrawal.wallet', 'wallet')
      .where('withdrawal.user_id = :userId', { userId })
      .orderBy('withdrawal.created_at', 'DESC');

    if (status) {
      query = query.andWhere('withdrawal.status = :status', { status });
    }

    if (search) {
      query = query.andWhere(
        '(LOWER(withdrawal.transaction_number) LIKE LOWER(:search) OR LOWER(withdrawal.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    // Get total count before pagination
    const total = await query.getCount();

    // Apply pagination
    const withdrawals = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { withdrawals, total };
  }

  async findOne(userId: string, id: string): Promise<Withdrawal> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id, userId },
      relations: ['wallet'],
    });

    if (!withdrawal) {
      throw new NotFoundException(`Withdrawal with ID ${id} not found`);
    }

    return withdrawal;
  }

  private async generateTransactionNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Get count of withdrawals today
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    
    const count = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .where('withdrawal.created_at >= :startOfDay', { startOfDay })
      .andWhere('withdrawal.created_at < :endOfDay', { endOfDay })
      .getCount();

    const sequence = String(count + 1).padStart(4, '0');
    return `WD-${year}${month}${day}-${sequence}`;
  }
}

