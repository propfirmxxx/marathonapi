import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MetaTraderAccount } from '../metatrader-accounts/entities/meta-trader-account.entity';
import { MetaTraderAccountModule } from '../metatrader-accounts/metatrader-account.module';
import { PaymentModule } from '../payment/payment.module';
import { TokyoModule } from '../tokyo/tokyo.module';
import { TokyoDataModule } from '../tokyo-data/tokyo-data.module';
import { UsersModule } from '../users/users.module';
import { VirtualWalletModule } from '../virtual-wallet/virtual-wallet.module';
import { MarathonParticipant } from './entities/marathon-participant.entity';
import { Marathon } from './entities/marathon.entity';
import { LiveAccountDataService } from './live-account-data.service';
import { MarathonController } from './marathon.controller';
import { MarathonService } from './marathon.service';
import { MarathonLeaderboardService } from './marathon-leaderboard.service';
import { MarathonLiveDataGateway } from './marathon-live-data.gateway';
import { TokyoPerformance } from '../tokyo-data/entities/tokyo-performance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Marathon, MarathonParticipant, MetaTraderAccount, TokyoPerformance]),
    UsersModule,
    PaymentModule,
    AuthModule,
    MetaTraderAccountModule,
    TokyoModule,
    forwardRef(() => TokyoDataModule),
    VirtualWalletModule,
  ],
  controllers: [MarathonController],
  providers: [
    MarathonService,
    LiveAccountDataService,
    MarathonLeaderboardService,
    MarathonLiveDataGateway,
  ],
  exports: [MarathonService, LiveAccountDataService, MarathonLeaderboardService],
})
export class MarathonModule {} 