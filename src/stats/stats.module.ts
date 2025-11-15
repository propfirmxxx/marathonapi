import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { AuthModule } from '../auth/auth.module';
import { Withdrawal } from '../withdrawals/entities/withdrawal.entity';
import { Marathon } from '../marathon/entities/marathon.entity';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';
import { MarathonModule } from '../marathon/marathon.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Withdrawal, Marathon, MarathonParticipant]),
    AuthModule,
    MarathonModule,
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}

