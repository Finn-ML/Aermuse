# Story 8.1: Contract Search

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 8.1 |
| **Epic** | Epic 8: Contract Storage & Search |
| **Title** | Contract Search |
| **Priority** | P1 - High |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** user
**I want** to search my contracts
**So that** I can find specific agreements quickly

## Context

Users with many contracts need the ability to quickly find specific ones by searching across titles, party names, and contract content. This is essential for usability as the contract library grows.

**Dependencies:**
- Contracts system (existing)

## Acceptance Criteria

- [ ] **AC-1:** Search input on contracts page
- [ ] **AC-2:** Search by contract title
- [ ] **AC-3:** Search by party name
- [ ] **AC-4:** Search by contract content (if indexed)
- [ ] **AC-5:** Real-time search results (debounced)
- [ ] **AC-6:** Highlight matching terms in results
- [ ] **AC-7:** No results state with suggestions
- [ ] **AC-8:** Clear search button

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `client/src/pages/dashboard/Contracts.tsx` | Add: Search functionality |
| `client/src/components/contracts/ContractSearchBar.tsx` | New: Search input component |
| `server/routes/contracts.ts` | Add: Search query support |

### Implementation

#### Search Bar Component

```tsx
// client/src/components/contracts/ContractSearchBar.tsx
import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { debounce } from 'lodash';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ContractSearchBar({ value, onChange, placeholder = 'Search contracts...' }: Props) {
  const [inputValue, setInputValue] = useState(value);

  // Debounce the onChange callback
  const debouncedOnChange = useCallback(
    debounce((newValue: string) => {
      onChange(newValue);
    }, 300),
    [onChange]
  );

  useEffect(() => {
    debouncedOnChange(inputValue);
    return () => debouncedOnChange.cancel();
  }, [inputValue, debouncedOnChange]);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleClear = () => {
    setInputValue('');
    onChange('');
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
      />
      {inputValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
          aria-label="Clear search"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}
```

#### Contracts Page with Search

```tsx
// client/src/pages/dashboard/Contracts.tsx (partial update)
import { useState, useEffect } from 'react';
import { ContractSearchBar } from '../../components/contracts/ContractSearchBar';
import { ContractCard } from '../../components/contracts/ContractCard';
import { FileText, SearchX } from 'lucide-react';

export function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContracts();
  }, [searchQuery]);

  const fetchContracts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.set('search', searchQuery);
      }

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

      {/* Search Bar */}
      <ContractSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by title, party name, or content..."
      />

      {/* Results */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Searching...</div>
      ) : contracts.length === 0 ? (
        <NoResultsState searchQuery={searchQuery} onClear={() => setSearchQuery('')} />
      ) : (
        <div className="space-y-4">
          {searchQuery && (
            <p className="text-sm text-gray-600">
              Found {contracts.length} contract{contracts.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </p>
          )}
          {contracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NoResultsState({ searchQuery, onClear }: { searchQuery: string; onClear: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <SearchX className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">
        No contracts found
      </h3>
      {searchQuery ? (
        <>
          <p className="text-gray-600 mb-4">
            No contracts match "{searchQuery}". Try different keywords.
          </p>
          <button
            onClick={onClear}
            className="text-burgundy-600 hover:text-burgundy-700 font-medium"
          >
            Clear search
          </button>
        </>
      ) : (
        <p className="text-gray-600">
          You don't have any contracts yet.
        </p>
      )}
    </div>
  );
}
```

#### Search Result Highlighting

```tsx
// client/src/components/contracts/HighlightText.tsx
interface Props {
  text: string;
  highlight: string;
}

export function HighlightText({ text, highlight }: Props) {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }

  const regex = new RegExp(`(${escapeRegex(highlight)})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
}

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

#### Search API Endpoint

```typescript
// server/routes/contracts.ts (update existing)
import { sql, ilike, or, desc, asc } from 'drizzle-orm';

// GET /api/contracts - List with search
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const search = req.query.search as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    let conditions = eq(contracts.userId, userId);

    // Add search conditions
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions = and(
        conditions,
        or(
          ilike(contracts.title, searchTerm),
          // Search in parties JSON
          sql`${contracts.parties}::text ILIKE ${searchTerm}`,
          // Full-text search on content (if indexed)
          sql`to_tsvector('english', COALESCE(${contracts.content}::text, '')) @@ plainto_tsquery('english', ${search.trim()})`
        )
      );
    }

    // Count total matching
    const [countResult] = await db
      .select({ count: count() })
      .from(contracts)
      .where(conditions);

    // Fetch contracts
    const results = await db.query.contracts.findMany({
      where: conditions,
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
      query: search || null,
    });
  } catch (error) {
    console.error('[CONTRACTS] Search error:', error);
    res.status(500).json({ error: 'Failed to search contracts' });
  }
});
```

#### Database Indexing for Search

```sql
-- Add full-text search index
CREATE INDEX idx_contracts_search ON contracts
  USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content::text, '')));

-- Add trigram index for ILIKE searches (requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_contracts_title_trgm ON contracts USING gin(title gin_trgm_ops);
```

## Definition of Done

- [ ] Search input displays on contracts page
- [ ] Search by title works
- [ ] Search by party name works
- [ ] Results update in real-time (debounced)
- [ ] Matching terms highlighted
- [ ] No results state shows suggestions
- [ ] Clear search button works

## Testing Checklist

### Unit Tests

- [ ] Debounce logic
- [ ] Regex escaping
- [ ] Highlight component

### Integration Tests

- [ ] Search API with various queries
- [ ] Empty search returns all
- [ ] Special characters handled

### E2E Tests

- [ ] Type and see results
- [ ] Clear search
- [ ] No results state

## Related Documents

- [Epic 8 Tech Spec](./tech-spec-epic-8.md)
- [Story 8.2: Advanced Filtering](./8-2-advanced-filtering.md)
