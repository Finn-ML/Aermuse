# Technical Specification: Epic 12 - Pricing Tier Restructure

## Overview

Transform single-tier subscription (£9/month) into two-tier system: **Aermuse Beta** (£9.99/month) and **Aermuse Alpha** (£19.99/month) with feature-gated AI analysis and animated upgrade CTAs.

## Architecture Impact

### Database Changes

```sql
-- Add subscription tier column
ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free';
-- Values: 'free', 'beta', 'alpha'

-- Migrate existing subscribers to beta
UPDATE users
SET subscription_tier = 'beta'
WHERE subscription_status = 'active';
```

### Schema Update (shared/schema.ts)

```typescript
// Add to users table
subscriptionTier: text("subscription_tier").default("free"), // 'free' | 'beta' | 'alpha'
```

### Feature Access Matrix

| Feature | Free | Beta | Alpha |
|---------|:----:|:----:|:-----:|
| Contract Storage | 10 max | Unlimited | Unlimited |
| Templates | - | Yes | Yes |
| E-Signing | - | Yes | Yes |
| AI Summary | - | Yes | Yes |
| AI Risk Score | - | Yes | Yes |
| AI Red Flags | - | Blurred | Yes |
| AI Key Terms | - | Blurred | Yes |
| AI Missing Clauses | - | Blurred | Yes |

## New Components

### 1. BlurredUpgradeOverlay

Location: `client/src/components/BlurredUpgradeOverlay.tsx`

```typescript
interface BlurredUpgradeOverlayProps {
  feature: 'ai-red-flags' | 'ai-key-terms' | 'ai-missing-clauses';
  count?: number;
  children: React.ReactNode;
}
```

### 2. AnimatedUpgradeCTA

Location: `client/src/components/AnimatedUpgradeCTA.tsx`

Features:
- Shimmer border animation (2.5s, infinite)
- Floating particle SVGs (6-8 circles)
- Pulsing unlock icon with rings
- Glassmorphism card effect
- `prefers-reduced-motion` support

### 3. Updated usePremium Hook

```typescript
interface PremiumState {
  tier: 'free' | 'beta' | 'alpha';
  isPremium: boolean;      // beta or alpha
  isAlpha: boolean;        // alpha only
  canAccess: (feature: Feature) => boolean;
}

type Feature =
  | 'contract-storage'
  | 'ai-summary'
  | 'ai-risk-score'
  | 'ai-red-flags'
  | 'ai-key-terms'
  | 'ai-missing-clauses'
  | 'e-signing'
  | 'templates';
```

## Stripe Configuration

### Products & Prices

| Product | Price ID (env var) | Amount |
|---------|-------------------|--------|
| Aermuse Beta | `STRIPE_BETA_PRICE_ID` | £9.99/month |
| Aermuse Alpha | `STRIPE_ALPHA_PRICE_ID` | £19.99/month |

### Webhook Updates

Handle `customer.subscription.updated` to detect:
- Tier changes (upgrade/downgrade)
- Map price ID to tier in database

## API Changes

### GET /api/user

Response includes:
```json
{
  "user": {
    "subscriptionTier": "beta",
    "subscriptionStatus": "active"
  }
}
```

### POST /api/subscriptions/create-checkout

Request includes tier selection:
```json
{
  "tier": "beta" | "alpha"
}
```

### POST /api/subscriptions/upgrade

New endpoint for tier upgrades:
```json
{
  "targetTier": "alpha"
}
```

## UI Changes

### ContractView.tsx Updates

```tsx
// Wrap restricted widgets
{canAccess('ai-red-flags') ? (
  <RedFlagsCard redFlags={analysis.redFlags} />
) : (
  <BlurredUpgradeOverlay feature="ai-red-flags" count={analysis.redFlags?.length}>
    <RedFlagsCard redFlags={analysis.redFlags} />
  </BlurredUpgradeOverlay>
)}
```

### Pricing.tsx Updates

- Three-column layout (Free, Beta, Alpha)
- Alpha tier highlighted as recommended
- Feature comparison checklist
- Tier-aware CTAs for logged-in users

## Animation Specifications

### CSS Keyframes

```css
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(5deg); }
}

@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .animated-cta * {
    animation: none !important;
    transition: opacity 0.2s ease !important;
  }
}
```

## Migration Strategy

1. Add `subscription_tier` column with default 'free'
2. Run migration: existing active subscribers → 'beta'
3. Deploy code with new tier logic
4. Create Stripe products/prices
5. Update webhook handler
6. Deploy pricing page redesign

## Testing Requirements

- [ ] Tier access control for all features
- [ ] Blur effect renders correctly
- [ ] Animations work and respect reduced motion
- [ ] Stripe checkout creates correct tier
- [ ] Upgrade flow with proration
- [ ] Free tier contract limit (10)
- [ ] Existing subscriber migration

## Environment Variables

```bash
# New variables
STRIPE_BETA_PRICE_ID=price_xxx
STRIPE_ALPHA_PRICE_ID=price_xxx

# Update existing (for migration)
STRIPE_PRICE_ID=price_xxx  # Keep for backwards compatibility
```

---
*Epic: EPIC-012 | Stories: 10 | Points: 34*
