import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { CronMonitoringService } from './cron-monitoring.service';

describe('CronMonitoringService', () => {
  let registry: SchedulerRegistry;
  let service: CronMonitoringService;

  beforeEach(() => {
    registry = new SchedulerRegistry();
    service = new CronMonitoringService(registry);
  });

  it('tracks successful job execution', async () => {
    const expression = '* * * * *';
    registry.addCronJob('test-job', new CronJob(expression, () => undefined));

    await service.track('test-job', expression, async () => undefined);

    const metrics = service.getMetrics('test-job');
    expect(metrics.runs).toBe(1);
    expect(metrics.failures).toBe(0);
    expect(metrics.lastStatus).toBe('success');
    expect(metrics.isRunning).toBe(false);
  });

  it('tracks failed job execution', async () => {
    const expression = '* * * * *';
    registry.addCronJob(
      'failing-job',
      new CronJob(expression, () => undefined),
    );

    await expect(
      service.track('failing-job', expression, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    const metrics = service.getMetrics('failing-job');
    expect(metrics.runs).toBe(1);
    expect(metrics.failures).toBe(1);
    expect(metrics.lastStatus).toBe('failure');
    expect(metrics.lastError).toBe('boom');
  });
});

