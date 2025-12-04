import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { hasPremiumAccess } from '../services/subscription.utils';

// Extend Express session type
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

// Extend Express request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string | null;
      };
    }
  }
}

/**
 * Middleware to require authentication.
 * Loads user data and attaches to request.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = (req.session as any).userId;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const user = await storage.getUser(userId);

  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: 'User not found' });
    return;
  }

  // Check if account is soft-deleted
  if (user.deletedAt) {
    req.session.destroy(() => {});
    res.status(401).json({ error: 'Account has been deleted' });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };

  next();
}

/**
 * Middleware to require admin role.
 * Must be used after requireAuth or standalone (includes auth check).
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = (req.session as any).userId;

  // Check authentication
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Load user if not already loaded
  if (!req.user) {
    const user = await storage.getUser(userId);

    if (!user) {
      req.session.destroy(() => {});
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (user.deletedAt) {
      req.session.destroy(() => {});
      res.status(401).json({ error: 'Account has been deleted' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
  }

  // Check admin role
  if (req.user.role !== 'admin') {
    console.log(`[AUTH] Admin access denied for user ${req.user.id}`);
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

/**
 * Middleware to require premium subscription.
 * Must be used after requireAuth or standalone (includes auth check).
 */
export async function requirePremium(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = (req.session as any).userId;

  // Check authentication
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Load user data
  const user = await storage.getUser(userId);

  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: 'User not found' });
    return;
  }

  if (user.deletedAt) {
    req.session.destroy(() => {});
    res.status(401).json({ error: 'Account has been deleted' });
    return;
  }

  // Check premium access
  const isPremium = hasPremiumAccess(
    user.subscriptionStatus as any,
    user.subscriptionCurrentPeriodEnd
  );

  if (!isPremium) {
    console.log(`[AUTH] Premium access denied for user ${userId}`);
    res.status(403).json({
      error: 'Premium subscription required',
      code: 'PREMIUM_REQUIRED',
      upgradeUrl: '/pricing'
    });
    return;
  }

  // Attach user to request if not already
  if (!req.user) {
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
  }

  next();
}
