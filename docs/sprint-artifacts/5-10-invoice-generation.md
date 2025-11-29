# Story 5.10: Invoice Generation

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 5.10 |
| **Epic** | Epic 5: Subscription & Billing |
| **Title** | Invoice Generation |
| **Priority** | P2 - Medium |
| **Story Points** | 2 |
| **Status** | Drafted |

## User Story

**As a** subscribed user
**I want** to view and download my invoices
**So that** I have records for accounting

## Context

Stripe automatically generates invoices for subscription payments. We need to surface these invoices to users, allowing them to view history and download PDFs. Most invoice management happens through the Stripe Customer Portal, but we can also show a summary in-app.

**Dependencies:**
- Story 5.1 (Stripe Integration Setup)
- Story 5.7 (Stripe Customer Portal)

## Acceptance Criteria

- [ ] **AC-1:** API endpoint to list user's invoices
- [ ] **AC-2:** Invoice list shows date, amount, status
- [ ] **AC-3:** Download links for invoice PDFs
- [ ] **AC-4:** Link to view invoice in Stripe-hosted page
- [ ] **AC-5:** Handle users with no invoices gracefully
- [ ] **AC-6:** Invoice email sent by Stripe on payment
- [ ] **AC-7:** Invoice accessible from billing settings

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/routes/billing.ts` | Add invoice list endpoint |
| `client/src/components/billing/InvoiceList.tsx` | New: Invoice table |
| `client/src/pages/settings/Invoices.tsx` | New: Invoices page |

### Implementation

#### Invoice List API

```typescript
// server/routes/billing.ts - Add to existing file

import { listInvoices, getUpcomingInvoice } from '../services/stripe';
import type { InvoiceSummary } from '../services/stripe.types';

// GET /api/billing/invoices
router.get('/invoices', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return res.json({
        invoices: [],
        hasMore: false,
        message: 'No billing history',
      });
    }

    // Fetch invoices from Stripe
    const stripeInvoices = await listInvoices(user.stripeCustomerId, limit);

    // Transform to summary format
    const invoices: InvoiceSummary[] = stripeInvoices.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status || 'draft',
      amount: inv.amount_paid / 100, // Convert from cents
      currency: inv.currency.toUpperCase(),
      date: new Date(inv.created * 1000),
      pdfUrl: inv.invoice_pdf,
      hostedUrl: inv.hosted_invoice_url,
    }));

    res.json({
      invoices,
      hasMore: stripeInvoices.length === limit,
    });
  } catch (error) {
    console.error('[BILLING] List invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// GET /api/billing/invoices/upcoming
router.get('/invoices/upcoming', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return res.json({ upcoming: null });
    }

    const upcoming = await getUpcomingInvoice(user.stripeCustomerId);

    if (!upcoming) {
      return res.json({ upcoming: null });
    }

    res.json({
      upcoming: {
        amount: upcoming.amount_due / 100,
        currency: upcoming.currency.toUpperCase(),
        date: new Date(upcoming.next_payment_attempt! * 1000),
        periodStart: new Date(upcoming.period_start * 1000),
        periodEnd: new Date(upcoming.period_end * 1000),
      },
    });
  } catch (error) {
    console.error('[BILLING] Get upcoming invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming invoice' });
  }
});
```

#### Invoice Types

```typescript
// server/services/stripe.types.ts - Add to existing file

export interface InvoiceSummary {
  id: string;
  number: string | null;
  status: string;
  amount: number;
  currency: string;
  date: Date;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

export interface UpcomingInvoice {
  amount: number;
  currency: string;
  date: Date;
  periodStart: Date;
  periodEnd: Date;
}
```

#### Invoice List Component

```tsx
// client/src/components/billing/InvoiceList.tsx
import { useState, useEffect } from 'react';
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react';

interface Invoice {
  id: string;
  number: string | null;
  status: string;
  amount: number;
  currency: string;
  date: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

export function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/billing/invoices', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data = await response.json();
      setInvoices(data.invoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      open: 'bg-yellow-100 text-yellow-800',
      draft: 'bg-gray-100 text-gray-800',
      void: 'bg-red-100 text-red-800',
      uncollectible: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        {error}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No invoices yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Invoices will appear here after your first payment.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Invoice
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="hover:bg-gray-50">
              <td className="px-4 py-4 whitespace-nowrap">
                <span className="text-sm font-medium text-gray-900">
                  {invoice.number || invoice.id.slice(0, 14)}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-600">
                  {formatDate(invoice.date)}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <span className="text-sm font-medium text-gray-900">
                  {formatAmount(invoice.amount, invoice.currency)}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                {getStatusBadge(invoice.status)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-2">
                  {invoice.pdfUrl && (
                    <a
                      href={invoice.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  {invoice.hostedUrl && (
                    <a
                      href={invoice.hostedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      title="View Invoice"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### Invoices Page

```tsx
// client/src/pages/settings/Invoices.tsx
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { InvoiceList } from '../../components/billing/InvoiceList';
import { useBillingPortal } from '../../hooks/useBillingPortal';

export function Invoices() {
  const { openPortal, isLoading } = useBillingPortal();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/settings/billing"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Invoice History</h1>
        </div>

        <button
          onClick={openPortal}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
        >
          <ExternalLink className="h-4 w-4" />
          View in Stripe
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <InvoiceList />
      </div>

      <p className="mt-4 text-sm text-gray-500 text-center">
        For complete invoice management, use the{' '}
        <button
          onClick={openPortal}
          className="text-burgundy hover:underline"
        >
          Stripe Customer Portal
        </button>
        .
      </p>
    </div>
  );
}
```

#### Upcoming Invoice Component

```tsx
// client/src/components/billing/UpcomingInvoice.tsx
import { useState, useEffect } from 'react';
import { Calendar, CreditCard } from 'lucide-react';

interface UpcomingInvoice {
  amount: number;
  currency: string;
  date: string;
  periodStart: string;
  periodEnd: string;
}

export function UpcomingInvoice() {
  const [upcoming, setUpcoming] = useState<UpcomingInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUpcoming();
  }, []);

  const fetchUpcoming = async () => {
    try {
      const response = await fetch('/api/billing/invoices/upcoming', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUpcoming(data.upcoming);
      }
    } catch (error) {
      console.error('Failed to fetch upcoming invoice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !upcoming) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border">
      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
        <CreditCard className="h-4 w-4" />
        Next Payment
      </h3>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Amount</span>
          <span className="font-medium">
            {formatAmount(upcoming.amount, upcoming.currency)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Date</span>
          <span className="text-gray-900">{formatDate(upcoming.date)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Billing period</span>
          <span className="text-gray-600">
            {formatDate(upcoming.periodStart)} - {formatDate(upcoming.periodEnd)}
          </span>
        </div>
      </div>
    </div>
  );
}
```

#### Stripe Invoice Email Configuration

In Stripe Dashboard → Settings → Emails:

1. **Customer emails**:
   - Enable "Successful payments"
   - Enable "Upcoming renewals" (optional)
   - Enable "Failed payments"

2. **Invoice PDF**:
   - Customize with Aermuse branding
   - Include business details

3. **Email customization**:
   - Add logo
   - Customize colors to match Aermuse

## Definition of Done

- [ ] Invoice list API working
- [ ] Invoice table displays in UI
- [ ] PDF download links work
- [ ] Hosted invoice page links work
- [ ] Empty state for no invoices
- [ ] Upcoming invoice shown
- [ ] Stripe sends invoice emails
- [ ] Link from billing settings works

## Testing Checklist

### Unit Tests

- [ ] Amount formatting
- [ ] Date formatting
- [ ] Status badge styling

### Integration Tests

- [ ] List invoices API
- [ ] Upcoming invoice API
- [ ] Handle missing customer

### Manual Testing

1. Complete a subscription payment
2. Verify invoice appears in list
3. Click PDF download
4. Click view invoice link
5. Check email received
6. Verify upcoming invoice shows

### Edge Cases

- [ ] User with no invoices
- [ ] User with no customer ID
- [ ] Voided invoices displayed correctly
- [ ] Multiple currency handling

## Related Documents

- [Epic 5 Tech Spec](./tech-spec-epic-5.md)
- [Story 5.6: Billing Dashboard](./5-6-billing-dashboard.md)
- [Story 5.7: Stripe Customer Portal](./5-7-stripe-customer-portal.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create invoice list API endpoint**
  - [ ] Add GET /api/billing/invoices route to server/routes/billing.ts
  - [ ] Import listInvoices from Stripe service
  - [ ] Query user's stripeCustomerId
  - [ ] Fetch invoices from Stripe
  - [ ] Transform to InvoiceSummary format
  - [ ] Return invoices array with hasMore flag

- [ ] **Task 2: Create upcoming invoice API endpoint**
  - [ ] Add GET /api/billing/invoices/upcoming route
  - [ ] Import getUpcomingInvoice from Stripe service
  - [ ] Query user's stripeCustomerId
  - [ ] Fetch upcoming invoice from Stripe
  - [ ] Return formatted upcoming invoice data

- [ ] **Task 3: Add invoice types to Stripe types**
  - [ ] Update server/services/stripe.types.ts
  - [ ] Define InvoiceSummary interface
  - [ ] Define UpcomingInvoice interface

- [ ] **Task 4: Build InvoiceList component**
  - [ ] Create client/src/components/billing/InvoiceList.tsx
  - [ ] Fetch invoices from API on mount
  - [ ] Display loading state
  - [ ] Display empty state for no invoices
  - [ ] Render invoice table with columns
  - [ ] Format dates and amounts
  - [ ] Implement getStatusBadge function
  - [ ] Add PDF download links
  - [ ] Add hosted invoice view links

- [ ] **Task 5: Build Invoices page**
  - [ ] Create client/src/pages/settings/Invoices.tsx
  - [ ] Add page header with back button
  - [ ] Render InvoiceList component
  - [ ] Add "View in Stripe" portal link
  - [ ] Include footer text about portal

- [ ] **Task 6: Build UpcomingInvoice component**
  - [ ] Create client/src/components/billing/UpcomingInvoice.tsx
  - [ ] Fetch upcoming invoice from API
  - [ ] Display amount and next payment date
  - [ ] Show billing period
  - [ ] Format currency and dates
  - [ ] Hide if no upcoming invoice

- [ ] **Task 7: Configure Stripe invoice emails**
  - [ ] Navigate to Stripe Dashboard → Settings → Emails
  - [ ] Enable "Successful payments" email
  - [ ] Enable "Failed payments" email
  - [ ] Optionally enable "Upcoming renewals"
  - [ ] Customize email templates with Aermuse branding
  - [ ] Add logo and business details to invoice PDF

- [ ] **Task 8: Add route and navigation**
  - [ ] Add /settings/billing/invoices route
  - [ ] Link from billing dashboard
  - [ ] Test navigation

- [ ] **Task 9: Testing**
  - [ ] Complete test payment to generate invoice
  - [ ] Verify invoice appears in list
  - [ ] Test PDF download link
  - [ ] Test hosted invoice view link
  - [ ] Verify upcoming invoice displays
  - [ ] Test with no invoices (empty state)
  - [ ] Verify invoice email received
  - [ ] Test amount and date formatting
  - [ ] Test status badges for different statuses
