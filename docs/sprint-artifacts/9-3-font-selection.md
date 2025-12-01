# Story 9.3: Font Selection

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 9.3 |
| **Epic** | Epic 9: Landing Page Customization |
| **Title** | Font Selection |
| **Priority** | P0 - High (Phase 1 MVP) |
| **Story Points** | 2 |
| **Status** | Drafted |

## User Story

**As an** artist
**I want** to choose fonts for my landing page
**So that** the typography matches my aesthetic

## Context

Extends the theming system with font customization. Users can select from curated Google Fonts pairings for headings and body text.

**Dependencies:**
- Story 9.1 (Theme Presets) - headingFont and bodyFont schema fields already created

## Acceptance Criteria

- [ ] **AC-1:** 8-10 font options displayed with live preview
- [ ] **AC-2:** Separate selection for heading and body fonts
- [ ] **AC-3:** Selected fonts load on public page via Google Fonts
- [ ] **AC-4:** Fallback fonts render if Google Fonts unavailable
- [ ] **AC-5:** Font selection persists after save
- [ ] **AC-6:** Font preview shows sample text in selected font

## Technical Requirements

### Files to Create

| File | Purpose |
|------|---------|
| `client/src/components/landing/FontSelector.tsx` | Font selection dropdown with preview |

### Files to Modify

| File | Changes |
|------|---------|
| `shared/themes.ts` | Ensure SUPPORTED_FONTS is exported |
| `client/src/pages/Dashboard.tsx` | Add font selection to landing editor |
| `client/src/pages/ArtistPage.tsx` | Dynamic Google Fonts loading |

### Supported Fonts

```typescript
export const SUPPORTED_FONTS = [
  { name: 'Inter', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Montserrat', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Poppins', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Roboto', category: 'sans-serif', weights: '400;500;700' },
  { name: 'Playfair Display', category: 'serif', weights: '400;600;700' },
  { name: 'Lora', category: 'serif', weights: '400;600;700' },
  { name: 'Space Grotesk', category: 'sans-serif', weights: '400;500;700' },
  { name: 'DM Sans', category: 'sans-serif', weights: '400;500;700' },
];
```

### Google Fonts Loading

```tsx
// Dynamic font loading in ArtistPage
useEffect(() => {
  const fonts = [headingFont, bodyFont].filter(Boolean);
  const uniqueFonts = [...new Set(fonts)];
  if (uniqueFonts.length === 0) return;

  const fontQuery = uniqueFonts
    .map(f => `family=${f.replace(/ /g, '+')}:wght@400;600;700`)
    .join('&');

  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);

  return () => {
    document.head.removeChild(link);
  };
}, [headingFont, bodyFont]);
```

## Definition of Done

- [ ] FontSelector component created
- [ ] 8 fonts available for selection
- [ ] Heading and body fonts selectable separately
- [ ] Google Fonts load dynamically on ArtistPage
- [ ] Fallback to system fonts works
- [ ] Type check passes

---

## Tasks/Subtasks

- [ ] **Task 1: Create FontSelector Component**
  - [ ] Create `client/src/components/landing/FontSelector.tsx`
  - [ ] Display dropdown with font options
  - [ ] Show font preview text in each option
  - [ ] Support label and onChange props
  - [ ] Show current selection

- [ ] **Task 2: Preload Fonts in Editor**
  - [ ] Load all supported fonts in Dashboard for preview
  - [ ] Use single Google Fonts link with all fonts

- [ ] **Task 3: Integrate Font Selection in Dashboard**
  - [ ] Add "Fonts" section to landing page editor
  - [ ] Add FontSelector for headingFont
  - [ ] Add FontSelector for bodyFont
  - [ ] Show live preview with selected fonts

- [ ] **Task 4: Dynamic Font Loading in ArtistPage**
  - [ ] Add useEffect for dynamic Google Fonts loading
  - [ ] Apply headingFont to h1, h2 elements
  - [ ] Apply bodyFont to body text
  - [ ] Add CSS fallback fonts

- [ ] **Task 5: Testing**
  - [ ] Verify font dropdown shows all options
  - [ ] Verify font preview renders correctly
  - [ ] Verify public page loads correct fonts
  - [ ] Test fallback when fonts fail to load

---

## Dev Notes

### Learnings from Previous Story

**From Story 9-1-theme-presets:**
- headingFont and bodyFont schema fields already exist
- SUPPORTED_FONTS constant defined in shared/themes.ts

### CSS Font Application

```css
/* Apply in ArtistPage */
h1, h2, h3 {
  font-family: var(--heading-font), system-ui, sans-serif;
}

body, p, span {
  font-family: var(--body-font), system-ui, sans-serif;
}
```

### References
- [Source: docs/sprint-artifacts/tech-spec-epic-9.md#Story-9.3-Font-Selection]

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
