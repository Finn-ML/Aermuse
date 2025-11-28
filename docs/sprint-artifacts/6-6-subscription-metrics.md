# Story 6.6: Subscription Metrics

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 6.6 |
| **Epic** | Epic 6: Admin Dashboard |
| **Title** | Subscription Metrics |
| **Priority** | P1 - High |
| **Story Points** | 4 |
| **Status** | Drafted |

## User Story

**As an** admin
**I want** to see subscription analytics
**So that** I can track business performance

## Context

Subscription metrics help admins understand business health - MRR, churn rate, growth trends, and failed payments. This data helps with business decisions and identifying issues with billing.

**Dependencies:**
- Story 6.1 (Admin Layout)
- Epic 5 (Subscription data)

## Acceptance Criteria

- [ ] **AC-1:** Total active subscriptions count
- [ ] **AC-2:** Monthly recurring revenue (MRR)
- [ ] **AC-3:** New subscriptions this month
- [ ] **AC-4:** Cancelled subscriptions this month
- [ ] **AC-5:** Churn rate calculation
- [ ] **AC-6:** Subscription timeline chart
- [ ] **AC-7:** Subscriber list with quick access
- [ ] **AC-8:** Failed payment alerts
- [ ] **AC-9:** Export subscription report

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/routes/admin/subscriptions.ts` | New: Subscription API |
| `client/src/pages/admin/SubscriptionMetrics.tsx` | New: Metrics page |
| `client/src/components/admin/SubscriptionChart.tsx` | New: Timeline chart |
| `client/src/components/admin/SubscriberList.tsx` | New: Subscriber table |

### Implementation

#### Subscription Metrics API

```typescript
// server/routes/admin/subscriptions.ts
import { Router } from 'express';
import { db } from '../../db';
import { users } from '../../db/schema/users';
import { count, eq, gte, lte, and, sql, desc } from 'drizzle-orm';
import { logAdminActivity } from '../../services/adminActivity';

const router = Router();

const MONTHLY_PRICE = 9; // £9/month

// GET /api/admin/subscriptions/metrics
router.get('/metrics', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Active subscriptions (active or trialing)
    const [activeResult] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.subscriptionStatus} IN ('active', 'trialing')`);
    const activeSubscriptions = activeResult.count;

    // MRR
    const mrr = activeSubscriptions * MONTHLY_PRICE;

    // New subscriptions this month
    const [newThisMonthResult] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          sql`${users.subscriptionStatus} IN ('active', 'trialing')`,
          gte(users.updatedAt, startOfMonth)
        )
      );
    const newThisMonth = newThisMonthResult.count;

    // Cancelled this month
    const [cancelledResult] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          eq(users.subscriptionStatus, 'canceled'),
          gte(users.updatedAt, startOfMonth)
        )
      );
    const cancelledThisMonth = cancelledResult.count;

    // Active at start of month (approximation)
    const activeAtStartOfMonth = activeSubscriptions - newThisMonth + cancelledThisMonth;

    // Churn rate
    const churnRate = activeAtStartOfMonth > 0
      ? ((cancelledThisMonth / activeAtStartOfMonth) * 100).toFixed(1)
      : '0.0';

    // Past due (failed payments)
    const [pastDueResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.subscriptionStatus, 'past_due'));
    const failedPayments = pastDueResult.count;

    res.json({
      activeSubscriptions,
      mrr,
      newThisMonth,
      cancelledThisMonth,
      churnRate: parseFloat(churnRate),
      failedPayments,
      currency: 'GBP',
    });
  } catch (error) {
    console.error('[ADMIN] Subscription metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// GET /api/admin/subscriptions/timeline
router.get('/timeline', async (req, res) => {
  try {
    const months = parseInt(req.query.months as string) || 6;
    const timeline = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      // This is simplified - in production you'd track historical snapshots
      const [activeResult] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            sql`${users.subscriptionStatus} IN ('active', 'trialing')`,
            lte(users.createdAt, endOfMonth)
          )
        );

      timeline.push({
        month: startOfMonth.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        date: startOfMonth.toISOString(),
        active: activeResult.count,
        mrr: activeResult.count * MONTHLY_PRICE,
      });
    }

    res.json({ timeline });
  } catch (error) {
    console.error('[ADMIN] Timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// GET /api/admin/subscriptions/list
router.get('/list', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    const conditions = status
      ? eq(users.subscriptionStatus, status)
      : sql`${users.subscriptionStatus} IN ('active', 'trialing', 'past_due', 'canceled')`;

    const [totalResult] = await db
      .select({ count: count() })
      .from(users)
      .where(conditions);

    const subscribers = await db.query.users.findMany({
      where: conditions,
      orderBy: desc(users.updatedAt),
      limit,
      offset,
      columns: {
        id: true,
        name: true,
        email: true,
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
        subscriptionCancelAtPeriodEnd: true,
        createdAt: true,
      },
    });

    res.json({
      subscribers,
      pagination: {
        page,
        limit,
        total: totalResult.count,
        totalPages: Math.ceil(totalResult.count / limit),
      },
    });
  } catch (error) {
    console.error('[ADMIN] Subscriber list error:', error);
    res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
});

// GET /api/admin/subscriptions/export
router.get('/export', async (req, res) => {
  try {
    const subscribers = await db.query.users.findMany({
      where: sql`${users.subscriptionStatus} IS NOT NULL AND ${users.subscriptionStatus} != 'none'`,
      orderBy: desc(users.createdAt),
      columns: {
        id: true,
        email: true,
        name: true,
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
        subscriptionCancelAtPeriodEnd: true,
        createdAt: true,
      },
    });

    const headers = ['id', 'email', 'name', 'status', 'period_end', 'cancelling', 'created_at'];
    const rows = subscribers.map((s) => [
      s.id,
      s.email,
      s.name,
      s.subscriptionStatus,
      s.subscriptionCurrentPeriodEnd?.toISOString() || '',
      s.subscriptionCancelAtPeriodEnd,
      s.createdAt?.toISOString() || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    await logAdminActivity({
      req,
      action: 'export.subscriptions',
      entityType: 'export',
      details: { count: subscribers.length },
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=subscriptions-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('[ADMIN] Export error:', error);
    res.status(500).json({ error: 'Failed to export' });
  }
});

export default router;
```

#### Subscription Metrics Page

```tsx
// client/src/pages/admin/SubscriptionMetrics.tsx
import { useState, useEffect } from 'react';
import { Users, PoundSterling, TrendingUp, TrendingDown, AlertTriangle, Download } from 'lucide-react';
import { StatCard } from '../../components/admin/StatCard';
import { SubscriptionChart } from '../../components/admin/SubscriptionChart';
import { SubscriberList } from '../../components/admin/SubscriberList';

interface Metrics {
  activeSubscriptions: number;
  mrr: number;
  newThisMonth: number;
  cancelledThisMonth: number;
  churnRate: number;
  failedPayments: number;
  currency: string;
}

export function SubscriptionMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [timeline, setTimeline] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [metricsRes, timelineRes] = await Promise.all([
        fetch('/api/admin/subscriptions/metrics', { credentials: 'include' }),
        fetch('/api/admin/subscriptions/timeline', { credentials: 'include' }),
      ]);

      if (metricsRes.ok) {
        setMetrics(await metricsRes.json());
      }
      if (timelineRes.ok) {
        const data = await timelineRes.json();
        setTimeline(data.timeline);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    const response = await fetch('/api/admin/subscriptions/export', {
      credentials: 'include',
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscriptions-${Date.now()}.csv`;
      a.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Active Subscribers"
          value={metrics?.activeSubscriptions || 0}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Monthly Revenue"
          value={metrics?.mrr || 0}
          icon={PoundSterling}
          prefix="£"
          color="burgundy"
        />
        <StatCard
          title="New This Month"
          value={metrics?.newThisMonth || 0}
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Cancelled"
          value={metrics?.cancelledThisMonth || 0}
          icon={TrendingDown}
          color="gray"
        />
        <StatCard
          title="Churn Rate"
          value={`${metrics?.churnRate || 0}%`}
          icon={TrendingDown}
          color={metrics?.churnRate && metrics.churnRate > 5 ? 'yellow' : 'gray'}
        />
        <StatCard
          title="Failed Payments"
          value={metrics?.failedPayments || 0}
          icon={AlertTriangle}
          color={metrics?.failedPayments ? 'yellow' : 'gray'}
        />
      </div>

      {/* Failed Payments Alert */}
      {metrics?.failedPayments && metrics.failedPayments > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">
              {metrics.failedPayments} payment{metrics.failedPayments > 1 ? 's' : ''} failed
            </p>
            <p className="text-yellow-700 text-sm">
              Review these subscriptions and consider reaching out to affected users.
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Subscription Trend</h2>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
        <SubscriptionChart data={timeline} isLoading={isLoading} />
      </div>

      {/* Subscriber List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Subscribers</h2>
        </div>
        <SubscriberList />
      </div>
    </div>
  );
}
```

#### Subscription Chart Component

```tsx
// client/src/components/admin/SubscriptionChart.tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  month: string;
  active: number;
  mrr: number;
}

interface Props {
  data: DataPoint[];
  isLoading?: boolean;
}

export function SubscriptionChart({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        Loading chart...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number, name: string) =>
              name === 'mrr' ? [`£${value}`, 'MRR'] : [value, 'Subscribers']
            }
          />
          <Line
            type="monotone"
            dataKey="active"
            stroke="#722F37"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="active"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

## Definition of Done

- [ ] All metrics display correctly
- [ ] MRR calculated accurately
- [ ] Churn rate formula correct
- [ ] Timeline chart renders
- [ ] Failed payment alerts shown
- [ ] Subscriber list with pagination
- [ ] CSV export works

## Testing Checklist

### Unit Tests

- [ ] Churn rate calculation
- [ ] MRR calculation

### Integration Tests

- [ ] Metrics API
- [ ] Timeline API
- [ ] Export CSV

### Visual Tests

- [ ] Chart renders correctly
- [ ] Responsive layout

## Related Documents

- [Epic 6 Tech Spec](./tech-spec-epic-6.md)
- [Epic 5: Subscription & Billing](./tech-spec-epic-5.md)
