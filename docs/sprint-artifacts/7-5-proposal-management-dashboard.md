# Story 7.5: Proposal Management Dashboard

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 7.5 |
| **Epic** | Epic 7: Landing Page Enhancements |
| **Title** | Proposal Management Dashboard |
| **Priority** | P2 - Medium |
| **Story Points** | 3 |
| **Status** | Drafted |

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

- [ ] **Task 1: Create Proposals List Page**
  - [ ] Create `client/src/pages/dashboard/Proposals.tsx`
  - [ ] Implement proposals state management
  - [ ] Add status filter functionality (all, new, viewed, responded, archived)
  - [ ] Implement fetchProposals with status filtering
  - [ ] Create empty state for no proposals
  - [ ] Add loading state
  - [ ] Implement handleStatusChange function
  - [ ] Implement handleDelete with confirmation

- [ ] **Task 2: Create Proposal Card Component**
  - [ ] Create `client/src/components/dashboard/ProposalCard.tsx`
  - [ ] Display sender info (name, email, company)
  - [ ] Add status badge with color coding
  - [ ] Add proposal type badge
  - [ ] Show message preview (truncated to 150 chars)
  - [ ] Display creation date and landing page title
  - [ ] Implement actions dropdown menu
  - [ ] Add "View Details", "Reply via Email", "Mark as Responded", "Archive", and "Delete" actions
  - [ ] Handle click outside to close menu

- [ ] **Task 3: Create Proposal Detail Page**
  - [ ] Create `client/src/pages/dashboard/ProposalDetail.tsx`
  - [ ] Fetch and display full proposal details
  - [ ] Show complete contact information with icons
  - [ ] Display full message (not truncated)
  - [ ] Add action buttons (Reply, Mark as Responded, Archive, Delete)
  - [ ] Add "Create Contract" CTA section
  - [ ] Implement auto-mark as viewed when status is 'new'
  - [ ] Add back navigation to proposals list

- [ ] **Task 4: Create Proposal API Endpoints**
  - [ ] Add GET /api/proposals endpoint (list with filtering)
  - [ ] Add GET /api/proposals/:id endpoint (detail view)
  - [ ] Add PATCH /api/proposals/:id endpoint (update status)
  - [ ] Add DELETE /api/proposals/:id endpoint
  - [ ] Implement authentication middleware for all endpoints
  - [ ] Auto-update viewedAt and respondedAt timestamps
  - [ ] Include landing page relation in queries
  - [ ] Add proper error handling

- [ ] **Task 5: Implement Status Management**
  - [ ] Track viewed, responded, and archived timestamps
  - [ ] Update status badges in real-time after actions
  - [ ] Implement status color coding (new=blue, viewed=gray, responded=green, archived=muted)
  - [ ] Ensure status transitions are logical

- [ ] **Task 6: Add Dashboard Navigation**
  - [ ] Add "Proposals" section to dashboard sidebar
  - [ ] Add Mail icon to navigation
  - [ ] Integrate notification badge from Story 7.4

- [ ] **Task 7: Testing**
  - [ ] Unit test: Status filter logic
  - [ ] Unit test: Date formatting
  - [ ] Integration test: GET /api/proposals returns user's proposals
  - [ ] Integration test: GET /api/proposals/:id marks as viewed
  - [ ] Integration test: PATCH updates status correctly
  - [ ] Integration test: DELETE removes proposal
  - [ ] E2E test: View proposals list
  - [ ] E2E test: Filter by status
  - [ ] E2E test: View proposal detail
  - [ ] E2E test: Change status
  - [ ] E2E test: Delete proposal

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
