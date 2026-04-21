/**
 * Cold-start schema initializer for serverless (Vercel).
 * Creates all tables if they don't exist using raw SQL.
 * This replaces `prisma db push` which requires the CLI.
 */
import type { PrismaClient } from '@firasa/database';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firebase_uid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "photo_url" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "onboarding_done" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_firebase_uid_key" ON "users"("firebase_uid");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_stripe_customer_id_key" ON "users"("stripe_customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "users_stripe_subscription_id_key" ON "users"("stripe_subscription_id");

CREATE TABLE IF NOT EXISTS "user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "alert_threshold" INTEGER NOT NULL DEFAULT 50,
    "max_alerts_per_day" INTEGER NOT NULL DEFAULT 10,
    "quiet_hours_start" TEXT,
    "quiet_hours_end" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_number" TEXT,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT false,
    "email_digest_time" TEXT,
    "ticker_whitelist" TEXT,
    "ticker_blacklist" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_preferences_user_id_key" ON "user_preferences"("user_id");

CREATE TABLE IF NOT EXISTS "user_devices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "fcm_token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_devices_fcm_token_key" ON "user_devices"("fcm_token");

CREATE TABLE IF NOT EXISTS "web_push_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "web_push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "web_push_subscriptions_endpoint_key" ON "web_push_subscriptions"("endpoint");
CREATE INDEX IF NOT EXISTS "web_push_subscriptions_user_id_idx" ON "web_push_subscriptions"("user_id");

CREATE TABLE IF NOT EXISTS "user_guru_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "guru_id" TEXT NOT NULL,
    "is_following" BOOLEAN NOT NULL DEFAULT true,
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "custom_weight" REAL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_guru_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_guru_configs_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "gurus" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_guru_configs_user_id_guru_id_key" ON "user_guru_configs"("user_id", "guru_id");

CREATE TABLE IF NOT EXISTS "user_quotas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "alerts_sent_today" INTEGER NOT NULL DEFAULT 0,
    "last_reset_date" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_quotas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_quotas_user_id_key" ON "user_quotas"("user_id");

CREATE TABLE IF NOT EXISTS "gurus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "twitter_handle" TEXT NOT NULL,
    "twitter_user_id" TEXT,
    "display_name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "reliability" REAL NOT NULL DEFAULT 0.5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "total_signals" INTEGER NOT NULL DEFAULT 0,
    "profitable_signals" INTEGER NOT NULL DEFAULT 0,
    "avg_score" REAL NOT NULL DEFAULT 0,
    "last_polled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "gurus_twitter_handle_key" ON "gurus"("twitter_handle");
CREATE UNIQUE INDEX IF NOT EXISTS "gurus_twitter_user_id_key" ON "gurus"("twitter_user_id");

CREATE TABLE IF NOT EXISTS "signals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guru_id" TEXT NOT NULL,
    "tweet_id" TEXT NOT NULL,
    "tweet_text" TEXT NOT NULL,
    "tweet_created_at" DATETIME NOT NULL,
    "tickers" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "reasoning" TEXT,
    "timeframe" TEXT DEFAULT 'UNKNOWN',
    "entry_price" REAL,
    "entry_price_time" DATETIME,
    "after_hours" BOOLEAN NOT NULL DEFAULT false,
    "image_analysis" TEXT,
    "raw_enrichment" TEXT,
    "smart_money_score" INTEGER,
    "smart_money_summary" TEXT,
    "price_1h_later" REAL,
    "price_4h_later" REAL,
    "price_1d_later" REAL,
    "price_3d_later" REAL,
    "price_1w_later" REAL,
    "price_1m_later" REAL,
    "outcome_1h" TEXT,
    "outcome_4h" TEXT,
    "outcome_1d" TEXT,
    "outcome_3d" TEXT,
    "outcome_1w" TEXT,
    "outcome_1m" TEXT,
    "processed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "signals_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "gurus" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "signals_tweet_id_key" ON "signals"("tweet_id");
CREATE INDEX IF NOT EXISTS "signals_guru_id_created_at_idx" ON "signals"("guru_id", "created_at");
CREATE INDEX IF NOT EXISTS "signals_tickers_idx" ON "signals"("tickers");

CREATE TABLE IF NOT EXISTS "alert_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "signal_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "error_msg" TEXT,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alert_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "alert_logs_signal_id_fkey" FOREIGN KEY ("signal_id") REFERENCES "signals" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "alert_logs_user_id_sent_at_idx" ON "alert_logs"("user_id", "sent_at");

CREATE TABLE IF NOT EXISTS "poll_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guru_id" TEXT NOT NULL,
    "tweets_found" INTEGER NOT NULL DEFAULT 0,
    "signals_created" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "poll_logs_guru_id_created_at_idx" ON "poll_logs"("guru_id", "created_at");

CREATE TABLE IF NOT EXISTS "api_calls" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "service" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "status_code" INTEGER,
    "latency" INTEGER,
    "error" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "api_calls_service_created_at_idx" ON "api_calls"("service", "created_at");

CREATE TABLE IF NOT EXISTS "feature_flags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rollout_percent" INTEGER NOT NULL DEFAULT 0,
    "target_tiers" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "feature_flags_name_key" ON "feature_flags"("name");

CREATE TABLE IF NOT EXISTS "portfolio_positions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "shares" REAL NOT NULL,
    "avg_cost" REAL NOT NULL,
    "opened_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" DATETIME,
    "close_price" REAL,
    "linked_signal_id" TEXT,
    CONSTRAINT "portfolio_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "portfolio_positions_linked_signal_id_fkey" FOREIGN KEY ("linked_signal_id") REFERENCES "signals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "watchlist_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "added_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "watchlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "watchlist_items_user_id_ticker_key" ON "watchlist_items"("user_id", "ticker");

CREATE TABLE IF NOT EXISTS "price_alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "target_price" REAL NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "triggered_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "price_alerts_user_id_is_active_idx" ON "price_alerts"("user_id", "is_active");

CREATE TABLE IF NOT EXISTS "daily_summaries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "total_signals" INTEGER NOT NULL DEFAULT 0,
    "buy_signals" INTEGER NOT NULL DEFAULT 0,
    "sell_signals" INTEGER NOT NULL DEFAULT 0,
    "avg_score" REAL NOT NULL DEFAULT 0,
    "alerts_sent" INTEGER NOT NULL DEFAULT 0,
    "active_users" INTEGER NOT NULL DEFAULT 0,
    "new_users" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "daily_summaries_date_key" ON "daily_summaries"("date");

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");
`;

export async function ensureSchema(prisma: PrismaClient): Promise<void> {
  // Split on semicolons, filter empty, run each statement
  const statements = SCHEMA_SQL.split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql + ';');
  }
  console.log('✅ Schema ensured (cold start)');
}

/** Seed a dev user so the demo works on fresh cold starts */
export async function seedDevUser(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.$queryRawUnsafe(
    `SELECT id FROM users WHERE firebase_uid = 'dev-user-001' LIMIT 1`
  ) as any[];

  if (existing.length > 0) return;

  const now = new Date().toISOString();
  await prisma.$executeRawUnsafe(
    `INSERT INTO users (id, firebase_uid, email, display_name, tier, onboarding_done, created_at, updated_at)
     VALUES ('dev-001', 'dev-user-001', 'dev@firasa.app', 'Dev User', 'admin', true, '${now}', '${now}')`
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO user_preferences (id, user_id, alert_threshold, max_alerts_per_day, timezone, push_enabled, created_at, updated_at)
     VALUES ('pref-001', 'dev-001', 50, 10, 'America/New_York', true, '${now}', '${now}')`
  );
  console.log('✅ Dev user seeded');
}
