# Epic 6: Admin Dashboard

## Epic Overview

| Field | Value |
|-------|-------|
| **Epic ID** | EPIC-006 |
| **Title** | Admin Dashboard |
| **Priority** | P1 - High |
| **Estimated Effort** | 3-4 days |
| **Dependencies** | Epic 1 (Admin Role) |

## Description

Build a comprehensive admin dashboard for platform operators to manage users, view contracts across the platform, manage template catalogue, track subscriptions, and monitor system health.

## Business Value

- Operational visibility into platform usage
- User support and management capabilities
- Content management for templates
- Business metrics for decision-making

## Acceptance Criteria

- [ ] Admin-only access with role-based protection
- [ ] User management with search/filter
- [ ] View all contracts across platform
- [ ] Template catalogue CRUD operations
- [ ] Subscription and revenue metrics
- [ ] Platform usage statistics

---

## User Stories

### Story 6.1: Admin Layout & Navigation

**As an** admin
**I want** a dedicated admin dashboard layout
**So that** I can access admin functions efficiently

**Acceptance Criteria:**
- [ ] Separate admin route (`/admin`)
- [ ] Admin sidebar navigation
- [ ] Sections: Overview, Users, Contracts, Templates, Subscriptions, Settings
- [ ] Role check on all admin routes
- [ ] Redirect non-admins to regular dashboard
- [ ] Clean, data-focused design

**Story Points:** 3

---

### Story 6.2: Admin Overview Dashboard

**As an** admin
**I want** to see key metrics at a glance
**So that** I understand platform health

**Acceptance Criteria:**
- [ ] Total users (with trend)
- [ ] Active subscribers (with trend)
- [ ] Total contracts (with trend)
- [ ] Pending signatures count
- [ ] Revenue this month
- [ ] Recent activity feed
- [ ] Quick action buttons

**Story Points:** 3

---

### Story 6.3: User Management

**As an** admin
**I want** to view and manage users
**So that** I can provide support and oversight

**Acceptance Criteria:**
- [ ] User list with pagination
- [ ] Search by email or name
- [ ] Filter by subscription status, role
- [ ] View user details: profile, subscription, contracts count
- [ ] Edit user role (user/admin)
- [ ] Manually adjust subscription (extend/cancel)
- [ ] Impersonate user (stretch - for support)
- [ ] Export user list (CSV)

**Story Points:** 5

---

### Story 6.4: Contract Overview (Admin)

**As an** admin
**I want** to view all contracts on the platform
**So that** I can monitor usage and troubleshoot

**Acceptance Criteria:**
- [ ] Contract list with pagination
- [ ] Search by title, user email, party name
- [ ] Filter by status, type, date range
- [ ] View contract details (read-only)
- [ ] See AI analysis results
- [ ] See signature status
- [ ] Export contracts report (CSV)
- [ ] Cannot edit user contracts (view only)

**Story Points:** 4

---

### Story 6.5: Template Catalogue Management

**As an** admin
**I want** to manage contract templates
**So that** the template library stays current

**Acceptance Criteria:**
- [ ] Template list view
- [ ] Create new template
- [ ] Edit existing template
- [ ] Template editor with:
  - Name, description, category
  - Rich text content editor
  - Field definitions (JSON or visual)
  - Optional clause management
- [ ] Preview template as user would see it
- [ ] Activate/deactivate templates
- [ ] Reorder templates (drag and drop)
- [ ] Clone template for variations
- [ ] Version history (stretch)

**Story Points:** 8

---

### Story 6.6: Subscription Metrics

**As an** admin
**I want** to see subscription analytics
**So that** I can track business performance

**Acceptance Criteria:**
- [ ] Total active subscriptions
- [ ] Monthly recurring revenue (MRR)
- [ ] New subscriptions this month
- [ ] Churn rate
- [ ] Subscription timeline chart
- [ ] Subscriber list with quick access
- [ ] Failed payment alerts
- [ ] Export subscription report

**Story Points:** 4

---

### Story 6.7: Platform Usage Statistics

**As an** admin
**I want** to see usage statistics
**So that** I understand how the platform is used

**Acceptance Criteria:**
- [ ] Contracts created (daily/weekly/monthly)
- [ ] AI analyses performed
- [ ] E-signatures completed
- [ ] Template usage breakdown
- [ ] Popular templates
- [ ] User engagement metrics
- [ ] Charts/graphs visualization

**Story Points:** 4

---

### Story 6.8: System Configuration

**As an** admin
**I want** to configure platform settings
**So that** I can adjust system behavior

**Acceptance Criteria:**
- [ ] Platform name/branding settings
- [ ] Default subscription trial length (future)
- [ ] AI analysis limits per user
- [ ] Signature request expiry default
- [ ] Email notification toggles
- [ ] Maintenance mode toggle
- [ ] Settings persisted to database

**Story Points:** 3

---

### Story 6.9: Admin Activity Log

**As an** admin
**I want** to see admin actions logged
**So that** there's an audit trail

**Acceptance Criteria:**
- [ ] Log admin actions: user edits, template changes, etc.
- [ ] Timestamp and admin user recorded
- [ ] View recent admin activity
- [ ] Filter by action type
- [ ] Exportable log

**Story Points:** 3

---

## Total Story Points: 37

## Definition of Done

- [ ] All admin sections functional
- [ ] Role-based access enforced
- [ ] Data displays correctly with pagination
- [ ] Search/filter working
- [ ] Template management complete
- [ ] Metrics accurate
- [ ] Mobile-responsive (stretch)
