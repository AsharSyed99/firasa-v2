import { validateEnv } from './config/env.js';
import { initLogger, getLogger } from './config/logger.js';
import { initFirebase } from './config/firebase.js';
import { createApp } from './app.js';
import { initDatabase } from './services/database.js';
import { registerAllJobs } from './services/jobs.js';
import { startScheduler } from './services/scheduler.service.js';

async function main() {
  // 1. Validate env first — fail fast
  const env = validateEnv();
  initLogger();
  const log = getLogger();

  log.info({ env: env.NODE_ENV }, 'Firasa API starting');

  // 2. Initialize Firebase Auth
  initFirebase();

  // 3. Connect database
  await initDatabase();

  // 4. Start server
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    log.info({ port: env.PORT }, `API listening on http://localhost:${env.PORT}`);

    // Start background jobs
    registerAllJobs();
    startScheduler();
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    log.info({ signal }, 'Shutting down...');
    server.close(() => {
      log.info('Server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  // Logger may not be initialized if startup fails early
  const log = (() => { try { return getLogger(); } catch { return null; } })();
  if (log) {
    log.fatal({ err }, 'Fatal startup error');
  } else {
    console.error('Fatal startup error:', err);
  }
  process.exit(1);
});
