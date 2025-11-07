import { Injectable } from '@nestjs/common';
import { Marathon } from './entities/marathon.entity';
import {
  PrizePayout,
  PrizePlacementConfig,
  PrizeResult,
  PrizeStrategyType,
} from './entities/prize-strategy.types';

@Injectable()
export class PrizeDistributionService {
  calculate(marathon: Marathon, results: PrizeResult[]): PrizePayout[] {
    if (!marathon || !results || results.length === 0) {
      return [];
    }

    const sortedResults = [...results].sort((a, b) => a.position - b.position);
    const awardsAmount = this.toNumber(marathon.awardsAmount);

    switch (marathon.prizeStrategyType) {
      case PrizeStrategyType.PERCENTAGE_SPLIT:
        return this.calculatePercentageSplit(sortedResults, awardsAmount, marathon.prizeStrategyConfig?.placements, marathon.prizeStrategyConfig?.equalSplitRemainder);
      case PrizeStrategyType.WINNER_TAKE_ALL:
      default:
        return this.calculateWinnerTakeAll(sortedResults, awardsAmount);
    }
  }

  private calculateWinnerTakeAll(results: PrizeResult[], total: number): PrizePayout[] {
    const winner = results[0];
    if (!winner) {
      return [];
    }

    return [
      {
        participantId: winner.participantId,
        position: winner.position,
        amount: this.roundCurrency(total),
        percentage: 100,
      },
    ];
  }

  private calculatePercentageSplit(
    results: PrizeResult[],
    total: number,
    placements: PrizePlacementConfig[] | undefined,
    equalSplitRemainder = false,
  ): PrizePayout[] {
    const placementMap = new Map<number, PrizePlacementConfig>();
    placements?.forEach(placement => {
      placementMap.set(placement.position, placement);
    });

    const payouts: PrizePayout[] = [];
    let distributed = 0;

    for (const result of results) {
      const placement = placementMap.get(result.position);
      if (!placement?.percentage) {
        continue;
      }

      let amount = this.roundCurrency((total * placement.percentage) / 100);
      distributed = this.roundCurrency(distributed + amount);

      payouts.push({
        participantId: result.participantId,
        position: result.position,
        amount,
        percentage: placement.percentage,
      });
    }

    const remainder = this.roundCurrency(total - distributed);
    if (remainder > 0 && payouts.length > 0) {
      if (equalSplitRemainder) {
        const bonus = this.roundCurrency(remainder / payouts.length);
        const residual = this.roundCurrency(remainder - bonus * payouts.length);

        payouts.forEach((payout, index) => {
          let extra = bonus;
          if (residual > 0 && index === 0) {
            extra = this.roundCurrency(extra + residual);
          }
          payout.amount = this.roundCurrency(payout.amount + extra);
        });
      } else {
        payouts[0].amount = this.roundCurrency(payouts[0].amount + remainder);
      }
    }

    return payouts;
  }

  private toNumber(value: number | string): number {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

