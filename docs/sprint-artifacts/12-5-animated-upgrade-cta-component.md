# Story 12.5: Animated Upgrade CTA Component

## Story Info
| Field | Value |
|-------|-------|
| **Story ID** | 12-5 |
| **Epic** | EPIC-012: Pricing Tier Restructure |
| **Title** | Animated Upgrade CTA Component |
| **Status** | Review |
| **Story Points** | 5 |
| **Priority** | P0 - Critical |

## User Story
**As a** Beta user viewing blurred content
**I want** an engaging, animated call-to-action
**So that** I'm compelled to upgrade and unlock the feature

## Acceptance Criteria

- [x] **AC-1**: Shimmer border animation
  - Gradient sweeps around CTA card
  - Duration: 2.5s, infinite loop

- [x] **AC-2**: Floating particle effect
  - 6-8 SVG circles with drift animation
  - Burgundy color (#660033) at 20-40% opacity
  - Staggered animation delays

- [x] **AC-3**: Pulsing unlock icon
  - Expanding ring effect from center
  - Scale 1 → 1.5, opacity fade out
  - Duration: 1.5s, infinite

- [x] **AC-4**: Feature-specific messaging
  - Display count teaser: "5 Red Flags Found"
  - "Unlock with Alpha" button

- [x] **AC-5**: Reduced motion support
  - `prefers-reduced-motion: reduce`
  - Disable animations, show static version

- [x] **AC-6**: Mobile responsive
  - Adapts to smaller screens
  - Touch-friendly tap target

## Technical Notes

### Component (client/src/components/AnimatedUpgradeCTA.tsx)

```typescript
import { Link } from 'wouter';
import { Unlock, Sparkles } from 'lucide-react';

interface AnimatedUpgradeCTAProps {
  feature: string;
  count?: number;
}

export function AnimatedUpgradeCTA({ feature, count }: AnimatedUpgradeCTAProps) {
  return (
    <Link href="/pricing">
      <div className="animated-cta relative p-6 rounded-2xl cursor-pointer group">
        {/* Shimmer border */}
        <div className="absolute inset-0 rounded-2xl shimmer-border" />

        {/* Floating particles */}
        <FloatingParticles />

        {/* Glassmorphism card */}
        <div className="relative bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/40 shadow-lg">
          {/* Pulsing unlock icon */}
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="pulse-ring absolute inset-0 rounded-full bg-[#660033]/20" />
            <div className="pulse-ring absolute inset-0 rounded-full bg-[#660033]/20 animation-delay-500" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[#660033] to-[#8B0045] flex items-center justify-center">
              <Unlock className="w-8 h-8 text-[#F7E6CA]" />
            </div>
          </div>

          {/* Text content */}
          <h3 className="text-lg font-bold text-[#660033] text-center mb-1">
            {feature}
          </h3>
          {count !== undefined && count > 0 && (
            <p className="text-sm text-[#660033]/70 text-center mb-4">
              {count} {count === 1 ? 'item' : 'items'} found
            </p>
          )}

          {/* CTA button */}
          <button className="w-full py-3 px-4 bg-gradient-to-r from-[#660033] to-[#8B0045] text-[#F7E6CA] font-semibold rounded-lg flex items-center justify-center gap-2 group-hover:shadow-lg transition-shadow">
            <Sparkles className="w-4 h-4" />
            Unlock with Alpha
          </button>
        </div>
      </div>
    </Link>
  );
}
```

### CSS Animations (add to global or component)

```css
/* Shimmer border */
.shimmer-border {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(102, 0, 51, 0.3),
    transparent
  );
  background-size: 200% 100%;
  animation: shimmer 2.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

/* Floating particles */
@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
    opacity: 0.3;
  }
  50% {
    transform: translateY(-15px) rotate(10deg);
    opacity: 0.6;
  }
}

.particle {
  animation: float 3s ease-in-out infinite;
}

.particle:nth-child(2) { animation-delay: 0.5s; }
.particle:nth-child(3) { animation-delay: 1s; }
.particle:nth-child(4) { animation-delay: 1.5s; }
.particle:nth-child(5) { animation-delay: 2s; }
.particle:nth-child(6) { animation-delay: 2.5s; }

/* Pulse ring */
.pulse-ring {
  animation: pulse-ring 1.5s ease-out infinite;
}

.animation-delay-500 {
  animation-delay: 0.5s;
}

@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .shimmer-border,
  .particle,
  .pulse-ring {
    animation: none !important;
  }

  .shimmer-border {
    background: rgba(102, 0, 51, 0.1);
  }

  .pulse-ring {
    opacity: 0;
  }
}
```

### FloatingParticles Sub-component

```typescript
function FloatingParticles() {
  const particles = [
    { size: 6, left: '10%', top: '20%' },
    { size: 4, left: '85%', top: '15%' },
    { size: 8, left: '75%', top: '70%' },
    { size: 5, left: '15%', top: '75%' },
    { size: 7, left: '50%', top: '10%' },
    { size: 4, left: '60%', top: '85%' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
      {particles.map((p, i) => (
        <div
          key={i}
          className="particle absolute rounded-full bg-[#660033]"
          style={{
            width: p.size,
            height: p.size,
            left: p.left,
            top: p.top,
            opacity: 0.3,
          }}
        />
      ))}
    </div>
  );
}
```

## Files to Create

| File | Description |
|------|-------------|
| `client/src/components/AnimatedUpgradeCTA.tsx` | Main component with animations |

## Dependencies

- None (can be developed in parallel with 12.4)

## Definition of Done

- [x] All animations render smoothly
- [x] Reduced motion fallback works
- [x] Click navigates to pricing
- [x] Mobile responsive
- [x] GPU-accelerated (no jank)
- [x] Feature count displays correctly

## Dev Agent Record

### Context Reference
- Tech Spec: `docs/sprint-artifacts/tech-spec-epic-12.md`
- Brand colors: #660033 (burgundy), #F7E6CA (cream)

### Implementation Notes

**Completed 2025-12-10**

1. **AnimatedUpgradeCTA Component** (`client/src/components/AnimatedUpgradeCTA.tsx`)
   - Props: `feature: string`, `count?: number`
   - Wrapped in `<Link href="/pricing">` for navigation
   - Glassmorphism card with gradient background

2. **Shimmer Border Animation** (Lines 45-52, 103-106)
   - Linear gradient sweep with `background-position` animation
   - Duration: 2.5s, ease-in-out, infinite
   - 200% background-size for smooth edge-to-edge sweep

3. **FloatingParticles Sub-component** (Lines 9-38)
   - 6 particles with varying sizes (4-8px)
   - Staggered animation delays (0.5s increments)
   - Float animation: translateY(-15px) + rotate(10deg)

4. **Pulsing Unlock Icon** (Lines 60-75)
   - Two overlapping pulse rings with 0.5s delay offset
   - Scale 1 → 1.5, opacity fade from 0.8 → 0
   - Centered Unlock icon from lucide-react

5. **Reduced Motion Support** (Lines 124-128)
   - `@media (prefers-reduced-motion: reduce)` query
   - Disables all animations via `animation: none !important`

6. **Mobile Responsive** (Throughout)
   - Responsive padding: `p-4 sm:p-6`
   - Responsive icon sizes: `w-12 h-12 sm:w-16 sm:h-16`
   - Responsive text: `text-base sm:text-lg`

### File List

| File | Action |
|------|--------|
| `client/src/components/AnimatedUpgradeCTA.tsx` | Created |

### Test Commands
```bash
npm run check
# Visual testing in browser
# Test with prefers-reduced-motion in devtools
```
