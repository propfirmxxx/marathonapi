import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokyoAccountData } from './entities/tokyo-account-data.entity';
import { TokyoTransactionHistory } from './entities/tokyo-transaction-history.entity';
import { TokyoPerformance } from './entities/tokyo-performance.entity';
import { TokyoBalanceHistory } from './entities/tokyo-balance-history.entity';
import { TokyoEquityHistory } from './entities/tokyo-equity-history.entity';
import { MetaTraderAccount } from '../metatrader-accounts/entities/meta-trader-account.entity';
import { TokyoDataService } from './tokyo-data.service';
import { TokyoDataCronService } from './tokyo-data-cron.service';
import { TokyoModule } from '../tokyo/tokyo.module';
import { MarathonModule } from '../marathon/marathon.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TokyoAccountData,
      TokyoTransactionHistory,
      TokyoPerformance,
      TokyoBalanceHistory,
      TokyoEquityHistory,
      MetaTraderAccount,
    ]),
    forwardRef(() => TokyoModule),
    MarathonModule,
  ],
  providers: [TokyoDataService, TokyoDataCronService],
  exports: [TokyoDataService, TokyoDataCronService],
})
export class TokyoDataModule {}

