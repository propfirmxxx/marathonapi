import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarathonParticipant } from './entities/marathon-participant.entity';
import { Marathon } from './entities/marathon.entity';
import { AccountSnapshot } from './live-account-data.service';

export interface LeaderboardEntry {
  participantId: string;
  userId: string;
  userName: string;
  accountLogin: string;
  rank: number;
  balance: number;
  equity: number;
  profit: number;
  profitPercentage: number;
  margin: number;
  freeMargin: number;
  currency: string;
  leverage: number;
  positions: any[];
  orders: any[];
  updatedAt: Date;
  joinedAt: Date;
}

export interface MarathonLeaderboard {
  marathonId: string;
  marathonName: string;
  totalParticipants: number;
  entries: LeaderboardEntry[];
  updatedAt: Date;
}

@Injectable()
export class MarathonLeaderboardService {
  private readonly logger = new Logger(MarathonLeaderboardService.name);

  constructor(
    @InjectRepository(Marathon)
    private readonly marathonRepository: Repository<Marathon>,
    @InjectRepository(MarathonParticipant)
    private readonly participantRepository: Repository<MarathonParticipant>,
  ) {}

  /**
   * Calculate leaderboard for a specific marathon
   */
  async calculateLeaderboard(
    marathonId: string,
    snapshots: Map<string, AccountSnapshot>,
  ): Promise<MarathonLeaderboard | null> {
    const marathon = await this.marathonRepository.findOne({
      where: { id: marathonId },
    });

    if (!marathon) {
      this.logger.warn(`Marathon ${marathonId} not found`);
      return null;
    }

    const participants = await this.participantRepository.find({
      where: { marathon: { id: marathonId }, isActive: true },
      relations: ['user', 'user.profile', 'metaTraderAccount'],
    });

    const entries: LeaderboardEntry[] = [];

    for (const participant of participants) {
      if (!participant.metaTraderAccount?.login) {
        continue;
      }

      const snapshot = snapshots.get(participant.metaTraderAccount.login);
      if (!snapshot) {
        continue;
      }

      // Calculate profit percentage based on initial balance
      // Assuming initial balance is stored or using current balance - profit
      const initialBalance = (snapshot.balance ?? 0) - (snapshot.profit ?? 0);
      const profitPercentage = initialBalance > 0 
        ? ((snapshot.profit ?? 0) / initialBalance) * 100 
        : 0;

      entries.push({
        participantId: participant.id,
        userId: participant.user.id,
        userName: participant.user.profile?.firstName 
          ? `${participant.user.profile.firstName} ${participant.user.profile.lastName || ''}`.trim()
          : participant.user.email,
        accountLogin: participant.metaTraderAccount.login,
        rank: 0, // Will be calculated after sorting
        balance: snapshot.balance ?? 0,
        equity: snapshot.equity ?? 0,
        profit: snapshot.profit ?? 0,
        profitPercentage,
        margin: snapshot.margin ?? 0,
        freeMargin: snapshot.freeMargin ?? 0,
        currency: snapshot.currency ?? 'USD',
        leverage: snapshot.leverage ?? 0,
        positions: snapshot.positions ?? [],
        orders: snapshot.orders ?? [],
        updatedAt: snapshot.updatedAt,
        joinedAt: participant.createdAt,
      });
    }

    // Sort by profit percentage (highest first)
    entries.sort((a, b) => b.profitPercentage - a.profitPercentage);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return {
      marathonId: marathon.id,
      marathonName: marathon.name,
      totalParticipants: entries.length,
      entries,
      updatedAt: new Date(),
    };
  }

  /**
   * Get leaderboard entry for a specific account
   */
  async getAccountLeaderboardEntry(
    accountLogin: string,
    snapshots: Map<string, AccountSnapshot>,
  ): Promise<LeaderboardEntry | null> {
    const snapshot = snapshots.get(accountLogin);
    if (!snapshot) {
      return null;
    }

    const participant = await this.participantRepository.findOne({
      where: { 
        metaTraderAccount: { login: accountLogin },
        isActive: true,
      },
      relations: ['user', 'user.profile', 'metaTraderAccount', 'marathon'],
    });

    if (!participant) {
      return null;
    }

    // Calculate profit percentage
    const initialBalance = (snapshot.balance ?? 0) - (snapshot.profit ?? 0);
    const profitPercentage = initialBalance > 0 
      ? ((snapshot.profit ?? 0) / initialBalance) * 100 
      : 0;

    // Get rank by calculating leaderboard
    const leaderboard = await this.calculateLeaderboard(
      participant.marathon.id,
      snapshots,
    );

    const entry = leaderboard?.entries.find(e => e.accountLogin === accountLogin);
    const rank = entry?.rank ?? 0;

    return {
      participantId: participant.id,
      userId: participant.user.id,
      userName: participant.user.profile?.firstName 
        ? `${participant.user.profile.firstName} ${participant.user.profile.lastName || ''}`.trim()
        : participant.user.email,
      accountLogin,
      rank,
      balance: snapshot.balance ?? 0,
      equity: snapshot.equity ?? 0,
      profit: snapshot.profit ?? 0,
      profitPercentage,
      margin: snapshot.margin ?? 0,
      freeMargin: snapshot.freeMargin ?? 0,
      currency: snapshot.currency ?? 'USD',
      leverage: snapshot.leverage ?? 0,
      positions: snapshot.positions ?? [],
      orders: snapshot.orders ?? [],
      updatedAt: snapshot.updatedAt,
      joinedAt: participant.createdAt,
    };
  }

  /**
   * Get all account logins for a marathon
   */
  async getMarathonAccountLogins(marathonId: string): Promise<string[]> {
    const participants = await this.participantRepository.find({
      where: { marathon: { id: marathonId }, isActive: true },
      relations: ['metaTraderAccount'],
    });

    return participants
      .filter(p => p.metaTraderAccount?.login)
      .map(p => p.metaTraderAccount.login);
  }

  /**
   * Get participant info by account login
   */
  async getParticipantByAccountLogin(accountLogin: string): Promise<{ participantId: string; marathonId: string } | null> {
    const participant = await this.participantRepository.findOne({
      where: { 
        metaTraderAccount: { login: accountLogin },
        isActive: true,
      },
      relations: ['marathon'],
    });

    if (!participant || !participant.marathon) {
      return null;
    }

    return {
      participantId: participant.id,
      marathonId: participant.marathon.id,
    };
  }
}

