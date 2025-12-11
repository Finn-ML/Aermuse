# Story 12.7: Pricing Page Redesign

## Story Info
| Field | Value |
|-------|-------|
| **Story ID** | 12-7 |
| **Epic** | EPIC-012: Pricing Tier Restructure |
| **Title** | Pricing Page Redesign |
| **Status** | Review |
| **Story Points** | 5 |
| **Priority** | P0 - Critical |

## User Story
**As a** visitor
**I want** to see clear pricing options for Beta and Alpha tiers
**So that** I can choose the right plan for my needs

## Acceptance Criteria

- [x] **AC-1**: Three-column pricing layout
  - Free, Beta (£9.99), Alpha (£19.99)
  - Responsive: stacked on mobile

- [x] **AC-2**: Alpha tier visually emphasized
  - "Recommended" badge
  - Highlighted border/background

- [x] **AC-3**: Feature comparison checklist
  - Checkmarks for included features
  - Clear indication of tier differences

- [x] **AC-4**: Tier-aware CTAs
  - Logged out: "Get Started Free", "Start Beta", "Go Alpha"
  - Logged in (free): "Current Plan", "Upgrade", "Upgrade"
  - Logged in (beta): Disabled, "Current Plan", "Upgrade"
  - Logged in (alpha): Disabled, Disabled, "Current Plan"

- [x] **AC-5**: Mobile responsive
  - Stacked cards on small screens
  - Touch-friendly buttons

## Technical Notes

### Tier Data Structure

```typescript
const PRICING_TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: '£0',
    period: 'forever',
    description: 'Get started with basic features',
    features: [
      { text: 'Up to 10 contracts', included: true },
      { text: 'Contract templates', included: false },
      { text: 'E-signing', included: false },
      { text: 'AI Summary & Risk Score', included: false },
      { text: 'AI Red Flags Analysis', included: false },
      { text: 'AI Key Terms & Missing Clauses', included: false },
    ],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    id: 'beta',
    name: 'Aermuse Beta',
    price: '£9.99',
    period: '/month',
    description: 'Essential tools for artists',
    features: [
      { text: 'Unlimited contracts', included: true },
      { text: 'Contract templates', included: true },
      { text: 'E-signing', included: true },
      { text: 'AI Summary & Risk Score', included: true },
      { text: 'AI Red Flags Analysis', included: false, teaser: 'Alpha only' },
      { text: 'AI Key Terms & Missing Clauses', included: false, teaser: 'Alpha only' },
    ],
    cta: 'Start Beta',
    highlighted: false,
  },
  {
    id: 'alpha',
    name: 'Aermuse Alpha',
    price: '£19.99',
    period: '/month',
    description: 'Complete contract intelligence',
    features: [
      { text: 'Unlimited contracts', included: true },
      { text: 'Contract templates', included: true },
      { text: 'E-signing', included: true },
      { text: 'AI Summary & Risk Score', included: true },
      { text: 'AI Red Flags Analysis', included: true },
      { text: 'AI Key Terms & Missing Clauses', included: true },
    ],
    cta: 'Go Alpha',
    highlighted: true,
    badge: 'Recommended',
  },
];
```

### Page Component Structure

```tsx
export default function Pricing() {
  const { tier, isPremium } = usePremium();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F7E6CA]">
      <GrainOverlay />

      <div className="max-w-6xl mx-auto py-16 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#660033] mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-[#660033]/70">
            Protect your music career with AI-powered contract analysis
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {PRICING_TIERS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              currentTier={tier}
              isLoggedIn={!!user}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

### PricingCard Component

```tsx
function PricingCard({ plan, currentTier, isLoggedIn }) {
  const isCurrentPlan = currentTier === plan.id;
  const canUpgrade = !isCurrentPlan && tierOrder[plan.id] > tierOrder[currentTier];

  return (
    <div className={`
      rounded-2xl p-6
      ${plan.highlighted
        ? 'bg-gradient-to-br from-[#660033] to-[#8B0045] text-[#F7E6CA] ring-4 ring-[#D4AF37]'
        : 'bg-white/80 text-[#660033]'
      }
    `}>
      {plan.badge && (
        <span className="inline-block px-3 py-1 bg-[#D4AF37] text-[#660033] text-xs font-bold rounded-full mb-4">
          {plan.badge}
        </span>
      )}

      <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-4xl font-bold">{plan.price}</span>
        <span className="text-sm opacity-70">{plan.period}</span>
      </div>

      <p className="text-sm opacity-80 mb-6">{plan.description}</p>

      <ul className="space-y-3 mb-8">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            {feature.included ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 opacity-30" />
            )}
            <span className={feature.included ? '' : 'opacity-50'}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <CTAButton
        plan={plan}
        isCurrentPlan={isCurrentPlan}
        canUpgrade={canUpgrade}
        isLoggedIn={isLoggedIn}
      />
    </div>
  );
}
```

## Files to Modify

| File | Change |
|------|--------|
| `client/src/pages/Pricing.tsx` | Complete redesign |

## Dependencies

- Story 12.2 (Stripe Products) - for checkout integration
- Story 12.3 (Premium Hook) - for tier detection

## Definition of Done

- [x] Three-tier layout renders correctly
- [x] Alpha tier visually emphasized
- [x] Feature checklist accurate
- [x] CTAs work for all user states
- [x] Mobile responsive
- [x] Checkout flow works for both tiers

## Dev Agent Record

### Context Reference
- Tech Spec: `docs/sprint-artifacts/tech-spec-epic-12.md`
- Existing page: `client/src/pages/Pricing.tsx`
- Brand colors: #660033, #F7E6CA, #D4AF37

### Implementation Notes

**Completed 2025-12-10**

1. **Data Structure** (`client/src/pages/Pricing.tsx:28-81`)
   - `PRICING_TIERS` array with Free, Beta, Alpha configs
   - Each tier has: id, name, price, period, description, features, cta, highlighted, badge

2. **PricingCard Component** (Lines 91-183)
   - Uses `TIER_HIERARCHY` from shared constants for tier comparison
   - `isCurrentPlan`: current tier matches card tier
   - `canUpgrade`: user can upgrade to this tier
   - Dynamic CTA text via `getButtonText()`

3. **Alpha Emphasis** (Lines 79, 117-118)
   - `highlighted: true` triggers gradient background
   - `badge: 'Recommended'` displays gold badge
   - `ring-4 ring-[#D4AF37]` gold ring accent
   - `scale-105` makes Alpha card slightly larger

4. **Feature Checklist** (Lines 139-157)
   - Green checkmark for included features
   - Gray X for excluded features
   - `teaser` property shows "(Alpha only)" hint

5. **Checkout Integration** (Lines 191-222)
   - `handleSubscribe(targetTier)` calls `/api/billing/checkout`
   - Passes tier in request body
   - Redirects to Stripe Checkout URL

### File List

| File | Action |
|------|--------|
| `client/src/pages/Pricing.tsx` | Complete redesign |

### Test Commands
```bash
npm run check
# Visual testing across breakpoints
# Test checkout flow
```
