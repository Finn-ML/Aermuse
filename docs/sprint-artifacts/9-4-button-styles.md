# Story 9.4: Button Styles

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 9.4 |
| **Epic** | Epic 9: Landing Page Customization |
| **Title** | Button Styles |
| **Priority** | P0 - High (Phase 1 MVP) |
| **Story Points** | 2 |
| **Status** | Drafted |

## User Story

**As an** artist
**I want** to customize how my link buttons look
**So that** they match my page design

## Context

Completes Phase 1 core theming by adding button style customization. Users can choose from preset button styles that apply to all link buttons.

**Dependencies:**
- Story 9.1 (Theme Presets) - buttonStyle schema field already created

## Acceptance Criteria

- [ ] **AC-1:** 6 button style options available (rounded, pill, square, outline, filled, shadow)
- [ ] **AC-2:** Preview shows each style variant
- [ ] **AC-3:** Selected style applies to all link buttons on public page
- [ ] **AC-4:** Button style persists after save
- [ ] **AC-5:** Hover effects appropriate for each style

## Technical Requirements

### Files to Create

| File | Purpose |
|------|---------|
| `client/src/components/landing/ButtonStylePicker.tsx` | Button style selection with visual previews |

### Files to Modify

| File | Changes |
|------|---------|
| `client/src/pages/Dashboard.tsx` | Add button style picker to landing editor |
| `client/src/pages/ArtistPage.tsx` | Apply buttonStyle to link buttons |

### Button Style Definitions

```typescript
export const BUTTON_STYLES = [
  { id: 'rounded', name: 'Rounded', description: 'Subtle rounded corners' },
  { id: 'pill', name: 'Pill', description: 'Fully rounded ends' },
  { id: 'square', name: 'Square', description: 'Sharp corners' },
  { id: 'outline', name: 'Outline', description: 'Transparent with border' },
  { id: 'filled', name: 'Filled', description: 'Solid background' },
  { id: 'shadow', name: 'Shadow', description: 'Elevated with shadow' },
];
```

### CSS Implementation

```css
/* Button style classes */
.link-button {
  display: block;
  width: 100%;
  padding: 1rem 1.5rem;
  text-align: center;
  font-weight: 600;
  transition: all 0.2s ease;
}

.link-button-rounded {
  border-radius: 8px;
  background: var(--primary-color);
  color: var(--secondary-color);
}

.link-button-pill {
  border-radius: 9999px;
  background: var(--primary-color);
  color: var(--secondary-color);
}

.link-button-square {
  border-radius: 0;
  background: var(--primary-color);
  color: var(--secondary-color);
}

.link-button-outline {
  border-radius: 8px;
  background: transparent;
  border: 2px solid var(--primary-color);
  color: var(--primary-color);
}

.link-button-filled {
  border-radius: 8px;
  background: var(--primary-color);
  color: var(--secondary-color);
}

.link-button-shadow {
  border-radius: 8px;
  background: var(--primary-color);
  color: var(--secondary-color);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}

/* Hover effects */
.link-button:hover {
  transform: translateY(-2px);
  opacity: 0.9;
}

.link-button-shadow:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}
```

## Definition of Done

- [ ] ButtonStylePicker component created
- [ ] All 6 button styles shown with preview
- [ ] Selection updates landing page data
- [ ] ArtistPage applies correct button class
- [ ] Hover effects work for each style
- [ ] Type check passes

---

## Tasks/Subtasks

- [ ] **Task 1: Create ButtonStylePicker Component**
  - [ ] Create `client/src/components/landing/ButtonStylePicker.tsx`
  - [ ] Display 6 style options in grid
  - [ ] Each option shows preview button
  - [ ] Highlight selected style
  - [ ] Support onChange callback

- [ ] **Task 2: Integrate in Dashboard**
  - [ ] Add "Button Style" section to landing editor
  - [ ] Pass current buttonStyle as selected
  - [ ] Handle selection change

- [ ] **Task 3: Apply Styles in ArtistPage**
  - [ ] Map buttonStyle value to CSS class
  - [ ] Apply class to link buttons
  - [ ] Ensure hover effects work

- [ ] **Task 4: Testing**
  - [ ] Verify all 6 styles render correctly
  - [ ] Verify selection persists
  - [ ] Test hover effects on each style

---

## Dev Notes

### Learnings from Previous Story

**From Story 9-1-theme-presets:**
- buttonStyle field exists in schema with default 'rounded'
- Link buttons currently use inline styles in ArtistPage

### Style Application in ArtistPage

```tsx
const getButtonClass = (style: string) => {
  const baseClass = 'link-button';
  return `${baseClass} link-button-${style || 'rounded'}`;
};

// In render:
<a className={getButtonClass(page.buttonStyle)} style={{
  '--primary-color': primaryColor,
  '--secondary-color': secondaryColor,
} as React.CSSProperties}>
  {link.title}
</a>
```

### References
- [Source: docs/sprint-artifacts/tech-spec-epic-9.md#Story-9.4-Button-Styles]

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
