# Story 9.7: Link Sections & Headers

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 9.7 |
| **Epic** | Epic 9: Landing Page Customization |
| **Title** | Link Sections & Headers |
| **Priority** | P1 - Medium (Phase 2) |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As an** artist
**I want** to organize my links under headings
**So that** visitors can find what they need easily

## Context

Completes Phase 2 by adding content organization. Users can add section headers between links to group content logically.

**Dependencies:**
- Existing landingPageLinks table

## Acceptance Criteria

- [ ] **AC-1:** User can add section header between links
- [ ] **AC-2:** Headers display with theme styling (heading font, colors)
- [ ] **AC-3:** Sections and links can be reordered together via drag-and-drop
- [ ] **AC-4:** Empty sections hidden on public page
- [ ] **AC-5:** Headers have no URL (display-only)
- [ ] **AC-6:** Delete header option available

## Technical Requirements

### Schema Changes

```typescript
// Extend landingPageLinks table in shared/schema.ts
type: text("type").default("link"), // 'link' | 'header'
```

### Files to Modify

| File | Changes |
|------|---------|
| `shared/schema.ts` | Add type field to landingPageLinks |
| `client/src/pages/Dashboard.tsx` | Update link editor to support headers |
| `client/src/pages/ArtistPage.tsx` | Render headers differently from links |

### Link Types

```typescript
type LinkType = 'link' | 'header';

interface LandingPageLink {
  id: string;
  landingPageId: string;
  title: string;
  url: string;
  icon?: string;
  enabled: boolean;
  order: string;
  type: LinkType; // NEW
}
```

### Header Rendering

```tsx
// In ArtistPage links section
{page.links.map((item) => (
  item.type === 'header' ? (
    <h3
      key={item.id}
      className="text-lg font-semibold mt-6 mb-2"
      style={{
        color: primaryColor,
        fontFamily: headingFont
      }}
    >
      {item.title}
    </h3>
  ) : (
    <a key={item.id} href={item.url} ...>
      {item.title}
    </a>
  )
))}
```

## Definition of Done

- [ ] Schema updated with type field on landingPageLinks
- [ ] "Add Header" button in link editor
- [ ] Headers render differently from links
- [ ] Drag-and-drop works for both links and headers
- [ ] Empty headers hidden on public page
- [ ] Type check passes

---

## Tasks/Subtasks

- [ ] **Task 1: Update Schema**
  - [ ] Add type field to landingPageLinks
  - [ ] Default to 'link' for backwards compatibility
  - [ ] Run npm run db:push
  - [ ] Update insertLandingPageLinkSchema

- [ ] **Task 2: Update Link Editor in Dashboard**
  - [ ] Add "Add Header" button alongside "Add Link"
  - [ ] Headers have title input only (no URL)
  - [ ] Distinguish headers visually in the list
  - [ ] Allow header title editing
  - [ ] Support delete for headers

- [ ] **Task 3: Update Drag-and-Drop**
  - [ ] Ensure headers can be dragged like links
  - [ ] Order field determines position for both types

- [ ] **Task 4: Render in ArtistPage**
  - [ ] Check type field for each item
  - [ ] Render headers as h3 elements
  - [ ] Apply theme styling to headers
  - [ ] Skip empty/untitled headers

- [ ] **Task 5: Testing**
  - [ ] Add header, verify it saves
  - [ ] Reorder header among links
  - [ ] Verify header renders on public page
  - [ ] Test header with empty title is hidden

---

## Dev Notes

### Backward Compatibility

Existing links have no `type` field - default to 'link' in code:
```typescript
const itemType = link.type || 'link';
```

### Empty Header Check

```typescript
// Hide empty headers on public page
const visibleItems = page.links.filter(item => {
  if (item.type === 'header') {
    return item.title && item.title.trim() !== '';
  }
  return item.enabled;
});
```

### References
- [Source: docs/sprint-artifacts/tech-spec-epic-9.md#Story-9.7-Link-Sections-Headers]

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
