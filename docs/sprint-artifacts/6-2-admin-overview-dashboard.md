# Story 6.2: Admin Overview Dashboard

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 6.2 |
| **Epic** | Epic 6: Admin Dashboard |
| **Title** | Admin Overview Dashboard |
| **Priority** | P1 - High |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As an** admin
**I want** to see key metrics at a glance
**So that** I understand platform health

## Context

The admin overview dashboard is the landing page for admins, showing key platform metrics, trends, recent activity, and quick actions. It provides a snapshot of platform health and performance.

**Dependencies:**
- Story 6.1 (Admin Layout)

## Acceptance Criteria

- [ ] **AC-1:** Total users with 30-day trend
- [ ] **AC-2:** Active subscribers with trend
- [ ] **AC-3:** Total contracts with trend
- [ ] **AC-4:** Pending signatures count
- [ ] **AC-5:** Revenue this month (MRR)
- [ ] **AC-6:** Recent activity feed
- [ ] **AC-7:** Quick action buttons
- [ ] **AC-8:** Responsive card layout

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/routes/admin/overview.ts` | New: Overview API |
| `client/src/pages/admin/Overview.tsx` | Rewrite: Full dashboard |
| `client/src/components/admin/StatCard.tsx` | New: Metric card |
| `client/src/components/admin/ActivityFeed.tsx` | New: Recent activity |
| `client/src/components/admin/QuickActions.tsx` | New: Action buttons |

### Implementation

#### Overview API

```typescript
// server/routes/admin/overview.ts
import { Router } from 'express';
import { db } from '../../db';
import { users } from '../../db/schema/users';
import { contracts } from '../../db/schema/contracts';
import { signatureRequests } from '../../db/schema/signatures';
import { count, eq, gte, lt, and, desc, sql } from 'drizzle-orm';

const router = Router();

// GET /api/admin/overview/stats
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total users
    const [totalUsersResult] = await db.select({ count: count() }).from(users);
    const totalUsers = totalUsersResult.count;

    // Users 30 days ago (for trend)
    const [usersThirtyDaysAgoResult] = await db
      .select({ count: count() })
      .from(users)
      .where(lt(users.createdAt, thirtyDaysAgo));
    const usersTrend = totalUsers - usersThirtyDaysAgoResult.count;

    // Active subscribers
    const [activeSubsResult] = await db
      .select({ count: count() })
      .from(users)
      .where(
        sql`${users.subscriptionStatus} IN ('active', 'trialing')`
      );
    const activeSubscribers = activeSubsResult.count;

    // Subscribers 30 days ago (for trend)
    const [subsThirtyDaysAgoResult] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          sql`${users.subscriptionStatus} IN ('active', 'trialing')`,
          lt(users.createdAt, thirtyDaysAgo)
        )
      );
    const subsTrend = activeSubscribers - subsThirtyDaysAgoResult.count;

    // Total contracts
    const [totalContractsResult] = await db.select({ count: count() }).from(contracts);
    const totalContracts = totalContractsResult.count;

    // Contracts this month
    const [contractsThisMonthResult] = await db
      .select({ count: count() })
      .from(contracts)
      .where(gte(contracts.createdAt, startOfMonth));
    const contractsTrend = contractsThisMonthResult.count;

    // Pending signatures
    const [pendingSignaturesResult] = await db
      .select({ count: count() })
      .from(signatureRequests)
      .where(eq(signatureRequests.status, 'pending'));
    const pendingSignatures = pendingSignaturesResult.count;

    // Monthly revenue (calculated from active subs * price)
    const monthlyRevenue = activeSubscribers * 9; // £9/month

    res.json({
      totalUsers: {
        value: totalUsers,
        trend: usersTrend,
        trendLabel: 'vs last 30 days',
      },
      activeSubscribers: {
        value: activeSubscribers,
        trend: subsTrend,
        trendLabel: 'vs last 30 days',
      },
      totalContracts: {
        value: totalContracts,
        trend: contractsTrend,
        trendLabel: 'this month',
      },
      pendingSignatures: {
        value: pendingSignatures,
      },
      monthlyRevenue: {
        value: monthlyRevenue,
        currency: 'GBP',
      },
    });
  } catch (error) {
    console.error('[ADMIN] Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/overview/activity
router.get('/activity', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    // Get recent users
    const recentUsers = await db.query.users.findMany({
      orderBy: desc(users.createdAt),
      limit: 5,
      columns: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    // Get recent contracts
    const recentContracts = await db.query.contracts.findMany({
      orderBy: desc(contracts.createdAt),
      limit: 5,
      columns: {
        id: true,
        title: true,
        createdAt: true,
      },
      with: {
        user: {
          columns: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Combine and sort by date
    const activity = [
      ...recentUsers.map((u) => ({
        type: 'user_signup' as const,
        id: u.id,
        title: `${u.name} signed up`,
        description: u.email,
        timestamp: u.createdAt,
      })),
      ...recentContracts.map((c) => ({
        type: 'contract_created' as const,
        id: c.id,
        title: `New contract: ${c.title}`,
        description: `by ${c.user?.name || 'Unknown'}`,
        timestamp: c.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      .slice(0, limit);

    res.json({ activity });
  } catch (error) {
    console.error('[ADMIN] Activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

export default router;
```

#### Stat Card Component

```tsx
// client/src/components/admin/StatCard.tsx
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  prefix?: string;
  suffix?: string;
  color?: 'burgundy' | 'green' | 'blue' | 'yellow' | 'gray';
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  prefix,
  suffix,
  color = 'burgundy',
}: Props) {
  const colorClasses = {
    burgundy: 'bg-burgundy/10 text-burgundy',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    gray: 'bg-gray-100 text-gray-600',
  };

  const getTrendInfo = () => {
    if (trend === undefined) return null;

    if (trend > 0) {
      return {
        icon: ArrowUp,
        text: `+${trend}`,
        className: 'text-green-600',
      };
    } else if (trend < 0) {
      return {
        icon: ArrowDown,
        text: `${trend}`,
        className: 'text-red-600',
      };
    } else {
      return {
        icon: Minus,
        text: '0',
        className: 'text-gray-500',
      };
    }
  };

  const trendInfo = getTrendInfo();

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {prefix}
            {typeof value === 'number' ? value.toLocaleString() : value}
            {suffix}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {trendInfo && (
        <div className="mt-4 flex items-center gap-1">
          <trendInfo.icon className={`h-4 w-4 ${trendInfo.className}`} />
          <span className={`text-sm font-medium ${trendInfo.className}`}>
            {trendInfo.text}
          </span>
          {trendLabel && (
            <span className="text-sm text-gray-500 ml-1">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
```

#### Activity Feed Component

```tsx
// client/src/components/admin/ActivityFeed.tsx
import { UserPlus, FileText, PenTool, CreditCard } from 'lucide-react';

interface Activity {
  type: 'user_signup' | 'contract_created' | 'signature_completed' | 'subscription_started';
  id: string;
  title: string;
  description: string;
  timestamp: string;
}

interface Props {
  activities: Activity[];
  isLoading?: boolean;
}

export function ActivityFeed({ activities, isLoading }: Props) {
  const getIcon = (type: Activity['type']) => {
    const icons = {
      user_signup: { icon: UserPlus, color: 'bg-blue-100 text-blue-600' },
      contract_created: { icon: FileText, color: 'bg-green-100 text-green-600' },
      signature_completed: { icon: PenTool, color: 'bg-purple-100 text-purple-600' },
      subscription_started: { icon: CreditCard, color: 'bg-burgundy/10 text-burgundy' },
    };
    return icons[type] || icons.user_signup;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-start gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">No recent activity</p>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const { icon: Icon, color } = getIcon(activity.type);

        return (
          <div key={`${activity.type}-${activity.id}`} className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {activity.title}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {activity.description}
              </p>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {formatTime(activity.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

#### Quick Actions Component

```tsx
// client/src/components/admin/QuickActions.tsx
import { Link } from 'react-router-dom';
import { UserPlus, FileEdit, Settings, Download } from 'lucide-react';

const actions = [
  {
    name: 'View Users',
    href: '/admin/users',
    icon: UserPlus,
    description: 'Manage user accounts',
  },
  {
    name: 'Add Template',
    href: '/admin/templates/new',
    icon: FileEdit,
    description: 'Create a new template',
  },
  {
    name: 'Export Data',
    href: '/admin/users?export=true',
    icon: Download,
    description: 'Download reports',
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'Platform configuration',
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <Link
            key={action.name}
            to={action.href}
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Icon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">{action.name}</p>
              <p className="text-xs text-gray-500">{action.description}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
```

#### Overview Page

```tsx
// client/src/pages/admin/Overview.tsx
import { useState, useEffect } from 'react';
import { Users, UserCheck, FileText, PenTool, PoundSterling } from 'lucide-react';
import { StatCard } from '../../components/admin/StatCard';
import { ActivityFeed } from '../../components/admin/ActivityFeed';
import { QuickActions } from '../../components/admin/QuickActions';

interface Stats {
  totalUsers: { value: number; trend: number; trendLabel: string };
  activeSubscribers: { value: number; trend: number; trendLabel: string };
  totalContracts: { value: number; trend: number; trendLabel: string };
  pendingSignatures: { value: number };
  monthlyRevenue: { value: number; currency: string };
}

interface Activity {
  type: 'user_signup' | 'contract_created' | 'signature_completed' | 'subscription_started';
  id: string;
  title: string;
  description: string;
  timestamp: string;
}

export function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        fetch('/api/admin/overview/stats', { credentials: 'include' }),
        fetch('/api/admin/overview/activity', { credentials: 'include' }),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.activity);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers.value || 0}
          icon={Users}
          trend={stats?.totalUsers.trend}
          trendLabel={stats?.totalUsers.trendLabel}
          color="blue"
        />
        <StatCard
          title="Active Subscribers"
          value={stats?.activeSubscribers.value || 0}
          icon={UserCheck}
          trend={stats?.activeSubscribers.trend}
          trendLabel={stats?.activeSubscribers.trendLabel}
          color="green"
        />
        <StatCard
          title="Total Contracts"
          value={stats?.totalContracts.value || 0}
          icon={FileText}
          trend={stats?.totalContracts.trend}
          trendLabel={stats?.totalContracts.trendLabel}
          color="burgundy"
        />
        <StatCard
          title="Pending Signatures"
          value={stats?.pendingSignatures.value || 0}
          icon={PenTool}
          color="yellow"
        />
        <StatCard
          title="Monthly Revenue"
          value={stats?.monthlyRevenue.value || 0}
          icon={PoundSterling}
          prefix="£"
          color="green"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h2>
          <ActivityFeed activities={activity} isLoading={isLoading} />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
```

## Definition of Done

- [ ] Stats API returns correct metrics
- [ ] All stat cards display with trends
- [ ] Recent activity feed works
- [ ] Quick action buttons navigate correctly
- [ ] Responsive layout on mobile
- [ ] Loading states implemented
- [ ] Error handling in place

## Testing Checklist

### Unit Tests

- [ ] Trend calculation
- [ ] Time formatting
- [ ] StatCard rendering

### Integration Tests

- [ ] Stats API returns data
- [ ] Activity API returns data
- [ ] Admin auth required

### Visual Tests

- [ ] Desktop 5-column layout
- [ ] Tablet layout
- [ ] Mobile stacked layout

## Related Documents

- [Epic 6 Tech Spec](./tech-spec-epic-6.md)
- [Story 6.1: Admin Layout & Navigation](./6-1-admin-layout-and-navigation.md)
- [Story 6.6: Subscription Metrics](./6-6-subscription-metrics.md)
