# Story 9.9: Video Embeds (Pro Feature)

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 9.9 |
| **Epic** | Epic 9: Landing Page Customization |
| **Title** | Video Embeds |
| **Priority** | P2 - Low (Phase 3) |
| **Story Points** | 5 |
| **Status** | Drafted |

## User Story

**As a** Pro subscriber artist
**I want** to embed video content on my landing page
**So that** I can showcase my music videos and performances

## Context

Pro-exclusive feature for embedding YouTube, Vimeo, and Spotify content. Requires subscription check middleware. Builds on link type system from Story 9.7.

**Dependencies:**
- Story 9.7 (Link Sections) - type field on landingPageLinks
- Epic 5 (Subscription System) - requireSubscription middleware

## Acceptance Criteria

- [ ] **AC-1:** Video embed option only visible to Pro subscribers
- [ ] **AC-2:** Supported platforms: YouTube, Vimeo, Spotify
- [ ] **AC-3:** URL parsed to extract video/track ID
- [ ] **AC-4:** Embed renders as iframe on public page
- [ ] **AC-5:** Free users see upgrade prompt when attempting
- [ ] **AC-6:** Video embeds can be reordered with links
- [ ] **AC-7:** Embed has responsive sizing

## Technical Requirements

### Schema Changes

```typescript
// Already defined in Story 9.7, but add videoUrl field
// in landingPageLinks table
videoUrl: text("video_url"), // For video embeds
```

### Files to Create

| File | Purpose |
|------|---------|
| `client/src/components/landing/VideoEmbedEditor.tsx` | Video URL input and preview |
| `client/src/lib/video-parser.ts` | Parse video URLs to embed format |

### Files to Modify

| File | Changes |
|------|---------|
| `shared/schema.ts` | Add videoUrl field to landingPageLinks |
| `client/src/pages/Dashboard.tsx` | Add video embed option (Pro gated) |
| `client/src/pages/ArtistPage.tsx` | Render video embeds |

### Video URL Parser

```typescript
// client/src/lib/video-parser.ts
export interface VideoEmbed {
  platform: 'youtube' | 'vimeo' | 'spotify';
  embedUrl: string;
  aspectRatio: string; // '16:9' or '1:1' for Spotify
}

export function parseVideoUrl(url: string): VideoEmbed | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return {
      platform: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
      aspectRatio: '16:9',
    };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return {
      platform: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      aspectRatio: '16:9',
    };
  }

  // Spotify Track
  const spotifyTrackMatch = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (spotifyTrackMatch) {
    return {
      platform: 'spotify',
      embedUrl: `https://open.spotify.com/embed/track/${spotifyTrackMatch[1]}`,
      aspectRatio: '1:1',
    };
  }

  // Spotify Album
  const spotifyAlbumMatch = url.match(/spotify\.com\/album\/([a-zA-Z0-9]+)/);
  if (spotifyAlbumMatch) {
    return {
      platform: 'spotify',
      embedUrl: `https://open.spotify.com/embed/album/${spotifyAlbumMatch[1]}`,
      aspectRatio: '1:1',
    };
  }

  return null;
}
```

### Embed Rendering

```tsx
// In ArtistPage.tsx
{item.type === 'video_embed' && item.videoUrl && (() => {
  const embed = parseVideoUrl(item.videoUrl);
  if (!embed) return null;

  return (
    <div
      key={item.id}
      className="video-embed-container"
      style={{
        aspectRatio: embed.aspectRatio === '16:9' ? '16 / 9' : '1 / 1',
        maxWidth: embed.platform === 'spotify' ? '300px' : '100%',
      }}
    >
      <iframe
        src={embed.embedUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
        title={item.title}
      />
    </div>
  );
})()}
```

### Subscription Check

```tsx
// In Dashboard, check subscription before showing video option
const { data: subscription } = useSubscription();
const isPro = subscription?.status === 'active';

// In link editor
{isPro ? (
  <Button onClick={() => setShowVideoModal(true)}>
    <Video className="h-4 w-4 mr-2" />
    Add Video
  </Button>
) : (
  <Button variant="outline" onClick={() => setShowUpgradeModal(true)}>
    <Video className="h-4 w-4 mr-2" />
    Add Video (Pro)
  </Button>
)}
```

## Definition of Done

- [ ] videoUrl field added to landingPageLinks schema
- [ ] VideoEmbedEditor component created
- [ ] Video URL parser handles YouTube, Vimeo, Spotify
- [ ] Pro subscription check gates feature
- [ ] Free users see upgrade prompt
- [ ] Embeds render responsively on ArtistPage
- [ ] Video items reorderable with other links
- [ ] Type check passes

---

## Tasks/Subtasks

- [ ] **Task 1: Update Schema**
  - [ ] Add videoUrl field to landingPageLinks
  - [ ] Run npm run db:push
  - [ ] Update insertLandingPageLinkSchema

- [ ] **Task 2: Create Video URL Parser**
  - [ ] Create `client/src/lib/video-parser.ts`
  - [ ] Implement YouTube URL parsing
  - [ ] Implement Vimeo URL parsing
  - [ ] Implement Spotify URL parsing (track/album)
  - [ ] Return embed URL and aspect ratio

- [ ] **Task 3: Create VideoEmbedEditor Component**
  - [ ] Create `client/src/components/landing/VideoEmbedEditor.tsx`
  - [ ] URL input field
  - [ ] Platform detection and validation
  - [ ] Preview of embed before saving
  - [ ] Error handling for invalid URLs

- [ ] **Task 4: Integrate in Dashboard**
  - [ ] Add subscription check
  - [ ] Show "Add Video" button for Pro users
  - [ ] Show upgrade prompt for free users
  - [ ] Handle video item creation
  - [ ] Display video items in link list

- [ ] **Task 5: Render in ArtistPage**
  - [ ] Check for type='video_embed'
  - [ ] Parse videoUrl to embed format
  - [ ] Render responsive iframe
  - [ ] Apply appropriate aspect ratio
  - [ ] Handle missing/invalid URLs gracefully

- [ ] **Task 6: Testing**
  - [ ] Test YouTube URL parsing (various formats)
  - [ ] Test Vimeo URL parsing
  - [ ] Test Spotify track and album URLs
  - [ ] Test subscription gating
  - [ ] Test embed rendering on public page
  - [ ] Test reordering with other links

---

## Dev Notes

### Supported URL Formats

**YouTube:**
- `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ`

**Vimeo:**
- `https://vimeo.com/123456789`

**Spotify:**
- `https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC`
- `https://open.spotify.com/album/4LH4d3cOWNNsVw41Gqt2kv`

### Security Considerations

- Only embed from trusted domains (YouTube, Vimeo, Spotify)
- Use allowlist pattern for URL validation
- Iframe sandbox attributes for security

### Responsive Embed CSS

```css
.video-embed-container {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
}

.video-embed-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

### References
- [Source: docs/sprint-artifacts/tech-spec-epic-9.md#Video-Embed-Flow]
- [Source: docs/epics/epic-5-subscription-system.md]

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
