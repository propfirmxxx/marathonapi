import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaApiService } from './metaapi.service';
import { MetaApiController } from './metaapi.controller';
import { MetaApiGateway } from './metaapi.gateway';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { MetaTraderAccount } from './entities/meta-trader-account.entity';
import { TokyoService } from '@/tokyo/tokyo.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    UsersModule,
    HttpModule,
    TypeOrmModule.forFeature([MetaTraderAccount]),
  ],
  controllers: [MetaApiController],
  providers: [MetaApiService, TokyoService, MetaApiGateway],
  exports: [MetaApiService, TokyoService],
})
export class MetaApiModule {} 