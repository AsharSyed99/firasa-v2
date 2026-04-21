import { getDb } from './database.js';
import type { UserDto, UserPreferenceDto, UserGuruConfigDto } from '@firasa/shared';

/** Get user profile */
export async function getUserProfile(userId: string): Promise<UserDto | null> {
  const db = getDb();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return mapUserToDto(user);
}

/** Get or create user preferences */
export async function getPreferences(userId: string): Promise<UserPreferenceDto> {
  const db = getDb();
  const pref = await db.userPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  return mapPreferenceToDto(pref);
}

/** Update user preferences */
export async function updatePreferences(
  userId: string,
  input: {
    alertThreshold?: number;
    maxAlertsPerDay?: number;
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
    timezone?: string;
    whatsappEnabled?: boolean;
    whatsappNumber?: string | null;
    pushEnabled?: boolean;
    emailEnabled?: boolean;
    emailDigestTime?: string | null;
    tickerWhitelist?: string[];
    tickerBlacklist?: string[];
  }
): Promise<UserPreferenceDto> {
  const db = getDb();

  const data: Record<string, unknown> = {};
  if (input.alertThreshold !== undefined) data.alertThreshold = input.alertThreshold;
  if (input.maxAlertsPerDay !== undefined) data.maxAlertsPerDay = input.maxAlertsPerDay;
  if (input.quietHoursStart !== undefined) data.quietHoursStart = input.quietHoursStart;
  if (input.quietHoursEnd !== undefined) data.quietHoursEnd = input.quietHoursEnd;
  if (input.timezone !== undefined) data.timezone = input.timezone;
  if (input.whatsappEnabled !== undefined) data.whatsappEnabled = input.whatsappEnabled;
  if (input.whatsappNumber !== undefined) data.whatsappNumber = input.whatsappNumber;
  if (input.pushEnabled !== undefined) data.pushEnabled = input.pushEnabled;
  if (input.emailEnabled !== undefined) data.emailEnabled = input.emailEnabled;
  if (input.emailDigestTime !== undefined) data.emailDigestTime = input.emailDigestTime;
  if (input.tickerWhitelist !== undefined) data.tickerWhitelist = JSON.stringify(input.tickerWhitelist);
  if (input.tickerBlacklist !== undefined) data.tickerBlacklist = JSON.stringify(input.tickerBlacklist);

  const pref = await db.userPreference.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return mapPreferenceToDto(pref);
}

/** Get user's guru configurations */
export async function getUserGuruConfigs(userId: string): Promise<UserGuruConfigDto[]> {
  const db = getDb();
  const configs = await db.userGuruConfig.findMany({ where: { userId } });
  return configs.map(mapGuruConfigToDto);
}

/** Update user's config for a specific guru */
export async function updateUserGuruConfig(
  userId: string,
  guruId: string,
  input: { isFollowing?: boolean; isMuted?: boolean; customWeight?: number | null }
): Promise<UserGuruConfigDto> {
  const db = getDb();
  const config = await db.userGuruConfig.upsert({
    where: { userId_guruId: { userId, guruId } },
    create: { userId, guruId, ...input },
    update: input,
  });
  return mapGuruConfigToDto(config);
}

/** Delete user account and ALL associated data (GDPR + App Store requirement) */
export async function deleteAccount(userId: string): Promise<void> {
  const db = getDb();

  // Delete in order to respect foreign keys
  await db.notification.deleteMany({ where: { userId } });
  await db.priceAlert.deleteMany({ where: { userId } });
  await db.watchlistItem.deleteMany({ where: { userId } });
  await db.portfolioPosition.deleteMany({ where: { userId } });
  await db.alertLog.deleteMany({ where: { userId } });
  await db.userQuota.deleteMany({ where: { userId } });
  await db.userDevice.deleteMany({ where: { userId } });
  await db.webPushSubscription.deleteMany({ where: { userId } });
  await db.userGuruConfig.deleteMany({ where: { userId } });
  await db.userPreference.deleteMany({ where: { userId } });
  await db.user.delete({ where: { id: userId } });
}

// ─── Mappers ─────────────────────────────────────────────────

function mapUserToDto(user: {
  id: string; email: string; displayName: string | null;
  photoUrl: string | null; tier: string; onboardingDone: boolean; createdAt: Date;
}): UserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    photoUrl: user.photoUrl,
    tier: user.tier as UserDto['tier'],
    onboardingDone: user.onboardingDone,
    createdAt: user.createdAt.toISOString(),
  };
}

function mapPreferenceToDto(pref: {
  alertThreshold: number; maxAlertsPerDay: number;
  quietHoursStart: string | null; quietHoursEnd: string | null;
  timezone: string; whatsappEnabled: boolean; whatsappNumber: string | null;
  pushEnabled: boolean; emailEnabled: boolean; emailDigestTime: string | null;
  tickerWhitelist: string | null; tickerBlacklist: string | null;
}): UserPreferenceDto {
  return {
    alertThreshold: pref.alertThreshold,
    maxAlertsPerDay: pref.maxAlertsPerDay,
    quietHoursStart: pref.quietHoursStart,
    quietHoursEnd: pref.quietHoursEnd,
    timezone: pref.timezone,
    whatsappEnabled: pref.whatsappEnabled,
    whatsappNumber: pref.whatsappNumber,
    pushEnabled: pref.pushEnabled,
    emailEnabled: pref.emailEnabled,
    emailDigestTime: pref.emailDigestTime,
    tickerWhitelist: pref.tickerWhitelist ? JSON.parse(pref.tickerWhitelist) : [],
    tickerBlacklist: pref.tickerBlacklist ? JSON.parse(pref.tickerBlacklist) : [],
  };
}

function mapGuruConfigToDto(config: {
  guruId: string; isFollowing: boolean; isMuted: boolean; customWeight: number | null;
}): UserGuruConfigDto {
  return {
    guruId: config.guruId,
    isFollowing: config.isFollowing,
    isMuted: config.isMuted,
    customWeight: config.customWeight,
  };
}

// ─── Web Push Subscriptions ──────────────────────────────────

export async function upsertWebPushSubscription(
  userId: string,
  endpoint: string,
  p256dh: string,
  auth: string,
) {
  const db = getDb();
  return db.webPushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh, auth },
    update: { userId, p256dh, auth },
  });
}

export async function deleteWebPushSubscription(userId: string, endpoint: string) {
  const db = getDb();
  await db.webPushSubscription.deleteMany({
    where: { userId, endpoint },
  });
}
