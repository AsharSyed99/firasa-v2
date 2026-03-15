import type { Request, Response, NextFunction } from 'express';
import { TIER_LIMITS, type UserTier } from '@firasa/shared';

/**
 * Anti-abuse middleware: detects and blocks suspicious request patterns.
 * All user-facing messages are generic — never reveal detection logic.
 */

const activeSessions = new Map<string, { ips: Map<string, number>; lastCleanup: number }>();
const requestPatterns = new Map<string, number[]>();

const CLEANUP_INTERVAL = 5 * 60_000;
const SESSION_WINDOW = 5 * 60_000;

export function antiAbuse(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    next();
    return;
  }

  const userId = req.user.id;
  const ip = req.ip ?? 'unknown';
  const now = Date.now();

  if (!checkConcurrentSessions(userId, ip, now, req.user.tier as UserTier, res)) return;
  if (!checkRequestPattern(userId, now, req.path, res)) return;
  if (!checkUserAgent(req, res)) return;

  next();
}

function checkConcurrentSessions(
  userId: string,
  ip: string,
  now: number,
  tier: UserTier,
  res: Response
): boolean {
  const limits = TIER_LIMITS[tier];
  let session = activeSessions.get(userId);

  if (!session) {
    session = { ips: new Map(), lastCleanup: now };
    activeSessions.set(userId, session);
  }

  if (now - session.lastCleanup > CLEANUP_INTERVAL) {
    for (const [sessionIp, lastSeen] of session.ips) {
      if (now - lastSeen > SESSION_WINDOW) session.ips.delete(sessionIp);
    }
    session.lastCleanup = now;
  }

  session.ips.set(ip, now);

  if (session.ips.size > limits.maxConcurrentSessions) {
    console.warn(`[ABUSE] uid=${userId} sessions=${session.ips.size}`);
    res.status(429).json({
      success: false,
      error: 'Request limit exceeded. Please try again later.',
    });
    return false;
  }

  return true;
}

function checkRequestPattern(
  userId: string,
  now: number,
  path: string,
  res: Response
): boolean {
  if (!path.includes('/signals') && !path.includes('/trades') && !path.includes('/gurus')) {
    return true;
  }

  let timestamps = requestPatterns.get(userId);
  if (!timestamps) {
    timestamps = [];
    requestPatterns.set(userId, timestamps);
  }

  timestamps.push(now);

  const cutoff = now - 60_000;
  while (timestamps.length > 0 && timestamps[0] < cutoff) {
    timestamps.shift();
  }

  if (timestamps.length > 100) {
    console.warn(`[ABUSE] uid=${userId} rpm=${timestamps.length} path=${path}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please slow down.',
    });
    return false;
  }

  return true;
}

function checkUserAgent(req: Request, res: Response): boolean {
  const ua = req.headers['user-agent'];

  if (!ua) {
    res.status(400).json({ success: false, error: 'Bad request' });
    return false;
  }

  if (process.env.NODE_ENV === 'production') {
    const blocked = [/^python-requests/i, /^curl\//i, /^wget\//i, /^scrapy/i, /^httpie/i];
    for (const pattern of blocked) {
      if (pattern.test(ua)) {
        console.warn(`[ABUSE] blocked ua=${ua}`);
        res.status(403).json({ success: false, error: 'Access denied' });
        return false;
      }
    }
  }

  return true;
}

export function cleanupAbuseTracking(): void {
  const now = Date.now();
  const staleThreshold = now - 10 * 60_000;

  for (const [userId, session] of activeSessions) {
    for (const [ip, lastSeen] of session.ips) {
      if (lastSeen < staleThreshold) session.ips.delete(ip);
    }
    if (session.ips.size === 0) activeSessions.delete(userId);
  }

  for (const [userId, timestamps] of requestPatterns) {
    const recent = timestamps.filter((t) => t > staleThreshold);
    if (recent.length === 0) {
      requestPatterns.delete(userId);
    } else {
      requestPatterns.set(userId, recent);
    }
  }
}
