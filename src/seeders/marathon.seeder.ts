import { DataSource } from 'typeorm';
import { BaseSeeder } from './base-seeder';
import { Marathon } from '../marathon/entities/marathon.entity';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';
import { PrizeStrategyType } from '../marathon/entities/prize-strategy.types';
import { MarathonStatus } from '../marathon/enums/marathon-status.enum';
import { MarathonRule } from '../marathon/enums/marathon-rule.enum';
import { ParticipantStatus } from '../marathon/enums/participant-status.enum';
import { User } from '../users/entities/user.entity';
import { MetaTraderAccount } from '../metatrader-accounts/entities/meta-trader-account.entity';

export class MarathonSeeder extends BaseSeeder {
  private readonly seededMarathonIds = [
    'a1b2c3d4-e5f6-4789-a012-345678901001',
    'a1b2c3d4-e5f6-4789-a012-345678901002',
    'a1b2c3d4-e5f6-4789-a012-345678901003',
    'a1b2c3d4-e5f6-4789-a012-345678901004',
    'a1b2c3d4-e5f6-4789-a012-345678901005',
    'a1b2c3d4-e5f6-4789-a012-345678901006',
    'a1b2c3d4-e5f6-4789-a012-345678901007',
    'a1b2c3d4-e5f6-4789-a012-345678901008',
    'a1b2c3d4-e5f6-4789-a012-345678901009', // Test marathon
    'a1b2c3d4-e5f6-4789-a012-345678901010',
    'a1b2c3d4-e5f6-4789-a012-345678901011',
    'a1b2c3d4-e5f6-4789-a012-345678901012',
    'a1b2c3d4-e5f6-4789-a012-345678901013',
    // Additional upcoming marathons for testing
    'a1b2c3d4-e5f6-4789-a012-345678901014',
    'a1b2c3d4-e5f6-4789-a012-345678901015',
    'a1b2c3d4-e5f6-4789-a012-345678901016',
    'a1b2c3d4-e5f6-4789-a012-345678901017',
    'a1b2c3d4-e5f6-4789-a012-345678901018',
    'a1b2c3d4-e5f6-4789-a012-345678901019', // Ongoing marathon with test user 1
  ];

  getName(): string {
    return 'MarathonSeeder';
  }

  async run(): Promise<void> {
    const hasMarathons = await this.hasTable('marathons');
    const hasParticipants = await this.hasTable('marathon_participants');

    if (!hasMarathons) {
      this.logger.warn('Marathons table does not exist. Skipping Marathon seeding.');
      return;
    }

    this.logger.log('Seeding Marathon data...');

    // Clear existing data
    if (hasParticipants) {
      // Only delete participants for seeded marathons
      const participantPlaceholders = this.seededMarathonIds.map((_, index) => `$${index + 1}`).join(', ');
      await this.query(
        `DELETE FROM marathon_participants WHERE marathon_id IN (${participantPlaceholders})`,
        this.seededMarathonIds,
      );
    }
    await this.clearSeededPayments();
    // Only delete seeded marathons to avoid foreign key constraint violations
    const marathonPlaceholders = this.seededMarathonIds.map((_, index) => `$${index + 1}`).join(', ');
    await this.query(
      `DELETE FROM marathons WHERE id IN (${marathonPlaceholders})`,
      this.seededMarathonIds,
    );

    // Get current timestamp for date calculations
    const now = new Date();

    // Calculate dates for different marathon types
    const pastStartDate = new Date(now);
    pastStartDate.setDate(pastStartDate.getDate() - 60);
    const pastEndDate = new Date(now);
    pastEndDate.setDate(pastEndDate.getDate() - 15);

    const activeStartDate = new Date(now);
    activeStartDate.setDate(activeStartDate.getDate() - 10);
    const activeEndDate = new Date(now);
    activeEndDate.setDate(activeEndDate.getDate() + 20);

    const upcomingStartDate = new Date(now);
    upcomingStartDate.setDate(upcomingStartDate.getDate() + 30);
    const upcomingEndDate = new Date(upcomingStartDate);
    upcomingEndDate.setDate(upcomingEndDate.getDate() + 30);

    const future2StartDate = new Date(now);
    future2StartDate.setDate(future2StartDate.getDate() + 60);
    const future2EndDate = new Date(future2StartDate);
    future2EndDate.setDate(future2EndDate.getDate() + 30);

    const future3StartDate = new Date(now);
    future3StartDate.setDate(future3StartDate.getDate() + 90);
    const future3EndDate = new Date(future3StartDate);
    future3EndDate.setDate(future3EndDate.getDate() + 30);

    const future4StartDate = new Date(now);
    future4StartDate.setDate(future4StartDate.getDate() + 45);
    const future4EndDate = new Date(future4StartDate);
    future4EndDate.setDate(future4EndDate.getDate() + 30);

    const future5StartDate = new Date(now);
    future5StartDate.setDate(future5StartDate.getDate() + 75);
    const future5EndDate = new Date(future5StartDate);
    future5EndDate.setDate(future5EndDate.getDate() + 30);

    const future6StartDate = new Date(now);
    future6StartDate.setDate(future6StartDate.getDate() + 120);
    const future6EndDate = new Date(future6StartDate);
    future6EndDate.setDate(future6EndDate.getDate() + 30);

    const future7StartDate = new Date(now);
    future7StartDate.setDate(future7StartDate.getDate() + 150);
    const future7EndDate = new Date(future7StartDate);
    future7EndDate.setDate(future7EndDate.getDate() + 30);

    // Additional upcoming dates for testing join/leave
    const upcoming2StartDate = new Date(now);
    upcoming2StartDate.setDate(upcoming2StartDate.getDate() + 7); // Next week
    const upcoming2EndDate = new Date(upcoming2StartDate);
    upcoming2EndDate.setDate(upcoming2EndDate.getDate() + 14); // 2 weeks duration

    const upcoming3StartDate = new Date(now);
    upcoming3StartDate.setDate(upcoming3StartDate.getDate() + 14); // In 2 weeks
    const upcoming3EndDate = new Date(upcoming3StartDate);
    upcoming3EndDate.setDate(upcoming3EndDate.getDate() + 21); // 3 weeks duration

    const upcoming4StartDate = new Date(now);
    upcoming4StartDate.setDate(upcoming4StartDate.getDate() + 21); // In 3 weeks
    const upcoming4EndDate = new Date(upcoming4StartDate);
    upcoming4EndDate.setDate(upcoming4EndDate.getDate() + 30); // 1 month duration

    const upcoming5StartDate = new Date(now);
    upcoming5StartDate.setDate(upcoming5StartDate.getDate() + 5); // In 5 days
    const upcoming5EndDate = new Date(upcoming5StartDate);
    upcoming5EndDate.setDate(upcoming5EndDate.getDate() + 14); // 2 weeks duration

    // Insert marathon records using repository
    const manager = this.getManager();
    const marathonRepository = manager.getRepository(Marathon);

    const marathons = marathonRepository.create([
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901001',
        name: 'Past Trading Championship',
        description: 'A completed 30-day trading marathon that ended successfully. This championship featured competitive trading with cash prizes awarded to top performers.',
        entryFee: 150.00,
        awardsAmount: 15000.00,
        maxPlayers: 100,
        startDate: pastStartDate,
        endDate: pastEndDate,
        isActive: false,
        status: MarathonStatus.FINISHED,
        rules: {
          [MarathonRule.MIN_TRADES]: 10,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 20,
          [MarathonRule.MIN_PROFIT_PERCENT]: 5,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.WINNER_TAKE_ALL,
        prizeStrategyConfig: {
          placements: [
            {
              position: 1,
              percentage: 100,
            },
          ],
        },
        createdAt: pastStartDate,
        updatedAt: pastEndDate,
      },
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901002',
        name: 'Active Trading Marathon',
        description: 'A competitive 30-day trading marathon currently in progress. Participants are trading live with real-time leaderboard updates and cash prizes awaiting the winners.',
        entryFee: 75.00,
        awardsAmount: 7500.00,
        maxPlayers: 100,
        startDate: activeStartDate,
        endDate: activeEndDate,
        isActive: true,
        status: MarathonStatus.FINISHED,
        rules: {
          [MarathonRule.MIN_TRADES]: 15,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 25,
          [MarathonRule.MIN_PROFIT_PERCENT]: 7,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.PERCENTAGE_SPLIT,
        prizeStrategyConfig: {
          placements: [
            { position: 1, percentage: 50 },
            { position: 2, percentage: 30 },
            { position: 3, percentage: 20 },
          ],
          equalSplitRemainder: true,
        },
        createdAt: activeStartDate,
        updatedAt: now,
      },
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901003',
        name: 'Upcoming Winter Challenge',
        description: 'Join us for an exciting winter trading challenge! Registration is now open for this upcoming marathon featuring enhanced prizes and special winter trading themes.',
        entryFee: 120.00,
        awardsAmount: 12000.00,
        maxPlayers: 150,
        startDate: upcomingStartDate,
        endDate: upcomingEndDate,
        isActive: true,
        status: MarathonStatus.UPCOMING,
        rules: {
          [MarathonRule.MIN_TRADES]: 12,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 22,
          [MarathonRule.MIN_PROFIT_PERCENT]: 6,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.PERCENTAGE_SPLIT,
        prizeStrategyConfig: {
          placements: [
            { position: 1, percentage: 50 },
            { position: 2, percentage: 33.33 },
            { position: 3, percentage: 16.67 },
          ],
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901004',
        name: 'Full Capacity Marathon',
        description: 'This marathon has reached maximum capacity. All slots have been filled and the event is proceeding with the maximum number of participants.',
        entryFee: 200.00,
        awardsAmount: 20000.00,
        maxPlayers: 200,
        startDate: activeStartDate,
        endDate: activeEndDate,
        isActive: true,
        status: MarathonStatus.FINISHED,
        rules: {
          [MarathonRule.MIN_TRADES]: 20,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 30,
          [MarathonRule.MIN_PROFIT_PERCENT]: 10,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.PERCENTAGE_SPLIT,
        prizeStrategyConfig: {
          placements: [
            { position: 1, percentage: 40 },
            { position: 2, percentage: 25 },
            { position: 3, percentage: 15 },
            { position: 4, percentage: 10 },
            { position: 5, percentage: 10 },
          ],
          equalSplitRemainder: false,
        },
        createdAt: activeStartDate,
        updatedAt: now,
      },
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901005',
        name: 'Spring Trading Marathon',
        description: 'Welcome spring with our annual Spring Trading Marathon! Perfect for traders of all levels, featuring moderate entry fees and generous prize pools.',
        entryFee: 50.00,
        awardsAmount: 5000.00,
        maxPlayers: 50,
        startDate: upcomingStartDate,
        endDate: upcomingEndDate,
        isActive: true,
        status: MarathonStatus.FINISHED,
        rules: {
          [MarathonRule.MIN_TRADES]: 8,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 15,
          [MarathonRule.MIN_PROFIT_PERCENT]: 4,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.PERCENTAGE_SPLIT,
        prizeStrategyConfig: {
          placements: [
            { position: 1, percentage: 50 },
            { position: 2, percentage: 30 },
            { position: 3, percentage: 20 },
          ],
          equalSplitRemainder: true,
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901006',
        name: 'Elite Traders Championship',
        description: 'For the most skilled traders only. This championship offers high stakes, premium prizes, and the toughest competition. Are you ready to prove your trading mastery?',
        entryFee: 250.00,
        awardsAmount: 25000.00,
        maxPlayers: 200,
        startDate: future2StartDate,
        endDate: future2EndDate,
        isActive: true,
        status: MarathonStatus.FINISHED,
        rules: {
          [MarathonRule.MIN_TRADES]: 25,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 15,
          [MarathonRule.MIN_PROFIT_PERCENT]: 12,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.PERCENTAGE_SPLIT,
        prizeStrategyConfig: {
          placements: [
            { position: 1, percentage: 35 },
            { position: 2, percentage: 25 },
            { position: 3, percentage: 15 },
            { position: 4, percentage: 10 },
            { position: 5, percentage: 8 },
            { position: 6, percentage: 7 },
          ],
          equalSplitRemainder: true,
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901007',
        name: 'Professional Trading League',
        description: 'The ultimate professional trading competition. This league features the highest entry fee and the most substantial prize pool, attracting only the most serious traders.',
        entryFee: 500.00,
        awardsAmount: 50000.00,
        maxPlayers: 500,
        startDate: future3StartDate,
        endDate: future3EndDate,
        isActive: false,
        status: MarathonStatus.FINISHED,
        rules: {
          [MarathonRule.MIN_TRADES]: 30,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 10,
          [MarathonRule.MIN_PROFIT_PERCENT]: 15,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.PERCENTAGE_SPLIT,
        prizeStrategyConfig: {
          placements: [
            { position: 1, percentage: 40 },
            { position: 2, percentage: 30 },
            { position: 3, percentage: 20 },
            { position: 4, percentage: 6 },
            { position: 5, percentage: 4 },
          ],
          equalSplitRemainder: false,
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901008',
        name: 'Beginner Friendly Tournament',
        description: 'Perfect for newcomers to trading competitions! Low entry fee, comprehensive support, and learning-focused environment make this ideal for beginner traders.',
        entryFee: 25.00,
        awardsAmount: 2500.00,
        maxPlayers: 1000,
        startDate: upcomingStartDate,
        endDate: upcomingEndDate,
        isActive: true,
        status: MarathonStatus.FINISHED,
        rules: {
          [MarathonRule.MIN_TRADES]: 5,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 30,
          [MarathonRule.MIN_PROFIT_PERCENT]: 2,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.WINNER_TAKE_ALL,
        prizeStrategyConfig: {
          placements: [
            {
              position: 1,
              percentage: 100,
            },
          ],
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901009',
        name: 'Test Marathon',
        description: 'Test marathon for testing purposes with two specific users and MetaTrader accounts.',
        entryFee: 100.00,
        awardsAmount: 10000.00,
        maxPlayers: 2,
        startDate: activeStartDate,
        endDate: activeEndDate,
        isActive: true,
        status: MarathonStatus.ONGOING,
        rules: {
          [MarathonRule.MIN_TRADES]: 10,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 20,
          [MarathonRule.MIN_PROFIT_PERCENT]: 5,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.WINNER_TAKE_ALL,
        prizeStrategyConfig: {
          placements: [
            {
              position: 1,
              percentage: 100,
            },
          ],
        },
        createdAt: activeStartDate,
        updatedAt: now,
      },
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901010',
        name: 'Summer Trading Festival',
        description: 'Celebrate summer with our annual trading festival! This exciting marathon features special bonuses, extended trading hours, and a festive atmosphere perfect for traders looking to make their mark.',
        entryFee: 100.00,
        awardsAmount: 15000.00,
        maxPlayers: 200,
        startDate: future4StartDate,
        endDate: future4EndDate,
        isActive: true,
        status: MarathonStatus.UPCOMING,
        rules: {
          [MarathonRule.MIN_TRADES]: 15,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 25,
          [MarathonRule.MIN_PROFIT_PERCENT]: 8,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.PERCENTAGE_SPLIT,
        prizeStrategyConfig: {
          placements: [
            { position: 1, percentage: 45 },
            { position: 2, percentage: 30 },
            { position: 3, percentage: 15 },
            { position: 4, percentage: 10 },
          ],
          equalSplitRemainder: false,
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901011',
        name: 'Autumn Champions League',
        description: 'The premier autumn trading competition for serious traders. Compete against the best and prove your trading skills in this prestigious championship with substantial rewards.',
        entryFee: 300.00,
        awardsAmount: 30000.00,
        maxPlayers: 150,
        startDate: future5StartDate,
        endDate: future5EndDate,
        isActive: true,
        status: MarathonStatus.UPCOMING,
        rules: {
          [MarathonRule.MIN_TRADES]: 20,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 18,
          [MarathonRule.MIN_PROFIT_PERCENT]: 10,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.PERCENTAGE_SPLIT,
        prizeStrategyConfig: {
          placements: [
            { position: 1, percentage: 40 },
            { position: 2, percentage: 28 },
            { position: 3, percentage: 18 },
            { position: 4, percentage: 9 },
            { position: 5, percentage: 5 },
          ],
          equalSplitRemainder: false,
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901012',
        name: 'New Year Trading Challenge',
        description: 'Start the new year with a bang! Join our New Year Trading Challenge and compete for amazing prizes. Perfect opportunity to set your trading goals and achieve them with style.',
        entryFee: 80.00,
        awardsAmount: 10000.00,
        maxPlayers: 250,
        startDate: future6StartDate,
        endDate: future6EndDate,
        isActive: true,
        status: MarathonStatus.UPCOMING,
        rules: {
          [MarathonRule.MIN_TRADES]: 10,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 20,
          [MarathonRule.MIN_PROFIT_PERCENT]: 5,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.PERCENTAGE_SPLIT,
        prizeStrategyConfig: {
          placements: [
            { position: 1, percentage: 50 },
            { position: 2, percentage: 30 },
            { position: 3, percentage: 20 },
          ],
          equalSplitRemainder: true,
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901013',
        name: 'Mega Trading Championship',
        description: 'The ultimate trading championship with the biggest prize pool! This is the event every trader dreams of. High stakes, high rewards, and the chance to become a trading legend.',
        entryFee: 400.00,
        awardsAmount: 75000.00,
        maxPlayers: 300,
        startDate: future7StartDate,
        endDate: future7EndDate,
        isActive: true,
        status: MarathonStatus.UPCOMING,
        rules: {
          [MarathonRule.MIN_TRADES]: 30,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 12,
          [MarathonRule.MIN_PROFIT_PERCENT]: 15,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.PERCENTAGE_SPLIT,
        prizeStrategyConfig: {
          placements: [
            { position: 1, percentage: 35 },
            { position: 2, percentage: 25 },
            { position: 3, percentage: 15 },
            { position: 4, percentage: 10 },
            { position: 5, percentage: 8 },
            { position: 6, percentage: 4 },
            { position: 7, percentage: 3 },
          ],
          equalSplitRemainder: true,
        },
        createdAt: now,
        updatedAt: now,
      },
      // Additional upcoming marathons for testing join/leave
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901014',
        name: 'Weekly Trading Sprint',
        description: 'A quick 2-week trading sprint perfect for testing the join and leave functionality. Low entry fee makes it accessible for all traders.',
        entryFee: 30.00,
        awardsAmount: 3000.00,
        maxPlayers: 50,
        startDate: upcoming2StartDate,
        endDate: upcoming2EndDate,
        isActive: true,
        status: MarathonStatus.UPCOMING,
        rules: {
          [MarathonRule.MIN_TRADES]: 5,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 25,
          [MarathonRule.MIN_PROFIT_PERCENT]: 3,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.WINNER_TAKE_ALL,
        prizeStrategyConfig: {
          placements: [
            { position: 1, percentage: 100 },
          ],
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901015',
        name: 'Mid-Month Challenge',
        description: 'Join our mid-month challenge! Great for testing marathon participation features with a moderate entry fee and competitive prizes.',
        entryFee: 60.00,
        awardsAmount: 6000.00,
        maxPlayers: 100,
        startDate: upcoming3StartDate,
        endDate: upcoming3EndDate,
        isActive: true,
        status: MarathonStatus.UPCOMING,
        rules: {
          [MarathonRule.MIN_TRADES]: 8,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 20,
          [MarathonRule.MIN_PROFIT_PERCENT]: 5,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.PERCENTAGE_SPLIT,
        prizeStrategyConfig: {
          placements: [
            { position: 1, percentage: 50 },
            { position: 2, percentage: 30 },
            { position: 3, percentage: 20 },
          ],
          equalSplitRemainder: true,
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901016',
        name: 'Monthly Trading Competition',
        description: 'A full month trading competition with substantial prizes. Perfect for extended testing of marathon features and participant management.',
        entryFee: 150.00,
        awardsAmount: 15000.00,
        maxPlayers: 200,
        startDate: upcoming4StartDate,
        endDate: upcoming4EndDate,
        isActive: true,
        status: MarathonStatus.UPCOMING,
        rules: {
          [MarathonRule.MIN_TRADES]: 12,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 22,
          [MarathonRule.MIN_PROFIT_PERCENT]: 6,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.PERCENTAGE_SPLIT,
        prizeStrategyConfig: {
          placements: [
            { position: 1, percentage: 40 },
            { position: 2, percentage: 25 },
            { position: 3, percentage: 15 },
            { position: 4, percentage: 10 },
            { position: 5, percentage: 10 },
          ],
          equalSplitRemainder: false,
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901017',
        name: 'Quick Start Trading Event',
        description: 'Starting soon! A fast-paced 2-week event starting in just 5 days. Join now to test the registration and cancellation flow.',
        entryFee: 40.00,
        awardsAmount: 4000.00,
        maxPlayers: 75,
        startDate: upcoming5StartDate,
        endDate: upcoming5EndDate,
        isActive: true,
        status: MarathonStatus.UPCOMING,
        rules: {
          [MarathonRule.MIN_TRADES]: 6,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 20,
          [MarathonRule.MIN_PROFIT_PERCENT]: 4,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.PERCENTAGE_SPLIT,
        prizeStrategyConfig: {
          placements: [
            { position: 1, percentage: 60 },
            { position: 2, percentage: 30 },
            { position: 3, percentage: 10 },
          ],
          equalSplitRemainder: false,
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901018',
        name: 'Testing Marathon - Join/Leave',
        description: 'Specifically created for testing join and leave functionality. Feel free to register and cancel to test the flow.',
        entryFee: 20.00,
        awardsAmount: 2000.00,
        maxPlayers: 100,
        startDate: upcoming2StartDate,
        endDate: upcoming2EndDate,
        isActive: true,
        status: MarathonStatus.UPCOMING,
        rules: {
          [MarathonRule.MIN_TRADES]: 3,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 30,
          [MarathonRule.MIN_PROFIT_PERCENT]: 2,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.WINNER_TAKE_ALL,
        prizeStrategyConfig: {
          placements: [
            { position: 1, percentage: 100 },
          ],
        },
        createdAt: now,
        updatedAt: now,
      },
      // Ongoing marathon with test user 1 as participant
      {
        id: 'a1b2c3d4-e5f6-4789-a012-345678901019',
        name: 'Ongoing Test Marathon',
        description: 'An ongoing marathon for testing with test user 1 as a participant with assigned MetaTrader account.',
        entryFee: 100.00,
        awardsAmount: 10000.00,
        maxPlayers: 100,
        startDate: activeStartDate,
        endDate: activeEndDate,
        isActive: true,
        status: MarathonStatus.ONGOING,
        rules: {
          [MarathonRule.MIN_TRADES]: 10,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 20,
          [MarathonRule.MIN_PROFIT_PERCENT]: 5,
        },
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.WINNER_TAKE_ALL,
        prizeStrategyConfig: {
          placements: [
            {
              position: 1,
              percentage: 100,
            },
          ],
        },
        createdAt: activeStartDate,
        updatedAt: now,
      },
    ]);

    await marathonRepository.save(marathons);

    // Create participant for test user 1 in the ongoing marathon
    await this.createOngoingMarathonParticipant();

    // Don't seed any other participants - users should join manually to test join/leave flow
    // All other marathons start with currentPlayers = 0

    this.logger.log('✓ Marathon data seeded successfully');
  }

  private async createOngoingMarathonParticipant(): Promise<void> {
    const hasParticipants = await this.hasTable('marathon_participants');
    const hasUsers = await this.hasTable('users');
    const hasAccounts = await this.hasTable('metatrader_accounts');

    if (!hasParticipants || !hasUsers || !hasAccounts) {
      this.logger.warn('Required tables do not exist. Skipping participant creation.');
      return;
    }

    const manager = this.getManager();
    const userRepository = manager.getRepository(User);
    const accountRepository = manager.getRepository(MetaTraderAccount);
    const participantRepository = manager.getRepository(MarathonParticipant);
    const marathonRepository = manager.getRepository(Marathon);

    // Get test user 1
    const testUser = await userRepository.findOne({
      where: { email: 'testuser1@example.com' },
    });

    if (!testUser) {
      this.logger.warn('Test user 1 not found. Skipping participant creation.');
      return;
    }

    // Get the ongoing marathon
    const ongoingMarathon = await marathonRepository.findOne({
      where: { id: 'a1b2c3d4-e5f6-4789-a012-345678901019' },
    });

    if (!ongoingMarathon) {
      this.logger.warn('Ongoing marathon not found. Skipping participant creation.');
      return;
    }

    // Find a MetaTrader account with data (check for accounts that have Tokyo performance data)
    // First try to find account with login 261632689 which is commonly used in examples
    let metatraderAccount = await accountRepository.findOne({
      where: { login: '261632689', marathonParticipantId: null },
    });

    // If not found or already assigned, try to find any account with existing data
    if (!metatraderAccount) {
      const hasPerformanceTable = await this.hasTable('tokyo_performance');
      if (hasPerformanceTable) {
        const accountWithData = await this.query(`
          SELECT DISTINCT ma.id, ma.login, ma.name
          FROM metatrader_accounts ma
          INNER JOIN tokyo_performance tp ON tp."metaTraderAccountId" = ma.id
          WHERE ma."marathonParticipantId" IS NULL
          LIMIT 1
        `);

        if (accountWithData && accountWithData.length > 0) {
          metatraderAccount = await accountRepository.findOne({
            where: { id: accountWithData[0].id },
          });
        }
      }

      // If still not found, check other accounts that might have transaction history
      if (!metatraderAccount) {
        const hasTransactionTable = await this.hasTable('tokyo_transaction_history');
        if (hasTransactionTable) {
          const accountWithTransactions = await this.query(`
            SELECT DISTINCT ma.id, ma.login, ma.name
            FROM metatrader_accounts ma
            INNER JOIN tokyo_transaction_history tth ON tth."metaTraderAccountId" = ma.id
            WHERE ma."marathonParticipantId" IS NULL
            LIMIT 1
          `);

          if (accountWithTransactions && accountWithTransactions.length > 0) {
            metatraderAccount = await accountRepository.findOne({
              where: { id: accountWithTransactions[0].id },
            });
          }
        }
      }
    }

    // If still not found, get any unassigned account
    if (!metatraderAccount) {
      metatraderAccount = await accountRepository.findOne({
        where: { marathonParticipantId: null },
      });
    }

    if (!metatraderAccount) {
      this.logger.warn('No available MetaTrader account found. Skipping participant creation.');
      return;
    }

    // Check if participant already exists
    let participant = await participantRepository.findOne({
      where: {
        marathon: { id: ongoingMarathon.id },
        user: { id: testUser.id },
      },
    });

    if (participant) {
      // Update existing participant
      participant.isActive = true;
      participant.status = ParticipantStatus.ACTIVE;
      participant.cancelledAt = null;
      participant.metaTraderAccountId = metatraderAccount.id;
      participant = await participantRepository.save(participant);
    } else {
      // Create new participant
      participant = participantRepository.create({
        marathon: { id: ongoingMarathon.id },
        user: { id: testUser.id },
        metaTraderAccount: { id: metatraderAccount.id },
        metaTraderAccountId: metatraderAccount.id,
        isActive: true,
        status: ParticipantStatus.ACTIVE,
      });
      participant = await participantRepository.save(participant);
    }

    // Update MetaTrader account assignment
    metatraderAccount.marathonParticipantId = participant.id;
    metatraderAccount.userId = testUser.id;
    await accountRepository.save(metatraderAccount);

    // Update marathon currentPlayers count
    const currentCount = await participantRepository.count({
      where: {
        marathon: { id: ongoingMarathon.id },
        isActive: true,
      },
    });
    ongoingMarathon.currentPlayers = currentCount;
    await marathonRepository.save(ongoingMarathon);

    this.logger.log(`✓ Created participant for test user 1 in ongoing marathon with MetaTrader account ${metatraderAccount.login}`);
  }

  private async clearSeededPayments(): Promise<void> {
    const hasPayments = await this.hasTable('payment');

    if (!hasPayments || this.seededMarathonIds.length === 0) {
      return;
    }

    const placeholders = this.seededMarathonIds.map((_, index) => `$${index + 1}`).join(', ');

    const hasMarathonIdColumn = await this.hasColumn('payment', 'marathonId');
    if (hasMarathonIdColumn) {
      await this.query(
        `DELETE FROM payment WHERE "marathonId" IN (${placeholders})`,
        this.seededMarathonIds,
      );
    }

    const hasLegacyMarathonIdColumn = await this.hasColumn('payment', 'marathon_id');
    if (hasLegacyMarathonIdColumn) {
      await this.query(
        `DELETE FROM payment WHERE "marathon_id" IN (${placeholders})`,
        this.seededMarathonIds,
      );
    }
  }

  async clean(): Promise<void> {
    const hasMarathons = await this.hasTable('marathons');
    if (!hasMarathons) {
      return;
    }

    this.logger.log('Cleaning Marathon data...');

    const hasParticipants = await this.hasTable('marathon_participants');

    if (hasParticipants) {
      // Reset MetaTrader accounts assigned to test marathons before deleting participants
      await this.query(`
        UPDATE metatrader_accounts 
        SET "marathonParticipantId" = NULL,
            "userId" = NULL
        WHERE "marathonParticipantId" IN (
          SELECT id FROM marathon_participants 
          WHERE marathon_id IN ('a1b2c3d4-e5f6-4789-a012-345678901009', 'a1b2c3d4-e5f6-4789-a012-345678901019')
        )
      `);

      await this.query(`
        DELETE FROM marathon_participants 
        WHERE marathon_id IN (
          '${this.seededMarathonIds.join(`','`)}'
        )
      `);
    }

    await this.clearSeededPayments();

    await this.query(`
      DELETE FROM marathons WHERE id IN (
        '${this.seededMarathonIds.join(`','`)}'
      )
    `);

    this.logger.log('✓ Marathon data cleaned');
  }
}
