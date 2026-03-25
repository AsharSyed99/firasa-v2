import { registerJob } from './scheduler.service.js';
import { runPipelineAll } from './pipeline.service.js';
import { runDailyDigest } from './email-digest.service.js';
import { createLogger } from '../config/logger.js';

const log = createLogger('jobs');

/**
 * Register all background jobs.
 *
 * Schedules:
 * - Pipeline poll:       every 15 minutes
 * - Daily email digest:  6:00 AM ET (11:00 UTC)
 * - Price alert scanner: every minute
 */
export function registerAllJobs(): void {
  registerJob('pipeline-poll', '*/15 * * * *', async () => {
    const results = await runPipelineAll();
    const total = results.reduce((sum, r) => sum + r.signalsCreated, 0);
    log.info({ gurus: results.length, signals: total }, 'Pipeline poll complete');
  });

  registerJob('daily-digest', '0 11 * * *', async () => {
    const { sent, skipped } = await runDailyDigest();
    log.info({ sent, skipped }, 'Daily digest complete');
  });

  registerJob('price-alert-scan', '*/1 * * * *', async () => {
    const { scanPriceAlerts } = await import('./price-alert-scanner.js');
    await scanPriceAlerts();
  });
}
