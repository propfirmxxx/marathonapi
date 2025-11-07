import { PrizeDistributionService } from './prize-distribution.service';
import { Marathon } from './entities/marathon.entity';
import { PrizeResult, PrizeStrategyType } from './entities/prize-strategy.types';

describe('PrizeDistributionService', () => {
  let service: PrizeDistributionService;

  beforeEach(() => {
    service = new PrizeDistributionService();
  });

  const buildMarathon = (overrides: Partial<Marathon>): Marathon =>
    ({
      id: 'marathon-id',
      name: 'Test Marathon',
      description: 'desc',
      entryFee: 0,
      awardsAmount: 10000,
      maxPlayers: 100,
      startDate: new Date(),
      endDate: new Date(),
      isActive: true,
      rules: {},
      currentPlayers: 0,
      prizeStrategyType: PrizeStrategyType.WINNER_TAKE_ALL,
      prizeStrategyConfig: null,
      participants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Marathon;

  const buildResults = (count: number): PrizeResult[] =>
    Array.from({ length: count }).map((_, index) => ({
      participantId: `participant-${index + 1}`,
      position: index + 1,
    }));

  it('distributes entire pool to the first place for winner-take-all strategy', () => {
    const marathon = buildMarathon({
      awardsAmount: 5000,
      prizeStrategyType: PrizeStrategyType.WINNER_TAKE_ALL,
    });
    const results = buildResults(3);

    const payouts = service.calculate(marathon, results);

    expect(payouts).toHaveLength(1);
    expect(payouts[0]).toMatchObject({
      participantId: 'participant-1',
      position: 1,
      amount: 5000,
      percentage: 100,
    });
  });

  it('splits prize pool according to percentage placements', () => {
    const marathon = buildMarathon({
      prizeStrategyType: PrizeStrategyType.PERCENTAGE_SPLIT,
      prizeStrategyConfig: {
        placements: [
          { position: 1, percentage: 60 },
          { position: 2, percentage: 30 },
          { position: 3, percentage: 10 },
        ],
      },
    });
    const results = buildResults(3);

    const payouts = service.calculate(marathon, results);

    expect(payouts).toEqual([
      { participantId: 'participant-1', position: 1, amount: 6000, percentage: 60 },
      { participantId: 'participant-2', position: 2, amount: 3000, percentage: 30 },
      { participantId: 'participant-3', position: 3, amount: 1000, percentage: 10 },
    ]);
  });

  it('redistributes remainder when equal split is enabled', () => {
    const marathon = buildMarathon({
      awardsAmount: 9000,
      prizeStrategyType: PrizeStrategyType.PERCENTAGE_SPLIT,
      prizeStrategyConfig: {
        placements: [
          { position: 1, percentage: 60 },
          { position: 2, percentage: 30 },
          { position: 3, percentage: 10 },
        ],
        equalSplitRemainder: true,
      },
    });
    const results = buildResults(2);

    const payouts = service.calculate(marathon, results);
    const total = payouts.reduce((sum, payout) => sum + payout.amount, 0);

    expect(total).toBeCloseTo(9000, 2);
    expect(payouts).toHaveLength(2);
    expect(payouts[0].amount).toBeGreaterThan(payouts[1].amount);
  });

  it('returns empty distribution when no results provided', () => {
    const marathon = buildMarathon({});

    const payouts = service.calculate(marathon, []);

    expect(payouts).toHaveLength(0);
  });
});

