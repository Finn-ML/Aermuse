# Epic 1: Authentication & Security Hardening

## Epic Overview

| Field | Value |
|-------|-------|
| **Epic ID** | EPIC-001 |
| **Title** | Authentication & Security Hardening |
| **Priority** | P0 - Critical |
| **Estimated Effort** | 2-3 days |
| **Dependencies** | None |

## Description

Enhance the authentication system to meet production security standards and add missing account management features. This epic addresses critical security gaps (password hashing) and user experience gaps (password reset, email verification).

## Business Value

- Secure user credentials with industry-standard hashing
- Enable users to recover accounts (password reset)
- Improve trust with email verification
- GDPR compliance foundation with account deletion

## Acceptance Criteria

- [ ] Passwords hashed with bcrypt (cost factor 12)
- [ ] Users can reset password via email link
- [ ] New accounts require email verification
- [ ] Users can change password from settings
- [ ] Users can delete their account with data handling

---

## User Stories

### Story 1.1: Upgrade Password Hashing to bcrypt

**As a** platform operator
**I want** passwords to be hashed with bcrypt
**So that** user credentials are protected against brute-force attacks

**Acceptance Criteria:**
- [ ] Replace SHA-256 with bcrypt (cost factor 12)
- [ ] New registrations use bcrypt
- [ ] Existing passwords are rehashed on next login
- [ ] Login still works during migration period

**Technical Notes:**
- Install `bcrypt` package
- Update `server/routes.ts` hashPassword function
- Add migration logic for existing users

**Story Points:** 2

---

### Story 1.2: Password Reset Flow

**As a** user who forgot my password
**I want** to reset it via email
**So that** I can regain access to my account

**Acceptance Criteria:**
- [ ] "Forgot Password" link on login page
- [ ] Modal/form to enter email address
- [ ] Email sent with secure reset link (expires in 1 hour)
- [ ] Reset page validates token and allows new password
- [ ] User redirected to login after successful reset
- [ ] Invalid/expired tokens show appropriate error

**Technical Notes:**
- Add `password_reset_tokens` table (token, user_id, expires_at)
- Integrate email service (SendGrid/Nodemailer)
- Generate cryptographically secure tokens

**Story Points:** 5

---

### Story 1.3: Email Verification for New Accounts

**As a** new user
**I want** to verify my email address
**So that** my account is confirmed and secure

**Acceptance Criteria:**
- [ ] Verification email sent on registration
- [ ] Email contains unique verification link
- [ ] Clicking link marks email as verified
- [ ] Unverified users see reminder banner
- [ ] Resend verification option available
- [ ] Verification required for certain actions (future)

**Technical Notes:**
- Add `email_verified` boolean to users table
- Add `email_verification_tokens` table
- Verification link expires in 24 hours

**Story Points:** 3

---

### Story 1.4: Change Password from Settings

**As a** logged-in user
**I want** to change my password from account settings
**So that** I can update my credentials proactively

**Acceptance Criteria:**
- [ ] Settings page has "Change Password" section
- [ ] Requires current password for verification
- [ ] New password with confirmation field
- [ ] Password strength indicator
- [ ] Success message and session maintained
- [ ] Minimum password requirements (8 chars)

**Technical Notes:**
- Add PATCH `/api/auth/password` endpoint
- Verify current password before allowing change

**Story Points:** 2

---

### Story 1.5: Account Deletion

**As a** user
**I want** to delete my account
**So that** my data is removed from the platform

**Acceptance Criteria:**
- [ ] Delete account option in settings (with warning)
- [ ] Requires password confirmation
- [ ] Shows what data will be deleted
- [ ] Soft delete with 30-day grace period
- [ ] Confirmation email sent
- [ ] Hard delete after grace period (or immediate if requested)

**Technical Notes:**
- Add `deleted_at` timestamp to users table
- Cascade delete or anonymize related data
- GDPR compliance: data export option before deletion

**Story Points:** 3

---

### Story 1.6: Admin Role System

**As a** platform administrator
**I want** to have elevated privileges
**So that** I can manage the platform

**Acceptance Criteria:**
- [ ] `role` field added to users table (user/admin)
- [ ] Admin routes protected by role check
- [ ] First admin created via environment variable or seed
- [ ] Non-admins cannot access admin endpoints

**Technical Notes:**
- Add middleware for role-based access control
- Admin routes prefixed with `/api/admin/*`

**Story Points:** 2

---

## Total Story Points: 17

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests for auth functions
- [ ] Security review completed
- [ ] Documentation updated
- [ ] No regressions in existing auth flow
