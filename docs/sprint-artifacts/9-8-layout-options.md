# Story 9.8: Layout Options

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 9.8 |
| **Epic** | Epic 9: Landing Page Customization |
| **Title** | Layout Options |
| **Priority** | P2 - Low (Phase 3) |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As an** artist
**I want** to choose different layout styles for my landing page
**So that** I can create a unique visual presentation

## Context

First story in Phase 3 (Advanced Features). Adds layout customization including overall page layout, avatar positioning, and link width options.

**Dependencies:**
- Story 9.1 (Theme Presets) - layout, avatarPosition, linkWidth schema fields

## Acceptance Criteria

- [ ] **AC-1:** 3 layout options available: centered, left-aligned, grid
- [ ] **AC-2:** Avatar position options: top, left, hidden
- [ ] **AC-3:** Link width options: full, medium, compact
- [ ] **AC-4:** Preview shows layout changes immediately
- [ ] **AC-5:** Layout persists and displays on public page
- [ ] **AC-6:** Grid layout shows links in 2-column format

## Technical Requirements

### Files to Create

| File | Purpose |
|------|---------|
| `client/src/components/landing/LayoutSelector.tsx` | Layout option selection with visual previews |

### Files to Modify

| File | Changes |
|------|---------|
| `client/src/pages/Dashboard.tsx` | Add layout selector to landing editor |
| `client/src/pages/ArtistPage.tsx` | Apply layout styles based on settings |

### Layout Options

```typescript
export const LAYOUT_OPTIONS = [
  { id: 'centered', name: 'Centered', description: 'Content centered on page' },
  { id: 'left', name: 'Left Aligned', description: 'Content aligned to left' },
  { id: 'grid', name: 'Grid', description: 'Links in 2-column grid' },
];

export const AVATAR_POSITIONS = [
  { id: 'top', name: 'Top', description: 'Avatar above name' },
  { id: 'left', name: 'Left', description: 'Avatar beside name' },
  { id: 'hidden', name: 'Hidden', description: 'No avatar shown' },
];

export const LINK_WIDTHS = [
  { id: 'full', name: 'Full Width', description: '100% container width' },
  { id: 'medium', name: 'Medium', description: '80% container width' },
  { id: 'compact', name: 'Compact', description: '60% container width' },
];
```

### CSS Layout Implementation

```css
/* Layout: Centered (default) */
.layout-centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

/* Layout: Left */
.layout-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

/* Layout: Grid */
.layout-grid .links-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

/* Avatar Position: Top */
.avatar-top {
  flex-direction: column;
}
.avatar-top .avatar {
  margin-bottom: 1rem;
}

/* Avatar Position: Left */
.avatar-left {
  flex-direction: row;
  align-items: center;
}
.avatar-left .avatar {
  margin-right: 1.5rem;
}

/* Avatar Position: Hidden */
.avatar-hidden .avatar {
  display: none;
}

/* Link Width */
.link-width-full { max-width: 100%; }
.link-width-medium { max-width: 80%; }
.link-width-compact { max-width: 60%; }
```

## Definition of Done

- [ ] LayoutSelector component created with 3 sections
- [ ] Layout options show visual mini-previews
- [ ] Avatar position options functional
- [ ] Link width options functional
- [ ] All layouts render correctly on ArtistPage
- [ ] Grid layout responsive on mobile
- [ ] Type check passes

---

## Tasks/Subtasks

- [ ] **Task 1: Create LayoutSelector Component**
  - [ ] Create `client/src/components/landing/LayoutSelector.tsx`
  - [ ] Add layout selection with 3 options
  - [ ] Add avatar position selection with 3 options
  - [ ] Add link width selection with 3 options
  - [ ] Show visual previews for each option
  - [ ] Support onChange callbacks

- [ ] **Task 2: Integrate in Dashboard**
  - [ ] Add "Layout" section to landing editor
  - [ ] Pass current layout, avatarPosition, linkWidth values
  - [ ] Handle selection changes
  - [ ] Show live preview

- [ ] **Task 3: Apply Layouts in ArtistPage**
  - [ ] Apply layout class based on page.layout
  - [ ] Apply avatar position class
  - [ ] Apply link width styling
  - [ ] Handle grid layout for links section
  - [ ] Ensure headers work in grid layout

- [ ] **Task 4: Responsive Design**
  - [ ] Grid layout collapses to single column on mobile
  - [ ] Link widths adjust for mobile
  - [ ] Avatar left position stacks on mobile

- [ ] **Task 5: Testing**
  - [ ] Test all 3 layout options
  - [ ] Test all avatar positions
  - [ ] Test all link widths
  - [ ] Test grid layout on mobile
  - [ ] Verify persistence

---

## Dev Notes

### Learnings from Previous Stories

**From Story 9-1-theme-presets:**
- layout, avatarPosition, linkWidth schema fields exist
- Default values are 'centered', 'top', 'full'

**From Story 9-7-link-sections-headers:**
- Headers (type='header') need to span full width in grid layout

### Grid Layout Header Handling

```tsx
// In grid layout, headers should span both columns
{item.type === 'header' ? (
  <h3 className="col-span-2">{item.title}</h3>
) : (
  <a href={item.url}>{item.title}</a>
)}
```

### Mobile Responsive

```css
@media (max-width: 640px) {
  .layout-grid .links-container {
    grid-template-columns: 1fr; /* Single column on mobile */
  }

  .avatar-left {
    flex-direction: column; /* Stack on mobile */
    text-align: center;
  }
}
```

### References
- [Source: docs/sprint-artifacts/tech-spec-epic-9.md#Layout-Options]

---

## Dev Agent Record

### Context Reference

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-01 | Story drafted | SM Agent (Bob) |
