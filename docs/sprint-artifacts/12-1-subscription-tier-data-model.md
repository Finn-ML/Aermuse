# Story 12.1: Subscription Tier Data Model Update

## Story Info
| Field | Value |
|-------|-------|
| **Story ID** | 12-1 |
| **Epic** | EPIC-012: Pricing Tier Restructure |
| **Title** | Subscription Tier Data Model Update |
| **Status** | Review |
| **Story Points** | 3 |
| **Priority** | P0 - Critical |

## User Story
**As a** developer
**I want** to update the subscription data model for multiple tiers
**So that** feature access can be controlled per tier level

## Acceptance Criteria

- [x] **AC-1**: Add `subscription_tier` column to users table
  - Type: TEXT
  - Default: 'free'
  - Values: 'free', 'beta', 'alpha'

- [x] **AC-2**: Update shared schema types
  ```typescript
  type SubscriptionTier = 'free' | 'beta' | 'alpha';
  ```

- [x] **AC-3**: Add tier-specific constants file
  - `FREE_TIER_CONTRACT_LIMIT = 10`
  - Feature access matrix configuration

- [x] **AC-4**: API endpoints return tier information
  - GET /api/user includes `subscriptionTier`
  - Auth context exposes tier to frontend

- [x] **AC-5**: TypeScript types updated across codebase
  - User type includes `subscriptionTier`
  - InsertUser schema updated

## Technical Notes

### Database Migration

```sql
ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free';
```

### Schema Update (shared/schema.ts)

```typescript
// Add to users table definition
subscriptionTier: text("subscription_tier").default("free"),

// Add type export
export type SubscriptionTier = 'free' | 'beta' | 'alpha';
```

### Constants File (shared/constants/tiers.ts)

```typescript
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BETA: 'beta',
  ALPHA: 'alpha',
} as const;

export const FREE_TIER_CONTRACT_LIMIT = 10;

export const TIER_FEATURES = {
  free: ['contract-storage'],
  beta: ['contract-storage', 'ai-summary', 'ai-risk-score', 'e-signing', 'templates'],
  alpha: ['contract-storage', 'ai-summary', 'ai-risk-score', 'ai-red-flags', 'ai-key-terms', 'ai-missing-clauses', 'e-signing', 'templates'],
} as const;
```

## Files to Modify

| File | Change |
|------|--------|
| `shared/schema.ts` | Add subscriptionTier column |
| `shared/constants/tiers.ts` | New file - tier constants |
| `server/routes.ts` | Include tier in user response |
| `client/src/lib/auth.ts` | Expose tier in auth context |

## Dependencies

- None (first story in epic)

## Definition of Done

- [x] Database column added via migration
- [x] Schema types compile without errors
- [x] API returns tier information
- [x] Frontend can access user tier
- [x] Unit tests for tier constants

## Dev Agent Record

### Context Reference
- Tech Spec: `docs/sprint-artifacts/tech-spec-epic-12.md`
- Architecture: `docs/architecture.md`
- Schema: `shared/schema.ts`

### Implementation Notes

**Completed 2025-12-09**

1. **Schema Update** (`shared/schema.ts:7-8, 33-34`)
   - Added `SubscriptionTier` type export: `'free' | 'beta' | 'alpha'`
   - Added `subscriptionTier` column to users table with default 'free'
   - Extended insertUserSchema with zod enum validation for subscriptionTier

2. **Tier Constants** (`shared/constants/tiers.ts` - NEW FILE)
   - `SUBSCRIPTION_TIERS` constant object
   - `FREE_TIER_CONTRACT_LIMIT = 10`
   - `TIER_FEATURES` feature access matrix
   - `TIER_HIERARCHY` for tier comparison
   - `canAccessFeature()` and `isAtLeastTier()` utility functions

3. **Frontend Hook** (`client/src/hooks/usePremium.ts`)
   - Refactored to expose `tier`, `isPremium`, `isAlpha`, and `canAccess(feature)`
   - Backwards compatible - `isPremium` still works for existing code
   - Imports and uses shared tier constants

4. **API** - No changes needed. `/api/auth/me` already returns full user object which now includes `subscriptionTier` field automatically.

5. **Unit Tests** (`shared/__tests__/tiers.test.ts` - NEW FILE)
   - 17 tests covering all tier constants and utility functions
   - All tests passing

### Debug Log
- db:push successful - column added to production schema
- npm run check passes (0 errors)
- Pre-existing test failures (8) unrelated to this story (FontSelector count, PDF extraction mocks)

### Test Commands
```bash
npm run db:push
npm run check
npm test -- shared/__tests__/tiers.test.ts
```

## File List

| File | Action |
|------|--------|
| `shared/schema.ts` | Modified - added SubscriptionTier type and column |
| `shared/constants/tiers.ts` | Created - tier constants and feature matrix |
| `client/src/hooks/usePremium.ts` | Modified - tier-aware premium hook |
| `shared/__tests__/tiers.test.ts` | Created - unit tests for tier constants |

## Change Log

| Date | Change |
|------|--------|
| 2025-12-09 | Story implementation complete - all ACs satisfied |
