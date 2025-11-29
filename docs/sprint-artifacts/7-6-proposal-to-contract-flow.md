# Story 7.6: Proposal to Contract Flow

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 7.6 |
| **Epic** | Epic 7: Landing Page Enhancements |
| **Title** | Proposal to Contract Flow |
| **Priority** | P2 - Medium (Stretch) |
| **Story Points** | 2 |
| **Status** | Drafted |

## User Story

**As an** artist
**I want** to convert a proposal into a contract
**So that** I can formalize the agreement

## Context

When an artist decides to move forward with a proposal, they should be able to seamlessly create a contract from it. This flow pre-fills contract details with information from the proposal and maintains a link between the two for tracking purposes.

**Dependencies:**
- Story 7.5 (Proposal Management Dashboard)
- Epic 3 (Contract Templates)

## Acceptance Criteria

- [ ] **AC-1:** "Create Contract" button on proposal detail page
- [ ] **AC-2:** Pre-fills contract with sender info (name, email, company)
- [ ] **AC-3:** Template selection step before creating contract
- [ ] **AC-4:** Links contract back to proposal (contract shows "originated from proposal")
- [ ] **AC-5:** Proposal status updated to "responded" when contract is created
- [ ] **AC-6:** Navigate to contract editor after creation

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `client/src/pages/dashboard/CreateContractFromProposal.tsx` | New: Contract creation flow |
| `server/routes/proposals.ts` | Add: Convert to contract endpoint |
| `server/db/schema/contracts.ts` | Add: proposalId field |

### Implementation

#### Database Schema Update

```typescript
// server/db/schema/contracts.ts (add field)
export const contracts = pgTable('contracts', {
  // ... existing fields

  // Link to originating proposal
  proposalId: varchar('proposal_id', { length: 36 }).references(() => proposals.id),
});
```

#### Migration

```sql
-- Add proposal link to contracts
ALTER TABLE contracts ADD COLUMN proposal_id VARCHAR(36) REFERENCES proposals(id);
CREATE INDEX idx_contracts_proposal ON contracts(proposal_id);
```

#### Create Contract From Proposal Page

```tsx
// client/src/pages/dashboard/CreateContractFromProposal.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText, User, Building2, Mail, Check } from 'lucide-react';

interface Proposal {
  id: string;
  senderName: string;
  senderEmail: string;
  senderCompany: string | null;
  proposalType: string;
  message: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
}

const PROPOSAL_TO_TEMPLATE_SUGGESTIONS: Record<string, string[]> = {
  collaboration: ['Artist Agreement', 'Work for Hire Agreement'],
  licensing: ['License Agreement', 'Sample Agreement'],
  booking: ['Tour Agreement', 'Performance Agreement'],
  recording: ['Artist Agreement', 'Work for Hire Agreement'],
  distribution: ['Distribution Agreement', 'License Agreement'],
  other: [],
};

export function CreateContractFromProposal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    Promise.all([fetchProposal(), fetchTemplates()]).finally(() => {
      setIsLoading(false);
    });
  }, [id]);

  const fetchProposal = async () => {
    const response = await fetch(`/api/proposals/${id}`, {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      setProposal(data);
    }
  };

  const fetchTemplates = async () => {
    const response = await fetch('/api/templates', {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      setTemplates(data.templates);
    }
  };

  const handleCreateContract = async () => {
    if (!selectedTemplate || !proposal) return;

    setIsCreating(true);

    try {
      const response = await fetch(`/api/proposals/${id}/contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ templateId: selectedTemplate }),
      });

      if (response.ok) {
        const data = await response.json();
        navigate(`/dashboard/contracts/${data.contractId}/edit`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!proposal) {
    return <div className="text-center py-12 text-gray-500">Proposal not found</div>;
  }

  const suggestedTemplateNames = PROPOSAL_TO_TEMPLATE_SUGGESTIONS[proposal.proposalType] || [];
  const suggestedTemplates = templates.filter((t) =>
    suggestedTemplateNames.some((name) => t.name.includes(name))
  );
  const otherTemplates = templates.filter((t) =>
    !suggestedTemplateNames.some((name) => t.name.includes(name))
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        to={`/dashboard/proposals/${id}`}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Proposal
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Create Contract from Proposal</h1>
        <p className="text-gray-600">
          Select a template and we'll pre-fill it with the proposal details.
        </p>
      </div>

      {/* Proposal Summary */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="font-semibold mb-4">Proposal Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Contact Name</p>
              <p className="font-medium">{proposal.senderName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{proposal.senderEmail}</p>
            </div>
          </div>
          {proposal.senderCompany && (
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Company</p>
                <p className="font-medium">{proposal.senderCompany}</p>
              </div>
            </div>
          )}
        </div>
        <p className="mt-4 text-sm text-gray-500">
          This information will be pre-filled in the contract.
        </p>
      </div>

      {/* Template Selection */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="font-semibold mb-4">Select a Template</h2>

        {/* Suggested Templates */}
        {suggestedTemplates.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-3">
              Suggested for {proposal.proposalType} proposals:
            </p>
            <div className="space-y-2">
              {suggestedTemplates.map((template) => (
                <TemplateOption
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplate === template.id}
                  onSelect={() => setSelectedTemplate(template.id)}
                  isSuggested
                />
              ))}
            </div>
          </div>
        )}

        {/* Other Templates */}
        {otherTemplates.length > 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              {suggestedTemplates.length > 0 ? 'Other templates:' : 'Available templates:'}
            </p>
            <div className="space-y-2">
              {otherTemplates.map((template) => (
                <TemplateOption
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplate === template.id}
                  onSelect={() => setSelectedTemplate(template.id)}
                />
              ))}
            </div>
          </div>
        )}

        {templates.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            No templates available. Create a template first.
          </p>
        )}
      </div>

      {/* Create Button */}
      <div className="flex justify-end gap-3">
        <Link
          to={`/dashboard/proposals/${id}`}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </Link>
        <button
          onClick={handleCreateContract}
          disabled={!selectedTemplate || isCreating}
          className="inline-flex items-center gap-2 px-6 py-2 bg-burgundy-600 hover:bg-burgundy-700 disabled:bg-burgundy-400 text-white rounded-lg"
        >
          {isCreating ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Creating...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Create Contract
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface TemplateOptionProps {
  template: Template;
  isSelected: boolean;
  onSelect: () => void;
  isSuggested?: boolean;
}

function TemplateOption({ template, isSelected, onSelect, isSuggested }: TemplateOptionProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
        isSelected
          ? 'border-burgundy-600 bg-burgundy-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{template.name}</span>
            {isSuggested && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                Recommended
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
        </div>
        {isSelected && (
          <div className="w-6 h-6 bg-burgundy-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Check className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
    </button>
  );
}
```

#### Convert to Contract API

```typescript
// server/routes/proposals.ts (add to existing)
import { contracts } from '../db/schema/contracts';

// POST /api/proposals/:id/contract - Create contract from proposal
router.post('/:id/contract', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const { templateId } = req.body;

    // Verify proposal belongs to user
    const proposal = await db.query.proposals.findFirst({
      where: and(eq(proposals.id, id), eq(proposals.userId, userId)),
    });

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Get template
    const template = await db.query.templates.findFirst({
      where: eq(templates.id, templateId),
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Create contract with pre-filled data
    const [contract] = await db
      .insert(contracts)
      .values({
        userId,
        title: `${template.name} - ${proposal.senderName}`,
        templateId,
        proposalId: id,
        status: 'draft',
        // Pre-fill party information
        parties: JSON.stringify([
          {
            name: proposal.senderName,
            email: proposal.senderEmail,
            company: proposal.senderCompany,
            role: 'counterparty',
          },
        ]),
        // Copy template content
        content: template.content,
      })
      .returning();

    // Update proposal status
    await db
      .update(proposals)
      .set({
        status: 'responded',
        respondedAt: new Date(),
        contractId: contract.id,
        updatedAt: new Date(),
      })
      .where(eq(proposals.id, id));

    res.status(201).json({
      success: true,
      contractId: contract.id,
    });
  } catch (error) {
    console.error('[PROPOSALS] Create contract error:', error);
    res.status(500).json({ error: 'Failed to create contract' });
  }
});
```

#### Contract Detail - Show Proposal Origin

```tsx
// Add to contract detail page
{contract.proposalId && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
    <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
    <div>
      <p className="font-medium text-blue-800">
        Created from Proposal
      </p>
      <p className="text-blue-700 text-sm">
        This contract originated from a proposal.{' '}
        <Link
          to={`/dashboard/proposals/${contract.proposalId}`}
          className="underline hover:no-underline"
        >
          View original proposal
        </Link>
      </p>
    </div>
  </div>
)}
```

## Definition of Done

- [ ] Create Contract button on proposal detail
- [ ] Template selection works
- [ ] Contract pre-filled with proposal info
- [ ] Proposal linked to contract
- [ ] Proposal status updated to "responded"
- [ ] Navigation to contract editor works

## Testing Checklist

### Unit Tests

- [ ] Template suggestions based on proposal type

### Integration Tests

- [ ] POST /api/proposals/:id/contract creates contract
- [ ] Proposal status updated
- [ ] Contract has correct pre-filled data

### E2E Tests

- [ ] Full flow: select template -> create contract
- [ ] Verify pre-filled information
- [ ] Navigate to contract editor

## Related Documents

- [Epic 7 Tech Spec](./tech-spec-epic-7.md)
- [Epic 3: Contract Templates](./tech-spec-epic-3.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Update Database Schema**
  - [ ] Add proposalId field to contracts table schema in `server/db/schema/contracts.ts`
  - [ ] Create migration to add proposal_id column to contracts table
  - [ ] Add index for proposal_id for efficient querying
  - [ ] Test migration runs successfully

- [ ] **Task 2: Create Contract Creation Page**
  - [ ] Create `client/src/pages/dashboard/CreateContractFromProposal.tsx`
  - [ ] Implement proposal and templates fetching
  - [ ] Display proposal summary (name, email, company)
  - [ ] Implement template selection UI
  - [ ] Add template suggestion logic based on proposal type
  - [ ] Create TemplateOption component with selection state
  - [ ] Add "Create Contract" button with loading state
  - [ ] Implement navigation to contract editor after creation

- [ ] **Task 3: Implement Template Suggestions**
  - [ ] Create PROPOSAL_TO_TEMPLATE_SUGGESTIONS mapping
  - [ ] Filter templates into suggested and other categories
  - [ ] Display suggested templates with "Recommended" badge
  - [ ] Display other templates in separate section

- [ ] **Task 4: Create Convert to Contract API**
  - [ ] Add POST /api/proposals/:id/contract endpoint to `server/routes/proposals.ts`
  - [ ] Verify proposal ownership
  - [ ] Fetch template by ID
  - [ ] Create contract with pre-filled data from proposal
  - [ ] Pre-fill party information (name, email, company)
  - [ ] Copy template content to contract
  - [ ] Update proposal status to "responded"
  - [ ] Set respondedAt timestamp
  - [ ] Link contract to proposal (contractId field)
  - [ ] Return contract ID for navigation

- [ ] **Task 5: Update Proposal Detail Page**
  - [ ] Add "Create Contract" CTA section to proposal detail
  - [ ] Link to CreateContractFromProposal page
  - [ ] Show if contract already created from proposal

- [ ] **Task 6: Update Contract Detail Page**
  - [ ] Add proposal origin indicator when contract.proposalId exists
  - [ ] Display "Created from Proposal" banner
  - [ ] Add link back to original proposal

- [ ] **Task 7: Testing**
  - [ ] Unit test: Template suggestions based on proposal type
  - [ ] Integration test: POST /api/proposals/:id/contract creates contract
  - [ ] Integration test: Proposal status updated to "responded"
  - [ ] Integration test: Contract has correct pre-filled data
  - [ ] Integration test: Proposal-contract link established
  - [ ] E2E test: Full flow - select template → create contract
  - [ ] E2E test: Verify pre-filled information in contract
  - [ ] E2E test: Navigate to contract editor successfully

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
