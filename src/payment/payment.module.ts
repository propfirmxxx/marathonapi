import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment } from './entities/payment.entity';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';
import { Marathon } from '../marathon/entities/marathon.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Payment, MarathonParticipant, Marathon]),
    UsersModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {} 