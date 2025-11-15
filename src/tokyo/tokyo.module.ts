import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TokyoService } from './tokyo.service';
import { TokyoController } from './tokyo.controller';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
  ],
  controllers: [TokyoController],
  providers: [TokyoService],
  exports: [TokyoService],
})
export class TokyoModule {} 