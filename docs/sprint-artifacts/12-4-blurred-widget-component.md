# Story 12.4: Blurred Widget Component

## Story Info
| Field | Value |
|-------|-------|
| **Story ID** | 12-4 |
| **Epic** | EPIC-012: Pricing Tier Restructure |
| **Title** | Blurred Widget Component |
| **Status** | Review |
| **Story Points** | 3 |
| **Priority** | P0 - Critical |

## User Story
**As a** Beta user
**I want** restricted features to appear blurred with clear upgrade messaging
**So that** I understand the value and can easily upgrade

## Acceptance Criteria

- [x] **AC-1**: Create `BlurredUpgradeOverlay` component
  - Wraps any child component with blur effect
  - Accepts feature name and optional count

- [x] **AC-2**: Gaussian blur effect applied
  - `backdrop-filter: blur(12px)`
  - Content remains partially visible

- [x] **AC-3**: Overlay positioned correctly
  - Covers entire widget area
  - Works with various widget sizes

- [x] **AC-4**: Accessible implementation
  - `aria-hidden` on blurred content
  - Screen reader announces locked state

- [x] **AC-5**: Click anywhere triggers upgrade
  - Entire overlay is clickable
  - Navigates to pricing page

## Technical Notes

### Component (client/src/components/BlurredUpgradeOverlay.tsx)

```typescript
import { ReactNode } from 'react';
import { AnimatedUpgradeCTA } from './AnimatedUpgradeCTA';

interface BlurredUpgradeOverlayProps {
  feature: 'ai-red-flags' | 'ai-key-terms' | 'ai-missing-clauses';
  count?: number;
  children: ReactNode;
}

export function BlurredUpgradeOverlay({
  feature,
  count,
  children
}: BlurredUpgradeOverlayProps) {
  const featureLabels: Record<string, string> = {
    'ai-red-flags': 'Red Flags Analysis',
    'ai-key-terms': 'Key Terms Extraction',
    'ai-missing-clauses': 'Missing Clauses Detection',
  };

  return (
    <div className="relative">
      {/* Blurred content */}
      <div
        className="blur-md select-none pointer-events-none"
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatedUpgradeCTA
          feature={featureLabels[feature]}
          count={count}
        />
      </div>
    </div>
  );
}
```

### CSS Classes

```css
.blur-md {
  filter: blur(12px);
  -webkit-filter: blur(12px);
}

/* Alternative using backdrop-filter for overlay approach */
.blur-overlay {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

## Files to Create

| File | Description |
|------|-------------|
| `client/src/components/BlurredUpgradeOverlay.tsx` | Main component |

## Dependencies

- Story 12.5 (AnimatedUpgradeCTA) - can be developed in parallel

## Definition of Done

- [x] Component renders blur effect
- [x] Overlay covers child content
- [x] Click navigates to pricing
- [x] Accessible markup
- [x] Works with all widget sizes

## Dev Agent Record

### Context Reference
- Tech Spec: `docs/sprint-artifacts/tech-spec-epic-12.md`
- Existing widgets in: `client/src/components/contracts/`

### Implementation Notes

**Completed 2025-12-10**

1. **BlurredUpgradeOverlay Component** (`client/src/components/BlurredUpgradeOverlay.tsx`)
   - Props: `feature: Feature`, `count?: number`, `children: ReactNode`
   - Uses `Feature` type from shared constants for type safety
   - `FEATURE_LABELS` map converts feature IDs to user-friendly display names

2. **Blur Effect** (Lines 31-37)
   - CSS `filter: blur(12px)` with `-webkit-filter` fallback
   - `select-none pointer-events-none` prevents interaction with blurred content
   - Content remains visible as "teaser"

3. **Overlay Positioning** (Lines 40-46)
   - `absolute inset-0` covers entire widget area
   - `flex items-center justify-center` centers AnimatedUpgradeCTA
   - Semi-transparent background `bg-white/20` with `rounded-[20px]`

4. **Accessibility** (Lines 33-34)
   - `aria-hidden="true"` on blurred content wrapper
   - Upgrade CTA remains fully keyboard accessible

### File List

| File | Action |
|------|--------|
| `client/src/components/BlurredUpgradeOverlay.tsx` | Created |

### Test Commands
```bash
npm run check
# Visual testing in browser
```
