# Story 11.5: Animated Gradient Backgrounds

Status: Done

## Story

As an artist,
I want my background gradient to slowly animate,
so that my page feels alive and dynamic rather than static.

## Acceptance Criteria

1. **AC1**: In Background section, user can toggle "Animate Background" on/off
2. **AC2**: Toggle only visible/enabled when background type is "gradient"
3. **AC3**: When enabled, gradient colors slowly shift/move over time
4. **AC4**: User can select animation speed: Subtle (30s), Medium (15s), Dynamic (8s)
5. **AC5**: Animation loops smoothly without jarring jumps
6. **AC6**: Respects `prefers-reduced-motion` media query (disabled if set)
7. **AC7**: Preview updates in real-time
8. **AC8**: Animation performs at 60fps (GPU accelerated)

## Tasks / Subtasks

- [x] Task 1: Database schema update (AC: 1, 4)
  - [x] Add `background_animated` BOOLEAN DEFAULT false
  - [x] Add `background_animation_speed` TEXT DEFAULT 'subtle'
  - [x] Values: 'subtle' | 'medium' | 'dynamic'
  - [x] Run migration

- [x] Task 2: Update shared schema (AC: 1, 4)
  - [x] Add backgroundAnimated, backgroundAnimationSpeed to schema
  - [x] Add to insert/select schemas

- [x] Task 3: Backend API updates (AC: 1, 4)
  - [x] Ensure PATCH accepts new fields
  - [x] Ensure GET returns new fields

- [x] Task 4: Create animated gradient CSS (AC: 3, 5, 8)
  - [x] Create @keyframes for gradient animation
  - [x] Use background-size: 400% 400% with position shift
  - [x] Or use gradient angle rotation
  - [x] Add will-change: background-position for GPU acceleration

- [x] Task 5: Apply animation to ArtistPage (AC: 3, 5, 6, 8)
  - [x] Read animation settings from page data
  - [x] Apply animation class to background container
  - [x] Handle prefers-reduced-motion with @media query
  - [x] Set animation-duration based on speed setting

- [x] Task 6: Add UI controls to BackgroundEditor (AC: 1, 2, 4, 7)
  - [x] Add Animate toggle (conditionally shown for gradient type)
  - [x] Add speed selector (3 options)
  - [x] Wire up onUpdate callbacks

- [x] Task 7: Update EditorPreview (AC: 7)
  - [x] Apply animation in preview

- [x] Task 8: Performance testing (AC: 8)
  - [x] Verify 60fps on desktop
  - [x] Verify acceptable performance on mobile
  - [x] Test with DevTools Performance panel

## Dev Notes

### Technical Implementation

**Animated Gradient CSS:**
```css
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animated-gradient {
  background-size: 400% 400%;
  animation: gradient-shift var(--animation-duration) ease infinite;
  will-change: background-position;
}

/* Speed variants */
.animated-gradient-subtle { --animation-duration: 30s; }
.animated-gradient-medium { --animation-duration: 15s; }
.animated-gradient-dynamic { --animation-duration: 8s; }

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .animated-gradient {
    animation: none;
  }
}
```

**Alternative: Angle Rotation**
```css
@keyframes gradient-rotate {
  0% { background: linear-gradient(0deg, var(--c1), var(--c2)); }
  100% { background: linear-gradient(360deg, var(--c1), var(--c2)); }
}
```

### Project Structure Notes

- Depends on Story 9.5 (gradient backgrounds exist)
- Schema: `shared/schema.ts`
- Frontend: `client/src/pages/ArtistPage.tsx`
- Editor: `client/src/components/landing/BackgroundEditor.tsx`
- Preview: `client/src/components/landing/editor/EditorPreview.tsx`

### References

- [Source: docs/epics/epic-11-visual-effects.md#Story-11.5]
- [Source: docs/sprint-artifacts/9-5-background-customization.md]

## Dev Agent Record

### Context Reference

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-03 | Story drafted | Bob (SM) |
