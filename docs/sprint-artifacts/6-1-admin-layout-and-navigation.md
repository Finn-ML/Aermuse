# Story 6.1: Admin Layout & Navigation

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 6.1 |
| **Epic** | Epic 6: Admin Dashboard |
| **Title** | Admin Layout & Navigation |
| **Priority** | P1 - High |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As an** admin
**I want** a dedicated admin dashboard layout
**So that** I can access admin functions efficiently

## Context

The admin dashboard needs a separate layout from the regular user interface with its own navigation, styling, and structure. This layout will be the foundation for all admin pages. Only users with admin role should be able to access these routes.

**Dependencies:**
- Epic 1 (Admin Role System - Story 1.6)

## Acceptance Criteria

- [ ] **AC-1:** Admin routes at `/admin/*`
- [ ] **AC-2:** Admin sidebar navigation with all sections
- [ ] **AC-3:** Role check on all admin routes (backend + frontend)
- [ ] **AC-4:** Redirect non-admins to regular dashboard
- [ ] **AC-5:** Clean, data-focused design
- [ ] **AC-6:** Admin header with user info and quick actions
- [ ] **AC-7:** Mobile-responsive sidebar (collapsible)
- [ ] **AC-8:** Active route highlighting

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/middleware/requireAdmin.ts` | New: Admin role check middleware |
| `server/routes/admin/index.ts` | New: Admin routes aggregator |
| `client/src/layouts/AdminLayout.tsx` | New: Admin layout wrapper |
| `client/src/components/admin/AdminSidebar.tsx` | New: Sidebar navigation |
| `client/src/components/admin/AdminHeader.tsx` | New: Top header |
| `client/src/App.tsx` | Add admin routes |

### Implementation

#### Admin Middleware

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

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        isAdmin: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check admin status
    if (!user.isAdmin && user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED',
      });
    }

    // Attach admin info to request
    req.adminUser = {
      id: user.id,
      isAdmin: true,
    };

    next();
  } catch (error) {
    console.error('[ADMIN] Auth check error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

// Type augmentation
declare global {
  namespace Express {
    interface Request {
      adminUser?: {
        id: string;
        isAdmin: boolean;
      };
    }
  }
}
```

#### Admin Routes Aggregator

```typescript
// server/routes/admin/index.ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/requireAdmin';

const router = Router();

// Apply auth + admin middleware to all admin routes
router.use(requireAuth, requireAdmin);

// Health check for admin API
router.get('/health', (req, res) => {
  res.json({ status: 'ok', admin: true });
});

// Import and mount sub-routes as they're created
// router.use('/overview', overviewRoutes);
// router.use('/users', usersRoutes);
// router.use('/contracts', contractsRoutes);
// router.use('/templates', templatesRoutes);
// router.use('/subscriptions', subscriptionsRoutes);
// router.use('/analytics', analyticsRoutes);
// router.use('/settings', settingsRoutes);
// router.use('/activity', activityRoutes);

export default router;
```

#### Mount Admin Routes

```typescript
// server/index.ts
import adminRoutes from './routes/admin';

// Mount admin routes
app.use('/api/admin', adminRoutes);
```

#### Admin Layout

```tsx
// client/src/layouts/AdminLayout.tsx
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminHeader } from '../components/admin/AdminHeader';
import { Loader2 } from 'lucide-react';

export function AdminLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-burgundy" />
      </div>
    );
  }

  // Redirect non-admins
  if (!user?.isAdmin) {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main content area */}
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

#### Admin Sidebar

```tsx
// client/src/components/admin/AdminSidebar.tsx
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  FileEdit,
  CreditCard,
  BarChart3,
  Settings,
  History,
  Menu,
  X,
  Home,
} from 'lucide-react';

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

export function AdminSidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <div className="w-8 h-8 bg-burgundy rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <div>
          <span className="font-semibold text-white">Aermuse</span>
          <span className="ml-2 text-xs bg-burgundy/30 text-burgundy-light px-2 py-0.5 rounded">
            Admin
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors
                ${active
                  ? 'bg-burgundy text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Back to App */}
      <div className="px-4 py-4 border-t border-gray-700">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        >
          <Home className="h-5 w-5" />
          Back to App
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 text-white rounded-lg"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`
          lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 transform transition-transform
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="flex flex-col h-full">
          <NavContent />
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 bg-gray-800">
        <NavContent />
      </aside>
    </>
  );
}
```

#### Admin Header

```tsx
// client/src/components/admin/AdminHeader.tsx
import { useLocation, Link } from 'react-router-dom';
import { Bell, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard Overview',
  '/admin/users': 'User Management',
  '/admin/contracts': 'Contract Overview',
  '/admin/templates': 'Template Management',
  '/admin/subscriptions': 'Subscription Metrics',
  '/admin/analytics': 'Platform Analytics',
  '/admin/settings': 'System Settings',
  '/admin/activity': 'Activity Log',
};

export function AdminHeader() {
  const location = useLocation();
  const { user } = useAuth();

  // Get page title from path
  const getPageTitle = () => {
    const path = location.pathname;
    // Check exact match first
    if (pageTitles[path]) return pageTitles[path];
    // Check prefix matches for nested routes
    for (const [route, title] of Object.entries(pageTitles)) {
      if (path.startsWith(route) && route !== '/admin') {
        return title;
      }
    }
    return 'Admin';
  };

  // Generate breadcrumbs
  const getBreadcrumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Admin', href: '/admin' }];

    if (parts.length > 1) {
      const section = parts[1];
      const sectionName = section.charAt(0).toUpperCase() + section.slice(1);
      breadcrumbs.push({
        name: sectionName,
        href: `/admin/${section}`,
      });

      if (parts.length > 2) {
        breadcrumbs.push({
          name: parts[2] === 'new' ? 'New' : 'Details',
          href: location.pathname,
        });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-sm text-gray-500 mb-1">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.href} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="h-4 w-4" />}
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-gray-900">{crumb.name}</span>
                ) : (
                  <Link to={crumb.href} className="hover:text-gray-700">
                    {crumb.name}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          {/* Page title */}
          <h1 className="text-xl font-semibold text-gray-900">
            {getPageTitle()}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications (placeholder) */}
          <button className="p-2 text-gray-400 hover:text-gray-600 relative">
            <Bell className="h-5 w-5" />
            {/* Notification badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User info */}
          <div className="flex items-center gap-3 pl-4 border-l">
            <div className="w-8 h-8 bg-burgundy rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
```

#### Route Configuration

```tsx
// client/src/App.tsx - Add admin routes
import { AdminLayout } from './layouts/AdminLayout';
import { AdminOverview } from './pages/admin/Overview';
// ... other admin page imports

// In routes:
<Route path="/admin" element={<AdminLayout />}>
  <Route index element={<AdminOverview />} />
  <Route path="users" element={<UserManagement />} />
  <Route path="users/:id" element={<UserDetail />} />
  <Route path="contracts" element={<ContractOverview />} />
  <Route path="contracts/:id" element={<ContractDetail />} />
  <Route path="templates" element={<TemplateManagement />} />
  <Route path="templates/new" element={<TemplateEditor />} />
  <Route path="templates/:id/edit" element={<TemplateEditor />} />
  <Route path="subscriptions" element={<SubscriptionMetrics />} />
  <Route path="analytics" element={<UsageStatistics />} />
  <Route path="settings" element={<SystemSettings />} />
  <Route path="activity" element={<ActivityLog />} />
</Route>
```

#### Placeholder Overview Page

```tsx
// client/src/pages/admin/Overview.tsx
export function AdminOverview() {
  return (
    <div>
      <p className="text-gray-500">
        Dashboard overview coming in Story 6.2
      </p>
    </div>
  );
}
```

## Definition of Done

- [ ] Admin routes protected by middleware
- [ ] Non-admins redirected to dashboard
- [ ] Sidebar with all navigation links
- [ ] Active route highlighting works
- [ ] Mobile responsive sidebar
- [ ] Header shows breadcrumbs and page title
- [ ] Back to App link works
- [ ] All placeholder pages render

## Testing Checklist

### Unit Tests

- [ ] requireAdmin middleware
- [ ] isActive route matching
- [ ] Breadcrumb generation

### Integration Tests

- [ ] Non-admin user blocked from /admin
- [ ] Admin user can access /admin
- [ ] API returns 403 for non-admin

### E2E Tests

- [ ] Navigate through all admin sections
- [ ] Mobile sidebar opens/closes
- [ ] Non-admin redirect works

## Related Documents

- [Epic 6 Tech Spec](./tech-spec-epic-6.md)
- [Story 1.6: Admin Role System](./1-6-admin-role-system.md)
- [Story 6.2: Admin Overview Dashboard](./6-2-admin-overview-dashboard.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create admin authentication middleware**
  - [ ] Implement `requireAdmin` middleware in `server/middleware/requireAdmin.ts`
  - [ ] Add type augmentation for Express Request
  - [ ] Test middleware with admin and non-admin users
  - [ ] Add error handling for auth failures

- [ ] **Task 2: Set up admin route structure**
  - [ ] Create `server/routes/admin/index.ts` aggregator
  - [ ] Apply auth and admin middleware to all admin routes
  - [ ] Mount admin routes at `/api/admin` in main server
  - [ ] Add health check endpoint

- [ ] **Task 3: Build AdminLayout component**
  - [ ] Create `AdminLayout.tsx` with outlet and navigation
  - [ ] Implement role check and redirect logic
  - [ ] Add loading state handling
  - [ ] Test responsive layout structure

- [ ] **Task 4: Build AdminSidebar component**
  - [ ] Create navigation menu with all admin sections
  - [ ] Implement active route highlighting logic
  - [ ] Add mobile responsive sidebar with collapsible menu
  - [ ] Style with burgundy theme colors

- [ ] **Task 5: Build AdminHeader component**
  - [ ] Create header with breadcrumb navigation
  - [ ] Implement dynamic page title generation
  - [ ] Add user info and notification placeholder
  - [ ] Test breadcrumb generation for nested routes

- [ ] **Task 6: Configure admin routes in App.tsx**
  - [ ] Add admin route configuration with nested routes
  - [ ] Create placeholder Overview page component
  - [ ] Test route protection and redirects
  - [ ] Verify all navigation links work

- [ ] **Task 7: Integration testing and validation**
  - [ ] Test admin middleware blocks non-admin users
  - [ ] Test mobile sidebar functionality
  - [ ] Validate all navigation paths
  - [ ] Check responsive design on various screen sizes

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
