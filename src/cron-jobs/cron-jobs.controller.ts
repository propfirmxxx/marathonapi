import { Controller, Get, Param, Post } from '@nestjs/common';
import { CronMonitoringService, CronJobMetrics } from './cron-monitoring.service';

@Controller('cron-jobs')
export class CronJobsController {
  constructor(private readonly monitoring: CronMonitoringService) {}

  @Get()
  listJobs(): CronJobMetrics[] {
    return this.monitoring.getAllMetrics();
  }

  @Get(':name')
  getJob(@Param('name') name: string): CronJobMetrics {
    return this.monitoring.getMetrics(name);
  }

  @Post(':name/run')
  triggerJob(@Param('name') name: string): { message: string } {
    this.monitoring.trigger(name);
    return { message: `Cron job "${name}" triggered` };
  }
}

