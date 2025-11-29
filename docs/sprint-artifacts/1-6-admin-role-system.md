# Story 1.6: Admin Role System

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 1.6 |
| **Epic** | Epic 1: Authentication & Security |
| **Title** | Admin Role System |
| **Priority** | P1 - High |
| **Story Points** | 5 |
| **Status** | Drafted |

## User Story

**As a** platform administrator
**I want** role-based access control
**So that** I can access admin features while regular users cannot

## Context

The admin role system establishes the foundation for the admin dashboard (Epic 6) and enables privileged operations like user management, template management, and platform configuration. This story implements the role field, middleware protection, and initial admin seeding.

**Dependencies:**
- Story 1.1 (bcrypt) for admin account password hashing
- No other Epic 1 dependencies

## Acceptance Criteria

- [ ] **AC-1:** Role field added to users table with values 'user' (default) and 'admin'
- [ ] **AC-2:** `requireAdmin` middleware blocks non-admin access to /api/admin/* routes
- [ ] **AC-3:** Non-admin users receive 403 Forbidden for admin routes
- [ ] **AC-4:** Admin role can be seeded via environment variable on first startup
- [ ] **AC-5:** Current user API returns role field
- [ ] **AC-6:** Admin status visible in user session/context
- [ ] **AC-7:** Role cannot be changed via regular user endpoints

## Technical Requirements

### Database Schema

```typescript
// shared/schema.ts
export const users = pgTable("users", {
  // ... existing fields
  role: text("role").default("user"), // 'user' | 'admin'
});

// Type for role values
export type UserRole = 'user' | 'admin';
```

### Files to Create/Modify

| File | Changes |
|------|---------|
| `shared/schema.ts` | Add role field to users table |
| `server/middleware/auth.ts` | Add requireAdmin middleware |
| `server/routes/auth.ts` | Include role in user responses |
| `server/scripts/seed-admin.ts` | New: Admin seeding script |
| `server/index.ts` | Run admin seeding on startup |
| `client/src/hooks/useUser.ts` | Include role in user type |
| `client/src/context/AuthContext.tsx` | Include role in auth context |

### Implementation Details

#### 1. Updated Drizzle Schema

```typescript
// shared/schema.ts
import { pgTable, text, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  artistName: text("artist_name"),
  avatarInitials: text("avatar_initials"),
  plan: text("plan").default("free"),
  // Epic 1 fields
  role: text("role").default("user"),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token"),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// TypeScript types
export type UserRole = 'user' | 'admin';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

#### 2. Auth Middleware

```typescript
// server/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Extend Express session
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

// Extend Express request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
      };
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Load user for downstream use
  const user = await db.query.users.findFirst({
    where: eq(users.id, req.session.userId),
    columns: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  });

  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user;
  next();
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // First ensure user is authenticated
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Load user if not already loaded
  if (!req.user) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.session.userId),
      columns: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
  }

  // Check admin role
  if (req.user.role !== 'admin') {
    console.log(`[AUTH] Admin access denied for user ${req.user.id}`);
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}
```

#### 3. Admin Seeding Script

```typescript
// server/scripts/seed-admin.ts
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../lib/auth';

export async function seedAdmin(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Admin';

  if (!adminEmail) {
    console.log('[SEED] No ADMIN_EMAIL set, skipping admin seeding');
    return;
  }

  if (!adminPassword) {
    console.error('[SEED] ADMIN_EMAIL set but ADMIN_PASSWORD missing');
    return;
  }

  // Check if admin already exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, adminEmail)
  });

  if (existing) {
    if (existing.role === 'admin') {
      console.log('[SEED] Admin user already exists');
    } else {
      // Upgrade existing user to admin
      await db.update(users)
        .set({ role: 'admin' })
        .where(eq(users.id, existing.id));
      console.log(`[SEED] Upgraded existing user ${adminEmail} to admin`);
    }
    return;
  }

  // Create new admin user
  const hashedPassword = await hashPassword(adminPassword);

  await db.insert(users).values({
    email: adminEmail,
    password: hashedPassword,
    name: adminName,
    role: 'admin',
    emailVerified: true, // Admin is auto-verified
  });

  console.log(`[SEED] Created admin user: ${adminEmail}`);
}
```

#### 4. Server Startup Integration

```typescript
// server/index.ts - Add to startup
import { seedAdmin } from './scripts/seed-admin';

// After database connection is established
await seedAdmin();
```

#### 5. Update Auth Routes

```typescript
// server/routes/auth.ts

// GET /api/auth/me - Include role
app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, req.session.userId),
    columns: {
      id: true,
      email: true,
      name: true,
      artistName: true,
      avatarInitials: true,
      plan: true,
      role: true,
      emailVerified: true,
      createdAt: true
    }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});

// POST /api/auth/login - Include role in response
app.post('/api/auth/login', authLimiter, async (req, res) => {
  // ... authentication logic ...

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified
    }
  });
});

// Protect admin routes
app.use('/api/admin', requireAdmin);

// Example admin route (placeholder for Epic 6)
app.get('/api/admin/stats', async (req, res) => {
  const userCount = await db.select({ count: sql`count(*)` })
    .from(users)
    .where(isNull(users.deletedAt));

  res.json({
    users: Number(userCount[0].count),
    // More stats will be added in Epic 6
  });
});
```

#### 6. Frontend Auth Context

```typescript
// client/src/types/user.ts
export interface User {
  id: string;
  email: string;
  name: string;
  artistName?: string;
  avatarInitials?: string;
  plan: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  createdAt: string;
}

// client/src/context/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.role === 'admin';

  // ... rest of implementation
}

// client/src/hooks/useAuth.ts
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Usage in components:
// const { user, isAdmin } = useAuth();
// if (isAdmin) { /* show admin UI */ }
```

#### 7. Admin Route Protection (Frontend)

```tsx
// client/src/components/AdminRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface Props {
  children: React.ReactNode;
}

export function AdminRoute({ children }: Props) {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Usage in App.tsx:
// <Route path="/admin/*" element={<AdminRoute><AdminLayout /></AdminRoute>} />
```

## Definition of Done

- [ ] Role field added to database schema
- [ ] Database migration applied
- [ ] requireAdmin middleware created
- [ ] Non-admin requests get 403
- [ ] Admin seeding works via env vars
- [ ] User API responses include role
- [ ] Auth context includes isAdmin helper
- [ ] AdminRoute component created
- [ ] Placeholder admin route works

## Testing Checklist

### Unit Tests

- [ ] requireAdmin rejects non-admin users with 403
- [ ] requireAdmin passes admin users through
- [ ] requireAuth loads user with role

### Integration Tests

- [ ] Admin seed creates user with admin role
- [ ] Admin seed upgrades existing user to admin
- [ ] /api/admin/* routes require admin role
- [ ] Regular user gets 403 on admin routes
- [ ] Admin user can access admin routes
- [ ] Login response includes role
- [ ] /api/auth/me returns role

### E2E Tests

- [ ] Admin can access /admin/* routes
- [ ] Regular user redirected from /admin/*
- [ ] Role persists across page refresh

## Environment Variables

```bash
# Admin seeding (set before first startup)
ADMIN_EMAIL=admin@aermuse.com
ADMIN_PASSWORD=<secure-password>
ADMIN_NAME=Platform Admin
```

## Security Considerations

- Role can only be set via database or seeding script
- No API endpoint to change role (admin management in Epic 6)
- Role checked on every admin request, not cached in session
- Admin actions should be logged (future enhancement)

## Related Documents

- [Epic 1 Tech Spec](./tech-spec-epic-1.md)
- [Epic 6: Admin Dashboard](../epics/epic-6-admin-dashboard.md)
- [Architecture: Admin Role System](../architecture.md#adr-005-admin-role-management)

---

## Tasks/Subtasks

- [ ] **Task 1: Update database schema**
  - [ ] Add `role` text field to users table (default 'user')
  - [ ] Update Drizzle schema in `shared/schema.ts`
  - [ ] Add UserRole type export
  - [ ] Run migration

- [ ] **Task 2: Create auth middleware**
  - [ ] Create `server/middleware/auth.ts` file
  - [ ] Implement `requireAuth` middleware with user loading
  - [ ] Implement `requireAdmin` middleware with 403 for non-admins
  - [ ] Add Express type extensions for user on request

- [ ] **Task 3: Create admin seeding script**
  - [ ] Create `server/scripts/seed-admin.ts`
  - [ ] Read ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME from env
  - [ ] Check for existing admin and skip if present
  - [ ] Create or upgrade user to admin role
  - [ ] Hash password with bcrypt

- [ ] **Task 4: Integrate seeding with server startup**
  - [ ] Import seedAdmin in `server/index.ts`
  - [ ] Call seedAdmin after database connection
  - [ ] Log seeding results

- [ ] **Task 5: Update auth routes**
  - [ ] Include role in /api/auth/me response
  - [ ] Include role in login response
  - [ ] Apply requireAdmin to /api/admin/* routes
  - [ ] Create placeholder /api/admin/stats route

- [ ] **Task 6: Update frontend auth**
  - [ ] Add role to User type
  - [ ] Add isAdmin computed property to AuthContext
  - [ ] Create AdminRoute component for route protection
  - [ ] Export useAuth hook with isAdmin

- [ ] **Task 7: Write tests**
  - [ ] Unit tests for requireAdmin middleware
  - [ ] Integration tests for admin seeding
  - [ ] Integration tests for admin route protection
  - [ ] E2E test for admin access flow

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
