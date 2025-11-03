import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaTraderAccount } from './entities/meta-trader-account.entity';
import { MetaTraderAccountService } from './metatrader-account.service';
import { MetaTraderAccountController } from './metatrader-account.controller';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MetaTraderAccount, MarathonParticipant]),
    AuthModule,
  ],
  controllers: [MetaTraderAccountController],
  providers: [MetaTraderAccountService],
  exports: [MetaTraderAccountService],
})
export class MetaTraderAccountModule {}

