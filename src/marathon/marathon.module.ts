import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MetaTraderAccount } from '../metatrader-accounts/entities/meta-trader-account.entity';
import { MetaTraderAccountModule } from '../metatrader-accounts/metatrader-account.module';
import { PaymentModule } from '../payment/payment.module';
import { TokyoModule } from '../tokyo/tokyo.module';
import { UsersModule } from '../users/users.module';
import { VirtualWalletModule } from '../virtual-wallet/virtual-wallet.module';
import { MarathonParticipant } from './entities/marathon-participant.entity';
import { Marathon } from './entities/marathon.entity';
import { LiveAccountDataService } from './live-account-data.service';
import { MarathonController } from './marathon.controller';
import { MarathonService } from './marathon.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Marathon, MarathonParticipant, MetaTraderAccount]),
    UsersModule,
    PaymentModule,
    AuthModule,
    MetaTraderAccountModule,
    TokyoModule,
    VirtualWalletModule,
  ],
  controllers: [MarathonController],
  providers: [MarathonService, LiveAccountDataService],
  exports: [MarathonService, LiveAccountDataService],
})
export class MarathonModule {} 