import cron from 'node-cron';
import { createLogger } from '../config/logger.js';

const log = createLogger('scheduler');

interface ScheduledJob {
  name: string;
  schedule: string;
  task: () => Promise<void>;
  running: boolean;
  cronTask: cron.ScheduledTask | null;
}

const jobs: ScheduledJob[] = [];
let started = false;

/** Register a job (does not start it) */
export function registerJob(
  name: string,
  schedule: string,
  task: () => Promise<void>,
): void {
  jobs.push({ name, schedule, task, running: false, cronTask: null });
}

/** Start all registered cron jobs */
export function startScheduler(): void {
  if (started) return;
  started = true;

  for (const job of jobs) {
    job.cronTask = cron.schedule(job.schedule, async () => {
      if (job.running) {
        log.warn({ job: job.name }, 'Skipping — still running');
        return;
      }
      job.running = true;
      const start = Date.now();
      try {
        await job.task();
        log.info({ job: job.name, durationMs: Date.now() - start }, 'Job completed');
      } catch (err) {
        log.error({ job: job.name, err }, 'Job failed');
      } finally {
        job.running = false;
      }
    });
    log.info({ job: job.name, schedule: job.schedule }, 'Registered job');
  }
}

/** Stop all scheduled cron jobs */
export function stopScheduler(): void {
  if (!started) return;
  for (const job of jobs) {
    job.cronTask?.stop();
  }
  started = false;
  log.info('Scheduler stopped');
}

/** Get status snapshot of all registered jobs */
export function getSchedulerStatus(): {
  state: 'running' | 'stopped';
  jobs: { name: string; schedule: string; running: boolean }[];
} {
  return {
    state: started ? 'running' : 'stopped',
    jobs: jobs.map(({ name, schedule, running }) => ({ name, schedule, running })),
  };
}
