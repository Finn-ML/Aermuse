# Epic 9: Landing Page Customization

## Epic Overview

| Field | Value |
|-------|-------|
| **Epic ID** | EPIC-009 |
| **Title** | Landing Page Customization |
| **Priority** | P2 - Medium |
| **Estimated Effort** | 3-4 days |
| **Dependencies** | Epic 7 (Landing Page Enhancements) |

## Description

Transform the artist landing page into a fully customizable Linktree-style experience. Artists can personalize their pages with themes, fonts, colors, backgrounds, social icons, and content sections to match their brand identity.

## Business Value

- Differentiate from basic link-in-bio tools
- Increase artist engagement and page creation
- Enable premium customization features (monetization opportunity)
- Strengthen artist branding on the platform
- Drive traffic to Aermuse through artist page sharing

## Current State

The landing page currently supports:
- Artist name, tagline, bio
- Avatar and cover image URLs
- Primary/secondary colors (basic)
- Social links (JSON)
- Link items (title, URL, icon)

## Target State

A fully customizable landing page with:
- Theme presets and custom theming
- Font selection
- Button style variants
- Background customization (images, gradients)
- Social icons bar
- Content sections with headers
- Layout options
- Video embeds (Pro feature)

---

## User Stories

### Story 9.1: Theme Presets

**As an** artist
**I want** to choose from pre-built themes
**So that** I can quickly style my page without design skills

**Acceptance Criteria:**
- [ ] 6-8 theme presets available (e.g., "Dark Stage", "Clean Studio", "Vintage Vinyl", "Neon Nights", "Acoustic", "Minimalist")
- [ ] Each theme includes: colors, fonts, button style, background
- [ ] One-click theme application
- [ ] Live preview before applying
- [ ] Theme selection UI in landing page editor

**Technical Notes:**
- Store theme presets as JSON configuration
- Theme includes: primaryColor, secondaryColor, accentColor, fontFamily, buttonStyle, backgroundType

**Story Points:** 3

---

### Story 9.2: Custom Colors

**As an** artist
**I want** to customize my page colors
**So that** my page matches my brand

**Acceptance Criteria:**
- [ ] Color picker for primary, secondary, and accent colors
- [ ] Live preview as colors change
- [ ] Hex code input option
- [ ] Recently used colors saved
- [ ] Contrast validation (warn if text unreadable)

**Technical Notes:**
- Extend schema: add `accentColor`, `textColor`, `linkColor` fields
- Use react-colorful or similar lightweight picker

**Story Points:** 2

---

### Story 9.3: Font Selection

**As an** artist
**I want** to choose fonts for my page
**So that** typography matches my aesthetic

**Acceptance Criteria:**
- [ ] 8-10 curated font pairings (heading + body)
- [ ] Font preview in selection UI
- [ ] Fonts load from Google Fonts
- [ ] Separate heading and body font options
- [ ] Default fallback fonts

**Technical Notes:**
- Add `headingFont`, `bodyFont` to schema
- Pre-approved font list: Inter, Playfair Display, Roboto, Montserrat, Lora, Poppins, etc.
- Dynamic font loading on page render

**Story Points:** 2

---

### Story 9.4: Button Styles

**As an** artist
**I want** to customize how my link buttons look
**So that** they match my page design

**Acceptance Criteria:**
- [ ] Button style options: Rounded, Pill, Square, Outline, Filled, Shadow
- [ ] Button color follows theme or custom override
- [ ] Hover effect options (subtle, bold, none)
- [ ] Preview of each style
- [ ] Applies to all link buttons consistently

**Technical Notes:**
- Add `buttonStyle` enum to schema: 'rounded' | 'pill' | 'square' | 'outline' | 'filled' | 'shadow'
- CSS class mapping for each style

**Story Points:** 2

---

### Story 9.5: Background Customization

**As an** artist
**I want** to set a custom background
**So that** my page has visual impact

**Acceptance Criteria:**
- [ ] Background options: Solid color, Gradient, Image
- [ ] Gradient builder (2 colors, direction)
- [ ] Image upload (max 2MB, jpg/png/webp)
- [ ] Image positioning: cover, contain, tile
- [ ] Overlay option (dark/light tint for readability)
- [ ] Preview before saving

**Technical Notes:**
- Add `backgroundType`: 'solid' | 'gradient' | 'image'
- Add `backgroundValue` (color, gradient CSS, or image URL)
- Add `backgroundOverlay`: 'none' | 'dark' | 'light'
- Image upload to existing file storage service

**Story Points:** 5

---

### Story 9.6: Social Icons Bar

**As an** artist
**I want** a dedicated social media icons section
**So that** my main links get more focus

**Acceptance Criteria:**
- [ ] Separate social icons section (typically at bottom)
- [ ] Supported platforms: Spotify, Apple Music, SoundCloud, YouTube, Instagram, TikTok, Twitter/X, Facebook, Bandcamp, Website
- [ ] Icon-only display (no text labels)
- [ ] Add social link by selecting platform and entering URL
- [ ] Drag to reorder icons
- [ ] Option to show/hide social bar

**Technical Notes:**
- New `socialIcons` JSONB field (separate from existing socialLinks)
- Structure: `[{ platform: string, url: string, order: number }]`
- SVG icons for each platform

**Story Points:** 3

---

### Story 9.7: Link Sections & Headers

**As an** artist
**I want** to organize my links under headings
**So that** visitors can find what they need

**Acceptance Criteria:**
- [ ] Add section headers between links (e.g., "Music", "Merch", "Tour")
- [ ] Header styling follows theme
- [ ] Drag to reorder sections and links
- [ ] Collapsible sections (optional)
- [ ] Empty sections hidden on public page

**Technical Notes:**
- Add `type` field to landingPageLinks: 'link' | 'header'
- Headers have title only, no URL
- Reuse existing order field for positioning

**Story Points:** 3

---

### Story 9.8: Layout Options

**As an** artist
**I want** to choose a page layout
**So that** my content is arranged my way

**Acceptance Criteria:**
- [ ] Layout options: Centered (default), Left-aligned, Card grid
- [ ] Avatar position options: Top, Left side, Hidden
- [ ] Link width options: Full, Medium, Compact
- [ ] Preview each layout before selecting

**Technical Notes:**
- Add `layout` field: 'centered' | 'left' | 'grid'
- Add `avatarPosition`: 'top' | 'left' | 'hidden'
- Add `linkWidth`: 'full' | 'medium' | 'compact'
- CSS grid/flex variations for each layout

**Story Points:** 3

---

### Story 9.9: Video Embeds (Pro Feature)

**As an** artist with a Pro subscription
**I want** to embed videos on my page
**So that** visitors can watch my content

**Acceptance Criteria:**
- [ ] Add video embed block (YouTube, Vimeo, Spotify embed)
- [ ] Paste URL, auto-detect platform
- [ ] Embedded player displays inline
- [ ] Video thumbnail preview in editor
- [ ] Pro subscription required (show upgrade prompt for free users)
- [ ] Max 3 video embeds per page

**Technical Notes:**
- Add new link type: 'video_embed'
- Parse YouTube/Vimeo URLs to extract video ID
- Use platform oEmbed APIs for embed code
- Check user subscription status before allowing

**Story Points:** 5

---

### Story 9.10: Landing Page Editor Redesign

**As an** artist
**I want** an intuitive editor interface
**So that** I can easily customize my page

**Acceptance Criteria:**
- [ ] Sidebar with customization tabs: Theme, Colors, Fonts, Background, Layout
- [ ] Live preview panel showing changes
- [ ] Mobile/desktop preview toggle
- [ ] Save and Publish buttons
- [ ] Undo/Redo for recent changes
- [ ] Reset to default option

**Technical Notes:**
- Refactor existing LandingPageEditor component
- Add preview iframe or inline preview
- Local state for unsaved changes
- Batch save all customizations

**Story Points:** 5

---

## Total Story Points: 33

## Story Prioritization

### Phase 1 - Core Theming (MVP)
| Story | Points | Priority |
|-------|--------|----------|
| 9.1 Theme Presets | 3 | P0 |
| 9.2 Custom Colors | 2 | P0 |
| 9.3 Font Selection | 2 | P0 |
| 9.4 Button Styles | 2 | P0 |
| **Subtotal** | **9** | |

### Phase 2 - Visual Enhancements
| Story | Points | Priority |
|-------|--------|----------|
| 9.5 Background Customization | 5 | P1 |
| 9.6 Social Icons Bar | 3 | P1 |
| 9.7 Link Sections & Headers | 3 | P1 |
| **Subtotal** | **11** | |

### Phase 3 - Advanced Features
| Story | Points | Priority |
|-------|--------|----------|
| 9.8 Layout Options | 3 | P2 |
| 9.9 Video Embeds (Pro) | 5 | P2 |
| 9.10 Editor Redesign | 5 | P2 |
| **Subtotal** | **13** | |

---

## Schema Changes Summary

```sql
-- Extend landing_pages table
ALTER TABLE landing_pages ADD COLUMN accent_color TEXT DEFAULT '#FFD700';
ALTER TABLE landing_pages ADD COLUMN text_color TEXT DEFAULT '#FFFFFF';
ALTER TABLE landing_pages ADD COLUMN heading_font TEXT DEFAULT 'Inter';
ALTER TABLE landing_pages ADD COLUMN body_font TEXT DEFAULT 'Inter';
ALTER TABLE landing_pages ADD COLUMN button_style TEXT DEFAULT 'rounded';
ALTER TABLE landing_pages ADD COLUMN background_type TEXT DEFAULT 'solid';
ALTER TABLE landing_pages ADD COLUMN background_value TEXT;
ALTER TABLE landing_pages ADD COLUMN background_overlay TEXT DEFAULT 'none';
ALTER TABLE landing_pages ADD COLUMN layout TEXT DEFAULT 'centered';
ALTER TABLE landing_pages ADD COLUMN avatar_position TEXT DEFAULT 'top';
ALTER TABLE landing_pages ADD COLUMN link_width TEXT DEFAULT 'full';
ALTER TABLE landing_pages ADD COLUMN social_icons JSONB DEFAULT '[]';
ALTER TABLE landing_pages ADD COLUMN theme_id TEXT;

-- Extend landing_page_links table
ALTER TABLE landing_page_links ADD COLUMN type TEXT DEFAULT 'link';
ALTER TABLE landing_page_links ADD COLUMN video_url TEXT;
```

---

## Definition of Done

- [ ] Theme presets selectable and applied
- [ ] Colors, fonts, buttons customizable
- [ ] Background customization working
- [ ] Social icons bar functional
- [ ] Link sections/headers supported
- [ ] Layout options available
- [ ] Video embeds working (Pro)
- [ ] Editor UI intuitive and responsive
- [ ] Changes persist and display correctly on public page
- [ ] Mobile responsive
- [ ] Performance acceptable (page load < 2s)

---

## Risk & Considerations

1. **Image Storage** - Background images need upload service (may need S3/Cloudflare integration)
2. **Font Loading** - Google Fonts adds external dependency; consider self-hosting
3. **Pro Feature Gating** - Need clear UX for upgrade prompts
4. **Theme Compatibility** - Custom colors may conflict with preset themes
5. **Performance** - Heavy customization could slow page rendering
