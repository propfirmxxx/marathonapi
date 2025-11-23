import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CronMonitoringService } from './cron-monitoring.service';
import { MarathonProvisioningService } from './marathon-provisioning.service';
import { TokyoDataCronService } from '../tokyo-data/tokyo-data-cron.service';
import { SessionService } from '../settings/session.service';
import { LocationService } from '../settings/location.service';
import { MarathonRulesService } from '../marathon/marathon-rules.service';

@Injectable()
export class CronJobsService {
  private readonly logger = new Logger(CronJobsService.name);

  constructor(
    private readonly monitoring: CronMonitoringService,
    private readonly marathonProvisioning: MarathonProvisioningService,
    private readonly tokyoDataCron: TokyoDataCronService,
    private readonly sessionService: SessionService,
    private readonly locationService: LocationService,
    @Inject(forwardRef(() => MarathonRulesService))
    private readonly marathonRulesService: MarathonRulesService,
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

  @Cron(CronExpression.EVERY_30_MINUTES, {
    name: 'session.cleanup.expired',
  })
  async cleanupExpiredSessions(): Promise<void> {
    await this.monitoring.track(
      'session.cleanup.expired',
      CronExpression.EVERY_30_MINUTES,
      async () => {
        await this.sessionService.cleanupExpiredSessions();
        this.logger.debug('Expired sessions cleanup completed');
      },
    );
  }

  @Cron(CronExpression.EVERY_HOUR, {
    name: 'location.cache.cleanup',
  })
  async cleanupLocationCache(): Promise<void> {
    await this.monitoring.track(
      'location.cache.cleanup',
      CronExpression.EVERY_HOUR,
      async () => {
        (this.locationService as any).clearExpiredCache();
        this.logger.debug('Expired location cache cleanup completed');
      },
    );
  }

  @Cron('*/5 * * * *', {
    name: 'marathon.rules.check',
  })
  async checkMarathonRules(): Promise<void> {
    await this.monitoring.track(
      'marathon.rules.check',
      '*/5 * * * *',
      async () => {
        await this.marathonRulesService.checkAllParticipantsRules();
        this.logger.debug('Marathon rules check completed');
      },
    );
  }
}

