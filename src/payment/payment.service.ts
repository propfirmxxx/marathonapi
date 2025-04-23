import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';
import { Marathon } from '../marathon/entities/marathon.entity';

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
  ) {
    this.nowPaymentsApiKey = this.configService.get<string>('NOWPAYMENTS_API_KEY');
    this.nowPaymentsApiUrl = this.configService.get<string>('NOWPAYMENTS_API_URL', 'https://api.nowpayments.io/v1');
  }

  async createPayment(marathonId: string, userId: string): Promise<{ paymentUrl: string }> {
    const marathon = await this.marathonRepository.findOne({ where: { id: marathonId } });
    if (!marathon) {
      throw new BadRequestException('Marathon not found');
    }

    const existingParticipant = await this.participantRepository.findOne({
      where: {
        marathon: { id: marathonId },
        user: { id: parseInt(userId, 10) },
      },
    });

    if (existingParticipant) {
      throw new BadRequestException('User is already participating in this marathon');
    }

    try {
      const response = await axios.post(
        `${this.nowPaymentsApiUrl}/payment`,
        {
          price_amount: marathon.entryFee,
          price_currency: 'usd',
          pay_currency: 'btc', // You can make this configurable
          order_id: `marathon-${marathonId}-user-${userId}`,
          order_description: `Entry fee for marathon: ${marathon.name}`,
          ipn_callback_url: `${this.configService.get('API_URL')}/payment/webhook`,
          success_url: `${this.configService.get('FRONTEND_URL')}/marathon/${marathonId}/success`,
          cancel_url: `${this.configService.get('FRONTEND_URL')}/marathon/${marathonId}/cancel`,
        },
        {
          headers: {
            'x-api-key': this.nowPaymentsApiKey,
          },
        },
      );

      return {
        paymentUrl: response.data.invoice_url,
      };
    } catch (error) {
      console.error('Error creating payment:', error.response?.data || error.message);
      throw new BadRequestException('Failed to create payment');
    }
  }

  async handleWebhook(paymentData: any): Promise<void> {
    const { order_id, payment_status } = paymentData;
    
    if (payment_status !== 'finished') {
      return;
    }

    const [_, marathonId, __, userId] = order_id.split('-');
    
    const participant = this.participantRepository.create({
      marathon: { id: marathonId },
      user: { id: parseInt(userId, 10) },
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