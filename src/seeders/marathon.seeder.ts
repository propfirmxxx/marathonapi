import { DataSource } from 'typeorm';
import { BaseSeeder } from './base-seeder';
import { Marathon } from '../marathon/entities/marathon.entity';
import { PrizeStrategyType } from '../marathon/entities/prize-strategy.types';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';
import { MarathonStatus } from '../marathon/enums/marathon-status.enum';
import { MarathonRule } from '../marathon/enums/marathon-rule.enum';
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
        currentPlayers: 85,
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
        currentPlayers: 67,
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
        currentPlayers: 23,
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
        currentPlayers: 200,
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
        currentPlayers: 32,
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
        currentPlayers: 156,
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
        currentPlayers: 342,
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
        currentPlayers: 187,
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
        currentPlayers: 45,
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
        currentPlayers: 78,
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
        currentPlayers: 12,
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
        currentPlayers: 89,
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
    ]);

    await marathonRepository.save(marathons);

    // Seed participants if users exist
    if (hasParticipants) {
      await this.seedParticipants(marathons);
      // Seed test marathon participants with specific accounts
      await this.seedTestMarathonParticipants();
    }

    this.logger.log('✓ Marathon data seeded successfully');
  }

  private async seedParticipants(marathons: Marathon[]): Promise<void> {
    // Query existing users, excluding test users
    const users = await this.query(`
      SELECT id FROM users 
      WHERE email NOT IN ('testuser1@example.com', 'testuser2@example.com')
      ORDER BY "createdAt" LIMIT 50
    `);

    if (!users || users.length === 0) {
      this.logger.warn('No users found. Skipping participant seeding.');
      return;
    }

    this.logger.log(`Found ${users.length} users. Seeding participants...`);

    const participantCounts = [85, 67, 23, 200, 32, 156, 342, 187, 0, 45, 78, 12, 89];
    const participantValues: string[] = [];
    let participantIndex = 0;

    // Exclude test marathon (index 8) from regular participant seeding
    marathons.forEach((marathon, marathonIndex) => {
      // Skip test marathon (it will be handled separately)
      if (marathonIndex === 8) {
        return;
      }

      const participantCount = Math.min(participantCounts[marathonIndex] || 0, users.length);

      for (let i = 0; i < participantCount; i++) {
        const userId = users[i % users.length].id;
        const joinDate = new Date(marathon.startDate);
        joinDate.setDate(joinDate.getDate() - Math.floor(Math.random() * 7));

        const isActive = Math.random() > 0.15;
        const participantId = this.generateParticipantId(participantIndex);

        participantValues.push(
          `('${participantId}', '${marathon.id}', '${userId}', NULL, ${isActive}, '${joinDate.toISOString()}', '${joinDate.toISOString()}')`,
        );
        participantIndex++;
      }
    });

    if (participantValues.length > 0) {
      await this.query(`
        INSERT INTO marathon_participants (
          id, marathon_id, user_id, "metaTraderAccountId", "isActive", 
          "createdAt", "updatedAt"
        ) VALUES ${participantValues.join(', ')}
      `);

      // Update currentPlayers count
      const counts = await this.query(`
        SELECT marathon_id, COUNT(*) as count 
        FROM marathon_participants 
        GROUP BY marathon_id
      `);

      for (const countRow of counts) {
        await this.query(`
          UPDATE marathons 
          SET "currentPlayers" = ${countRow.count} 
          WHERE id = '${countRow.marathon_id}'
        `);
      }
    }
  }

  private generateParticipantId(index: number): string {
    const hex = index.toString(16).padStart(12, '0');
    return `b1c2d3e4-f5a6-4000-a000-${hex}`;
  }

  private async seedTestMarathonParticipants(): Promise<void> {
    const marathonId = 'a1b2c3d4-e5f6-4789-a012-345678901009';
    const manager = this.getManager();
    const userRepository = manager.getRepository(User);
    const accountRepository = manager.getRepository(MetaTraderAccount);
    const marathonRepository = manager.getRepository(Marathon);
    const participantRepository = manager.getRepository(MarathonParticipant);

    // Find test users using repository
    const testUsers = await userRepository.find({
      where: [
        { email: 'testuser1@example.com' },
        { email: 'testuser2@example.com' },
      ],
      order: { email: 'ASC' },
    });

    if (!testUsers || testUsers.length !== 2) {
      this.logger.warn(`Test users not found. Found ${testUsers?.length || 0} users. Skipping test marathon participant seeding.`);
      return;
    }

    this.logger.log(`Found ${testUsers.length} test users: ${testUsers.map(u => u.email).join(', ')}`);

    // Find test MetaTrader accounts using repository
    const testAccounts = await accountRepository.find({
      where: [
        { login: '261632689' },
        { login: '261632685' },
      ],
      order: { login: 'ASC' },
    });

    if (!testAccounts || testAccounts.length !== 2) {
      this.logger.warn(`Test MetaTrader accounts not found. Found ${testAccounts?.length || 0} accounts. Skipping test marathon participant seeding.`);
      return;
    }

    this.logger.log(`Found ${testAccounts.length} test accounts: ${testAccounts.map(a => a.login).join(', ')}`);

    // Find marathon
    const marathon = await marathonRepository.findOne({
      where: { id: marathonId },
    });

    if (!marathon) {
      this.logger.warn(`Test marathon not found. Skipping test marathon participant seeding.`);
      return;
    }

    // Check if participants already exist
    const existingParticipants = await participantRepository
      .createQueryBuilder('participant')
      .where('participant.marathon_id = :marathonId', { marathonId })
      .andWhere('participant.user_id IN (:...userIds)', { userIds: testUsers.map(u => u.id) })
      .getMany();

    if (existingParticipants.length > 0) {
      this.logger.log(`Found ${existingParticipants.length} existing participants. Updating them...`);
      
      // Update existing participants
      for (let i = 0; i < Math.min(existingParticipants.length, 2); i++) {
        existingParticipants[i].isActive = true;
        existingParticipants[i].metaTraderAccountId = testAccounts[i].id;
        await participantRepository.save(existingParticipants[i]);
      }

      // Create missing participants if needed
      if (existingParticipants.length < 2) {
        const missingIndex = existingParticipants.length;
        const newParticipant = participantRepository.create({
          marathon: marathon,
          user: testUsers[missingIndex],
          metaTraderAccountId: testAccounts[missingIndex].id,
          isActive: true,
        });
        await participantRepository.save(newParticipant);
      }
    } else {
      // Create new participants
      const participants = participantRepository.create([
        {
          marathon: marathon,
          user: testUsers[0],
          metaTraderAccountId: testAccounts[0].id,
          isActive: true,
        },
        {
          marathon: marathon,
          user: testUsers[1],
          metaTraderAccountId: testAccounts[1].id,
          isActive: true,
        },
      ]);

      await participantRepository.save(participants);
      this.logger.log(`Created ${participants.length} new participants`);
    }

    // Get all participants for this marathon to update accounts
    const allParticipants = await participantRepository
      .createQueryBuilder('participant')
      .leftJoinAndSelect('participant.user', 'user')
      .where('participant.marathon_id = :marathonId', { marathonId })
      .andWhere('participant.user_id IN (:...userIds)', { userIds: testUsers.map(u => u.id) })
      .getMany();

    // Update MetaTrader accounts to link them to participants
    for (let i = 0; i < Math.min(allParticipants.length, 2); i++) {
      const participant = allParticipants[i];
      const account = testAccounts[i];
      
      account.marathonParticipantId = participant.id;
      account.userId = testUsers[i].id;
      await accountRepository.save(account);
    }

    // Update marathon currentPlayers count
    marathon.currentPlayers = allParticipants.filter(p => p.isActive).length;
    await marathonRepository.save(marathon);

    this.logger.log(`✓ Test marathon participants seeded successfully. ${marathon.currentPlayers} active participants.`);
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
      // Reset MetaTrader accounts assigned to test marathon before deleting participants
      await this.query(`
        UPDATE metatrader_accounts 
        SET "marathonParticipantId" = NULL,
            "userId" = NULL
        WHERE "marathonParticipantId" IN (
          SELECT id FROM marathon_participants 
          WHERE marathon_id = 'a1b2c3d4-e5f6-4789-a012-345678901009'
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
