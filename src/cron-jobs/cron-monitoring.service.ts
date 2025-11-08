import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
type SchedulerCronJob = ReturnType<SchedulerRegistry['getCronJob']>;

export type CronJobExecutionStatus = 'success' | 'failure';

export interface CronJobMetrics {
  name: string;
  schedule?: string;
  runs: number;
  failures: number;
  isRunning: boolean;
  lastStatus?: CronJobExecutionStatus;
  lastRunAt?: Date;
  lastFinishedAt?: Date;
  lastDurationMs?: number;
  lastError?: string | null;
  nextRunAt?: Date | null;
}

@Injectable()
export class CronMonitoringService {
  private readonly logger = new Logger(CronMonitoringService.name);

  private readonly metrics = new Map<string, CronJobMetrics>();

  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  async track<T>(
    name: string,
    schedule: string,
    handler: () => Promise<T> | T,
  ): Promise<T> {
    const jobRecord = this.ensureRecord(name, schedule);
    const startedAt = new Date();

    jobRecord.isRunning = true;
    jobRecord.runs += 1;
    jobRecord.lastRunAt = startedAt;
    jobRecord.lastError = null;

    try {
      const result = await handler();
      jobRecord.lastStatus = 'success';
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? 'Unknown');
      jobRecord.failures += 1;
      jobRecord.lastStatus = 'failure';
      jobRecord.lastError = message;
      this.logger.error(
        `Cron job "${name}" failed after ${Date.now() - startedAt.getTime()}ms`,
        message,
      );
      throw error;
    } finally {
      const finishedAt = new Date();
      jobRecord.isRunning = false;
      jobRecord.lastFinishedAt = finishedAt;
      jobRecord.lastDurationMs = finishedAt.getTime() - startedAt.getTime();
      jobRecord.nextRunAt = this.resolveNextRunAt(name);

      this.metrics.set(name, { ...jobRecord });

      if (jobRecord.lastStatus === 'success') {
        this.logger.debug(
          `Cron job "${name}" succeeded in ${jobRecord.lastDurationMs}ms`,
        );
      }
    }
  }

  getAllMetrics(): CronJobMetrics[] {
    this.syncWithRegistry();
    return Array.from(this.metrics.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  getMetrics(name: string): CronJobMetrics {
    this.syncWithRegistry();
    const record = this.metrics.get(name);
    if (!record) {
      throw new NotFoundException(`Cron job "${name}" not found`);
    }

    return record;
  }

  trigger(name: string): void {
    if (!this.schedulerRegistry.doesExist('cron', name)) {
      throw new NotFoundException(`Cron job "${name}" not registered`);
    }

    const cronJob = this.schedulerRegistry.getCronJob(name);
    cronJob.fireOnTick();
    this.logger.log(`Cron job "${name}" triggered manually`);
  }

  private ensureRecord(name: string, schedule?: string): CronJobMetrics {
    const existing = this.metrics.get(name);
    if (existing) {
      if (schedule && !existing.schedule) {
        existing.schedule = schedule;
      }

      return existing;
    }

    const initial: CronJobMetrics = {
      name,
      schedule,
      runs: 0,
      failures: 0,
      isRunning: false,
      lastError: null,
      nextRunAt: this.resolveNextRunAt(name),
    };

    this.metrics.set(name, initial);
    return initial;
  }

  private syncWithRegistry(): void {
    const cronJobs = this.schedulerRegistry.getCronJobs();
    if (!cronJobs) {
      return;
    }

    cronJobs.forEach((cronJob, jobName) => {
      const record = this.ensureRecord(
        jobName,
        this.extractScheduleExpression(cronJob),
      );

      record.nextRunAt = this.computeNextRun(cronJob);
      this.metrics.set(jobName, { ...record });
    });
  }

  private resolveNextRunAt(name: string): Date | null {
    if (!this.schedulerRegistry.doesExist('cron', name)) {
      return null;
    }

    const cronJob = this.schedulerRegistry.getCronJob(name);
    return this.computeNextRun(cronJob);
  }

  private computeNextRun(cronJob: SchedulerCronJob): Date | null {
    try {
      if (typeof cronJob.nextDates !== 'function') {
        return null;
      }

      const rawNext = cronJob.nextDates();
      return this.normalizeNextDate(rawNext);
    } catch (error) {
      this.logger.warn(`Failed to compute next run: ${error}`);
      return null;
    }
  }

  private normalizeNextDate(next: unknown): Date | null {
    const candidate = Array.isArray(next) ? next[0] : next;
    if (!candidate) {
      return null;
    }

    if (candidate instanceof Date) {
      return candidate;
    }

    if (
      typeof candidate === 'object' &&
      typeof (candidate as { toJSDate?: unknown }).toJSDate === 'function'
    ) {
      return (candidate as { toJSDate: () => Date }).toJSDate();
    }

    if (
      typeof candidate === 'object' &&
      typeof (candidate as { toDate?: unknown }).toDate === 'function'
    ) {
      return (candidate as { toDate: () => Date }).toDate();
    }

    return null;
  }

  private extractScheduleExpression(
    cronJob: SchedulerCronJob,
  ): string | undefined {
    const raw = (cronJob as unknown as { cronTime?: { source?: string } })
      ?.cronTime?.source;
    return typeof raw === 'string' ? raw : undefined;
  }
}

