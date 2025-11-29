# Story 4.7: Signature Status Tracking UI

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 4.7 |
| **Epic** | Epic 4: E-Signing System |
| **Title** | Signature Status Tracking UI |
| **Priority** | P0 - Critical |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** contract initiator
**I want** to see the signing status in real-time
**So that** I know who has signed

## Context

After sending a signature request, initiators need to track progress. This story implements a status page showing each signatory's status, timestamps, and actions like sending reminders or cancelling the request.

**Dependencies:**
- Story 4.4 (API) for status endpoints
- Story 4.3 (Add Signatories UI) for navigation flow

## Acceptance Criteria

- [ ] **AC-1:** Dedicated status page for signature requests
- [ ] **AC-2:** Status per signatory: waiting → pending → signed
- [ ] **AC-3:** Visual progress indicator (steps/timeline)
- [ ] **AC-4:** Timestamps for each status change
- [ ] **AC-5:** "Send Reminder" button for pending signatories
- [ ] **AC-6:** "Cancel Request" button (before completion)
- [ ] **AC-7:** Copy signing URL button (for manual sharing)
- [ ] **AC-8:** Overall status badge on contract card
- [ ] **AC-9:** Auto-refresh or real-time updates
- [ ] **AC-10:** Mobile responsive design

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `client/src/pages/SignatureStatus.tsx` | New: Status page |
| `client/src/components/signatures/SignatoryTimeline.tsx` | New: Timeline component |
| `client/src/components/signatures/SignatureProgress.tsx` | New: Progress indicator |
| `client/src/components/signatures/SignatureActions.tsx` | New: Action buttons |
| `client/src/hooks/useSignatureStatus.ts` | New: Polling hook |

### Implementation

#### Signature Status Page

```tsx
// client/src/pages/SignatureStatus.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Copy,
  Send,
  Trash2,
  RefreshCw,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { SignatureRequestWithSignatories } from '../types/signatures';
import { SignatoryTimeline } from '../components/signatures/SignatoryTimeline';
import { SignatureProgress } from '../components/signatures/SignatureProgress';

export default function SignatureStatus() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<SignatureRequestWithSignatories | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);

    try {
      const response = await fetch(`/api/signatures/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load status');
      }

      setRequest(data.signatureRequest);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Poll for updates every 30 seconds
    const interval = setInterval(() => fetchStatus(false), 30000);
    return () => clearInterval(interval);
  }, [id]);

  const handleSendReminder = async (signatoryId: string) => {
    try {
      const response = await fetch(`/api/signatures/${id}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatoryId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send reminder');
      }

      alert('Reminder sent!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send reminder');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this signature request? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/signatures/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel request');
      }

      navigate(`/contracts/${request?.contractId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel');
    }
  };

  const copySigningUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    // Could show a toast notification here
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-burgundy" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-700 mb-2">
            Unable to load signature status
          </h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 text-red-600 hover:text-red-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const signedCount = request.signatories.filter(s => s.status === 'signed').length;
  const totalCount = request.signatories.length;
  const isComplete = request.status === 'completed';
  const isCancelled = request.status === 'cancelled';

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to={`/contracts/${request.contractId}`}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Signature Status</h1>
            <p className="text-sm text-gray-500">{request.contract?.title}</p>
          </div>
        </div>

        <button
          onClick={() => fetchStatus(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg border shadow-sm mb-6">
        <div className="p-6">
          {/* Overall Status */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {isComplete ? (
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              ) : isCancelled ? (
                <div className="p-2 bg-gray-100 rounded-full">
                  <XCircle className="h-6 w-6 text-gray-500" />
                </div>
              ) : (
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              )}
              <div>
                <h2 className="font-semibold text-lg">
                  {isComplete
                    ? 'All Signatures Collected'
                    : isCancelled
                    ? 'Request Cancelled'
                    : 'Awaiting Signatures'}
                </h2>
                <p className="text-sm text-gray-500">
                  {signedCount} of {totalCount} signed
                </p>
              </div>
            </div>

            {/* Download signed PDF if complete */}
            {isComplete && request.signedPdfPath && (
              <a
                href={`/api/contracts/${request.contractId}/signed-pdf`}
                className="flex items-center gap-2 px-4 py-2 bg-burgundy text-white rounded-md hover:bg-burgundy-dark"
              >
                <ExternalLink className="h-4 w-4" />
                Download Signed PDF
              </a>
            )}
          </div>

          {/* Progress Bar */}
          <SignatureProgress
            signedCount={signedCount}
            totalCount={totalCount}
            status={request.status}
          />

          {/* Expiration */}
          {request.expiresAt && !isComplete && !isCancelled && (
            <p className="mt-4 text-sm text-gray-500">
              Expires: {new Date(request.expiresAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>

      {/* Signatories Timeline */}
      <div className="bg-white rounded-lg border shadow-sm mb-6">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Signing Progress</h3>
        </div>
        <div className="p-4">
          <SignatoryTimeline
            signatories={request.signatories}
            onSendReminder={handleSendReminder}
            onCopyUrl={copySigningUrl}
            showActions={!isComplete && !isCancelled}
          />
        </div>
      </div>

      {/* Actions */}
      {!isComplete && !isCancelled && (
        <div className="flex justify-end">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
          >
            <Trash2 className="h-4 w-4" />
            Cancel Request
          </button>
        </div>
      )}

      {/* Message (if any) */}
      {request.message && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Message to signatories</h4>
          <p className="text-gray-600 italic">"{request.message}"</p>
        </div>
      )}
    </div>
  );
}
```

#### Signatory Timeline Component

```tsx
// client/src/components/signatures/SignatoryTimeline.tsx
import { Check, Clock, Hourglass, Send, Copy } from 'lucide-react';
import { SignatoryDTO } from '../../types/signatures';

interface Props {
  signatories: SignatoryDTO[];
  onSendReminder: (id: string) => void;
  onCopyUrl: (url: string) => void;
  showActions: boolean;
}

export function SignatoryTimeline({ signatories, onSendReminder, onCopyUrl, showActions }: Props) {
  return (
    <div className="space-y-4">
      {signatories.map((signatory, index) => (
        <div key={signatory.id} className="flex gap-4">
          {/* Timeline Line */}
          <div className="flex flex-col items-center">
            {/* Status Icon */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                signatory.status === 'signed'
                  ? 'bg-green-100 text-green-600'
                  : signatory.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {signatory.status === 'signed' ? (
                <Check className="h-4 w-4" />
              ) : signatory.status === 'pending' ? (
                <Clock className="h-4 w-4" />
              ) : (
                <Hourglass className="h-4 w-4" />
              )}
            </div>
            {/* Connector Line */}
            {index < signatories.length - 1 && (
              <div
                className={`w-0.5 flex-1 mt-2 ${
                  signatory.status === 'signed' ? 'bg-green-200' : 'bg-gray-200'
                }`}
              />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{signatory.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      signatory.status === 'signed'
                        ? 'bg-green-100 text-green-700'
                        : signatory.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {signatory.status === 'signed'
                      ? 'Signed'
                      : signatory.status === 'pending'
                      ? 'Awaiting signature'
                      : 'Waiting'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{signatory.email}</p>
                {signatory.signedAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    Signed {new Date(signatory.signedAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Actions */}
              {showActions && signatory.status === 'pending' && (
                <div className="flex items-center gap-2">
                  {signatory.signingUrl && (
                    <button
                      onClick={() => onCopyUrl(signatory.signingUrl!)}
                      className="p-2 hover:bg-gray-100 rounded-md"
                      title="Copy signing link"
                    >
                      <Copy className="h-4 w-4 text-gray-500" />
                    </button>
                  )}
                  <button
                    onClick={() => onSendReminder(signatory.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-burgundy hover:bg-burgundy/5 rounded-md"
                  >
                    <Send className="h-3 w-3" />
                    Remind
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

#### Signature Progress Component

```tsx
// client/src/components/signatures/SignatureProgress.tsx

interface Props {
  signedCount: number;
  totalCount: number;
  status: string;
}

export function SignatureProgress({ signedCount, totalCount, status }: Props) {
  const percentage = totalCount > 0 ? (signedCount / totalCount) * 100 : 0;

  return (
    <div>
      {/* Progress Bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            status === 'completed'
              ? 'bg-green-500'
              : status === 'cancelled'
              ? 'bg-gray-400'
              : 'bg-burgundy'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex justify-between mt-2">
        {Array.from({ length: totalCount }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
              i < signedCount
                ? 'bg-green-100 text-green-700'
                : i === signedCount && status !== 'completed' && status !== 'cancelled'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Contract Card Status Badge

```tsx
// Add to ContractCard.tsx or similar
interface SignatureStatusBadgeProps {
  status: string;
  signedCount: number;
  totalCount: number;
}

export function SignatureStatusBadge({ status, signedCount, totalCount }: SignatureStatusBadgeProps) {
  if (status === 'completed') {
    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
        <CheckCircle className="h-3 w-3" />
        Signed
      </span>
    );
  }

  if (status === 'cancelled') {
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
        Cancelled
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
      <Clock className="h-3 w-3" />
      {signedCount}/{totalCount} signed
    </span>
  );
}
```

### Routes

```tsx
// Add to App.tsx or router config
<Route path="/signatures/:id" element={<SignatureStatus />} />
```

## Definition of Done

- [ ] Status page shows all signatories
- [ ] Status updates per signatory
- [ ] Visual progress indicator working
- [ ] Timestamps displayed correctly
- [ ] Send Reminder button functional
- [ ] Cancel Request button functional
- [ ] Copy URL button functional
- [ ] Auto-refresh every 30 seconds
- [ ] Mobile responsive
- [ ] Loading and error states

## Testing Checklist

### Unit Tests

- [ ] SignatoryTimeline renders correctly
- [ ] SignatureProgress shows correct percentage
- [ ] Status badges display correctly

### Integration Tests

- [ ] Page loads with correct data
- [ ] Send reminder API called correctly
- [ ] Cancel request works

### E2E Tests

- [ ] Navigate to status page
- [ ] See signing progress
- [ ] Send reminder
- [ ] Cancel request
- [ ] Download signed PDF (when complete)

## Related Documents

- [Epic 4 Tech Spec](./tech-spec-epic-4.md)
- [Story 4.3: Add Signatories UI](./4-3-add-signatories-ui.md)
- [Story 4.4: Signature Request API](./4-4-signature-request-api.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create SignatureStatus page component**
  - [ ] Create `client/src/pages/SignatureStatus.tsx`
  - [ ] Implement status fetching from API
  - [ ] Add auto-refresh every 30 seconds
  - [ ] Show loading and error states
  - [ ] Display overall status card with progress

- [ ] **Task 2: Create SignatoryTimeline component**
  - [ ] Create `client/src/components/signatures/SignatoryTimeline.tsx`
  - [ ] Display signatories in order with status icons
  - [ ] Show connector lines between signatories
  - [ ] Display timestamps for signed entries
  - [ ] Add action buttons for pending signatories

- [ ] **Task 3: Create SignatureProgress component**
  - [ ] Create `client/src/components/signatures/SignatureProgress.tsx`
  - [ ] Implement animated progress bar
  - [ ] Show step indicators for each signatory
  - [ ] Color code based on status (green/yellow/gray)
  - [ ] Update dynamically as signatures complete

- [ ] **Task 4: Implement action handlers**
  - [ ] Add handleSendReminder to call API
  - [ ] Add handleCancel with confirmation dialog
  - [ ] Implement copySigningUrl to clipboard
  - [ ] Show success/error notifications

- [ ] **Task 5: Add download signed PDF functionality**
  - [ ] Show download button when completed
  - [ ] Link to /api/contracts/:id/signed-pdf
  - [ ] Handle download errors gracefully

- [ ] **Task 6: Create SignatureStatusBadge for contract cards**
  - [ ] Create reusable badge component
  - [ ] Show appropriate icon and text based on status
  - [ ] Display progress count for in-progress requests
  - [ ] Use consistent color scheme

- [ ] **Task 7: Add routing and navigation**
  - [ ] Add /signatures/:id route
  - [ ] Navigate from success modal to status page
  - [ ] Add back button to contract detail
  - [ ] Test navigation flow end-to-end

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
