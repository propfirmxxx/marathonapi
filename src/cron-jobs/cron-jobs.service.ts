import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CronMonitoringService } from './cron-monitoring.service';
import { MarathonProvisioningService } from './marathon-provisioning.service';
import { TokyoDataCronService } from '../tokyo-data/tokyo-data-cron.service';

@Injectable()
export class CronJobsService {
  private readonly logger = new Logger(CronJobsService.name);

  constructor(
    private readonly monitoring: CronMonitoringService,
    private readonly marathonProvisioning: MarathonProvisioningService,
    private readonly tokyoDataCron: TokyoDataCronService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'marathon.start.provision',
  })
  async provisionMarathonAccounts(): Promise<void> {
    await this.monitoring.track(
      'marathon.start.provision',
      CronExpression.EVERY_MINUTE,
      async () => {
        await this.marathonProvisioning.provisionStartedMarathons();
      },
    );
  }

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'marathon.status.sync',
  })
  async syncMarathonStatuses(): Promise<void> {
    await this.monitoring.track(
      'marathon.status.sync',
      CronExpression.EVERY_MINUTE,
      async () => {
        await this.marathonProvisioning.synchronizeMarathonStatuses();
      },
    );
  }

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

  @Cron(CronExpression.EVERY_HOUR, {
    name: 'tokyo.finished.marathons.update',
  })
  async updateFinishedMarathonData(): Promise<void> {
    await this.monitoring.track(
      'tokyo.finished.marathons.update',
      CronExpression.EVERY_HOUR,
      async () => {
        await this.tokyoDataCron.updateFinishedMarathonData();
      },
    );
  }
}

