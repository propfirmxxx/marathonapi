import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MetaTraderAccount } from '../metatrader-accounts/entities/meta-trader-account.entity';
import { MetaTraderAccountModule } from '../metatrader-accounts/metatrader-account.module';
import { PaymentModule } from '../payment/payment.module';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';
import { TokyoModule } from '../tokyo/tokyo.module';
import { TokyoDataModule } from '../tokyo-data/tokyo-data.module';
import { UsersModule } from '../users/users.module';
import { VirtualWalletModule } from '../virtual-wallet/virtual-wallet.module';
import { SettingsModule } from '../settings/settings.module';
import { MarathonParticipant } from './entities/marathon-participant.entity';
import { Marathon } from './entities/marathon.entity';
import { PasswordRequest } from './entities/password-request.entity';
import { LiveAccountDataService } from './live-account-data.service';
import { MarathonController } from './marathon.controller';
import { MarathonService } from './marathon.service';
import { MarathonLeaderboardService } from './marathon-leaderboard.service';
import { MarathonLiveDataGateway } from './marathon-live-data.gateway';
import { MarathonRulesService } from './marathon-rules.service';
import { TokyoPerformance } from '../tokyo-data/entities/tokyo-performance.entity';
import { TokyoTransactionHistory } from '../tokyo-data/entities/tokyo-transaction-history.entity';
import { TokyoBalanceHistory } from '../tokyo-data/entities/tokyo-balance-history.entity';
import { TokyoEquityHistory } from '../tokyo-data/entities/tokyo-equity-history.entity';
import { Withdrawal } from '../withdrawals/entities/withdrawal.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Marathon, MarathonParticipant, MetaTraderAccount, TokyoPerformance, TokyoTransactionHistory, TokyoBalanceHistory, TokyoEquityHistory, Withdrawal, PasswordRequest]),
    RabbitMQModule.forRoot(),
    UsersModule,
    PaymentModule,
    AuthModule,
    MetaTraderAccountModule,
    TokyoModule,
    forwardRef(() => TokyoDataModule),
    VirtualWalletModule,
    SettingsModule,
  ],
  controllers: [MarathonController],
  providers: [
    MarathonService,
    LiveAccountDataService,
    MarathonLeaderboardService,
    MarathonRulesService,
    MarathonLiveDataGateway,
  ],
  exports: [MarathonService, LiveAccountDataService, MarathonLeaderboardService, MarathonRulesService],
})
export class MarathonModule {} 