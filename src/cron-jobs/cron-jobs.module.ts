import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronJobsController } from './cron-jobs.controller';
import { CronJobsService } from './cron-jobs.service';
import { CronMonitoringService } from './cron-monitoring.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [CronJobsController],
  providers: [CronMonitoringService, CronJobsService],
  exports: [CronMonitoringService],
})
export class CronJobsModule {}

