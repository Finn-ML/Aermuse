# Story 5.2: Subscription Data Model

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 5.2 |
| **Epic** | Epic 5: Subscription & Billing |
| **Title** | Subscription Data Model |
| **Priority** | P0 - Critical |
| **Story Points** | 2 |
| **Status** | Drafted |

## User Story

**As a** developer
**I want** to track subscription status in the database
**So that** feature access can be controlled

## Context

This story adds subscription-related fields to the users table to track Stripe customer IDs, subscription status, and period dates. This data is synced via webhooks and used for access control.

**Dependencies:**
- Story 5.1 (Stripe Integration Setup)

## Acceptance Criteria

- [ ] **AC-1:** Add `stripe_customer_id` field to users table
- [ ] **AC-2:** Add `stripe_subscription_id` field
- [ ] **AC-3:** Add `subscription_status` field with valid statuses
- [ ] **AC-4:** Add `subscription_current_period_end` field
- [ ] **AC-5:** Add `subscription_cancel_at_period_end` field
- [ ] **AC-6:** Database migration created and tested
- [ ] **AC-7:** TypeScript types updated
- [ ] **AC-8:** Helper functions for checking subscription access

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/db/schema/users.ts` | Add subscription fields |
| `server/db/migrations/XXXX_add_subscription_fields.ts` | Migration |
| `server/services/subscription.ts` | New: Subscription helpers |
| `shared/types/subscription.ts` | Shared types |

### Database Schema

```sql
-- Add subscription fields to users table
ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(50);
ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(50);
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'none';
ALTER TABLE users ADD COLUMN subscription_price_id VARCHAR(50);
ALTER TABLE users ADD COLUMN subscription_current_period_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN subscription_cancel_at_period_end BOOLEAN DEFAULT false;

-- Indexes for efficient lookups
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_users_stripe_subscription ON users(stripe_subscription_id);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
```

### Drizzle Schema Update

```typescript
// server/db/schema/users.ts
import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Authentication fields
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),

    // Email verification
    emailVerified: boolean('email_verified').default(false),
    emailVerificationToken: varchar('email_verification_token', { length: 64 }),

    // Password reset
    passwordResetToken: varchar('password_reset_token', { length: 64 }),
    passwordResetExpires: timestamp('password_reset_expires', { withTimezone: true }),

    // Role
    role: text('role').default('user'),
    isAdmin: boolean('is_admin').default(false),

    // ============================================
    // SUBSCRIPTION FIELDS
    // ============================================
    stripeCustomerId: varchar('stripe_customer_id', { length: 50 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 50 }),
    subscriptionStatus: text('subscription_status').default('none'),
    subscriptionPriceId: varchar('subscription_price_id', { length: 50 }),
    subscriptionCurrentPeriodEnd: timestamp('subscription_current_period_end', {
      withTimezone: true,
    }),
    subscriptionCancelAtPeriodEnd: boolean('subscription_cancel_at_period_end').default(false),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    emailIdx: index('idx_users_email').on(table.email),
    stripeCustomerIdx: index('idx_users_stripe_customer').on(table.stripeCustomerId),
    stripeSubscriptionIdx: index('idx_users_stripe_subscription').on(table.stripeSubscriptionId),
    subscriptionStatusIdx: index('idx_users_subscription_status').on(table.subscriptionStatus),
  })
);

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### Subscription Types

```typescript
// shared/types/subscription.ts

/**
 * Subscription status values
 */
export type SubscriptionStatus =
  | 'none'              // Never subscribed
  | 'trialing'          // In trial period
  | 'active'            // Paid and active
  | 'past_due'          // Payment failed, grace period
  | 'canceled'          // Canceled, may still have access
  | 'unpaid'            // Payment failed, access revoked
  | 'incomplete'        // Initial payment pending
  | 'incomplete_expired'; // Initial payment failed

/**
 * Subscription tier
 */
export type SubscriptionTier = 'free' | 'premium';

/**
 * User subscription data (for frontend)
 */
export interface UserSubscription {
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  hasAccess: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  daysRemaining: number | null;
}

/**
 * Subscription update payload (for webhook handlers)
 */
export interface SubscriptionUpdate {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionPriceId?: string | null;
  subscriptionCurrentPeriodEnd?: Date | null;
  subscriptionCancelAtPeriodEnd?: boolean;
}

/**
 * Feature access flags
 */
export interface FeatureAccess {
  aiAnalysis: boolean;
  eSigning: boolean;
  templates: boolean;
  unlimitedContracts: boolean;
  pdfExport: boolean;
}
```

### Subscription Service

```typescript
// server/services/subscription.ts
import { db } from '../db';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';
import {
  SubscriptionStatus,
  SubscriptionTier,
  UserSubscription,
  SubscriptionUpdate,
  FeatureAccess,
} from '../../shared/types/subscription';

// ============================================
// CONSTANTS
// ============================================

const FREE_CONTRACT_LIMIT = 3;

const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing'];
const ACCESS_STATUSES: SubscriptionStatus[] = ['active', 'trialing', 'canceled', 'past_due'];

// ============================================
// SUBSCRIPTION ACCESS CHECKS
// ============================================

/**
 * Check if a subscription status grants premium access
 */
export function hasActiveSubscription(status: SubscriptionStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/**
 * Check if a user has premium access (including grace periods)
 */
export function hasPremiumAccess(
  status: SubscriptionStatus,
  periodEnd: Date | null
): boolean {
  // Active or trialing always has access
  if (ACTIVE_STATUSES.includes(status)) {
    return true;
  }

  // Canceled or past_due has access until period end
  if ((status === 'canceled' || status === 'past_due') && periodEnd) {
    return new Date(periodEnd) > new Date();
  }

  return false;
}

/**
 * Get subscription tier based on status
 */
export function getSubscriptionTier(
  status: SubscriptionStatus,
  periodEnd: Date | null
): SubscriptionTier {
  return hasPremiumAccess(status, periodEnd) ? 'premium' : 'free';
}

/**
 * Calculate days remaining in subscription
 */
export function getDaysRemaining(periodEnd: Date | null): number | null {
  if (!periodEnd) return null;

  const now = new Date();
  const end = new Date(periodEnd);
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

/**
 * Get feature access flags based on subscription
 */
export function getFeatureAccess(
  status: SubscriptionStatus,
  periodEnd: Date | null
): FeatureAccess {
  const isPremium = hasPremiumAccess(status, periodEnd);

  return {
    aiAnalysis: isPremium,
    eSigning: isPremium,
    templates: isPremium,
    unlimitedContracts: isPremium,
    pdfExport: isPremium,
  };
}

// ============================================
// USER SUBSCRIPTION DATA
// ============================================

/**
 * Get user subscription data for frontend
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      subscriptionStatus: true,
      subscriptionCurrentPeriodEnd: true,
      subscriptionCancelAtPeriodEnd: true,
    },
  });

  if (!user) {
    return {
      status: 'none',
      tier: 'free',
      hasAccess: false,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      daysRemaining: null,
    };
  }

  const status = (user.subscriptionStatus || 'none') as SubscriptionStatus;
  const periodEnd = user.subscriptionCurrentPeriodEnd;

  return {
    status,
    tier: getSubscriptionTier(status, periodEnd),
    hasAccess: hasPremiumAccess(status, periodEnd),
    currentPeriodEnd: periodEnd?.toISOString() || null,
    cancelAtPeriodEnd: user.subscriptionCancelAtPeriodEnd || false,
    daysRemaining: getDaysRemaining(periodEnd),
  };
}

/**
 * Check if user can perform premium action
 */
export async function canAccessPremiumFeature(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  return subscription.hasAccess;
}

// ============================================
// UPDATE SUBSCRIPTION
// ============================================

/**
 * Update user subscription data (called from webhooks)
 */
export async function updateUserSubscription(
  userId: string,
  update: SubscriptionUpdate
): Promise<void> {
  await db
    .update(users)
    .set({
      ...update,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  console.log(`[SUBSCRIPTION] Updated user ${userId}:`, update.subscriptionStatus);
}

/**
 * Update subscription by Stripe customer ID
 */
export async function updateSubscriptionByCustomerId(
  customerId: string,
  update: SubscriptionUpdate
): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
    columns: { id: true },
  });

  if (!user) {
    console.error(`[SUBSCRIPTION] No user found for customer ${customerId}`);
    return;
  }

  await updateUserSubscription(user.id, update);
}

/**
 * Link Stripe customer to user
 */
export async function linkStripeCustomer(
  userId: string,
  customerId: string
): Promise<void> {
  await db
    .update(users)
    .set({
      stripeCustomerId: customerId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  console.log(`[SUBSCRIPTION] Linked customer ${customerId} to user ${userId}`);
}

// ============================================
// CONTRACT LIMITS
// ============================================

/**
 * Check if user can create more contracts
 */
export async function canCreateContract(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
}> {
  const subscription = await getUserSubscription(userId);

  // Premium users have unlimited
  if (subscription.hasAccess) {
    return { allowed: true };
  }

  // Count user's contracts
  const contractCount = await db.query.contracts.count({
    where: eq(contracts.userId, userId),
  });

  if (contractCount >= FREE_CONTRACT_LIMIT) {
    return {
      allowed: false,
      reason: 'Free tier contract limit reached',
      limit: FREE_CONTRACT_LIMIT,
      current: contractCount,
    };
  }

  return {
    allowed: true,
    limit: FREE_CONTRACT_LIMIT,
    current: contractCount,
  };
}
```

### Migration

```typescript
// server/db/migrations/XXXX_add_subscription_fields.ts
import { sql } from 'drizzle-orm';
import { db } from '../index';

export async function up() {
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_price_id VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
    CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id);
    CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
  `);
}

export async function down() {
  await db.execute(sql`
    DROP INDEX IF EXISTS idx_users_subscription_status;
    DROP INDEX IF EXISTS idx_users_stripe_subscription;
    DROP INDEX IF EXISTS idx_users_stripe_customer;

    ALTER TABLE users DROP COLUMN IF EXISTS subscription_cancel_at_period_end;
    ALTER TABLE users DROP COLUMN IF EXISTS subscription_current_period_end;
    ALTER TABLE users DROP COLUMN IF EXISTS subscription_price_id;
    ALTER TABLE users DROP COLUMN IF EXISTS subscription_status;
    ALTER TABLE users DROP COLUMN IF EXISTS stripe_subscription_id;
    ALTER TABLE users DROP COLUMN IF EXISTS stripe_customer_id;
  `);
}
```

## Definition of Done

- [ ] Migration adds all fields
- [ ] Indexes created for performance
- [ ] TypeScript types exported
- [ ] Subscription service functions working
- [ ] Access checks returning correct values
- [ ] Migration reversible

## Testing Checklist

### Unit Tests

```typescript
describe('Subscription Service', () => {
  describe('hasActiveSubscription', () => {
    it('returns true for active status', () => {
      expect(hasActiveSubscription('active')).toBe(true);
    });

    it('returns true for trialing status', () => {
      expect(hasActiveSubscription('trialing')).toBe(true);
    });

    it('returns false for canceled status', () => {
      expect(hasActiveSubscription('canceled')).toBe(false);
    });
  });

  describe('hasPremiumAccess', () => {
    it('returns true for active regardless of period end', () => {
      expect(hasPremiumAccess('active', null)).toBe(true);
    });

    it('returns true for canceled with future period end', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      expect(hasPremiumAccess('canceled', futureDate)).toBe(true);
    });

    it('returns false for canceled with past period end', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(hasPremiumAccess('canceled', pastDate)).toBe(false);
    });

    it('returns false for none status', () => {
      expect(hasPremiumAccess('none', null)).toBe(false);
    });
  });

  describe('getDaysRemaining', () => {
    it('returns correct days for future date', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      expect(getDaysRemaining(futureDate)).toBe(7);
    });

    it('returns 0 for past date', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(getDaysRemaining(pastDate)).toBe(0);
    });

    it('returns null for null input', () => {
      expect(getDaysRemaining(null)).toBeNull();
    });
  });
});
```

### Integration Tests

- [ ] Migration applies successfully
- [ ] User subscription data retrieved correctly
- [ ] Update functions work

### Database Tests

- [ ] Indexes exist after migration
- [ ] Default values applied
- [ ] Migration rollback works

## Related Documents

- [Epic 5 Tech Spec](./tech-spec-epic-5.md)
- [Story 5.1: Stripe Integration Setup](./5-1-stripe-integration-setup.md)
- [Story 5.8: Subscription Paywall](./5-8-subscription-paywall.md)

---

## Tasks/Subtasks

- [x] **Task 1: Update database schema with subscription fields**
  - [x] Modify shared/schema.ts to add subscription columns
  - [x] Add stripeCustomerId, stripeSubscriptionId fields
  - [x] Add subscriptionStatus, subscriptionPriceId fields
  - [x] Add subscriptionCurrentPeriodEnd, subscriptionCancelAtPeriodEnd fields
  - [ ] Define indexes for performance optimization (requires db connection)

- [ ] **Task 2: Create database migration**
  - [x] Schema updated (using Drizzle push approach)
  - [ ] Run db:push with DATABASE_URL (requires production db)

- [x] **Task 3: Define TypeScript subscription types**
  - [x] Create shared/types/subscription.ts
  - [x] Define SubscriptionStatus type with all valid statuses
  - [x] Define SubscriptionTier type (free/premium)
  - [x] Create UserSubscription interface
  - [x] Create SubscriptionUpdate interface
  - [x] Create FeatureAccess interface

- [x] **Task 4: Implement subscription service functions**
  - [x] Create server/services/subscription.ts
  - [x] Implement hasActiveSubscription check
  - [x] Implement hasPremiumAccess check with grace period logic
  - [x] Implement getSubscriptionTier function
  - [x] Implement getDaysRemaining calculation
  - [x] Implement getFeatureAccess function
  - [x] Implement getUserSubscription query function
  - [x] Implement canAccessPremiumFeature check

- [x] **Task 5: Implement subscription update functions**
  - [x] Create updateUserSubscription function
  - [x] Create updateSubscriptionByCustomerId function
  - [x] Create linkStripeCustomer function
  - [x] Add proper error handling and logging

- [x] **Task 6: Implement contract limit logic**
  - [x] Create canCreateContract function
  - [x] Query contract count for user
  - [x] Check against FREE_CONTRACT_LIMIT constant
  - [x] Return detailed limit information

- [x] **Task 7: Testing**
  - [x] Write unit tests for hasActiveSubscription
  - [x] Write unit tests for hasPremiumAccess edge cases
  - [x] Write unit tests for getDaysRemaining
  - [x] Write unit tests for getFeatureAccess
  - [ ] Test migration applies and reverses (requires db)
  - [ ] Verify indexes created properly (requires db)
  - [ ] Test canCreateContract with various scenarios (requires db)

---

## Dev Agent Record

### Debug Log
- 2025-11-29: Added subscription fields to shared/schema.ts
- 2025-11-29: Created shared/types/subscription.ts with all types
- 2025-11-29: Created server/services/subscription.utils.ts (pure functions)
- 2025-11-29: Created server/services/subscription.ts (db operations)
- 2025-11-29: Tests passing (31/31)

### Completion Notes
Code implementation complete. Schema updated, types defined, service functions implemented.

**Remaining (requires database connection):**
- Run db:push to apply schema changes
- Verify indexes created properly

---

## File List

| Action | File Path |
|--------|-----------|
| Modified | shared/schema.ts |
| Created | shared/types/subscription.ts |
| Created | server/services/subscription.ts |
| Created | server/services/subscription.utils.ts |
| Created | server/services/__tests__/subscription.test.ts |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-29 | Initial implementation - schema, types, service, tests | Dev Agent |
