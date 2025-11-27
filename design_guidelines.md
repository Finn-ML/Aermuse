# Aermuse Artist Management Platform - Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from sophisticated creative platforms with a focus on artistry and elegance. The design balances professional utility with creative expression, positioning artists as professionals rather than products.

## Core Design Elements

### A. Colors
- **Primary Burgundy**: #660033 (backgrounds, CTAs, primary elements)
- **Cream Base**: #F7E6CA (page backgrounds, light elements)
- **Rose Accent**: #660033 variations for depth
- **White Overlays**: rgba(255, 255, 255, 0.4-0.8) for cards and inputs
- **Text**: Burgundy on cream backgrounds, cream on burgundy backgrounds

### B. Typography
- **Font Family**: 'Nunito' (Google Fonts)
- **Weights**: 200-800 range for hierarchy
- **Brand/Logo**: 300 weight, 0.3em letter-spacing, lowercase
- **Navigation**: 400 weight, 0.08em letter-spacing, uppercase, 14px
- **Headings**: 700 weight for emphasis
- **Body**: 400-500 weight, 16px base
- **Labels**: 600 weight, 0.05em letter-spacing, uppercase, 13px

### C. Layout System
- **Spacing Units**: Tailwind-equivalent spacing (8px, 16px, 20px, 24px, 28px, 40px, 48px, 60px, 80px)
- **Container Padding**: 80px horizontal for desktop, 60px for panels
- **Card Padding**: 28px standard
- **Border Radius**: 12px (small), 16px (medium), 20px (large), 50px (pills/buttons)
- **Grid**: Two-column layouts for hero sections, multi-column for stats/features

### D. Component Library

**Navigation**
- Horizontal nav with logo left, links/CTA right
- Underline hover effect on links
- Profile dropdown in dashboard with rounded menu

**Buttons**
- Primary: Burgundy background, cream text, 50px border-radius, uppercase, 18px vertical padding
- Secondary: Transparent with burgundy border, same styling
- Hover: Subtle lift (translateY -2px), shadow (0 20px 40px rgba(102, 0, 51, 0.3))
- Small variants: 12-14px padding for inline actions

**Forms**
- Input fields: rgba(255, 255, 255, 0.6) background, 2px border, 16px border-radius
- Focus state: Increased opacity, burgundy border, shadow
- Labels: Uppercase, 13px, 600 weight, burgundy with opacity
- Password toggle: Positioned absolute right

**Cards**
- Background: rgba(255, 255, 255, 0.6)
- Border-radius: 20px
- Padding: 28px
- Hover: Lift effect (translateY -4px), increased opacity, shadow

**Status Badges**
- Border-radius: 20px
- Padding: 6px 14px
- Font: 12px, 600 weight, uppercase
- Colors: Yellow for pending, green for signed, burgundy for review

**Tables**
- Clean borders with rgba(102, 0, 51, 0.06-0.1)
- Row hover: Subtle background change
- Header: Uppercase, 12px, 700 weight, semi-transparent burgundy

**Navigation Sidebar** (Dashboard)
- Items with icons, 14px gap
- Active state: Full burgundy background with cream text
- Hover: Light burgundy background

### E. Special Effects

**Three.js Shader Animation**
- Custom shader with burgundy/cream palette
- Circular wave patterns radiating from center
- Continuous time-based animation
- Used on landing hero background and auth page left panel

**Grain Overlay**
- Fixed position texture across all pages
- 0.03 opacity
- SVG-based noise filter
- Adds tactile quality

**Decorative Elements**
- Large circular outlines (300-400px)
- 1px stroke with low opacity
- Float animation (8-10s duration)
- Positioned strategically for depth

**Animations**
- Fade in: 1-1.2s ease on page load
- Fade up: Combined opacity and translateY
- Slide in: For sequential content reveals
- Float: Gentle vertical oscillation for decorative elements
- Minimal, purposeful - no excessive motion

### F. Page-Specific Patterns

**Landing Page**
- Full-width shader animation background
- Two-column hero (content left, visual right)
- Feature cards in grid
- Testimonial section
- Email signup with inline form
- Footer with social links

**Authentication**
- Split screen: Shader left (50%), form right (50%)
- Tab switching between login/register
- Centered brand overlay on shader
- Max-width form container (440px)

**Dashboard**
- Sidebar navigation (fixed, cream with subtle burgundy)
- Main content area with padding
- Stats cards grid (4 columns)
- Content cards for different sections
- Profile dropdown top-right
- Table views for contract management
- Link builder with toggle switches

### G. Interactions
- Selection: Burgundy background, cream text
- Hover states: Subtle lift, increased shadow, opacity changes
- Focus: Border color change, shadow addition
- Transitions: 0.3-0.4s ease or cubic-bezier(0.4, 0, 0.2, 1)
- No aggressive or distracting animations

### H. Responsive Considerations
- Mobile: Stack columns, reduce padding to 20-40px
- Tablet: Maintain two-column where sensible
- Desktop: Full multi-column layouts, generous spacing

## Images
No hero images required - Three.js shader animations serve as primary visual elements for landing and auth pages. Dashboard uses data visualization and UI components rather than imagery.