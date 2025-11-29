# Story 3.7: Template Selection UI

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 3.7 |
| **Epic** | Epic 3: Contract Templates |
| **Title** | Template Selection UI |
| **Priority** | P1 - High |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** user
**I want** to browse and select contract templates
**So that** I can create contracts quickly

## Context

The template gallery is the entry point for creating template-based contracts. Users can browse available templates, filter by category, search by name, and select a template to begin the fill-in process.

**Dependencies:**
- Story 3.1 (Data Model) must be completed first
- Template definitions (Stories 3.2-3.6) should be seeded

## Acceptance Criteria

- [ ] **AC-1:** Template gallery displays all active templates
- [ ] **AC-2:** Category filter tabs (All, Artist, Licensing, Touring, Production)
- [ ] **AC-3:** Search functionality filters by name and description
- [ ] **AC-4:** Template cards show: name, description, category badge
- [ ] **AC-5:** "Use Template" button starts creation flow
- [ ] **AC-6:** Templates sorted by sortOrder field
- [ ] **AC-7:** Empty state for no results
- [ ] **AC-8:** Loading state during fetch

## Technical Requirements

### API Endpoint

```typescript
// GET /api/templates
app.get('/api/templates', requireAuth, async (req, res) => {
  const { category, search } = req.query;

  let query = db.select()
    .from(contractTemplates)
    .where(eq(contractTemplates.isActive, true))
    .orderBy(contractTemplates.sortOrder);

  // Apply category filter
  if (category && category !== 'all') {
    query = query.where(eq(contractTemplates.category, category));
  }

  const templates = await query;

  // Apply search filter in-memory (for simplicity)
  let filtered = templates;
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = templates.filter(t =>
      t.name.toLowerCase().includes(searchLower) ||
      t.description?.toLowerCase().includes(searchLower)
    );
  }

  res.json({ templates: filtered });
});
```

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/routes/templates.ts` | New: Template routes |
| `client/src/pages/Templates.tsx` | New: Templates page |
| `client/src/components/templates/TemplateGallery.tsx` | New: Gallery component |
| `client/src/components/templates/TemplateCard.tsx` | New: Template card |
| `client/src/components/templates/CategoryFilter.tsx` | New: Category tabs |
| `client/src/hooks/useTemplates.ts` | New: Templates data hook |

### Implementation Details

#### 1. Templates Hook

```typescript
// client/src/hooks/useTemplates.ts
import { useState, useEffect, useCallback } from 'react';
import { ContractTemplate, TemplateCategory } from '../types';

interface UseTemplatesReturn {
  templates: ContractTemplate[];
  loading: boolean;
  error: string | null;
  category: TemplateCategory | 'all';
  setCategory: (cat: TemplateCategory | 'all') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  refresh: () => void;
}

export function useTemplates(): UseTemplatesReturn {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/templates?${params}`);
      const data = await response.json();

      if (response.ok) {
        setTemplates(data.templates);
      } else {
        setError(data.error || 'Failed to load templates');
      }
    } catch (err) {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [category, searchQuery]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    category,
    setCategory,
    searchQuery,
    setSearchQuery,
    refresh: fetchTemplates
  };
}
```

#### 2. Category Filter Component

```tsx
// client/src/components/templates/CategoryFilter.tsx
import { TemplateCategory } from '../../types';

interface Props {
  selected: TemplateCategory | 'all';
  onChange: (category: TemplateCategory | 'all') => void;
}

const categories: { value: TemplateCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Templates' },
  { value: 'artist', label: 'Artist' },
  { value: 'licensing', label: 'Licensing' },
  { value: 'touring', label: 'Touring' },
  { value: 'production', label: 'Production' }
];

export function CategoryFilter({ selected, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {categories.map(cat => (
        <button
          key={cat.value}
          onClick={() => onChange(cat.value)}
          className={`
            px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
            transition-colors
            ${selected === cat.value
              ? 'bg-burgundy text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
```

#### 3. Template Card Component

```tsx
// client/src/components/templates/TemplateCard.tsx
import { FileText, ArrowRight } from 'lucide-react';
import { ContractTemplate } from '../../types';

interface Props {
  template: ContractTemplate;
  onSelect: (template: ContractTemplate) => void;
}

const categoryColors: Record<string, string> = {
  artist: 'bg-purple-100 text-purple-700',
  licensing: 'bg-blue-100 text-blue-700',
  touring: 'bg-green-100 text-green-700',
  production: 'bg-orange-100 text-orange-700',
  business: 'bg-gray-100 text-gray-700'
};

export function TemplateCard({ template, onSelect }: Props) {
  const categoryColor = categoryColors[template.category] || categoryColors.business;

  return (
    <div className="bg-white rounded-lg border hover:border-burgundy hover:shadow-md transition-all p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-burgundy/10 rounded-lg">
          <FileText className="h-6 w-6 text-burgundy" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {template.name}
            </h3>
            <span className={`px-2 py-0.5 text-xs rounded-full ${categoryColor}`}>
              {template.category}
            </span>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">
            {template.description}
          </p>
        </div>
      </div>

      <button
        onClick={() => onSelect(template)}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-burgundy text-white rounded-md hover:bg-burgundy-dark transition-colors"
      >
        <span>Use Template</span>
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
```

#### 4. Template Gallery Component

```tsx
// client/src/components/templates/TemplateGallery.tsx
import { useState } from 'react';
import { Search, FileText } from 'lucide-react';
import { useTemplates } from '../../hooks/useTemplates';
import { CategoryFilter } from './CategoryFilter';
import { TemplateCard } from './TemplateCard';
import { ContractTemplate } from '../../types';

interface Props {
  onSelectTemplate: (template: ContractTemplate) => void;
}

export function TemplateGallery({ onSelectTemplate }: Props) {
  const {
    templates,
    loading,
    error,
    category,
    setCategory,
    searchQuery,
    setSearchQuery
  } = useTemplates();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <CategoryFilter selected={category} onChange={setCategory} />

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-burgundy"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-100 rounded-lg h-48 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && templates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No templates found</h3>
          <p className="text-gray-500 mt-1">
            {searchQuery
              ? 'Try a different search term'
              : 'No templates available in this category'}
          </p>
        </div>
      )}

      {/* Template Grid */}
      {!loading && !error && templates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onSelectTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 5. Templates Page

```tsx
// client/src/pages/Templates.tsx
import { useNavigate } from 'react-router-dom';
import { TemplateGallery } from '../components/templates/TemplateGallery';
import { ContractTemplate } from '../types';

export default function Templates() {
  const navigate = useNavigate();

  const handleSelectTemplate = (template: ContractTemplate) => {
    navigate(`/templates/${template.id}/fill`);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Contract Templates</h1>
        <p className="text-gray-600 mt-1">
          Select a template to create a new contract
        </p>
      </div>

      <TemplateGallery onSelectTemplate={handleSelectTemplate} />
    </div>
  );
}
```

## Definition of Done

- [ ] Templates API endpoint working
- [ ] Gallery displays all active templates
- [ ] Category filter functional
- [ ] Search filters by name/description
- [ ] Template cards styled consistently
- [ ] "Use Template" navigates to fill page
- [ ] Loading skeleton shown during fetch
- [ ] Empty state for no results
- [ ] Mobile responsive layout

## Testing Checklist

### Unit Tests

- [ ] CategoryFilter toggles correctly
- [ ] TemplateCard renders all fields
- [ ] Search filtering works

### Integration Tests

- [ ] API returns active templates only
- [ ] Category filter applied correctly
- [ ] Search query filters results

### E2E Tests

- [ ] Browse templates page
- [ ] Filter by category
- [ ] Search for template
- [ ] Select template → navigate to form

## Related Documents

- [Epic 3 Tech Spec](./tech-spec-epic-3.md)
- [Story 3.8: Template Fill-in Form](./3-8-template-fill-in-form.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create templates API endpoint**
  - [ ] Create server/routes/templates.ts
  - [ ] Implement GET /api/templates
  - [ ] Add category filter
  - [ ] Add search filter
  - [ ] Order by sortOrder
  - [ ] Return only active templates

- [ ] **Task 2: Create useTemplates hook**
  - [ ] Create client/src/hooks/useTemplates.ts
  - [ ] Implement fetch with query params
  - [ ] Track loading, error, templates state
  - [ ] Implement category and search filters
  - [ ] Implement refresh function

- [ ] **Task 3: Create CategoryFilter component**
  - [ ] Create client/src/components/templates/CategoryFilter.tsx
  - [ ] Render category pill buttons
  - [ ] Handle selection state
  - [ ] Add horizontal scroll for mobile

- [ ] **Task 4: Create TemplateCard component**
  - [ ] Create client/src/components/templates/TemplateCard.tsx
  - [ ] Display name and description
  - [ ] Show category badge with color
  - [ ] Add "Use Template" button
  - [ ] Handle click callback

- [ ] **Task 5: Create TemplateGallery component**
  - [ ] Create client/src/components/templates/TemplateGallery.tsx
  - [ ] Integrate CategoryFilter and search
  - [ ] Render TemplateCard grid
  - [ ] Show loading skeleton
  - [ ] Show empty state
  - [ ] Show error state

- [ ] **Task 6: Create Templates page**
  - [ ] Create client/src/pages/Templates.tsx
  - [ ] Render TemplateGallery
  - [ ] Handle template selection navigation
  - [ ] Add route to App.tsx

- [ ] **Task 7: Write tests**
  - [ ] Unit tests for CategoryFilter
  - [ ] Unit tests for TemplateCard
  - [ ] Integration tests for API endpoint
  - [ ] E2E test for browsing and selecting template

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
