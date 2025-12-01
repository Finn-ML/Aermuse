# Story 7.5: Proposal Management Dashboard

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 7.5 |
| **Epic** | Epic 7: Landing Page Enhancements |
| **Title** | Proposal Management Dashboard |
| **Priority** | P2 - Medium |
| **Story Points** | 3 |
| **Status** | Review |

## User Story

**As an** artist
**I want** to view and manage proposals
**So that** I can respond to inquiries

## Context

Artists need a dedicated section in their dashboard to view, manage, and respond to incoming proposals. This includes listing proposals, viewing details, updating status, and taking actions like responding or archiving.

**Dependencies:**
- Story 7.1 (Proposal Data Model)
- Story 7.4 (Proposal Notification)

## Acceptance Criteria

- [ ] **AC-1:** "Proposals" section in dashboard navigation
- [ ] **AC-2:** List of proposals with sender name, email, type, date, status
- [ ] **AC-3:** Status badges: New (blue), Viewed (gray), Responded (green), Archived (muted)
- [ ] **AC-4:** View full proposal details in modal or detail page
- [ ] **AC-5:** Mark as viewed/responded/archived
- [ ] **AC-6:** Reply via email link (opens email client)
- [ ] **AC-7:** Delete proposal with confirmation
- [ ] **AC-8:** Filter by status
- [ ] **AC-9:** Empty state when no proposals

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `client/src/pages/dashboard/Proposals.tsx` | New: Proposals list page |
| `client/src/pages/dashboard/ProposalDetail.tsx` | New: Proposal detail page |
| `client/src/components/dashboard/ProposalCard.tsx` | New: Proposal list item |
| `server/routes/proposals.ts` | Add: CRUD endpoints |

### Implementation

#### Proposals List Page

```tsx
// client/src/pages/dashboard/Proposals.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Filter, Inbox } from 'lucide-react';
import { ProposalCard } from '../../components/dashboard/ProposalCard';

interface Proposal {
  id: string;
  senderName: string;
  senderEmail: string;
  senderCompany: string | null;
  proposalType: string;
  message: string;
  status: 'new' | 'viewed' | 'responded' | 'archived';
  createdAt: string;
  landingPage: {
    id: string;
    title: string;
  };
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'responded', label: 'Responded' },
  { value: 'archived', label: 'Archived' },
];

export function Proposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchProposals();
  }, [statusFilter]);

  const fetchProposals = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/proposals?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setProposals(data.proposals);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (proposalId: string, newStatus: string) => {
    const response = await fetch(`/api/proposals/${proposalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: newStatus }),
    });

    if (response.ok) {
      setProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId ? { ...p, status: newStatus as any } : p
        )
      );
    }
  };

  const handleDelete = async (proposalId: string) => {
    if (!confirm('Are you sure you want to delete this proposal?')) return;

    const response = await fetch(`/api/proposals/${proposalId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (response.ok) {
      setProposals((prev) => prev.filter((p) => p.id !== proposalId));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proposals</h1>
          <p className="text-gray-600">
            Manage incoming proposals from your landing pages
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <div className="flex gap-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                statusFilter === filter.value
                  ? 'bg-burgundy-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Proposals List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Inbox className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No proposals yet
          </h3>
          <p className="text-gray-600">
            {statusFilter === 'all'
              ? "When someone sends a proposal through your landing page, it will appear here."
              : `No ${statusFilter} proposals found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

#### Proposal Card Component

```tsx
// client/src/components/dashboard/ProposalCard.tsx
import { Link } from 'react-router-dom';
import { Mail, Building2, Calendar, MoreVertical, Trash2, Archive, CheckCircle, Eye } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface Proposal {
  id: string;
  senderName: string;
  senderEmail: string;
  senderCompany: string | null;
  proposalType: string;
  message: string;
  status: 'new' | 'viewed' | 'responded' | 'archived';
  createdAt: string;
  landingPage: {
    id: string;
    title: string;
  };
}

interface Props {
  proposal: Proposal;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800',
  viewed: 'bg-gray-100 text-gray-800',
  responded: 'bg-green-100 text-green-800',
  archived: 'bg-gray-50 text-gray-500',
};

const PROPOSAL_TYPE_LABELS: Record<string, string> = {
  collaboration: 'Collaboration',
  licensing: 'Licensing',
  booking: 'Booking',
  recording: 'Recording',
  distribution: 'Distribution',
  other: 'Other',
};

export function ProposalCard({ proposal, onStatusChange, onDelete }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const messagePreview = proposal.message.length > 150
    ? proposal.message.substring(0, 150) + '...'
    : proposal.message;

  return (
    <div
      className={`bg-white rounded-lg border shadow-sm p-4 ${
        proposal.status === 'new' ? 'border-l-4 border-l-blue-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <Link
              to={`/dashboard/proposals/${proposal.id}`}
              className="font-semibold text-gray-900 hover:text-burgundy-600"
            >
              {proposal.senderName}
            </Link>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[proposal.status]}`}>
              {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
            </span>
            <span className="px-2 py-0.5 text-xs bg-burgundy-100 text-burgundy-800 rounded-full">
              {PROPOSAL_TYPE_LABELS[proposal.proposalType]}
            </span>
          </div>

          {/* Contact Info */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <a
              href={`mailto:${proposal.senderEmail}`}
              className="flex items-center gap-1 hover:text-burgundy-600"
            >
              <Mail className="h-4 w-4" />
              {proposal.senderEmail}
            </a>
            {proposal.senderCompany && (
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {proposal.senderCompany}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(proposal.createdAt)}
            </span>
          </div>

          {/* Message Preview */}
          <p className="text-gray-600 text-sm">{messagePreview}</p>

          {/* Landing Page */}
          <p className="text-xs text-gray-400 mt-2">
            via {proposal.landingPage.title}
          </p>
        </div>

        {/* Actions Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical className="h-5 w-5 text-gray-500" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-lg border py-1 z-10">
              <Link
                to={`/dashboard/proposals/${proposal.id}`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Eye className="h-4 w-4" />
                View Details
              </Link>
              <a
                href={`mailto:${proposal.senderEmail}?subject=Re: Your Proposal`}
                onClick={() => onStatusChange(proposal.id, 'responded')}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Mail className="h-4 w-4" />
                Reply via Email
              </a>
              {proposal.status !== 'responded' && (
                <button
                  onClick={() => {
                    onStatusChange(proposal.id, 'responded');
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark as Responded
                </button>
              )}
              {proposal.status !== 'archived' && (
                <button
                  onClick={() => {
                    onStatusChange(proposal.id, 'archived');
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </button>
              )}
              <hr className="my-1" />
              <button
                onClick={() => {
                  onDelete(proposal.id);
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### Proposal Detail Page

```tsx
// client/src/pages/dashboard/ProposalDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Building2, Calendar, FileText, Trash2, Archive, CheckCircle } from 'lucide-react';

interface Proposal {
  id: string;
  senderName: string;
  senderEmail: string;
  senderCompany: string | null;
  proposalType: string;
  message: string;
  status: 'new' | 'viewed' | 'responded' | 'archived';
  createdAt: string;
  viewedAt: string | null;
  respondedAt: string | null;
  landingPage: {
    id: string;
    title: string;
  };
}

const PROPOSAL_TYPE_LABELS: Record<string, string> = {
  collaboration: 'Collaboration',
  licensing: 'Licensing',
  booking: 'Booking',
  recording: 'Recording',
  distribution: 'Distribution',
  other: 'Other',
};

export function ProposalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProposal();
  }, [id]);

  const fetchProposal = async () => {
    try {
      const response = await fetch(`/api/proposals/${id}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setProposal(data);
      } else if (response.status === 404) {
        navigate('/dashboard/proposals');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const response = await fetch(`/api/proposals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: newStatus }),
    });

    if (response.ok) {
      setProposal((prev) => prev ? { ...prev, status: newStatus as any } : null);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this proposal?')) return;

    const response = await fetch(`/api/proposals/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (response.ok) {
      navigate('/dashboard/proposals');
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!proposal) {
    return <div className="text-center py-12 text-gray-500">Proposal not found</div>;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        to="/dashboard/proposals"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Proposals
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{proposal.senderName}</h1>
            <p className="text-gray-600">
              via {proposal.landingPage.title}
            </p>
          </div>
          <span className="px-3 py-1 text-sm bg-burgundy-100 text-burgundy-800 rounded-full">
            {PROPOSAL_TYPE_LABELS[proposal.proposalType]}
          </span>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Mail className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <a href={`mailto:${proposal.senderEmail}`} className="text-burgundy-600 hover:underline">
                {proposal.senderEmail}
              </a>
            </div>
          </div>
          {proposal.senderCompany && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Company</p>
                <p>{proposal.senderCompany}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Received</p>
              <p>{formatDate(proposal.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Message */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-2">Message</h2>
          <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">
            {proposal.message}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="font-semibold mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={`mailto:${proposal.senderEmail}?subject=Re: Your ${PROPOSAL_TYPE_LABELS[proposal.proposalType]} Proposal`}
            onClick={() => handleStatusChange('responded')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy-600 hover:bg-burgundy-700 text-white rounded-lg"
          >
            <Mail className="h-4 w-4" />
            Reply via Email
          </a>

          {proposal.status !== 'responded' && (
            <button
              onClick={() => handleStatusChange('responded')}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg"
            >
              <CheckCircle className="h-4 w-4" />
              Mark as Responded
            </button>
          )}

          {proposal.status !== 'archived' && (
            <button
              onClick={() => handleStatusChange('archived')}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg"
            >
              <Archive className="h-4 w-4" />
              Archive
            </button>
          )}

          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Convert to Contract (Link to Story 7.6) */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-burgundy-600" />
          <div className="flex-1">
            <h2 className="font-semibold">Ready to make it official?</h2>
            <p className="text-sm text-gray-600">
              Create a contract from this proposal to formalize the agreement.
            </p>
          </div>
          <Link
            to={`/dashboard/proposals/${proposal.id}/create-contract`}
            className="px-4 py-2 bg-burgundy-600 hover:bg-burgundy-700 text-white rounded-lg"
          >
            Create Contract
          </Link>
        </div>
      </div>
    </div>
  );
}
```

#### Proposals API Endpoints

```typescript
// server/routes/proposals.ts (add to existing)
import { requireAuth } from '../middleware/auth';
import { eq, and, desc } from 'drizzle-orm';

// GET /api/proposals - List user's proposals
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const status = req.query.status as string;

    const conditions = status
      ? and(eq(proposals.userId, userId), eq(proposals.status, status as any))
      : eq(proposals.userId, userId);

    const results = await db.query.proposals.findMany({
      where: conditions,
      orderBy: desc(proposals.createdAt),
      with: {
        landingPage: {
          columns: { id: true, title: true },
        },
      },
    });

    res.json({ proposals: results });
  } catch (error) {
    console.error('[PROPOSALS] List error:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// GET /api/proposals/:id - Get proposal detail
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const proposal = await db.query.proposals.findFirst({
      where: and(eq(proposals.id, id), eq(proposals.userId, userId)),
      with: {
        landingPage: {
          columns: { id: true, title: true },
        },
      },
    });

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Mark as viewed if new
    if (proposal.status === 'new') {
      await db
        .update(proposals)
        .set({ status: 'viewed', viewedAt: new Date() })
        .where(eq(proposals.id, id));
    }

    res.json(proposal);
  } catch (error) {
    console.error('[PROPOSALS] Get error:', error);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

// PATCH /api/proposals/:id - Update status
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const { status } = req.body;

    const proposal = await db.query.proposals.findFirst({
      where: and(eq(proposals.id, id), eq(proposals.userId, userId)),
    });

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const updateData: any = { status, updatedAt: new Date() };
    if (status === 'viewed' && !proposal.viewedAt) {
      updateData.viewedAt = new Date();
    }
    if (status === 'responded' && !proposal.respondedAt) {
      updateData.respondedAt = new Date();
    }

    await db
      .update(proposals)
      .set(updateData)
      .where(eq(proposals.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error('[PROPOSALS] Update error:', error);
    res.status(500).json({ error: 'Failed to update proposal' });
  }
});

// DELETE /api/proposals/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const proposal = await db.query.proposals.findFirst({
      where: and(eq(proposals.id, id), eq(proposals.userId, userId)),
    });

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    await db.delete(proposals).where(eq(proposals.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error('[PROPOSALS] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete proposal' });
  }
});
```

## Definition of Done

- [ ] Proposals section appears in dashboard
- [ ] List displays with all required info
- [ ] Filtering by status works
- [ ] Detail view shows full proposal
- [ ] Status changes persist
- [ ] Delete with confirmation works
- [ ] Empty state displays correctly

## Testing Checklist

### Unit Tests

- [ ] Status filter logic
- [ ] Date formatting

### Integration Tests

- [ ] GET /api/proposals returns user's proposals
- [ ] GET /api/proposals/:id marks as viewed
- [ ] PATCH updates status correctly
- [ ] DELETE removes proposal

### E2E Tests

- [ ] View proposals list
- [ ] Filter by status
- [ ] View proposal detail
- [ ] Change status
- [ ] Delete proposal

## Related Documents

- [Epic 7 Tech Spec](./tech-spec-epic-7.md)
- [Story 7.6: Proposal to Contract Flow](./7-6-proposal-to-contract-flow.md)

---

## Tasks/Subtasks

- [x] **Task 1: Create Proposals List in Dashboard**
  - [x] Implement proposals state management in Dashboard.tsx
  - [x] Add status filter functionality (all, new, viewed, responded, archived)
  - [x] Implement fetchProposals with status filtering using useQuery
  - [x] Create empty state for no proposals
  - [x] Add loading state
  - [x] Implement handleStatusChange and handleDelete mutations

- [x] **Task 2: Create Proposal Card Component**
  - [x] Create `client/src/components/proposals/ProposalCard.tsx`
  - [x] Display sender info (name, email, company)
  - [x] Add status badge with color coding
  - [x] Add proposal type badge
  - [x] Show message preview (truncated to 150 chars)
  - [x] Display creation date and landing page title
  - [x] Implement actions dropdown menu
  - [x] Add "View Details", "Reply via Email", "Mark as Responded", "Archive", and "Delete" actions
  - [x] Handle click outside to close menu

- [x] **Task 3: Create Proposal Detail Component**
  - [x] Create `client/src/components/proposals/ProposalDetail.tsx`
  - [x] Fetch and display full proposal details
  - [x] Show complete contact information with icons
  - [x] Display full message (not truncated)
  - [x] Add action buttons (Reply, Mark as Responded, Archive, Delete)
  - [x] Add "Create Contract" CTA section (disabled for Story 7.6)
  - [x] Add activity timeline showing timestamps
  - [x] Add back navigation to proposals list

- [x] **Task 4: Create Proposal API Endpoints**
  - [x] Add GET /api/proposals endpoint (list with filtering)
  - [x] Add GET /api/proposals/:id endpoint (detail view)
  - [x] Add PATCH /api/proposals/:id endpoint (update status)
  - [x] Add DELETE /api/proposals/:id endpoint
  - [x] Implement authentication middleware (requireAuth) for all endpoints
  - [x] Auto-update viewedAt and respondedAt timestamps
  - [x] Include landing page relation in queries
  - [x] Add proper error handling

- [x] **Task 5: Implement Status Management**
  - [x] Track viewed, responded, and archived timestamps
  - [x] Update status badges in real-time after actions via query invalidation
  - [x] Implement status color coding (new=blue, viewed=gray, responded=green, archived=muted)
  - [x] Auto-mark as viewed when detail view is opened

- [x] **Task 6: Dashboard Navigation Integration**
  - [x] "Proposals" section already in dashboard sidebar (from Story 7.4)
  - [x] Mail icon in navigation (from Story 7.4)
  - [x] Notification badge integrated (from Story 7.4)

- [ ] **Task 7: Testing**
  - [ ] Manual test: View proposals list
  - [ ] Manual test: Filter by status
  - [ ] Manual test: View proposal detail
  - [ ] Manual test: Change status
  - [ ] Manual test: Delete proposal

---

## Dev Agent Record

### Debug Log
- 2025-12-01: Added GET /api/proposals, GET /api/proposals/:id, PATCH /api/proposals/:id, DELETE /api/proposals/:id endpoints
- 2025-12-01: Created ProposalCard and ProposalDetail components in client/src/components/proposals/
- 2025-12-01: Integrated full proposals management into Dashboard.tsx with list/detail views
- 2025-12-01: Added status filtering, status change mutations, and delete functionality
- 2025-12-01: All type checks pass

### Completion Notes
**Implementation Decisions:**
- Implemented proposals UI directly in Dashboard.tsx rather than separate pages (matches existing pattern)
- Used inline detail view that replaces list when a proposal is selected (not routing to separate URL)
- ProposalCard and ProposalDetail are separate reusable components
- "Create Contract" CTA is disabled with tooltip - will be enabled in Story 7.6
- Activity timeline shows received/viewed/responded timestamps when available
- Uses existing navigation/badge from Story 7.4

**Follow-ups:**
- Task 7 (Testing) deferred - requires manual browser testing
- Story 7.6 will enable the "Create Contract" button

---

## File List

| Action | File Path |
|--------|-----------|
| Modified | server/routes.ts |
| Created | client/src/components/proposals/ProposalCard.tsx |
| Created | client/src/components/proposals/ProposalDetail.tsx |
| Created | client/src/components/proposals/index.ts |
| Modified | client/src/pages/Dashboard.tsx |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-01 | Initial implementation - proposals list, detail, filtering, CRUD operations | Dev Agent (Amelia) |

---

## Senior Developer Review (AI)

**Reviewer:** finn
**Date:** 2025-12-01
**Outcome:** ✅ APPROVE

### Summary
Story 7.5 implementation is complete and comprehensive. The Proposal Management Dashboard provides a polished user experience with list view, detail view, status management, and CRUD operations. The code quality is excellent with proper TypeScript types, React Query integration, and a well-designed UI matching the application's burgundy theme.

### Key Findings

**No issues found** - Implementation is solid across all acceptance criteria and tasks.

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC-1 | "Proposals" section in dashboard navigation | ✅ IMPLEMENTED | `Dashboard.tsx:401` - nav item with Mail icon |
| AC-2 | List of proposals with sender name, email, type, date, status | ✅ IMPLEMENTED | `ProposalCard.tsx:79-113` - displays all required fields |
| AC-3 | Status badges: New (blue), Viewed (gray), Responded (green), Archived (muted) | ✅ IMPLEMENTED | `ProposalCard.tsx:26-31` - STATUS_COLORS with correct color mapping |
| AC-4 | View full proposal details in modal or detail page | ✅ IMPLEMENTED | `ProposalDetail.tsx:60-259` - inline detail view with full proposal info |
| AC-5 | Mark as viewed/responded/archived | ✅ IMPLEMENTED | `Dashboard.tsx:354-360` - handleProposalStatusChange mutation; `routes.ts:3137-3144` - updates timestamps |
| AC-6 | Reply via email link (opens email client) | ✅ IMPLEMENTED | `ProposalCard.tsx:150-159`, `ProposalDetail.tsx:160-167` - mailto links with subject |
| AC-7 | Delete proposal with confirmation | ✅ IMPLEMENTED | `ProposalDetail.tsx:54-58` - confirm() dialog; `routes.ts:3159-3185` - DELETE endpoint |
| AC-8 | Filter by status | ✅ IMPLEMENTED | `Dashboard.tsx:1325-1347` - filter buttons; `routes.ts:3016-3024` - server-side filtering |
| AC-9 | Empty state when no proposals | ✅ IMPLEMENTED | `Dashboard.tsx:1353-1373` - Inbox icon, contextual message |

**Summary: 9 of 9 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| Task 1: Create Proposals List in Dashboard | ✅ Complete | ✅ VERIFIED | `Dashboard.tsx:194-208,1304-1390` |
| Task 2: Create Proposal Card Component | ✅ Complete | ✅ VERIFIED | `ProposalCard.tsx` - all features implemented |
| Task 3: Create Proposal Detail Component | ✅ Complete | ✅ VERIFIED | `ProposalDetail.tsx` - full detail with activity timeline |
| Task 4: Create Proposal API Endpoints | ✅ Complete | ✅ VERIFIED | `routes.ts:3006-3185` - 4 endpoints |
| Task 5: Implement Status Management | ✅ Complete | ✅ VERIFIED | `routes.ts:3137-3144` - timestamp tracking |
| Task 6: Dashboard Navigation Integration | ✅ Complete | ✅ VERIFIED | `Dashboard.tsx:401` - nav with badge |
| Task 7: Testing | ⬜ Incomplete | N/A | Correctly marked incomplete |

**Summary: 6 of 6 completed tasks verified, 0 falsely marked complete**

### Code Quality Notes

**Strengths:**
- Excellent UI/UX with consistent burgundy theme styling
- Proper React Query usage with cache invalidation on mutations
- Activity timeline shows proposal lifecycle (received → viewed → responded)
- "Create Contract" CTA properly disabled with tooltip for Story 7.6
- Good click-outside handling for dropdown menus
- Responsive design with flex-wrap for mobile

**Architecture:**
- ✅ Follows existing Dashboard.tsx patterns (inline views vs separate pages)
- ✅ Proper component separation (ProposalCard, ProposalDetail)
- ✅ API endpoints properly authenticate and validate ownership
- ✅ Automatic viewed status on detail view matches expected behavior

### Security Notes
- ✅ All endpoints use `requireAuth` middleware
- ✅ Ownership validation: proposals filtered by `userId`
- ✅ Status validation: only valid statuses accepted (`routes.ts:3122-3125`)

### Action Items

**Advisory Notes:**
- Note: Task 7 (Testing) remains for manual browser testing
- Note: Story 7.6 will enable the "Create Contract" button currently disabled
