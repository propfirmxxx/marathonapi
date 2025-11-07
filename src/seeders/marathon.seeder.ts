import { DataSource } from 'typeorm';
import { BaseSeeder } from './base-seeder';
import { Marathon } from '../marathon/entities/marathon.entity';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';

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
      await this.query(`DELETE FROM marathon_participants`);
    }
    await this.clearSeededPayments();
    await this.query(`DELETE FROM marathons`);

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
        rules: {
          minTrades: 10,
          maxDrawdown: 20,
          minProfit: 5,
          allowedInstruments: ['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD'],
          maxLeverage: 100,
          minTradeDuration: 60,
        },
        currentPlayers: 85,
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
        rules: {
          minTrades: 15,
          maxDrawdown: 25,
          minProfit: 7,
          allowedInstruments: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'],
          maxLeverage: 100,
          minTradeDuration: 90,
        },
        currentPlayers: 67,
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
        rules: {
          minTrades: 12,
          maxDrawdown: 22,
          minProfit: 6,
          allowedInstruments: ['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD'],
          maxLeverage: 150,
          minTradeDuration: 75,
        },
        currentPlayers: 23,
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
        rules: {
          minTrades: 20,
          maxDrawdown: 30,
          minProfit: 10,
          allowedInstruments: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD'],
          maxLeverage: 200,
          minTradeDuration: 120,
        },
        currentPlayers: 200,
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
        rules: {
          minTrades: 8,
          maxDrawdown: 15,
          minProfit: 4,
          allowedInstruments: ['EURUSD', 'GBPUSD', 'USDJPY'],
          maxLeverage: 50,
          minTradeDuration: 45,
        },
        currentPlayers: 32,
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
        rules: {
          minTrades: 25,
          maxDrawdown: 15,
          minProfit: 12,
          allowedInstruments: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'CHFUSD'],
          maxLeverage: 300,
          minTradeDuration: 180,
        },
        currentPlayers: 156,
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
        rules: {
          minTrades: 30,
          maxDrawdown: 10,
          minProfit: 15,
          allowedInstruments: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'CHFUSD', 'BTCUSD', 'ETHUSD'],
          maxLeverage: 500,
          minTradeDuration: 300,
        },
        currentPlayers: 342,
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
        rules: {
          minTrades: 5,
          maxDrawdown: 30,
          minProfit: 2,
          allowedInstruments: ['EURUSD', 'GBPUSD'],
          maxLeverage: 50,
          minTradeDuration: 30,
        },
        currentPlayers: 187,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await marathonRepository.save(marathons);

    // Seed participants if users exist
    if (hasParticipants) {
      await this.seedParticipants(marathons);
    }

    this.logger.log('✓ Marathon data seeded successfully');
  }

  private async seedParticipants(marathons: Marathon[]): Promise<void> {
    // Query existing users
    const users = await this.query(`
      SELECT id FROM users ORDER BY "createdAt" LIMIT 50
    `);

    if (!users || users.length === 0) {
      this.logger.warn('No users found. Skipping participant seeding.');
      return;
    }

    this.logger.log(`Found ${users.length} users. Seeding participants...`);

    const participantCounts = [85, 67, 23, 200, 32, 156, 342, 187];
    const participantValues: string[] = [];
    let participantIndex = 0;

    marathons.forEach((marathon, marathonIndex) => {
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
