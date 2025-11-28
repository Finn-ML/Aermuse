# Epic 6: Admin Dashboard - Technical Specification

## Overview

This epic implements a comprehensive admin dashboard for platform operators to manage users, view contracts, manage templates, track subscriptions, and monitor system health. The admin dashboard is a separate section with its own layout, protected by role-based access control.

## Architecture

### Admin Route Structure

```
/admin                    → Admin Overview Dashboard
/admin/users              → User Management
/admin/users/:id          → User Detail View
/admin/contracts          → Contract Overview
/admin/contracts/:id      → Contract Detail View
/admin/templates          → Template Management
/admin/templates/new      → Create Template
/admin/templates/:id/edit → Edit Template
/admin/subscriptions      → Subscription Metrics
/admin/analytics          → Platform Usage Statistics
/admin/settings           → System Configuration
/admin/activity           → Admin Activity Log
```

### Component Architecture

```
AdminLayout
├── AdminSidebar
│   ├── Navigation Links
│   └── User Info
├── AdminHeader
│   ├── Page Title
│   └── Quick Actions
└── AdminContent
    └── [Page Component]

Pages:
├── AdminOverview
├── UserManagement
├── ContractOverview
├── TemplateManagement
├── SubscriptionMetrics
├── UsageStatistics
├── SystemSettings
└── ActivityLog
```

### Database Schema Additions

```sql
-- System Settings table
CREATE TABLE system_settings (
  id VARCHAR(36) PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(36) REFERENCES users(id)
);

-- Admin Activity Log table
CREATE TABLE admin_activity_log (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id VARCHAR(36) NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36),
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_admin_activity_admin ON admin_activity_log(admin_id);
CREATE INDEX idx_admin_activity_action ON admin_activity_log(action);
CREATE INDEX idx_admin_activity_entity ON admin_activity_log(entity_type, entity_id);
CREATE INDEX idx_admin_activity_created ON admin_activity_log(created_at DESC);
```

### Drizzle Schema

```typescript
// server/db/schema/admin.ts
import { pgTable, varchar, text, jsonb, timestamp, inet, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const systemSettings = pgTable('system_settings', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  updatedBy: varchar('updated_by', { length: 36 }).references(() => users.id),
});

export const adminActivityLog = pgTable(
  'admin_activity_log',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    adminId: varchar('admin_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    action: varchar('action', { length: 50 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 36 }),
    details: jsonb('details'),
    ipAddress: inet('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    adminIdx: index('idx_admin_activity_admin').on(table.adminId),
    actionIdx: index('idx_admin_activity_action').on(table.action),
    entityIdx: index('idx_admin_activity_entity').on(table.entityType, table.entityId),
    createdIdx: index('idx_admin_activity_created').on(table.createdAt),
  })
);

// Types
export type SystemSetting = typeof systemSettings.$inferSelect;
export type AdminActivity = typeof adminActivityLog.$inferSelect;
```

## API Design

### Admin Middleware

```typescript
// server/middleware/requireAdmin.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { isAdmin: true, role: true },
  });

  if (!user?.isAdmin && user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}
```

### Admin Routes Structure

```typescript
// server/routes/admin/index.ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/requireAdmin';

import overviewRoutes from './overview';
import usersRoutes from './users';
import contractsRoutes from './contracts';
import templatesRoutes from './templates';
import subscriptionsRoutes from './subscriptions';
import analyticsRoutes from './analytics';
import settingsRoutes from './settings';
import activityRoutes from './activity';

const router = Router();

// All admin routes require auth + admin
router.use(requireAuth, requireAdmin);

router.use('/overview', overviewRoutes);
router.use('/users', usersRoutes);
router.use('/contracts', contractsRoutes);
router.use('/templates', templatesRoutes);
router.use('/subscriptions', subscriptionsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/settings', settingsRoutes);
router.use('/activity', activityRoutes);

export default router;
```

### API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/overview/stats` | GET | Dashboard metrics |
| `/api/admin/overview/activity` | GET | Recent activity |
| `/api/admin/users` | GET | List users (paginated) |
| `/api/admin/users/:id` | GET | Get user details |
| `/api/admin/users/:id` | PATCH | Update user |
| `/api/admin/users/:id/subscription` | PATCH | Adjust subscription |
| `/api/admin/users/export` | GET | Export users CSV |
| `/api/admin/contracts` | GET | List all contracts |
| `/api/admin/contracts/:id` | GET | Contract details |
| `/api/admin/contracts/export` | GET | Export contracts CSV |
| `/api/admin/templates` | GET | List templates |
| `/api/admin/templates` | POST | Create template |
| `/api/admin/templates/:id` | GET | Get template |
| `/api/admin/templates/:id` | PUT | Update template |
| `/api/admin/templates/:id` | DELETE | Delete template |
| `/api/admin/templates/:id/toggle` | POST | Activate/deactivate |
| `/api/admin/templates/reorder` | POST | Reorder templates |
| `/api/admin/subscriptions/metrics` | GET | Subscription analytics |
| `/api/admin/subscriptions/list` | GET | Subscriber list |
| `/api/admin/subscriptions/export` | GET | Export report |
| `/api/admin/analytics/usage` | GET | Usage statistics |
| `/api/admin/analytics/templates` | GET | Template usage |
| `/api/admin/settings` | GET | Get all settings |
| `/api/admin/settings/:key` | PUT | Update setting |
| `/api/admin/activity` | GET | Activity log |
| `/api/admin/activity/export` | GET | Export activity log |

## Admin Activity Logging

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
  | 'export.subscriptions';

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
  const adminId = req.session.userId!;
  const ipAddress = req.ip || req.socket.remoteAddress;

  await db.insert(adminActivityLog).values({
    adminId,
    action,
    entityType,
    entityId,
    details: details || null,
    ipAddress,
  });

  console.log(`[ADMIN] ${action} on ${entityType}${entityId ? `:${entityId}` : ''} by ${adminId}`);
}
```

## Frontend Components

### Admin Layout

```tsx
// client/src/layouts/AdminLayout.tsx
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminHeader } from '../components/admin/AdminHeader';

export function AdminLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="lg:pl-64">
        <AdminHeader />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

### Admin Sidebar Navigation

```tsx
// Navigation items
const navigation = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Contracts', href: '/admin/contracts', icon: FileText },
  { name: 'Templates', href: '/admin/templates', icon: FileEdit },
  { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
  { name: 'Activity Log', href: '/admin/activity', icon: History },
];
```

## Metrics Calculations

### Overview Dashboard Metrics

```typescript
// server/routes/admin/overview.ts
export async function getDashboardStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Total users with trend
  const [totalUsers] = await db.select({ count: count() }).from(users);
  const [usersLastMonth] = await db
    .select({ count: count() })
    .from(users)
    .where(lt(users.createdAt, thirtyDaysAgo));

  // Active subscribers
  const [activeSubscribers] = await db
    .select({ count: count() })
    .from(users)
    .where(inArray(users.subscriptionStatus, ['active', 'trialing']));

  // Total contracts with trend
  const [totalContracts] = await db.select({ count: count() }).from(contracts);

  // Pending signatures
  const [pendingSignatures] = await db
    .select({ count: count() })
    .from(signatureRequests)
    .where(eq(signatureRequests.status, 'pending'));

  // Revenue this month (calculated from Stripe or local tracking)
  // ...

  return {
    totalUsers: { value: totalUsers.count, trend: calculateTrend(...) },
    activeSubscribers: { value: activeSubscribers.count, trend: ... },
    totalContracts: { value: totalContracts.count, trend: ... },
    pendingSignatures: pendingSignatures.count,
    monthlyRevenue: { value: revenue, currency: 'GBP' },
  };
}
```

### Subscription Metrics

```typescript
// Key subscription metrics
interface SubscriptionMetrics {
  totalActive: number;
  mrr: number; // Monthly Recurring Revenue
  newThisMonth: number;
  cancelledThisMonth: number;
  churnRate: number; // (cancelled / total at start) * 100
  failedPayments: number;
  timeline: {
    date: string;
    active: number;
    new: number;
    cancelled: number;
  }[];
}
```

## CSV Export Format

### Users Export

```csv
id,email,name,role,subscription_status,created_at,contracts_count
uuid-1,user@example.com,John Doe,user,active,2024-01-15,5
uuid-2,admin@example.com,Admin User,admin,none,2024-01-10,0
```

### Contracts Export

```csv
id,title,user_email,status,type,created_at,has_ai_analysis,signature_status
uuid-1,Artist Agreement,user@example.com,signed,template,2024-02-01,true,completed
uuid-2,Custom Contract,other@example.com,draft,upload,2024-02-15,false,none
```

## System Settings Schema

```typescript
// Default system settings
const defaultSettings = {
  'platform.name': 'Aermuse',
  'platform.maintenance_mode': false,
  'subscription.trial_days': 0,
  'ai.daily_limit_free': 0,
  'ai.daily_limit_premium': 100,
  'signature.default_expiry_days': 30,
  'email.notifications_enabled': true,
  'email.marketing_enabled': false,
};
```

## Story Breakdown

| Story | Points | Dependencies |
|-------|--------|--------------|
| 6.1 Admin Layout & Navigation | 3 | Epic 1 (Admin Role) |
| 6.2 Admin Overview Dashboard | 3 | 6.1 |
| 6.3 User Management | 5 | 6.1 |
| 6.4 Contract Overview Admin | 4 | 6.1 |
| 6.5 Template Catalogue Management | 8 | 6.1, Epic 3 |
| 6.6 Subscription Metrics | 4 | 6.1, Epic 5 |
| 6.7 Platform Usage Statistics | 4 | 6.1 |
| 6.8 System Configuration | 3 | 6.1 |
| 6.9 Admin Activity Log | 3 | 6.1 |

**Total: 37 story points**

## Security Considerations

1. **Role verification**: Every admin route must verify admin role
2. **Activity logging**: All admin actions are logged for audit
3. **No destructive operations**: Admins can't delete user data
4. **View-only contracts**: Admin can view but not edit user contracts
5. **IP logging**: Track admin session IPs for security audit
6. **Session management**: Admin sessions may have shorter expiry

## Related Documents

- [Epic 1: Authentication & Security](./tech-spec-epic-1.md) - Admin role foundation
- [Epic 3: Contract Templates](./tech-spec-epic-3.md) - Template structure
- [Epic 5: Subscription & Billing](./tech-spec-epic-5.md) - Subscription data
