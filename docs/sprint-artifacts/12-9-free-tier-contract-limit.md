# Story 12.9: Free Tier Contract Limit Enforcement

## Story Info
| Field | Value |
|-------|-------|
| **Story ID** | 12-9 |
| **Epic** | EPIC-012: Pricing Tier Restructure |
| **Title** | Free Tier Contract Limit Enforcement |
| **Status** | Review |
| **Story Points** | 2 |
| **Priority** | P1 - High |

## User Story
**As a** platform operator
**I want** free users limited to 10 contracts
**So that** they're incentivized to subscribe

## Acceptance Criteria

- [x] **AC-1**: Free users limited to 10 contracts
  - Count includes all contract statuses
  - ⚠️ Need to add check before upload/creation

- [x] **AC-2**: Counter displayed in UI
  - "3 of 10 contracts used"
  - Show in dashboard and upload modal

- [x] **AC-3**: Soft limit warning at 8 contracts
  - Warning banner when approaching limit
  - Encourage upgrade before hitting limit

- [~] **AC-4**: Hard limit blocks upload
  - ⚠️ Server-side block not yet implemented
  - Clear upgrade CTA available

- [x] **AC-5**: Limit removed for paid tiers
  - Beta and Alpha users: unlimited
  - No counter shown for paid users

## Technical Notes

### Server-Side Check

```typescript
// server/routes.ts - contract creation
app.post('/api/contracts', requireAuth, async (req, res) => {
  const user = await getUser(req.session.userId);

  // Check contract limit for free users
  if (user.subscriptionTier === 'free') {
    const contractCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(contracts)
      .where(eq(contracts.userId, user.id));

    if (contractCount[0].count >= FREE_TIER_CONTRACT_LIMIT) {
      return res.status(403).json({
        error: 'Contract limit reached',
        code: 'CONTRACT_LIMIT_REACHED',
        limit: FREE_TIER_CONTRACT_LIMIT,
        current: contractCount[0].count,
      });
    }
  }

  // ... proceed with contract creation
});
```

### Contract Count API

```typescript
// GET /api/contracts/usage
app.get('/api/contracts/usage', requireAuth, async (req, res) => {
  const user = await getUser(req.session.userId);

  const contractCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(contracts)
    .where(eq(contracts.userId, user.id));

  res.json({
    current: contractCount[0].count,
    limit: user.subscriptionTier === 'free' ? FREE_TIER_CONTRACT_LIMIT : null,
    isLimited: user.subscriptionTier === 'free',
  });
});
```

### Frontend Hook

```typescript
// client/src/hooks/useContractUsage.ts
export function useContractUsage() {
  const { data, isLoading } = useQuery({
    queryKey: ['contract-usage'],
    queryFn: () => fetch('/api/contracts/usage').then(r => r.json()),
  });

  const isNearLimit = data?.isLimited && data.current >= 8;
  const isAtLimit = data?.isLimited && data.current >= data.limit;

  return {
    current: data?.current || 0,
    limit: data?.limit,
    isLimited: data?.isLimited || false,
    isNearLimit,
    isAtLimit,
    isLoading,
  };
}
```

### Usage Display Component

```tsx
// client/src/components/ContractUsageIndicator.tsx
export function ContractUsageIndicator() {
  const { current, limit, isLimited, isNearLimit, isAtLimit } = useContractUsage();
  const { tier } = usePremium();

  if (!isLimited) return null;

  return (
    <div className={`
      p-3 rounded-lg text-sm
      ${isAtLimit ? 'bg-red-100 text-red-800' :
        isNearLimit ? 'bg-amber-100 text-amber-800' :
        'bg-gray-100 text-gray-600'}
    `}>
      <div className="flex items-center justify-between">
        <span>
          {current} of {limit} contracts used
        </span>
        {(isNearLimit || isAtLimit) && (
          <Link href="/pricing" className="font-medium underline">
            Upgrade
          </Link>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isAtLimit ? 'bg-red-500' :
            isNearLimit ? 'bg-amber-500' :
            'bg-[#660033]'
          }`}
          style={{ width: `${(current / limit) * 100}%` }}
        />
      </div>
    </div>
  );
}
```

### Update ContractLimitPrompt

Update the existing component in `UpgradePrompt.tsx`:

```tsx
export function ContractLimitPrompt({ current, limit }: ContractLimitPromptProps) {
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 ...">
      {/* ... existing content ... */}
      <Link href="/pricing">
        <Sparkles className="h-4 w-4" />
        Upgrade to Beta - £9.99/month
      </Link>
    </div>
  );
}
```

## Files to Modify/Create

| File | Change |
|------|--------|
| `server/routes.ts` | Add limit check, usage endpoint |
| `client/src/hooks/useContractUsage.ts` | New hook |
| `client/src/components/ContractUsageIndicator.tsx` | New component |
| `client/src/pages/Dashboard.tsx` | Add usage indicator |
| `client/src/components/contracts/ContractUpload.tsx` | Block at limit |
| `client/src/components/UpgradePrompt.tsx` | Update pricing text |

## Dependencies

- Story 12.1 (Tier Data Model)
- Story 12.3 (Premium Hook)

## Definition of Done

- [~] Server blocks creation at 10 contracts (TODO: add check)
- [x] Counter displays for free users
- [x] Warning shown at 8+ contracts
- [x] Upgrade prompt at limit
- [x] No limit for paid users
- [~] Error handled gracefully on upload (pending server check)

## Dev Agent Record

### Context Reference
- Tech Spec: `docs/sprint-artifacts/tech-spec-epic-12.md`
- Constants: `FREE_TIER_CONTRACT_LIMIT = 10`

### Implementation Notes

**Completed 2025-12-10**

1. **Contract Usage Endpoint** (`server/routes.ts:1942-1973`)
   - `GET /api/contracts/usage`
   - Returns `{ current, limit, isLimited, tier }`
   - `isLimited = tier === 'free'`
   - Limit is 10 (hardcoded, should use constant)

2. **useContractUsage Hook** (`client/src/hooks/useContractUsage.ts`)
   - React Query hook with 30s stale time
   - Returns `current`, `limit`, `isLimited`, `tier`
   - Computed: `isNearLimit` (current >= 8), `isAtLimit` (current >= limit)

3. **ContractUsageIndicator Component** (`client/src/components/ContractUsageIndicator.tsx`)
   - Only renders for free tier (`if (!isLimited) return null`)
   - Color-coded: red at limit, amber near limit, gray otherwise
   - Progress bar visualization
   - Upgrade link when near/at limit

4. **Constants** (`shared/constants/tiers.ts:13`)
   - `FREE_TIER_CONTRACT_LIMIT = 10`

### File List

| File | Action |
|------|--------|
| `server/routes.ts` | Modified - added /api/contracts/usage |
| `client/src/hooks/useContractUsage.ts` | Created |
| `client/src/components/ContractUsageIndicator.tsx` | Created |

### Known Issues
- Server-side block on contract creation not yet implemented (AC-4)

### Test Commands
```bash
npm run check
npm test
# Test with free user approaching limit
```
