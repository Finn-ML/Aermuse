# Story 1.4: Change Password from Settings

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 1.4 |
| **Epic** | Epic 1: Authentication & Security |
| **Title** | Change Password from Settings |
| **Priority** | P1 - High |
| **Story Points** | 2 |
| **Status** | Drafted |

## User Story

**As a** logged-in user
**I want** to change my password from settings
**So that** I can update my credentials without logging out

## Context

Users should be able to proactively change their password from account settings. This is a standard security feature that allows users to rotate their credentials or update to a stronger password. The session remains active after the change.

**Dependencies:**
- Story 1.1 (bcrypt hashing) must be completed first

## Acceptance Criteria

- [ ] **AC-1:** "Change Password" section visible in Settings page
- [ ] **AC-2:** Current password required before allowing change
- [ ] **AC-3:** Minimum 8 characters enforced for new password
- [ ] **AC-4:** Password confirmation field must match
- [ ] **AC-5:** Session remains active after successful password change
- [ ] **AC-6:** Success message displayed after change
- [ ] **AC-7:** Wrong current password shows appropriate error

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/routes/auth.ts` | Add PATCH /api/auth/password endpoint |
| `client/src/pages/Settings.tsx` | Add change password form section |
| `client/src/components/ChangePasswordForm.tsx` | New: Password change form component |

### Implementation Details

#### 1. API Endpoint

```typescript
// PATCH /api/auth/password
app.patch('/api/auth/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.session.userId;

  // Validate new password
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({
      error: 'New password must be at least 8 characters'
    });
  }

  // Get user
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Verify current password (without migration since user is logged in)
  const isBcrypt = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');
  let passwordValid: boolean;

  if (isBcrypt) {
    passwordValid = await bcrypt.compare(currentPassword, user.password);
  } else {
    // Legacy SHA-256
    const crypto = await import('crypto');
    const sha256Hash = crypto.createHash('sha256').update(currentPassword).digest('hex');
    passwordValid = sha256Hash === user.password;
  }

  if (!passwordValid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  // Hash new password with bcrypt
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  await db.update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, userId));

  console.log(`[AUTH] Password changed for user ${userId}`);

  // Session remains active - no logout required
  res.json({ success: true, message: 'Password updated successfully' });
});
```

#### 2. Frontend Component

```tsx
// client/src/components/ChangePasswordForm.tsx
import { useState, FormEvent } from 'react';
import { Lock, Check, AlertCircle } from 'lucide-react';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Client-side validation
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to update password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-medium">Change Password</h3>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
          <Check className="h-5 w-5 text-green-600" />
          <span className="text-green-800">Password updated successfully!</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Current Password
          </label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-burgundy"
            required
          />
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-burgundy"
            required
          />
          <p className="mt-1 text-sm text-gray-500">Minimum 8 characters</p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-burgundy"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-burgundy text-white py-2 rounded-md hover:bg-burgundy-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
```

#### 3. Settings Page Integration

```tsx
// client/src/pages/Settings.tsx - Add to the settings sections
import { ChangePasswordForm } from '../components/ChangePasswordForm';

// In the settings layout:
<section className="mt-8">
  <ChangePasswordForm />
</section>
```

## Definition of Done

- [ ] PATCH /api/auth/password endpoint implemented
- [ ] Current password verification working
- [ ] New password hashed with bcrypt
- [ ] Minimum length validation (8 chars)
- [ ] ChangePasswordForm component created
- [ ] Form integrated in Settings page
- [ ] Success/error messages display correctly
- [ ] Session persists after password change

## Testing Checklist

### Unit Tests

- [ ] Password validation rejects < 8 characters
- [ ] Confirm password mismatch caught on client

### Integration Tests

- [ ] Correct current password allows change
- [ ] Wrong current password returns 401
- [ ] New password stored as bcrypt hash
- [ ] Session remains valid after change
- [ ] Subsequent login works with new password

### E2E Tests

- [ ] Complete flow: enter passwords → submit → success message
- [ ] Error displayed for wrong current password
- [ ] Form clears after successful change

## Security Considerations

- Current password required to prevent unauthorized changes
- New password hashed with bcrypt (cost 12)
- No password logged or returned in response
- Session maintained for UX (user chose to change)
- Rate limiting inherited from auth middleware

## Related Documents

- [Epic 1 Tech Spec](./tech-spec-epic-1.md)
- [Story 1.1: Upgrade Password Hashing](./1-1-upgrade-password-hashing-to-bcrypt.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Implement password change endpoint**
  - [ ] Create PATCH /api/auth/password
  - [ ] Require authentication
  - [ ] Validate current password
  - [ ] Enforce minimum 8 characters for new password
  - [ ] Hash new password with bcrypt
  - [ ] Keep session active after change

- [ ] **Task 2: Create ChangePasswordForm component**
  - [ ] Create `client/src/components/ChangePasswordForm.tsx`
  - [ ] Include current password field
  - [ ] Include new password field with min length
  - [ ] Include confirm password field
  - [ ] Add client-side validation
  - [ ] Show success/error messages

- [ ] **Task 3: Integrate with Settings page**
  - [ ] Import ChangePasswordForm
  - [ ] Add to Settings layout

- [ ] **Task 4: Write tests**
  - [ ] Unit tests for password validation
  - [ ] Integration tests for endpoint
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
