# Story 8.2: Advanced Filtering

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 8.2 |
| **Epic** | Epic 8: Contract Storage & Search |
| **Title** | Advanced Filtering |
| **Priority** | P1 - High |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** user
**I want** to filter my contracts
**So that** I can narrow down results

## Context

Beyond search, users need to filter contracts by status, type, and date range. Filters can be combined with search for precise results. Filter state should persist during the session for convenience.

**Dependencies:**
- Story 8.1 (Contract Search)

## Acceptance Criteria

- [ ] **AC-1:** Filter by status: All, Draft, Pending, Active, Completed, Expired
- [ ] **AC-2:** Filter by type: Record Deal, License, Distribution, etc.
- [ ] **AC-3:** Filter by date range (created date)
- [ ] **AC-4:** Multiple filters combinable
- [ ] **AC-5:** Clear all filters button
- [ ] **AC-6:** Filter persistence during session (URL params)
- [ ] **AC-7:** Filter count indicator

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `client/src/components/contracts/ContractFilters.tsx` | New: Filter panel |
| `client/src/pages/dashboard/Contracts.tsx` | Add: Filter integration |
| `server/routes/contracts.ts` | Add: Filter query support |

### Implementation

#### Contract Filters Component

```tsx
// client/src/components/contracts/ContractFilters.tsx
import { useState } from 'react';
import { Filter, X, ChevronDown, Calendar } from 'lucide-react';

interface FilterState {
  status: string;
  type: string;
  dateFrom: string;
  dateTo: string;
}

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending Signature' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'expired', label: 'Expired' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'artist_agreement', label: 'Artist Agreement' },
  { value: 'license_agreement', label: 'License Agreement' },
  { value: 'tour_agreement', label: 'Tour Agreement' },
  { value: 'sample_agreement', label: 'Sample Agreement' },
  { value: 'work_for_hire', label: 'Work for Hire' },
  { value: 'custom', label: 'Custom' },
];

export function ContractFilters({ filters, onChange }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = [
    filters.status,
    filters.type,
    filters.dateFrom || filters.dateTo,
  ].filter(Boolean).length;

  const handleChange = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const handleClearAll = () => {
    onChange({ status: '', type: '', dateFrom: '', dateTo: '' });
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-burgundy-600 text-white text-xs px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-500 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Filter Panel */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-500"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-500"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Created From
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleChange('dateFrom', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                />
              </div>
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Created To
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleChange('dateTo', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <div className="mt-4 pt-4 border-t flex justify-end">
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

#### Active Filter Pills

```tsx
// client/src/components/contracts/ActiveFilters.tsx
import { X } from 'lucide-react';

interface FilterState {
  status: string;
  type: string;
  dateFrom: string;
  dateTo: string;
}

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  active: 'Active',
  completed: 'Completed',
  expired: 'Expired',
};

const TYPE_LABELS: Record<string, string> = {
  artist_agreement: 'Artist Agreement',
  license_agreement: 'License Agreement',
  tour_agreement: 'Tour Agreement',
  sample_agreement: 'Sample Agreement',
  work_for_hire: 'Work for Hire',
  custom: 'Custom',
};

export function ActiveFilters({ filters, onChange }: Props) {
  const pills: { key: keyof FilterState; label: string }[] = [];

  if (filters.status) {
    pills.push({ key: 'status', label: `Status: ${STATUS_LABELS[filters.status]}` });
  }
  if (filters.type) {
    pills.push({ key: 'type', label: `Type: ${TYPE_LABELS[filters.type]}` });
  }
  if (filters.dateFrom) {
    pills.push({ key: 'dateFrom', label: `From: ${filters.dateFrom}` });
  }
  if (filters.dateTo) {
    pills.push({ key: 'dateTo', label: `To: ${filters.dateTo}` });
  }

  if (pills.length === 0) return null;

  const handleRemove = (key: keyof FilterState) => {
    onChange({ ...filters, [key]: '' });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((pill) => (
        <span
          key={pill.key}
          className="inline-flex items-center gap-1 px-3 py-1 bg-burgundy-100 text-burgundy-800 text-sm rounded-full"
        >
          {pill.label}
          <button
            onClick={() => handleRemove(pill.key)}
            className="hover:bg-burgundy-200 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
```

#### URL Parameter Sync

```tsx
// client/src/hooks/useContractFilters.ts
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

interface FilterState {
  search: string;
  status: string;
  type: string;
  dateFrom: string;
  dateTo: string;
}

const defaultFilters: FilterState = {
  search: '',
  status: '',
  type: '',
  dateFrom: '',
  dateTo: '',
};

export function useContractFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: FilterState = {
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    type: searchParams.get('type') || '',
    dateFrom: searchParams.get('from') || '',
    dateTo: searchParams.get('to') || '',
  };

  const setFilters = useCallback((newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    const params = new URLSearchParams();

    if (updated.search) params.set('search', updated.search);
    if (updated.status) params.set('status', updated.status);
    if (updated.type) params.set('type', updated.type);
    if (updated.dateFrom) params.set('from', updated.dateFrom);
    if (updated.dateTo) params.set('to', updated.dateTo);

    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return { filters, setFilters, clearFilters };
}
```

#### Filter API Support

```typescript
// server/routes/contracts.ts (extend existing)
import { and, eq, gte, lte, ilike, or, sql, desc } from 'drizzle-orm';

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const {
      search,
      status,
      type,
      from: dateFrom,
      to: dateTo,
      page: pageParam,
    } = req.query;

    const page = Math.max(1, parseInt(pageParam as string) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    // Build conditions array
    const conditions: SQL[] = [eq(contracts.userId, userId)];

    // Search
    if (search && (search as string).trim()) {
      const searchTerm = `%${(search as string).trim()}%`;
      conditions.push(
        or(
          ilike(contracts.title, searchTerm),
          sql`${contracts.parties}::text ILIKE ${searchTerm}`
        )!
      );
    }

    // Status filter
    if (status) {
      conditions.push(eq(contracts.status, status as string));
    }

    // Type filter
    if (type) {
      conditions.push(eq(contracts.type, type as string));
    }

    // Date range filters
    if (dateFrom) {
      conditions.push(gte(contracts.createdAt, new Date(dateFrom as string)));
    }
    if (dateTo) {
      const endDate = new Date(dateTo as string);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(contracts.createdAt, endDate));
    }

    const whereClause = and(...conditions);

    // Count
    const [countResult] = await db
      .select({ count: count() })
      .from(contracts)
      .where(whereClause);

    // Fetch
    const results = await db.query.contracts.findMany({
      where: whereClause,
      orderBy: desc(contracts.updatedAt),
      limit,
      offset,
      with: {
        folder: {
          columns: { id: true, name: true, color: true },
        },
      },
    });

    res.json({
      contracts: results,
      pagination: {
        page,
        limit,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limit),
      },
      filters: {
        search: search || null,
        status: status || null,
        type: type || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      },
    });
  } catch (error) {
    console.error('[CONTRACTS] Filter error:', error);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});
```

## Definition of Done

- [ ] Status filter works
- [ ] Type filter works
- [ ] Date range filter works
- [ ] Filters combinable
- [ ] Clear filters button works
- [ ] Filters persist in URL
- [ ] Filter count shown

## Testing Checklist

### Unit Tests

- [ ] URL parameter parsing
- [ ] Filter combination logic

### Integration Tests

- [ ] Filter API with all options
- [ ] Combined filters return correct results
- [ ] Date range boundaries

### E2E Tests

- [ ] Select and apply filters
- [ ] Clear individual filter
- [ ] Clear all filters
- [ ] URL reflects filters

## Related Documents

- [Epic 8 Tech Spec](./tech-spec-epic-8.md)
- [Story 8.1: Contract Search](./8-1-contract-search.md)
