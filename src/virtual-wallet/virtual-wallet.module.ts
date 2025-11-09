import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VirtualWallet } from '../users/entities/virtual-wallet.entity';
import { VirtualWalletTransaction } from '../users/entities/virtual-wallet-transaction.entity';
import { VirtualWalletService } from './virtual-wallet.service';

@Module({
  imports: [TypeOrmModule.forFeature([VirtualWallet, VirtualWalletTransaction])],
  providers: [VirtualWalletService],
  exports: [VirtualWalletService],
})
export class VirtualWalletModule {}

