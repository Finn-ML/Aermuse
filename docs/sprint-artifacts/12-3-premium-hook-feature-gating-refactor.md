# Story 12.3: Premium Hook & Feature Gating Refactor

## Story Info
| Field | Value |
|-------|-------|
| **Story ID** | 12-3 |
| **Epic** | EPIC-012: Pricing Tier Restructure |
| **Title** | Premium Hook & Feature Gating Refactor |
| **Status** | Review |
| **Story Points** | 3 |
| **Priority** | P0 - Critical |

## User Story
**As a** developer
**I want** to refactor the premium access system for tiered features
**So that** components can check specific tier access levels

## Acceptance Criteria

- [x] **AC-1**: Update `usePremium` hook interface
  ```typescript
  interface PremiumState {
    tier: SubscriptionTier;
    isPremium: boolean;      // beta or alpha
    isAlpha: boolean;        // alpha only
    canAccess: (feature: Feature) => boolean;
  }
  ```

- [x] **AC-2**: Feature access matrix implemented
  - Free: contract-storage (limited)
  - Beta: +ai-summary, +ai-risk-score, +e-signing, +templates
  - Alpha: +ai-red-flags, +ai-key-terms, +ai-missing-clauses

- [x] **AC-3**: Backwards compatible with existing `isPremium` checks
  - `isPremium` returns true for beta OR alpha

- [x] **AC-4**: Server-side access check middleware
  ```typescript
  requireTier('beta')  // beta or alpha
  requireTier('alpha') // alpha only
  ```

- [x] **AC-5**: Feature type exported for component use

## Technical Notes

### Updated Hook (client/src/hooks/usePremium.ts)

```typescript
import { useAuth } from '@/lib/auth';
import { TIER_FEATURES, type Feature, type SubscriptionTier } from '@shared/constants/tiers';

export function usePremium() {
  const { user, isLoading } = useAuth();

  const tier: SubscriptionTier = user?.subscriptionTier || 'free';
  const isPremium = tier === 'beta' || tier === 'alpha';
  const isAlpha = tier === 'alpha';

  const canAccess = (feature: Feature): boolean => {
    const allowedFeatures = TIER_FEATURES[tier] || [];
    return allowedFeatures.includes(feature);
  };

  return {
    tier,
    isPremium,
    isAlpha,
    canAccess,
    user,
    isLoading,
    subscriptionStatus: user?.subscriptionStatus || 'none'
  };
}
```

### Server Middleware (server/middleware/tier.ts)

```typescript
export function requireTier(minTier: 'beta' | 'alpha') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getUser(req.session.userId);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const tierOrder = { free: 0, beta: 1, alpha: 2 };
    const userTierLevel = tierOrder[user.subscriptionTier || 'free'];
    const requiredLevel = tierOrder[minTier];

    if (userTierLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Subscription upgrade required',
        code: 'TIER_UPGRADE_REQUIRED',
        requiredTier: minTier
      });
    }

    next();
  };
}
```

## Files to Modify

| File | Change |
|------|--------|
| `client/src/hooks/usePremium.ts` | Refactor with tier support |
| `server/middleware/tier.ts` | New file - tier middleware |
| `shared/constants/tiers.ts` | Add Feature type export |

## Dependencies

- Story 12.1 (Subscription Tier Data Model)

## Definition of Done

- [x] Hook returns tier information
- [x] canAccess() works for all features
- [x] isPremium backward compatible
- [x] Server middleware validates tiers
- [x] TypeScript types compile

## Dev Agent Record

### Context Reference
- Tech Spec: `docs/sprint-artifacts/tech-spec-epic-12.md`
- Existing Hook: `client/src/hooks/usePremium.ts`

### Implementation Notes

**Completed 2025-12-10**

1. **usePremium Hook** (`client/src/hooks/usePremium.ts`)
   - Full PremiumState interface implementation (lines 8-16)
   - Returns `tier`, `isPremium`, `isAlpha`, `canAccess()`, `user`, `isLoading`, `subscriptionStatus`
   - `isPremium` = tier is 'beta' OR 'alpha' (backwards compatible)
   - `canAccess(feature)` uses shared `canAccessFeature()` utility

2. **Server Middleware** (`server/middleware/tier.ts` - NEW FILE)
   - `requireTier(minTier)`: Validates user has at least the specified tier level
   - `requireFeature(feature)`: Validates user can access specific feature
   - Both return 403 with `TIER_UPGRADE_REQUIRED` or `FEATURE_UNAVAILABLE` codes

3. **Feature Type** (`shared/constants/tiers.ts:18-26`)
   - Exported `Feature` type with all feature identifiers
   - `TIER_FEATURES` matrix defines which tiers can access each feature

### File List

| File | Action |
|------|--------|
| `client/src/hooks/usePremium.ts` | Modified - tier-aware implementation |
| `server/middleware/tier.ts` | Created - tier validation middleware |
| `shared/constants/tiers.ts` | Already exists from 12-1 - Feature type exported |

### Test Commands
```bash
npm run check
npm test
```
