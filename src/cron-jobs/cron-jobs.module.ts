import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';
import { Marathon } from '../marathon/entities/marathon.entity';
import { MetaTraderAccount } from '../metatrader-accounts/entities/meta-trader-account.entity';
import { TokyoModule } from '../tokyo/tokyo.module';
import { TokyoDataModule } from '../tokyo-data/tokyo-data.module';
import { CronJobsController } from './cron-jobs.controller';
import { CronJobsService } from './cron-jobs.service';
import { CronMonitoringService } from './cron-monitoring.service';
import { MarathonProvisioningService } from './marathon-provisioning.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Marathon, MarathonParticipant, MetaTraderAccount]),
    TokyoModule,
    TokyoDataModule,
  ],
  controllers: [CronJobsController],
  providers: [CronMonitoringService, CronJobsService, MarathonProvisioningService],
  exports: [CronMonitoringService],
})
export class CronJobsModule {}

