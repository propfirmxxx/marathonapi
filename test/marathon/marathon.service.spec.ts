import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { MarathonService } from '../../src/marathon/marathon.service';
import { Marathon } from '../../src/marathon/entities/marathon.entity';
import { MarathonParticipant } from '../../src/marathon/entities/marathon-participant.entity';
import { MetaTraderAccount } from '../../src/metatrader-accounts/entities/meta-trader-account.entity';
import { VirtualWalletTransactionType } from '../../src/virtual-wallet/entities/virtual-wallet-transaction.entity';

type MockRepository<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

interface MarathonState {
  marathon: Marathon | null;
  participant: MarathonParticipant | null;
  metaTraderAccount: MetaTraderAccount | null;
}

const createMockQueryRunner = (state: MarathonState) => {
  const manager = {
    findOne: jest.fn(async (entity: any, options: any) => {
      if (entity === MarathonParticipant) {
        const marathonId = options?.where?.marathon?.id;
        const userId = options?.where?.user?.id;

        if (state.participant && state.participant.marathon?.id === marathonId && state.participant.user?.id === userId) {
          return state.participant;
        }

        return null;
      }

      if (entity === Marathon) {
        const id = options?.where?.id;
        return state.marathon && state.marathon.id === id ? state.marathon : null;
      }

      if (entity === MetaTraderAccount) {
        const participantId = options?.where?.marathonParticipantId;
        return state.metaTraderAccount?.marathonParticipantId === participantId ? state.metaTraderAccount : null;
      }

      return null;
    }),
    create: jest.fn((_entity: any, data: any) => ({ ...data })),
    save: jest.fn(async (entity: any, value: any) => {
      if (entity === MarathonParticipant && state.participant) {
        Object.assign(state.participant, value);
        return state.participant;
      }

      if (entity === Marathon && state.marathon) {
        Object.assign(state.marathon, value);
        return state.marathon;
      }

      if (entity === MetaTraderAccount && state.metaTraderAccount) {
        Object.assign(state.metaTraderAccount, value);
        return state.metaTraderAccount;
      }

      return value;
    }),
  };

  return {
    manager: manager as any,
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  };
};

describe('MarathonService - cancelParticipation', () => {
  let service: MarathonService;
  let dataSource: Partial<DataSource>;
  let virtualWalletService: { credit: jest.Mock };
  let state: MarathonState;
  let queryRunner: any;

  beforeEach(() => {
    const marathonRepository = {} as MockRepository<Marathon>;
    const participantRepository = {} as MockRepository<MarathonParticipant>;
    const metaTraderAccountRepository = {} as MockRepository<MetaTraderAccount>;

    virtualWalletService = {
      credit: jest.fn(),
    };

    state = {
      marathon: {
        id: 'marathon-1',
        name: 'Demo Marathon',
        entryFee: 100,
        currentPlayers: 1,
        startDate: new Date(Date.now() + 60_000),
        endDate: new Date(Date.now() + 600_000),
      } as Marathon,
      participant: {
        id: 'participant-1',
        isActive: true,
        marathon: null as any,
        user: { id: 'user-1' } as any,
        metaTraderAccountId: 'account-1',
      } as MarathonParticipant,
      metaTraderAccount: {
        id: 'account-1',
        marathonParticipantId: 'participant-1',
        userId: 'user-1',
      } as MetaTraderAccount,
    };

    if (state.participant) {
      state.participant.marathon = state.marathon!;
    }

    queryRunner = createMockQueryRunner(state);

    dataSource = {
      createQueryRunner: jest.fn(() => queryRunner),
    } as unknown as DataSource;

    const tokyoService = { deployAccount: jest.fn() } as any;

    service = new MarathonService(
      marathonRepository as any,
      participantRepository as any,
      metaTraderAccountRepository as any,
      tokyoService,
      virtualWalletService as any,
      dataSource as DataSource,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('cancels participation and triggers refund', async () => {
    virtualWalletService.credit.mockResolvedValue({
      id: 'tx-1',
      amount: 80,
      balanceAfter: 180,
      type: VirtualWalletTransactionType.REFUND,
    });

    const result = await service.cancelParticipation('user-1', 'marathon-1');

    expect(result.refundedAmount).toBe(80);
    expect(result.refundTransactionId).toBe('tx-1');
    expect(state.participant?.isActive).toBe(false);
    expect(state.participant?.cancelledAt).toBeInstanceOf(Date);
    expect(state.participant?.refundTransactionId).toBe('tx-1');
    expect(state.marathon?.currentPlayers).toBe(0);
    expect(state.metaTraderAccount?.marathonParticipantId).toBeNull();
    expect(virtualWalletService.credit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        amount: 80,
        referenceId: 'participant-1',
      }),
      queryRunner,
    );
  });

  it('rejects cancellation once marathon has started', async () => {
    if (state.marathon) {
      state.marathon.startDate = new Date(Date.now() - 60_000);
    }

    await expect(service.cancelParticipation('user-1', 'marathon-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns 404 for non-participants', async () => {
    state.participant = null;

    await expect(service.cancelParticipation('user-1', 'marathon-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects double cancellation attempts', async () => {
    if (state.participant) {
      state.participant.isActive = false;
    }

    await expect(service.cancelParticipation('user-1', 'marathon-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

