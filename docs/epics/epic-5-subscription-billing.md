# Epic 5: Subscription & Billing (Stripe)

## Epic Overview

| Field | Value |
|-------|-------|
| **Epic ID** | EPIC-005 |
| **Title** | Subscription & Billing |
| **Priority** | P0 - Critical |
| **Estimated Effort** | 3-4 days |
| **Dependencies** | None |

## Description

Implement Stripe-powered subscription billing with a single £9/month tier. Users must subscribe to access AI Attorney and other premium features. Includes billing dashboard, payment method management, and subscription lifecycle handling.

## Business Value

- Revenue generation for MVP validation
- Validates willingness to pay at £9 price point
- Foundation for future pricing tiers
- Professional billing experience builds trust

## Acceptance Criteria

- [ ] £9/month subscription tier available
- [ ] Stripe Checkout for secure payments
- [ ] Billing dashboard showing subscription status
- [ ] Payment method management
- [ ] Subscription cancellation flow
- [ ] Webhook handling for subscription events

---

## User Stories

### Story 5.1: Stripe Integration Setup

**As a** developer
**I want** to configure Stripe integration
**So that** payments can be processed

**Acceptance Criteria:**
- [ ] Stripe account connected
- [ ] API keys stored securely (environment variables)
- [ ] Stripe SDK installed and configured
- [ ] Test mode working in development
- [ ] Live mode ready for production
- [ ] Products/prices created in Stripe Dashboard

**Technical Notes:**
- Install `stripe` package
- Create product: "Aermuse Premium" - £9/month
- Configure webhook endpoint

**Story Points:** 2

---

### Story 5.2: Subscription Data Model

**As a** developer
**I want** to track subscription status in the database
**So that** feature access can be controlled

**Acceptance Criteria:**
- [ ] Add subscription fields to users table
- [ ] Store Stripe customer ID
- [ ] Store subscription ID
- [ ] Track subscription status
- [ ] Track current period end date

**Technical Notes:**
```sql
ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR;
ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR;
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'none';
ALTER TABLE users ADD COLUMN subscription_ends_at TIMESTAMP;
```

Statuses: none, trialing, active, past_due, canceled, unpaid

**Story Points:** 2

---

### Story 5.3: Pricing Page

**As a** visitor
**I want** to see the subscription pricing
**So that** I can decide to subscribe

**Acceptance Criteria:**
- [ ] Pricing section on landing page
- [ ] Single tier displayed: £9/month
- [ ] Feature list for tier
- [ ] "Get Started" CTA button
- [ ] Redirects to signup if not logged in
- [ ] Redirects to checkout if logged in

**Story Points:** 2

---

### Story 5.4: Stripe Checkout Flow

**As a** user
**I want** to subscribe via Stripe Checkout
**So that** my payment is processed securely

**Acceptance Criteria:**
- [ ] "Subscribe" button triggers checkout
- [ ] Stripe Checkout hosted page opens
- [ ] User enters payment details on Stripe
- [ ] Success redirects back to app
- [ ] Cancel redirects back to app
- [ ] Subscription activated on success
- [ ] User notified of successful subscription

**Technical Notes:**
- Use Stripe Checkout Sessions API
- Success URL: `/dashboard?subscription=success`
- Cancel URL: `/pricing?subscription=canceled`

**Story Points:** 3

---

### Story 5.5: Stripe Webhook Handler

**As the** system
**I want** to receive Stripe webhook events
**So that** subscription status stays in sync

**Acceptance Criteria:**
- [ ] POST `/api/webhooks/stripe` endpoint
- [ ] Webhook signature verification
- [ ] Handle events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- [ ] Update user subscription status accordingly
- [ ] Log webhook events for debugging

**Technical Notes:**
- Use raw body for signature verification
- Idempotent event handling

**Story Points:** 5

---

### Story 5.6: Billing Dashboard

**As a** subscriber
**I want** to view my billing information
**So that** I can manage my subscription

**Acceptance Criteria:**
- [ ] Billing section in account settings
- [ ] Display current plan name
- [ ] Display subscription status
- [ ] Display next billing date
- [ ] Display amount (£9/month)
- [ ] Link to Stripe Customer Portal
- [ ] Payment history list

**Story Points:** 3

---

### Story 5.7: Stripe Customer Portal

**As a** subscriber
**I want** to manage my subscription in Stripe Portal
**So that** I can update payment method or cancel

**Acceptance Criteria:**
- [ ] "Manage Subscription" button in billing dashboard
- [ ] Opens Stripe Customer Portal
- [ ] User can update payment method
- [ ] User can view invoices
- [ ] User can cancel subscription
- [ ] Redirects back to app after changes

**Technical Notes:**
- Use Stripe Billing Portal API
- Configure portal in Stripe Dashboard

**Story Points:** 2

---

### Story 5.8: Subscription Paywall

**As the** platform
**I want** to restrict features for non-subscribers
**So that** users are incentivized to subscribe

**Acceptance Criteria:**
- [ ] AI Attorney features require subscription
- [ ] E-signing features require subscription
- [ ] Non-subscribers see upgrade prompts
- [ ] Graceful degradation (can view, not create)
- [ ] Free tier limitations clearly communicated
- [ ] "Upgrade" CTAs throughout restricted areas

**Free Access:**
- Account creation and login
- View landing page
- Basic contract storage (limited)

**Premium Access (£9/month):**
- AI contract analysis
- All contract templates
- Unlimited e-signing
- Full contract storage

**Story Points:** 3

---

### Story 5.9: Subscription Cancellation Handling

**As a** user who canceled
**I want** to retain access until period end
**So that** I get what I paid for

**Acceptance Criteria:**
- [ ] Access continues until subscription_ends_at
- [ ] Status shows "Canceled - active until [date]"
- [ ] Resubscribe option available
- [ ] Access revoked after period ends
- [ ] Data retained for 90 days after expiry
- [ ] Winback email (stretch)

**Story Points:** 2

---

### Story 5.10: Invoice Generation

**As a** subscriber
**I want** to access my invoices
**So that** I have payment records

**Acceptance Criteria:**
- [ ] Invoice list in billing dashboard
- [ ] Invoice shows date, amount, status
- [ ] Download invoice as PDF
- [ ] Invoices provided by Stripe

**Story Points:** 2

---

## Total Story Points: 26

## Definition of Done

- [ ] Stripe checkout working end-to-end
- [ ] Webhooks handling all subscription events
- [ ] Customer portal accessible
- [ ] Paywall enforced correctly
- [ ] Billing dashboard complete
- [ ] Test transactions verified
- [ ] PCI compliance maintained (via Stripe)
