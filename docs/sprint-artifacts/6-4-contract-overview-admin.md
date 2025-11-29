# Story 6.4: Contract Overview (Admin)

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 6.4 |
| **Epic** | Epic 6: Admin Dashboard |
| **Title** | Contract Overview (Admin) |
| **Priority** | P1 - High |
| **Story Points** | 4 |
| **Status** | Drafted |

## User Story

**As an** admin
**I want** to view all contracts on the platform
**So that** I can monitor usage and troubleshoot

## Context

Admins need visibility into all contracts across the platform for support, troubleshooting, and monitoring. This is read-only access - admins cannot edit user contracts.

**Dependencies:**
- Story 6.1 (Admin Layout)
- Epic 2 (AI Analysis data)
- Epic 4 (E-Signing data)

## Acceptance Criteria

- [ ] **AC-1:** Contract list with pagination
- [ ] **AC-2:** Search by title, user email, party name
- [ ] **AC-3:** Filter by status, type, date range
- [ ] **AC-4:** View contract details (read-only)
- [ ] **AC-5:** See AI analysis results if available
- [ ] **AC-6:** See signature status
- [ ] **AC-7:** Export contracts report (CSV)
- [ ] **AC-8:** Cannot edit user contracts (view only)

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/routes/admin/contracts.ts` | New: Contract admin API |
| `client/src/pages/admin/ContractOverview.tsx` | New: Contract list |
| `client/src/pages/admin/ContractDetail.tsx` | New: Contract view |
| `client/src/components/admin/ContractTable.tsx` | New: Table component |

### Implementation

#### Contract Admin API

```typescript
// server/routes/admin/contracts.ts
import { Router } from 'express';
import { db } from '../../db';
import { contracts } from '../../db/schema/contracts';
import { users } from '../../db/schema/users';
import { signatureRequests } from '../../db/schema/signatures';
import { eq, ilike, or, count, desc, and, gte, lte } from 'drizzle-orm';
import { logAdminActivity } from '../../services/adminActivity';

const router = Router();

// GET /api/admin/contracts
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const status = req.query.status as string;
    const type = req.query.type as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    // Build conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(contracts.title, `%${search}%`),
          ilike(contracts.parties, `%${search}%`)
        )
      );
    }

    if (status) {
      conditions.push(eq(contracts.status, status));
    }

    if (type) {
      conditions.push(eq(contracts.type, type));
    }

    if (dateFrom) {
      conditions.push(gte(contracts.createdAt, new Date(dateFrom)));
    }

    if (dateTo) {
      conditions.push(lte(contracts.createdAt, new Date(dateTo)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total
    const [totalResult] = await db
      .select({ count: count() })
      .from(contracts)
      .where(whereClause);

    // Get contracts with user info
    const contractList = await db.query.contracts.findMany({
      where: whereClause,
      orderBy: desc(contracts.createdAt),
      limit,
      offset,
      columns: {
        id: true,
        title: true,
        status: true,
        type: true,
        hasAiAnalysis: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Get signature status for each contract
    const contractsWithSignatures = await Promise.all(
      contractList.map(async (contract) => {
        const sigRequest = await db.query.signatureRequests.findFirst({
          where: eq(signatureRequests.contractId, contract.id),
          columns: {
            status: true,
          },
        });

        return {
          ...contract,
          signatureStatus: sigRequest?.status || null,
        };
      })
    );

    res.json({
      contracts: contractsWithSignatures,
      pagination: {
        page,
        limit,
        total: totalResult.count,
        totalPages: Math.ceil(totalResult.count / limit),
      },
    });
  } catch (error) {
    console.error('[ADMIN] List contracts error:', error);
    res.status(500).json({ error: 'Failed to list contracts' });
  }
});

// GET /api/admin/contracts/:id
router.get('/:id', async (req, res) => {
  try {
    const contract = await db.query.contracts.findFirst({
      where: eq(contracts.id, req.params.id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Get AI analysis if exists
    const analysis = await db.query.contractAnalyses.findFirst({
      where: eq(contractAnalyses.contractId, contract.id),
      orderBy: desc(contractAnalyses.createdAt),
    });

    // Get signature request if exists
    const sigRequest = await db.query.signatureRequests.findFirst({
      where: eq(signatureRequests.contractId, contract.id),
      with: {
        signatories: true,
      },
    });

    // Log view
    await logAdminActivity({
      req,
      action: 'contract.view',
      entityType: 'contract',
      entityId: contract.id,
    });

    res.json({
      contract,
      analysis,
      signatureRequest: sigRequest,
    });
  } catch (error) {
    console.error('[ADMIN] Get contract error:', error);
    res.status(500).json({ error: 'Failed to get contract' });
  }
});

// GET /api/admin/contracts/export/csv
router.get('/export/csv', async (req, res) => {
  try {
    const allContracts = await db.query.contracts.findMany({
      orderBy: desc(contracts.createdAt),
      with: {
        user: {
          columns: {
            email: true,
          },
        },
      },
    });

    const headers = ['id', 'title', 'user_email', 'status', 'type', 'has_ai_analysis', 'created_at'];
    const rows = allContracts.map((c) => [
      c.id,
      c.title,
      c.user?.email || '',
      c.status,
      c.type,
      c.hasAiAnalysis,
      c.createdAt?.toISOString() || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    await logAdminActivity({
      req,
      action: 'export.contracts',
      entityType: 'export',
      details: { count: allContracts.length },
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=contracts-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('[ADMIN] Export contracts error:', error);
    res.status(500).json({ error: 'Failed to export contracts' });
  }
});

export default router;
```

#### Contract Table Component

```tsx
// client/src/components/admin/ContractTable.tsx
import { Link } from 'react-router-dom';
import { FileText, Brain, PenTool } from 'lucide-react';

interface Contract {
  id: string;
  title: string;
  status: string;
  type: string;
  hasAiAnalysis: boolean;
  signatureStatus: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface Props {
  contracts: Contract[];
  isLoading?: boolean;
}

export function ContractTable({ contracts, isLoading }: Props) {
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      signed: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      expired: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getSignatureIcon = (status: string | null) => {
    if (!status) return null;

    const colors: Record<string, string> = {
      pending: 'text-yellow-500',
      in_progress: 'text-blue-500',
      completed: 'text-green-500',
    };

    return (
      <PenTool className={`h-4 w-4 ${colors[status] || 'text-gray-400'}`} title={`Signature: ${status}`} />
    );
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-4 bg-gray-200 rounded w-1/6" />
            <div className="h-4 bg-gray-200 rounded w-1/6" />
          </div>
        ))}
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No contracts found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Contract
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Owner
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Features
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Created
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {contracts.map((contract) => (
            <tr key={contract.id} className="hover:bg-gray-50">
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 truncate max-w-xs">
                      {contract.title}
                    </p>
                    <p className="text-xs text-gray-500">{contract.type}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <Link
                  to={`/admin/users/${contract.user.id}`}
                  className="text-sm text-gray-900 hover:text-burgundy"
                >
                  {contract.user.name}
                </Link>
                <p className="text-xs text-gray-500">{contract.user.email}</p>
              </td>
              <td className="px-4 py-4">
                {getStatusBadge(contract.status)}
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  {contract.hasAiAnalysis && (
                    <Brain className="h-4 w-4 text-purple-500" title="AI Analyzed" />
                  )}
                  {getSignatureIcon(contract.signatureStatus)}
                </div>
              </td>
              <td className="px-4 py-4 text-sm text-gray-600">
                {new Date(contract.createdAt).toLocaleDateString('en-GB')}
              </td>
              <td className="px-4 py-4 text-right">
                <Link
                  to={`/admin/contracts/${contract.id}`}
                  className="text-burgundy hover:text-burgundy-dark text-sm font-medium"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### Contract Detail Page

```tsx
// client/src/pages/admin/ContractDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, User, Brain, PenTool, Clock } from 'lucide-react';

export function ContractDetail() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContract();
  }, [id]);

  const fetchContract = async () => {
    try {
      const response = await fetch(`/api/admin/contracts/${id}`, {
        credentials: 'include',
      });
      if (response.ok) {
        setData(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch contract:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!data) {
    return <div>Contract not found</div>;
  }

  const { contract, analysis, signatureRequest } = data;

  return (
    <div>
      <Link
        to="/admin/contracts"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Contracts
      </Link>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-burgundy/10 rounded-lg">
              <FileText className="h-6 w-6 text-burgundy" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{contract.title}</h1>
              <p className="text-gray-500">{contract.type}</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
            {contract.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Owner</p>
            <Link
              to={`/admin/users/${contract.user.id}`}
              className="font-medium text-burgundy hover:underline"
            >
              {contract.user.name}
            </Link>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created</p>
            <p className="font-medium">
              {new Date(contract.createdAt).toLocaleDateString('en-GB')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">AI Analysis</p>
            <p className="font-medium flex items-center gap-1">
              {contract.hasAiAnalysis ? (
                <>
                  <Brain className="h-4 w-4 text-purple-500" />
                  Analyzed
                </>
              ) : (
                'None'
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Signatures</p>
            <p className="font-medium flex items-center gap-1">
              {signatureRequest ? (
                <>
                  <PenTool className="h-4 w-4 text-blue-500" />
                  {signatureRequest.status}
                </>
              ) : (
                'None'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* AI Analysis Section */}
      {analysis && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Analysis
          </h2>
          <div className="prose max-w-none">
            <p><strong>Summary:</strong> {analysis.summary}</p>
            {analysis.fairnessScore && (
              <p><strong>Fairness Score:</strong> {analysis.fairnessScore}/100</p>
            )}
          </div>
        </div>
      )}

      {/* Signature Request Section */}
      {signatureRequest && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PenTool className="h-5 w-5 text-blue-500" />
            Signature Request
          </h2>
          <div className="space-y-3">
            {signatureRequest.signatories?.map((sig: any) => (
              <div key={sig.id} className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">{sig.name}</p>
                  <p className="text-sm text-gray-500">{sig.email}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  sig.status === 'signed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {sig.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-sm text-gray-500 text-center">
        This is a read-only view. Contract editing is only available to the contract owner.
      </p>
    </div>
  );
}
```

## Definition of Done

- [ ] Contract list with pagination
- [ ] Search functionality works
- [ ] Filters work (status, type, date)
- [ ] Contract detail view shows all info
- [ ] AI analysis displayed if available
- [ ] Signature status displayed
- [ ] CSV export works
- [ ] No edit capabilities (read-only)

## Testing Checklist

### Integration Tests

- [ ] List contracts API
- [ ] Search and filters
- [ ] Contract detail API
- [ ] CSV export

### E2E Tests

- [ ] Browse contracts
- [ ] Search by title
- [ ] Filter by status
- [ ] View contract details
- [ ] Export to CSV

## Related Documents

- [Epic 6 Tech Spec](./tech-spec-epic-6.md)
- [Epic 2: AI Attorney](./tech-spec-epic-2.md)
- [Epic 4: E-Signing](./tech-spec-epic-4.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create contract list API endpoint**
  - [ ] Implement GET `/api/admin/contracts` with pagination
  - [ ] Build search query for title and party names
  - [ ] Add filters for status, type, and date range
  - [ ] Include signature status for each contract
  - [ ] Test pagination and filtering

- [ ] **Task 2: Create contract detail API endpoint**
  - [ ] Implement GET `/api/admin/contracts/:id` endpoint
  - [ ] Fetch contract with user info
  - [ ] Include AI analysis if available
  - [ ] Include signature request and signatories
  - [ ] Log view activity
  - [ ] Test contract detail retrieval

- [ ] **Task 3: Implement CSV export endpoint**
  - [ ] Create GET `/api/admin/contracts/export/csv` endpoint
  - [ ] Generate CSV with contract data
  - [ ] Log export activity
  - [ ] Test CSV format and download

- [ ] **Task 4: Build ContractTable component**
  - [ ] Create table with contract list display
  - [ ] Add status badges
  - [ ] Show AI analysis and signature icons
  - [ ] Link to user profiles
  - [ ] Add loading and empty states
  - [ ] Test table rendering

- [ ] **Task 5: Build ContractDetail page**
  - [ ] Create detail view with contract info
  - [ ] Display AI analysis section if available
  - [ ] Display signature request section if available
  - [ ] Add back navigation
  - [ ] Show read-only disclaimer
  - [ ] Test detail page with various contract states

- [ ] **Task 6: Build ContractOverview page**
  - [ ] Implement data fetching with filters
  - [ ] Add search and filter controls
  - [ ] Integrate ContractTable component
  - [ ] Add pagination
  - [ ] Add export functionality
  - [ ] Test complete contract overview workflow

- [ ] **Task 7: Mount contract routes and test**
  - [ ] Add contract routes to admin router
  - [ ] Test search and filtering
  - [ ] Verify read-only access (no edit)
  - [ ] Test CSV export end-to-end

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
