# Story 1.2: Password Reset Flow

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 1.2 |
| **Epic** | Epic 1: Authentication & Security |
| **Title** | Password Reset Flow |
| **Priority** | P0 - Critical |
| **Story Points** | 5 |
| **Status** | Drafted |

## User Story

**As a** user who forgot my password
**I want** to reset it via email
**So that** I can regain access to my account

## Context

Users need a self-service way to recover their accounts when they forget their password. This is a standard security feature expected by users and essential for reducing support burden. The flow uses secure, time-limited tokens sent via email.

**Dependencies:**
- Story 1.1 (bcrypt) should be completed first
- Postmark account must be configured

## Acceptance Criteria

- [ ] **AC-1:** "Forgot Password" link visible on login page
- [ ] **AC-2:** Modal/form allows entering email address
- [ ] **AC-3:** Email sent with secure reset link (expires in 1 hour)
- [ ] **AC-4:** Reset page validates token and allows new password entry
- [ ] **AC-5:** User redirected to login after successful reset
- [ ] **AC-6:** Invalid/expired tokens show appropriate error message
- [ ] **AC-7:** Rate limiting prevents abuse (5 requests per 15 min)

## Technical Requirements

### Dependencies to Install

```bash
npm install postmark
```

### Database Schema Changes

```sql
-- Already defined in architecture, add to users table
ALTER TABLE users ADD COLUMN password_reset_token VARCHAR;
ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP;
```

Update Drizzle schema:
```typescript
// shared/schema.ts
export const users = pgTable("users", {
  // ... existing fields
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
});
```

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/services/postmark.ts` | New: Email service |
| `server/routes/auth.ts` | Add forgot-password and reset-password endpoints |
| `server/lib/auth.ts` | Add generateToken function |
| `client/src/pages/Login.tsx` | Add "Forgot Password" link and modal |
| `client/src/pages/ResetPassword.tsx` | New: Reset password page |

### Implementation Details

#### 1. Email Service

```typescript
// server/services/postmark.ts
import postmark from 'postmark';

const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY!);

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  userName: string
): Promise<void> {
  await client.sendEmailWithTemplate({
    From: 'noreply@aermuse.com',
    To: email,
    TemplateAlias: 'password-reset',
    TemplateModel: {
      userName,
      resetUrl,
      expiryTime: '1 hour'
    }
  });
}
```

#### 2. Token Generation

```typescript
// server/lib/auth.ts
import crypto from 'crypto';

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
```

#### 3. API Endpoints

```typescript
// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email)
  });

  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({ message: 'If an account exists, a reset email has been sent.' });
  }

  const token = generateSecureToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.update(users)
    .set({
      passwordResetToken: token,
      passwordResetExpires: expires
    })
    .where(eq(users.id, user.id));

  const resetUrl = `${process.env.BASE_URL}/reset-password?token=${token}`;

  await sendPasswordResetEmail(user.email, resetUrl, user.name);

  res.json({ message: 'If an account exists, a reset email has been sent.' });
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const user = await db.query.users.findFirst({
    where: and(
      eq(users.passwordResetToken, token),
      gt(users.passwordResetExpires, new Date())
    )
  });

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const hashedPassword = await hashPassword(password);

  await db.update(users)
    .set({
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null
    })
    .where(eq(users.id, user.id));

  res.json({ success: true, message: 'Password has been reset. Please log in.' });
});
```

#### 4. Frontend Components

**Login Page - Add Forgot Password Link:**
```tsx
<button
  type="button"
  onClick={() => setShowForgotPassword(true)}
  className="text-sm text-burgundy hover:underline"
>
  Forgot password?
</button>
```

**Forgot Password Modal:**
```tsx
function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div>
        <p>If an account exists for {email}, you'll receive a reset link shortly.</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit">Send Reset Link</button>
    </form>
  );
}
```

**Reset Password Page:**
```tsx
// client/src/pages/ResetPassword.tsx
function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });

    if (res.ok) {
      navigate('/login?reset=success');
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Reset Your Password</h1>
      {error && <p className="text-red-500">{error}</p>}
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password (min 8 characters)"
        minLength={8}
        required
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirm password"
        required
      />
      <button type="submit">Reset Password</button>
    </form>
  );
}
```

## Definition of Done

- [ ] Postmark service configured and tested
- [ ] Database schema updated with reset token fields
- [ ] Forgot password endpoint working
- [ ] Reset password endpoint working
- [ ] Frontend modal and reset page implemented
- [ ] Rate limiting applied to forgot-password endpoint
- [ ] Error messages are user-friendly
- [ ] Success redirects to login page

## Testing Checklist

### Integration Tests

- [ ] Forgot password sends email for valid user
- [ ] Forgot password returns success even for invalid email (no enumeration)
- [ ] Reset with valid token updates password
- [ ] Reset with expired token returns error
- [ ] Reset with invalid token returns error
- [ ] Reset clears token after use
- [ ] Rate limiting blocks after 5 requests

### E2E Tests

- [ ] Complete flow: forgot -> email -> reset -> login with new password
- [ ] Expired token shows error message
- [ ] Password mismatch shows validation error

## Postmark Template Setup

Create template `password-reset` in Postmark with these variables:
- `{{userName}}` - User's display name
- `{{resetUrl}}` - Full reset URL with token
- `{{expiryTime}}` - Token expiry time (1 hour)

## Related Documents

- [Epic 1 Tech Spec](./tech-spec-epic-1.md)
- [Architecture: Postmark Integration](../architecture.md#postmark-integration-epics-1-4-7)
