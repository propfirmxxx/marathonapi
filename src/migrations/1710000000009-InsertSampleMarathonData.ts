import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertSampleMarathonData1710000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: do nothing if the marathons table does not exist yet
    const hasMarathons = await queryRunner.hasTable('marathons');
    const hasParticipants = await queryRunner.hasTable('marathon_participants');
    
    if (!hasMarathons) return;

    // Clear existing marathon data (participants will be cascaded if FK constraint exists)
    if (hasParticipants) {
      await queryRunner.query(`DELETE FROM marathon_participants`);
    }
    await queryRunner.query(`DELETE FROM marathons`);

    // Get current timestamp for date calculations
    const now = new Date();
    
    // Calculate dates for different marathon types
    // Past marathon: ended 15 days ago
    const pastStartDate = new Date(now);
    pastStartDate.setDate(pastStartDate.getDate() - 60);
    const pastEndDate = new Date(now);
    pastEndDate.setDate(pastEndDate.getDate() - 15);
    
    // Active marathon: started 10 days ago, ends in 20 days
    const activeStartDate = new Date(now);
    activeStartDate.setDate(activeStartDate.getDate() - 10);
    const activeEndDate = new Date(now);
    activeEndDate.setDate(activeEndDate.getDate() + 20);
    
    // Upcoming marathon: starts in 30 days
    const upcomingStartDate = new Date(now);
    upcomingStartDate.setDate(upcomingStartDate.getDate() + 30);
    const upcomingEndDate = new Date(upcomingStartDate);
    upcomingEndDate.setDate(upcomingEndDate.getDate() + 30);
    
    // Future marathon 2: starts in 60 days
    const future2StartDate = new Date(now);
    future2StartDate.setDate(future2StartDate.getDate() + 60);
    const future2EndDate = new Date(future2StartDate);
    future2EndDate.setDate(future2EndDate.getDate() + 30);
    
    // Future marathon 3: starts in 90 days
    const future3StartDate = new Date(now);
    future3StartDate.setDate(future3StartDate.getDate() + 90);
    const future3EndDate = new Date(future3StartDate);
    future3EndDate.setDate(future3EndDate.getDate() + 30);

    // Insert marathon records
    await queryRunner.query(`
      INSERT INTO marathons (
        id, name, description, "entryFee", "awardsAmount", "maxPlayers", 
        "startDate", "endDate", "isActive", rules, "currentPlayers", 
        "createdAt", "updatedAt"
      ) VALUES
      (
        'a1b2c3d4-e5f6-4789-a012-345678901001',
        'Past Trading Championship',
        'A completed 30-day trading marathon that ended successfully. This championship featured competitive trading with cash prizes awarded to top performers.',
        150.00,
        15000.00,
        100,
        '${pastStartDate.toISOString()}',
        '${pastEndDate.toISOString()}',
        false,
        '{"minTrades": 10, "maxDrawdown": 20, "minProfit": 5, "allowedInstruments": ["EURUSD", "GBPUSD", "USDJPY", "BTCUSD"], "maxLeverage": 100, "minTradeDuration": 60}',
        85,
        '${pastStartDate.toISOString()}',
        '${pastEndDate.toISOString()}'
      ),
      (
        'a1b2c3d4-e5f6-4789-a012-345678901002',
        'Active Trading Marathon',
        'A competitive 30-day trading marathon currently in progress. Participants are trading live with real-time leaderboard updates and cash prizes awaiting the winners.',
        75.00,
        7500.00,
        100,
        '${activeStartDate.toISOString()}',
        '${activeEndDate.toISOString()}',
        true,
        '{"minTrades": 15, "maxDrawdown": 25, "minProfit": 7, "allowedInstruments": ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD"], "maxLeverage": 100, "minTradeDuration": 90}',
        67,
        '${activeStartDate.toISOString()}',
        NOW()
      ),
      (
        'a1b2c3d4-e5f6-4789-a012-345678901003',
        'Upcoming Winter Challenge',
        'Join us for an exciting winter trading challenge! Registration is now open for this upcoming marathon featuring enhanced prizes and special winter trading themes.',
        120.00,
        12000.00,
        150,
        '${upcomingStartDate.toISOString()}',
        '${upcomingEndDate.toISOString()}',
        true,
        '{"minTrades": 12, "maxDrawdown": 22, "minProfit": 6, "allowedInstruments": ["EURUSD", "GBPUSD", "USDJPY", "BTCUSD", "ETHUSD"], "maxLeverage": 150, "minTradeDuration": 75}',
        23,
        NOW(),
        NOW()
      ),
      (
        'a1b2c3d4-e5f6-4789-a012-345678901004',
        'Full Capacity Marathon',
        'This marathon has reached maximum capacity. All slots have been filled and the event is proceeding with the maximum number of participants.',
        200.00,
        20000.00,
        200,
        '${activeStartDate.toISOString()}',
        '${activeEndDate.toISOString()}',
        true,
        '{"minTrades": 20, "maxDrawdown": 30, "minProfit": 10, "allowedInstruments": ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD"], "maxLeverage": 200, "minTradeDuration": 120}',
        200,
        '${activeStartDate.toISOString()}',
        NOW()
      ),
      (
        'a1b2c3d4-e5f6-4789-a012-345678901005',
        'Spring Trading Marathon',
        'Welcome spring with our annual Spring Trading Marathon! Perfect for traders of all levels, featuring moderate entry fees and generous prize pools.',
        50.00,
        5000.00,
        50,
        '${upcomingStartDate.toISOString()}',
        '${upcomingEndDate.toISOString()}',
        true,
        '{"minTrades": 8, "maxDrawdown": 15, "minProfit": 4, "allowedInstruments": ["EURUSD", "GBPUSD", "USDJPY"], "maxLeverage": 50, "minTradeDuration": 45}',
        32,
        NOW(),
        NOW()
      ),
      (
        'a1b2c3d4-e5f6-4789-a012-345678901006',
        'Elite Traders Championship',
        'For the most skilled traders only. This championship offers high stakes, premium prizes, and the toughest competition. Are you ready to prove your trading mastery?',
        250.00,
        25000.00,
        200,
        '${future2StartDate.toISOString()}',
        '${future2EndDate.toISOString()}',
        true,
        '{"minTrades": 25, "maxDrawdown": 15, "minProfit": 12, "allowedInstruments": ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "CHFUSD"], "maxLeverage": 300, "minTradeDuration": 180}',
        156,
        NOW(),
        NOW()
      ),
      (
        'a1b2c3d4-e5f6-4789-a012-345678901007',
        'Professional Trading League',
        'The ultimate professional trading competition. This league features the highest entry fee and the most substantial prize pool, attracting only the most serious traders.',
        500.00,
        50000.00,
        500,
        '${future3StartDate.toISOString()}',
        '${future3EndDate.toISOString()}',
        false,
        '{"minTrades": 30, "maxDrawdown": 10, "minProfit": 15, "allowedInstruments": ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "CHFUSD", "BTCUSD", "ETHUSD"], "maxLeverage": 500, "minTradeDuration": 300}',
        342,
        NOW(),
        NOW()
      ),
      (
        'a1b2c3d4-e5f6-4789-a012-345678901008',
        'Beginner Friendly Tournament',
        'Perfect for newcomers to trading competitions! Low entry fee, comprehensive support, and learning-focused environment make this ideal for beginner traders.',
        25.00,
        2500.00,
        1000,
        '${upcomingStartDate.toISOString()}',
        '${upcomingEndDate.toISOString()}',
        true,
        '{"minTrades": 5, "maxDrawdown": 30, "minProfit": 2, "allowedInstruments": ["EURUSD", "GBPUSD"], "maxLeverage": 50, "minTradeDuration": 30}',
        187,
        NOW(),
        NOW()
      )
    `);

    // Query existing users to link participants
    const users = await queryRunner.query(`
      SELECT id FROM users ORDER BY "createdAt" LIMIT 50
    `);

    // Only create participants if users exist
    if (users && users.length > 0 && hasParticipants) {
      const marathonIds = [
        'a1b2c3d4-e5f6-4789-a012-345678901001', // Past Marathon
        'a1b2c3d4-e5f6-4789-a012-345678901002', // Active Marathon
        'a1b2c3d4-e5f6-4789-a012-345678901003', // Upcoming Marathon
        'a1b2c3d4-e5f6-4789-a012-345678901004', // Full Capacity Marathon
        'a1b2c3d4-e5f6-4789-a012-345678901005', // Spring Trading Marathon
        'a1b2c3d4-e5f6-4789-a012-345678901006', // Elite Traders Championship
        'a1b2c3d4-e5f6-4789-a012-345678901007', // Professional Trading League
        'a1b2c3d4-e5f6-4789-a012-345678901008', // Beginner Friendly Tournament
      ];

      const participantValues: string[] = [];
      let participantIndex = 0;

      // Create participants for each marathon
      marathonIds.forEach((marathonId, marathonIndex) => {
        // Determine participant count based on marathon
        let participantCount = 0;
        if (marathonIndex === 0) { // Past Marathon
          participantCount = 85;
        } else if (marathonIndex === 1) { // Active Marathon
          participantCount = 67;
        } else if (marathonIndex === 2) { // Upcoming Marathon
          participantCount = 23;
        } else if (marathonIndex === 3) { // Full Capacity Marathon
          participantCount = 200;
        } else if (marathonIndex === 4) { // Spring Trading Marathon
          participantCount = 32;
        } else if (marathonIndex === 5) { // Elite Traders Championship
          participantCount = 156;
        } else if (marathonIndex === 6) { // Professional Trading League
          participantCount = 342;
        } else if (marathonIndex === 7) { // Beginner Friendly Tournament
          participantCount = 187;
        }

        // Limit to available users
        const actualCount = Math.min(participantCount, users.length);
        
        // Create participant join dates (before or at marathon start)
        const marathon = marathonIndex === 0 
          ? { startDate: pastStartDate }
          : marathonIndex === 1
          ? { startDate: activeStartDate }
          : { startDate: upcomingStartDate };

        for (let i = 0; i < actualCount; i++) {
          const userId = users[i % users.length].id;
          const joinDate = new Date(marathon.startDate);
          joinDate.setDate(joinDate.getDate() - Math.floor(Math.random() * 7)); // 0-7 days before start
          
          const isActive = Math.random() > 0.15; // 85% active
          const metaTraderId = `MT${String(1000000 + participantIndex).padStart(6, '0')}`;
          
          participantValues.push(
            `('${this.generateParticipantId(participantIndex)}', '${marathonId}', '${userId}', '${metaTraderId}', ${isActive}, '${joinDate.toISOString()}', '${joinDate.toISOString()}')`
          );
          participantIndex++;
        }
      });

      if (participantValues.length > 0) {
        await queryRunner.query(`
          INSERT INTO marathon_participants (
            id, marathon_id, user_id, "metaTraderAccountId", "isActive", 
            "createdAt", "updatedAt"
          ) VALUES ${participantValues.join(', ')}
        `);
      }

      // Update currentPlayers count based on actual participant count per marathon
      const participantCounts = await queryRunner.query(`
        SELECT marathon_id, COUNT(*) as count 
        FROM marathon_participants 
        GROUP BY marathon_id
      `);

      for (const countRow of participantCounts) {
        await queryRunner.query(`
          UPDATE marathons 
          SET "currentPlayers" = ${countRow.count} 
          WHERE id = '${countRow.marathon_id}'
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Safe down: only attempt delete if table exists
    const hasMarathons = await queryRunner.hasTable('marathons');
    if (!hasMarathons) return;

    const hasParticipants = await queryRunner.hasTable('marathon_participants');
    if (hasParticipants) {
      // Remove participants linked to seeded marathons
      await queryRunner.query(`
        DELETE FROM marathon_participants 
        WHERE marathon_id IN (
          'a1b2c3d4-e5f6-4789-a012-345678901001',
          'a1b2c3d4-e5f6-4789-a012-345678901002',
          'a1b2c3d4-e5f6-4789-a012-345678901003',
          'a1b2c3d4-e5f6-4789-a012-345678901004',
          'a1b2c3d4-e5f6-4789-a012-345678901005',
          'a1b2c3d4-e5f6-4789-a012-345678901006',
          'a1b2c3d4-e5f6-4789-a012-345678901007',
          'a1b2c3d4-e5f6-4789-a012-345678901008'
        )
      `);
    }

    // Remove the inserted marathon data
    await queryRunner.query(`
      DELETE FROM marathons WHERE id IN (
        'a1b2c3d4-e5f6-4789-a012-345678901001',
        'a1b2c3d4-e5f6-4789-a012-345678901002',
        'a1b2c3d4-e5f6-4789-a012-345678901003',
        'a1b2c3d4-e5f6-4789-a012-345678901004',
        'a1b2c3d4-e5f6-4789-a012-345678901005',
        'a1b2c3d4-e5f6-4789-a012-345678901006',
        'a1b2c3d4-e5f6-4789-a012-345678901007',
        'a1b2c3d4-e5f6-4789-a012-345678901008'
      )
    `);
  }

  private generateParticipantId(index: number): string {
    // Generate deterministic UUID-like IDs for participants
    // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const hex = index.toString(16).padStart(12, '0');
    return `b1c2d3e4-f5a6-4${hex.slice(0, 3)}-a${hex.slice(3, 6)}-${hex.slice(6, 12)}`;
  }
}

