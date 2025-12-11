# Epic 12: Pricing Tier Restructure (Beta & Alpha)

## Epic Overview

| Field | Value |
|-------|-------|
| **Epic ID** | EPIC-012 |
| **Title** | Pricing Tier Restructure |
| **Priority** | P0 - Critical |
| **Estimated Effort** | 4-5 days |
| **Dependencies** | EPIC-005 (Stripe Integration) |

## Description

Restructure the subscription model from a single £9/month tier into a two-tier system: **Aermuse Beta** (£9.99/month) and **Aermuse Alpha** (£19.99/month). Beta provides limited AI analysis with strategic feature gating to drive upgrades. Alpha provides full platform access.

### Tier Structure

| Feature | Free | Beta (£9.99) | Alpha (£19.99) |
|---------|------|--------------|----------------|
| Contract Storage | Limited (10) | Unlimited | Unlimited |
| Contract Templates | - | Full Access | Full Access |
| E-Signing | - | Full Access | Full Access |
| AI Summary & Risk Score | - | Full Access | Full Access |
| AI Red Flags Analysis | - | Blurred (Upgrade CTA) | Full Access |
| AI Key Terms Extraction | - | Blurred (Upgrade CTA) | Full Access |
| AI Missing Clauses | - | Blurred (Upgrade CTA) | Full Access |

## Business Value

- Increased ARPU through tiered pricing
- Clear upgrade path drives conversions
- Beta tier lowers barrier to entry
- Strategic feature gating creates urgency to upgrade
- Motion-enhanced CTAs increase engagement and conversion rates

## Acceptance Criteria

- [ ] Two subscription tiers available: Beta (£9.99) and Alpha (£19.99)
- [ ] Free tier limited to 10 contracts, no AI features
- [ ] Beta users see Contract Summary + Risk Score, other AI widgets blurred
- [ ] Blurred widgets display engaging animated upgrade CTAs
- [ ] Alpha users have full access to all features
- [ ] Existing subscribers migrated appropriately
- [ ] Pricing page reflects new tier structure
- [ ] Stripe products/prices updated

---

## User Stories

### Story 12.1: Subscription Tier Data Model Update

**As a** developer
**I want** to update the subscription data model for multiple tiers
**So that** feature access can be controlled per tier level

**Acceptance Criteria:**
- [ ] Add `subscriptionTier` field to users table (enum: 'free', 'beta', 'alpha')
- [ ] Update existing `subscription_status` handling
- [ ] Add tier-specific feature flags configuration
- [ ] Migration script for existing subscribers (map to Beta)
- [ ] API endpoints return tier information with user data

**Technical Notes:**
```sql
ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free';
-- Values: 'free', 'beta', 'alpha'
```

Update shared schema types:
```typescript
type SubscriptionTier = 'free' | 'beta' | 'alpha';

interface User {
  // existing fields...
  subscriptionTier: SubscriptionTier;
}
```

**Story Points:** 3

---

### Story 12.2: Stripe Products & Pricing Update

**As a** developer
**I want** to configure new Stripe products and prices
**So that** users can subscribe to Beta or Alpha tiers

**Acceptance Criteria:**
- [ ] Create Stripe product: "Aermuse Beta" - £9.99/month
- [ ] Create Stripe product: "Aermuse Alpha" - £19.99/month
- [ ] Archive old £9/month product (or map to Beta)
- [ ] Update webhook handler to set correct tier on subscription
- [ ] Handle tier upgrades/downgrades via Stripe
- [ ] Proration configured for mid-cycle tier changes

**Technical Notes:**
- Create products in Stripe Dashboard or via API
- Store price IDs in environment variables:
  - `STRIPE_BETA_PRICE_ID`
  - `STRIPE_ALPHA_PRICE_ID`
- Update checkout session creation to accept tier parameter

**Story Points:** 3

---

### Story 12.3: Premium Hook & Feature Gating Refactor

**As a** developer
**I want** to refactor the premium access system for tiered features
**So that** components can check specific tier access levels

**Acceptance Criteria:**
- [ ] Update `usePremium` hook to expose tier information
- [ ] Add `hasTierAccess(feature)` utility function
- [ ] Define feature-to-tier mapping configuration
- [ ] Support feature checks: `canAccessRedFlags`, `canAccessKeyTerms`, etc.
- [ ] Backwards compatible with existing `isPremium` checks

**Technical Notes:**
```typescript
// hooks/usePremium.ts
interface PremiumState {
  tier: SubscriptionTier;
  isPremium: boolean;        // beta or alpha
  isAlpha: boolean;          // alpha only
  canAccess: (feature: Feature) => boolean;
}

// Feature access matrix
const FEATURE_ACCESS: Record<Feature, SubscriptionTier[]> = {
  'contract-storage': ['free', 'beta', 'alpha'],
  'ai-summary': ['beta', 'alpha'],
  'ai-risk-score': ['beta', 'alpha'],
  'ai-red-flags': ['alpha'],
  'ai-key-terms': ['alpha'],
  'ai-missing-clauses': ['alpha'],
  'e-signing': ['beta', 'alpha'],
  'templates': ['beta', 'alpha'],
};
```

**Story Points:** 3

---

### Story 12.4: Blurred Widget Component

**As a** Beta user
**I want** restricted features to appear blurred with clear upgrade messaging
**So that** I understand the value and can easily upgrade

**Acceptance Criteria:**
- [ ] Create `BlurredUpgradeOverlay` component
- [ ] Gaussian blur effect on restricted content (blur-md: 12px)
- [ ] Content remains partially visible to show value
- [ ] Overlay positioned correctly over various widget sizes
- [ ] Accessible (screen readers announce locked state)
- [ ] Click anywhere on overlay opens upgrade flow

**Technical Notes:**
```tsx
interface BlurredUpgradeOverlayProps {
  feature: string;
  children: React.ReactNode;
  tier: 'beta' | 'alpha';
}

// CSS approach
.blur-overlay {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

**Story Points:** 3

---

### Story 12.5: Animated Upgrade CTA Component

**As a** Beta user viewing blurred content
**I want** an engaging, animated call-to-action
**So that** I'm compelled to upgrade and unlock the feature

**Acceptance Criteria:**
- [ ] Animated CTA overlays blurred widgets
- [ ] Shimmer/glow effect draws attention without being annoying
- [ ] Floating particles or subtle sparkle animation
- [ ] Pulsing unlock icon with smooth easing
- [ ] "Unlock with Alpha" button with hover state animation
- [ ] Feature-specific messaging (e.g., "See 5 Red Flags Hidden")
- [ ] Animation respects `prefers-reduced-motion`
- [ ] Mobile-responsive sizing

**Technical Notes:**
Animation concepts (creative implementation):
1. **Shimmer Border**: Gradient animation around CTA card
2. **Floating Particles**: SVG circles with CSS keyframe drift
3. **Pulse Ring**: Expanding rings from unlock icon
4. **Glassmorphism Card**: Frosted glass effect with subtle movement

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

Example SVG particle field with 6-8 floating elements.

**Story Points:** 5

---

### Story 12.6: Contract Analysis Page Tier Gating

**As a** Beta user
**I want** to see available AI analysis with restricted sections clearly marked
**So that** I get value from my subscription while understanding upgrade benefits

**Acceptance Criteria:**
- [ ] Contract Summary card: Full access (Beta+)
- [ ] Risk Score card: Full access (Beta+)
- [ ] Red Flags card: Blurred with animated CTA (Alpha only)
- [ ] Key Terms card: Blurred with animated CTA (Alpha only)
- [ ] Missing Clauses card: Blurred with animated CTA (Alpha only)
- [ ] Show count teaser on blurred cards (e.g., "5 Red Flags Found")
- [ ] Quick Stats row shows counts but links to blurred sections
- [ ] Smooth transitions when user upgrades mid-session

**Technical Notes:**
Update `ContractView.tsx`:
```tsx
const { canAccess } = usePremium();

// Wrap restricted widgets
{canAccess('ai-red-flags') ? (
  <RedFlagsCard redFlags={analysis.redFlags} />
) : (
  <BlurredUpgradeOverlay
    feature="ai-red-flags"
    count={analysis.redFlags?.length}
    tier="alpha"
  >
    <RedFlagsCard redFlags={analysis.redFlags} />
  </BlurredUpgradeOverlay>
)}
```

**Story Points:** 5

---

### Story 12.7: Pricing Page Redesign

**As a** visitor
**I want** to see clear pricing options for Beta and Alpha tiers
**So that** I can choose the right plan for my needs

**Acceptance Criteria:**
- [ ] Three-column pricing layout (Free, Beta, Alpha)
- [ ] Alpha tier visually emphasized as "best value" or "recommended"
- [ ] Feature comparison checklist for each tier
- [ ] Clear pricing: Free, £9.99/mo, £19.99/mo
- [ ] Annual pricing option with discount (stretch)
- [ ] Animated elements consistent with brand
- [ ] Mobile-responsive stacked layout
- [ ] CTAs: "Get Started Free", "Start Beta", "Go Alpha"
- [ ] Current plan highlighted for logged-in users

**Technical Notes:**
- Update `/pricing` page component
- Add tier comparison data structure
- Integrate with Stripe Checkout for tier selection

**Story Points:** 5

---

### Story 12.8: Upgrade Flow & Tier Switching

**As a** Beta subscriber
**I want** to easily upgrade to Alpha
**So that** I can access all features

**Acceptance Criteria:**
- [ ] "Upgrade to Alpha" button in billing dashboard
- [ ] Upgrade from blurred widget CTAs
- [ ] Stripe handles proration automatically
- [ ] Immediate feature unlock on successful upgrade
- [ ] Downgrade option available (takes effect next billing cycle)
- [ ] Confirmation modal before tier changes
- [ ] Email notification on tier change

**Technical Notes:**
- Use Stripe Subscription Update API
- Handle `customer.subscription.updated` webhook for tier changes
- Update user's `subscriptionTier` in database on webhook

**Story Points:** 3

---

### Story 12.9: Free Tier Contract Limit Enforcement

**As a** platform operator
**I want** free users limited to 10 contracts
**So that** they're incentivized to subscribe

**Acceptance Criteria:**
- [ ] Free users can store up to 10 contracts
- [ ] Counter displayed: "3 of 10 contracts used"
- [ ] Soft limit warning at 8 contracts
- [ ] Hard limit at 10 with upgrade prompt
- [ ] Upload blocked with friendly message when limit reached
- [ ] Limit removed for Beta/Alpha subscribers

**Technical Notes:**
- Add contract count check before upload
- Query: `SELECT COUNT(*) FROM contracts WHERE user_id = ?`
- Constants: `FREE_TIER_CONTRACT_LIMIT = 10`

**Story Points:** 2

---

### Story 12.10: Existing Subscriber Migration

**As a** platform operator
**I want** existing £9/month subscribers migrated to appropriate tiers
**So that** the transition is seamless

**Acceptance Criteria:**
- [ ] Existing £9/month subscribers mapped to Beta tier
- [ ] No service interruption during migration
- [ ] Communication email sent explaining changes
- [ ] Option to upgrade to Alpha with prorated billing
- [ ] Migration script tested in staging first
- [ ] Rollback plan documented

**Technical Notes:**
```sql
-- Migration script
UPDATE users
SET subscription_tier = 'beta'
WHERE subscription_status = 'active'
  AND subscription_tier IS NULL;
```

- Run during low-traffic window
- Log all migrations for audit

**Story Points:** 2

---

## Total Story Points: 34

## Definition of Done

- [ ] Both tiers purchasable via Stripe Checkout
- [ ] Feature gating works correctly per tier
- [ ] Blur effect + animations render on all supported browsers
- [ ] Upgrade flow tested end-to-end
- [ ] Existing subscribers migrated without issues
- [ ] Pricing page reflects new structure
- [ ] Analytics tracking tier conversions
- [ ] Mobile experience verified

---

## Technical Architecture Notes

### Component Hierarchy
```
ContractView.tsx
├── ContractSummary.tsx (Beta+)
├── RiskScoreCard.tsx (Beta+)
├── BlurredUpgradeOverlay.tsx
│   ├── AnimatedUpgradeCTA.tsx
│   └── RedFlagsCard.tsx (Alpha)
├── BlurredUpgradeOverlay.tsx
│   ├── AnimatedUpgradeCTA.tsx
│   └── KeyTermsCard.tsx (Alpha)
└── BlurredUpgradeOverlay.tsx
    ├── AnimatedUpgradeCTA.tsx
    └── MissingClausesCard.tsx (Alpha)
```

### Animation Specifications

**Shimmer Effect:**
- Duration: 2.5s
- Timing: ease-in-out, infinite
- Gradient: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`

**Floating Particles:**
- Count: 6-8 SVG circles
- Size: 4-8px, varying opacity
- Animation: Float with slight rotation, staggered delays
- Colors: Brand burgundy (#660033) at 20-40% opacity

**Pulse Ring:**
- Origin: Unlock icon center
- Scale: 1 → 1.5
- Opacity: 0.8 → 0
- Duration: 1.5s, infinite

**Reduced Motion:**
```css
@media (prefers-reduced-motion: reduce) {
  .animated-cta * {
    animation: none !important;
    transition: opacity 0.2s ease !important;
  }
}
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing subscriber confusion | Medium | Clear communication, FAQ page |
| Animation performance on mobile | Low | GPU-accelerated properties only, reduced-motion support |
| Stripe proration complexity | Medium | Test thoroughly in Stripe test mode |
| Feature access bugs | High | Comprehensive test coverage for tier matrix |
