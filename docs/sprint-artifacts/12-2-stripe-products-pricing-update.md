# Story 12.2: Stripe Products & Pricing Update

## Story Info
| Field | Value |
|-------|-------|
| **Story ID** | 12-2 |
| **Epic** | EPIC-012: Pricing Tier Restructure |
| **Title** | Stripe Products & Pricing Update |
| **Status** | Review |
| **Story Points** | 3 |
| **Priority** | P0 - Critical |

## User Story
**As a** developer
**I want** to configure new Stripe products and prices
**So that** users can subscribe to Beta or Alpha tiers

## Acceptance Criteria

- [x] **AC-1**: Create Stripe products
  - "Aermuse Beta" - £9.99/month
  - "Aermuse Alpha" - £19.99/month

- [x] **AC-2**: Environment variables configured
  - `STRIPE_BETA_PRICE_ID`
  - `STRIPE_ALPHA_PRICE_ID`

- [x] **AC-3**: Checkout session accepts tier parameter
  ```typescript
  POST /api/subscriptions/create-checkout
  { "tier": "beta" | "alpha" }
  ```

- [x] **AC-4**: Webhook handler maps price to tier
  - On `checkout.session.completed`: set user tier based on price
  - On `customer.subscription.updated`: update tier if price changed

- [x] **AC-5**: Proration enabled for tier changes
  - Mid-cycle upgrades prorated automatically

## Technical Notes

### Stripe Dashboard Setup

1. Create Product: "Aermuse Beta"
   - Price: £9.99/month recurring
   - Copy Price ID to env

2. Create Product: "Aermuse Alpha"
   - Price: £19.99/month recurring
   - Copy Price ID to env

### Checkout Session Update (server/services/stripe.ts)

```typescript
export async function createCheckoutSession(userId: string, tier: 'beta' | 'alpha') {
  const priceId = tier === 'alpha'
    ? process.env.STRIPE_ALPHA_PRICE_ID
    : process.env.STRIPE_BETA_PRICE_ID;

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${BASE_URL}/dashboard?subscription=success`,
    cancel_url: `${BASE_URL}/pricing`,
    metadata: { userId, tier },
  });
}
```

### Webhook Handler Update

```typescript
// Map price ID to tier
function priceToTier(priceId: string): SubscriptionTier {
  if (priceId === process.env.STRIPE_ALPHA_PRICE_ID) return 'alpha';
  if (priceId === process.env.STRIPE_BETA_PRICE_ID) return 'beta';
  return 'free';
}
```

## Files to Modify

| File | Change |
|------|--------|
| `.env` | Add STRIPE_BETA_PRICE_ID, STRIPE_ALPHA_PRICE_ID |
| `server/services/stripe.ts` | Update checkout session creation |
| `server/routes.ts` | Accept tier in checkout endpoint |
| `server/routes.ts` | Update webhook handler for tier mapping |

## Dependencies

- Story 12.1 (Subscription Tier Data Model)

## Definition of Done

- [x] Both Stripe products created
- [x] Price IDs in environment variables
- [x] Checkout creates correct subscription
- [x] Webhook sets correct tier
- [x] Test mode transactions verified

## Dev Agent Record

### Context Reference
- Tech Spec: `docs/sprint-artifacts/tech-spec-epic-12.md`
- Existing Stripe: `server/services/stripe.ts`

### Implementation Notes

**Completed 2025-12-10**

1. **Stripe Configuration** (`server/services/stripe.ts:10-11,36-37`)
   - Added `STRIPE_BETA_PRICE_ID` and `STRIPE_ALPHA_PRICE_ID` environment variable support
   - Added `betaPriceId` and `alphaPriceId` to stripeConfig

2. **Price-to-Tier Mapping** (`server/services/stripe.ts:47-64`)
   - `priceIdToTier()`: Maps price ID to tier ('free', 'beta', 'alpha')
   - `tierToPriceId()`: Maps tier to Stripe price ID
   - Legacy price ID maps to 'beta' for backwards compatibility

3. **Checkout Session** (`server/services/stripe.ts:124-176`)
   - `createCheckoutSession()` accepts optional `tier` parameter (defaults to 'beta')
   - Tier stored in session and subscription metadata

4. **Billing Endpoint** (`server/routes.ts:1716-1777`)
   - `POST /api/billing/checkout` accepts `{ tier: 'beta' | 'alpha' }` in request body
   - Validates tier parameter before creating checkout session

5. **Webhook Handler** (`server/services/stripe-webhook-handlers.ts:185-206`)
   - `buildSubscriptionUpdate()` determines tier from metadata or price ID
   - `handleSubscriptionUpdated()` sets correct tier on subscription changes
   - `handleSubscriptionDeleted()` resets tier to 'free'

### File List

| File | Action |
|------|--------|
| `server/services/stripe.ts` | Modified - tier config and mapping functions |
| `server/services/stripe-webhook-handlers.ts` | Modified - tier handling in webhooks |
| `server/routes.ts` | Modified - checkout accepts tier |

### Test Commands
```bash
# Test checkout flow in Stripe test mode
# Use test card: 4242 4242 4242 4242
```
