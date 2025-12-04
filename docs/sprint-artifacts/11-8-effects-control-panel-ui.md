# Story 11.8: Effects Control Panel UI

Status: Done

## Story

As an artist,
I want a unified effects control panel in my editor,
so that I can easily discover and customize all visual effects in one place.

## Acceptance Criteria

1. **AC1**: In Design tab, new "Effects" section visible with collapsible panel
2. **AC2**: When expanded, shows organized sections: Button Effects, Title Effects, Background Effects
3. **AC3**: Each effect toggle reveals additional customization options inline (progressive disclosure)
4. **AC4**: All changes trigger immediate preview updates
5. **AC5**: "Reset Effects" button resets all effects to default (off) state
6. **AC6**: Summary shows count of active effects (e.g., "3 effects active")
7. **AC7**: Global "Animation Intensity" control: Subtle, Medium, Bold
8. **AC8**: Animation intensity affects timing/intensity across all animations

## Tasks / Subtasks

- [x] Task 1: Database schema update (AC: 7)
  - [x] Add `animation_intensity` TEXT DEFAULT 'medium'
  - [x] Values: 'subtle' | 'medium' | 'bold'
  - [x] Run migration

- [x] Task 2: Update shared schema (AC: 7)
  - [x] Add animationIntensity to schema
  - [x] Add to insert/select schemas

- [x] Task 3: Backend API updates (AC: 7)
  - [x] Ensure PATCH accepts animationIntensity
  - [x] Ensure GET returns animationIntensity

- [x] Task 4: Create EffectsPanel component (AC: 1, 2, 3, 6)
  - [x] Create `client/src/components/landing/editor/EffectsPanel.tsx`
  - [x] Collapsible accordion structure
  - [x] Three sections: Button, Title, Background
  - [x] Each toggle reveals inline options
  - [x] Active effects counter

- [x] Task 5: Button Effects section (AC: 2, 3)
  - [x] Hover Effect selector (None, Lift, Scale, Shine)
  - [x] Glow toggle + intensity selector
  - [x] Gradient Border toggle
  - [x] Glass Effect toggle + blur/opacity

- [x] Task 6: Title Effects section (AC: 2, 3)
  - [x] Gradient Text toggle + colors + direction
  - [x] Text Glow toggle + color
  - [x] Text Shadow toggle

- [x] Task 7: Background Effects section (AC: 2, 3)
  - [x] Animate Background toggle + speed (conditional on gradient)
  - [x] Particles toggle + style + density + color

- [x] Task 8: Add Animation Intensity control (AC: 7, 8)
  - [x] Global control at top of Effects panel
  - [x] Three options: Subtle, Medium, Bold
  - [x] Affects all animation timings

- [x] Task 9: Implement Reset Effects (AC: 5)
  - [x] Button at bottom of Effects panel
  - [x] Confirmation dialog
  - [x] Reset all effect fields to defaults

- [x] Task 10: Integrate EffectsPanel into DesignTab (AC: 1, 4)
  - [x] Import and render EffectsPanel
  - [x] Pass landingPageData and onUpdate
  - [x] Ensure preview updates work

- [x] Task 11: Update animation timings based on intensity (AC: 8)
  - [x] Create CSS variables for intensity levels
  - [x] Subtle: 1.5x slower, softer
  - [x] Medium: default
  - [x] Bold: 1.5x faster, more dramatic

## Dev Notes

### Technical Implementation

**EffectsPanel Structure:**
```tsx
function EffectsPanel({ data, onUpdate }: EffectsPanelProps) {
  const activeCount = countActiveEffects(data);

  return (
    <div className="effects-panel">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-bold">Visual Effects</h4>
        <span className="text-xs text-muted">
          {activeCount} effect{activeCount !== 1 ? 's' : ''} active
        </span>
      </div>

      {/* Animation Intensity */}
      <IntensitySelector value={data.animationIntensity} onChange={...} />

      {/* Collapsible Sections */}
      <Accordion>
        <AccordionItem title="Button Effects">
          {/* Hover, Glow, Gradient Border, Glass */}
        </AccordionItem>
        <AccordionItem title="Title Effects">
          {/* Gradient Text, Glow, Shadow */}
        </AccordionItem>
        <AccordionItem title="Background Effects">
          {/* Animated Gradient, Particles */}
        </AccordionItem>
      </Accordion>

      {/* Reset Button */}
      <button onClick={handleReset}>Reset All Effects</button>
    </div>
  );
}
```

**Animation Intensity CSS Variables:**
```css
:root {
  --animation-speed-multiplier: 1;
  --animation-intensity-multiplier: 1;
}

[data-intensity="subtle"] {
  --animation-speed-multiplier: 1.5;
  --animation-intensity-multiplier: 0.7;
}

[data-intensity="bold"] {
  --animation-speed-multiplier: 0.7;
  --animation-intensity-multiplier: 1.3;
}
```

**Count Active Effects:**
```typescript
function countActiveEffects(data: LandingPageData): number {
  let count = 0;
  if (data.hoverEffect && data.hoverEffect !== 'none') count++;
  if (data.buttonGlow) count++;
  if (data.buttonGradientBorder) count++;
  if (data.glassEffect) count++;
  if (data.titleGradient) count++;
  if (data.titleGlow) count++;
  if (data.titleShadow) count++;
  if (data.backgroundAnimated) count++;
  if (data.particles) count++;
  return count;
}
```

### Project Structure Notes

- Depends on Stories 11.1-11.7 (all effects exist)
- New component: `client/src/components/landing/editor/EffectsPanel.tsx`
- Integrate into: `client/src/components/landing/editor/DesignTab.tsx`
- May use existing Accordion from shadcn/ui

### References

- [Source: docs/epics/epic-11-visual-effects.md#Story-11.8]
- [Source: docs/sprint-artifacts/11-1-button-hover-effects.md]
- [Source: docs/sprint-artifacts/11-2-button-glow-gradient-borders.md]
- [Source: docs/sprint-artifacts/11-3-gradient-text-for-titles.md]
- [Source: docs/sprint-artifacts/11-4-text-glow-shadow-effects.md]
- [Source: docs/sprint-artifacts/11-5-animated-gradient-backgrounds.md]
- [Source: docs/sprint-artifacts/11-6-floating-particles-animation.md]
- [Source: docs/sprint-artifacts/11-7-glassmorphism-card-effects.md]

## Dev Agent Record

### Context Reference

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-03 | Story drafted | Bob (SM) |
