import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarathonService } from './marathon.service';
import { MarathonController } from './marathon.controller';
import { Marathon } from './entities/marathon.entity';
import { MarathonParticipant } from './entities/marathon-participant.entity';
import { MetaTraderAccount } from '../metatrader-accounts/entities/meta-trader-account.entity';
import { UsersModule } from '../users/users.module';
import { PaymentModule } from '../payment/payment.module';
import { AuthModule } from '../auth/auth.module';
import { MetaTraderAccountModule } from '../metatrader-accounts/metatrader-account.module';
import { PrizeDistributionService } from './prize-distribution.service';
import { TokyoModule } from '../tokyo/tokyo.module';
import { LiveAccountDataService } from './live-account-data.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Marathon, MarathonParticipant, MetaTraderAccount]),
    UsersModule,
    PaymentModule,
    AuthModule,
    MetaTraderAccountModule,
    TokyoModule,
  ],
  controllers: [MarathonController],
  providers: [MarathonService, PrizeDistributionService, LiveAccountDataService],
  exports: [MarathonService, PrizeDistributionService, LiveAccountDataService],
})
export class MarathonModule {} 