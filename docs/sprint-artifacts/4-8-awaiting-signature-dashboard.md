# Story 4.8: Awaiting Signature Dashboard

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 4.8 |
| **Epic** | Epic 4: E-Signing System |
| **Title** | Awaiting Signature Dashboard |
| **Priority** | P1 - High |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** registered user
**I want** to see contracts awaiting my signature
**So that** I can sign them from my dashboard

## Context

Users who receive signature requests need an easy way to see and act on pending contracts. This story adds an "Awaiting Your Signature" section to the dashboard and navigation badge.

**Dependencies:**
- Story 4.4 (API) for `/api/signatures/to-sign` endpoint
- Existing dashboard infrastructure

## Acceptance Criteria

- [ ] **AC-1:** "Awaiting Your Signature" section on dashboard
- [ ] **AC-2:** Badge/count in navigation showing pending signatures
- [ ] **AC-3:** List shows: contract title, from (initiator), date requested
- [ ] **AC-4:** "Sign Now" button opens DocuSeal signing page
- [ ] **AC-5:** After signing, item removed from pending list
- [ ] **AC-6:** Empty state when no pending signatures
- [ ] **AC-7:** Filter: show/hide signed items (history)
- [ ] **AC-8:** Link to full signature history

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `client/src/components/dashboard/AwaitingSignatures.tsx` | New: Dashboard section |
| `client/src/components/layout/NavBar.tsx` | Add badge |
| `client/src/hooks/usePendingSignatures.ts` | New: Fetch hook |
| `client/src/pages/Dashboard.tsx` | Add section |
| `client/src/pages/SignatureHistory.tsx` | New: History page |

### Implementation

#### Pending Signatures Hook

```typescript
// client/src/hooks/usePendingSignatures.ts
import { useState, useEffect, useCallback } from 'react';

interface PendingSignature {
  id: string;
  contractId: string;
  contractTitle: string;
  initiator: {
    id: string;
    name: string;
    email: string;
  };
  message: string | null;
  signingUrl: string;
  expiresAt: string | null;
  createdAt: string;
}

interface UsePendingSignaturesReturn {
  pending: PendingSignature[];
  count: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePendingSignatures(): UsePendingSignaturesReturn {
  const [pending, setPending] = useState<PendingSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const response = await fetch('/api/signatures/to-sign');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load');
      }

      setPending(data.toSign);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    pending,
    count: pending.length,
    loading,
    error,
    refresh: fetch,
  };
}
```

#### Awaiting Signatures Component

```tsx
// client/src/components/dashboard/AwaitingSignatures.tsx
import { Link } from 'react-router-dom';
import { PenTool, Clock, User, ExternalLink, ChevronRight, FileText } from 'lucide-react';
import { usePendingSignatures } from '../../hooks/usePendingSignatures';

export function AwaitingSignatures() {
  const { pending, loading, error } = usePendingSignatures();

  if (loading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-burgundy/10 rounded-lg">
            <PenTool className="h-5 w-5 text-burgundy" />
          </div>
          <h2 className="font-semibold text-lg">Awaiting Your Signature</h2>
        </div>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <p className="text-red-600">Failed to load pending signatures</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-burgundy/10 rounded-lg">
            <PenTool className="h-5 w-5 text-burgundy" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Awaiting Your Signature</h2>
            {pending.length > 0 && (
              <p className="text-sm text-gray-500">{pending.length} pending</p>
            )}
          </div>
        </div>
        <Link
          to="/signatures/history"
          className="text-sm text-burgundy hover:text-burgundy-dark flex items-center gap-1"
        >
          View History
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Content */}
      {pending.length === 0 ? (
        <div className="p-8 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No contracts awaiting your signature</p>
        </div>
      ) : (
        <div className="divide-y">
          {pending.map(item => (
            <div
              key={item.id}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {item.contractTitle}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      From {item.initiator.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeDate(item.createdAt)}
                    </span>
                  </div>
                  {item.message && (
                    <p className="mt-2 text-sm text-gray-600 italic truncate">
                      "{item.message}"
                    </p>
                  )}
                </div>

                <a
                  href={item.signingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-burgundy text-white rounded-md hover:bg-burgundy-dark whitespace-nowrap"
                >
                  <PenTool className="h-4 w-4" />
                  Sign Now
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Expiration warning */}
              {item.expiresAt && isExpiringSoon(item.expiresAt) && (
                <div className="mt-2 text-sm text-orange-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Expires {formatRelativeDate(item.expiresAt)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatRelativeDate(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

function isExpiringSoon(expiresAt: string): boolean {
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffDays = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 3 && diffDays >= 0;
}
```

#### Navigation Badge

```tsx
// client/src/components/layout/NavBar.tsx (additions)
import { usePendingSignatures } from '../../hooks/usePendingSignatures';

// In the navigation component:
function NavBar() {
  const { count: pendingSignatures } = usePendingSignatures();

  return (
    <nav>
      {/* ... other nav items ... */}

      <Link to="/dashboard" className="relative">
        Dashboard
        {pendingSignatures > 0 && (
          <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-burgundy text-white text-xs font-bold rounded-full">
            {pendingSignatures > 9 ? '9+' : pendingSignatures}
          </span>
        )}
      </Link>

      {/* Or as a separate nav item */}
      <Link
        to="/dashboard"
        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-md"
      >
        <PenTool className="h-4 w-4" />
        <span>To Sign</span>
        {pendingSignatures > 0 && (
          <span className="ml-auto bg-burgundy text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {pendingSignatures}
          </span>
        )}
      </Link>
    </nav>
  );
}
```

#### Signature History Page

```tsx
// client/src/pages/SignatureHistory.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';

interface SignatureHistoryItem {
  id: string;
  contractTitle: string;
  initiatorName: string;
  status: 'pending' | 'signed' | 'expired' | 'cancelled';
  signedAt: string | null;
  createdAt: string;
}

export default function SignatureHistory() {
  const [history, setHistory] = useState<SignatureHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'signed'>('all');

  useEffect(() => {
    fetch('/api/signatures/history')
      .then(res => res.json())
      .then(data => {
        setHistory(data.history);
        setLoading(false);
      });
  }, []);

  const filtered = history.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'pending') return item.status === 'pending';
    if (filter === 'signed') return item.status === 'signed';
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-md">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Signature History</h1>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'signed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              filter === f
                ? 'bg-burgundy text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-lg border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-burgundy border-t-transparent rounded-full mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No signature history</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map(item => (
              <div key={item.id} className="p-4 flex items-center gap-4">
                {/* Status Icon */}
                <div
                  className={`p-2 rounded-full ${
                    item.status === 'signed'
                      ? 'bg-green-100'
                      : item.status === 'pending'
                      ? 'bg-yellow-100'
                      : 'bg-gray-100'
                  }`}
                >
                  {item.status === 'signed' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : item.status === 'pending' ? (
                    <Clock className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h3 className="font-medium">{item.contractTitle}</h3>
                  <p className="text-sm text-gray-500">
                    From {item.initiatorName} &bull;{' '}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Status Badge */}
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    item.status === 'signed'
                      ? 'bg-green-100 text-green-700'
                      : item.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {item.status === 'signed' && item.signedAt
                    ? `Signed ${new Date(item.signedAt).toLocaleDateString()}`
                    : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Add to Dashboard

```tsx
// client/src/pages/Dashboard.tsx
import { AwaitingSignatures } from '../components/dashboard/AwaitingSignatures';

export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* ... other dashboard sections ... */}

      {/* Awaiting Signatures - prominently placed */}
      <div className="mb-8">
        <AwaitingSignatures />
      </div>

      {/* ... rest of dashboard ... */}
    </div>
  );
}
```

### API Endpoint for History

```typescript
// Add to server/routes/signatures.ts

// GET /api/signatures/history - User's signature history (as signatory)
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userSignatories = await db.query.signatories.findMany({
      where: or(
        eq(signatories.userId, req.session.userId),
        eq(signatories.email, req.session.userEmail)
      ),
      with: {
        signatureRequest: {
          with: {
            contract: {
              columns: { id: true, title: true },
            },
            initiator: {
              columns: { id: true, name: true },
            },
          },
        },
      },
      orderBy: desc(signatories.createdAt),
      limit: 50,
    });

    const history = userSignatories
      .filter(s => s.signatureRequest) // Filter out any orphaned records
      .map(s => ({
        id: s.signatureRequest.id,
        contractTitle: s.signatureRequest.contract.title,
        initiatorName: s.signatureRequest.initiator.name,
        status: s.status,
        signedAt: s.signedAt,
        createdAt: s.createdAt,
      }));

    res.json({ history });
  } catch (error) {
    console.error('[SIGNATURES] Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});
```

## Definition of Done

- [ ] Awaiting Signatures section on dashboard
- [ ] Navigation badge shows count
- [ ] List displays pending contracts correctly
- [ ] Sign Now opens DocuSeal in new tab
- [ ] Empty state when no pending
- [ ] Signature history page accessible
- [ ] History filter tabs working
- [ ] Mobile responsive

## Testing Checklist

### Unit Tests

- [ ] usePendingSignatures hook
- [ ] Date formatting functions
- [ ] Filter logic in history

### Integration Tests

- [ ] Dashboard section loads
- [ ] Navigation badge updates
- [ ] History page loads

### E2E Tests

- [ ] See pending signature on dashboard
- [ ] Click Sign Now → opens signing URL
- [ ] View signature history
- [ ] Filter history by status

## Related Documents

- [Epic 4 Tech Spec](./tech-spec-epic-4.md)
- [Story 4.4: Signature Request API](./4-4-signature-request-api.md)
- [Story 4.7: Signature Status Tracking UI](./4-7-signature-status-tracking-ui.md)
