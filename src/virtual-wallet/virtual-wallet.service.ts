import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, QueryRunner, Repository } from 'typeorm';
import { VirtualWallet } from './entities/virtual-wallet.entity';
import {
  VirtualWalletTransaction,
  VirtualWalletTransactionType,
} from './entities/virtual-wallet-transaction.entity';
import { WalletAdjustmentOptions } from './dto/wallet-adjustment.dto';

@Injectable()
export class VirtualWalletService {
  constructor(
    @InjectRepository(VirtualWallet)
    private readonly walletRepository: Repository<VirtualWallet>,
    @InjectRepository(VirtualWalletTransaction)
    private readonly transactionRepository: Repository<VirtualWalletTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async getWalletByUserId(userId: string): Promise<VirtualWallet | null> {
    return this.walletRepository.findOne({ where: { userId } });
  }

  async getOrCreateWallet(userId: string): Promise<VirtualWallet> {
    const existing = await this.getWalletByUserId(userId);
    if (existing) {
      return existing;
    }

    const wallet = this.walletRepository.create({
      userId,
      balance: 0,
      currency: 'USD',
    });

    return this.walletRepository.save(wallet);
  }

  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getWalletByUserId(userId);
    return wallet ? Number(wallet.balance) : 0;
  }

  async getTransactions(userId: string, limit = 50): Promise<VirtualWalletTransaction[]> {
    const wallet = await this.getWalletByUserId(userId);
    if (!wallet) {
      return [];
    }

    return this.transactionRepository.find({
      where: { walletId: wallet.id } as FindOptionsWhere<VirtualWalletTransaction>,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async credit(
    options: WalletAdjustmentOptions,
    queryRunner?: QueryRunner,
  ): Promise<VirtualWalletTransaction> {
    if (options.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    return this.adjustBalance(options, 'credit', queryRunner);
  }

  async debit(
    options: WalletAdjustmentOptions,
    queryRunner?: QueryRunner,
  ): Promise<VirtualWalletTransaction> {
    if (options.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    return this.adjustBalance(options, 'debit', queryRunner);
  }

  async assertSufficientBalance(userId: string, amount: number): Promise<void> {
    const wallet = await this.getWalletByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Virtual wallet not found');
    }

    const balance = Number(wallet.balance);
    if (balance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }
  }

  private async adjustBalance(
    options: WalletAdjustmentOptions,
    mode: 'credit' | 'debit',
    existingQueryRunner?: QueryRunner,
  ): Promise<VirtualWalletTransaction> {
    const normalizedAmount = this.normalizeAmount(options.amount);

    const queryRunner = existingQueryRunner ?? this.dataSource.createQueryRunner();
    const createdQueryRunner = !existingQueryRunner;

    if (createdQueryRunner) {
      await queryRunner.connect();
      await queryRunner.startTransaction();
    }

    try {
      let wallet = await queryRunner.manager.findOne(VirtualWallet, {
        where: { userId: options.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        wallet = queryRunner.manager.create(VirtualWallet, {
          userId: options.userId,
          balance: 0,
          currency: 'USD',
        });
        wallet = await queryRunner.manager.save(VirtualWallet, wallet);
      }

      if (options.referenceType && options.referenceId) {
        const existingTransaction = await queryRunner.manager.findOne(VirtualWalletTransaction, {
          where: {
            walletId: wallet.id,
            type: options.type,
            referenceType: options.referenceType,
            referenceId: options.referenceId,
          },
          lock: { mode: 'pessimistic_read' },
        });

        if (existingTransaction) {
          throw new ConflictException('Transaction already processed for this reference');
        }
      }

      const balanceBefore = this.normalizeAmount(Number(wallet.balance));
      const balanceAfter =
        mode === 'credit' ? balanceBefore + normalizedAmount : balanceBefore - normalizedAmount;

      if (balanceAfter < 0) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      wallet.balance = this.normalizeAmount(balanceAfter);

      await queryRunner.manager.save(VirtualWallet, wallet);

      const transaction = queryRunner.manager.create(VirtualWalletTransaction, {
        walletId: wallet.id,
        type: options.type,
        amount: normalizedAmount,
        balanceBefore,
        balanceAfter: wallet.balance,
        referenceType: options.referenceType ?? null,
        referenceId: options.referenceId ?? null,
        description: options.description ?? null,
        metadata: options.metadata ?? null,
      });

      const savedTransaction = await queryRunner.manager.save(VirtualWalletTransaction, transaction);

      if (createdQueryRunner) {
        await queryRunner.commitTransaction();
      }

      return savedTransaction;
    } catch (error) {
      if (createdQueryRunner) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      if (createdQueryRunner) {
        await queryRunner.release();
      }
    }
  }

  private normalizeAmount(amount: number): number {
    const normalized = Number((Math.round(amount * 100) / 100).toFixed(2));

    if (!Number.isFinite(normalized) || normalized < 0) {
      throw new BadRequestException('Invalid amount');
    }

    return normalized;
  }
}

