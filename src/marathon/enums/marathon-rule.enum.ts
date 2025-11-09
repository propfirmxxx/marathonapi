export enum MarathonRule {
  /**
   * Minimum number of trades a participant must execute to stay eligible.
   */
  MIN_TRADES = 'minTrades',

  /**
   * Maximum relative drawdown (in percentage) allowed during the marathon.
   */
  MAX_DRAWDOWN_PERCENT = 'maxDrawdownPercent',

  /**
   * Minimum relative profit (in percentage) required to qualify for prizes.
   */
  MIN_PROFIT_PERCENT = 'minProfitPercent',
}

export type MarathonRules = Partial<Record<MarathonRule, number>>;

export const MVP_MARATHON_RULES_PRESET: Readonly<MarathonRule[]> = [
  MarathonRule.MIN_TRADES,
  MarathonRule.MAX_DRAWDOWN_PERCENT,
  MarathonRule.MIN_PROFIT_PERCENT,
];

