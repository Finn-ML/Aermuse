# Story 1.1: Upgrade Password Hashing to bcrypt

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 1.1 |
| **Epic** | Epic 1: Authentication & Security |
| **Title** | Upgrade Password Hashing to bcrypt |
| **Priority** | P0 - Critical |
| **Story Points** | 2 |
| **Status** | Drafted |

## User Story

**As a** platform operator
**I want** passwords to be hashed with bcrypt
**So that** user credentials are protected against brute-force attacks

## Context

The current implementation uses SHA-256 for password hashing, which is cryptographically inadequate for password storage. SHA-256 is fast by design, making it vulnerable to GPU-accelerated brute-force attacks. bcrypt is specifically designed for password hashing with an adjustable cost factor that makes attacks computationally expensive.

This is the foundational security story - all subsequent auth stories depend on having secure password storage.

## Acceptance Criteria

- [ ] **AC-1:** New user registrations hash passwords with bcrypt (cost factor 12)
- [ ] **AC-2:** Existing SHA-256 passwords are automatically migrated to bcrypt on successful login
- [ ] **AC-3:** Login works seamlessly during migration period (both hash types supported)
- [ ] **AC-4:** No downtime or user-facing changes required for migration

## Technical Requirements

### Dependencies to Install

```bash
npm install bcrypt
npm install -D @types/bcrypt
```

### Files to Modify

| File | Changes |
|------|---------|
| `server/routes.ts` | Update `hashPassword()` and `comparePassword()` functions |
| `shared/schema.ts` | No changes needed (password field already TEXT) |
| `package.json` | Add bcrypt dependency |

### Implementation Details

#### 1. Update hashPassword Function

```typescript
// server/lib/auth.ts (new file) or server/routes.ts
import bcrypt from 'bcrypt';

const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}
```

#### 2. Update comparePassword Function with Migration

```typescript
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string,
  userId?: string
): Promise<boolean> {
  // Detect hash type
  const isBcrypt = hashedPassword.startsWith('$2b$') || hashedPassword.startsWith('$2a$');

  if (isBcrypt) {
    // Modern bcrypt comparison
    return bcrypt.compare(plainPassword, hashedPassword);
  } else {
    // Legacy SHA-256 comparison (64 char hex string)
    const crypto = await import('crypto');
    const sha256Hash = crypto.createHash('sha256').update(plainPassword).digest('hex');
    const matches = sha256Hash === hashedPassword;

    // Migrate to bcrypt on successful login
    if (matches && userId) {
      const newHash = await hashPassword(plainPassword);
      await db.update(users)
        .set({ password: newHash })
        .where(eq(users.id, userId));
      console.log(`[AUTH] Password migrated to bcrypt for user ${userId}`);
    }

    return matches;
  }
}
```

#### 3. Update Registration Endpoint

```typescript
// In POST /api/auth/register
const hashedPassword = await hashPassword(password);
// ... create user with hashedPassword
```

#### 4. Update Login Endpoint

```typescript
// In POST /api/auth/login
const user = await db.query.users.findFirst({
  where: eq(users.email, email)
});

if (!user) {
  return res.status(401).json({ error: 'Invalid credentials' });
}

const passwordValid = await comparePassword(password, user.password, user.id);

if (!passwordValid) {
  return res.status(401).json({ error: 'Invalid credentials' });
}

// ... create session
```

## Definition of Done

- [ ] bcrypt package installed and configured
- [ ] New registrations use bcrypt hashing
- [ ] Login works with both SHA-256 and bcrypt passwords
- [ ] Migration happens transparently on login
- [ ] Migration is logged for auditing
- [ ] No existing users are locked out
- [ ] Unit tests for hash/compare functions pass

## Testing Checklist

### Unit Tests

- [ ] `hashPassword()` returns bcrypt format ($2b$12$...)
- [ ] `comparePassword()` returns true for valid bcrypt password
- [ ] `comparePassword()` returns true for valid SHA-256 password
- [ ] `comparePassword()` returns false for invalid password

### Integration Tests

- [ ] New user registration creates bcrypt hash
- [ ] Login with existing SHA-256 password succeeds
- [ ] After login, password in DB is bcrypt format
- [ ] Subsequent logins use bcrypt comparison

### Manual Verification

- [ ] Register new account, verify bcrypt hash in DB
- [ ] Login with existing test account, verify migration

## Notes

- bcrypt cost factor 12 adds ~200ms to login, acceptable for security
- SHA-256 hashes are 64 characters (hex), bcrypt starts with $2b$
- Migration is gradual - users who don't log in keep SHA-256 until they do
- Consider running a report after 30 days to identify unmigrated accounts

## Related Documents

- [Epic 1 Tech Spec](./tech-spec-epic-1.md)
- [Architecture: ADR-001](../architecture.md#adr-001-password-hashing)
