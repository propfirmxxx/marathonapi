import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { AuthModule } from '../auth/auth.module';
import { Withdrawal } from '../withdrawals/entities/withdrawal.entity';
import { Marathon } from '../marathon/entities/marathon.entity';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';
import { Payment } from '../payment/entities/payment.entity';
import { VirtualWallet } from '../virtual-wallet/entities/virtual-wallet.entity';
import { VirtualWalletTransaction } from '../virtual-wallet/entities/virtual-wallet-transaction.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { MetaTraderAccount } from '../metatrader-accounts/entities/meta-trader-account.entity';
import { MarathonModule } from '../marathon/marathon.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Withdrawal,
      Marathon,
      MarathonParticipant,
      Payment,
      VirtualWallet,
      VirtualWalletTransaction,
      Ticket,
      MetaTraderAccount,
    ]),
    AuthModule,
    MarathonModule,
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}

