# Story 10.2: Dashboard Stats Integration

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 10.2 |
| **Epic** | Epic 10: Analytics & Insights |
| **Title** | Dashboard Stats Integration |
| **Priority** | P1 - High |
| **Story Points** | 2 |
| **Status** | Ready for Dev |

## User Story

**As an** artist
**I want** to see real statistics on my Dashboard overview
**So that** I can quickly understand my contract activity and landing page performance at a glance

## Context

The Dashboard overview section displays 4 stat cards. Currently:
- **Active Contracts**: Already uses real data from contracts array
- **Pending Review**: Already uses real data from contracts array
- **Page Views**: Hardcoded as '14.2K' - needs real data from analytics
- **Total Value**: To be removed per user request

This story updates the Dashboard stats to show only 3 cards with real data, integrating with the analytics API from Story 10.1.

**Dependencies:**
- Story 10.1: Landing Page Analytics Tracking (provides page views data)

## Acceptance Criteria

- [ ] **AC-1:** Remove "Total Value" stat card from Dashboard overview
- [ ] **AC-2:** Update grid layout from 4 columns to 3 columns
- [ ] **AC-3:** "Page Views" card displays real data from analytics API
- [ ] **AC-4:** Stats show loading state while fetching analytics data
- [ ] **AC-5:** Stats gracefully handle missing/zero analytics data
- [ ] **AC-6:** "Active Contracts" and "Pending Review" continue working with real contract data

## Technical Requirements

### Files to Modify

| File | Changes |
|------|---------|
| `client/src/pages/Dashboard.tsx` | Update stats array, grid layout, integrate analytics query |

### Implementation Details

```typescript
// Before: 4 stats with hardcoded Page Views and Total Value
const stats = [
  { label: 'Active Contracts', value: contracts.filter(c => c.status === 'active').length.toString(), change: '+2 this month', trend: 'up' },
  { label: 'Pending Review', value: contracts.filter(c => c.status === 'pending').length.toString(), change: 'Needs attention', trend: 'up' },
  { label: 'Page Views', value: '14.2K', change: '+8.3%', trend: 'up' },
  { label: 'Total Value', value: `$${...}`, change: 'All contracts', trend: 'up' }
];

// After: 3 stats with real Page Views from analytics
const { data: pageViewsData, isLoading: analyticsLoading } = useQuery({
  queryKey: ['/api/analytics/landing-page', landingPageData?.id],
  queryFn: async () => {
    const res = await apiRequest('GET', `/api/analytics/landing-page/${landingPageData?.id}`);
    return res.json();
  },
  enabled: !!landingPageData?.id,
});

const stats = [
  {
    label: 'Active Contracts',
    value: contracts.filter(c => c.status === 'active').length.toString(),
    change: `${contracts.filter(c => c.status === 'active').length > 0 ? 'Currently active' : 'None active'}`,
    trend: 'up'
  },
  {
    label: 'Pending Review',
    value: contracts.filter(c => c.status === 'pending').length.toString(),
    change: contracts.filter(c => c.status === 'pending').length > 0 ? 'Needs attention' : 'All reviewed',
    trend: contracts.filter(c => c.status === 'pending').length > 0 ? 'up' : 'neutral'
  },
  {
    label: 'Page Views',
    value: analyticsLoading ? '...' : formatNumber(pageViewsData?.totalViews || 0),
    change: analyticsLoading ? 'Loading...' : `${pageViewsData?.uniqueVisitors || 0} unique`,
    trend: 'up'
  },
];
```

### Grid Layout Update

```tsx
// Before: 4 columns
<div className="grid grid-cols-4 gap-6 mb-8">

// After: 3 columns
<div className="grid grid-cols-3 gap-6 mb-8">
```

### Number Formatting Helper

```typescript
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
```

## Definition of Done

- [ ] Total Value card removed
- [ ] Grid updated to 3 columns
- [ ] Page Views shows real analytics data
- [ ] Loading state displays while fetching
- [ ] Zero/missing data handled gracefully
- [ ] Type check passes

---

## Tasks/Subtasks

- [ ] **Task 1: Remove Total Value Card**
  - [ ] Remove Total Value from stats array
  - [ ] Update grid-cols-4 to grid-cols-3

- [ ] **Task 2: Integrate Analytics API**
  - [ ] Add useQuery for analytics endpoint
  - [ ] Update Page Views stat to use real data
  - [ ] Add loading state handling
  - [ ] Add error/zero state handling

- [ ] **Task 3: Polish Stats Display**
  - [ ] Add formatNumber helper for large numbers
  - [ ] Update "change" text to be contextually accurate
  - [ ] Ensure responsive behavior with 3 columns

- [ ] **Task 4: Testing**
  - [ ] Verify 3 cards display correctly
  - [ ] Test with zero analytics data
  - [ ] Test loading states
  - [ ] Run TypeScript check

---

## Dev Notes

### Dependency on Story 10.1

This story requires the analytics API endpoint from Story 10.1:
- `GET /api/analytics/landing-page/:id` must exist and return `{ totalViews, uniqueVisitors, ... }`

If implementing before 10.1 is complete, can stub the API response or use mock data temporarily.

### Mobile Responsiveness

Consider updating responsive classes:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
```

---

## Dev Agent Record

### Context Reference
- `docs/sprint-artifacts/10-2-dashboard-stats.context.xml`

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-02 | Story drafted | SM Agent (Bob) |
