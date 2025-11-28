# Story 1.3: Email Verification for New Accounts

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 1.3 |
| **Epic** | Epic 1: Authentication & Security |
| **Title** | Email Verification for New Accounts |
| **Priority** | P0 - Critical |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** new user registering an account
**I want** to verify my email address
**So that** I can confirm ownership and receive platform communications

## Context

Email verification ensures users provide valid email addresses they control, which is essential for password recovery, notifications, and platform communications. While the MVP allows platform usage without verification, users see a reminder banner encouraging verification.

**Dependencies:**
- Story 1.2 (Postmark service) should be completed first
- Postmark account must be configured with verification template

## Acceptance Criteria

- [ ] **AC-1:** Verification email sent automatically on successful registration
- [ ] **AC-2:** Email contains secure verification link (expires in 24 hours)
- [ ] **AC-3:** Clicking verification link marks `email_verified = true`
- [ ] **AC-4:** Unverified users see reminder banner in dashboard
- [ ] **AC-5:** "Resend Verification" option available in settings
- [ ] **AC-6:** Rate limiting on resend (1 request per 5 minutes)
- [ ] **AC-7:** Already-verified users see "Email Verified" badge

## Technical Requirements

### Database Schema Changes

```typescript
// shared/schema.ts - Already defined in Story 1.1/1.2
export const users = pgTable("users", {
  // ... existing fields
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token"),
});
```

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/services/postmark.ts` | Add sendVerificationEmail function |
| `server/routes/auth.ts` | Add verify-email and resend-verification endpoints |
| `server/routes/auth.ts` | Update register to send verification email |
| `client/src/components/VerificationBanner.tsx` | New: Reminder banner component |
| `client/src/pages/Dashboard.tsx` | Add verification banner for unverified users |
| `client/src/pages/Settings.tsx` | Add resend verification button |
| `client/src/pages/VerifyEmail.tsx` | New: Email verification landing page |

### Implementation Details

#### 1. Email Service Extension

```typescript
// server/services/postmark.ts
export async function sendVerificationEmail(
  email: string,
  verifyUrl: string,
  userName: string
): Promise<void> {
  await client.sendEmailWithTemplate({
    From: 'noreply@aermuse.com',
    To: email,
    TemplateAlias: 'email-verification',
    TemplateModel: {
      userName,
      verifyUrl,
      expiryTime: '24 hours'
    }
  });
}
```

#### 2. API Endpoints

```typescript
// Update POST /api/auth/register
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { email, password, name } = req.body;

  // Validate inputs
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Check if email already exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email)
  });

  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const hashedPassword = await hashPassword(password);
  const verificationToken = generateSecureToken();

  const [newUser] = await db.insert(users)
    .values({
      email,
      password: hashedPassword,
      name,
      emailVerified: false,
      emailVerificationToken: verificationToken
    })
    .returning();

  // Send verification email (fire and forget)
  const verifyUrl = `${process.env.BASE_URL}/verify-email?token=${verificationToken}`;
  sendVerificationEmail(email, verifyUrl, name).catch(err => {
    console.error('[EMAIL] Verification email failed:', err);
  });

  // Create session
  req.session.userId = newUser.id;

  res.json({
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      emailVerified: newUser.emailVerified
    }
  });
});

// POST /api/auth/verify-email
app.post('/api/auth/verify-email', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Verification token required' });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.emailVerificationToken, token)
  });

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired verification token' });
  }

  if (user.emailVerified) {
    return res.json({ success: true, message: 'Email already verified' });
  }

  await db.update(users)
    .set({
      emailVerified: true,
      emailVerificationToken: null
    })
    .where(eq(users.id, user.id));

  console.log(`[AUTH] Email verified for user ${user.id}`);

  res.json({ success: true, message: 'Email verified successfully' });
});

// POST /api/auth/resend-verification
const resendLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1,
  message: { error: 'Please wait 5 minutes before requesting another verification email' }
});

app.post('/api/auth/resend-verification', requireAuth, resendLimiter, async (req, res) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, req.session.userId)
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.emailVerified) {
    return res.json({ message: 'Email already verified' });
  }

  const verificationToken = generateSecureToken();

  await db.update(users)
    .set({ emailVerificationToken: verificationToken })
    .where(eq(users.id, user.id));

  const verifyUrl = `${process.env.BASE_URL}/verify-email?token=${verificationToken}`;
  await sendVerificationEmail(user.email, verifyUrl, user.name);

  res.json({ message: 'Verification email sent' });
});
```

#### 3. Frontend Components

**Verification Banner:**
```tsx
// client/src/components/VerificationBanner.tsx
import { useState } from 'react';
import { AlertCircle, Mail, X } from 'lucide-react';

interface Props {
  onResend: () => Promise<void>;
}

export function VerificationBanner({ onResend }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await onResend();
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <span className="text-amber-800">
            Please verify your email address.
            {sent ? (
              <span className="ml-2 text-green-600">Email sent!</span>
            ) : (
              <button
                onClick={handleResend}
                disabled={sending}
                className="ml-2 text-burgundy hover:underline disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Resend verification email'}
              </button>
            )}
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-600 hover:text-amber-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

**Verify Email Page:**
```tsx
// client/src/pages/VerifyEmail.tsx
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.error);
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Failed to verify email. Please try again.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="animate-pulse">
            <div className="h-12 w-12 rounded-full bg-gray-200 mx-auto mb-4" />
            <p className="text-gray-600">Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              to="/dashboard"
              className="inline-block bg-burgundy text-white px-6 py-2 rounded-md hover:bg-burgundy-dark"
            >
              Go to Dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              to="/settings"
              className="inline-block bg-burgundy text-white px-6 py-2 rounded-md hover:bg-burgundy-dark"
            >
              Resend Verification Email
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
```

**Dashboard Integration:**
```tsx
// In Dashboard.tsx, add at the top of the return
{!user.emailVerified && (
  <VerificationBanner
    onResend={async () => {
      await fetch('/api/auth/resend-verification', { method: 'POST' });
    }}
  />
)}
```

**Settings Integration:**
```tsx
// In Settings.tsx, add email verification section
<div className="border-b pb-6 mb-6">
  <h3 className="text-lg font-medium mb-2">Email Verification</h3>
  {user.emailVerified ? (
    <div className="flex items-center gap-2 text-green-600">
      <CheckCircle className="h-5 w-5" />
      <span>Email verified</span>
    </div>
  ) : (
    <div>
      <p className="text-gray-600 mb-2">Your email is not verified yet.</p>
      <button
        onClick={handleResendVerification}
        disabled={resending}
        className="text-burgundy hover:underline"
      >
        {resending ? 'Sending...' : 'Resend verification email'}
      </button>
    </div>
  )}
</div>
```

#### 4. Route Registration

```typescript
// client/src/App.tsx - Add route
<Route path="/verify-email" element={<VerifyEmail />} />
```

## Definition of Done

- [ ] Verification email sent on registration
- [ ] Verification endpoint working
- [ ] Resend endpoint with rate limiting
- [ ] Verification banner shows for unverified users
- [ ] Settings page shows verification status
- [ ] VerifyEmail page handles success/error states
- [ ] Route registered in React Router

## Testing Checklist

### Integration Tests

- [ ] Registration triggers verification email
- [ ] Valid token marks user as verified
- [ ] Invalid token returns error
- [ ] Already verified user gets appropriate message
- [ ] Resend generates new token
- [ ] Resend rate limiting works (1 per 5 min)
- [ ] Resend requires authentication

### E2E Tests

- [ ] Register → receive email → click link → verified
- [ ] Dashboard shows banner for unverified user
- [ ] Dashboard hides banner after verification
- [ ] Settings shows correct verification status

## Postmark Template Setup

Create template `email-verification` in Postmark with these variables:
- `{{userName}}` - User's display name
- `{{verifyUrl}}` - Full verification URL with token
- `{{expiryTime}}` - Token expiry time (24 hours)

## Related Documents

- [Epic 1 Tech Spec](./tech-spec-epic-1.md)
- [Story 1.2: Password Reset Flow](./1-2-password-reset-flow.md)
