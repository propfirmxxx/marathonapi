import { Injectable, BadRequestException, ConflictException, Logger, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';
import { Marathon } from '../marathon/entities/marathon.entity';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentType } from './enums/payment-type.enum';
import { IPaymentProvider } from './interfaces/payment-provider.interface';
import { CreateWalletChargeDto } from './dto/create-wallet-charge.dto';
import { CreateMarathonPaymentDto } from './dto/create-marathon-payment.dto';
import { ProfileService } from '../profile/profile.service';
import { MetaTraderAccountService } from '../metatrader-accounts/metatrader-account.service';
import {
  PaymentNotFoundException,
  InvalidPaymentStatusException,
  WebhookVerificationException,
  PaymentExpiredException,
  DuplicatePaymentException,
  InsufficientMarathonCapacityException,
  AlreadyMarathonMemberException,
} from './exceptions/payment.exceptions';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(MarathonParticipant)
    private readonly participantRepository: Repository<MarathonParticipant>,
    @InjectRepository(Marathon)
    private readonly marathonRepository: Repository<Marathon>,
    @Inject('PAYMENT_PROVIDER')
    private readonly paymentProvider: IPaymentProvider,
    private readonly profileService: ProfileService,
    private readonly metaTraderAccountService: MetaTraderAccountService,
    private readonly dataSource: DataSource,
  ) {}

  async createWalletChargePayment(userId: string, createWalletChargeDto: CreateWalletChargeDto) {
    const { amount, currency = 'usdttrc20' } = createWalletChargeDto;

    // Check for existing pending payments
    const existingPayment = await this.paymentRepository.findOne({
      where: {
        userId,
        status: PaymentStatus.PENDING,
        paymentType: PaymentType.WALLET_CHARGE,
      },
      order: { createdAt: 'DESC' },
    });

    if (existingPayment) {
      // Check if payment is expired
      if (existingPayment.expiresAt && existingPayment.expiresAt < new Date()) {
        this.logger.log(`Expiring old payment ${existingPayment.id}`);
        existingPayment.status = PaymentStatus.CANCELLED;
        await this.paymentRepository.save(existingPayment);
      } else {
        // Return existing payment instead of throwing error
        this.logger.log(`Returning existing pending payment ${existingPayment.id}`);
        return {
          paymentId: existingPayment.id,
          paymentUrl: existingPayment.invoiceUrl,
          payAddress: existingPayment.payAddress,
          payAmount: existingPayment.payAmount,
          payCurrency: existingPayment.payCurrency,
          network: existingPayment.network,
          expiresAt: existingPayment.expiresAt,
        };
      }
    }

    const orderId = `wallet-${userId}-${Date.now()}`;
    const orderDescription = `Wallet charge for ${amount} USD`;

    // Create invoice
    const invoice = await this.paymentProvider.createInvoice({
      priceAmount: amount,
      priceCurrency: 'usd',
      payCurrency: currency,
      orderId,
      orderDescription,
      ipnCallbackUrl: this.configService.get<string>('PAYMENT_WEBHOOK_URL'),
    });

    this.logger.log(`Invoice created: ${invoice.payment_id} for order: ${orderId}`);

    // Calculate expiration time (30 minutes from now)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Check if using mock payment service
    const isTestMode = this.configService.get<string>('NODE_ENV') === 'development' && 
                       this.configService.get<string>('USE_MOCK_PAYMENT') === 'true';

    // Create payment record
    const payment = this.paymentRepository.create({
      userId,
      amount,
      status: PaymentStatus.PENDING,
      paymentType: PaymentType.WALLET_CHARGE,
      nowpaymentsId: invoice.payment_id,
      payAddress: invoice.pay_address,
      payAmount: invoice.pay_amount,
      payCurrency: invoice.pay_currency || currency,
      network: invoice.network,
      orderDescription,
      invoiceUrl: invoice.invoice_id,
      ipnCallbackUrl: this.configService.get<string>('PAYMENT_WEBHOOK_URL'),
      expiresAt,
      isTest: isTestMode,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    this.logger.log(`Payment created: ${savedPayment.id} for user: ${userId}`);

    return {
      paymentId: savedPayment.id,
      paymentUrl: invoice.invoice_id || invoice.invoice_url || savedPayment.invoiceUrl,
      payAddress: invoice.pay_address,
      payAmount: invoice.pay_amount,
      payCurrency: invoice.pay_currency,
      network: invoice.network,
      expiresAt,
    };
  }

  async createMarathonPayment(userId: string, marathonId: string) {
    // Find marathon
    const marathon = await this.marathonRepository.findOne({
      where: { id: marathonId },
    });

    if (!marathon) {
      throw new NotFoundException(`Marathon with ID ${marathonId} not found`);
    }

    // Check if marathon is active
    if (!marathon.isActive) {
      throw new BadRequestException('Marathon is not active');
    }

    // Check capacity
    if (marathon.currentPlayers >= marathon.maxPlayers) {
      throw new InsufficientMarathonCapacityException();
    }

    // Check if user is already a participant
    const existingParticipant = await this.participantRepository.findOne({
      where: {
        user: { id: userId },
        marathon: { id: marathonId },
      },
    });

    if (existingParticipant) {
      throw new AlreadyMarathonMemberException();
    }

    // Check for existing pending marathon payment
    const existingPayment = await this.paymentRepository.findOne({
      where: {
        userId,
        marathonId,
        status: PaymentStatus.PENDING,
        paymentType: PaymentType.MARATHON_JOIN,
      },
      order: { createdAt: 'DESC' },
    });

    if (existingPayment) {
      // Check if payment is expired
      if (existingPayment.expiresAt && existingPayment.expiresAt < new Date()) {
        this.logger.log(`Expiring old payment ${existingPayment.id}`);
        existingPayment.status = PaymentStatus.CANCELLED;
        await this.paymentRepository.save(existingPayment);
      } else {
        // Return existing payment instead of throwing error
        this.logger.log(`Returning existing pending payment ${existingPayment.id} for marathon ${marathonId}`);
        return {
          paymentId: existingPayment.id,
          paymentUrl: existingPayment.invoiceUrl,
          payAddress: existingPayment.payAddress,
          payAmount: existingPayment.payAmount,
          payCurrency: existingPayment.payCurrency,
          network: existingPayment.network,
          expiresAt: existingPayment.expiresAt,
        };
      }
    }

    const orderId = `marathon-${marathonId}-${userId}-${Date.now()}`;
    const orderDescription = `Join marathon: ${marathon.name}`;

    // Create invoice
    const invoice = await this.paymentProvider.createInvoice({
      priceAmount: Number(marathon.entryFee),
      priceCurrency: 'usd',
      payCurrency: 'usdttrc20',
      orderId,
      orderDescription,
      ipnCallbackUrl: this.configService.get<string>('PAYMENT_WEBHOOK_URL'),
    });

    this.logger.log(`Invoice created: ${invoice.payment_id} for order: ${orderId}`);

    // Calculate expiration time (30 minutes from now)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Check if using mock payment service
    const isTestMode = this.configService.get<string>('NODE_ENV') === 'development' && 
                       this.configService.get<string>('USE_MOCK_PAYMENT') === 'true';

    // Create payment record
    const payment = this.paymentRepository.create({
      userId,
      marathonId,
      amount: Number(marathon.entryFee),
      status: PaymentStatus.PENDING,
      paymentType: PaymentType.MARATHON_JOIN,
      nowpaymentsId: invoice.payment_id,
      payAddress: invoice.pay_address,
      payAmount: invoice.pay_amount,
      payCurrency: invoice.pay_currency || 'usdttrc20',
      network: invoice.network,
      orderDescription,
      invoiceUrl: invoice.invoice_id,
      ipnCallbackUrl: this.configService.get<string>('PAYMENT_WEBHOOK_URL'),
      expiresAt,
      isTest: isTestMode,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    this.logger.log(`Payment created: ${savedPayment.id} for user: ${userId}, marathon: ${marathonId}`);

    return {
      paymentId: savedPayment.id,
      paymentUrl: invoice.invoice_id || invoice.invoice_url || savedPayment.invoiceUrl,
      payAddress: invoice.pay_address,
      payAmount: invoice.pay_amount,
      payCurrency: invoice.pay_currency,
      network: invoice.network,
      expiresAt,
    };
  }

  async handleWebhook(webhookData: any, signature: string): Promise<void> {
    this.logger.log(`Received webhook: ${JSON.stringify(webhookData)}`);

    // Verify IPN signature
    const isValid = this.paymentProvider.verifyIpnSignature(webhookData, signature);
    if (!isValid) {
      this.logger.error('Webhook signature verification failed');
      throw new WebhookVerificationException();
    }

    const { payment_id, payment_status, order_id } = webhookData;

    // Find payment by nowpaymentsId
    const payment = await this.paymentRepository.findOne({
      where: { nowpaymentsId: payment_id },
    });

    if (!payment) {
      this.logger.error(`Payment not found for NowPayments ID: ${payment_id}`);
      throw new PaymentNotFoundException();
    }

    // Check if payment has already been processed (idempotency check)
    if (payment.status === PaymentStatus.COMPLETED) {
      this.logger.warn(`Payment ${payment.id} has already been processed`);
      return;
    }

    // Check if payment is cancelled or failed
    if (payment.status === PaymentStatus.CANCELLED || payment.status === PaymentStatus.FAILED) {
      this.logger.warn(`Payment ${payment.id} is in ${payment.status} status and cannot be processed`);
      return;
    }

    // Update webhook data
    payment.webhookData = webhookData;

    // Map payment status to our status
    const mappedStatus = this.paymentProvider.mapNowPaymentStatus(payment_status);
    payment.status = mappedStatus as PaymentStatus;

    await this.paymentRepository.save(payment);

    // Process payment if status is COMPLETED
    if (payment.status === PaymentStatus.COMPLETED) {
      this.logger.log(`Processing completed payment: ${payment.id}`);

      try {
        if (payment.paymentType === PaymentType.WALLET_CHARGE) {
          await this.processWalletCharge(payment);
        } else if (payment.paymentType === PaymentType.MARATHON_JOIN) {
          await this.processMarathonJoin(payment);
        }
      } catch (error) {
        this.logger.error(`Error processing payment ${payment.id}:`, error);
        // Update payment to failed status
        payment.status = PaymentStatus.FAILED;
        await this.paymentRepository.save(payment);
        throw error;
      }
    }

    this.logger.log(`Webhook processed successfully for payment: ${payment.id}`);
  }

  private async processWalletCharge(payment: Payment): Promise<void> {
    this.logger.log(`Processing wallet charge for payment: ${payment.id}`);

    // Add balance to user's profile
    await this.profileService.addBalance(payment.userId, payment.amount);

    this.logger.log(`Wallet charged successfully: ${payment.amount} USD for user: ${payment.userId}`);
  }

  private async processMarathonJoin(payment: Payment): Promise<void> {
    this.logger.log(`Processing marathon join for payment: ${payment.id}`);

    // Use transaction to ensure data consistency
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check marathon capacity again
      const marathon = await queryRunner.manager.findOne(Marathon, {
        where: { id: payment.marathonId },
      });

      if (!marathon) {
        throw new NotFoundException(`Marathon with ID ${payment.marathonId} not found`);
      }

      if (marathon.currentPlayers >= marathon.maxPlayers) {
        throw new InsufficientMarathonCapacityException();
      }

      // Check if user is already a participant
      const existingParticipant = await queryRunner.manager.findOne(MarathonParticipant, {
        where: {
          user: { id: payment.userId },
          marathon: { id: payment.marathonId },
        },
      });

      if (existingParticipant) {
        throw new AlreadyMarathonMemberException();
      }

      // Create participant
      const participant = queryRunner.manager.create(MarathonParticipant, {
        user: { id: payment.userId },
        marathon: { id: payment.marathonId },
        isActive: true,
      });

      await queryRunner.manager.save(MarathonParticipant, participant);

      // Update marathon current players count
      marathon.currentPlayers += 1;
      await queryRunner.manager.save(Marathon, marathon);

      await queryRunner.commitTransaction();
      this.logger.log(`Marathon join processed successfully: user ${payment.userId} joined marathon ${payment.marathonId}`);

      // Try to automatically assign a MetaTrader account to the participant
      // This is done outside the transaction to avoid blocking payment processing
      // If no account is available, the payment is still successful
      try {
        const availableAccounts = await this.metaTraderAccountService.findAvailable();
        
        if (availableAccounts.length > 0) {
          // Assign the first available account
          const accountToAssign = availableAccounts[0];
          await this.metaTraderAccountService.assignToParticipant(accountToAssign.id, {
            marathonParticipantId: participant.id,
          });
          this.logger.log(`MetaTrader account ${accountToAssign.id} automatically assigned to participant ${participant.id}`);
        } else {
          this.logger.warn(`No available MetaTrader accounts found for participant ${participant.id}. Payment was successful but account assignment is pending.`);
        }
      } catch (error) {
        // Log error but don't fail the payment - account can be assigned manually later
        this.logger.error(`Failed to automatically assign MetaTrader account to participant ${participant.id}:`, error);
        this.logger.warn(`Payment was successful but MetaTrader account assignment failed. Participant ID: ${participant.id}`);
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error processing marathon join:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getPaymentById(paymentId: string, userId?: string): Promise<Payment> {
    const where: any = { id: paymentId };
    if (userId) {
      where.userId = userId;
    }

    const payment = await this.paymentRepository.findOne({
      where,
      relations: ['user', 'marathon'],
    });

    if (!payment) {
      throw new PaymentNotFoundException(paymentId);
    }

    return payment;
  }

  async getUserPayments(userId: string, page: number = 1, limit: number = 10, filters?: any): Promise<{ payments: Payment[]; total: number }> {
    const where: any = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.paymentType) {
      where.paymentType = filters.paymentType;
    }

    const [payments, total] = await this.paymentRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
      relations: ['marathon'],
    });

    return { payments, total };
  }

  // Legacy method for backward compatibility (can be removed if not needed)
  async createPayment(userId: string, amount: number): Promise<Payment> {
    const existingPayment = await this.paymentRepository.findOne({
      where: {
        userId,
        status: PaymentStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (existingPayment) {
      throw new ConflictException('User already has a pending payment');
    }

    const payment = this.paymentRepository.create({
      userId,
      amount,
      status: PaymentStatus.PENDING,
      paymentType: PaymentType.WALLET_CHARGE,
    });

    return await this.paymentRepository.save(payment);
  }
}