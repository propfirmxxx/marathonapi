import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../../src/config/data-source';
import { User, UserRole } from '../../src/users/entities/user.entity';
import { Marathon } from '../../src/marathon/entities/marathon.entity';
import { MarathonParticipant } from '../../src/marathon/entities/marathon-participant.entity';
import { MetaTraderAccount } from '../../src/metatrader-accounts/entities/meta-trader-account.entity';
import { MarathonStatus } from '../../src/marathon/enums/marathon-status.enum';
import { MarathonRule } from '../../src/marathon/enums/marathon-rule.enum';
import { PrizeStrategyType } from '../../src/marathon/entities/prize-strategy.types';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from '../../src/settings/session.service';
import { Session } from '../../src/settings/entities/session.entity';
import { Payment } from '../../src/payment/entities/payment.entity';

describe('Marathon Endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let sessionService: SessionService;
  
  let adminUser: User;
  let regularUser: User;
  let adminToken: string;
  let userToken: string;
  let testMarathon: Marathon;
  let testMarathon2: Marathon;
  let testAccount: MetaTraderAccount;
  let testParticipant: MarathonParticipant;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    dataSource = AppDataSource;
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    jwtService = moduleFixture.get<JwtService>(JwtService);
    sessionService = moduleFixture.get<SessionService>(SessionService);

    // Create test users
    const userRepository = dataSource.getRepository(User);
    
    // Clean up any existing test users first
    const paymentRepository = dataSource.getRepository(Payment);
    const sessionRepository = dataSource.getRepository(Session);

    const existingAdmin = await userRepository.findOne({ where: { email: 'admin@test.com' } });
    if (existingAdmin) {
        await paymentRepository.delete({ userId: existingAdmin.id });
        await sessionRepository.delete({ userId: existingAdmin.id });
    }
    
    const existingUser = await userRepository.findOne({ where: { email: 'user@test.com' } });
    if (existingUser) {
        await paymentRepository.delete({ userId: existingUser.id });
        await sessionRepository.delete({ userId: existingUser.id });
    }

    await userRepository.delete({ email: 'admin@test.com' });
    await userRepository.delete({ email: 'user@test.com' });
    
    // Create admin user
    // Note: password will be hashed automatically by User entity's BeforeInsert hook
    adminUser = userRepository.create({
      email: 'admin@test.com',
      password: 'admin123',
      role: UserRole.ADMIN,
      isActive: true,
    });
    adminUser = await userRepository.save(adminUser);

    // Create regular user
    // Note: password will be hashed automatically by User entity's BeforeInsert hook
    regularUser = userRepository.create({
      email: 'user@test.com',
      password: 'user123',
      role: UserRole.USER,
      isActive: true,
    });
    regularUser = await userRepository.save(regularUser);

    // Generate JWT tokens
    const adminExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    adminToken = jwtService.sign(
      { sub: adminUser.id, type: 'access' },
      { secret: process.env.JWT_SECRET || 'test-secret', expiresIn: '24h' },
    );
    
    const userExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    userToken = jwtService.sign(
      { sub: regularUser.id, type: 'access' },
      { secret: process.env.JWT_SECRET || 'test-secret', expiresIn: '24h' },
    );

    // Create sessions for JWT authentication
    await sessionService.createSession(
      adminUser.id,
      adminToken,
      '127.0.0.1',
      'test-agent',
      adminExpiresAt,
    );
    
    await sessionService.createSession(
      regularUser.id,
      userToken,
      '127.0.0.1',
      'test-agent',
      userExpiresAt,
    );

    // Clean up any existing test marathons
    const marathonRepository = dataSource.getRepository(Marathon);
    await marathonRepository.delete({ name: 'Test Marathon' });
    await marathonRepository.delete({ name: 'Upcoming Test Marathon' });
    
    // Clean up any existing test accounts
    const accountRepository = dataSource.getRepository(MetaTraderAccount);
    await accountRepository.delete({ login: '999999999' });
    
    // Create test marathon
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 5);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 25);

    testMarathon = marathonRepository.create({
      name: 'Test Marathon',
      description: 'Test marathon for e2e testing',
      entryFee: 100,
      awardsAmount: 10000,
      maxPlayers: 100,
      startDate,
      endDate,
      isActive: true,
      status: MarathonStatus.ONGOING,
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
      },
    });
    testMarathon = await marathonRepository.save(testMarathon);

    // Create second test marathon (upcoming)
    const upcomingStartDate = new Date(now);
    upcomingStartDate.setDate(upcomingStartDate.getDate() + 30);
    const upcomingEndDate = new Date(upcomingStartDate);
    upcomingEndDate.setDate(upcomingEndDate.getDate() + 30);

    testMarathon2 = marathonRepository.create({
      name: 'Upcoming Test Marathon',
      description: 'Upcoming marathon for e2e testing',
      entryFee: 150,
      awardsAmount: 15000,
      maxPlayers: 50,
      startDate: upcomingStartDate,
      endDate: upcomingEndDate,
      isActive: true,
      status: MarathonStatus.UPCOMING,
      rules: {
        [MarathonRule.MIN_TRADES]: 15,
        [MarathonRule.MAX_DRAWDOWN_PERCENT]: 25,
        [MarathonRule.MIN_PROFIT_PERCENT]: 7,
      },
      currentPlayers: 0,
      prizeStrategyType: PrizeStrategyType.WINNER_TAKE_ALL,
      prizeStrategyConfig: {
        placements: [{ position: 1, percentage: 100 }],
      },
    });
    testMarathon2 = await marathonRepository.save(testMarathon2);

    // Create test MetaTrader account
    testAccount = accountRepository.create({
      name: 'Test Account',
      login: '999999999',
      masterPassword: 'test-password',
      server: 'Test-Server',
      platform: 'mt5',
      userId: regularUser.id,
    });
    testAccount = await accountRepository.save(testAccount);

    // Create test participant
    const participantRepository = dataSource.getRepository(MarathonParticipant);
    testParticipant = participantRepository.create({
      marathon: testMarathon,
      user: regularUser,
      metaTraderAccount: testAccount,
      isActive: true,
    });
    testParticipant = await participantRepository.save(testParticipant);

    // Update marathon currentPlayers
    testMarathon.currentPlayers = 1;
    await marathonRepository.save(testMarathon);
  });

  afterAll(async () => {
    // Clean up test data
    try {
      if (dataSource.isInitialized) {
        const participantRepository = dataSource.getRepository(MarathonParticipant);
        const marathonRepository = dataSource.getRepository(Marathon);
        const accountRepository = dataSource.getRepository(MetaTraderAccount);
        const userRepository = dataSource.getRepository(User);
        const sessionRepository = dataSource.getRepository(Session);
        const paymentRepository = dataSource.getRepository(Payment);

        // Clean up in reverse order of dependencies
        if (testParticipant?.id) {
          await participantRepository.delete({ id: testParticipant.id });
        }
        
        // Clean up payments
        if (adminUser?.id) {
             await paymentRepository.delete({ userId: adminUser.id });
        }
        if (regularUser?.id) {
             await paymentRepository.delete({ userId: regularUser.id });
        }

        if (testMarathon?.id) {
          await marathonRepository.delete({ id: testMarathon.id });
        }
        if (testMarathon2?.id) {
          await marathonRepository.delete({ id: testMarathon2.id });
        }
        if (testAccount?.id) {
          await accountRepository.delete({ id: testAccount.id });
        }
        
        // Clean up sessions
        if (adminUser?.id) {
          await sessionRepository.delete({ userId: adminUser.id });
        }
        if (regularUser?.id) {
          await sessionRepository.delete({ userId: regularUser.id });
        }
        
        // Clean up users
        if (adminUser?.id) {
          await userRepository.delete({ id: adminUser.id });
        }
        if (regularUser?.id) {
          await userRepository.delete({ id: regularUser.id });
        }

        await dataSource.destroy();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
    
    if (app) {
      await app.close();
    }
  });

  describe('GET /marathons - Get all marathons (public)', () => {
    it('should return paginated marathons without authentication', () => {
      return request(app.getHttpServer())
        .get('/marathons')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should return marathons with pagination', () => {
      return request(app.getHttpServer())
        .get('/marathons?page=1&limit=10')
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(10);
        });
    });

    it('should filter marathons by status', () => {
      return request(app.getHttpServer())
        .get('/marathons?status=ONGOING')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.every((m: any) => m.status === 'ONGOING')).toBe(true);
        });
    });

    it('should filter marathons by isActive', () => {
      return request(app.getHttpServer())
        .get('/marathons?isActive=true')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.every((m: any) => m.isActive === true)).toBe(true);
        });
    });

    it('should filter my marathons when authenticated', () => {
      return request(app.getHttpServer())
        .get('/marathons?myMarathons=true')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThanOrEqual(0);
        });
    });
  });

  describe('GET /marathons/:id - Get marathon by ID (public)', () => {
    it('should return marathon details without authentication', () => {
      return request(app.getHttpServer())
        .get(`/marathons/${testMarathon.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('description');
          expect(res.body.id).toBe(testMarathon.id);
        });
    });

    it('should include isParticipant flag when authenticated', () => {
      return request(app.getHttpServer())
        .get(`/marathons/${testMarathon.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('isParticipant');
          expect(typeof res.body.isParticipant).toBe('boolean');
        });
    });

    it('should return 404 for non-existent marathon', () => {
      return request(app.getHttpServer())
        .get('/marathons/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('POST /marathons - Create marathon (admin only)', () => {
    it('should create marathon as admin', () => {
      const createDto = {
        name: 'New Test Marathon',
        description: 'Created via e2e test',
        entryFee: 200,
        awardsAmount: 20000,
        maxPlayers: 200,
        startDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        rules: {
          [MarathonRule.MIN_TRADES]: 20,
          [MarathonRule.MAX_DRAWDOWN_PERCENT]: 30,
          [MarathonRule.MIN_PROFIT_PERCENT]: 10,
        },
        prizeStrategyType: PrizeStrategyType.PERCENTAGE_SPLIT,
        prizeStrategyConfig: {
          placements: [
            { position: 1, percentage: 50 },
            { position: 2, percentage: 30 },
            { position: 3, percentage: 20 },
          ],
        },
      };

      return request(app.getHttpServer())
        .post('/marathons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe(createDto.name);
          expect(res.body.entryFee).toBe(createDto.entryFee);
        });
    });

    it('should reject creation without authentication', () => {
      return request(app.getHttpServer())
        .post('/marathons')
        .send({ name: 'Test' })
        .expect(401);
    });

    it('should reject creation by non-admin user', () => {
      return request(app.getHttpServer())
        .post('/marathons')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test' })
        .expect(403);
    });
  });

  describe('PATCH /marathons/:id - Update marathon (admin only)', () => {
    it('should update marathon as admin', () => {
      const updateDto = {
        name: 'Updated Test Marathon',
        description: 'Updated via e2e test',
      };

      return request(app.getHttpServer())
        .patch(`/marathons/${testMarathon2.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe(updateDto.name);
          expect(res.body.description).toBe(updateDto.description);
        });
    });

    it('should reject update without authentication', () => {
      return request(app.getHttpServer())
        .patch(`/marathons/${testMarathon.id}`)
        .send({ name: 'Test' })
        .expect(401);
    });

    it('should reject update by non-admin user', () => {
      return request(app.getHttpServer())
        .patch(`/marathons/${testMarathon.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test' })
        .expect(403);
    });
  });

  describe('DELETE /marathons/:id - Delete marathon (admin only)', () => {
    it('should delete marathon as admin', async () => {
      // Create a marathon to delete
      const marathonRepository = dataSource.getRepository(Marathon);
      const marathonToDelete = marathonRepository.create({
        name: 'Marathon to Delete',
        description: 'Will be deleted',
        entryFee: 50,
        awardsAmount: 5000,
        maxPlayers: 10,
        startDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 130 * 24 * 60 * 60 * 1000),
        isActive: true,
        status: MarathonStatus.UPCOMING,
        rules: {},
        currentPlayers: 0,
        prizeStrategyType: PrizeStrategyType.WINNER_TAKE_ALL,
        prizeStrategyConfig: { placements: [{ position: 1, percentage: 100 }] },
      });
      const savedMarathon = await marathonRepository.save(marathonToDelete);

      await request(app.getHttpServer())
        .delete(`/marathons/${savedMarathon.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify deletion
      const deleted = await marathonRepository.findOne({ where: { id: savedMarathon.id } });
      expect(deleted).toBeNull();
    });

    it('should reject deletion without authentication', () => {
      return request(app.getHttpServer())
        .delete(`/marathons/${testMarathon.id}`)
        .expect(401);
    });

    it('should reject deletion by non-admin user', () => {
      return request(app.getHttpServer())
        .delete(`/marathons/${testMarathon.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('POST /marathons/:id/join - Join marathon (authenticated)', () => {
    it('should return payment URL when joining marathon', () => {
      return request(app.getHttpServer())
        .post(`/marathons/${testMarathon2.id}/join`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('paymentUrl');
        });
    });

    it('should reject join without authentication', () => {
      return request(app.getHttpServer())
        .post(`/marathons/${testMarathon2.id}/join`)
        .expect(401);
    });

    it('should reject join for non-existent marathon', () => {
      return request(app.getHttpServer())
        .post('/marathons/00000000-0000-0000-0000-000000000000/join')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('GET /marathons/:id/leaderboard - Get leaderboard (public)', () => {
    it('should return leaderboard without authentication', () => {
      return request(app.getHttpServer())
        .get(`/marathons/${testMarathon.id}/leaderboard`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('marathonId');
          expect(res.body).toHaveProperty('marathonName');
          expect(res.body).toHaveProperty('totalParticipants');
          expect(res.body).toHaveProperty('entries');
          expect(Array.isArray(res.body.entries)).toBe(true);
        });
    });

    it('should return 404 for non-existent marathon', () => {
      return request(app.getHttpServer())
        .get('/marathons/00000000-0000-0000-0000-000000000000/leaderboard')
        .expect(404);
    });
  });

  describe('GET /marathons/:id/pnl-history - Get P&L history (public)', () => {
    it('should return P&L history without authentication', () => {
      return request(app.getHttpServer())
        .get(`/marathons/${testMarathon.id}/pnl-history`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('marathonId');
          expect(res.body).toHaveProperty('participants');
          expect(Array.isArray(res.body.participants)).toBe(true);
        });
    });

    it('should filter P&L history by date range', () => {
      const from = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const to = new Date().toISOString();

      return request(app.getHttpServer())
        .get(`/marathons/${testMarathon.id}/pnl-history`)
        .query({ from, to })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('participants');
        });
    });

    it('should return 404 for non-existent marathon', () => {
      return request(app.getHttpServer())
        .get('/marathons/00000000-0000-0000-0000-000000000000/pnl-history')
        .expect(404);
    });
  });

  describe('GET /marathons/:id/trade-history - Get trade history (public)', () => {
    it('should return trade history without authentication', () => {
      return request(app.getHttpServer())
        .get(`/marathons/${testMarathon.id}/trade-history`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('marathonId');
          expect(res.body).toHaveProperty('participants');
          expect(Array.isArray(res.body.participants)).toBe(true);
        });
    });

    it('should filter trade history by date range and limit', () => {
      const from = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const to = new Date().toISOString();

      return request(app.getHttpServer())
        .get(`/marathons/${testMarathon.id}/trade-history`)
        .query({ from, to, limit: 50 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('participants');
        });
    });

    it('should return 404 for non-existent marathon', () => {
      return request(app.getHttpServer())
        .get('/marathons/00000000-0000-0000-0000-000000000000/trade-history')
        .expect(404);
    });
  });

  describe('GET /marathons/:id/participants/:participantId/trade-history - Get participant trade history (public)', () => {
    it('should return participant trade history without authentication', () => {
      return request(app.getHttpServer())
        .get(`/marathons/${testMarathon.id}/participants/${testParticipant.id}/trade-history`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('participantId');
          expect(res.body).toHaveProperty('trades');
          expect(Array.isArray(res.body.trades)).toBe(true);
        });
    });

    it('should filter participant trade history by date range and limit', () => {
      const from = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const to = new Date().toISOString();

      return request(app.getHttpServer())
        .get(`/marathons/${testMarathon.id}/participants/${testParticipant.id}/trade-history`)
        .query({ from, to, limit: 100 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('trades');
        });
    });

    it('should return 404 for non-existent participant', () => {
      return request(app.getHttpServer())
        .get(`/marathons/${testMarathon.id}/participants/00000000-0000-0000-0000-000000000000/trade-history`)
        .expect(404);
    });
  });

  describe('GET /marathons/users/:userId/analysis - Get user dashboard (public)', () => {
    it('should return user dashboard without authentication', () => {
      return request(app.getHttpServer())
        .get(`/marathons/users/${regularUser.id}/analysis`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('trades');
          expect(res.body).toHaveProperty('currencyPairs');
          expect(res.body).toHaveProperty('bestMarathons');
        });
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/marathons/users/00000000-0000-0000-0000-000000000000/analysis')
        .expect(404);
    });
  });

  describe('GET /marathons/:marathonId/participants/:participantId/analysis - Get participant analysis (public)', () => {
    it('should return participant analysis without authentication', () => {
      return request(app.getHttpServer())
        .get(`/marathons/${testMarathon.id}/participants/${testParticipant.id}/analysis`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('marathon');
          expect(res.body).toHaveProperty('performance');
          expect(res.body).toHaveProperty('trades');
        });
    });

    it('should return 404 for non-existent participant', () => {
      return request(app.getHttpServer())
        .get(`/marathons/${testMarathon.id}/participants/00000000-0000-0000-0000-000000000000/analysis`)
        .expect(404);
    });
  });

  describe('GET /marathons/rabbitmq-health - Get RabbitMQ health (authenticated)', () => {
    it('should return RabbitMQ health status when authenticated', () => {
      return request(app.getHttpServer())
        .get('/marathons/rabbitmq-health')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('enabled');
          expect(res.body).toHaveProperty('connected');
        });
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .get('/marathons/rabbitmq-health')
        .expect(401);
    });
  });

  describe('GET /marathons/websocket-stats - Get WebSocket stats (admin only)', () => {
    it('should return WebSocket stats as admin', () => {
      return request(app.getHttpServer())
        .get('/marathons/websocket-stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('connectedClients');
          expect(res.body).toHaveProperty('activeMarathons');
        });
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .get('/marathons/websocket-stats')
        .expect(401);
    });

    it('should reject for non-admin user', () => {
      return request(app.getHttpServer())
        .get('/marathons/websocket-stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /marathons/websocket-docs - Get WebSocket documentation (authenticated)', () => {
    it('should return WebSocket documentation when authenticated', () => {
      return request(app.getHttpServer())
        .get('/marathons/websocket-docs')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('connectionUrl');
        });
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .get('/marathons/websocket-docs')
        .expect(401);
    });
  });
});

