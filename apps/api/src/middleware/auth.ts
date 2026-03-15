import type { Request, Response, NextFunction } from 'express';
import type { UserTier } from '@firasa/shared';
import { verifyToken } from '../config/firebase.js';
import { getDb } from '../services/database.js';

/** Authenticated user attached to request */
export interface AuthUser {
  id: string;
  firebaseUid: string;
  email: string;
  tier: UserTier;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Require a valid Firebase JWT in the Authorization header.
 * No bypass — ever. In production or development, you must authenticate.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing authorization header' });
    return;
  }

  const token = header.slice(7);

  verifyToken(token)
    .then(async (decoded) => {
      const db = getDb();

      // Find or create user from Firebase token
      let user = await db.user.findUnique({
        where: { firebaseUid: decoded.uid },
      });

      if (!user) {
        user = await db.user.create({
          data: {
            firebaseUid: decoded.uid,
            email: decoded.email ?? `${decoded.uid}@firebase.user`,
            displayName: decoded.name ?? null,
            photoUrl: decoded.picture ?? null,
          },
        });
      }

      req.user = {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        tier: user.tier as UserTier,
      };

      next();
    })
    .catch((err) => {
      console.warn('Auth failed:', err.message);
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
    });
}

/**
 * Require a minimum subscription tier.
 * Must be used after requireAuth.
 */
export function requireTier(...allowedTiers: UserTier[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    // Admin always passes
    if (req.user.tier === 'admin') {
      next();
      return;
    }

    if (!allowedTiers.includes(req.user.tier)) {
      res.status(403).json({
        success: false,
        error: `Requires ${allowedTiers.join(' or ')} tier`,
      });
      return;
    }

    next();
  };
}

/**
 * Optional auth — attaches user if token present, but doesn't reject.
 * Useful for public endpoints that show extra data for logged-in users.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = header.slice(7);

  verifyToken(token)
    .then(async (decoded) => {
      const db = getDb();
      const user = await db.user.findUnique({
        where: { firebaseUid: decoded.uid },
      });
      if (user) {
        req.user = {
          id: user.id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          tier: user.tier as UserTier,
        };
      }
      next();
    })
    .catch(() => {
      // Invalid token — continue without user
      next();
    });
}
