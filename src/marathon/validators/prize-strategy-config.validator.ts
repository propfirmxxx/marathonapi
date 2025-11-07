import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PrizeStrategyType } from '../entities/prize-strategy.types';
import type { PrizeStrategyConfigDto } from '../dto/prize-strategy.dto';

@ValidatorConstraint({ name: 'PrizeStrategyConfig', async: false })
export class PrizeStrategyConfigConstraint implements ValidatorConstraintInterface {
  validate(config: PrizeStrategyConfigDto | undefined, args: ValidationArguments): boolean {
    const dto = args.object as { type?: PrizeStrategyType };
    const strategyType = dto?.type ?? PrizeStrategyType.WINNER_TAKE_ALL;

    if (strategyType === PrizeStrategyType.WINNER_TAKE_ALL) {
      // Config is optional for winner-take-all; ensure placements (if provided) do not conflict
      if (!config?.placements || config.placements.length === 0) {
        return true;
      }

      if (config.placements.length > 1) {
        return false;
      }

      const placement = config.placements[0];
      if (placement.position !== 1) {
        return false;
      }

      if (placement.percentage && placement.percentage !== 100) {
        return false;
      }

      return true;
    }

    if (!config || !config.placements || config.placements.length === 0) {
      return false;
    }

    const hasDuplicatePosition = new Set(config.placements.map(p => p.position)).size !== config.placements.length;
    if (hasDuplicatePosition) {
      return false;
    }

    if (strategyType === PrizeStrategyType.PERCENTAGE_SPLIT) {
      const totalPercentage = config.placements.reduce((sum, placement) => sum + (placement.percentage ?? 0), 0);
      // Allow slight floating point discrepancies
      if (Math.abs(totalPercentage - 100) > 0.001) {
        return false;
      }

      return config.placements.every(placement => placement.percentage !== undefined && placement.percentage >= 0);
    }

    return false;
  }

  defaultMessage(args: ValidationArguments): string {
    const dto = args.object as { type?: PrizeStrategyType };
    switch (dto?.type) {
      case PrizeStrategyType.PERCENTAGE_SPLIT:
        return 'Percentage split configuration must specify placements with percentages that sum to 100.';
      case PrizeStrategyType.WINNER_TAKE_ALL:
      default:
        return 'Winner take all configuration can only define a single placement for position 1.';
    }
  }
}

export const ValidatePrizeStrategyConfig = (validationOptions?: ValidationOptions) => {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: PrizeStrategyConfigConstraint,
    });
  };
};

