# Story 12.6: Contract Analysis Page Tier Gating

## Story Info
| Field | Value |
|-------|-------|
| **Story ID** | 12-6 |
| **Epic** | EPIC-012: Pricing Tier Restructure |
| **Title** | Contract Analysis Page Tier Gating |
| **Status** | Review |
| **Story Points** | 5 |
| **Priority** | P0 - Critical |

## User Story
**As a** Beta user
**I want** to see available AI analysis with restricted sections clearly marked
**So that** I get value from my subscription while understanding upgrade benefits

## Acceptance Criteria

- [x] **AC-1**: Contract Summary card - Full access (Beta+)
  - No changes, available to all premium users

- [x] **AC-2**: Risk Score card - Full access (Beta+)
  - No changes, available to all premium users

- [x] **AC-3**: Red Flags card - Blurred with CTA (Alpha only)
  - Wrap with BlurredUpgradeOverlay
  - Show count teaser in overlay

- [x] **AC-4**: Key Terms card - Blurred with CTA (Alpha only)
  - Wrap with BlurredUpgradeOverlay
  - Show count teaser in overlay

- [x] **AC-5**: Missing Clauses card - Blurred with CTA (Alpha only)
  - Wrap with BlurredUpgradeOverlay
  - Show count teaser in overlay

- [x] **AC-6**: Quick Stats row shows counts
  - All counts visible
  - Clicking blurred stat scrolls to blurred section

- [~] **AC-7**: Smooth upgrade transition
  - If user upgrades mid-session, content reveals
  - ⚠️ Currently requires page refresh - cache invalidation pending

## Technical Notes

### ContractView.tsx Updates

```typescript
import { usePremium } from '../hooks/usePremium';
import { BlurredUpgradeOverlay } from '../components/BlurredUpgradeOverlay';

export default function ContractView() {
  const { canAccess } = usePremium();

  // ... existing code ...

  return (
    // ... existing JSX ...

    {/* Red Flags Card */}
    {canAccess('ai-red-flags') ? (
      <RedFlagsCard redFlags={displayAnalysis.redFlags || []} />
    ) : (
      <BlurredUpgradeOverlay
        feature="ai-red-flags"
        count={displayAnalysis.redFlags?.length}
      >
        <RedFlagsCard redFlags={displayAnalysis.redFlags || []} />
      </BlurredUpgradeOverlay>
    )}

    {/* Key Terms Card */}
    {canAccess('ai-key-terms') ? (
      <KeyTermsCard keyTerms={displayAnalysis.keyTerms || []} />
    ) : (
      <BlurredUpgradeOverlay
        feature="ai-key-terms"
        count={displayAnalysis.keyTerms?.length}
      >
        <KeyTermsCard keyTerms={displayAnalysis.keyTerms || []} />
      </BlurredUpgradeOverlay>
    )}

    {/* Missing Clauses Card */}
    {canAccess('ai-missing-clauses') ? (
      <MissingClausesCard missingClauses={displayAnalysis.missingClauses || []} />
    ) : (
      <BlurredUpgradeOverlay
        feature="ai-missing-clauses"
        count={displayAnalysis.missingClauses?.length}
      >
        <MissingClausesCard missingClauses={displayAnalysis.missingClauses || []} />
      </BlurredUpgradeOverlay>
    )}

    // ... rest of JSX ...
  );
}
```

### Quick Stats Update

Stats remain fully visible to show value:

```tsx
{/* Quick Stats Row - visible to all premium */}
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard label="Risk Score" value={riskScore} />
  <StatCard
    label="Red Flags"
    value={redFlagCount}
    locked={!canAccess('ai-red-flags')}
  />
  <StatCard
    label="Key Terms"
    value={keyTermCount}
    locked={!canAccess('ai-key-terms')}
  />
  <StatCard
    label="Missing"
    value={missingCount}
    locked={!canAccess('ai-missing-clauses')}
  />
</div>
```

## Files to Modify

| File | Change |
|------|--------|
| `client/src/pages/ContractView.tsx` | Add tier gating logic |
| `client/src/components/contracts/StatCard.tsx` | Optional locked indicator |

## Dependencies

- Story 12.3 (Premium Hook Refactor)
- Story 12.4 (Blurred Widget Component)
- Story 12.5 (Animated Upgrade CTA)

## Definition of Done

- [x] Beta users see Summary + Risk Score
- [x] Beta users see blurred Red Flags, Key Terms, Missing Clauses
- [x] Alpha users see all content
- [x] Count teasers display correctly
- [x] Free users see UpgradePrompt (existing behavior)
- [x] No visual regression for Alpha users

## Dev Agent Record

### Context Reference
- Tech Spec: `docs/sprint-artifacts/tech-spec-epic-12.md`
- ContractView: `client/src/pages/ContractView.tsx`
- Widget components: `client/src/components/contracts/`

### Implementation Notes

**Completed 2025-12-10**

1. **Imports Added** (`client/src/pages/ContractView.tsx:15,17`)
   - `BlurredUpgradeOverlay` from components
   - `usePremium` hook for tier checking

2. **Hook Integration** (Line 37)
   - Destructures `isPremium` and `canAccess` from `usePremium()`

3. **Red Flags Gating** (Lines 489-497)
   - Conditional: `canAccess('ai-red-flags')` shows card directly
   - Else: wraps `RedFlagsCard` in `BlurredUpgradeOverlay`
   - Passes `count={redFlagCount}` for teaser

4. **Key Terms Gating** (Lines 521-528)
   - Same pattern with `canAccess('ai-key-terms')`
   - Passes `count={keyTermCount}`

5. **Missing Clauses Gating** (Lines 538-544)
   - Same pattern with `canAccess('ai-missing-clauses')`
   - Passes `count={missingCount}`

6. **Quick Stats** (Lines 368-432)
   - All stats visible to all users
   - Counts extracted from `displayAnalysis` before gating

### File List

| File | Action |
|------|--------|
| `client/src/pages/ContractView.tsx` | Modified - added tier gating |

### Test Commands
```bash
npm run check
# Test as free user, beta user, alpha user
```
