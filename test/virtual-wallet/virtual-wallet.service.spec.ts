import { ConflictException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { VirtualWallet } from '../../src/users/entities/virtual-wallet.entity';
import {
  VirtualWalletTransaction,
  VirtualWalletTransactionType,
} from '../../src/users/entities/virtual-wallet-transaction.entity';
import { VirtualWalletService } from '../../src/virtual-wallet/virtual-wallet.service';

type MockRepository<T> = Partial<Record<keyof T, jest.Mock>>;

interface MockState {
  wallet: VirtualWallet | null;
  transactions: VirtualWalletTransaction[];
}

const createMockQueryRunner = (state: MockState): QueryRunner => {
  const manager = {
    findOne: jest.fn(async (entity: any, options: any) => {
      if (entity === VirtualWallet) {
        return state.wallet;
      }

      if (entity === VirtualWalletTransaction) {
        if (!options?.where) {
          return null;
        }

        const { walletId, type, referenceType, referenceId } = options.where;

        return state.transactions.find(
          tx =>
            tx.walletId === walletId &&
            tx.type === type &&
            tx.referenceType === referenceType &&
            tx.referenceId === referenceId,
        );
      }

      return null;
    }),
    create: jest.fn((_entity: any, data: any) => ({ ...data })),
    save: jest.fn(async (entity: any, value: any) => {
      if (entity === VirtualWallet) {
        state.wallet = { ...(state.wallet ?? {}), ...value };
        return state.wallet;
      }

      if (entity === VirtualWalletTransaction) {
        state.transactions.push(value);
        return value;
      }

      return value;
    }),
  };

  const queryRunner: Partial<QueryRunner> = {
    manager: manager as any,
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  };

  return queryRunner as QueryRunner;
};

describe('VirtualWalletService', () => {
  let service: VirtualWalletService;
  let dataSource: Partial<DataSource>;
  let state: MockState;
  let queryRunner: QueryRunner;

  beforeEach(() => {
    state = {
      wallet: null,
      transactions: [],
    };

    queryRunner = createMockQueryRunner(state);

    dataSource = {
      createQueryRunner: jest.fn(() => queryRunner),
    } as unknown as DataSource;

    const walletRepository = {} as MockRepository<VirtualWallet>;
    const transactionRepository = {} as MockRepository<VirtualWalletTransaction>;

    service = new VirtualWalletService(
      walletRepository as any,
      transactionRepository as any,
      dataSource as DataSource,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('credits wallet and records transaction', async () => {
    const result = await service.credit({
      userId: 'user-1',
      amount: 50,
      type: VirtualWalletTransactionType.REFUND,
    });

    expect(result.amount).toBe(50);
    expect(state.wallet?.balance).toBe(50);
    expect(state.transactions).toHaveLength(1);
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate refunds by reference', async () => {
    state.wallet = {
      id: 'wallet-1',
      userId: 'user-1',
      balance: 80,
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: null as any,
      transactions: [],
    };

    state.transactions.push({
      id: 'tx-existing',
      walletId: 'wallet-1',
      type: VirtualWalletTransactionType.REFUND,
      amount: 80,
      balanceBefore: 0,
      balanceAfter: 80,
      referenceType: 'marathon_participation',
      referenceId: 'participant-1',
      description: null,
      metadata: null,
      createdAt: new Date(),
      wallet: state.wallet as VirtualWallet,
    });

    await expect(
      service.credit({
        userId: 'user-1',
        amount: 80,
        type: VirtualWalletTransactionType.REFUND,
        referenceType: 'marathon_participation',
        referenceId: 'participant-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

