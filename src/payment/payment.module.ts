import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment } from './entities/payment.entity';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';
import { Marathon } from '../marathon/entities/marathon.entity';
import { UsersModule } from '../users/users.module';
import { ProfileModule } from '../profile/profile.module';
import { NowPaymentsService } from './nowpayments.service';
import { MockPaymentService } from './mock-payment.service';
import { MetaTraderAccountModule } from '../metatrader-accounts/metatrader-account.module';
import { IPaymentProvider } from './interfaces/payment-provider.interface';

// Factory function to provide the correct payment service based on environment
const paymentProviderFactory = (
  configService: ConfigService,
  nowPaymentsService: NowPaymentsService,
  mockPaymentService: MockPaymentService,
): IPaymentProvider => {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const useMock = configService.get<string>('USE_MOCK_PAYMENT', 'false') === 'true';
  
  if (nodeEnv === 'development' && useMock) {
    console.log('⚠️  Using Mock Payment Service for development');
    return mockPaymentService;
  }
  
  return nowPaymentsService;
};

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([Payment, MarathonParticipant, Marathon]),
    UsersModule,
    ProfileModule,
    MetaTraderAccountModule,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    NowPaymentsService,
    MockPaymentService,
    {
      provide: 'PAYMENT_PROVIDER',
      useFactory: paymentProviderFactory,
      inject: [ConfigService, NowPaymentsService, MockPaymentService],
    },
  ],
  exports: [PaymentService],
})
export class PaymentModule {} 