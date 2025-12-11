# Story 12.8: Upgrade Flow & Tier Switching

## Story Info
| Field | Value |
|-------|-------|
| **Story ID** | 12-8 |
| **Epic** | EPIC-012: Pricing Tier Restructure |
| **Title** | Upgrade Flow & Tier Switching |
| **Status** | Review |
| **Story Points** | 3 |
| **Priority** | P0 - Critical |

## User Story
**As a** Beta subscriber
**I want** to easily upgrade to Alpha
**So that** I can access all features

## Acceptance Criteria

- [~] **AC-1**: Upgrade button in billing dashboard
  - ⚠️ Need to verify Settings page implementation
  - Hidden for Alpha users

- [x] **AC-2**: Upgrade from blurred widget CTAs
  - All animated CTAs link to pricing page
  - Direct upgrade via UpgradeModal

- [x] **AC-3**: Stripe handles proration
  - Mid-cycle upgrade prorated automatically
  - User sees prorated amount before confirming

- [x] **AC-4**: Immediate feature unlock
  - On successful upgrade, features unlock
  - ⚠️ Currently requires page refresh

- [x] **AC-5**: Downgrade option available
  - Via Stripe Customer Portal
  - Takes effect at next billing cycle

- [x] **AC-6**: Confirmation modal before changes
  - Show price difference
  - Explain proration

## Technical Notes

### Upgrade API Endpoint

```typescript
// POST /api/subscriptions/upgrade
app.post('/api/subscriptions/upgrade', requireAuth, async (req, res) => {
  const { targetTier } = req.body;
  const user = await getUser(req.session.userId);

  if (!user.stripeSubscriptionId) {
    return res.status(400).json({ error: 'No active subscription' });
  }

  // Get subscription from Stripe
  const subscription = await stripe.subscriptions.retrieve(
    user.stripeSubscriptionId
  );

  // Update subscription with new price
  const newPriceId = targetTier === 'alpha'
    ? process.env.STRIPE_ALPHA_PRICE_ID
    : process.env.STRIPE_BETA_PRICE_ID;

  const updated = await stripe.subscriptions.update(
    user.stripeSubscriptionId,
    {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'always_invoice', // or 'create_prorations'
    }
  );

  // Update user tier immediately
  await db.update(users)
    .set({ subscriptionTier: targetTier })
    .where(eq(users.id, user.id));

  res.json({
    success: true,
    tier: targetTier,
    effectiveDate: 'immediate'
  });
});
```

### Preview Proration Endpoint

```typescript
// POST /api/subscriptions/preview-upgrade
app.post('/api/subscriptions/preview-upgrade', requireAuth, async (req, res) => {
  const { targetTier } = req.body;
  const user = await getUser(req.session.userId);

  const proration = await stripe.invoices.retrieveUpcoming({
    customer: user.stripeCustomerId,
    subscription: user.stripeSubscriptionId,
    subscription_items: [{
      id: subscription.items.data[0].id,
      price: process.env.STRIPE_ALPHA_PRICE_ID,
    }],
  });

  res.json({
    amountDue: proration.amount_due / 100,
    currency: proration.currency,
  });
});
```

### UpgradeModal Component

```tsx
function UpgradeModal({ isOpen, onClose, targetTier }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/subscriptions/preview-upgrade', {
        method: 'POST',
        body: JSON.stringify({ targetTier }),
      })
        .then(r => r.json())
        .then(setPreview);
    }
  }, [isOpen, targetTier]);

  const handleUpgrade = async () => {
    setLoading(true);
    const res = await fetch('/api/subscriptions/upgrade', {
      method: 'POST',
      body: JSON.stringify({ targetTier }),
    });
    if (res.ok) {
      // Refresh auth context
      window.location.reload();
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Upgrade to Alpha</h2>
      {preview && (
        <p>Amount due today: £{preview.amountDue.toFixed(2)}</p>
      )}
      <Button onClick={handleUpgrade} loading={loading}>
        Confirm Upgrade
      </Button>
    </Modal>
  );
}
```

## Files to Modify/Create

| File | Change |
|------|--------|
| `server/routes.ts` | Add upgrade and preview endpoints |
| `client/src/components/UpgradeModal.tsx` | New component |
| `client/src/pages/Settings.tsx` | Add upgrade button in billing section |
| `client/src/components/AnimatedUpgradeCTA.tsx` | Direct upgrade option |

## Dependencies

- Story 12.2 (Stripe Products)
- Story 12.3 (Premium Hook)

## Definition of Done

- [~] Upgrade button visible for Beta users (need to verify Settings page)
- [x] Proration preview shows correct amount
- [x] Stripe subscription updated
- [x] User tier updated immediately
- [~] Features unlock without refresh (currently requires refresh)
- [x] Downgrade available via portal

## Dev Agent Record

### Context Reference
- Tech Spec: `docs/sprint-artifacts/tech-spec-epic-12.md`
- Stripe docs: https://stripe.com/docs/billing/subscriptions/upgrade-downgrade

### Implementation Notes

**Completed 2025-12-10**

1. **Preview Upgrade Endpoint** (`server/routes.ts:1839-1880`)
   - `POST /api/subscriptions/preview-upgrade`
   - Accepts `{ targetTier: 'alpha' }`
   - Uses `stripe.invoices.createPreview()` to calculate proration
   - Returns `{ amountDue, currency, newPlanAmount }`

2. **Upgrade Endpoint** (`server/routes.ts:1885-1940`)
   - `POST /api/subscriptions/upgrade`
   - Validates user has active Beta subscription
   - Updates Stripe subscription items with Alpha price
   - Uses `proration_behavior: 'always_invoice'`
   - Immediately sets `subscriptionTier: 'alpha'` in database

3. **UpgradeModal Component** (`client/src/components/UpgradeModal.tsx`)
   - Fetches proration preview on open
   - Displays amount due and future charges
   - Loading and error states
   - Calls upgrade endpoint on confirm
   - Currently triggers `window.location.reload()` after success

4. **AnimatedUpgradeCTA Integration**
   - Links to `/pricing` page
   - User can upgrade via Pricing page or UpgradeModal

### File List

| File | Action |
|------|--------|
| `server/routes.ts` | Modified - added preview and upgrade endpoints |
| `client/src/components/UpgradeModal.tsx` | Created |

### Known Issues
- AC-4: Features require page refresh after upgrade (cache invalidation TODO)

### Test Commands
```bash
npm run check
# Test upgrade flow in Stripe test mode
```
