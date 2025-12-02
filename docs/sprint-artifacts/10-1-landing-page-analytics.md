# Story 10.1: Landing Page Analytics Tracking

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 10.1 |
| **Epic** | Epic 10: Analytics & Insights |
| **Title** | Landing Page Analytics Tracking |
| **Priority** | P0 - Critical |
| **Story Points** | 5 |
| **Status** | Ready for Dev |

## User Story

**As an** artist
**I want** to see real analytics for my landing page
**So that** I can understand how visitors engage with my page and optimize it accordingly

## Context

The Dashboard currently displays hardcoded stats (Total Views: 14,247, Unique Visitors: 8,392, etc.). This story implements backend tracking infrastructure and replaces hardcoded values with real analytics data.

**Dependencies:**
- Landing pages exist (Epic 7)
- Landing page links exist (Epic 9)

## Acceptance Criteria

- [x] **AC-1:** New analytics tables created (page_views, link_clicks)
- [ ] **AC-2:** Track page view on every ArtistPage load (with session/visitor identification)
- [ ] **AC-3:** Track link clicks when visitors click links on landing pages
- [ ] **AC-4:** Calculate unique visitors using session fingerprinting (IP + User-Agent hash)
- [ ] **AC-5:** Calculate average time on page using session start/end timestamps
- [ ] **AC-6:** Calculate click rate as (total clicks / total views) * 100
- [ ] **AC-7:** API endpoint returns aggregated stats for Dashboard display
- [ ] **AC-8:** Dashboard stats card displays real data instead of hardcoded values

## Technical Requirements

### Files to Create

| File | Purpose |
|------|---------|
| `shared/schema.ts` (modify) | Add pageViews and linkClicks tables |
| `server/routes/analytics.ts` | Analytics API endpoints (track + retrieve) |
| `client/src/lib/analytics.ts` | Client-side tracking helper |

### Files to Modify

| File | Changes |
|------|---------|
| `server/routes.ts` | Register analytics routes |
| `client/src/pages/ArtistPage.tsx` | Track page view on mount |
| `client/src/pages/Dashboard.tsx` | Fetch and display real stats |

### Database Schema

```typescript
// Page views table
export const pageViews = pgTable("page_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landingPageId: varchar("landing_page_id").notNull().references(() => landingPages.id, { onDelete: 'cascade' }),
  visitorHash: varchar("visitor_hash", { length: 64 }).notNull(), // SHA-256 of IP + UA
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"), // Updated on page unload/visibility change
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Link clicks table
export const linkClicks = pgTable("link_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  linkId: varchar("link_id").notNull().references(() => landingPageLinks.id, { onDelete: 'cascade' }),
  landingPageId: varchar("landing_page_id").notNull().references(() => landingPages.id, { onDelete: 'cascade' }),
  pageViewId: varchar("page_view_id").references(() => pageViews.id, { onDelete: 'set null' }),
  visitorHash: varchar("visitor_hash", { length: 64 }).notNull(),
  clickedAt: timestamp("clicked_at").defaultNow().notNull(),
});
```

### API Endpoints

```typescript
// POST /api/analytics/pageview - Track page view (public, no auth)
// Request: { landingPageId, sessionId, referrer? }
// Response: { pageViewId }

// POST /api/analytics/pageview/:id/end - Update session end time (public)
// Request: { endedAt }

// POST /api/analytics/click - Track link click (public, no auth)
// Request: { linkId, landingPageId, pageViewId?, sessionId }

// GET /api/analytics/landing-page/:id - Get aggregated stats (auth required, owner only)
// Response: { totalViews, uniqueVisitors, avgTimeOnPage, clickRate, linkStats[] }
```

### Visitor Identification

```typescript
// Generate visitor hash (privacy-conscious, no PII stored)
function generateVisitorHash(ip: string, userAgent: string): string {
  const data = `${ip}:${userAgent}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Generate session ID (stored in sessionStorage on client)
function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem('aermuse_session');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('aermuse_session', sessionId);
  }
  return sessionId;
}
```

### Client-Side Tracking

```typescript
// client/src/lib/analytics.ts
export async function trackPageView(landingPageId: string): Promise<string | null> {
  const sessionId = getOrCreateSessionId();
  try {
    const res = await fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        landingPageId,
        sessionId,
        referrer: document.referrer || null,
      }),
    });
    const data = await res.json();
    return data.pageViewId;
  } catch {
    return null;
  }
}

export async function trackPageEnd(pageViewId: string): Promise<void> {
  if (!pageViewId) return;
  navigator.sendBeacon(`/api/analytics/pageview/${pageViewId}/end`, JSON.stringify({
    endedAt: new Date().toISOString(),
  }));
}

export async function trackLinkClick(linkId: string, landingPageId: string, pageViewId?: string): Promise<void> {
  const sessionId = getOrCreateSessionId();
  fetch('/api/analytics/click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ linkId, landingPageId, pageViewId, sessionId }),
  }).catch(() => {}); // Fire and forget
}
```

### Dashboard Integration

```typescript
// Replace hardcoded stats with API call
const { data: analyticsData } = useQuery({
  queryKey: ['/api/analytics/landing-page', landingPageData?.id],
  queryFn: async () => {
    const res = await apiRequest('GET', `/api/analytics/landing-page/${landingPageData?.id}`);
    return res.json();
  },
  enabled: !!landingPageData?.id,
});

const landingPageStats = [
  { label: 'Total Views', value: analyticsData?.totalViews?.toLocaleString() || '0' },
  { label: 'Unique Visitors', value: analyticsData?.uniqueVisitors?.toLocaleString() || '0' },
  { label: 'Avg. Time on Page', value: formatDuration(analyticsData?.avgTimeOnPage) || '0s' },
  { label: 'Click Rate', value: `${analyticsData?.clickRate?.toFixed(1) || '0'}%` },
];
```

## Definition of Done

- [ ] Database tables created and migrated
- [ ] Page view tracking on ArtistPage load
- [ ] Session end tracking on page unload
- [ ] Link click tracking implemented
- [ ] Analytics API endpoint returns aggregated stats
- [ ] Dashboard displays real stats
- [ ] Privacy-conscious (no PII, hashed identifiers)
- [ ] Type check passes
- [ ] Basic tests for analytics calculations

---

## Tasks/Subtasks

- [ ] **Task 1: Database Schema**
  - [ ] Add pageViews table to schema.ts
  - [ ] Add linkClicks table to schema.ts
  - [ ] Run database migration (npm run db:push)

- [ ] **Task 2: Backend Analytics Routes**
  - [ ] Create server/routes/analytics.ts
  - [ ] Implement POST /api/analytics/pageview
  - [ ] Implement POST /api/analytics/pageview/:id/end
  - [ ] Implement POST /api/analytics/click
  - [ ] Implement GET /api/analytics/landing-page/:id (aggregated stats)
  - [ ] Register routes in server/routes.ts

- [ ] **Task 3: Client-Side Tracking Library**
  - [ ] Create client/src/lib/analytics.ts
  - [ ] Implement trackPageView function
  - [ ] Implement trackPageEnd function (using sendBeacon)
  - [ ] Implement trackLinkClick function
  - [ ] Implement getOrCreateSessionId helper

- [ ] **Task 4: Integrate Tracking in ArtistPage**
  - [ ] Call trackPageView on page mount
  - [ ] Call trackPageEnd on page unload/visibility hidden
  - [ ] Add onClick handlers to links for trackLinkClick

- [ ] **Task 5: Update Dashboard Stats Display**
  - [ ] Add useQuery for analytics data
  - [ ] Replace hardcoded landingPageStats with real data
  - [ ] Add loading state for stats
  - [ ] Format duration and numbers appropriately

- [ ] **Task 6: Testing**
  - [ ] Test page view tracking
  - [ ] Test link click tracking
  - [ ] Test aggregation calculations
  - [ ] Verify stats display correctly in Dashboard

---

## Dev Notes

### Aggregation Query Example

```sql
-- Get stats for a landing page
SELECT
  COUNT(*) as total_views,
  COUNT(DISTINCT visitor_hash) as unique_visitors,
  AVG(EXTRACT(EPOCH FROM (ended_at - started_at))) as avg_time_seconds
FROM page_views
WHERE landing_page_id = $1
  AND started_at > NOW() - INTERVAL '30 days';

-- Click rate calculation
SELECT
  (SELECT COUNT(*) FROM link_clicks WHERE landing_page_id = $1) * 100.0 /
  NULLIF((SELECT COUNT(*) FROM page_views WHERE landing_page_id = $1), 0) as click_rate;
```

### Privacy Considerations

- No IP addresses stored directly (only hashed)
- No cookies required (sessionStorage only)
- User-Agent used only for fingerprinting, not stored raw
- Data can be purged after retention period (e.g., 90 days)

### Performance Considerations

- Use indexes on landing_page_id, visitor_hash, started_at
- Consider materialized views for frequently accessed aggregations
- sendBeacon for page end tracking (non-blocking)

---

## Dev Agent Record

### Context Reference
- `docs/sprint-artifacts/10-1-landing-page-analytics.context.xml`

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-02 | Story drafted | SM Agent (Bob) |
