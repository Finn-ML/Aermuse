# Story 11.6: Floating Particles Animation

Status: Done

## Story

As an artist,
I want to add subtle floating particles or ambient animation to my page,
so that it creates atmosphere and visual interest.

## Acceptance Criteria

1. **AC1**: In Background section, user can toggle "Ambient Particles" on/off
2. **AC2**: When enabled, subtle particles float gently across background
3. **AC3**: User can select particle style: Dots, Stars, Sparkles, or Bokeh
4. **AC4**: User can adjust density: Sparse, Normal, Dense
5. **AC5**: User can select particle color (default: accent color at 30% opacity)
6. **AC6**: On mobile, density automatically reduced for performance
7. **AC7**: Respects `prefers-reduced-motion` (disabled if set)
8. **AC8**: Particles render behind content (proper z-index)
9. **AC9**: Preview updates in real-time

## Tasks / Subtasks

- [x] Task 1: Database schema update (AC: 1, 3, 4, 5)
  - [x] Add `particles` BOOLEAN DEFAULT false
  - [x] Add `particle_style` TEXT DEFAULT 'dots' ('dots'|'stars'|'sparkles'|'bokeh')
  - [x] Add `particle_density` TEXT DEFAULT 'normal' ('sparse'|'normal'|'dense')
  - [x] Add `particle_color` TEXT (nullable)
  - [x] Run migration

- [x] Task 2: Update shared schema (AC: 1, 3, 4, 5)
  - [x] Add particles, particleStyle, particleDensity, particleColor to schema
  - [x] Add to insert/select schemas

- [x] Task 3: Backend API updates (AC: 1, 3, 4, 5)
  - [x] Ensure PATCH accepts new fields
  - [x] Ensure GET returns new fields

- [x] Task 4: Create ParticleBackground component (AC: 2, 3, 6, 7, 8)
  - [x] Create `client/src/components/landing/ParticleBackground.tsx`
  - [x] Implement CSS-only particle system with floating divs
  - [x] Support different styles (size, shape, blur for bokeh)
  - [x] Handle density settings (particle count)
  - [x] Detect mobile and reduce count
  - [x] Handle prefers-reduced-motion

- [x] Task 5: Style definitions for particle types (AC: 3)
  - [x] Dots: small circles, 4-8px
  - [x] Stars: star shapes (CSS or SVG)
  - [x] Sparkles: small with subtle twinkle animation
  - [x] Bokeh: larger, blurred circles with varying opacity

- [x] Task 6: Add ParticleBackground to ArtistPage (AC: 2, 8)
  - [x] Import and render ParticleBackground
  - [x] Pass config from page data
  - [x] Ensure z-index places behind content

- [x] Task 7: Add UI controls to BackgroundEditor (AC: 1, 3, 4, 5, 9)
  - [x] Add Particles toggle
  - [x] Add style selector (4 options with icons/previews)
  - [x] Add density selector (3 options)
  - [x] Add color picker
  - [x] Wire up onUpdate callbacks

- [x] Task 8: Update EditorPreview (AC: 9)
  - [x] Add ParticleBackground to preview

- [x] Task 9: Performance testing (AC: 6)
  - [x] Test on mobile devices
  - [x] Verify reduced density works
  - [x] Ensure smooth 60fps

## Dev Notes

### Technical Implementation

**CSS-Only Particle System:**
```tsx
function ParticleBackground({
  style,
  density,
  color,
  enabled
}: ParticleBackgroundProps) {
  if (!enabled) return null;

  const count = density === 'sparse' ? 15 : density === 'normal' ? 30 : 50;
  const isMobile = window.innerWidth < 768;
  const adjustedCount = isMobile ? Math.floor(count / 2) : count;

  return (
    <div className="particle-container absolute inset-0 overflow-hidden pointer-events-none z-0">
      {Array.from({ length: adjustedCount }).map((_, i) => (
        <div
          key={i}
          className={`particle particle-${style}`}
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 20}s`,
            animationDuration: `${15 + Math.random() * 20}s`,
            '--particle-color': color,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
```

**Particle Animation CSS:**
```css
@keyframes float {
  0%, 100% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
}

.particle {
  position: absolute;
  animation: float linear infinite;
  background: var(--particle-color, rgba(255,255,255,0.3));
}

.particle-dots { width: 6px; height: 6px; border-radius: 50%; }
.particle-stars { /* star shape via clip-path */ }
.particle-sparkles { width: 4px; height: 4px; border-radius: 50%; animation: float, twinkle; }
.particle-bokeh { width: 20px; height: 20px; border-radius: 50%; filter: blur(4px); }

@media (prefers-reduced-motion: reduce) {
  .particle { animation: none; opacity: 0.3; }
}
```

### Project Structure Notes

- Independent feature (no story dependencies)
- New component: `client/src/components/landing/ParticleBackground.tsx`
- Editor: `client/src/components/landing/BackgroundEditor.tsx`
- ArtistPage: `client/src/pages/ArtistPage.tsx`
- Preview: `client/src/components/landing/editor/EditorPreview.tsx`

### References

- [Source: docs/epics/epic-11-visual-effects.md#Story-11.6]

## Dev Agent Record

### Context Reference

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-03 | Story drafted | Bob (SM) |
