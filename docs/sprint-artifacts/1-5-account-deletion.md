# Story 1.5: Account Deletion

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 1.5 |
| **Epic** | Epic 1: Authentication & Security |
| **Title** | Account Deletion |
| **Priority** | P1 - High |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** user who wants to leave the platform
**I want** to delete my account
**So that** my data is removed and I comply with my data privacy rights

## Context

Account deletion is essential for GDPR compliance and user trust. This implementation uses soft delete with a 30-day grace period, allowing account recovery if needed. After 30 days, a background job can permanently delete the data (hard delete implementation is out of scope for MVP).

**Dependencies:**
- Story 1.2 (Postmark service) for confirmation email
- Story 1.1 (bcrypt) for password verification

## Acceptance Criteria

- [ ] **AC-1:** "Delete Account" option visible in Settings with clear warning
- [ ] **AC-2:** Password confirmation required before deletion
- [ ] **AC-3:** Soft delete with `deleted_at` timestamp (30-day grace period)
- [ ] **AC-4:** User session terminated after deletion
- [ ] **AC-5:** Confirmation email sent to user
- [ ] **AC-6:** Deleted users cannot log in
- [ ] **AC-7:** Deleted user email cannot be re-registered (during grace period)

## Technical Requirements

### Database Schema

```typescript
// shared/schema.ts - Already defined in tech spec
export const users = pgTable("users", {
  // ... existing fields
  deletedAt: timestamp("deleted_at"),
});
```

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/routes/auth.ts` | Add DELETE /api/auth/account endpoint |
| `server/routes/auth.ts` | Update login to check deleted_at |
| `server/routes/auth.ts` | Update register to check deleted_at |
| `server/services/postmark.ts` | Add sendAccountDeletionEmail function |
| `client/src/pages/Settings.tsx` | Add delete account section |
| `client/src/components/DeleteAccountModal.tsx` | New: Confirmation modal |

### Implementation Details

#### 1. Email Service Extension

```typescript
// server/services/postmark.ts
export async function sendAccountDeletionEmail(
  email: string,
  userName: string
): Promise<void> {
  await client.sendEmailWithTemplate({
    From: 'noreply@aermuse.com',
    To: email,
    TemplateAlias: 'account-deletion',
    TemplateModel: {
      userName,
      gracePeriod: '30 days',
      supportEmail: 'support@aermuse.com'
    }
  });
}
```

#### 2. API Endpoints

```typescript
// DELETE /api/auth/account
app.delete('/api/auth/account', requireAuth, async (req, res) => {
  const { password } = req.body;
  const userId = req.session.userId;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Get user
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Verify password
  const passwordValid = await comparePassword(password, user.password);

  if (!passwordValid) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  // Soft delete - set deleted_at timestamp
  await db.update(users)
    .set({ deletedAt: new Date() })
    .where(eq(users.id, userId));

  console.log(`[AUTH] Account soft deleted for user ${userId}`);

  // Send confirmation email (fire and forget)
  sendAccountDeletionEmail(user.email, user.name).catch(err => {
    console.error('[EMAIL] Account deletion email failed:', err);
  });

  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      console.error('[AUTH] Session destroy error:', err);
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Account scheduled for deletion' });
  });
});

// Update login endpoint to check deleted_at
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  const user = await db.query.users.findFirst({
    where: and(
      eq(users.email, email),
      isNull(users.deletedAt) // Exclude soft-deleted users
    )
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // ... rest of login logic
});

// Update register endpoint to prevent re-registration
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { email, password, name } = req.body;

  // Check for existing user (including soft-deleted)
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email)
  });

  if (existing) {
    if (existing.deletedAt) {
      return res.status(400).json({
        error: 'This email was recently used for a deleted account. Please wait 30 days or contact support.'
      });
    }
    return res.status(400).json({ error: 'Email already registered' });
  }

  // ... rest of registration logic
});
```

#### 3. Frontend Components

**Delete Account Modal:**
```tsx
// client/src/components/DeleteAccountModal.tsx
import { useState, FormEvent } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteAccountModal({ onClose, onDeleted }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (res.ok) {
        onDeleted();
      } else {
        setError(data.error || 'Failed to delete account');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            <h2 className="text-xl font-bold">Delete Account</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">
            <strong>Warning:</strong> This action will schedule your account for deletion.
            Your data will be permanently removed after 30 days. During this period,
            you won't be able to log in or create a new account with this email.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <span className="text-red-800">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Enter your password to confirm
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="confirmText"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </label>
            <input
              id="confirmText"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="DELETE"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || confirmText !== 'DELETE'}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Settings Page Integration:**
```tsx
// client/src/pages/Settings.tsx - Add danger zone section
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DeleteAccountModal } from '../components/DeleteAccountModal';

// In the component:
const [showDeleteModal, setShowDeleteModal] = useState(false);
const navigate = useNavigate();

const handleAccountDeleted = () => {
  // Clear any local user state
  // Redirect to home page
  navigate('/', { replace: true });
  window.location.reload(); // Ensure clean state
};

// In the JSX:
<section className="mt-8 border-t pt-8">
  <h3 className="text-lg font-medium text-red-600 flex items-center gap-2 mb-4">
    <Trash2 className="h-5 w-5" />
    Danger Zone
  </h3>

  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
    <h4 className="font-medium text-gray-900 mb-2">Delete Account</h4>
    <p className="text-sm text-gray-600 mb-4">
      Once you delete your account, there is no going back. Your account will be
      scheduled for permanent deletion after a 30-day grace period.
    </p>
    <button
      onClick={() => setShowDeleteModal(true)}
      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
    >
      Delete Account
    </button>
  </div>
</section>

{showDeleteModal && (
  <DeleteAccountModal
    onClose={() => setShowDeleteModal(false)}
    onDeleted={handleAccountDeleted}
  />
)}
```

## Definition of Done

- [ ] DELETE /api/auth/account endpoint implemented
- [ ] Password verification required
- [ ] Soft delete with deleted_at timestamp
- [ ] Session destroyed after deletion
- [ ] Confirmation email sent
- [ ] Login rejects soft-deleted users
- [ ] Registration rejects recently-deleted emails
- [ ] DeleteAccountModal component created
- [ ] Danger zone section in Settings page

## Testing Checklist

### Integration Tests

- [ ] Correct password allows deletion
- [ ] Wrong password returns 401
- [ ] deleted_at is set correctly
- [ ] Session is destroyed
- [ ] Email is sent
- [ ] Deleted user cannot login
- [ ] Deleted email cannot re-register

### E2E Tests

- [ ] Complete flow: open modal → enter password → type DELETE → confirm
- [ ] User redirected to home after deletion
- [ ] Login fails after account deletion

## Postmark Template Setup

Create template `account-deletion` in Postmark with these variables:
- `{{userName}}` - User's display name
- `{{gracePeriod}}` - Grace period (30 days)
- `{{supportEmail}}` - Support contact email

## Future Considerations

- Background job for hard delete after 30 days
- Data export before deletion (GDPR right to portability)
- Account recovery during grace period
- Admin ability to expedite or cancel deletion

## Related Documents

- [Epic 1 Tech Spec](./tech-spec-epic-1.md)
- [Architecture: GDPR Compliance](../architecture.md#gdpr-considerations)

---

## Tasks/Subtasks

- [ ] **Task 1: Update database schema**
  - [ ] Add `deletedAt` timestamp field to users table
  - [ ] Update Drizzle schema
  - [ ] Run migration

- [ ] **Task 2: Extend email service**
  - [ ] Add `sendAccountDeletionEmail` to postmark.ts
  - [ ] Create account-deletion template in Postmark

- [ ] **Task 3: Implement delete account endpoint**
  - [ ] Create DELETE /api/auth/account
  - [ ] Require password verification
  - [ ] Set deletedAt timestamp (soft delete)
  - [ ] Destroy session
  - [ ] Send confirmation email

- [ ] **Task 4: Update login to check deletedAt**
  - [ ] Add isNull(deletedAt) to login query
  - [ ] Deleted users cannot log in

- [ ] **Task 5: Update registration to check deletedAt**
  - [ ] Block re-registration with deleted email
  - [ ] Show appropriate error message

- [ ] **Task 6: Create DeleteAccountModal component**
  - [ ] Password field
  - [ ] Type DELETE confirmation
  - [ ] Warning message
  - [ ] Success/error handling

- [ ] **Task 7: Add Danger Zone to Settings**
  - [ ] Add delete account section
  - [ ] Open modal on click
  - [ ] Redirect after deletion

- [ ] **Task 8: Write tests**
  - [ ] Integration tests for delete endpoint
  - [ ] Test login blocked for deleted users
  - [ ] Test registration blocked for deleted email
  - [ ] E2E test for complete flow

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
