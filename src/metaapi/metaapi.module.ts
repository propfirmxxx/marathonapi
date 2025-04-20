import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaApiService } from './metaapi.service';
import { MetaApiController } from './metaapi.controller';
import { MetaApiGateway } from './metaapi.gateway';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { MetaTraderAccount } from './entities/meta-trader-account.entity';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    UsersModule,
    TypeOrmModule.forFeature([MetaTraderAccount]),
  ],
  controllers: [MetaApiController],
  providers: [MetaApiService, MetaApiGateway],
  exports: [MetaApiService],
})
export class MetaApiModule {} 