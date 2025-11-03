import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([Payment, MarathonParticipant, Marathon]),
    UsersModule,
    ProfileModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, NowPaymentsService],
  exports: [PaymentService],
})
export class PaymentModule {} 