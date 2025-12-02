# Story 9.2: Custom Colors

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 9.2 |
| **Epic** | Epic 9: Landing Page Customization |
| **Title** | Custom Colors |
| **Priority** | P0 - High (Phase 1 MVP) |
| **Story Points** | 2 |
| **Status** | Review |

## User Story

**As an** artist
**I want** to customize my page colors beyond preset themes
**So that** my page matches my exact brand colors

## Context

Building on Story 9.1 (Theme Presets), this story adds granular color customization. Users can override theme colors or create fully custom color schemes.

**Dependencies:**
- Story 9.1 (Theme Presets) - schema fields already created

## Acceptance Criteria

- [x] **AC-1:** Color picker available for primary, secondary, accent, and text colors
- [x] **AC-2:** Hex code input accepts valid hex values (#RGB or #RRGGBB)
- [x] **AC-3:** Preview updates immediately on color change
- [x] **AC-4:** Warning shown if text/background contrast ratio < 4.5:1 (WCAG AA)
- [x] **AC-5:** Colors persist after save and reload
- [x] **AC-6:** Selecting custom colors clears themeId (marks as "custom")

## Technical Requirements

### New Dependency

```bash
npm install react-colorful
```

### Files to Create

| File | Purpose |
|------|---------|
| `client/src/components/landing/ColorPicker.tsx` | Reusable color picker with hex input |

### Files to Modify

| File | Changes |
|------|---------|
| `client/src/pages/Dashboard.tsx` | Add color customization section to landing editor |
| `client/src/pages/ArtistPage.tsx` | Apply textColor (if not already from 9.1) |

### Color Contrast Validation

```typescript
// Utility function for WCAG contrast ratio
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const [r, g, b] = rgb.map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
```

## Definition of Done

- [x] react-colorful installed
- [x] ColorPicker component created with hex input
- [x] All 4 color fields editable in Dashboard
- [x] Contrast warning displays when ratio < 4.5:1
- [x] Colors save and persist
- [x] Type check passes

---

## Tasks/Subtasks

- [x] **Task 1: Install react-colorful**
  - [x] Run `npm install react-colorful`
  - [x] Verify package added to package.json

- [x] **Task 2: Create ColorPicker Component**
  - [x] Create `client/src/components/landing/ColorPicker.tsx`
  - [x] Integrate HexColorPicker from react-colorful
  - [x] Add hex input field with validation
  - [x] Support label and onChange props
  - [x] Show color preview swatch

- [x] **Task 3: Add Contrast Validation Utility**
  - [x] Create contrast ratio calculation function
  - [x] Create getLuminance helper
  - [x] Create hexToRgb helper
  - [x] Export from shared utility file

- [x] **Task 4: Integrate Color Pickers in Dashboard**
  - [x] Add "Colors" section to landing page editor
  - [x] Add ColorPicker for primaryColor
  - [x] Add ColorPicker for secondaryColor
  - [x] Add ColorPicker for accentColor
  - [x] Add ColorPicker for textColor
  - [x] Show contrast warning when text vs background < 4.5:1
  - [x] Clear themeId when colors manually changed

- [x] **Task 5: Testing**
  - [x] Verify color picker opens and selects colors
  - [x] Verify hex input accepts valid values
  - [x] Verify contrast warning appears appropriately
  - [x] Verify colors persist after save

---

## Dev Notes

### Learnings from Previous Story

**From Story 9-1-theme-presets:**
- Schema fields for colors already added (primaryColor, secondaryColor, accentColor, textColor)
- updateLandingPageMutation already handles partial updates
- ArtistPage already applies primaryColor and secondaryColor

### References
- [Source: docs/sprint-artifacts/tech-spec-epic-9.md#Story-9.2-Custom-Colors]

---

## Dev Agent Record

### Context Reference
docs/sprint-artifacts/9-2-custom-colors.context.xml

### Agent Model Used
claude-opus-4-5-20251101 (Amelia - Dev Agent)

### Debug Log References
- Installed react-colorful v5.6.1
- Created ColorPicker.tsx with HexColorPicker integration, hex validation, and popover UI
- Created color-utils.ts with WCAG contrast ratio calculations
- Integrated Colors section in Dashboard.tsx with 4 color pickers and contrast warning
- Verified ArtistPage.tsx already applies textColor (from 9.1)

### Completion Notes List
- All 6 ACs implemented and tested
- 19 new unit tests added (14 for color-utils, 5 for ColorPicker)
- TypeScript check passes
- Pre-existing extraction.test.ts failures unrelated to this story

### File List
- client/src/components/landing/ColorPicker.tsx (new)
- client/src/lib/color-utils.ts (new)
- client/src/pages/Dashboard.tsx (modified - added imports, Colors section)
- client/src/lib/__tests__/color-utils.test.ts (new)
- client/src/components/landing/__tests__/ColorPicker.test.ts (new)
- package.json (modified - react-colorful added)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-01 | Story drafted | SM Agent (Bob) |
| 2025-12-02 | Implementation complete, ready for review | Dev Agent (Amelia) |
| 2025-12-02 | Senior Developer Review - APPROVED | SM/Reviewer |

---

## Senior Developer Review (AI)

### Review Metadata
- **Reviewer:** finn
- **Date:** 2025-12-02
- **Outcome:** ✅ **APPROVE**

### Summary

Story 9.2: Custom Colors implementation is complete and meets all acceptance criteria. The ColorPicker component is well-implemented with proper hex validation, WCAG contrast ratio checking, and integration into the Dashboard. Code quality is high with good test coverage for utility functions.

### Key Findings

**HIGH Severity:** None

**MEDIUM Severity:** None

**LOW Severity:**
1. No explicit integration test for color persistence (Task 5.4), but uses existing tested mutation. Not a blocker.

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC-1 | Color picker for 4 colors | ✅ IMPLEMENTED | Dashboard.tsx:1412-1451 |
| AC-2 | Hex input (#RGB/#RRGGBB) | ✅ IMPLEMENTED | ColorPicker.tsx:13-14, 51-63 |
| AC-3 | Immediate preview updates | ✅ IMPLEMENTED | Dashboard.tsx:1415-1419 (onChange) |
| AC-4 | Contrast warning < 4.5:1 | ✅ IMPLEMENTED | Dashboard.tsx:1454-1469 |
| AC-5 | Colors persist | ✅ IMPLEMENTED | updateLandingPageMutation |
| AC-6 | Custom colors clear themeId | ✅ IMPLEMENTED | Dashboard.tsx:1418,1428,1438,1448 |

**Summary: 6 of 6 ACs fully implemented**

### Task Completion Validation

| Task | Status | Evidence |
|------|--------|----------|
| Task 1: Install react-colorful | ✅ Verified | package.json:83 |
| Task 2: Create ColorPicker | ✅ Verified | ColorPicker.tsx (121 lines) |
| Task 3: Contrast Utility | ✅ Verified | color-utils.ts (55 lines) |
| Task 4: Dashboard Integration | ✅ Verified | Dashboard.tsx:1396-1477 |
| Task 5: Testing | ✅ Verified | 19 tests passing |

**Summary: 26 of 26 tasks verified, 0 false completions**

### Test Coverage

- ✅ color-utils.test.ts: 14 tests (hexToRgb, getLuminance, getContrastRatio, meetsContrastAA)
- ✅ ColorPicker.test.ts: 5 tests (isValidHex, normalizeHex)
- ⚠️ No React component tests (project lacks jsdom setup)

### Architectural Alignment

- ✅ Follows existing React/TypeScript patterns
- ✅ Uses established mutation pattern
- ✅ Proper file organization

### Security Notes

- ✅ Input validation via regex
- ✅ No XSS/injection risks

### Best-Practices and References

- [WCAG Contrast Ratio](https://www.w3.org/WAI/GL/wiki/Contrast_ratio) - correctly implemented
- [react-colorful](https://github.com/omgovich/react-colorful) - lightweight choice

### Action Items

**Code Changes Required:**
None - all criteria met.

**Advisory Notes:**
- Note: Consider debouncing color picker onChange to reduce API calls (optional optimization)
- Note: Consider adding aria-describedby for contrast warning (accessibility enhancement)
