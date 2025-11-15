import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { AuthModule } from '../auth/auth.module';
import { Withdrawal } from '../withdrawals/entities/withdrawal.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Withdrawal]),
    AuthModule,
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}

