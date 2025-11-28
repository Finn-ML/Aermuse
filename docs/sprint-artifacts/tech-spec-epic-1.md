# Epic Technical Specification: Authentication & Security Hardening

Date: 2025-11-28
Author: finn
Epic ID: 1
Status: Draft

---

## Overview

Epic 1 addresses critical security vulnerabilities and missing account management features in the Aermuse authentication system. The existing implementation uses SHA-256 password hashing which is inadequate for production security. This epic upgrades to bcrypt (industry standard), implements password reset via email, adds email verification for new accounts, enables password changes from settings, provides account deletion (GDPR compliance), and establishes an admin role system.

This is a **P0 (Critical)** epic with no external dependencies, making it the ideal starting point for MVP development. Completing this epic secures the platform foundation before adding revenue-generating features.

## Objectives and Scope

### In Scope

- Replace SHA-256 password hashing with bcrypt (cost factor 12)
- Implement gradual password migration for existing users on next login
- Build complete password reset flow with secure email tokens
- Add email verification system for new account registration
- Create settings-based password change functionality
- Implement soft-delete account deletion with 30-day grace period
- Add role field to users table for admin access control
- Create `requireAdmin` middleware for protected routes
- Integrate Postmark for transactional emails (password reset, verification)
- Upgrade session storage to PostgreSQL (connect-pg-simple)
- Implement rate limiting on auth endpoints

### Out of Scope

- Two-factor authentication (future enhancement)
- OAuth/social login providers (future enhancement)
- Password complexity rules beyond minimum length (MVP simplicity)
- Admin user management UI (Epic 6)
- Subscription-based feature gating (Epic 5)

## System Architecture Alignment

This epic aligns with the following architectural decisions:

| ADR | Application |
|-----|-------------|
| ADR-001: Password Hashing | bcrypt with cost factor 12 replaces SHA-256 |
| ADR-004: Session Storage | Upgrade to connect-pg-simple for persistence |
| ADR-005: Admin Role Management | Role field on users table ('user', 'admin') |
| ADR-007: Rate Limiting | express-rate-limit on auth endpoints (5 req/15 min) |

**External Integration:** Postmark for transactional email (Welcome, Password Reset, Email Verification templates)

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Location |
|----------------|----------------|----------|
| `auth.ts` (routes) | Login, register, logout, password endpoints | `server/routes/auth.ts` |
| `hashPassword()` | bcrypt hashing with cost 12 | `server/lib/auth.ts` |
| `comparePassword()` | bcrypt verification + legacy migration | `server/lib/auth.ts` |
| `generateToken()` | Crypto-secure token generation | `server/lib/auth.ts` |
| `postmark.ts` (service) | Email sending via Postmark API | `server/services/postmark.ts` |
| `requireAuth` | Session authentication middleware | `server/middleware/auth.ts` |
| `requireAdmin` | Admin role check middleware | `server/middleware/auth.ts` |
| `authLimiter` | Rate limiting middleware | `server/middleware/rateLimit.ts` |

### Data Models and Contracts

#### Users Table Extensions

```sql
-- New columns for Epic 1
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN email_verification_token VARCHAR;
ALTER TABLE users ADD COLUMN password_reset_token VARCHAR;
ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;
```

#### Session Table (New)

```sql
CREATE TABLE user_sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX idx_session_expire ON user_sessions(expire);
```

#### Updated Drizzle Schema

```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  artistName: text("artist_name"),
  avatarInitials: text("avatar_initials"),
  plan: text("plan").default("free"),
  // New Epic 1 fields
  role: text("role").default("user"),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token"),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### APIs and Interfaces

| Method | Path | Description | Auth | Request | Response |
|--------|------|-------------|------|---------|----------|
| POST | `/api/auth/register` | Create account | None | `{email, password, name}` | `{user}` |
| POST | `/api/auth/login` | Authenticate | None | `{email, password}` | `{user}` |
| POST | `/api/auth/logout` | End session | Auth | - | `{success}` |
| POST | `/api/auth/forgot-password` | Request reset | None | `{email}` | `{message}` |
| POST | `/api/auth/reset-password` | Set new password | None | `{token, password}` | `{success}` |
| POST | `/api/auth/verify-email` | Verify email | None | `{token}` | `{success}` |
| POST | `/api/auth/resend-verification` | Resend email | Auth | - | `{message}` |
| PATCH | `/api/auth/password` | Change password | Auth | `{currentPassword, newPassword}` | `{success}` |
| DELETE | `/api/auth/account` | Delete account | Auth | `{password}` | `{success}` |
| GET | `/api/auth/me` | Current user | Auth | - | `{user}` |

**Error Responses:**
```typescript
// 400 Bad Request
{ error: "Validation failed", details: { email: "Invalid email format" } }

// 401 Unauthorized
{ error: "Invalid credentials" }
{ error: "Authentication required" }

// 403 Forbidden
{ error: "Email not verified" }
{ error: "Admin access required" }

// 404 Not Found
{ error: "User not found" }

// 429 Too Many Requests
{ error: "Too many attempts. Try again later." }
```

### Workflows and Sequencing

#### Password Reset Flow

```
User                    Frontend              Backend                Postmark
 │                         │                     │                      │
 ├──Forgot Password───────▶│                     │                      │
 │                         ├──POST /forgot-pw───▶│                      │
 │                         │                     ├──Generate Token──────┤
 │                         │                     ├──Store Token+Expiry──┤
 │                         │                     ├──Send Email─────────▶│
 │                         │◀──{message}─────────┤                      │
 │◀──Email with Link───────┼─────────────────────┼──────────────────────┤
 │                         │                     │                      │
 ├──Click Reset Link──────▶│                     │                      │
 │                         ├──GET /reset?token=──▶│                     │
 │                         │◀──Token Valid────────┤                     │
 │                         │                     │                      │
 ├──Enter New Password────▶│                     │                      │
 │                         ├──POST /reset-pw────▶│                      │
 │                         │                     ├──Validate Token──────┤
 │                         │                     ├──Hash New Password───┤
 │                         │                     ├──Clear Token─────────┤
 │                         │◀──{success}─────────┤                      │
 │◀──Redirect to Login─────┤                     │                      │
```

#### bcrypt Migration Flow (Login)

```
1. User submits login credentials
2. Fetch user from database
3. Check password length:
   - If 64 chars (SHA-256 hex): Use legacy comparison
   - If starts with $2b$ (bcrypt): Use bcrypt comparison
4. If legacy password matches:
   a. Hash password with bcrypt
   b. Update user.password in database
   c. Log migration event
5. Create session and return user
```

## Non-Functional Requirements

### Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Login latency | < 500ms | bcrypt cost 12 adds ~200ms |
| Password reset email | < 5s | Postmark API async |
| Session lookup | < 50ms | PostgreSQL indexed |
| Rate limit response | < 10ms | In-memory check |

### Security

- **Password Storage:** bcrypt with cost factor 12 (resistant to GPU attacks)
- **Token Generation:** `crypto.randomBytes(32).toString('hex')` (256-bit entropy)
- **Token Expiry:** Password reset: 1 hour, Email verification: 24 hours
- **Session Security:** httpOnly, secure (prod), sameSite: 'lax', 7-day max age
- **Rate Limiting:** Auth endpoints: 5 requests per 15 minutes per IP
- **No Credential Logging:** Passwords never appear in logs
- **Soft Delete:** 30-day grace period before hard delete

### Reliability/Availability

- **Session Persistence:** PostgreSQL-backed sessions survive server restarts
- **Email Delivery:** Postmark 99.9% SLA, retry on 5xx errors
- **Graceful Degradation:** If email fails, user can retry; account still created
- **Migration Safety:** Legacy passwords continue working until migrated

### Observability

| Signal | Type | Context |
|--------|------|---------|
| `[AUTH] User login` | INFO | user_id, method |
| `[AUTH] Login failed` | WARN | email (hashed), reason |
| `[AUTH] Password migrated` | INFO | user_id |
| `[AUTH] Password reset requested` | INFO | user_id |
| `[AUTH] Account deleted` | INFO | user_id, soft/hard |
| `[EMAIL] Send failed` | ERROR | template, recipient, error |

## Dependencies and Integrations

### New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `bcrypt` | ^5.1.1 | Password hashing |
| `connect-pg-simple` | ^9.0.1 | PostgreSQL session store |
| `postmark` | ^4.0.2 | Transactional email |
| `express-rate-limit` | ^7.1.5 | Rate limiting |

### Existing Dependencies (Used)

| Package | Purpose |
|---------|---------|
| `express-session` | Session management |
| `crypto` (Node built-in) | Token generation |
| `drizzle-orm` | Database operations |

### External Services

| Service | Purpose | Required Setup |
|---------|---------|----------------|
| Postmark | Email delivery | Account, API key, sender domain verification |
| PostgreSQL (Neon) | Session storage | Already configured |

### Environment Variables

```bash
# New for Epic 1
POSTMARK_API_KEY=xxxx-xxxx-xxxx
SESSION_SECRET=<32+ character random string>
BASE_URL=https://aermuse.replit.app

# Admin seeding (optional)
ADMIN_EMAIL=admin@example.com
```

## Acceptance Criteria (Authoritative)

1. **AC-1.1.1:** New user registrations hash passwords with bcrypt (cost 12)
2. **AC-1.1.2:** Existing SHA-256 passwords are automatically migrated to bcrypt on successful login
3. **AC-1.1.3:** Login works seamlessly during the migration period (both hash types)
4. **AC-1.2.1:** "Forgot Password" link appears on login page
5. **AC-1.2.2:** Password reset email is sent within 5 seconds of request
6. **AC-1.2.3:** Reset tokens expire after 1 hour
7. **AC-1.2.4:** Invalid/expired tokens show appropriate error message
8. **AC-1.2.5:** After reset, user is redirected to login page
9. **AC-1.3.1:** Verification email sent automatically on registration
10. **AC-1.3.2:** Clicking verification link marks email_verified = true
11. **AC-1.3.3:** Unverified users see reminder banner in dashboard
12. **AC-1.3.4:** Resend verification option available
13. **AC-1.4.1:** "Change Password" section exists in settings
14. **AC-1.4.2:** Current password required before change
15. **AC-1.4.3:** Minimum 8 characters enforced for new password
16. **AC-1.4.4:** Session remains active after password change
17. **AC-1.5.1:** Delete account option in settings with warning
18. **AC-1.5.2:** Password confirmation required for deletion
19. **AC-1.5.3:** Soft delete with deleted_at timestamp (30-day grace)
20. **AC-1.5.4:** Confirmation email sent on deletion
21. **AC-1.6.1:** Role field added to users table (values: 'user', 'admin')
22. **AC-1.6.2:** requireAdmin middleware blocks non-admin access to /api/admin/*
23. **AC-1.6.3:** First admin can be seeded via environment variable

## Traceability Mapping

| AC | Spec Section | Component | Test Idea |
|----|--------------|-----------|-----------|
| AC-1.1.1 | Data Models | hashPassword() | Unit: verify bcrypt hash format |
| AC-1.1.2 | Workflows | comparePassword() | Integration: login with SHA-256, verify migrated |
| AC-1.1.3 | Workflows | comparePassword() | Integration: login with both hash types |
| AC-1.2.1 | APIs | Login page | E2E: verify link visible |
| AC-1.2.2 | APIs, NFR | POST /forgot-password | Integration: mock Postmark, verify call |
| AC-1.2.3 | Data Models | password_reset_expires | Unit: token validation with expired date |
| AC-1.2.4 | APIs | POST /reset-password | Integration: expired token returns 400 |
| AC-1.2.5 | Workflows | Reset flow | E2E: complete flow, verify redirect |
| AC-1.3.1 | APIs | POST /register | Integration: verify email sent |
| AC-1.3.2 | APIs | POST /verify-email | Integration: verify email_verified = true |
| AC-1.3.3 | - | Dashboard component | E2E: verify banner for unverified user |
| AC-1.3.4 | APIs | POST /resend-verification | Integration: verify email resent |
| AC-1.4.1 | - | Settings page | E2E: verify section exists |
| AC-1.4.2 | APIs | PATCH /password | Integration: wrong current password returns 401 |
| AC-1.4.3 | APIs | PATCH /password | Unit: validation rejects < 8 chars |
| AC-1.4.4 | APIs | PATCH /password | Integration: session still valid after |
| AC-1.5.1 | - | Settings page | E2E: verify option with warning |
| AC-1.5.2 | APIs | DELETE /account | Integration: wrong password returns 401 |
| AC-1.5.3 | Data Models | deleted_at | Integration: verify soft delete |
| AC-1.5.4 | APIs, NFR | DELETE /account | Integration: verify email sent |
| AC-1.6.1 | Data Models | users.role | Unit: schema includes role |
| AC-1.6.2 | Services | requireAdmin | Integration: non-admin gets 403 |
| AC-1.6.3 | - | Seed script | Manual: verify admin created |

## Risks, Assumptions, Open Questions

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| bcrypt adds latency to login | Low | Low | Cost 12 is ~200ms, acceptable |
| Email delivery failures | Low | Medium | Retry logic, user can resend |
| Session table growth | Low | Low | Cleanup expired sessions daily |
| Password migration edge cases | Low | Medium | Thorough testing, logging |

### Assumptions

- **A1:** Postmark account will be set up before development starts
- **A2:** Single admin initially is sufficient; UI management in Epic 6
- **A3:** Users can still use the platform while unverified (verification for future gating)
- **A4:** 30-day soft delete grace period is acceptable for GDPR compliance

### Open Questions

- **Q1:** Should verification be required for any specific actions in MVP? (Current: No)
- **Q2:** Email template designs - use Postmark templates or custom HTML? (Recommend: Postmark templates for MVP speed)
- **Q3:** Should we implement data export before deletion for GDPR? (Recommend: Add as Story 1.5 enhancement)

## Test Strategy Summary

### Unit Tests

- `hashPassword()`: Verify bcrypt format, cost factor
- `comparePassword()`: Test bcrypt match, legacy migration
- `generateToken()`: Verify length, randomness
- Validation schemas: Password length, email format

### Integration Tests

- Auth endpoints with test database
- Rate limiting behavior
- Session persistence across restarts
- Postmark API mocking

### E2E Tests (Manual for MVP)

- Complete password reset flow
- Email verification flow
- Account deletion with confirmation
- Admin route protection

### Security Review

- Verify no credentials in logs
- Test rate limiting prevents brute force
- Confirm token entropy is sufficient
- Validate session cookie settings
