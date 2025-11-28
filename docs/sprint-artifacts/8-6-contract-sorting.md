# Story 8.6: Contract Sorting

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 8.6 |
| **Epic** | Epic 8: Contract Storage & Search |
| **Title** | Contract Sorting |
| **Priority** | P1 - High |
| **Story Points** | 2 |
| **Status** | Drafted |

## User Story

**As a** user
**I want** to sort my contracts
**So that** I can view them in my preferred order

## Context

Sorting allows users to organize their contract view by different criteria. This complements search and filtering by providing another way to find and organize contracts.

**Dependencies:**
- Story 8.1 (Contract Search)
- Story 8.2 (Advanced Filtering)

## Acceptance Criteria

- [ ] **AC-1:** Sort by date created
- [ ] **AC-2:** Sort by name/title
- [ ] **AC-3:** Sort by status
- [ ] **AC-4:** Sort by expiry date
- [ ] **AC-5:** Sort by last updated
- [ ] **AC-6:** Ascending/descending toggle
- [ ] **AC-7:** Sort preference saved in URL
- [ ] **AC-8:** Default sort: most recently updated first

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `client/src/components/contracts/ContractSortDropdown.tsx` | New: Sort dropdown |
| `client/src/pages/dashboard/Contracts.tsx` | Add: Sort integration |
| `server/routes/contracts.ts` | Add: Sort query support |

### Implementation

#### Sort Dropdown Component

```tsx
// client/src/components/contracts/ContractSortDropdown.tsx
import { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Check } from 'lucide-react';

export type SortField = 'createdAt' | 'title' | 'status' | 'expiryDate' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

interface SortOption {
  field: SortField;
  label: string;
  defaultOrder: SortOrder;
}

const SORT_OPTIONS: SortOption[] = [
  { field: 'updatedAt', label: 'Last Updated', defaultOrder: 'desc' },
  { field: 'createdAt', label: 'Date Created', defaultOrder: 'desc' },
  { field: 'title', label: 'Name', defaultOrder: 'asc' },
  { field: 'status', label: 'Status', defaultOrder: 'asc' },
  { field: 'expiryDate', label: 'Expiry Date', defaultOrder: 'asc' },
];

interface Props {
  sortField: SortField;
  sortOrder: SortOrder;
  onChange: (field: SortField, order: SortOrder) => void;
}

export function ContractSortDropdown({ sortField, sortOrder, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = SORT_OPTIONS.find((opt) => opt.field === sortField);
  const SortIcon = sortOrder === 'asc' ? ArrowUp : ArrowDown;

  const handleSelect = (option: SortOption) => {
    if (option.field === sortField) {
      // Toggle order if same field
      onChange(option.field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Use default order for new field
      onChange(option.field, option.defaultOrder);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <ArrowUpDown className="h-4 w-4 text-gray-500" />
        <span className="text-sm">
          {currentOption?.label || 'Sort'}
        </span>
        <SortIcon className="h-3 w-3 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border py-1 z-20">
          {SORT_OPTIONS.map((option) => {
            const isSelected = option.field === sortField;
            return (
              <button
                key={option.field}
                onClick={() => handleSelect(option)}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 ${
                  isSelected ? 'text-burgundy-600 font-medium' : 'text-gray-700'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <div className="flex items-center gap-1">
                    <SortIcon className="h-3 w-3" />
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

#### Sort with URL Sync Hook

```tsx
// client/src/hooks/useContractSort.ts
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortField, SortOrder } from '../components/contracts/ContractSortDropdown';

const DEFAULT_SORT_FIELD: SortField = 'updatedAt';
const DEFAULT_SORT_ORDER: SortOrder = 'desc';

export function useContractSort() {
  const [searchParams, setSearchParams] = useSearchParams();

  const sortField = (searchParams.get('sort') as SortField) || DEFAULT_SORT_FIELD;
  const sortOrder = (searchParams.get('order') as SortOrder) || DEFAULT_SORT_ORDER;

  const setSort = useCallback(
    (field: SortField, order: SortOrder) => {
      const params = new URLSearchParams(searchParams);

      // Only add to URL if not default
      if (field === DEFAULT_SORT_FIELD && order === DEFAULT_SORT_ORDER) {
        params.delete('sort');
        params.delete('order');
      } else {
        params.set('sort', field);
        params.set('order', order);
      }

      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  return { sortField, sortOrder, setSort };
}
```

#### Contracts Page Integration

```tsx
// client/src/pages/dashboard/Contracts.tsx (partial update)
import { ContractSortDropdown, SortField, SortOrder } from '../../components/contracts/ContractSortDropdown';
import { useContractSort } from '../../hooks/useContractSort';

export function Contracts() {
  const { sortField, sortOrder, setSort } = useContractSort();
  // ... other state ...

  useEffect(() => {
    fetchContracts();
  }, [searchQuery, filters, sortField, sortOrder]);

  const fetchContracts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      if (searchQuery) params.set('search', searchQuery);
      if (filters.status) params.set('status', filters.status);
      if (filters.type) params.set('type', filters.type);
      if (filters.dateFrom) params.set('from', filters.dateFrom);
      if (filters.dateTo) params.set('to', filters.dateTo);

      // Add sort params
      params.set('sort', sortField);
      params.set('order', sortOrder);

      const response = await fetch(`/api/contracts?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setContracts(data.contracts);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contracts</h1>
        {/* Add contract button */}
      </div>

      {/* Search and Sort Bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <ContractSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
        <ContractSortDropdown
          sortField={sortField}
          sortOrder={sortOrder}
          onChange={setSort}
        />
      </div>

      {/* Filters */}
      <ContractFilters filters={filters} onChange={setFilters} />

      {/* Results */}
      {/* ... */}
    </div>
  );
}
```

#### Sort API Support

```typescript
// server/routes/contracts.ts (extend existing)
import { asc, desc } from 'drizzle-orm';

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const {
      search,
      status,
      type,
      from: dateFrom,
      to: dateTo,
      sort = 'updatedAt',
      order = 'desc',
      page: pageParam,
    } = req.query;

    // ... existing filter logic ...

    // Build order by clause
    const sortColumn = getSortColumn(sort as string);
    const orderBy = order === 'asc' ? asc(sortColumn) : desc(sortColumn);

    // Fetch contracts with sorting
    const results = await db.query.contracts.findMany({
      where: whereClause,
      orderBy,
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
      pagination: { /* ... */ },
      sort: { field: sort, order },
    });
  } catch (error) {
    console.error('[CONTRACTS] Sort error:', error);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

function getSortColumn(sort: string) {
  switch (sort) {
    case 'title':
      return contracts.title;
    case 'status':
      return contracts.status;
    case 'createdAt':
      return contracts.createdAt;
    case 'expiryDate':
      return contracts.expiryDate;
    case 'updatedAt':
    default:
      return contracts.updatedAt;
  }
}
```

#### Column Header Sorting (Alternative UI)

```tsx
// client/src/components/contracts/SortableColumnHeader.tsx
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { SortField, SortOrder } from './ContractSortDropdown';

interface Props {
  field: SortField;
  label: string;
  currentField: SortField;
  currentOrder: SortOrder;
  onSort: (field: SortField, order: SortOrder) => void;
}

export function SortableColumnHeader({
  field,
  label,
  currentField,
  currentOrder,
  onSort,
}: Props) {
  const isActive = field === currentField;

  const handleClick = () => {
    if (isActive) {
      // Toggle order
      onSort(field, currentOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to desc for new column
      onSort(field, 'desc');
    }
  };

  const Icon = isActive
    ? currentOrder === 'asc'
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1 text-sm font-medium ${
        isActive ? 'text-burgundy-600' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
      <Icon className="h-3 w-3" />
    </button>
  );
}
```

## Definition of Done

- [ ] Sort dropdown displays all options
- [ ] Sort by each field works
- [ ] Ascending/descending toggle works
- [ ] Sort persists in URL
- [ ] Default sort is most recently updated
- [ ] Combines with search and filters

## Testing Checklist

### Unit Tests

- [ ] Sort order toggle logic
- [ ] URL param handling

### Integration Tests

- [ ] Sort API with each field
- [ ] Combined with filters

### E2E Tests

- [ ] Select different sorts
- [ ] Toggle sort order
- [ ] Sort persists after refresh

## Related Documents

- [Epic 8 Tech Spec](./tech-spec-epic-8.md)
- [Story 8.1: Contract Search](./8-1-contract-search.md)
- [Story 8.2: Advanced Filtering](./8-2-advanced-filtering.md)
