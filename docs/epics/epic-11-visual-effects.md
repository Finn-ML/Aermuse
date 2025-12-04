# Epic 11: Landing Page Visual Effects & Premium Customization

**Priority:** P1 - High
**Status:** Planning
**Stories:** 8
**Dependencies:** Epic 9 (Landing Page Editor)

---

## Epic Goal

Transform artist landing pages from "standard HTML" feel to premium, memorable experiences through customizable visual effects, animations, and modern design techniques that artists can personalize to match their brand.

## User Value

Artists can create visually stunning, professional landing pages that:
- Stand out from generic link-in-bio pages
- Reflect their unique brand personality
- Feel alive and engaging (not static)
- Compete with professionally designed artist websites

---

## Story Summary

| Story | Title | Priority | Points |
|-------|-------|----------|--------|
| 11.1 | Button Hover Effects | P0 | 3 |
| 11.2 | Button Glow & Gradient Borders | P0 | 3 |
| 11.3 | Gradient Text for Titles | P0 | 2 |
| 11.4 | Text Glow & Shadow Effects | P1 | 2 |
| 11.5 | Animated Gradient Backgrounds | P1 | 3 |
| 11.6 | Floating Particles Animation | P2 | 5 |
| 11.7 | Glassmorphism Card Effects | P1 | 3 |
| 11.8 | Effects Control Panel UI | P0 | 3 |

**Total: 24 Story Points**

---

## Stories

### Story 11.1: Button Hover Effects

**As an** artist customizing my landing page,
**I want** to choose from different button hover animations,
**So that** my links feel interactive and premium rather than static.

**Acceptance Criteria:**

**Given** I am in the landing page editor Design tab
**When** I navigate to the Button Effects section
**Then** I see options for hover animation styles

**Given** I select "Lift" hover effect
**When** a visitor hovers over my link buttons
**Then** the button lifts up (translateY -2px) with a subtle shadow increase

**Given** I select "Scale" hover effect
**When** a visitor hovers over my link buttons
**Then** the button scales up smoothly (1.02x) with easing

**Given** I select "Shine" hover effect
**When** a visitor hovers over my link buttons
**Then** a light shimmer animates across the button surface (left to right gradient sweep)

**Given** I select "None" hover effect
**When** a visitor hovers over my link buttons
**Then** only the default color change occurs (existing behavior)

**Prerequisites:** Epic 9 complete (button system exists)

**Technical Notes:**
- Add `hoverEffect` field to landing_pages table (enum: 'none' | 'lift' | 'scale' | 'shine')
- Implement CSS transitions/animations in ArtistPage.tsx
- Use transform for lift/scale (GPU accelerated)
- Shine effect: animated linear-gradient with `background-position` animation
- All effects should be 200-300ms duration with ease-out timing
- Effects must work on both desktop (hover) and mobile (active state)

---

### Story 11.2: Button Glow & Gradient Borders

**As an** artist,
**I want** to add glow effects and gradient borders to my buttons,
**So that** they look premium and eye-catching.

**Acceptance Criteria:**

**Given** I am in the Button Effects section
**When** I toggle "Glow" on
**Then** my buttons have a soft colored glow (box-shadow) using my accent color

**Given** glow is enabled
**When** I adjust the glow intensity slider
**Then** the glow strength changes (subtle: 4px blur, medium: 8px, strong: 16px)

**Given** I toggle "Gradient Border" on
**When** viewing my buttons
**Then** buttons have a gradient border effect using primary→accent colors

**Given** gradient border is enabled
**When** a visitor hovers
**Then** the gradient animates (rotation or color shift)

**Prerequisites:** Story 11.1

**Technical Notes:**
- Add `buttonGlow` (boolean), `buttonGlowIntensity` ('subtle'|'medium'|'strong'), `buttonGradientBorder` (boolean) fields
- Glow: `box-shadow: 0 0 ${intensity}px ${accentColor}50`
- Gradient border technique: Use pseudo-element with gradient background behind slightly smaller content element
- Or use `border-image` with linear-gradient
- Animated gradient: use `@keyframes` to rotate gradient angle or shift colors

---

### Story 11.3: Gradient Text for Titles

**As an** artist,
**I want** to apply gradient colors to my name/title,
**So that** it looks modern and eye-catching.

**Acceptance Criteria:**

**Given** I am in the Design tab
**When** I navigate to Title Effects section
**Then** I see a "Gradient Text" toggle

**Given** I enable gradient text
**When** I view my artist name on the landing page
**Then** the text displays with a gradient fill (primary→accent color by default)

**Given** gradient text is enabled
**When** I select custom gradient colors
**Then** I can pick two colors for the gradient start and end

**Given** gradient text is enabled
**When** I select gradient direction
**Then** I can choose horizontal, vertical, or diagonal gradient

**Prerequisites:** None (can start independently)

**Technical Notes:**
- Add `titleGradient` (boolean), `titleGradientColors` (JSON: {start, end}), `titleGradientDirection` ('horizontal'|'vertical'|'diagonal')
- CSS implementation:
  ```css
  .gradient-text {
    background: linear-gradient(direction, color1, color2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  ```
- Fallback for older browsers: solid color
- Apply to artist name (h1) in ArtistPage.tsx

---

### Story 11.4: Text Glow & Shadow Effects

**As an** artist,
**I want** to add glow or shadow effects to my title text,
**So that** it pops against the background and looks professional.

**Acceptance Criteria:**

**Given** I am in Title Effects section
**When** I toggle "Text Glow" on
**Then** my artist name has a soft colored glow behind it

**Given** text glow is enabled
**When** I select a glow color
**Then** the glow uses that color (default: accent color)

**Given** I toggle "Text Shadow" on
**When** viewing my title
**Then** a subtle drop shadow adds depth to the text

**Given** both glow and shadow are off
**When** viewing my title
**Then** text appears flat (default behavior)

**Prerequisites:** Story 11.3

**Technical Notes:**
- Add `titleGlow` (boolean), `titleGlowColor` (string), `titleShadow` (boolean)
- Text glow: `text-shadow: 0 0 20px ${color}, 0 0 40px ${color}50`
- Text shadow: `text-shadow: 2px 2px 4px rgba(0,0,0,0.3)`
- Can combine both effects
- Apply to h1 and optionally tagline

---

### Story 11.5: Animated Gradient Backgrounds

**As an** artist,
**I want** my background gradient to slowly animate,
**So that** my page feels alive and dynamic rather than static.

**Acceptance Criteria:**

**Given** I have a gradient background selected
**When** I toggle "Animate Background" on
**Then** the gradient colors slowly shift/move over time

**Given** animated gradient is enabled
**When** I select animation speed
**Then** I can choose: Subtle (30s cycle), Medium (15s), Dynamic (8s)

**Given** animated gradient is enabled
**When** a visitor views my page
**Then** the gradient smoothly transitions without jarring jumps

**Given** I have a solid color or image background
**When** I view the animate option
**Then** it is disabled/hidden (only works with gradients)

**Prerequisites:** Story 9.5 (gradient backgrounds exist)

**Technical Notes:**
- Add `backgroundAnimated` (boolean), `backgroundAnimationSpeed` ('subtle'|'medium'|'dynamic')
- Implementation: CSS `@keyframes` that shifts `background-position` on a large gradient
- Or: Use CSS Houdini/gradient animation if browser support allows
- Alternative: Shift gradient angle over time
- Performance: Use `will-change: background-position` for GPU acceleration
- Respect `prefers-reduced-motion` media query

---

### Story 11.6: Floating Particles Animation

**As an** artist,
**I want** to add subtle floating particles or ambient animation to my page,
**So that** it creates atmosphere and visual interest.

**Acceptance Criteria:**

**Given** I am in the Background section
**When** I toggle "Ambient Particles" on
**Then** subtle particles float gently across my page background

**Given** particles are enabled
**When** I select particle style
**Then** I can choose: Dots, Stars, Sparkles, or Bokeh

**Given** particles are enabled
**When** I adjust density
**Then** I can set: Sparse (few particles), Normal, Dense (many particles)

**Given** particles are enabled
**When** I select particle color
**Then** particles use that color (default: accent color at 30% opacity)

**Given** a visitor views my page on mobile
**When** particles are enabled
**Then** density is automatically reduced for performance

**Prerequisites:** None (independent feature)

**Technical Notes:**
- Add `particles` (boolean), `particleStyle` (enum), `particleDensity` (enum), `particleColor` (string)
- Implementation options:
  1. CSS-only: Multiple floating divs with keyframe animations
  2. Canvas-based: Lightweight particle system
  3. Library: tsParticles (lightweight, tree-shakeable)
- Recommend CSS-only for simplicity, canvas for more control
- Particles should be behind content (z-index)
- Reduce count on mobile (check viewport width)
- Respect `prefers-reduced-motion` - disable if set

---

### Story 11.7: Glassmorphism Card Effects

**As an** artist,
**I want** to apply a frosted glass effect to my link buttons or sections,
**So that** my page has a modern, premium depth.

**Acceptance Criteria:**

**Given** I am in the Design tab
**When** I toggle "Glass Effect" on
**Then** my link buttons have a frosted glass appearance

**Given** glass effect is enabled
**When** viewing buttons over a gradient/image background
**Then** the background shows through with blur, creating depth

**Given** glass effect is enabled
**When** I adjust blur intensity
**Then** I can choose: Light (4px), Medium (8px), Heavy (16px)

**Given** glass effect is enabled
**When** I adjust opacity
**Then** I can set how transparent the glass is (10%-50%)

**Prerequisites:** None (independent feature)

**Technical Notes:**
- Add `glassEffect` (boolean), `glassBlur` ('light'|'medium'|'heavy'), `glassOpacity` (number 0.1-0.5)
- CSS implementation:
  ```css
  .glass {
    background: rgba(255,255,255, var(--glass-opacity));
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid rgba(255,255,255,0.2);
  }
  ```
- Fallback for Safari: May need additional prefixes
- Performance: backdrop-filter can be expensive, test on mobile
- Works best with gradient or image backgrounds (not solid colors)

---

### Story 11.8: Effects Control Panel UI

**As an** artist,
**I want** a unified effects control panel in my editor,
**So that** I can easily discover and customize all visual effects in one place.

**Acceptance Criteria:**

**Given** I am in the Design tab
**When** I scroll to the Effects section
**Then** I see a collapsible panel with all effect categories

**Given** I view the Effects panel
**When** expanded
**Then** I see organized sections: Button Effects, Title Effects, Background Effects

**Given** I view any effect toggle
**When** I enable it
**Then** additional customization options appear inline

**Given** I am adjusting any effect
**When** I make changes
**Then** the preview updates in real-time

**Given** I want to quickly reset all effects
**When** I click "Reset Effects"
**Then** all effects return to default (off) state

**Given** I have many effects enabled
**When** I view my page
**Then** a summary shows active effects count

**Prerequisites:** Stories 11.1-10.7 (needs all effects to exist)

**Technical Notes:**
- Add new "Effects" section to DesignTab.tsx
- Organize into collapsible accordion sections
- Each effect toggle reveals its customization options (progressive disclosure)
- Add "Animation Intensity" global control: Subtle (slower, softer), Medium, Bold (faster, more dramatic)
- This controls timing/intensity across all animations
- Add `animationIntensity` field to landing_pages table ('subtle'|'medium'|'bold')
- Show effect previews as small demos where possible
- Ensure all changes trigger immediate preview update

---

## Database Schema Changes

```sql
-- Add visual effects fields to landing_pages table
ALTER TABLE landing_pages ADD COLUMN hover_effect TEXT DEFAULT 'none';
-- Values: 'none', 'lift', 'scale', 'shine'

ALTER TABLE landing_pages ADD COLUMN button_glow BOOLEAN DEFAULT false;
ALTER TABLE landing_pages ADD COLUMN button_glow_intensity TEXT DEFAULT 'medium';
ALTER TABLE landing_pages ADD COLUMN button_gradient_border BOOLEAN DEFAULT false;

ALTER TABLE landing_pages ADD COLUMN title_gradient BOOLEAN DEFAULT false;
ALTER TABLE landing_pages ADD COLUMN title_gradient_colors JSONB DEFAULT '{"start": null, "end": null}';
ALTER TABLE landing_pages ADD COLUMN title_gradient_direction TEXT DEFAULT 'horizontal';

ALTER TABLE landing_pages ADD COLUMN title_glow BOOLEAN DEFAULT false;
ALTER TABLE landing_pages ADD COLUMN title_glow_color TEXT;
ALTER TABLE landing_pages ADD COLUMN title_shadow BOOLEAN DEFAULT false;

ALTER TABLE landing_pages ADD COLUMN background_animated BOOLEAN DEFAULT false;
ALTER TABLE landing_pages ADD COLUMN background_animation_speed TEXT DEFAULT 'subtle';

ALTER TABLE landing_pages ADD COLUMN particles BOOLEAN DEFAULT false;
ALTER TABLE landing_pages ADD COLUMN particle_style TEXT DEFAULT 'dots';
ALTER TABLE landing_pages ADD COLUMN particle_density TEXT DEFAULT 'normal';
ALTER TABLE landing_pages ADD COLUMN particle_color TEXT;

ALTER TABLE landing_pages ADD COLUMN glass_effect BOOLEAN DEFAULT false;
ALTER TABLE landing_pages ADD COLUMN glass_blur TEXT DEFAULT 'medium';
ALTER TABLE landing_pages ADD COLUMN glass_opacity REAL DEFAULT 0.2;

ALTER TABLE landing_pages ADD COLUMN animation_intensity TEXT DEFAULT 'medium';
-- Values: 'subtle', 'medium', 'bold'
```

---

## Implementation Order

1. **Story 11.3** - Gradient text (quick win, high visual impact)
2. **Story 11.1** - Button hover effects (immediately noticeable improvement)
3. **Story 11.2** - Button glow & gradient borders (builds on 10.1)
4. **Story 11.4** - Text glow/shadow (builds on 10.3)
5. **Story 11.7** - Glassmorphism (independent, high impact)
6. **Story 11.5** - Animated gradients (builds on existing gradient system)
7. **Story 11.6** - Particles (most complex, can be last)
8. **Story 11.8** - Effects panel UI (integrates all above)

---

## Success Criteria

- [ ] Landing pages feel noticeably more premium than before
- [ ] Artists can create unique, personalized visual styles
- [ ] Effects perform smoothly (60fps) on desktop and mobile
- [ ] All effects respect `prefers-reduced-motion` accessibility setting
- [ ] Effects are discoverable and easy to use in the editor
- [ ] Preview updates in real-time as effects are adjusted

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance on mobile | Medium | Test thoroughly, reduce particle count, use GPU-accelerated properties |
| Browser compatibility | Low | Use well-supported CSS, provide fallbacks |
| Overwhelming users with options | Medium | Good defaults, progressive disclosure, presets |
| Accessibility (motion sensitivity) | Medium | Respect prefers-reduced-motion, provide off switches |

---

*Created: 2025-12-03*
*Epic Owner: finn*
