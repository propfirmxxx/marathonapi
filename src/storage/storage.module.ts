import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinioService } from './minio.service';
import { StorageController } from './storage.controller';

@Module({
  imports: [ConfigModule],
  providers: [MinioService],
  exports: [MinioService],
  controllers: [StorageController],
})
export class StorageModule {}

