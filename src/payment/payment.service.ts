import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';
import { Marathon } from '../marathon/entities/marathon.entity';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './enums/payment-status.enum';

@Injectable()
export class PaymentService {
  private readonly nowPaymentsApiKey: string;
  private readonly nowPaymentsApiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(MarathonParticipant)
    private readonly participantRepository: Repository<MarathonParticipant>,
    @InjectRepository(Marathon)
    private readonly marathonRepository: Repository<Marathon>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {
    this.nowPaymentsApiKey = this.configService.get<string>('NOWPAYMENTS_API_KEY');
    this.nowPaymentsApiUrl = this.configService.get<string>('NOWPAYMENTS_API_URL', 'https://api.nowpayments.io/v1');
  }

  async createPayment(userId: string, amount: number): Promise<Payment> {
    const existingPayment = await this.paymentRepository.findOne({
      where: {
        user: { id: userId },
        status: PaymentStatus.PENDING,
      },
    });

    if (existingPayment) {
      throw new ConflictException('User already has a pending payment');
    }

    const payment = this.paymentRepository.create({
      user: { id: userId },
      amount,
      status: PaymentStatus.PENDING,
    });

    return await this.paymentRepository.save(payment);
  }

  async handleWebhook(paymentData: any): Promise<void> {
    const { order_id, payment_status } = paymentData;
    
    if (payment_status !== 'finished') {
      return;
    }

    const [_, marathonId, __, userId] = order_id.split('-');
    
    const participant = this.participantRepository.create({
      marathon: { id: marathonId },
      user: { id: userId },
      isActive: true,
    });

    await this.participantRepository.save(participant);

    // Update marathon current players count
    await this.marathonRepository
      .createQueryBuilder()
      .update(Marathon)
      .set({ currentPlayers: () => 'currentPlayers + 1' })
      .where('id = :id', { id: marathonId })
      .execute();
  }
} 