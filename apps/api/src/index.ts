import { validateEnv } from './config/env.js';
import { initFirebase } from './config/firebase.js';
import { createApp } from './app.js';
import { initDatabase } from './services/database.js';

async function main() {
  // 1. Validate env first — fail fast
  const env = validateEnv();

  console.log(`🚀 Firasa API starting (${env.NODE_ENV})`);

  // 2. Initialize Firebase Auth
  initFirebase();

  // 3. Connect database
  await initDatabase();

  // 3. Start server
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`✅ API listening on http://localhost:${env.PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down...`);
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
