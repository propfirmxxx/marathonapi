import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { Profile } from './entities/profile.entity';
import { CloudStorageService } from '../services/cloud-storage.service';
import { User } from '../users/entities/user.entity';
import { NotificationModule } from '../notifications/notification.module';
import { VirtualWalletModule } from '../virtual-wallet/virtual-wallet.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Profile, User]),
    NotificationModule,
    VirtualWalletModule,
    StorageModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService, CloudStorageService],
  exports: [ProfileService],
})
export class ProfileModule {} 