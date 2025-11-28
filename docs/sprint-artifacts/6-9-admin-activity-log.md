# Story 6.9: Admin Activity Log

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 6.9 |
| **Epic** | Epic 6: Admin Dashboard |
| **Title** | Admin Activity Log |
| **Priority** | P2 - Medium |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As an** admin
**I want** to see admin actions logged
**So that** there's an audit trail

## Context

For security and accountability, all admin actions should be logged. This creates an audit trail of who did what and when, which is important for compliance and troubleshooting.

**Dependencies:**
- Story 6.1 (Admin Layout)
- All other admin stories (they log activities)

## Acceptance Criteria

- [ ] **AC-1:** Log admin actions: user edits, template changes, settings updates
- [ ] **AC-2:** Timestamp and admin user recorded
- [ ] **AC-3:** IP address recorded
- [ ] **AC-4:** View recent admin activity
- [ ] **AC-5:** Filter by action type
- [ ] **AC-6:** Filter by admin user
- [ ] **AC-7:** Filter by date range
- [ ] **AC-8:** Exportable log (CSV)
- [ ] **AC-9:** Pagination for large logs

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/db/schema/admin.ts` | Activity log table (already defined) |
| `server/services/adminActivity.ts` | Activity logging service |
| `server/routes/admin/activity.ts` | New: Activity API |
| `client/src/pages/admin/ActivityLog.tsx` | New: Activity log page |
| `client/src/components/admin/ActivityTable.tsx` | New: Activity table |

### Implementation

#### Activity Logging Service

```typescript
// server/services/adminActivity.ts
import { db } from '../db';
import { adminActivityLog } from '../db/schema/admin';
import { Request } from 'express';

export type AdminAction =
  | 'user.view'
  | 'user.update'
  | 'user.role_change'
  | 'user.subscription_adjust'
  | 'contract.view'
  | 'template.create'
  | 'template.update'
  | 'template.delete'
  | 'template.toggle'
  | 'settings.update'
  | 'export.users'
  | 'export.contracts'
  | 'export.subscriptions'
  | 'export.activity';

export type EntityType = 'user' | 'contract' | 'template' | 'setting' | 'export';

interface LogActivityOptions {
  req: Request;
  action: AdminAction;
  entityType: EntityType;
  entityId?: string;
  details?: Record<string, any>;
}

export async function logAdminActivity(options: LogActivityOptions) {
  const { req, action, entityType, entityId, details } = options;
  const adminId = req.session?.userId;

  if (!adminId) {
    console.warn('[ADMIN ACTIVITY] No admin ID in session');
    return;
  }

  // Get IP address
  const ipAddress =
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
    req.socket.remoteAddress ||
    null;

  try {
    await db.insert(adminActivityLog).values({
      adminId,
      action,
      entityType,
      entityId: entityId || null,
      details: details || null,
      ipAddress,
    });

    console.log(
      `[ADMIN ACTIVITY] ${action} on ${entityType}${entityId ? `:${entityId}` : ''} by ${adminId}`
    );
  } catch (error) {
    console.error('[ADMIN ACTIVITY] Failed to log:', error);
    // Don't throw - logging failure shouldn't break the operation
  }
}

// Action descriptions for display
export const ACTION_DESCRIPTIONS: Record<AdminAction, string> = {
  'user.view': 'Viewed user details',
  'user.update': 'Updated user',
  'user.role_change': 'Changed user role',
  'user.subscription_adjust': 'Adjusted user subscription',
  'contract.view': 'Viewed contract',
  'template.create': 'Created template',
  'template.update': 'Updated template',
  'template.delete': 'Deleted template',
  'template.toggle': 'Toggled template status',
  'settings.update': 'Updated system setting',
  'export.users': 'Exported users',
  'export.contracts': 'Exported contracts',
  'export.subscriptions': 'Exported subscriptions',
  'export.activity': 'Exported activity log',
};
```

#### Activity API

```typescript
// server/routes/admin/activity.ts
import { Router } from 'express';
import { db } from '../../db';
import { adminActivityLog } from '../../db/schema/admin';
import { users } from '../../db/schema/users';
import { eq, desc, and, gte, lte, count } from 'drizzle-orm';
import { logAdminActivity, ACTION_DESCRIPTIONS } from '../../services/adminActivity';

const router = Router();

// GET /api/admin/activity
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;
    const action = req.query.action as string;
    const adminId = req.query.adminId as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    // Build conditions
    const conditions = [];

    if (action) {
      conditions.push(eq(adminActivityLog.action, action));
    }

    if (adminId) {
      conditions.push(eq(adminActivityLog.adminId, adminId));
    }

    if (dateFrom) {
      conditions.push(gte(adminActivityLog.createdAt, new Date(dateFrom)));
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(adminActivityLog.createdAt, endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total
    const [totalResult] = await db
      .select({ count: count() })
      .from(adminActivityLog)
      .where(whereClause);

    // Get activities with admin info
    const activities = await db
      .select({
        id: adminActivityLog.id,
        action: adminActivityLog.action,
        entityType: adminActivityLog.entityType,
        entityId: adminActivityLog.entityId,
        details: adminActivityLog.details,
        ipAddress: adminActivityLog.ipAddress,
        createdAt: adminActivityLog.createdAt,
        adminId: adminActivityLog.adminId,
        adminName: users.name,
        adminEmail: users.email,
      })
      .from(adminActivityLog)
      .leftJoin(users, eq(adminActivityLog.adminId, users.id))
      .where(whereClause)
      .orderBy(desc(adminActivityLog.createdAt))
      .limit(limit)
      .offset(offset);

    // Add action descriptions
    const activitiesWithDescriptions = activities.map((a) => ({
      ...a,
      actionDescription: ACTION_DESCRIPTIONS[a.action as keyof typeof ACTION_DESCRIPTIONS] || a.action,
    }));

    res.json({
      activities: activitiesWithDescriptions,
      pagination: {
        page,
        limit,
        total: totalResult.count,
        totalPages: Math.ceil(totalResult.count / limit),
      },
    });
  } catch (error) {
    console.error('[ADMIN] Activity log error:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

// GET /api/admin/activity/actions
router.get('/actions', async (req, res) => {
  // Return list of action types for filter dropdown
  res.json({
    actions: Object.entries(ACTION_DESCRIPTIONS).map(([value, label]) => ({
      value,
      label,
    })),
  });
});

// GET /api/admin/activity/admins
router.get('/admins', async (req, res) => {
  try {
    // Get distinct admins who have activity
    const admins = await db
      .selectDistinctOn([adminActivityLog.adminId], {
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(adminActivityLog)
      .leftJoin(users, eq(adminActivityLog.adminId, users.id));

    res.json({ admins });
  } catch (error) {
    console.error('[ADMIN] Activity admins error:', error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// GET /api/admin/activity/export
router.get('/export', async (req, res) => {
  try {
    const activities = await db
      .select({
        id: adminActivityLog.id,
        action: adminActivityLog.action,
        entityType: adminActivityLog.entityType,
        entityId: adminActivityLog.entityId,
        details: adminActivityLog.details,
        ipAddress: adminActivityLog.ipAddress,
        createdAt: adminActivityLog.createdAt,
        adminEmail: users.email,
      })
      .from(adminActivityLog)
      .leftJoin(users, eq(adminActivityLog.adminId, users.id))
      .orderBy(desc(adminActivityLog.createdAt))
      .limit(10000);

    const headers = ['id', 'action', 'entity_type', 'entity_id', 'admin_email', 'ip_address', 'created_at', 'details'];
    const rows = activities.map((a) => [
      a.id,
      a.action,
      a.entityType,
      a.entityId || '',
      a.adminEmail || '',
      a.ipAddress || '',
      a.createdAt?.toISOString() || '',
      a.details ? JSON.stringify(a.details) : '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    await logAdminActivity({
      req,
      action: 'export.activity',
      entityType: 'export',
      details: { count: activities.length },
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=activity-log-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('[ADMIN] Export activity error:', error);
    res.status(500).json({ error: 'Failed to export activity' });
  }
});

export default router;
```

#### Activity Log Page

```tsx
// client/src/pages/admin/ActivityLog.tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Filter, Calendar } from 'lucide-react';
import { ActivityTable } from '../../components/admin/ActivityTable';
import { Pagination } from '../../components/common/Pagination';

interface Activity {
  id: string;
  action: string;
  actionDescription: string;
  entityType: string;
  entityId: string | null;
  details: any;
  ipAddress: string | null;
  createdAt: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
}

interface ActionOption {
  value: string;
  label: string;
}

interface AdminOption {
  id: string;
  name: string;
  email: string;
}

export function ActivityLog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [actions, setActions] = useState<ActionOption[]>([]);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters from URL
  const action = searchParams.get('action') || '';
  const adminId = searchParams.get('adminId') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [action, adminId, dateFrom, dateTo, page]);

  const fetchFilterOptions = async () => {
    const [actionsRes, adminsRes] = await Promise.all([
      fetch('/api/admin/activity/actions', { credentials: 'include' }),
      fetch('/api/admin/activity/admins', { credentials: 'include' }),
    ]);

    if (actionsRes.ok) {
      const data = await actionsRes.json();
      setActions(data.actions);
    }
    if (adminsRes.ok) {
      const data = await adminsRes.json();
      setAdmins(data.admins);
    }
  };

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (adminId) params.set('adminId', adminId);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      params.set('page', String(page));

      const response = await fetch(`/api/admin/activity?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
        setPagination(data.pagination);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    const response = await fetch('/api/admin/activity/export', {
      credentials: 'include',
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-log-${Date.now()}.csv`;
      a.click();
    }
  };

  const updateFilter = (key: string, value: string) => {
    setSearchParams((prev) => {
      if (value) {
        prev.set(key, value);
      } else {
        prev.delete(key);
      }
      prev.set('page', '1');
      return prev;
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap gap-4">
          {/* Action Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              value={action}
              onChange={(e) => updateFilter('action', e.target.value)}
              className="px-3 py-2 border rounded-lg min-w-[200px]"
            >
              <option value="">All Actions</option>
              {actions.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Admin Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin
            </label>
            <select
              value={adminId}
              onChange={(e) => updateFilter('adminId', e.target.value)}
              className="px-3 py-2 border rounded-lg min-w-[200px]"
            >
              <option value="">All Admins</option>
              {admins.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name || a.email}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Export */}
          <div className="flex items-end">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <ActivityTable activities={activities} isLoading={isLoading} />

        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(newPage) => updateFilter('page', String(newPage))}
            />
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500">
        Showing {activities.length} of {pagination.total} activities
      </p>
    </div>
  );
}
```

#### Activity Table Component

```tsx
// client/src/components/admin/ActivityTable.tsx
import { Link } from 'react-router-dom';
import {
  User,
  FileText,
  FileEdit,
  Settings,
  Download,
  Eye,
  Edit,
  Trash2,
  ToggleRight,
} from 'lucide-react';

interface Activity {
  id: string;
  action: string;
  actionDescription: string;
  entityType: string;
  entityId: string | null;
  details: any;
  ipAddress: string | null;
  createdAt: string;
  adminName: string;
  adminEmail: string;
}

interface Props {
  activities: Activity[];
  isLoading?: boolean;
}

export function ActivityTable({ activities, isLoading }: Props) {
  const getActionIcon = (action: string) => {
    if (action.includes('view')) return Eye;
    if (action.includes('update') || action.includes('change')) return Edit;
    if (action.includes('delete')) return Trash2;
    if (action.includes('toggle')) return ToggleRight;
    if (action.includes('export')) return Download;
    if (action.includes('user')) return User;
    if (action.includes('template')) return FileEdit;
    if (action.includes('contract')) return FileText;
    if (action.includes('settings')) return Settings;
    return Eye;
  };

  const getEntityLink = (entityType: string, entityId: string | null) => {
    if (!entityId) return null;

    const links: Record<string, string> = {
      user: `/admin/users/${entityId}`,
      contract: `/admin/contracts/${entityId}`,
      template: `/admin/templates/${entityId}/edit`,
    };

    return links[entityType];
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse p-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b">
            <div className="w-8 h-8 bg-gray-200 rounded" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No activity found
      </div>
    );
  }

  return (
    <div className="divide-y">
      {activities.map((activity) => {
        const Icon = getActionIcon(activity.action);
        const entityLink = getEntityLink(activity.entityType, activity.entityId);

        return (
          <div key={activity.id} className="flex items-start gap-4 p-4 hover:bg-gray-50">
            <div className="p-2 bg-gray-100 rounded">
              <Icon className="h-4 w-4 text-gray-600" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">
                {activity.actionDescription}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <span>{activity.adminName || activity.adminEmail}</span>
                <span>•</span>
                {entityLink ? (
                  <Link to={entityLink} className="text-burgundy hover:underline">
                    {activity.entityType}: {activity.entityId?.slice(0, 8)}...
                  </Link>
                ) : activity.entityId ? (
                  <span>{activity.entityType}: {activity.entityId.slice(0, 8)}...</span>
                ) : (
                  <span>{activity.entityType}</span>
                )}
              </div>
              {activity.details && Object.keys(activity.details).length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  {JSON.stringify(activity.details).slice(0, 100)}
                  {JSON.stringify(activity.details).length > 100 ? '...' : ''}
                </p>
              )}
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-sm text-gray-500">{formatTime(activity.createdAt)}</p>
              {activity.ipAddress && (
                <p className="text-xs text-gray-400">{activity.ipAddress}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

## Definition of Done

- [ ] Activity table created in database
- [ ] All admin actions logged
- [ ] Activity log page displays entries
- [ ] Filter by action type works
- [ ] Filter by admin works
- [ ] Filter by date range works
- [ ] Pagination works
- [ ] CSV export works
- [ ] IP addresses recorded

## Testing Checklist

### Unit Tests

- [ ] logAdminActivity function
- [ ] Action descriptions

### Integration Tests

- [ ] Activity API
- [ ] Filters work correctly
- [ ] Export generates valid CSV

### E2E Tests

- [ ] Perform admin action → verify logged
- [ ] Filter activity log
- [ ] Export activity log

## Related Documents

- [Epic 6 Tech Spec](./tech-spec-epic-6.md)
- [Story 6.3: User Management](./6-3-user-management.md)
- [Story 6.8: System Configuration](./6-8-system-configuration.md)
