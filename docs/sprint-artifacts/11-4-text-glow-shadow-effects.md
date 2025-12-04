# Story 11.4: Text Glow & Shadow Effects

Status: Done

## Story

As an artist,
I want to add glow or shadow effects to my title text,
so that it pops against the background and looks professional.

## Acceptance Criteria

1. **AC1**: In Title Effects section, user can toggle "Text Glow" on/off
2. **AC2**: When glow enabled, artist name has soft colored glow behind it
3. **AC3**: User can select glow color (default: accent color)
4. **AC4**: User can toggle "Text Shadow" on/off
5. **AC5**: When shadow enabled, subtle drop shadow adds depth to text
6. **AC6**: Both effects can be enabled simultaneously
7. **AC7**: When both off, text appears flat (default behavior)
8. **AC8**: Preview updates in real-time

## Tasks / Subtasks

- [x] Task 1: Database schema update (AC: 1-4)
  - [x] Add `title_glow` BOOLEAN DEFAULT false
  - [x] Add `title_glow_color` TEXT (nullable, defaults to accent in code)
  - [x] Add `title_shadow` BOOLEAN DEFAULT false
  - [x] Run migration

- [x] Task 2: Update shared schema (AC: 1-4)
  - [x] Add titleGlow, titleGlowColor, titleShadow to schema
  - [x] Add to insert/select schemas

- [x] Task 3: Backend API updates (AC: 1-4)
  - [x] Ensure PATCH accepts new fields
  - [x] Ensure GET returns new fields

- [x] Task 4: Create text effect style helper (AC: 2, 5, 6)
  - [x] Create getTitleTextShadow() helper function
  - [x] Handle glow: `0 0 20px color, 0 0 40px color50`
  - [x] Handle shadow: `2px 2px 4px rgba(0,0,0,0.3)`
  - [x] Handle both combined

- [x] Task 5: Apply effects to ArtistPage title (AC: 2, 5, 6, 7)
  - [x] Read glow/shadow settings from page data
  - [x] Apply text-shadow styles to h1
  - [x] Optionally apply to tagline too

- [x] Task 6: Add UI controls to DesignTab (AC: 1, 3, 4, 8)
  - [x] Add Text Glow toggle in Title Effects section
  - [x] Add color picker for glow color (show when enabled)
  - [x] Add Text Shadow toggle
  - [x] Wire up onUpdate callbacks

- [x] Task 7: Update EditorPreview (AC: 8)
  - [x] Apply text effects in preview

## Dev Notes

### Technical Implementation

**Text Glow Effect:**
```css
.title-glow {
  text-shadow: 0 0 20px var(--glow-color), 0 0 40px var(--glow-color-50);
}
```

**Text Shadow Effect:**
```css
.title-shadow {
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}
```

**Combined Effect:**
```css
.title-glow-shadow {
  text-shadow:
    0 0 20px var(--glow-color),
    0 0 40px var(--glow-color-50),
    2px 2px 4px rgba(0, 0, 0, 0.3);
}
```

**Helper Function:**
```typescript
function getTitleTextShadow(
  glow: boolean,
  glowColor: string | null,
  shadow: boolean,
  accentColor: string
): string | undefined {
  const shadows: string[] = [];

  if (glow) {
    const color = glowColor || accentColor;
    shadows.push(`0 0 20px ${color}`);
    shadows.push(`0 0 40px ${color}80`);
  }

  if (shadow) {
    shadows.push('2px 2px 4px rgba(0,0,0,0.3)');
  }

  return shadows.length > 0 ? shadows.join(', ') : undefined;
}
```

### Project Structure Notes

- Depends on Story 11.3 (Title Effects section exists)
- Same files: schema.ts, ArtistPage.tsx, DesignTab.tsx, EditorPreview.tsx

### References

- [Source: docs/epics/epic-11-visual-effects.md#Story-11.4]
- [Source: docs/sprint-artifacts/11-3-gradient-text-for-titles.md]

## Dev Agent Record

### Context Reference

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-03 | Story drafted | Bob (SM) |
