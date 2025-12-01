# Epic Technical Specification: Landing Page Customization

Date: 2025-12-01
Author: finn
Epic ID: 9
Status: Draft

---

## Overview

Epic 9 transforms the existing artist landing page into a fully customizable Linktree-style experience. Building upon the foundation established in Epic 7 (Landing Page Enhancements), this epic enables artists to personalize their pages with themes, fonts, colors, backgrounds, social icons, and content sections to match their brand identity.

The current landing page implementation supports basic customization (primaryColor, secondaryColor, avatar, cover image, social links JSON, and link items). This epic significantly expands these capabilities with a comprehensive theming system, visual customization options, and an improved editor interface.

## Objectives and Scope

### In Scope

- **Theme System**: Pre-built theme presets with one-click application
- **Color Customization**: Extended palette (primary, secondary, accent, text colors) with color picker UI
- **Typography**: Font selection from curated Google Fonts list (heading + body fonts)
- **Button Styling**: Multiple button style variants (rounded, pill, square, outline, filled, shadow)
- **Background Options**: Solid colors, gradients, and image uploads with overlay support
- **Social Icons Bar**: Dedicated icon section for major platforms (Spotify, Instagram, YouTube, etc.)
- **Content Organization**: Section headers and link grouping
- **Layout Variants**: Centered, left-aligned, and grid layout options
- **Video Embeds**: YouTube/Vimeo/Spotify embeds (Pro feature, subscription gated)
- **Editor Redesign**: Tabbed sidebar with live preview

### Out of Scope

- Animated backgrounds (deferred to future Pro tier enhancement)
- Custom CSS injection (security considerations)
- A/B testing for landing pages
- Analytics dashboard for page visits
- Custom domain support
- Third-party template marketplace

## System Architecture Alignment

This epic aligns with the existing architecture:

- **Frontend**: React components in `client/src/components/landing/` extending existing LandingPageEditor
- **Backend**: Express routes in `server/routes.ts` for landing page CRUD operations (already exist)
- **Database**: Drizzle ORM schema extensions to `landingPages` table in `shared/schema.ts`
- **File Storage**: Replit Object Storage for background images (pattern established in Epic 2/8)
- **Subscription Check**: Existing `requireSubscription` middleware for Pro features (Epic 5)

**Key Constraints:**
- No new external service integrations required
- Uses existing Replit Object Storage for image uploads
- Google Fonts loaded via standard `<link>` tags (no self-hosting for MVP)
- Subscription status check uses existing Stripe integration

## Detailed Design

### Services and Modules

| Module | Responsibility | Location |
|--------|---------------|----------|
| ThemePresets | Define and manage theme configurations | `shared/themes.ts` (new) |
| LandingPageEditor | Main editor component with tabs | `client/src/components/landing/LandingPageEditor.tsx` |
| ThemeSelector | Theme preset selection UI | `client/src/components/landing/ThemeSelector.tsx` (new) |
| ColorPicker | Color selection with hex input | `client/src/components/landing/ColorPicker.tsx` (new) |
| FontSelector | Font pairing selection | `client/src/components/landing/FontSelector.tsx` (new) |
| ButtonStylePicker | Button style variant selection | `client/src/components/landing/ButtonStylePicker.tsx` (new) |
| BackgroundEditor | Background type/value editor | `client/src/components/landing/BackgroundEditor.tsx` (new) |
| SocialIconsEditor | Social icons management | `client/src/components/landing/SocialIconsEditor.tsx` (new) |
| LayoutSelector | Layout option selection | `client/src/components/landing/LayoutSelector.tsx` (new) |
| ArtistPage | Public landing page renderer | `client/src/pages/ArtistPage.tsx` (modify) |

### Data Models and Contracts

#### Extended Landing Pages Schema

```typescript
// shared/schema.ts - Extend existing landingPages table
export const landingPages = pgTable("landing_pages", {
  // Existing fields
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  slug: text("slug").notNull().unique(),
  artistName: text("artist_name").notNull(),
  tagline: text("tagline"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  coverImageUrl: text("cover_image_url"),
  primaryColor: text("primary_color").default("#660033"),
  secondaryColor: text("secondary_color").default("#F7E6CA"),
  socialLinks: jsonb("social_links"),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),

  // NEW: Epic 9 customization fields
  themeId: text("theme_id"),                              // Reference to preset theme
  accentColor: text("accent_color").default("#FFD700"),   // Accent/highlight color
  textColor: text("text_color").default("#FFFFFF"),       // Main text color
  headingFont: text("heading_font").default("Inter"),     // Google Font for headings
  bodyFont: text("body_font").default("Inter"),           // Google Font for body
  buttonStyle: text("button_style").default("rounded"),   // 'rounded'|'pill'|'square'|'outline'|'filled'|'shadow'
  backgroundType: text("background_type").default("solid"), // 'solid'|'gradient'|'image'
  backgroundValue: text("background_value"),              // Color, gradient CSS, or image URL
  backgroundOverlay: text("background_overlay").default("none"), // 'none'|'dark'|'light'
  layout: text("layout").default("centered"),             // 'centered'|'left'|'grid'
  avatarPosition: text("avatar_position").default("top"), // 'top'|'left'|'hidden'
  linkWidth: text("link_width").default("full"),          // 'full'|'medium'|'compact'
  socialIcons: jsonb("social_icons").default([]),         // Dedicated social icons array
  showSocialBar: boolean("show_social_bar").default(true),
});
```

#### Extended Landing Page Links Schema

```typescript
// shared/schema.ts - Extend existing landingPageLinks table
export const landingPageLinks = pgTable("landing_page_links", {
  // Existing fields
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landingPageId: varchar("landing_page_id").notNull().references(() => landingPages.id),
  title: text("title").notNull(),
  url: text("url").notNull(),
  icon: text("icon"),
  enabled: boolean("enabled").default(true),
  order: text("order").default("0"),
  createdAt: timestamp("created_at").defaultNow(),

  // NEW: Epic 9 fields
  type: text("type").default("link"),     // 'link'|'header'|'video_embed'
  videoUrl: text("video_url"),            // For video embeds (YouTube/Vimeo URL)
});
```

#### Theme Preset Type

```typescript
// shared/themes.ts (new file)
export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  buttonStyle: ButtonStyle;
  backgroundType: BackgroundType;
  backgroundValue: string;
  backgroundOverlay: BackgroundOverlay;
}

export type ButtonStyle = 'rounded' | 'pill' | 'square' | 'outline' | 'filled' | 'shadow';
export type BackgroundType = 'solid' | 'gradient' | 'image';
export type BackgroundOverlay = 'none' | 'dark' | 'light';
export type Layout = 'centered' | 'left' | 'grid';
export type AvatarPosition = 'top' | 'left' | 'hidden';
export type LinkWidth = 'full' | 'medium' | 'compact';

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'dark-stage',
    name: 'Dark Stage',
    description: 'Bold and dramatic for performers',
    primaryColor: '#1a1a2e',
    secondaryColor: '#e94560',
    accentColor: '#ffd700',
    textColor: '#ffffff',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    buttonStyle: 'filled',
    backgroundType: 'solid',
    backgroundValue: '#0f0f1a',
    backgroundOverlay: 'none',
  },
  // ... 5-7 more presets
];

export const SUPPORTED_FONTS = [
  { name: 'Inter', category: 'sans-serif' },
  { name: 'Montserrat', category: 'sans-serif' },
  { name: 'Poppins', category: 'sans-serif' },
  { name: 'Roboto', category: 'sans-serif' },
  { name: 'Playfair Display', category: 'serif' },
  { name: 'Lora', category: 'serif' },
  { name: 'Space Grotesk', category: 'sans-serif' },
  { name: 'DM Sans', category: 'sans-serif' },
];

export const SOCIAL_PLATFORMS = [
  { id: 'spotify', name: 'Spotify', icon: 'spotify' },
  { id: 'apple-music', name: 'Apple Music', icon: 'apple' },
  { id: 'soundcloud', name: 'SoundCloud', icon: 'soundcloud' },
  { id: 'youtube', name: 'YouTube', icon: 'youtube' },
  { id: 'instagram', name: 'Instagram', icon: 'instagram' },
  { id: 'tiktok', name: 'TikTok', icon: 'tiktok' },
  { id: 'twitter', name: 'X / Twitter', icon: 'twitter' },
  { id: 'facebook', name: 'Facebook', icon: 'facebook' },
  { id: 'bandcamp', name: 'Bandcamp', icon: 'bandcamp' },
  { id: 'website', name: 'Website', icon: 'globe' },
];
```

#### Social Icon Type

```typescript
// shared/types/landing.ts
export interface SocialIcon {
  platform: string;  // matches SOCIAL_PLATFORMS[].id
  url: string;
  order: number;
}
```

### APIs and Interfaces

#### Existing Endpoints (to extend)

| Method | Path | Changes |
|--------|------|---------|
| GET | `/api/landing-page` | Returns extended fields |
| PUT | `/api/landing-page` | Accepts extended fields |
| GET | `/api/artist/:slug` | Returns extended fields for public rendering |

#### New Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/landing-page/background-image` | Upload background image | requireAuth |
| DELETE | `/api/landing-page/background-image` | Remove background image | requireAuth |
| GET | `/api/themes` | Get all theme presets | public |

#### Background Image Upload

```typescript
// POST /api/landing-page/background-image
// Request: multipart/form-data with 'image' field
// Response:
{
  "success": true,
  "url": "https://storage.replit.com/v1/..."
}

// Validation:
// - Max size: 2MB
// - Allowed types: image/jpeg, image/png, image/webp
// - Stored at: landing-pages/{userId}/{landingPageId}/background.{ext}
```

### Workflows and Sequencing

#### Theme Application Flow

```
1. User clicks theme preset in ThemeSelector
2. Frontend shows preview with theme values
3. User confirms selection
4. PUT /api/landing-page with theme values
5. themeId stored for reference
6. Public page renders with new theme
```

#### Background Image Upload Flow

```
1. User selects "Image" in BackgroundEditor
2. User uploads image file
3. POST /api/landing-page/background-image
4. Server validates (size, type)
5. Server uploads to Replit Object Storage
6. Server returns URL
7. Frontend updates backgroundValue with URL
8. User saves landing page
```

#### Video Embed Flow (Pro)

```
1. User clicks "Add Video" in link editor
2. System checks subscription status
3. If free: Show upgrade prompt
4. If Pro: Show URL input modal
5. User pastes YouTube/Vimeo URL
6. System parses and validates URL
7. Creates landingPageLink with type='video_embed'
8. Public page renders embed iframe
```

## Non-Functional Requirements

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Landing page load time | < 2 seconds | Lighthouse |
| Editor responsiveness | < 100ms for preview updates | Manual testing |
| Image upload time | < 5 seconds for 2MB | Server logs |
| Font loading | Non-blocking, < 500ms | Network waterfall |

**Optimization Strategies:**
- Lazy load Google Fonts only when page renders
- Compress background images server-side before storage
- Use CSS variables for theming (instant preview updates)
- Preload common fonts in editor

### Security

- **Image Upload Validation**: Server-side MIME type verification, size limits
- **Subscription Gating**: Server validates Pro status for video embeds
- **Input Sanitization**: All text inputs sanitized (XSS prevention)
- **URL Validation**: Video embed URLs validated against allowlist (YouTube, Vimeo, Spotify)
- **Storage Access**: Background images scoped to user's landing page

### Reliability/Availability

- **Graceful Degradation**: If Google Fonts fail, fallback to system fonts
- **Image CDN**: Replit Object Storage provides automatic CDN
- **Preview Isolation**: Editor preview doesn't affect published page until save
- **Draft State**: Unsaved changes stored in local state with warning on navigation

### Observability

| Signal | Purpose |
|--------|---------|
| `[LANDING] Theme applied: {themeId} for user {userId}` | Track theme popularity |
| `[LANDING] Background upload: {size}KB for {landingPageId}` | Monitor storage usage |
| `[LANDING] Video embed added: {platform} by {userId}` | Track Pro feature usage |
| `[ERROR] Background upload failed: {reason}` | Debug upload issues |

## Dependencies and Integrations

### External Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| react-colorful | Lightweight color picker | ^5.6.1 |
| lucide-react | Social platform icons (existing) | ^0.263.1 |

### Internal Dependencies

- Replit Object Storage (existing) - for background image uploads
- Stripe subscription status (Epic 5) - for Pro feature gating
- Existing landing page CRUD endpoints - to extend

### Google Fonts (External)

Loaded via standard HTML link tags:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
```

## Acceptance Criteria (Authoritative)

### Story 9.1: Theme Presets
1. AC-9.1.1: User can see 6-8 theme preset options in editor
2. AC-9.1.2: Clicking a theme shows live preview
3. AC-9.1.3: Applying theme updates all related fields (colors, fonts, buttons, background)
4. AC-9.1.4: Theme selection persists after save

### Story 9.2: Custom Colors
5. AC-9.2.1: Color picker available for primary, secondary, accent, text colors
6. AC-9.2.2: Hex code input accepts valid hex values
7. AC-9.2.3: Preview updates immediately on color change
8. AC-9.2.4: Warning shown if contrast ratio < 4.5:1 (WCAG AA)

### Story 9.3: Font Selection
9. AC-9.3.1: 8-10 font options displayed with preview
10. AC-9.3.2: Separate selection for heading and body fonts
11. AC-9.3.3: Selected fonts load on public page
12. AC-9.3.4: Fallback fonts render if Google Fonts unavailable

### Story 9.4: Button Styles
13. AC-9.4.1: 6 button style options available (rounded, pill, square, outline, filled, shadow)
14. AC-9.4.2: Preview shows each style variant
15. AC-9.4.3: Selected style applies to all link buttons on public page

### Story 9.5: Background Customization
16. AC-9.5.1: User can select solid color, gradient, or image background
17. AC-9.5.2: Gradient builder allows 2 colors and direction selection
18. AC-9.5.3: Image upload validates size (≤2MB) and type (jpg/png/webp)
19. AC-9.5.4: Overlay options (none/dark/light) available and functional
20. AC-9.5.5: Background persists and displays on public page

### Story 9.6: Social Icons Bar
21. AC-9.6.1: User can add social icons from 10 supported platforms
22. AC-9.6.2: Icons display without text labels
23. AC-9.6.3: Icons can be reordered via drag-and-drop
24. AC-9.6.4: Social bar can be shown/hidden via toggle
25. AC-9.6.5: Icons render correctly on public page

### Story 9.7: Link Sections & Headers
26. AC-9.7.1: User can add section header between links
27. AC-9.7.2: Headers display with theme styling
28. AC-9.7.3: Sections and links can be reordered together
29. AC-9.7.4: Empty sections hidden on public page

### Story 9.8: Layout Options
30. AC-9.8.1: 3 layout options available (centered, left, grid)
31. AC-9.8.2: Avatar position options work (top, left, hidden)
32. AC-9.8.3: Link width options apply correctly
33. AC-9.8.4: Preview shows layout changes

### Story 9.9: Video Embeds (Pro)
34. AC-9.9.1: Free users see upgrade prompt when attempting video embed
35. AC-9.9.2: Pro users can add YouTube/Vimeo/Spotify embeds
36. AC-9.9.3: Max 3 video embeds enforced
37. AC-9.9.4: Embeds play correctly on public page

### Story 9.10: Editor Redesign
38. AC-9.10.1: Editor has tabbed sidebar (Theme, Colors, Fonts, Background, Layout)
39. AC-9.10.2: Live preview updates without page reload
40. AC-9.10.3: Mobile/desktop preview toggle works
41. AC-9.10.4: Unsaved changes prompt on navigation away

## Traceability Mapping

| AC | Spec Section | Component | Test Type |
|----|--------------|-----------|-----------|
| AC-9.1.1-4 | Theme Presets | ThemeSelector | Integration |
| AC-9.2.1-4 | Custom Colors | ColorPicker | Unit + Integration |
| AC-9.3.1-4 | Font Selection | FontSelector | Integration |
| AC-9.4.1-3 | Button Styles | ButtonStylePicker | Visual |
| AC-9.5.1-5 | Background | BackgroundEditor, API | Integration |
| AC-9.6.1-5 | Social Icons | SocialIconsEditor | Integration |
| AC-9.7.1-4 | Link Sections | LandingPageEditor | Integration |
| AC-9.8.1-4 | Layout | LayoutSelector | Visual |
| AC-9.9.1-4 | Video Embeds | VideoEmbedModal, API | Integration |
| AC-9.10.1-4 | Editor Redesign | LandingPageEditor | E2E |

## Risks, Assumptions, Open Questions

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Google Fonts outage affects pages | Low | Medium | Implement fallback fonts in CSS |
| Large background images slow pages | Medium | Medium | Server-side compression, size limits |
| Theme/custom color conflicts confuse users | Medium | Low | Clear UI showing "custom" vs "theme" state |
| Video embed abuse (inappropriate content) | Low | High | Manual review option, report mechanism |

### Assumptions

1. Replit Object Storage has sufficient capacity for background images
2. Google Fonts remains free and available
3. Users prefer preset themes over fully custom options
4. 8-10 font options provide sufficient variety

### Open Questions

1. **Q:** Should we allow custom font uploads for Pro users?
   **A:** Deferred - adds complexity, licensing concerns

2. **Q:** Should video embeds auto-play?
   **A:** No - muted autoplay only if requested, default to click-to-play

3. **Q:** How to handle existing pages with old schema?
   **A:** Migration sets defaults; existing values preserved where applicable

## Test Strategy Summary

### Unit Tests
- Theme preset application logic
- Color contrast validation function
- Video URL parsing (YouTube, Vimeo ID extraction)
- Font loading utility

### Integration Tests
- Background image upload endpoint
- Landing page save with extended fields
- Subscription check for video embeds
- Theme application end-to-end

### Visual/Manual Tests
- All 6 button styles render correctly
- All 3 layout options display properly
- Mobile responsiveness of editor
- Font rendering across browsers

### E2E Tests
- Complete theme selection → save → public view flow
- Background image upload → display flow
- Video embed (Pro) → playback flow

### Test Coverage Targets
- Unit: 80% for new utility functions
- Integration: All API endpoints
- E2E: Critical happy paths (theme, background, social icons)
