import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarathonService } from './marathon.service';
import { MarathonController } from './marathon.controller';
import { Marathon } from './entities/marathon.entity';
import { MarathonParticipant } from './entities/marathon-participant.entity';
import { UsersModule } from '../users/users.module';
import { PaymentModule } from '../payment/payment.module';
import { AuthModule } from '../auth/auth.module';
import { MetaTraderAccountModule } from '../metatrader-accounts/metatrader-account.module';
import { PrizeDistributionService } from './prize-distribution.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Marathon, MarathonParticipant]),
    UsersModule,
    PaymentModule,
    AuthModule,
    MetaTraderAccountModule,
  ],
  controllers: [MarathonController],
  providers: [MarathonService, PrizeDistributionService],
  exports: [MarathonService, PrizeDistributionService],
})
export class MarathonModule {} 