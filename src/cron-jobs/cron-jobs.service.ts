import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CronMonitoringService } from './cron-monitoring.service';

@Injectable()
export class CronJobsService {
  private readonly logger = new Logger(CronJobsService.name);

  constructor(private readonly monitoring: CronMonitoringService) {}

  @Cron(CronExpression.EVERY_10_MINUTES, {
    name: 'system.maintenance.heartbeat',
  })
  async runSystemHeartbeat(): Promise<void> {
    await this.monitoring.track(
      'system.maintenance.heartbeat',
      CronExpression.EVERY_10_MINUTES,
      async () => {
        this.logger.debug('Heartbeat cron job executed');
      },
    );
  }
}

