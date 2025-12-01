# Story 9.5: Background Customization

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 9.5 |
| **Epic** | Epic 9: Landing Page Customization |
| **Title** | Background Customization |
| **Priority** | P1 - Medium (Phase 2) |
| **Story Points** | 5 |
| **Status** | Drafted |

## User Story

**As an** artist
**I want** to set a custom background for my landing page
**So that** my page has visual impact and matches my brand

## Context

First story in Phase 2 (Visual Enhancements). Adds background customization with solid colors, gradients, and image uploads.

**Dependencies:**
- Story 9.1 (Theme Presets) - backgroundType, backgroundValue, backgroundOverlay schema fields

## Acceptance Criteria

- [ ] **AC-1:** Background type options: Solid color, Gradient, Image
- [ ] **AC-2:** Gradient builder allows 2 colors and direction selection
- [ ] **AC-3:** Image upload validates size (≤2MB) and type (jpg/png/webp)
- [ ] **AC-4:** Image positioning options: cover, contain
- [ ] **AC-5:** Overlay options (none/dark/light) available and functional
- [ ] **AC-6:** Background persists and displays on public page
- [ ] **AC-7:** Preview shows background changes immediately

## Technical Requirements

### Files to Create

| File | Purpose |
|------|---------|
| `client/src/components/landing/BackgroundEditor.tsx` | Background type/value editor |

### Files to Modify

| File | Changes |
|------|---------|
| `server/routes.ts` | Add POST /api/landing-page/background-image endpoint |
| `client/src/pages/Dashboard.tsx` | Add background editor to landing page section |
| `client/src/pages/ArtistPage.tsx` | Apply background styles |

### Background Image Upload Endpoint

```typescript
// POST /api/landing-page/background-image
app.post("/api/landing-page/background-image", requireAuth, upload.single('image'), async (req, res) => {
  const userId = req.session?.userId;
  const file = req.file;

  // Validate file
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Check size (2MB max)
  if (file.size > 2 * 1024 * 1024) {
    return res.status(400).json({ error: 'File too large. Maximum size is 2MB.' });
  }

  // Check type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type. Allowed: jpg, png, webp' });
  }

  // Upload to Replit Object Storage
  const landingPage = await storage.getLandingPageByUserId(userId);
  const path = `landing-pages/${userId}/${landingPage.id}/background.${file.originalname.split('.').pop()}`;

  // Upload and get URL
  const url = await uploadToStorage(path, file.buffer);

  res.json({ success: true, url });
});
```

### Gradient CSS Generation

```typescript
interface GradientConfig {
  color1: string;
  color2: string;
  direction: 'to-right' | 'to-bottom' | 'to-bottom-right' | 'to-bottom-left';
}

function generateGradientCSS(config: GradientConfig): string {
  const directionMap = {
    'to-right': '90deg',
    'to-bottom': '180deg',
    'to-bottom-right': '135deg',
    'to-bottom-left': '225deg',
  };
  return `linear-gradient(${directionMap[config.direction]}, ${config.color1} 0%, ${config.color2} 100%)`;
}
```

### Overlay CSS

```css
.background-overlay-dark::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.background-overlay-light::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.3);
  pointer-events: none;
}
```

## Definition of Done

- [ ] BackgroundEditor component created with 3 type options
- [ ] Solid color picker works
- [ ] Gradient builder with 2 colors and direction works
- [ ] Image upload endpoint created and functional
- [ ] Image upload validates size and type
- [ ] Overlay options work
- [ ] ArtistPage applies all background types correctly
- [ ] Type check passes

---

## Tasks/Subtasks

- [ ] **Task 1: Create Background Image Upload Endpoint**
  - [ ] Add POST /api/landing-page/background-image route
  - [ ] Configure multer for file upload
  - [ ] Validate file size (≤2MB)
  - [ ] Validate file type (jpg/png/webp)
  - [ ] Upload to Replit Object Storage
  - [ ] Return URL

- [ ] **Task 2: Create BackgroundEditor Component**
  - [ ] Create `client/src/components/landing/BackgroundEditor.tsx`
  - [ ] Add type selector (solid/gradient/image)
  - [ ] Add solid color picker (reuse ColorPicker from 9.2)
  - [ ] Add gradient builder (2 color pickers + direction)
  - [ ] Add image upload with preview
  - [ ] Add overlay selector (none/dark/light)

- [ ] **Task 3: Integrate in Dashboard**
  - [ ] Add "Background" section to landing editor
  - [ ] Handle background type changes
  - [ ] Handle image upload
  - [ ] Show live preview

- [ ] **Task 4: Apply Background in ArtistPage**
  - [ ] Apply solid color background
  - [ ] Apply gradient background
  - [ ] Apply image background with cover/contain
  - [ ] Apply overlay based on backgroundOverlay value

- [ ] **Task 5: Testing**
  - [ ] Test solid color background
  - [ ] Test gradient builder
  - [ ] Test image upload validation
  - [ ] Test overlay options
  - [ ] Verify persistence

---

## Dev Notes

### Learnings from Previous Stories

**From Story 9-1-theme-presets:**
- backgroundType, backgroundValue, backgroundOverlay fields exist
- Themes can set default backgrounds

**From Story 9-2-custom-colors:**
- ColorPicker component available for reuse

### Storage Pattern

Follow existing pattern from contract file uploads in Epic 2/8.

### References
- [Source: docs/sprint-artifacts/tech-spec-epic-9.md#Story-9.5-Background-Customization]
- [Source: docs/architecture.md#Replit-Object-Storage]

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
