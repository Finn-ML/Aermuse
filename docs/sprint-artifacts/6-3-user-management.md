# Story 6.3: User Management

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 6.3 |
| **Epic** | Epic 6: Admin Dashboard |
| **Title** | User Management |
| **Priority** | P1 - High |
| **Story Points** | 5 |
| **Status** | Drafted |

## User Story

**As an** admin
**I want** to view and manage users
**So that** I can provide support and oversight

## Context

Admins need to view all users, search/filter them, view details, edit roles, and adjust subscriptions. This is a core admin function for customer support and platform management.

**Dependencies:**
- Story 6.1 (Admin Layout)
- Epic 1 (User/Admin roles)
- Epic 5 (Subscription data)

## Acceptance Criteria

- [ ] **AC-1:** User list with pagination (20 per page)
- [ ] **AC-2:** Search by email or name
- [ ] **AC-3:** Filter by subscription status, role
- [ ] **AC-4:** View user details: profile, subscription, contracts count
- [ ] **AC-5:** Edit user role (user/admin)
- [ ] **AC-6:** Manually adjust subscription (extend/cancel)
- [ ] **AC-7:** Export user list (CSV)
- [ ] **AC-8:** Admin activity logged for changes

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/routes/admin/users.ts` | New: User management API |
| `client/src/pages/admin/UserManagement.tsx` | New: User list page |
| `client/src/pages/admin/UserDetail.tsx` | New: User detail page |
| `client/src/components/admin/UserTable.tsx` | New: User table component |
| `client/src/components/admin/UserFilters.tsx` | New: Filter controls |

### Implementation

#### User Management API

```typescript
// server/routes/admin/users.ts
import { Router } from 'express';
import { db } from '../../db';
import { users } from '../../db/schema/users';
import { contracts } from '../../db/schema/contracts';
import { eq, ilike, or, count, desc, sql, and } from 'drizzle-orm';
import { logAdminActivity } from '../../services/adminActivity';

const router = Router();

// GET /api/admin/users - List users with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const role = req.query.role as string;
    const subscriptionStatus = req.query.subscriptionStatus as string;

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(users.email, `%${search}%`),
          ilike(users.name, `%${search}%`)
        )
      );
    }

    if (role === 'admin') {
      conditions.push(eq(users.isAdmin, true));
    } else if (role === 'user') {
      conditions.push(eq(users.isAdmin, false));
    }

    if (subscriptionStatus) {
      conditions.push(eq(users.subscriptionStatus, subscriptionStatus));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    // Get users
    const userList = await db.query.users.findMany({
      where: whereClause,
      orderBy: desc(users.createdAt),
      limit,
      offset,
      columns: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAdmin: true,
        emailVerified: true,
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
        createdAt: true,
      },
    });

    res.json({
      users: userList,
      pagination: {
        page,
        limit,
        total: totalResult.count,
        totalPages: Math.ceil(totalResult.count / limit),
      },
    });
  } catch (error) {
    console.error('[ADMIN] List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// GET /api/admin/users/:id - Get user details
router.get('/:id', async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.params.id),
      columns: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAdmin: true,
        emailVerified: true,
        subscriptionStatus: true,
        subscriptionPriceId: true,
        subscriptionCurrentPeriodEnd: true,
        subscriptionCancelAtPeriodEnd: true,
        stripeCustomerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get contract count
    const [contractsResult] = await db
      .select({ count: count() })
      .from(contracts)
      .where(eq(contracts.userId, user.id));

    // Log view activity
    await logAdminActivity({
      req,
      action: 'user.view',
      entityType: 'user',
      entityId: user.id,
    });

    res.json({
      ...user,
      contractsCount: contractsResult.count,
    });
  } catch (error) {
    console.error('[ADMIN] Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// PATCH /api/admin/users/:id - Update user
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isAdmin, role } = req.body;

    // Prevent removing own admin status
    if (id === req.session.userId && isAdmin === false) {
      return res.status(400).json({ error: 'Cannot remove your own admin status' });
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (isAdmin !== undefined) {
      updateData.isAdmin = isAdmin;
      updateData.role = isAdmin ? 'admin' : 'user';
    } else if (role !== undefined) {
      updateData.role = role;
      updateData.isAdmin = role === 'admin';
    }

    await db.update(users).set(updateData).where(eq(users.id, id));

    // Log activity
    await logAdminActivity({
      req,
      action: 'user.role_change',
      entityType: 'user',
      entityId: id,
      details: { newRole: updateData.role, isAdmin: updateData.isAdmin },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[ADMIN] Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// PATCH /api/admin/users/:id/subscription - Adjust subscription
router.patch('/:id/subscription', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, days } = req.body;

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: {
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let updateData: Record<string, any> = { updatedAt: new Date() };

    switch (action) {
      case 'extend':
        // Extend subscription by X days
        const currentEnd = user.subscriptionCurrentPeriodEnd || new Date();
        const newEnd = new Date(currentEnd);
        newEnd.setDate(newEnd.getDate() + (days || 30));
        updateData.subscriptionCurrentPeriodEnd = newEnd;
        updateData.subscriptionStatus = 'active';
        break;

      case 'activate':
        // Activate subscription for 30 days
        const activateEnd = new Date();
        activateEnd.setDate(activateEnd.getDate() + 30);
        updateData.subscriptionStatus = 'active';
        updateData.subscriptionCurrentPeriodEnd = activateEnd;
        updateData.subscriptionCancelAtPeriodEnd = false;
        break;

      case 'cancel':
        // Cancel subscription immediately
        updateData.subscriptionStatus = 'canceled';
        updateData.subscriptionCancelAtPeriodEnd = true;
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    await db.update(users).set(updateData).where(eq(users.id, id));

    // Log activity
    await logAdminActivity({
      req,
      action: 'user.subscription_adjust',
      entityType: 'user',
      entityId: id,
      details: { action, days, newStatus: updateData.subscriptionStatus },
    });

    res.json({ success: true, message: `Subscription ${action}d successfully` });
  } catch (error) {
    console.error('[ADMIN] Adjust subscription error:', error);
    res.status(500).json({ error: 'Failed to adjust subscription' });
  }
});

// GET /api/admin/users/export - Export users CSV
router.get('/export/csv', async (req, res) => {
  try {
    const allUsers = await db.query.users.findMany({
      orderBy: desc(users.createdAt),
      columns: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAdmin: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    });

    // Generate CSV
    const headers = ['id', 'email', 'name', 'role', 'is_admin', 'subscription_status', 'created_at'];
    const rows = allUsers.map((u) => [
      u.id,
      u.email,
      u.name,
      u.role,
      u.isAdmin,
      u.subscriptionStatus || 'none',
      u.createdAt?.toISOString() || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Log export
    await logAdminActivity({
      req,
      action: 'export.users',
      entityType: 'export',
      details: { count: allUsers.length },
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=users-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('[ADMIN] Export users error:', error);
    res.status(500).json({ error: 'Failed to export users' });
  }
});

export default router;
```

#### User Table Component

```tsx
// client/src/components/admin/UserTable.tsx
import { Link } from 'react-router-dom';
import { MoreVertical, Shield, ShieldOff } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
  emailVerified: boolean;
  subscriptionStatus: string | null;
  createdAt: string;
}

interface Props {
  users: User[];
  isLoading?: boolean;
}

export function UserTable({ users, isLoading }: Props) {
  const getStatusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      trialing: 'bg-blue-100 text-blue-800',
      past_due: 'bg-red-100 text-red-800',
      canceled: 'bg-gray-100 text-gray-800',
      none: 'bg-gray-100 text-gray-500',
    };

    const displayStatus = status || 'none';
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[displayStatus] || styles.none}`}>
        {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No users found matching your criteria
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Subscription
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Joined
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-4 py-4">
                <Link to={`/admin/users/${user.id}`} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-burgundy/10 rounded-full flex items-center justify-center">
                    <span className="text-burgundy font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </Link>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-1">
                  {user.isAdmin ? (
                    <>
                      <Shield className="h-4 w-4 text-burgundy" />
                      <span className="text-sm font-medium text-burgundy">Admin</span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-600">User</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-4">
                {getStatusBadge(user.subscriptionStatus)}
              </td>
              <td className="px-4 py-4 text-sm text-gray-600">
                {formatDate(user.createdAt)}
              </td>
              <td className="px-4 py-4 text-right">
                <Link
                  to={`/admin/users/${user.id}`}
                  className="text-burgundy hover:text-burgundy-dark text-sm font-medium"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### User Filters Component

```tsx
// client/src/components/admin/UserFilters.tsx
import { Search, Filter, Download } from 'lucide-react';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  role: string;
  onRoleChange: (value: string) => void;
  subscriptionStatus: string;
  onSubscriptionStatusChange: (value: string) => void;
  onExport: () => void;
}

export function UserFilters({
  search,
  onSearchChange,
  role,
  onRoleChange,
  subscriptionStatus,
  onSubscriptionStatusChange,
  onExport,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy"
        />
      </div>

      {/* Role Filter */}
      <select
        value={role}
        onChange={(e) => onRoleChange(e.target.value)}
        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy"
      >
        <option value="">All Roles</option>
        <option value="user">Users</option>
        <option value="admin">Admins</option>
      </select>

      {/* Subscription Filter */}
      <select
        value={subscriptionStatus}
        onChange={(e) => onSubscriptionStatusChange(e.target.value)}
        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy"
      >
        <option value="">All Subscriptions</option>
        <option value="active">Active</option>
        <option value="trialing">Trialing</option>
        <option value="past_due">Past Due</option>
        <option value="canceled">Canceled</option>
        <option value="none">Free</option>
      </select>

      {/* Export Button */}
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
      >
        <Download className="h-4 w-4" />
        Export
      </button>
    </div>
  );
}
```

#### User Management Page

```tsx
// client/src/pages/admin/UserManagement.tsx
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserTable } from '../../components/admin/UserTable';
import { UserFilters } from '../../components/admin/UserFilters';
import { Pagination } from '../../components/common/Pagination';
import { debounce } from '../../utils/debounce';

export function UserManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Get filters from URL
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const subscriptionStatus = searchParams.get('subscriptionStatus') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (role) params.set('role', role);
      if (subscriptionStatus) params.set('subscriptionStatus', subscriptionStatus);
      params.set('page', String(page));

      const response = await fetch(`/api/admin/users?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [search, role, subscriptionStatus, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchParams((prev) => {
        if (value) {
          prev.set('search', value);
        } else {
          prev.delete('search');
        }
        prev.set('page', '1');
        return prev;
      });
    }, 300),
    []
  );

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/users/export/csv', {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div>
      <UserFilters
        search={search}
        onSearchChange={debouncedSearch}
        role={role}
        onRoleChange={(value) => {
          setSearchParams((prev) => {
            if (value) prev.set('role', value);
            else prev.delete('role');
            prev.set('page', '1');
            return prev;
          });
        }}
        subscriptionStatus={subscriptionStatus}
        onSubscriptionStatusChange={(value) => {
          setSearchParams((prev) => {
            if (value) prev.set('subscriptionStatus', value);
            else prev.delete('subscriptionStatus');
            prev.set('page', '1');
            return prev;
          });
        }}
        onExport={handleExport}
      />

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <UserTable users={users} isLoading={isLoading} />

        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(newPage) => {
                setSearchParams((prev) => {
                  prev.set('page', String(newPage));
                  return prev;
                });
              }}
            />
          </div>
        )}
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Showing {users.length} of {pagination.total} users
      </p>
    </div>
  );
}
```

## Definition of Done

- [ ] User list displays with pagination
- [ ] Search by email/name works
- [ ] Filter by role works
- [ ] Filter by subscription status works
- [ ] User detail page shows all info
- [ ] Role editing works
- [ ] Subscription adjustment works
- [ ] CSV export works
- [ ] Activity logged for all changes

## Testing Checklist

### Unit Tests

- [ ] Filter logic
- [ ] CSV generation
- [ ] Pagination calculation

### Integration Tests

- [ ] List users API
- [ ] Search functionality
- [ ] Role update
- [ ] Subscription adjustment

### E2E Tests

- [ ] Search and filter users
- [ ] View user details
- [ ] Change user role
- [ ] Export user list

## Related Documents

- [Epic 6 Tech Spec](./tech-spec-epic-6.md)
- [Story 6.1: Admin Layout & Navigation](./6-1-admin-layout-and-navigation.md)
- [Story 6.9: Admin Activity Log](./6-9-admin-activity-log.md)
