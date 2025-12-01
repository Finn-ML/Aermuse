# Story 9.6: Social Icons Bar

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 9.6 |
| **Epic** | Epic 9: Landing Page Customization |
| **Title** | Social Icons Bar |
| **Priority** | P1 - Medium (Phase 2) |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As an** artist
**I want** a dedicated social media icons section
**So that** my main links get more focus and socials are easily accessible

## Context

Adds a dedicated social icons bar separate from the main link list. Icons display without text labels for a cleaner look.

**Dependencies:**
- Story 9.1 (Theme Presets) - for schema structure reference

## Acceptance Criteria

- [ ] **AC-1:** User can add social icons from 10 supported platforms
- [ ] **AC-2:** Icons display without text labels (icon-only)
- [ ] **AC-3:** Icons can be reordered via drag-and-drop
- [ ] **AC-4:** Social bar can be shown/hidden via toggle
- [ ] **AC-5:** Icons render correctly on public page
- [ ] **AC-6:** Clicking icon opens link in new tab

## Technical Requirements

### Schema Changes

```typescript
// Add to landingPages table in shared/schema.ts
socialIcons: jsonb("social_icons").default([]),
showSocialBar: boolean("show_social_bar").default(true),
```

### Supported Platforms

```typescript
export const SOCIAL_PLATFORMS = [
  { id: 'spotify', name: 'Spotify', icon: 'SiSpotify' },
  { id: 'apple-music', name: 'Apple Music', icon: 'SiApplemusic' },
  { id: 'soundcloud', name: 'SoundCloud', icon: 'SiSoundcloud' },
  { id: 'youtube', name: 'YouTube', icon: 'SiYoutube' },
  { id: 'instagram', name: 'Instagram', icon: 'SiInstagram' },
  { id: 'tiktok', name: 'TikTok', icon: 'SiTiktok' },
  { id: 'twitter', name: 'X / Twitter', icon: 'SiX' },
  { id: 'facebook', name: 'Facebook', icon: 'SiFacebook' },
  { id: 'bandcamp', name: 'Bandcamp', icon: 'SiBandcamp' },
  { id: 'website', name: 'Website', icon: 'Globe' },
];
```

### Social Icon Type

```typescript
interface SocialIcon {
  id: string;
  platform: string;
  url: string;
  order: number;
}
```

### Files to Create

| File | Purpose |
|------|---------|
| `client/src/components/landing/SocialIconsEditor.tsx` | Manage social icons with drag-and-drop |

### Files to Modify

| File | Changes |
|------|---------|
| `shared/schema.ts` | Add socialIcons and showSocialBar fields |
| `client/src/pages/Dashboard.tsx` | Add social icons editor section |
| `client/src/pages/ArtistPage.tsx` | Render social icons bar |

## Definition of Done

- [ ] Schema updated with socialIcons and showSocialBar
- [ ] SocialIconsEditor component created
- [ ] All 10 platforms available for selection
- [ ] Drag-and-drop reordering works
- [ ] Show/hide toggle works
- [ ] Icons render on ArtistPage
- [ ] Type check passes

---

## Tasks/Subtasks

- [ ] **Task 1: Update Schema**
  - [ ] Add socialIcons JSONB field to landingPages
  - [ ] Add showSocialBar boolean field
  - [ ] Run npm run db:push
  - [ ] Update insertLandingPageSchema

- [ ] **Task 2: Create SocialIconsEditor Component**
  - [ ] Create `client/src/components/landing/SocialIconsEditor.tsx`
  - [ ] Add platform selector dropdown
  - [ ] Add URL input field
  - [ ] Display added icons with platform icon
  - [ ] Implement drag-and-drop reordering (use @hello-pangea/dnd)
  - [ ] Add delete button for each icon
  - [ ] Add show/hide social bar toggle

- [ ] **Task 3: Integrate in Dashboard**
  - [ ] Add "Social Icons" section to landing editor
  - [ ] Pass socialIcons data to editor
  - [ ] Handle add/remove/reorder operations
  - [ ] Handle toggle for showSocialBar

- [ ] **Task 4: Render in ArtistPage**
  - [ ] Add social icons bar section (typically at bottom)
  - [ ] Render icons using lucide-react or react-icons
  - [ ] Apply theme colors to icons
  - [ ] Only show if showSocialBar is true
  - [ ] Links open in new tab

- [ ] **Task 5: Testing**
  - [ ] Add social icon from each platform
  - [ ] Test drag-and-drop reorder
  - [ ] Test show/hide toggle
  - [ ] Verify icons render on public page

---

## Dev Notes

### Icon Library

Use `react-icons` (already installed) for social platform icons:
- `import { SiSpotify, SiYoutube, ... } from 'react-icons/si'`
- Use `Globe` from lucide-react for generic website

### Drag and Drop

Use `@hello-pangea/dnd` (already installed) for reordering.

### References
- [Source: docs/sprint-artifacts/tech-spec-epic-9.md#Story-9.6-Social-Icons-Bar]

---

## Dev Agent Record

### Context Reference

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-01 | Story drafted | SM Agent (Bob) |
