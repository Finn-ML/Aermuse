# Story 5.9: Subscription Cancellation Handling

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 5.9 |
| **Epic** | Epic 5: Subscription & Billing |
| **Title** | Subscription Cancellation Handling |
| **Priority** | P1 - High |
| **Story Points** | 2 |
| **Status** | Drafted |

## User Story

**As a** user with a canceled subscription
**I want** to continue accessing premium features until my period ends
**So that** I get value from what I've paid for

## Context

When users cancel their subscription through the Customer Portal, they should retain access until their billing period ends. The system needs to handle this gracefully, showing appropriate messaging and offering reactivation options.

**Dependencies:**
- Story 5.5 (Stripe Webhook Handler)
- Story 5.6 (Billing Dashboard)
- Story 5.7 (Stripe Customer Portal)

## Acceptance Criteria

- [ ] **AC-1:** Canceled subscription retains access until period end
- [ ] **AC-2:** Billing page shows cancellation pending status
- [ ] **AC-3:** Days remaining clearly displayed
- [ ] **AC-4:** Reactivation option available
- [ ] **AC-5:** Email notification on cancellation
- [ ] **AC-6:** Email notification before access expires
- [ ] **AC-7:** Graceful transition to free tier when period ends
- [ ] **AC-8:** Data preserved after downgrade

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/services/webhooks/stripe-handlers.ts` | Handle cancellation events |
| `server/services/email/subscription.ts` | Cancellation emails |
| `server/jobs/expirationReminder.ts` | New: Reminder job |
| `client/src/components/billing/CancellationBanner.tsx` | New: Cancellation notice |

### Implementation

#### Enhanced Webhook Handler

```typescript
// server/services/webhooks/stripe-handlers.ts - Enhanced cancellation handling

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`[STRIPE WEBHOOK] Subscription updated: ${subscription.id} -> ${subscription.status}`);

  const customerId = subscription.customer as string;
  const update = buildSubscriptionUpdate(subscription);

  await updateUserByCustomerId(customerId, update);

  // Check if this is a new cancellation
  if (subscription.cancel_at_period_end) {
    const user = await getUserByCustomerId(customerId);
    if (user) {
      await sendCancellationEmail(user, subscription);
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`[STRIPE WEBHOOK] Subscription deleted: ${subscription.id}`);

  const customerId = subscription.customer as string;

  // Clear subscription data
  const update: SubscriptionUpdate = {
    stripeSubscriptionId: null,
    subscriptionStatus: 'canceled',
    subscriptionPriceId: null,
    subscriptionCurrentPeriodEnd: null,
    subscriptionCancelAtPeriodEnd: false,
  };

  await updateUserByCustomerId(customerId, update);

  // Send access expired email
  const user = await getUserByCustomerId(customerId);
  if (user) {
    await sendAccessExpiredEmail(user);
  }
}

async function getUserByCustomerId(customerId: string) {
  return db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
    columns: {
      id: true,
      email: true,
      name: true,
    },
  });
}
```

#### Subscription Emails

```typescript
// server/services/email/subscription.ts
import { sendEmail, baseTemplate, primaryButton, infoBox } from './base';
import Stripe from 'stripe';

interface UserInfo {
  id: string;
  email: string;
  name: string;
}

/**
 * Send email when subscription is set to cancel at period end
 */
export async function sendCancellationEmail(
  user: UserInfo,
  subscription: Stripe.Subscription
) {
  const periodEnd = new Date(subscription.current_period_end * 1000);
  const formattedDate = periodEnd.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #333;">
      Subscription Cancellation Confirmed
    </h2>
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #555;">
      Hi ${user.name},
    </p>
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #555;">
      We've received your cancellation request. Your Aermuse Premium subscription will end on:
    </p>

    ${infoBox(`
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #333;">
        ${formattedDate}
      </p>
    `)}

    <p style="margin: 0 0 16px 0; font-size: 16px; color: #555;">
      You'll continue to have full access to all premium features until then, including:
    </p>
    <ul style="margin: 0 0 16px 0; padding-left: 20px; font-size: 14px; color: #666;">
      <li>AI Contract Analysis</li>
      <li>E-Signing with DocuSeal</li>
      <li>Professional Templates</li>
      <li>Unlimited Contracts</li>
    </ul>

    <p style="margin: 0 0 24px 0; font-size: 16px; color: #555;">
      Changed your mind? You can reactivate anytime before your access ends.
    </p>

    ${primaryButton('Reactivate Subscription', `${process.env.APP_URL}/settings/billing`)}

    <p style="margin: 24px 0 0 0; font-size: 14px; color: #888;">
      We'd love to hear why you're leaving. Reply to this email with any feedback.
    </p>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Your Aermuse Premium subscription has been cancelled',
    html: baseTemplate(content),
  });

  console.log(`[EMAIL] Sent cancellation email to ${user.email}`);
}

/**
 * Send email when subscription access has fully expired
 */
export async function sendAccessExpiredEmail(user: UserInfo) {
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #333;">
      Your Premium Access Has Ended
    </h2>
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #555;">
      Hi ${user.name},
    </p>
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #555;">
      Your Aermuse Premium subscription has ended. Your account has been downgraded to the free tier.
    </p>

    ${infoBox(`
      <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">What this means:</h3>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #666;">
        <li>Your contracts and data are still safe</li>
        <li>You can still access up to 3 contracts</li>
        <li>AI analysis and e-signing are no longer available</li>
      </ul>
    `)}

    <p style="margin: 0 0 24px 0; font-size: 16px; color: #555;">
      Ready to get premium features back? Resubscribe anytime.
    </p>

    ${primaryButton('Resubscribe Now', `${process.env.APP_URL}/pricing`)}
  `;

  await sendEmail({
    to: user.email,
    subject: 'Your Aermuse Premium access has ended',
    html: baseTemplate(content),
  });

  console.log(`[EMAIL] Sent access expired email to ${user.email}`);
}

/**
 * Send reminder email X days before access expires
 */
export async function sendExpirationReminderEmail(
  user: UserInfo,
  daysRemaining: number,
  periodEnd: Date
) {
  const formattedDate = periodEnd.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #333;">
      Your Premium Access Ends Soon
    </h2>
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #555;">
      Hi ${user.name},
    </p>
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #555;">
      Your Aermuse Premium subscription ends in <strong>${daysRemaining} days</strong>
      (${formattedDate}).
    </p>

    <p style="margin: 0 0 16px 0; font-size: 16px; color: #555;">
      After this date, you'll lose access to:
    </p>
    <ul style="margin: 0 0 16px 0; padding-left: 20px; font-size: 14px; color: #666;">
      <li>AI Contract Analysis</li>
      <li>E-Signing with DocuSeal</li>
      <li>Professional Templates</li>
      <li>Contracts beyond the free tier limit</li>
    </ul>

    <p style="margin: 0 0 24px 0; font-size: 16px; color: #555;">
      Reactivate now to keep all your premium features.
    </p>

    ${primaryButton('Reactivate Subscription', `${process.env.APP_URL}/settings/billing`)}
  `;

  await sendEmail({
    to: user.email,
    subject: `Your Aermuse Premium ends in ${daysRemaining} days`,
    html: baseTemplate(content),
  });

  console.log(`[EMAIL] Sent expiration reminder to ${user.email} (${daysRemaining} days)`);
}
```

#### Expiration Reminder Job

```typescript
// server/jobs/expirationReminder.ts
import { db } from '../db';
import { users } from '../db/schema/users';
import { and, eq, gte, lte } from 'drizzle-orm';
import { sendExpirationReminderEmail } from '../services/email/subscription';

const REMINDER_DAYS = [7, 3, 1]; // Send reminders at 7, 3, and 1 day before

/**
 * Send expiration reminders to users with canceling subscriptions
 * Run daily via cron
 */
export async function sendExpirationReminders() {
  const now = new Date();

  for (const daysOut of REMINDER_DAYS) {
    // Calculate the target date range (within 24 hours of the reminder day)
    const targetStart = new Date(now);
    targetStart.setDate(targetStart.getDate() + daysOut);
    targetStart.setHours(0, 0, 0, 0);

    const targetEnd = new Date(targetStart);
    targetEnd.setHours(23, 59, 59, 999);

    // Find users with subscription ending in this window
    const usersToNotify = await db.query.users.findMany({
      where: and(
        eq(users.subscriptionCancelAtPeriodEnd, true),
        gte(users.subscriptionCurrentPeriodEnd, targetStart),
        lte(users.subscriptionCurrentPeriodEnd, targetEnd)
      ),
      columns: {
        id: true,
        email: true,
        name: true,
        subscriptionCurrentPeriodEnd: true,
      },
    });

    console.log(`[EXPIRY REMINDER] Found ${usersToNotify.length} users expiring in ${daysOut} days`);

    for (const user of usersToNotify) {
      try {
        await sendExpirationReminderEmail(
          { id: user.id, email: user.email, name: user.name },
          daysOut,
          user.subscriptionCurrentPeriodEnd!
        );
      } catch (error) {
        console.error(`[EXPIRY REMINDER] Failed to send to ${user.email}:`, error);
      }
    }
  }
}

// Schedule with node-cron
// import cron from 'node-cron';
// cron.schedule('0 9 * * *', sendExpirationReminders); // Daily at 9 AM
```

#### Cancellation Banner Component

```tsx
// client/src/components/billing/CancellationBanner.tsx
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useBillingPortal } from '../../hooks/useBillingPortal';

interface Props {
  daysRemaining: number;
  periodEnd: string;
}

export function CancellationBanner({ daysRemaining, periodEnd }: Props) {
  const { openPortal, isLoading } = useBillingPortal();
  const formattedDate = new Date(periodEnd).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const urgency = daysRemaining <= 3 ? 'urgent' : daysRemaining <= 7 ? 'warning' : 'info';

  const styles = {
    urgent: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className={`border rounded-lg p-4 mb-6 ${styles[urgency]}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium">
            {daysRemaining === 0
              ? 'Your subscription ends today'
              : daysRemaining === 1
              ? 'Your subscription ends tomorrow'
              : `Your subscription ends in ${daysRemaining} days`}
          </p>
          <p className="text-sm mt-1 opacity-90">
            You'll have access to all premium features until {formattedDate}.
            After that, your account will be downgraded to the free tier.
          </p>
          <button
            onClick={openPortal}
            disabled={isLoading}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Reactivate Subscription
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### Reactivation API

```typescript
// server/routes/billing.ts - Add reactivation endpoint

// POST /api/billing/reactivate
router.post('/reactivate', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        stripeSubscriptionId: true,
        subscriptionCancelAtPeriodEnd: true,
      },
    });

    if (!user?.stripeSubscriptionId) {
      return res.status(400).json({
        error: 'No active subscription to reactivate',
        message: 'Please subscribe to get premium access.',
      });
    }

    if (!user.subscriptionCancelAtPeriodEnd) {
      return res.status(400).json({
        error: 'Subscription is not scheduled for cancellation',
      });
    }

    // Reactivate via Stripe
    const { reactivateSubscription } = await import('../services/stripe');
    await reactivateSubscription(user.stripeSubscriptionId);

    // Update local database
    await db
      .update(users)
      .set({
        subscriptionCancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log(`[BILLING] Subscription reactivated for user ${userId}`);

    res.json({
      success: true,
      message: 'Your subscription has been reactivated.',
    });
  } catch (error) {
    console.error('[BILLING] Reactivation error:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});
```

## Definition of Done

- [ ] Canceled users keep access until period end
- [ ] Cancellation banner shows on dashboard
- [ ] Days remaining clearly displayed
- [ ] Reactivation works via portal
- [ ] Cancellation email sent
- [ ] Expiration reminder emails sent
- [ ] Access fully removed after period ends
- [ ] Data preserved after downgrade

## Testing Checklist

### Unit Tests

- [ ] Days remaining calculation
- [ ] Email content generation
- [ ] Urgency level calculation

### Integration Tests

- [ ] Webhook updates cancel_at_period_end
- [ ] Reactivation API works
- [ ] Access check respects period end

### E2E Tests

- [ ] Cancel via portal → banner shows
- [ ] Reactivate → banner disappears
- [ ] Period ends → downgraded to free

### Email Tests

- [ ] Cancellation email sent
- [ ] 7-day reminder sent
- [ ] 3-day reminder sent
- [ ] 1-day reminder sent
- [ ] Access expired email sent

## Related Documents

- [Epic 5 Tech Spec](./tech-spec-epic-5.md)
- [Story 5.5: Stripe Webhook Handler](./5-5-stripe-webhook-handler.md)
- [Story 5.7: Stripe Customer Portal](./5-7-stripe-customer-portal.md)
