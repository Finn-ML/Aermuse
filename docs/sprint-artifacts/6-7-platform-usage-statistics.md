# Story 6.7: Platform Usage Statistics

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 6.7 |
| **Epic** | Epic 6: Admin Dashboard |
| **Title** | Platform Usage Statistics |
| **Priority** | P2 - Medium |
| **Story Points** | 4 |
| **Status** | Drafted |

## User Story

**As an** admin
**I want** to see usage statistics
**So that** I understand how the platform is used

## Context

Usage statistics help admins understand feature adoption, popular templates, and overall platform engagement. This data informs product decisions and helps identify areas for improvement.

**Dependencies:**
- Story 6.1 (Admin Layout)
- Epic 2 (AI Analysis data)
- Epic 3 (Template data)
- Epic 4 (E-Signing data)

## Acceptance Criteria

- [ ] **AC-1:** Contracts created (daily/weekly/monthly)
- [ ] **AC-2:** AI analyses performed count
- [ ] **AC-3:** E-signatures completed count
- [ ] **AC-4:** Template usage breakdown
- [ ] **AC-5:** Most popular templates ranking
- [ ] **AC-6:** User engagement metrics
- [ ] **AC-7:** Charts/graphs visualization
- [ ] **AC-8:** Date range selection

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/routes/admin/analytics.ts` | New: Analytics API |
| `client/src/pages/admin/UsageStatistics.tsx` | New: Analytics page |
| `client/src/components/admin/UsageChart.tsx` | New: Usage chart |
| `client/src/components/admin/TemplateUsageTable.tsx` | New: Template breakdown |

### Implementation

#### Analytics API

```typescript
// server/routes/admin/analytics.ts
import { Router } from 'express';
import { db } from '../../db';
import { contracts } from '../../db/schema/contracts';
import { contractAnalyses } from '../../db/schema/analyses';
import { signatureRequests, signatories } from '../../db/schema/signatures';
import { templates } from '../../db/schema/templates';
import { users } from '../../db/schema/users';
import { count, eq, gte, lte, and, sql, desc } from 'drizzle-orm';

const router = Router();

// GET /api/admin/analytics/usage
router.get('/usage', async (req, res) => {
  try {
    const period = (req.query.period as string) || 'month';
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Contracts created
    const [contractsResult] = await db
      .select({ count: count() })
      .from(contracts)
      .where(gte(contracts.createdAt, startDate));

    // AI analyses
    const [analysesResult] = await db
      .select({ count: count() })
      .from(contractAnalyses)
      .where(gte(contractAnalyses.createdAt, startDate));

    // E-signatures completed
    const [signaturesResult] = await db
      .select({ count: count() })
      .from(signatories)
      .where(
        and(
          eq(signatories.status, 'signed'),
          gte(signatories.signedAt, startDate)
        )
      );

    // Template contracts
    const [templateContractsResult] = await db
      .select({ count: count() })
      .from(contracts)
      .where(
        and(
          eq(contracts.type, 'template'),
          gte(contracts.createdAt, startDate)
        )
      );

    // Uploaded contracts
    const [uploadedContractsResult] = await db
      .select({ count: count() })
      .from(contracts)
      .where(
        and(
          eq(contracts.type, 'upload'),
          gte(contracts.createdAt, startDate)
        )
      );

    // Active users (created contract in period)
    const activeUsersQuery = await db
      .selectDistinct({ userId: contracts.userId })
      .from(contracts)
      .where(gte(contracts.createdAt, startDate));

    res.json({
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      contractsCreated: contractsResult.count,
      aiAnalyses: analysesResult.count,
      signaturesCompleted: signaturesResult.count,
      templateContracts: templateContractsResult.count,
      uploadedContracts: uploadedContractsResult.count,
      activeUsers: activeUsersQuery.length,
    });
  } catch (error) {
    console.error('[ADMIN] Usage stats error:', error);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});

// GET /api/admin/analytics/timeline
router.get('/timeline', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const timeline = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [contractsResult] = await db
        .select({ count: count() })
        .from(contracts)
        .where(
          and(
            gte(contracts.createdAt, date),
            lte(contracts.createdAt, nextDate)
          )
        );

      const [analysesResult] = await db
        .select({ count: count() })
        .from(contractAnalyses)
        .where(
          and(
            gte(contractAnalyses.createdAt, date),
            lte(contractAnalyses.createdAt, nextDate)
          )
        );

      timeline.push({
        date: date.toISOString().split('T')[0],
        contracts: contractsResult.count,
        analyses: analysesResult.count,
      });
    }

    res.json({ timeline });
  } catch (error) {
    console.error('[ADMIN] Timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// GET /api/admin/analytics/templates
router.get('/templates', async (req, res) => {
  try {
    // Get template usage counts
    const templateUsage = await db
      .select({
        templateId: contracts.templateId,
        count: count(),
      })
      .from(contracts)
      .where(sql`${contracts.templateId} IS NOT NULL`)
      .groupBy(contracts.templateId)
      .orderBy(desc(count()));

    // Get template names
    const templatesWithNames = await Promise.all(
      templateUsage.map(async (usage) => {
        const template = await db.query.templates.findFirst({
          where: eq(templates.id, usage.templateId!),
          columns: { id: true, name: true, category: true },
        });

        return {
          id: usage.templateId,
          name: template?.name || 'Unknown',
          category: template?.category || 'Unknown',
          usageCount: usage.count,
        };
      })
    );

    res.json({ templates: templatesWithNames.slice(0, 10) });
  } catch (error) {
    console.error('[ADMIN] Template usage error:', error);
    res.status(500).json({ error: 'Failed to fetch template usage' });
  }
});

// GET /api/admin/analytics/engagement
router.get('/engagement', async (req, res) => {
  try {
    // Total users
    const [totalUsers] = await db.select({ count: count() }).from(users);

    // Users with at least one contract
    const usersWithContracts = await db
      .selectDistinct({ userId: contracts.userId })
      .from(contracts);

    // Users who used AI analysis
    const usersWithAnalysis = await db
      .selectDistinctOn([contracts.userId], { userId: contracts.userId })
      .from(contracts)
      .innerJoin(contractAnalyses, eq(contracts.id, contractAnalyses.contractId));

    // Users who used e-signing
    const usersWithSigning = await db
      .selectDistinct({ userId: signatureRequests.initiatorId })
      .from(signatureRequests);

    const total = totalUsers.count;

    res.json({
      totalUsers: total,
      usersWithContracts: usersWithContracts.length,
      usersWithAnalysis: usersWithAnalysis.length,
      usersWithSigning: usersWithSigning.length,
      contractAdoptionRate: total > 0
        ? ((usersWithContracts.length / total) * 100).toFixed(1)
        : 0,
      aiAdoptionRate: total > 0
        ? ((usersWithAnalysis.length / total) * 100).toFixed(1)
        : 0,
      signingAdoptionRate: total > 0
        ? ((usersWithSigning.length / total) * 100).toFixed(1)
        : 0,
    });
  } catch (error) {
    console.error('[ADMIN] Engagement error:', error);
    res.status(500).json({ error: 'Failed to fetch engagement' });
  }
});

export default router;
```

#### Usage Statistics Page

```tsx
// client/src/pages/admin/UsageStatistics.tsx
import { useState, useEffect } from 'react';
import { FileText, Brain, PenTool, Users, TrendingUp } from 'lucide-react';
import { StatCard } from '../../components/admin/StatCard';
import { UsageChart } from '../../components/admin/UsageChart';
import { TemplateUsageTable } from '../../components/admin/TemplateUsageTable';

interface UsageStats {
  contractsCreated: number;
  aiAnalyses: number;
  signaturesCompleted: number;
  templateContracts: number;
  uploadedContracts: number;
  activeUsers: number;
}

interface Engagement {
  totalUsers: number;
  usersWithContracts: number;
  usersWithAnalysis: number;
  usersWithSigning: number;
  contractAdoptionRate: string;
  aiAdoptionRate: string;
  signingAdoptionRate: string;
}

export function UsageStatistics() {
  const [period, setPeriod] = useState('month');
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [timeline, setTimeline] = useState([]);
  const [templateUsage, setTemplateUsage] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [usageRes, engagementRes, timelineRes, templatesRes] = await Promise.all([
        fetch(`/api/admin/analytics/usage?period=${period}`, { credentials: 'include' }),
        fetch('/api/admin/analytics/engagement', { credentials: 'include' }),
        fetch('/api/admin/analytics/timeline?days=30', { credentials: 'include' }),
        fetch('/api/admin/analytics/templates', { credentials: 'include' }),
      ]);

      if (usageRes.ok) setUsage(await usageRes.json());
      if (engagementRes.ok) setEngagement(await engagementRes.json());
      if (timelineRes.ok) {
        const data = await timelineRes.json();
        setTimeline(data.timeline);
      }
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplateUsage(data.templates);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {['week', 'month', 'year'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-medium ${
              period === p
                ? 'bg-burgundy text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            This {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Contracts Created"
          value={usage?.contractsCreated || 0}
          icon={FileText}
          color="burgundy"
        />
        <StatCard
          title="AI Analyses"
          value={usage?.aiAnalyses || 0}
          icon={Brain}
          color="purple"
        />
        <StatCard
          title="Signatures"
          value={usage?.signaturesCompleted || 0}
          icon={PenTool}
          color="blue"
        />
        <StatCard
          title="From Templates"
          value={usage?.templateContracts || 0}
          icon={FileText}
          color="green"
        />
        <StatCard
          title="Uploads"
          value={usage?.uploadedContracts || 0}
          icon={FileText}
          color="gray"
        />
        <StatCard
          title="Active Users"
          value={usage?.activeUsers || 0}
          icon={Users}
          color="blue"
        />
      </div>

      {/* Engagement Metrics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Feature Adoption</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Contract Creation</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{engagement?.contractAdoptionRate}%</span>
              <span className="text-sm text-gray-500">
                ({engagement?.usersWithContracts} of {engagement?.totalUsers} users)
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-burgundy rounded-full"
                style={{ width: `${engagement?.contractAdoptionRate || 0}%` }}
              />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">AI Analysis</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{engagement?.aiAdoptionRate}%</span>
              <span className="text-sm text-gray-500">
                ({engagement?.usersWithAnalysis} users)
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-purple-500 rounded-full"
                style={{ width: `${engagement?.aiAdoptionRate || 0}%` }}
              />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">E-Signing</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{engagement?.signingAdoptionRate}%</span>
              <span className="text-sm text-gray-500">
                ({engagement?.usersWithSigning} users)
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-blue-500 rounded-full"
                style={{ width: `${engagement?.signingAdoptionRate || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Daily Activity (30 days)</h2>
          <UsageChart data={timeline} isLoading={isLoading} />
        </div>

        {/* Template Usage */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Popular Templates</h2>
          <TemplateUsageTable templates={templateUsage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
```

#### Usage Chart Component

```tsx
// client/src/components/admin/UsageChart.tsx
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  date: string;
  contracts: number;
  analyses: number;
}

interface Props {
  data: DataPoint[];
  isLoading?: boolean;
}

export function UsageChart({ data, isLoading }: Props) {
  if (isLoading) {
    return <div className="h-64 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB')}
          />
          <Area
            type="monotone"
            dataKey="contracts"
            stackId="1"
            stroke="#722F37"
            fill="#722F37"
            fillOpacity={0.6}
            name="Contracts"
          />
          <Area
            type="monotone"
            dataKey="analyses"
            stackId="2"
            stroke="#8B5CF6"
            fill="#8B5CF6"
            fillOpacity={0.6}
            name="AI Analyses"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

## Definition of Done

- [ ] All usage metrics display
- [ ] Period selector works
- [ ] Activity timeline chart renders
- [ ] Template usage breakdown shows
- [ ] Engagement rates calculated
- [ ] Responsive layout

## Testing Checklist

### Integration Tests

- [ ] Usage API
- [ ] Timeline API
- [ ] Template usage API
- [ ] Engagement API

### Visual Tests

- [ ] Charts render correctly
- [ ] Progress bars display properly

## Related Documents

- [Epic 6 Tech Spec](./tech-spec-epic-6.md)
- [Story 6.2: Admin Overview Dashboard](./6-2-admin-overview-dashboard.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create usage statistics API endpoint**
  - [ ] Implement GET `/api/admin/analytics/usage` endpoint
  - [ ] Support period filters (week, month, year)
  - [ ] Calculate contracts created in period
  - [ ] Calculate AI analyses performed
  - [ ] Calculate signatures completed
  - [ ] Calculate template vs uploaded contract split
  - [ ] Calculate active users count
  - [ ] Test usage calculations for different periods

- [ ] **Task 2: Create timeline API endpoint**
  - [ ] Implement GET `/api/admin/analytics/timeline` endpoint
  - [ ] Generate daily activity data for specified days
  - [ ] Track contracts and analyses per day
  - [ ] Test timeline data generation

- [ ] **Task 3: Create template usage API endpoint**
  - [ ] Implement GET `/api/admin/analytics/templates` endpoint
  - [ ] Count usage per template
  - [ ] Join with template names and categories
  - [ ] Return top 10 most popular templates
  - [ ] Test template usage ranking

- [ ] **Task 4: Create engagement metrics API**
  - [ ] Implement GET `/api/admin/analytics/engagement` endpoint
  - [ ] Calculate feature adoption rates
  - [ ] Count users who used contracts, AI, and e-signing
  - [ ] Calculate percentage adoption for each feature
  - [ ] Test engagement calculations

- [ ] **Task 5: Build UsageChart component**
  - [ ] Create area chart using recharts library
  - [ ] Display contracts and analyses over time
  - [ ] Add loading and empty states
  - [ ] Test chart rendering

- [ ] **Task 6: Build TemplateUsageTable component**
  - [ ] Create table showing popular templates
  - [ ] Display template name, category, and usage count
  - [ ] Add loading state
  - [ ] Test table rendering

- [ ] **Task 7: Build UsageStatistics page**
  - [ ] Implement data fetching for all analytics endpoints
  - [ ] Add period selector (week/month/year)
  - [ ] Create stat cards grid for usage metrics
  - [ ] Build feature adoption section with progress bars
  - [ ] Integrate usage chart
  - [ ] Integrate template usage table
  - [ ] Test responsive layout and period switching

- [ ] **Task 8: Mount analytics routes and testing**
  - [ ] Add analytics routes to admin router
  - [ ] Test all usage metrics display
  - [ ] Test period filtering
  - [ ] Verify adoption rate calculations
  - [ ] Test charts and tables

---

## Dev Agent Record

### Debug Log
<!-- Automatically updated by dev agent during implementation -->

### Completion Notes
<!-- Summary of implementation, decisions made, any follow-ups needed -->

---

## File List

| Action | File Path |
|--------|-----------|
| | |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| | | |
