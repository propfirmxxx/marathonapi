import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TokyoService } from './tokyo.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
  ],
  providers: [TokyoService],
  exports: [TokyoService],
})
export class TokyoModule {} 