# Story 5.8: Subscription Paywall

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 5.8 |
| **Epic** | Epic 5: Subscription & Billing |
| **Title** | Subscription Paywall |
| **Priority** | P0 - Critical |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** system
**I want** to restrict premium features to subscribers
**So that** users pay for premium functionality

## Context

Free tier users get limited access: up to 3 contracts with basic storage. Premium features (AI analysis, e-signing, templates, unlimited contracts) require an active subscription. This story implements the gating logic across both backend and frontend.

**Dependencies:**
- Story 5.2 (Subscription Data Model)

## Acceptance Criteria

- [ ] **AC-1:** Backend middleware checks subscription for protected routes
- [ ] **AC-2:** AI analysis requires premium subscription
- [ ] **AC-3:** E-signing requires premium subscription
- [ ] **AC-4:** Template access requires premium subscription
- [ ] **AC-5:** Free users limited to 3 contracts
- [ ] **AC-6:** Frontend shows upgrade prompts for locked features
- [ ] **AC-7:** Graceful handling of expired subscriptions
- [ ] **AC-8:** Clear messaging about why features are locked
- [ ] **AC-9:** Feature flags available in auth context

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/middleware/requirePremium.ts` | New: Premium check middleware |
| `server/middleware/checkContractLimit.ts` | New: Contract limit check |
| `client/src/components/paywall/UpgradePrompt.tsx` | New: Upgrade modal |
| `client/src/components/paywall/FeatureGate.tsx` | New: Feature gate wrapper |
| `client/src/contexts/AuthContext.tsx` | Add subscription data |
| `server/routes/contracts.ts` | Add contract limit check |
| `server/routes/ai.ts` | Add premium check |
| `server/routes/templates.ts` | Add premium check |
| `server/routes/signatures.ts` | Add premium check |

### Implementation

#### Premium Middleware

```typescript
// server/middleware/requirePremium.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';
import { hasPremiumAccess } from '../services/subscription';
import type { SubscriptionStatus } from '../../shared/types/subscription';

export async function requirePremium(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const status = (user.subscriptionStatus || 'none') as SubscriptionStatus;
    const periodEnd = user.subscriptionCurrentPeriodEnd;

    if (!hasPremiumAccess(status, periodEnd)) {
      return res.status(403).json({
        error: 'Premium subscription required',
        code: 'PREMIUM_REQUIRED',
        message: 'This feature requires an active subscription.',
        upgradeUrl: '/pricing',
      });
    }

    next();
  } catch (error) {
    console.error('[AUTH] Premium check error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

// Wrapper for optional premium check (returns flag instead of blocking)
export async function checkPremiumStatus(req: Request): Promise<boolean> {
  const userId = req.session?.userId;

  if (!userId) return false;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
      },
    });

    if (!user) return false;

    const status = (user.subscriptionStatus || 'none') as SubscriptionStatus;
    const periodEnd = user.subscriptionCurrentPeriodEnd;

    return hasPremiumAccess(status, periodEnd);
  } catch {
    return false;
  }
}
```

#### Contract Limit Middleware

```typescript
// server/middleware/checkContractLimit.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '../db/schema/users';
import { contracts } from '../db/schema/contracts';
import { eq, count } from 'drizzle-orm';
import { hasPremiumAccess } from '../services/subscription';
import type { SubscriptionStatus } from '../../shared/types/subscription';

const FREE_CONTRACT_LIMIT = 3;

export async function checkContractLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Check if user has premium access
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const status = (user.subscriptionStatus || 'none') as SubscriptionStatus;
    const periodEnd = user.subscriptionCurrentPeriodEnd;

    // Premium users bypass limit
    if (hasPremiumAccess(status, periodEnd)) {
      return next();
    }

    // Count existing contracts
    const [result] = await db
      .select({ count: count() })
      .from(contracts)
      .where(eq(contracts.userId, userId));

    const contractCount = result?.count || 0;

    if (contractCount >= FREE_CONTRACT_LIMIT) {
      return res.status(403).json({
        error: 'Contract limit reached',
        code: 'CONTRACT_LIMIT_REACHED',
        message: `Free accounts are limited to ${FREE_CONTRACT_LIMIT} contracts. Upgrade to Premium for unlimited contracts.`,
        limit: FREE_CONTRACT_LIMIT,
        current: contractCount,
        upgradeUrl: '/pricing',
      });
    }

    // Attach remaining count to request for frontend info
    req.contractsRemaining = FREE_CONTRACT_LIMIT - contractCount;
    next();
  } catch (error) {
    console.error('[AUTH] Contract limit check error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      contractsRemaining?: number;
    }
  }
}
```

#### Apply Middleware to Routes

```typescript
// server/routes/ai.ts
import { requirePremium } from '../middleware/requirePremium';

// Protect AI analysis endpoints
router.post('/analyze', requireAuth, requirePremium, async (req, res) => {
  // ... existing handler
});
```

```typescript
// server/routes/templates.ts
import { requirePremium } from '../middleware/requirePremium';

// Protect template access
router.get('/', requireAuth, requirePremium, async (req, res) => {
  // ... existing handler
});

router.get('/:id', requireAuth, requirePremium, async (req, res) => {
  // ... existing handler
});
```

```typescript
// server/routes/signatures.ts
import { requirePremium } from '../middleware/requirePremium';

// Protect e-signing
router.post('/', requireAuth, requirePremium, async (req, res) => {
  // ... create signature request
});
```

```typescript
// server/routes/contracts.ts
import { checkContractLimit } from '../middleware/checkContractLimit';

// Apply to contract creation
router.post('/', requireAuth, checkContractLimit, async (req, res) => {
  // ... create contract
});
```

#### Upgrade Prompt Component

```tsx
// client/src/components/paywall/UpgradePrompt.tsx
import { X, Sparkles, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  description?: string;
}

export function UpgradePrompt({ isOpen, onClose, feature, description }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-burgundy to-burgundy-dark p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-full">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold">Premium Feature</h2>
          </div>

          <p className="text-white/90">
            {feature} is available with Aermuse Premium.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {description && (
            <p className="text-gray-600 mb-6">{description}</p>
          )}

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-gray-700">
              <Sparkles className="h-4 w-4 text-burgundy" />
              <span>AI Contract Analysis</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Sparkles className="h-4 w-4 text-burgundy" />
              <span>E-Signing with DocuSeal</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Sparkles className="h-4 w-4 text-burgundy" />
              <span>Professional Templates</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Sparkles className="h-4 w-4 text-burgundy" />
              <span>Unlimited Contracts</span>
            </div>
          </div>

          <div className="text-center mb-4">
            <span className="text-3xl font-bold text-gray-900">£9</span>
            <span className="text-gray-500">/month</span>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              to="/checkout"
              onClick={onClose}
              className="w-full py-3 bg-burgundy text-white rounded-lg hover:bg-burgundy-dark font-medium text-center"
            >
              Upgrade Now
            </Link>
            <button
              onClick={onClose}
              className="w-full py-2 text-gray-600 hover:text-gray-800"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### Feature Gate Component

```tsx
// client/src/components/paywall/FeatureGate.tsx
import { useState, ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UpgradePrompt } from './UpgradePrompt';

interface Props {
  feature: string;
  description?: string;
  children: ReactNode;
  /** Show locked indicator instead of hiding */
  showLocked?: boolean;
  /** Callback when feature is blocked */
  onBlocked?: () => void;
}

export function FeatureGate({
  feature,
  description,
  children,
  showLocked = false,
  onBlocked,
}: Props) {
  const { subscription } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);

  const isPremium = subscription?.hasAccess;

  const handleClick = (e: React.MouseEvent) => {
    if (!isPremium) {
      e.preventDefault();
      e.stopPropagation();
      setShowPrompt(true);
      onBlocked?.();
    }
  };

  // Premium users see normal content
  if (isPremium) {
    return <>{children}</>;
  }

  // Free users see locked version
  if (showLocked) {
    return (
      <>
        <div
          onClick={handleClick}
          className="relative cursor-pointer group"
        >
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/5 group-hover:bg-black/10 transition-colors">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow text-sm text-gray-700">
              <Lock className="h-4 w-4" />
              Premium
            </div>
          </div>
        </div>

        <UpgradePrompt
          isOpen={showPrompt}
          onClose={() => setShowPrompt(false)}
          feature={feature}
          description={description}
        />
      </>
    );
  }

  // Hidden by default
  return (
    <>
      <div onClick={handleClick} className="cursor-pointer">
        {children}
      </div>

      <UpgradePrompt
        isOpen={showPrompt}
        onClose={() => setShowPrompt(false)}
        feature={feature}
        description={description}
      />
    </>
  );
}
```

#### Auth Context Update

```tsx
// client/src/contexts/AuthContext.tsx - Add subscription to context

interface Subscription {
  status: string;
  tier: 'free' | 'premium';
  hasAccess: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  daysRemaining: number | null;
}

interface AuthContextValue {
  user: User | null;
  subscription: Subscription | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// In the provider, fetch subscription with user
const fetchUser = async () => {
  const [userRes, subRes] = await Promise.all([
    fetch('/api/auth/me', { credentials: 'include' }),
    fetch('/api/billing/subscription', { credentials: 'include' }),
  ]);

  if (userRes.ok) {
    const userData = await userRes.json();
    setUser(userData);
  }

  if (subRes.ok) {
    const subData = await subRes.json();
    setSubscription(subData);
  }
};
```

#### Contract Limit Warning

```tsx
// client/src/components/contracts/ContractLimitWarning.tsx
import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const FREE_CONTRACT_LIMIT = 3;

export function ContractLimitWarning({ currentCount }: { currentCount: number }) {
  const { subscription } = useAuth();

  // Don't show for premium users
  if (subscription?.hasAccess) return null;

  const remaining = FREE_CONTRACT_LIMIT - currentCount;

  if (remaining <= 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Contract Limit Reached</p>
            <p className="text-red-700 text-sm mt-1">
              You've reached the {FREE_CONTRACT_LIMIT} contract limit on the free plan.
              Upgrade to Premium for unlimited contracts.
            </p>
            <Link
              to="/pricing"
              className="inline-block mt-2 text-sm font-medium text-burgundy hover:underline"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (remaining <= 1) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">
              {remaining} Contract{remaining === 1 ? '' : 's'} Remaining
            </p>
            <p className="text-yellow-700 text-sm mt-1">
              You're almost at the free tier limit.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
```

## Definition of Done

- [ ] Premium middleware blocking non-subscribers
- [ ] AI analysis protected
- [ ] E-signing protected
- [ ] Templates protected
- [ ] Contract limit enforced (3 for free)
- [ ] Upgrade prompts showing
- [ ] Feature gates working in UI
- [ ] Subscription data in auth context
- [ ] Clear error messages

## Testing Checklist

### Unit Tests

- [ ] requirePremium middleware
- [ ] checkContractLimit middleware
- [ ] hasPremiumAccess edge cases

### Integration Tests

- [ ] Free user blocked from AI analysis
- [ ] Free user blocked from e-signing
- [ ] Free user blocked from templates
- [ ] Free user blocked at 3 contracts
- [ ] Premium user has full access
- [ ] Canceled user with remaining period has access

### E2E Tests

- [ ] Free user sees upgrade prompt
- [ ] Clicking upgrade goes to checkout
- [ ] Premium user doesn't see gates

## Related Documents

- [Epic 5 Tech Spec](./tech-spec-epic-5.md)
- [Story 5.2: Subscription Data Model](./5-2-subscription-data-model.md)
- [Story 5.3: Pricing Page](./5-3-pricing-page.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create requirePremium middleware**
  - [ ] Create server/middleware/requirePremium.ts
  - [ ] Implement requirePremium function
  - [ ] Query user subscription status
  - [ ] Check hasPremiumAccess
  - [ ] Return 403 error with upgrade info if not premium
  - [ ] Create checkPremiumStatus helper function

- [ ] **Task 2: Create checkContractLimit middleware**
  - [ ] Create server/middleware/checkContractLimit.ts
  - [ ] Define FREE_CONTRACT_LIMIT constant
  - [ ] Query user subscription status
  - [ ] Count existing contracts for user
  - [ ] Check if premium (bypass limit)
  - [ ] Return 403 if limit reached for free users
  - [ ] Attach contractsRemaining to request

- [ ] **Task 3: Apply middleware to protected routes**
  - [ ] Add requirePremium to server/routes/ai.ts analysis endpoints
  - [ ] Add requirePremium to server/routes/templates.ts endpoints
  - [ ] Add requirePremium to server/routes/signatures.ts endpoints
  - [ ] Add checkContractLimit to server/routes/contracts.ts creation endpoint

- [ ] **Task 4: Build UpgradePrompt component**
  - [ ] Create client/src/components/paywall/UpgradePrompt.tsx
  - [ ] Create modal with backdrop
  - [ ] Display feature name and description
  - [ ] List premium features with icons
  - [ ] Show £9/month pricing
  - [ ] Add "Upgrade Now" button
  - [ ] Add "Maybe Later" close option

- [ ] **Task 5: Build FeatureGate component**
  - [ ] Create client/src/components/paywall/FeatureGate.tsx
  - [ ] Check subscription status from auth context
  - [ ] Render children normally for premium users
  - [ ] Show locked overlay for free users (if showLocked=true)
  - [ ] Trigger upgrade prompt on click
  - [ ] Support hidden mode vs locked mode

- [ ] **Task 6: Update AuthContext with subscription**
  - [ ] Add subscription to AuthContextValue interface
  - [ ] Define Subscription interface
  - [ ] Fetch subscription data with user
  - [ ] Call /api/billing/subscription endpoint
  - [ ] Store in context state
  - [ ] Update on user refresh

- [ ] **Task 7: Build ContractLimitWarning component**
  - [ ] Create client/src/components/contracts/ContractLimitWarning.tsx
  - [ ] Calculate remaining contracts
  - [ ] Show red banner if limit reached
  - [ ] Show yellow warning if 1 remaining
  - [ ] Hide for premium users
  - [ ] Add upgrade link

- [ ] **Task 8: Testing**
  - [ ] Test requirePremium blocks free users from AI analysis
  - [ ] Test requirePremium blocks free users from templates
  - [ ] Test requirePremium blocks free users from e-signing
  - [ ] Test checkContractLimit allows up to 3 contracts
  - [ ] Test premium users bypass all limits
  - [ ] Test upgrade prompt displays correctly
  - [ ] Test FeatureGate locks features visually
  - [ ] Test canceled user with period remaining has access
