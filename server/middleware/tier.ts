import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { TIER_HIERARCHY, type Feature, canAccessFeature } from '@shared/constants/tiers';
import type { SubscriptionTier } from '@shared/schema';

/**
 * Middleware to require a minimum subscription tier
 */
export function requireTier(minTier: 'beta' | 'alpha') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [user] = await db
      .select({ subscriptionTier: users.subscriptionTier, subscriptionStatus: users.subscriptionStatus })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if subscription is active
    const isActive = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
    const userTier: SubscriptionTier = isActive ? (user.subscriptionTier as SubscriptionTier) || 'free' : 'free';

    const userTierLevel = TIER_HIERARCHY[userTier];
    const requiredLevel = TIER_HIERARCHY[minTier];

    if (userTierLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Subscription upgrade required',
        code: 'TIER_UPGRADE_REQUIRED',
        requiredTier: minTier,
        currentTier: userTier,
      });
    }

    next();
  };
}

/**
 * Middleware to require access to a specific feature
 */
export function requireFeature(feature: Feature) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [user] = await db
      .select({ subscriptionTier: users.subscriptionTier, subscriptionStatus: users.subscriptionStatus })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if subscription is active
    const isActive = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
    const userTier: SubscriptionTier = isActive ? (user.subscriptionTier as SubscriptionTier) || 'free' : 'free';

    if (!canAccessFeature(userTier, feature)) {
      return res.status(403).json({
        error: 'Feature not available in current tier',
        code: 'FEATURE_UNAVAILABLE',
        feature,
        currentTier: userTier,
      });
    }

    next();
  };
}
