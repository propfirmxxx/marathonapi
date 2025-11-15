import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VirtualWallet } from './entities/virtual-wallet.entity';
import { VirtualWalletTransaction } from './entities/virtual-wallet-transaction.entity';
import { VirtualWalletController } from './virtual-wallet.controller';
import { VirtualWalletService } from './virtual-wallet.service';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VirtualWallet, VirtualWalletTransaction, User])],
  controllers: [VirtualWalletController],
  providers: [VirtualWalletService],
  exports: [VirtualWalletService],
})
export class VirtualWalletModule {}

