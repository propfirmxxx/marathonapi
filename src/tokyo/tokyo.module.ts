import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokyoService } from './tokyo.service';
import { TokyoController } from './tokyo.controller';
import { AccountOwnershipGuard } from './guards/account-ownership.guard';
import { MetaTraderAccount } from '../metatrader-accounts/entities/meta-trader-account.entity';
import { TokyoDataModule } from '../tokyo-data/tokyo-data.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([MetaTraderAccount]),
    forwardRef(() => TokyoDataModule),
  ],
  controllers: [TokyoController],
  providers: [TokyoService, AccountOwnershipGuard],
  exports: [TokyoService],
})
export class TokyoModule {} 