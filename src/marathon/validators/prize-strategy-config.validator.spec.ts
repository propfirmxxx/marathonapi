import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrizeStrategyType } from '../entities/prize-strategy.types';
import { PrizeStrategyDto } from '../dto/prize-strategy.dto';

describe('PrizeStrategyConfigValidator', () => {
  it('accepts winner-take-all strategy without explicit config', async () => {
    const dto = plainToInstance(PrizeStrategyDto, {
      type: PrizeStrategyType.WINNER_TAKE_ALL,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects percentage split configurations that do not sum to 100', async () => {
    const dto = plainToInstance(PrizeStrategyDto, {
      type: PrizeStrategyType.PERCENTAGE_SPLIT,
      config: {
        placements: [
          { position: 1, percentage: 40 },
          { position: 2, percentage: 30 },
        ],
      },
    });

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
  });

  it('accepts percentage split configurations that sum to 100', async () => {
    const dto = plainToInstance(PrizeStrategyDto, {
      type: PrizeStrategyType.PERCENTAGE_SPLIT,
      config: {
        placements: [
          { position: 1, percentage: 60 },
          { position: 2, percentage: 40 },
        ],
      },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});

