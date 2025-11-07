export enum PrizeStrategyType {
  WINNER_TAKE_ALL = 'winner_take_all',
  PERCENTAGE_SPLIT = 'percentage_split',
}

export interface PrizePlacementConfig {
  position: number;
  percentage?: number;
}

export interface PrizeStrategyConfig {
  placements?: PrizePlacementConfig[];
  equalSplitRemainder?: boolean;
}

export interface PrizeResult {
  participantId: string;
  position: number;
  score?: number;
}

export interface PrizePayout {
  participantId: string;
  position: number;
  amount: number;
  percentage?: number;
}

