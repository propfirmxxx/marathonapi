import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { MarathonParticipant } from './entities/marathon-participant.entity';
import { Marathon } from './entities/marathon.entity';
import { MarathonRule, MarathonRules } from './enums/marathon-rule.enum';
import { ParticipantStatus } from './enums/participant-status.enum';
import { TokyoPerformance } from '../tokyo-data/entities/tokyo-performance.entity';
import { TokyoBalanceHistory } from '../tokyo-data/entities/tokyo-balance-history.entity';
import { TokyoEquityHistory } from '../tokyo-data/entities/tokyo-equity-history.entity';
import { LiveAccountDataService } from './live-account-data.service';
import { MarathonStatus } from './enums/marathon-status.enum';

export interface RuleViolation {
  rule: MarathonRule;
  value: number;
  limit: number;
}

@Injectable()
export class MarathonRulesService {
  private readonly logger = new Logger(MarathonRulesService.name);

  constructor(
    @InjectRepository(MarathonParticipant)
    private readonly participantRepository: Repository<MarathonParticipant>,
    @InjectRepository(Marathon)
    private readonly marathonRepository: Repository<Marathon>,
    @InjectRepository(TokyoPerformance)
    private readonly performanceRepository: Repository<TokyoPerformance>,
    @InjectRepository(TokyoBalanceHistory)
    private readonly balanceHistoryRepository: Repository<TokyoBalanceHistory>,
    @InjectRepository(TokyoEquityHistory)
    private readonly equityHistoryRepository: Repository<TokyoEquityHistory>,
    @Inject(forwardRef(() => LiveAccountDataService))
    private readonly liveAccountDataService: LiveAccountDataService,
  ) {}

  /**
   * Check all rules for a participant and disqualify if any rule is violated
   * @param participantId Participant ID
   * @param useLiveEquity If true, use live equity from snapshot. If false, use only equity history (for cron job)
   */
  async checkParticipantRules(
    participantId: string,
    useLiveEquity: boolean = true,
  ): Promise<RuleViolation[] | null> {
    const participant = await this.participantRepository.findOne({
      where: { id: participantId },
      relations: ['marathon', 'metaTraderAccount'],
    });

    if (!participant) {
      this.logger.warn(`Participant ${participantId} not found`);
      return null;
    }

    // Only check rules for active participants in ongoing marathons
    if (
      participant.status !== ParticipantStatus.ACTIVE ||
      !participant.isActive ||
      participant.marathon.status !== MarathonStatus.ONGOING
    ) {
      return null;
    }

    if (!participant.metaTraderAccount?.id) {
      this.logger.warn(`Participant ${participantId} has no MetaTrader account`);
      return null;
    }

    const violations = await this.checkRules(participant, participant.marathon, useLiveEquity);

    if (violations.length > 0) {
      await this.disqualifyParticipant(participant, violations);
      return violations;
    }

    return null;
  }

  /**
   * Check all rules for a participant
   * @param useLiveEquity If true, use live equity from snapshot. If false, use only equity history
   */
  private async checkRules(
    participant: MarathonParticipant,
    marathon: Marathon,
    useLiveEquity: boolean = true,
  ): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    const rules = marathon.rules;

    if (!rules || Object.keys(rules).length === 0) {
      return violations;
    }

    const accountId = participant.metaTraderAccount!.id;
    const accountLogin = participant.metaTraderAccount!.login;

    // Get performance data
    const performance = await this.performanceRepository.findOne({
      where: { metaTraderAccountId: accountId },
    });

    // Get live account data (only if useLiveEquity is true)
    const snapshot = useLiveEquity
      ? this.liveAccountDataService.getSnapshot(accountLogin)
      : null;

    // Check MIN_TRADES
    if (rules[MarathonRule.MIN_TRADES] !== undefined) {
      const totalTrades = performance?.totalTrades ?? 0;
      const minTrades = rules[MarathonRule.MIN_TRADES]!;
      if (totalTrades < minTrades) {
        // Don't violate if marathon hasn't ended yet - they still have time
        const now = new Date();
        if (now >= marathon.endDate) {
          violations.push({
            rule: MarathonRule.MIN_TRADES,
            value: totalTrades,
            limit: minTrades,
          });
        }
      }
    }

    // Check MAX_DRAWDOWN_PERCENT (total drawdown based on equity)
    if (rules[MarathonRule.MAX_DRAWDOWN_PERCENT] !== undefined) {
      const totalDrawdownPercent = await this.calculateTotalDrawdown(
        accountId,
        marathon.startDate,
        snapshot,
        useLiveEquity,
      );
      const maxDrawdownPercent = rules[MarathonRule.MAX_DRAWDOWN_PERCENT]!;
      if (totalDrawdownPercent > maxDrawdownPercent) {
        violations.push({
          rule: MarathonRule.MAX_DRAWDOWN_PERCENT,
          value: totalDrawdownPercent,
          limit: maxDrawdownPercent,
        });
      }
    }

    // Check DAILY_DRAWDOWN_PERCENT (based on equity)
    if (rules[MarathonRule.DAILY_DRAWDOWN_PERCENT] !== undefined) {
      const dailyDrawdownPercent = await this.calculateDailyDrawdown(
        accountId,
        marathon.startDate,
      );
      const maxDailyDrawdownPercent = rules[MarathonRule.DAILY_DRAWDOWN_PERCENT]!;
      if (dailyDrawdownPercent > maxDailyDrawdownPercent) {
        violations.push({
          rule: MarathonRule.DAILY_DRAWDOWN_PERCENT,
          value: dailyDrawdownPercent,
          limit: maxDailyDrawdownPercent,
        });
      }
    }

    // Check FLOATING_RISK_PERCENT (only if we have live snapshot)
    if (rules[MarathonRule.FLOATING_RISK_PERCENT] !== undefined && snapshot) {
      const floatingRiskPercent = this.calculateFloatingRisk(snapshot);
      const maxFloatingRiskPercent = rules[MarathonRule.FLOATING_RISK_PERCENT]!;
      if (floatingRiskPercent > maxFloatingRiskPercent) {
        violations.push({
          rule: MarathonRule.FLOATING_RISK_PERCENT,
          value: floatingRiskPercent,
          limit: maxFloatingRiskPercent,
        });
      }
    }

    return violations;
  }

  /**
   * Calculate maximum daily drawdown percentage based on equity
   * Returns the maximum drawdown percentage that occurred in any single day
   */
  async calculateDailyDrawdown(
    accountId: string,
    marathonStartDate: Date,
  ): Promise<number> {
    try {
      // Get all equity history from marathon start
      const equityHistory = await this.equityHistoryRepository.find({
        where: {
          metaTraderAccountId: accountId,
          time: Between(marathonStartDate, new Date()),
        },
        order: { time: 'ASC' },
      });

      if (equityHistory.length === 0) {
        return 0;
      }

      // Group equity history by day
      const dailyData = new Map<string, { equities: number[]; peak: number }>();

      equityHistory.forEach((entry) => {
        const dateKey = entry.time.toISOString().split('T')[0]; // YYYY-MM-DD
        const equity = Number(entry.equity);

        if (!dailyData.has(dateKey)) {
          dailyData.set(dateKey, { equities: [], peak: equity });
        }

        const dayData = dailyData.get(dateKey)!;
        dayData.equities.push(equity);
        if (equity > dayData.peak) {
          dayData.peak = equity;
        }
      });

      // Calculate max drawdown for each day
      let maxDailyDrawdownPercent = 0;

      dailyData.forEach((dayData) => {
        const peak = dayData.peak;
        if (peak <= 0) return;

        // Find minimum equity for this day
        const minEquity = Math.min(...dayData.equities);
        const drawdown = peak - minEquity;
        const drawdownPercent = (drawdown / peak) * 100;

        if (drawdownPercent > maxDailyDrawdownPercent) {
          maxDailyDrawdownPercent = drawdownPercent;
        }
      });

      return Number(maxDailyDrawdownPercent.toFixed(2));
    } catch (error) {
      this.logger.error(
        `Failed to calculate daily drawdown for account ${accountId}: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * Calculate total drawdown percentage based on equity
   * Formula: (peak equity - current equity) / peak equity * 100
   * @param useLiveEquity If true, use live equity from snapshot. If false, use only equity history
   */
  async calculateTotalDrawdown(
    accountId: string,
    marathonStartDate: Date,
    snapshot: any,
    useLiveEquity: boolean = true,
  ): Promise<number> {
    try {
      // Get equity history from marathon start
      const equityHistory = await this.equityHistoryRepository.find({
        where: {
          metaTraderAccountId: accountId,
          time: Between(marathonStartDate, new Date()),
        },
        order: { time: 'ASC' },
      });

      if (equityHistory.length === 0) {
        // If no history and useLiveEquity is true, try to get from snapshot
        if (useLiveEquity && snapshot?.equity) {
          const initialEquity = Number(snapshot.equity);
          const currentEquity = Number(snapshot.equity);
          if (initialEquity > 0) {
            const drawdown = ((initialEquity - currentEquity) / initialEquity) * 100;
            return Math.max(0, Number(drawdown.toFixed(2)));
          }
        }
        return 0;
      }

      // Find peak equity (highest equity since marathon start)
      let peakEquity = 0;
      equityHistory.forEach((entry) => {
        const equity = Number(entry.equity);
        if (equity > peakEquity) {
          peakEquity = equity;
        }
      });

      if (peakEquity <= 0) {
        return 0;
      }

      // Get current equity
      let currentEquity = 0;
      if (useLiveEquity && snapshot?.equity) {
        // Use live equity from snapshot (for real-time checking)
        currentEquity = Number(snapshot.equity);
      } else if (equityHistory.length > 0) {
        // Use latest equity from history (for cron job)
        currentEquity = Number(equityHistory[equityHistory.length - 1].equity);
      }

      if (currentEquity <= 0) {
        return 0;
      }

      // Calculate drawdown: (peak - current) / peak * 100
      const drawdown = ((peakEquity - currentEquity) / peakEquity) * 100;
      return Math.max(0, Number(drawdown.toFixed(2)));
    } catch (error) {
      this.logger.error(
        `Failed to calculate total drawdown for account ${accountId}: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * Calculate floating risk percentage
   * Formula: |floating PnL| / equity * 100
   */
  private calculateFloatingRisk(snapshot: any): number {
    try {
      const floatingPnL = Number(snapshot.profit ?? 0);
      const equity = Number(snapshot.equity ?? 0);

      if (equity <= 0) {
        return 0;
      }

      const floatingRiskPercent = (Math.abs(floatingPnL) / equity) * 100;
      return Number(floatingRiskPercent.toFixed(2));
    } catch (error) {
      this.logger.error(`Failed to calculate floating risk: ${error.message}`);
      return 0;
    }
  }

  /**
   * Disqualify a participant due to rule violations
   */
  async disqualifyParticipant(
    participant: MarathonParticipant,
    violations: RuleViolation[],
  ): Promise<void> {
    try {
      participant.status = ParticipantStatus.DISQUALIFIED;
      participant.isActive = false;
      participant.disqualificationReason = violations;

      await this.participantRepository.save(participant);

      this.logger.warn(
        `Participant ${participant.id} disqualified due to rule violations: ${violations.map((v) => v.rule).join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to disqualify participant ${participant.id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Check rules for all active participants in ongoing marathons
   * Uses only equity history (not live equity) for reliability in cron job
   */
  async checkAllParticipantsRules(): Promise<void> {
    try {
      const ongoingMarathons = await this.marathonRepository.find({
        where: { status: MarathonStatus.ONGOING },
      });

      for (const marathon of ongoingMarathons) {
        const participants = await this.participantRepository.find({
          where: {
            marathon: { id: marathon.id },
            status: ParticipantStatus.ACTIVE,
            isActive: true,
          },
          relations: ['metaTraderAccount'],
        });

        for (const participant of participants) {
          // Use only equity history (useLiveEquity = false) for cron job
          await this.checkParticipantRules(participant.id, false).catch((error) => {
            this.logger.error(
              `Failed to check rules for participant ${participant.id}: ${error.message}`,
            );
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to check all participants rules: ${error.message}`);
    }
  }
}

