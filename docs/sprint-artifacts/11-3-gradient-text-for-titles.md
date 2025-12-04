# Story 11.3: Gradient Text for Titles

Status: Done

## Story

As an artist,
I want to apply gradient colors to my name/title,
so that it looks modern and eye-catching.

## Acceptance Criteria

1. **AC1**: In Design tab → Title Effects section, user sees "Gradient Text" toggle
2. **AC2**: When enabled, artist name displays with gradient fill (default: primary→accent)
3. **AC3**: User can pick two custom colors for gradient start and end
4. **AC4**: User can select gradient direction: horizontal, vertical, or diagonal
5. **AC5**: Fallback to solid color for browsers without gradient text support
6. **AC6**: Preview updates in real-time when settings change
7. **AC7**: Gradient applies to artist name (h1) on public ArtistPage

## Tasks / Subtasks

- [x] Task 1: Database schema update (AC: 1-4)
  - [x] Add `title_gradient` BOOLEAN DEFAULT false
  - [x] Add `title_gradient_colors` JSONB DEFAULT '{"start": null, "end": null}'
  - [x] Add `title_gradient_direction` TEXT DEFAULT 'horizontal'
  - [x] Run migration

- [x] Task 2: Update shared schema (AC: 1-4)
  - [x] Add titleGradient, titleGradientColors, titleGradientDirection to schema
  - [x] Add to insert/select schemas

- [x] Task 3: Backend API updates (AC: 1-4)
  - [x] Ensure PATCH accepts new fields
  - [x] Ensure GET returns new fields

- [x] Task 4: Create gradient text CSS utility (AC: 2, 4, 5)
  - [x] Create getGradientTextStyle() helper function
  - [x] Handle direction: horizontal (90deg), vertical (180deg), diagonal (135deg)
  - [x] Return inline styles for gradient text effect
  - [x] Include fallback for unsupported browsers

- [x] Task 5: Apply gradient to ArtistPage title (AC: 2, 5, 7)
  - [x] Read gradient settings from page data
  - [x] Apply gradient styles to h1 (artist name)
  - [x] Use primaryColor/accentColor as defaults if custom colors null

- [x] Task 6: Add Title Effects UI to DesignTab (AC: 1, 3, 4, 6)
  - [x] Create new "Title Effects" section in DesignTab.tsx
  - [x] Add Gradient Text toggle switch
  - [x] Add color pickers for start/end colors (show when enabled)
  - [x] Add direction selector (3 options)
  - [x] Wire up onUpdate callbacks

- [x] Task 7: Update EditorPreview (AC: 6)
  - [x] Apply gradient text in preview

- [x] Task 8: Test browser compatibility (AC: 5)
  - [x] Test Chrome, Firefox, Safari, Edge
  - [x] Verify fallback works

## Dev Notes

### Technical Implementation

**Gradient Text CSS:**
```css
.gradient-text {
  background: linear-gradient(var(--direction), var(--color-start), var(--color-end));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**Direction Values:**
- horizontal: `90deg` or `to right`
- vertical: `180deg` or `to bottom`
- diagonal: `135deg` or `to bottom right`

**Helper Function:**
```typescript
function getGradientTextStyle(
  enabled: boolean,
  colors: { start: string | null; end: string | null },
  direction: 'horizontal' | 'vertical' | 'diagonal',
  fallbackColor: string,
  primaryColor: string,
  accentColor: string
): React.CSSProperties {
  if (!enabled) return { color: fallbackColor };

  const start = colors.start || primaryColor;
  const end = colors.end || accentColor;
  const deg = direction === 'horizontal' ? '90deg' : direction === 'vertical' ? '180deg' : '135deg';

  return {
    background: `linear-gradient(${deg}, ${start}, ${end})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };
}
```

### Project Structure Notes

- No dependencies on other Epic 11 stories (can start independently)
- Schema: `shared/schema.ts`
- Frontend: `client/src/pages/ArtistPage.tsx`
- Editor: `client/src/components/landing/editor/DesignTab.tsx`
- Preview: `client/src/components/landing/editor/EditorPreview.tsx`

### References

- [Source: docs/epics/epic-11-visual-effects.md#Story-11.3]

## Dev Agent Record

### Context Reference

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-03 | Story drafted | Bob (SM) |
