/**
 * Serverless database singleton for Vercel.
 * Uses Turso (@libsql/client) when TURSO_DATABASE_URL is set (persistent),
 * otherwise falls back to Prisma with local SQLite in /tmp (ephemeral).
 * Pattern borrowed from sifara-app which uses the same Turso integration.
 */
import { createClient, type Client, type ResultSet } from '@libsql/client/web';
import { PrismaClient } from '@firasa/database';

type DbMode = 'turso' | 'prisma';
let mode: DbMode | null = null;
let tursoClient: Client | null = null;
let prisma: PrismaClient | null = null;
let schemaReady = false;

const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS "users" ("id" TEXT NOT NULL PRIMARY KEY, "firebase_uid" TEXT, "email" TEXT, "display_name" TEXT, "photo_url" TEXT, "tier" TEXT NOT NULL DEFAULT 'free', "stripe_customer_id" TEXT, "stripe_subscription_id" TEXT, "onboarding_done" BOOLEAN NOT NULL DEFAULT false, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "users_firebase_uid_key" ON "users"("firebase_uid")`,

  `CREATE TABLE IF NOT EXISTS "auth_accounts" ("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "provider" TEXT NOT NULL, "provider_account_id" TEXT NOT NULL, "provider_handle" TEXT, "access_token" TEXT, "refresh_token" TEXT, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "auth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "auth_accounts_provider_id_key" ON "auth_accounts"("provider", "provider_account_id")`,

  `CREATE TABLE IF NOT EXISTS "user_preferences"("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "alert_threshold" INTEGER NOT NULL DEFAULT 50, "max_alerts_per_day" INTEGER NOT NULL DEFAULT 10, "quiet_hours_start" TEXT, "quiet_hours_end" TEXT, "timezone" TEXT NOT NULL DEFAULT 'America/New_York', "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false, "whatsapp_number" TEXT, "push_enabled" BOOLEAN NOT NULL DEFAULT true, "email_enabled" BOOLEAN NOT NULL DEFAULT false, "email_digest_time" TEXT, "ticker_whitelist" TEXT, "ticker_blacklist" TEXT, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "user_preferences_user_id_key" ON "user_preferences"("user_id")`,

  `CREATE TABLE IF NOT EXISTS "gurus" ("id" TEXT NOT NULL PRIMARY KEY, "twitter_handle" TEXT NOT NULL, "twitter_user_id" TEXT, "display_name" TEXT NOT NULL, "category" TEXT NOT NULL DEFAULT 'general', "reliability" REAL NOT NULL DEFAULT 0.5, "is_active" BOOLEAN NOT NULL DEFAULT true, "total_signals" INTEGER NOT NULL DEFAULT 0, "profitable_signals" INTEGER NOT NULL DEFAULT 0, "avg_score" REAL NOT NULL DEFAULT 0, "last_polled_at" DATETIME, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "gurus_twitter_handle_key" ON "gurus"("twitter_handle")`,

  `CREATE TABLE IF NOT EXISTS "signals" ("id" TEXT NOT NULL PRIMARY KEY, "guru_id" TEXT NOT NULL, "tweet_id" TEXT NOT NULL, "tweet_text" TEXT NOT NULL, "tweet_created_at" DATETIME NOT NULL, "tickers" TEXT NOT NULL, "action" TEXT NOT NULL, "sentiment" TEXT NOT NULL, "confidence" REAL NOT NULL DEFAULT 0, "score" INTEGER NOT NULL DEFAULT 0, "reasoning" TEXT, "timeframe" TEXT DEFAULT 'UNKNOWN', "entry_price" REAL, "entry_price_time" DATETIME, "after_hours" BOOLEAN NOT NULL DEFAULT false, "image_analysis" TEXT, "raw_enrichment" TEXT, "smart_money_score" INTEGER, "smart_money_summary" TEXT, "price_1h_later" REAL, "price_4h_later" REAL, "price_1d_later" REAL, "price_3d_later" REAL, "price_1w_later" REAL, "price_1m_later" REAL, "outcome_1h" TEXT, "outcome_4h" TEXT, "outcome_1d" TEXT, "outcome_3d" TEXT, "outcome_1w" TEXT, "outcome_1m" TEXT, "processed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "signals_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "gurus" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "signals_tweet_id_key" ON "signals"("tweet_id")`,
  `CREATE INDEX IF NOT EXISTS "signals_guru_id_created_at_idx" ON "signals"("guru_id", "created_at")`,
  `CREATE INDEX IF NOT EXISTS "signals_tickers_idx" ON "signals"("tickers")`,

  `CREATE TABLE IF NOT EXISTS "web_push_subscriptions" ("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "endpoint" TEXT NOT NULL, "p256dh" TEXT NOT NULL, "auth" TEXT NOT NULL, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "web_push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "web_push_subscriptions_endpoint_key" ON "web_push_subscriptions"("endpoint")`,

  `CREATE TABLE IF NOT EXISTS "notifications" ("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "type" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL, "data" TEXT, "is_read" BOOLEAN NOT NULL DEFAULT false, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at")`,

  `CREATE TABLE IF NOT EXISTS "alert_logs" ("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "signal_id" TEXT NOT NULL, "channel" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'sent', "error_msg" TEXT, "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS "watchlist_items" ("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "ticker" TEXT NOT NULL, "signal_id" TEXT, "added_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "notes" TEXT, CONSTRAINT "watchlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "watchlist_items_user_id_ticker_key" ON "watchlist_items"("user_id", "ticker")`,

  `CREATE TABLE IF NOT EXISTS "user_guru_configs" ("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "guru_id" TEXT NOT NULL, "is_following" BOOLEAN NOT NULL DEFAULT true, "is_muted" BOOLEAN NOT NULL DEFAULT false, "custom_weight" REAL, "notes" TEXT, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "user_guru_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "user_guru_configs_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "gurus" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "user_guru_configs_user_id_guru_id_key" ON "user_guru_configs"("user_id", "guru_id")`,

  `CREATE TABLE IF NOT EXISTS "feature_flags" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "description" TEXT, "enabled" BOOLEAN NOT NULL DEFAULT false, "rollout_percent" INTEGER NOT NULL DEFAULT 0, "target_tiers" TEXT, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "feature_flags_name_key" ON "feature_flags"("name")`,

  `CREATE TABLE IF NOT EXISTS "user_quotas" ("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "alerts_sent_today" INTEGER NOT NULL DEFAULT 0, "last_reset_date" TEXT NOT NULL, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "user_quotas_user_id_key" ON "user_quotas"("user_id")`,

  `CREATE TABLE IF NOT EXISTS "user_devices" ("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "fcm_token" TEXT NOT NULL, "platform" TEXT NOT NULL, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS "poll_logs" ("id" TEXT NOT NULL PRIMARY KEY, "guru_id" TEXT NOT NULL, "tweets_found" INTEGER NOT NULL DEFAULT 0, "signals_created" INTEGER NOT NULL DEFAULT 0, "errors" TEXT, "duration" INTEGER NOT NULL DEFAULT 0, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS "api_calls" ("id" TEXT NOT NULL PRIMARY KEY, "service" TEXT NOT NULL, "endpoint" TEXT NOT NULL, "status_code" INTEGER, "latency" INTEGER, "error" TEXT, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS "portfolio_positions" ("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "ticker" TEXT NOT NULL, "shares" REAL NOT NULL, "avg_cost" REAL NOT NULL, "opened_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "closed_at" DATETIME, "close_price" REAL, "linked_signal_id" TEXT)`,

  `CREATE TABLE IF NOT EXISTS "price_alerts" ("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "ticker" TEXT NOT NULL, "condition" TEXT NOT NULL, "target_price" REAL NOT NULL, "is_active" BOOLEAN NOT NULL DEFAULT true, "triggered_at" DATETIME, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS "daily_summaries" ("id" TEXT NOT NULL PRIMARY KEY, "date" TEXT NOT NULL, "total_signals" INTEGER NOT NULL DEFAULT 0, "buy_signals" INTEGER NOT NULL DEFAULT 0, "sell_signals" INTEGER NOT NULL DEFAULT 0, "avg_score" REAL NOT NULL DEFAULT 0, "alerts_sent" INTEGER NOT NULL DEFAULT 0, "active_users" INTEGER NOT NULL DEFAULT 0, "new_users" INTEGER NOT NULL DEFAULT 0, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "daily_summaries_date_key" ON "daily_summaries"("date")`,

  `CREATE TABLE IF NOT EXISTS "user_guru_follows" ("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "guru_id" TEXT NOT NULL, "created_at" TEXT DEFAULT (datetime('now')), FOREIGN KEY ("user_id") REFERENCES "users"("id"), FOREIGN KEY ("guru_id") REFERENCES "gurus"("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "user_guru_follows_user_guru_key" ON "user_guru_follows"("user_id", "guru_id")`,

  `CREATE TABLE IF NOT EXISTS "signal_outcomes" ("id" TEXT NOT NULL PRIMARY KEY, "signal_id" TEXT NOT NULL, "timeframe" TEXT NOT NULL, "price_at_signal" REAL, "price_at_check" REAL, "pct_change" REAL, "outcome" TEXT, "checked_at" TEXT DEFAULT (datetime('now')), FOREIGN KEY ("signal_id") REFERENCES "signals"("id"))`,
];

const SEED_SQL = [
  `INSERT OR IGNORE INTO users (id, firebase_uid, email, display_name, tier, onboarding_done, created_at, updated_at) VALUES ('dev-001', 'dev-user-001', 'dev@firasa.app', 'Dev User', 'admin', 1, datetime('now'), datetime('now'))`,
  `INSERT OR IGNORE INTO user_preferences (id, user_id, alert_threshold, max_alerts_per_day, timezone, push_enabled, created_at, updated_at) VALUES ('pref-001', 'dev-001', 50, 10, 'America/New_York', 1, datetime('now'), datetime('now'))`,
];

import seedData from './seed-data.json';

function escSql(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
}

export interface FirasaDb {
  execute: (sql: string, args?: any[]) => Promise<ResultSet>;
  mode: DbMode;
}

async function seedRealData(db: FirasaDb): Promise<void> {
  const result = await db.execute('SELECT COUNT(*) as cnt FROM gurus');
  const cnt = result.rows[0]?.cnt as number;
  if (cnt > 0) return;

  for (const g of (seedData as any).gurus) {
    await db.execute(`INSERT OR IGNORE INTO gurus (id, twitter_handle, twitter_user_id, display_name, category, reliability, is_active, total_signals, profitable_signals, avg_score, last_polled_at, created_at, updated_at)
      VALUES (${escSql(g.id)}, ${escSql(g.twitter_handle)}, ${escSql(g.twitter_user_id)}, ${escSql(g.display_name)}, ${escSql(g.category)}, ${escSql(g.reliability)}, ${escSql(g.is_active)}, ${escSql(g.total_signals)}, ${escSql(g.profitable_signals)}, ${escSql(g.avg_score)}, ${escSql(g.last_polled_at)}, ${escSql(g.created_at)}, ${escSql(g.updated_at)})`);
  }

  for (const s of (seedData as any).signals) {
    await db.execute(`INSERT OR IGNORE INTO signals (id, guru_id, tweet_id, tweet_text, tweet_created_at, tickers, action, sentiment, confidence, score, reasoning, timeframe, entry_price, entry_price_time, after_hours, image_analysis, raw_enrichment, smart_money_score, smart_money_summary, processed_at, created_at, updated_at)
      VALUES (${escSql(s.id)}, ${escSql(s.guru_id)}, ${escSql(s.tweet_id)}, ${escSql(s.tweet_text)}, ${escSql(s.tweet_created_at)}, ${escSql(s.tickers)}, ${escSql(s.action)}, ${escSql(s.sentiment)}, ${escSql(s.confidence)}, ${escSql(s.score)}, ${escSql(s.reasoning)}, ${escSql(s.timeframe)}, ${escSql(s.entry_price)}, ${escSql(s.entry_price_time)}, ${escSql(s.after_hours)}, ${escSql(s.image_analysis)}, ${escSql(s.raw_enrichment)}, ${escSql(s.smart_money_score)}, ${escSql(s.smart_money_summary)}, ${escSql(s.processed_at)}, ${escSql(s.created_at)}, ${escSql(s.updated_at)})`);
  }

  console.log(`✅ Seeded ${(seedData as any).gurus.length} gurus, ${(seedData as any).signals.length} signals`);
}

export async function getDb(): Promise<FirasaDb> {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoToken && !tursoClient) {
    tursoClient = createClient({ url: tursoUrl, authToken: tursoToken });
    mode = 'turso';
    console.log(`✅ Using Turso: ${tursoUrl}`);
  }

  if (!tursoClient && !prisma) {
    const url = process.env.DATABASE_URL || 'file:/tmp/firasa.db';
    prisma = new PrismaClient({ datasources: { db: { url } }, log: ['error'] });
    await prisma.$connect();
    mode = 'prisma';
    console.log('✅ Using local SQLite (ephemeral)');
  }

  const db: FirasaDb = {
    mode: mode!,
    execute: async (sql: string, args?: any[]): Promise<ResultSet> => {
      if (tursoClient) {
        return tursoClient.execute({ sql, args: args || [] });
      }
      const rows = await prisma!.$queryRawUnsafe(sql) as any[];
      return { rows, columns: [], rowsAffected: 0, lastInsertRowid: undefined } as any;
    },
  };

  if (!schemaReady) {
    for (const sql of SCHEMA_SQL) {
      await db.execute(sql);
    }
    for (const sql of SEED_SQL) {
      await db.execute(sql);
    }
    await seedRealData(db);
    schemaReady = true;
    console.log('✅ Schema + data ready');
  }

  return db;
}
