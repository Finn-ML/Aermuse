# Story 11.7: Glassmorphism Card Effects

Status: Done

## Story

As an artist,
I want to apply a frosted glass effect to my link buttons or sections,
so that my page has a modern, premium depth.

## Acceptance Criteria

1. **AC1**: In Design tab → Button Effects section, user can toggle "Glass Effect" on/off
2. **AC2**: When enabled, link buttons have frosted glass appearance
3. **AC3**: Background shows through with blur, creating depth
4. **AC4**: User can adjust blur intensity: Light (4px), Medium (8px), Heavy (16px)
5. **AC5**: User can adjust opacity (10%-50% via slider or presets)
6. **AC6**: Effect works best with gradient/image backgrounds (not solid colors)
7. **AC7**: Fallback styling for browsers without backdrop-filter support
8. **AC8**: Preview updates in real-time

## Tasks / Subtasks

- [x] Task 1: Database schema update (AC: 1, 4, 5)
  - [x] Add `glass_effect` BOOLEAN DEFAULT false
  - [x] Add `glass_blur` TEXT DEFAULT 'medium' ('light'|'medium'|'heavy')
  - [x] Add `glass_opacity` REAL DEFAULT 0.2 (0.1-0.5)
  - [x] Run migration

- [x] Task 2: Update shared schema (AC: 1, 4, 5)
  - [x] Add glassEffect, glassBlur, glassOpacity to schema
  - [x] Add to insert/select schemas

- [x] Task 3: Backend API updates (AC: 1, 4, 5)
  - [x] Ensure PATCH accepts new fields
  - [x] Ensure GET returns new fields

- [x] Task 4: Create glass effect CSS styles (AC: 2, 3, 4, 7)
  - [x] Create glass effect classes
  - [x] Use backdrop-filter: blur()
  - [x] Include -webkit-backdrop-filter for Safari
  - [x] Add subtle border for glass edge definition
  - [x] Create fallback (semi-transparent background)

- [x] Task 5: Apply glass effect to ArtistPage buttons (AC: 2, 3)
  - [x] Read glass settings from page data
  - [x] Apply styles to link buttons
  - [x] Override default button background when glass enabled

- [x] Task 6: Add UI controls to DesignTab (AC: 1, 4, 5, 8)
  - [x] Add Glass Effect toggle in Button Effects section
  - [x] Add blur intensity selector (3 options)
  - [x] Add opacity slider (10%-50%) or presets
  - [x] Wire up onUpdate callbacks

- [x] Task 7: Update EditorPreview (AC: 8)
  - [x] Apply glass effect in preview

- [x] Task 8: Browser compatibility testing (AC: 7)
  - [x] Test Chrome, Firefox, Safari, Edge
  - [x] Verify fallback works in unsupported browsers
  - [x] Test on mobile browsers

## Dev Notes

### Technical Implementation

**Glassmorphism CSS:**
```css
.glass-effect {
  background: rgba(255, 255, 255, var(--glass-opacity, 0.2));
  backdrop-filter: blur(var(--glass-blur, 8px));
  -webkit-backdrop-filter: blur(var(--glass-blur, 8px));
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Blur intensity variants */
.glass-blur-light { --glass-blur: 4px; }
.glass-blur-medium { --glass-blur: 8px; }
.glass-blur-heavy { --glass-blur: 16px; }

/* Fallback for browsers without backdrop-filter */
@supports not (backdrop-filter: blur(1px)) {
  .glass-effect {
    background: rgba(255, 255, 255, 0.8);
  }
}
```

**Applying to Buttons:**
```typescript
const buttonStyle = {
  ...(page.glassEffect && {
    background: `rgba(255, 255, 255, ${page.glassOpacity || 0.2})`,
    backdropFilter: `blur(${getBlurValue(page.glassBlur)})`,
    WebkitBackdropFilter: `blur(${getBlurValue(page.glassBlur)})`,
    border: '1px solid rgba(255, 255, 255, 0.2)',
  }),
};

function getBlurValue(blur: string): string {
  switch (blur) {
    case 'light': return '4px';
    case 'heavy': return '16px';
    default: return '8px';
  }
}
```

### Performance Notes

- backdrop-filter can be expensive, especially on mobile
- Test performance with many buttons
- Consider disabling on very low-end devices if needed

### Project Structure Notes

- Independent feature (no story dependencies)
- Schema: `shared/schema.ts`
- Frontend: `client/src/pages/ArtistPage.tsx`
- Editor: `client/src/components/landing/editor/DesignTab.tsx`
- Preview: `client/src/components/landing/editor/EditorPreview.tsx`

### References

- [Source: docs/epics/epic-11-visual-effects.md#Story-11.7]

## Dev Agent Record

### Context Reference

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-03 | Story drafted | Bob (SM) |
