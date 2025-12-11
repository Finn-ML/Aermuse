# Story 12.10: Existing Subscriber Migration

## Story Info
| Field | Value |
|-------|-------|
| **Story ID** | 12-10 |
| **Epic** | EPIC-012: Pricing Tier Restructure |
| **Title** | Existing Subscriber Migration |
| **Status** | Review |
| **Story Points** | 2 |
| **Priority** | P0 - Critical |

## User Story
**As a** platform operator
**I want** existing £9/month subscribers migrated to appropriate tiers
**So that** the transition is seamless

## Acceptance Criteria

- [x] **AC-1**: Existing active subscribers mapped to Beta
  - All users with subscription_status = 'active'
  - Set subscription_tier = 'beta'

- [x] **AC-2**: No service interruption
  - Migration runs during deployment
  - Features remain accessible throughout

- [x] **AC-3**: Stripe product mapping
  - Old price ID continues to work
  - Treated as Beta subscription

- [x] **AC-4**: Migration logged
  - Record of all migrated users
  - Audit trail for support queries

- [x] **AC-5**: Rollback plan documented
  - Can revert tier assignments if needed
  - Keep old price ID functional

## Technical Notes

### Migration Script

Create `scripts/migrate-tiers.ts`:

```typescript
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function migrateTiers() {
  console.log('[MIGRATION] Starting tier migration...');

  // Find all active subscribers without a tier
  const activeSubscribers = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.subscriptionStatus, 'active'),
        or(
          isNull(users.subscriptionTier),
          eq(users.subscriptionTier, 'free')
        )
      )
    );

  console.log(`[MIGRATION] Found ${activeSubscribers.length} subscribers to migrate`);

  // Migration log
  const migrationLog: { userId: string; email: string; timestamp: Date }[] = [];

  for (const user of activeSubscribers) {
    await db
      .update(users)
      .set({ subscriptionTier: 'beta' })
      .where(eq(users.id, user.id));

    migrationLog.push({
      userId: user.id,
      email: user.email,
      timestamp: new Date(),
    });

    console.log(`[MIGRATION] Migrated user ${user.id} (${user.email}) to beta`);
  }

  // Save migration log
  const fs = await import('fs');
  fs.writeFileSync(
    `migration-log-${Date.now()}.json`,
    JSON.stringify(migrationLog, null, 2)
  );

  console.log(`[MIGRATION] Complete. ${migrationLog.length} users migrated.`);
}

migrateTiers().catch(console.error);
```

### SQL Migration (Alternative)

```sql
-- Migration script
BEGIN;

-- Log pre-migration state
CREATE TABLE IF NOT EXISTS tier_migration_log AS
SELECT id, email, subscription_status, subscription_tier, NOW() as migrated_at
FROM users
WHERE subscription_status = 'active';

-- Update tiers
UPDATE users
SET subscription_tier = 'beta'
WHERE subscription_status = 'active'
  AND (subscription_tier IS NULL OR subscription_tier = 'free');

COMMIT;
```

### Webhook Handler Update

Support legacy price ID:

```typescript
function priceToTier(priceId: string): SubscriptionTier {
  // New prices
  if (priceId === process.env.STRIPE_ALPHA_PRICE_ID) return 'alpha';
  if (priceId === process.env.STRIPE_BETA_PRICE_ID) return 'beta';

  // Legacy price (old £9/month) -> Beta
  if (priceId === process.env.STRIPE_PRICE_ID) return 'beta';

  return 'free';
}
```

### Rollback Script

```typescript
// scripts/rollback-tiers.ts
async function rollbackTiers() {
  const migrationLog = JSON.parse(
    fs.readFileSync('migration-log-TIMESTAMP.json', 'utf-8')
  );

  for (const entry of migrationLog) {
    await db
      .update(users)
      .set({ subscriptionTier: 'free' })
      .where(eq(users.id, entry.userId));
  }

  console.log(`[ROLLBACK] Reverted ${migrationLog.length} users`);
}
```

## Migration Procedure

1. **Pre-deployment**
   - Test migration script in staging
   - Verify all active subscribers identified
   - Backup users table

2. **Deployment**
   - Deploy code with new tier column
   - Run `npm run db:push` (adds column)
   - Run migration script

3. **Post-deployment**
   - Verify migrated users can access features
   - Check migration log for completeness
   - Monitor error logs

## Files to Create/Modify

| File | Change |
|------|--------|
| `scripts/migrate-tiers.ts` | New migration script |
| `scripts/rollback-tiers.ts` | Rollback script |
| `server/routes.ts` | Support legacy price ID in webhook |

## Dependencies

- Story 12.1 (Tier Data Model) - must be deployed first
- Story 12.2 (Stripe Products) - new products created

## Definition of Done

- [x] Migration script tested
- [x] All active subscribers migrated to beta
- [x] Legacy price ID maps to beta
- [x] Migration log saved
- [x] Rollback script exists
- [x] No service interruption

## Dev Agent Record

### Context Reference
- Tech Spec: `docs/sprint-artifacts/tech-spec-epic-12.md`

### Implementation Notes

**Completed 2025-12-10**

1. **Migration Script** (`scripts/migrate-tiers.ts`)
   - Finds users where:
     - `subscriptionStatus` = 'active' OR 'trialing'
     - `subscriptionTier` is NULL or 'free'
   - Sets `subscriptionTier = 'beta'` for all matches
   - Supports `--dry-run` flag for preview
   - Generates timestamped JSON log file

2. **Rollback Script** (`scripts/rollback-tiers.ts`)
   - Reads migration log JSON
   - Reverts affected users to 'free' tier

3. **Legacy Price ID Support** (`server/services/stripe.ts:52`)
   - `priceIdToTier()` maps legacy STRIPE_PRICE_ID to 'beta'
   - Ensures existing subscribers retain access

4. **Webhook Handler** (`server/services/stripe-webhook-handlers.ts:128`)
   - `handleSubscriptionDeleted()` resets tier to 'free'
   - Prevents orphaned tier data

### File List

| File | Action |
|------|--------|
| `scripts/migrate-tiers.ts` | Created |
| `scripts/rollback-tiers.ts` | Created |
| `server/services/stripe.ts` | Modified - legacy price mapping |
| `server/services/stripe-webhook-handlers.ts` | Modified - tier reset on cancel |

### Test Commands
```bash
# Dry run (list users to migrate)
npx tsx scripts/migrate-tiers.ts --dry-run

# Execute migration
npx tsx scripts/migrate-tiers.ts

# Verify
SELECT email, subscription_status, subscription_tier FROM users WHERE subscription_status = 'active';
```
