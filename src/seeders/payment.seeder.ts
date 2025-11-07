import { DataSource } from 'typeorm';
import { BaseSeeder } from './base-seeder';
import { Payment } from '../payment/entities/payment.entity';
import { PaymentStatus } from '../payment/enums/payment-status.enum';
import { PaymentType } from '../payment/enums/payment-type.enum';
import { PaymentGateway } from '../payment/enums/payment-gateway.enum';

interface SeedUser {
  id: string;
}

interface SeedMarathon {
  id: string;
}

export class PaymentSeeder extends BaseSeeder {
  getName(): string {
    return 'PaymentSeeder';
  }

  async run(): Promise<void> {
    const hasPaymentTable = await this.hasTable('payment');

    if (!hasPaymentTable) {
      this.logger.warn('Payment table does not exist. Skipping Payment seeding.');
      return;
    }

    const users = await this.fetchUsers();

    if (!users.length) {
      this.logger.warn('No users found. Skipping Payment seeding.');
      return;
    }

    this.logger.log(`Seeding Payment data for ${users.length} users...`);

    await this.query(`DELETE FROM payment WHERE "isTest" = true`);

    const marathons = await this.fetchMarathons();
    const manager = this.getManager();
    const paymentRepository = manager.getRepository(Payment);

    const payments = users.flatMap((user, userIndex) => {
      const count = 3 + (userIndex % 2); // 3 or 4 payments per user

      return Array.from({ length: count }).map((_, paymentIndex) =>
        paymentRepository.create(
          this.buildPaymentData({
            userId: user.id,
            userIndex,
            paymentIndex,
            marathonId: this.pickMarathonId(marathons, userIndex, paymentIndex),
          }),
        ),
      );
    });

    if (!payments.length) {
      this.logger.warn('No payment records generated. Skipping save.');
      return;
    }

    await paymentRepository.save(payments);
    this.logger.log(`✓ Inserted ${payments.length} payment records`);
  }

  async clean(): Promise<void> {
    const hasPaymentTable = await this.hasTable('payment');

    if (!hasPaymentTable) {
      return;
    }

    this.logger.log('Cleaning Payment data...');
    await this.query(`DELETE FROM payment WHERE "isTest" = true`);
    this.logger.log('✓ Payment data cleaned');
  }

  private async fetchUsers(): Promise<SeedUser[]> {
    const hasUsersTable = await this.hasTable('users');

    if (!hasUsersTable) {
      return [];
    }

    const result = await this.query(
      `SELECT id FROM users WHERE "deletedAt" IS NULL ORDER BY "createdAt" LIMIT 100`,
    );

    return result as SeedUser[];
  }

  private async fetchMarathons(): Promise<SeedMarathon[]> {
    const hasMarathonTable = await this.hasTable('marathons');

    if (!hasMarathonTable) {
      return [];
    }

    const result = await this.query(
      `SELECT id FROM marathons ORDER BY "startDate"`,
    );

    return result as SeedMarathon[];
  }

  private pickMarathonId(
    marathons: SeedMarathon[],
    userIndex: number,
    paymentIndex: number,
  ): string | null {
    if (!marathons.length) {
      return null;
    }

    return marathons[(userIndex + paymentIndex) % marathons.length].id;
  }

  private buildPaymentData({
    userId,
    userIndex,
    paymentIndex,
    marathonId,
  }: {
    userId: string;
    userIndex: number;
    paymentIndex: number;
    marathonId: string | null;
  }): Partial<Payment> {
    const statusCycle = [
      PaymentStatus.COMPLETED,
      PaymentStatus.PENDING,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELLED,
    ];

    const paymentTypeCycle = [
      PaymentType.WALLET_CHARGE,
      PaymentType.MARATHON_JOIN,
    ];

    const status = statusCycle[(userIndex + paymentIndex) % statusCycle.length];
    const paymentType =
      paymentTypeCycle[(userIndex + paymentIndex) % paymentTypeCycle.length];

    const baseAmount = 35 + (userIndex % 5) * 20 + paymentIndex * 10;
    const amount = Number((baseAmount + 0.99).toFixed(2));
    const createdAt = this.generateCreatedAt(userIndex, paymentIndex);

    const paymentData: Partial<Payment> = {
      userId,
      amount,
      status,
      paymentType,
      gateway: PaymentGateway.NOWPAYMENTS,
      transactionId:
        status === PaymentStatus.COMPLETED
          ? `TX-MOCK-${userIndex.toString().padStart(4, '0')}-${paymentIndex}`
          : null,
      nowpaymentsId: `np_mock_${userIndex}_${paymentIndex}`,
      payAddress: `MOCKPAYADDR${userIndex}${paymentIndex}`,
      payAmount: Number((amount / 100).toFixed(8)),
      payCurrency: paymentIndex % 3 === 0 ? 'USDT' : paymentIndex % 3 === 1 ? 'BTC' : 'ETH',
      network: paymentIndex % 3 === 0 ? 'TRON' : paymentIndex % 3 === 1 ? 'BITCOIN' : 'ETHEREUM',
      orderDescription:
        paymentType === PaymentType.MARATHON_JOIN
          ? 'Mock payment for marathon entry fee'
          : 'Mock wallet balance top-up',
      invoiceUrl: `https://nowpayments.io/invoice/mock-${userIndex}-${paymentIndex}`,
      ipnCallbackUrl: 'https://localhost/mock/ipn',
      expiresAt: status === PaymentStatus.PENDING ? this.generateExpiresAt(createdAt) : null,
      webhookData: this.buildWebhookData(status, amount),
      isTest: true,
      marathonId: paymentType === PaymentType.MARATHON_JOIN ? marathonId : null,
      createdAt,
      updatedAt: createdAt,
    };

    if (paymentType !== PaymentType.MARATHON_JOIN) {
      paymentData.marathonId = null;
    }

    return paymentData;
  }

  private generateCreatedAt(userIndex: number, paymentIndex: number): Date {
    const createdAt = new Date();
    const daysAgo = (userIndex * 3 + paymentIndex * 5) % 60;
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours((paymentIndex * 3) % 24, (userIndex * 7) % 60, 0, 0);
    return createdAt;
  }

  private generateExpiresAt(createdAt: Date): Date {
    const expiresAt = new Date(createdAt);
    expiresAt.setHours(expiresAt.getHours() + 48);
    return expiresAt;
  }

  private buildWebhookData(status: PaymentStatus, amount: number): Record<string, unknown> {
    return {
      status,
      amount,
      receivedAt: new Date().toISOString(),
      confirmations: status === PaymentStatus.COMPLETED ? 3 : 0,
      notes: status === PaymentStatus.FAILED ? 'Mock failure - insufficient funds' : 'Mock data',
    };
  }
}

