# Epic 14: Music Distribution — Releases & Too Lost Delivery

## Epic Overview

| Field | Value |
|-------|-------|
| **Epic ID** | EPIC-014 |
| **Title** | Music Distribution — Releases & Too Lost Delivery |
| **Priority** | P0 - Critical (for distribution phase) |
| **Estimated Effort** | 33–46 hours (23–32 h build + 10–14 h Sprint 0 spike), AI-assisted delivery |
| **Dependencies** | EPIC-005 (Billing), EPIC-012 (Tiers), existing distribution module (`/api/distribution/*`) |
| **Scoping doc** | [music-distribution-scoping.md](../music-distribution-scoping.md) |

## Description

Turn the existing distribution staging area (track upload + metadata + ISRC, currently dead-ended
at `distributionStatus: 'ready'`) into an end-to-end delivery pipeline through the
**Too Lost REST API**: artists assemble releases (single/EP/album with UPC, artwork, ordered
tracks), submit them to 450+ stores, and track them through a real status lifecycle
(`draft → ready → submitted → in_review → live / rejected / taken_down`) driven by webhooks with a
polling fallback.

Stories marked **⚠ A#** depend on assumptions in the scoping doc's assumption register
(§3) and may be re-shaped by the Story 14.1 spike.

## Business Value

- **Completes the platform loop**: contracts → splits → landing page → store → *and now DSP distribution* — the biggest missing pillar of "artist management platform"
- **Monetizes an already-gated feature**: `'distribution'` entitlement exists for Beta+ but delivers nothing a free DAW export doesn't
- **Retention anchor**: distribution catalogs create switching costs; subscribers with live releases churn less
- **Pricing page ammunition**: distribution is a headline feature competitors charge $20+/yr standalone for
- **Foundation for royalties (Epic 15)** and future marketing tools (pre-saves, smart links)

## Acceptance Criteria

- [ ] Artist can create a release, attach/order distribution tracks, and see release-level readiness
- [ ] UPC supplied by artist or auto-assigned at submission; persisted either way
- [ ] Release submitted to Too Lost via API with all assets; `tooLostReleaseId` persisted
- [ ] Status transitions driven by webhooks, reconciled by polling (≤15 min lag), visible in UI
- [ ] Rejected releases show the reason and can be edited + resubmitted
- [ ] Live releases can request takedown
- [ ] All endpoints gated `requireAuth, requireFeature('distribution')`
- [ ] Distribution reachable at a first-class URL and marketed on the Pricing page

---

## User Stories

### Story 14.1: Too Lost API Spike & Account Setup (Sprint 0)

**As a** developer
**I want** validated, hands-on knowledge of the Too Lost API and a settled account model
**So that** the rest of the epic builds on facts instead of marketing pages

**Acceptance Criteria:**
- [ ] Developer account created; OAuth credentials obtained; enterprise/white-label conversation opened (Decisions D1/D2)
- [ ] Every assumption A1–A9 in the scoping doc confirmed, corrected, or marked blocked
- [ ] One test release delivered end-to-end via script (sandbox or throwaway account)
- [ ] Genre/language taxonomies exported; webhook event catalog + signature scheme documented
- [ ] ADR added to `docs/architecture.md` covering account model, asset delivery, ISRC strategy (D4)
- [ ] Epic 14/15 stories re-estimated; audit of existing `isrcCode` values for the unregistered `GB-AER` prefix

**Technical Notes:**
- Timebox: 1 week. Deliverable is knowledge + ADR, not production code; throwaway scripts live in `scripts/`
- API docs: `developer.toolost.com/docs`

**Story Points:** 5
**Estimated Hours:** 10–14 h (AI-assisted)

---

### Story 14.2: Release Data Model & Track Migration

**As a** developer
**I want** a `distribution_releases` entity owning ordered tracks
**So that** we can deliver singles, EPs, and albums the way distributors and DSPs expect

**Acceptance Criteria:**
- [ ] `distribution_releases` table added to `shared/schema.ts` (fields per scoping doc §5.6: type, UPC, label, genres, language, dates, artwork, territory/store modes, status, `tooLostReleaseId`, timestamps)
- [ ] `distribution_tracks` gains `releaseId` FK, `trackNumber`, `featuredArtists`, `tooLostTrackId`
- [ ] Release-type validation: single 1–3 tracks, EP 4–6 and ≤30 min, album 7+ or ≥30 min (Too Lost rules)
- [ ] Existing `distribution_tracks` rows migrated into auto-created single-track draft releases (script in `scripts/`, with rollback, following `migrate-tiers.ts` conventions)
- [ ] Release-level readiness aggregates track readiness (`calculateReadiness()`) + release fields
- [ ] `IStorage` interface + `DatabaseStorage` methods for release CRUD (`server/storage.ts`)

**Technical Notes:**
- `distributionStatus` stays a text column; new value set: `draft | ready | submitted | in_review | live | rejected | takedown_requested | taken_down`
- Schema deployed via `npm run db:push` per house convention (migrations dir is stale)

**Story Points:** 5
**Estimated Hours:** 2–3 h (AI-assisted)

---

### Story 14.3: Too Lost Service Client ⚠ A1

**As a** developer
**I want** a typed, tested Too Lost API client
**So that** all outbound calls share auth, retries, and error semantics

**Acceptance Criteria:**
- [ ] `server/services/tooLost.ts` + `tooLost.types.ts` modeled on `docuseal.ts`: injected config, 30s timeout via `AbortController`, retry on 5xx only, `TooLostServiceError` with `statusCode`+`details`
- [ ] OAuth token acquisition + refresh handled inside the client (per A1 findings)
- [ ] Methods for: create/update release, upload-or-reference assets, submit, get status, takedown, list taxonomies, webhook registration (if supported)
- [ ] Null-client dev mode when credentials absent (Postmark pattern): logs + simulated success
- [ ] Unit tests in `server/services/__tests__/tooLost.test.ts` mirroring `docuseal.test.ts` coverage (auth, retry, timeout, error mapping)
- [ ] `.env.example` updated: `TOOLOST_CLIENT_ID`, `TOOLOST_CLIENT_SECRET`, `TOOLOST_BASE_URL`, `TOOLOST_WEBHOOK_SECRET`

**Story Points:** 5
**Estimated Hours:** 3–4 h (AI-assisted)

---

### Story 14.4: Route Extraction & Release Endpoints

**As a** developer
**I want** distribution routes in their own module with release CRUD added
**So that** the feature stops growing inside the 10k-line `routes.ts`

**Acceptance Criteria:**
- [ ] Existing 11 `/api/distribution/*` endpoints moved verbatim to `server/routes/distribution.ts` (pattern: `server/routes/mailing-list.ts`); no behavior change; chunked-upload `Map` and GC move along
- [ ] New endpoints: `POST/GET/PATCH/DELETE /api/distribution/releases`, `POST /releases/:id/tracks` (attach), `PATCH /releases/:id/tracks/order`, `POST /releases/:id/artwork`
- [ ] All gated `requireAuth, requireFeature('distribution')`; ownership checks on every `:id`
- [ ] Release artwork upload reuses `coverArtUpload` multer config + magic-byte verification
- [ ] `docs/api-contracts.md` updated for the distribution section (currently pre-dates the module)

**Story Points:** 3
**Estimated Hours:** 1.5–2 h (AI-assisted)

---

### Story 14.5: Release Builder UI

**As an** artist
**I want** to assemble a release from my uploaded tracks and fill in release-level details
**So that** I can prepare a single, EP, or album for stores

**Acceptance Criteria:**
- [ ] Release list view (replaces bare track list as the top level of `DistributionDashboard.tsx`); tracks remain manageable within a release
- [ ] Create-release flow: type, title, artist name, label, genres, language, release date (min lead time per Too Lost rules), artwork upload with preview
- [ ] Attach existing distribution tracks; drag-to-reorder sets `trackNumber`
- [ ] UPC field: optional, validated (12–13 digits, checksum) with "leave blank to auto-assign" hint
- [ ] Release-level readiness indicator reusing `ReadinessIndicator.tsx`, listing missing items across release + tracks
- [ ] Type-vs-tracklist rule violations explained inline (e.g. "EPs are 4–6 tracks")

**Technical Notes:**
- Extend `client/src/components/distribution/`; TanStack Query keys `['distribution','releases',...]`
- Keep the existing per-track metadata form; it nests under a release

**Story Points:** 5
**Estimated Hours:** 3–4 h (AI-assisted)

---

### Story 14.6: Delivery-Spec Asset Validation ⚠ A3

**As an** artist
**I want** my audio and artwork checked against store requirements before submission
**So that** releases aren't rejected days later for fixable technical issues

**Acceptance Criteria:**
- [ ] Artwork validated server-side on upload: exact square, min resolution (expected 3000×3000), JPG/PNG per A3 findings, no obvious blur/upscaling check beyond dimensions in v1
- [ ] Audio validated via existing `audioProcessor.ts` ffprobe pass: sample rate/bit depth/codec per Too Lost spec (expected 16/24-bit WAV ≥44.1kHz; MP3 acceptance per A3)
- [ ] Validation results stored per asset and folded into release readiness; failures block submission with actionable messages
- [ ] Upload configs (`audioUpload`, `coverArtUpload`) extended if the spec demands formats we don't accept yet (e.g. FLAC, PNG artwork)

**Story Points:** 3
**Estimated Hours:** 2–3 h (AI-assisted)

---

### Story 14.7: Genre & Language Taxonomy Sync ⚠ A5

**As a** developer
**I want** Too Lost's controlled vocabularies served from our API
**So that** metadata always matches what the distributor accepts

**Acceptance Criteria:**
- [ ] `GET /api/distribution/taxonomies` returns genres (primary/secondary) + languages, cached server-side (24h TTL, stale-while-revalidate; static JSON fallback committed from the Sprint 0 export)
- [ ] `DistributionMetadataForm.tsx` hardcoded `GENRES`/`LANGUAGES` lists replaced by the endpoint
- [ ] Existing rows with now-invalid genre values flagged in readiness (not silently migrated)

**Story Points:** 2
**Estimated Hours:** 1–1.5 h (AI-assisted)

---

### Story 14.8: Tokenized Asset Delivery URLs ⚠ A3

**As a** developer
**I want** expiring, tokenized public URLs for release assets
**So that** Too Lost can fetch originals without Aermuse auth cookies (Replit Object Storage has no presigned URLs)

**Acceptance Criteria:**
- [ ] `assetToken` (random, per-file) issued for original audio + artwork at submission time
- [ ] `GET /api/distribution/assets/:token` streams the original from object storage; no session required; correct `Content-Type`/`Content-Length`
- [ ] Tokens expire (config, default 7 days) and are revocable; invalid/expired → 404
- [ ] Rate-limited via existing `rateLimit.ts` middleware; tokens logged on access for audit
- [ ] If A3 lands as direct upload instead: this story swaps to streaming uploads inside the service client (same points)

**Story Points:** 3
**Estimated Hours:** 1.5–2 h (AI-assisted)

---

### Story 14.9: Release Submission Flow ⚠ A2

**As an** artist
**I want** to submit my ready release to stores with one action
**So that** my music gets delivered without leaving Aermuse

**Acceptance Criteria:**
- [ ] `POST /api/distribution/releases/:id/submit` — only from `ready`; re-runs full validation server-side
- [ ] Payload maps our schema → Too Lost release format (tracks ordered, ISRCs included, UPC included-or-omitted for auto-assign, asset URLs attached)
- [ ] Idempotent: double-submit returns current state, never creates duplicate deliveries (idempotency key = release id)
- [ ] Success persists `tooLostReleaseId`, auto-assigned UPC/ISRCs written back, status → `submitted`, `submittedAt` set
- [ ] Distributor-side validation errors surface as field-level messages, status stays `ready`
- [ ] Confirmation email via Postmark (`server/services/postmark.ts` sender added)
- [ ] Submission UI: pre-flight checklist, confirm dialog, pending state

**Story Points:** 5
**Estimated Hours:** 3–4 h (AI-assisted)

---

### Story 14.10: Status Lifecycle — Webhooks & Polling Reconciler ⚠ A4

**As an** artist
**I want** my release status to update automatically through review and delivery
**So that** I know when my music is live without asking support

**Acceptance Criteria:**
- [ ] `POST /api/webhooks/toolost` verifies signatures (DocuSeal HMAC pattern, raw-body capture already in `server/index.ts`); unverified → 401, processed events idempotent
- [ ] Webhook events mapped to status transitions (`in_review`, `live` + `liveAt`, `rejected` + reason, `taken_down`); unknown events logged, 200-acked
- [ ] Polling reconciler: `setInterval` + internal endpoint guarded by `x-internal-api-key` (splits-deadline pattern, `server/index.ts:162–198`) sweeps non-terminal releases every 15 min via `getStatus`; `lastSyncedAt` updated
- [ ] Webhook auto-registration on boot if supported (reuse `routes.ts:7600–7660` approach)
- [ ] UI: status chips + timeline on the release view; "live" celebration state with store links when available
- [ ] Postmark notifications on `live` and `rejected`

**Story Points:** 5
**Estimated Hours:** 3–4 h (AI-assisted)

---

### Story 14.11: Rejection Handling, Resubmission & Takedown

**As an** artist
**I want** to fix rejected releases and take down live ones
**So that** I stay in control of my catalog

**Acceptance Criteria:**
- [ ] `rejected` releases show the stored reason, unlock editing, and return to `ready` on save for resubmission (same `tooLostReleaseId` updated, per A2 update semantics)
- [ ] `POST /api/distribution/releases/:id/takedown` — only from `live`; confirm dialog explains store propagation delays; status `takedown_requested` → `taken_down` via lifecycle events
- [ ] Taken-down releases retain metadata/assets (read-only) and are excluded from active-catalog views
- [ ] Admin visibility: distribution releases + statuses listed in the admin dashboard (read-only table, reuse admin patterns)

**Story Points:** 3
**Estimated Hours:** 2–3 h (AI-assisted)

---

### Story 14.12: First-Class Routing & Pricing Copy

**As an** artist (and prospective subscriber)
**I want** distribution to have its own place in the app and on the pricing page
**So that** the feature is discoverable and sells subscriptions

**Acceptance Criteria:**
- [ ] Deep-linkable route for distribution (today only `Dashboard.tsx` `?tab=distribution`): `/dashboard/distribution[/releases/:id]` wired through Wouter, tab state preserved
- [ ] Pricing page (`client/src/pages/Pricing.tsx`) lists distribution in the correct tier column(s) per Decision D2 — copy TBD with founder
- [ ] `PremiumFeatureGate`/upgrade CTA copy for free users mentions distribution
- [ ] Landing-page marketing section (public site) gets a distribution bullet — stretch, behind copy approval

**Story Points:** 2
**Estimated Hours:** 1–1.5 h (AI-assisted)

---

## Total Story Points: 41 (+5 spike = 46)

## Estimated Hours: 33–46 (23–32 build + 10–14 spike)

Hours assume AI-assisted delivery (code generated with Claude Code); they count human time to direct, review, test and integrate each story. Story points remain the relative-size measure for sprint tracking.

## Definition of Done

- [ ] Test release delivered to stores end-to-end from a staging account and visible as `live`
- [ ] Webhook + reconciler proven by unplugging one of them in staging
- [ ] Rejection → edit → resubmit loop exercised with a deliberately bad release
- [ ] Unit tests: service client, payload mapper, status transitions, UPC/release-type validation
- [ ] `docs/api-contracts.md` + `docs/data-models.md` updated; `.env.example` complete
- [ ] Tier gating verified for free users (403 `FEATURE_UNAVAILABLE`)
- [ ] No royalty money or payout logic in this epic (Epic 15)

---

## Technical Architecture Notes

```
client/src/components/distribution/
├── DistributionDashboard.tsx      (release list top level)
├── ReleaseBuilder.tsx             (new: create/edit + tracklist ordering)
├── ReleaseStatusTimeline.tsx      (new: lifecycle display)
├── DistributionUploadForm.tsx     (existing chunked upload, nested per release)
├── DistributionMetadataForm.tsx   (existing, taxonomy-driven after 14.7)
└── ReadinessIndicator.tsx         (existing, release-level aggregation)

server/
├── routes/distribution.ts         (14.4: moved + new endpoints, webhook)
├── services/tooLost.ts            (14.3: API client)
├── services/tooLost.types.ts
└── services/__tests__/tooLost.test.ts

Status flow:
draft → ready → submitted → in_review → live
                   ↘ rejected → (edit) → ready
live → takedown_requested → taken_down
```

Key existing anchors: `calculateReadiness()` (`server/routes.ts:9882`), chunked upload trio
(`init-upload`/`chunk`/`complete-upload`), `fileStorage.ts` `distribution/{userId}/{trackId}/`
paths, `requireFeature('distribution')` (`server/middleware/tier.ts`).

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| A1–A5 assumptions wrong (auth, payloads, assets, webhooks, taxonomies) | High | Story 14.1 spike gates the epic; ⚠-tagged stories re-estimated after |
| Enterprise agreement needed before production delivery (A9) | High | Dev against retail Label account; commercial track runs parallel from week 1 |
| In-memory chunk upload `Map` under autoscale | Medium | Pre-existing; unchanged scope here — tracked as tech debt in scoping doc §5.7 |
| Asset URL abuse (public tokenized endpoints) | Medium | Expiring random tokens, rate limiting, access logging, revocation |
| Store-specific partial rejections don't fit one status | Medium | Free-text `rejectionReason` + generic statuses in v1; per-store state deferred |
| Unregistered `GB-AER` ISRCs already minted | Medium | Sprint 0 audit + D4 decision (register with PPL vs Too Lost-assigned) |
