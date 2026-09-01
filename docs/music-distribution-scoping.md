# Music Distribution Phase — Scoping Document (Too Lost Integration)

| Field | Value |
|-------|-------|
| **Status** | Draft for review |
| **Date** | 2026-09-01 |
| **Phase** | Music Distribution (Epics 14–15) |
| **Distributor** | [Too Lost](https://toolost.com) via their REST API ([developer portal](https://developer.toolost.com/docs)) |
| **Related docs** | [Epic 14](./epics/epic-14-music-distribution-releases.md), [Epic 15](./epics/epic-15-distribution-royalties.md), [Architecture](./architecture.md) |

---

## 1. Executive Summary

Aermuse already ships the **inward-facing half of distribution**: Beta+ subscribers can upload
delivery-quality audio, fill in distribution metadata, and auto-generate ISRCs. What does not exist
is the **outward-facing half** — actually delivering music to DSPs and reporting the money that
comes back.

This phase connects the existing staging area to **Too Lost**, a distributor with a public REST API
(catalog/release management, delivery to ~450 stores, royalties, splits, payouts, webhooks). The
work splits into:

- **Sprint 0 (spike):** validate the Too Lost API hands-on and settle the account/commercial model — *1 week, gates everything else*
- **Epic 14 — Releases & Delivery:** release entity (UPC, type, track ordering), Too Lost service client, submission flow, status lifecycle with webhooks — *~42 points, 8–10 days*
- **Epic 15 — Royalties & Earnings:** royalty ingestion, earnings dashboard, split reconciliation, payout path — *~24 points, 5–6 days*

Total estimate: **~66 story points, roughly 3–4 working weeks** after the spike, in line with
previous epic velocity (Epic 4: 35 pts / 5–6 days; Epic 12: 34 pts / 4–5 days).

> ⚠️ **Honesty note on sources:** Too Lost's full API reference at `developer.toolost.com` could not
> be fetched from the environment this document was written in (network egress policy). Everything
> in §3 marked *confirmed* comes from Too Lost's public marketing/help-center pages via search;
> endpoint-level details are **assumptions to verify in Sprint 0**. The epic estimates carry that
> uncertainty.

---

## 2. Current State (what already exists)

The distribution skeleton is live behind the `'distribution'` feature gate
(`shared/constants/tiers.ts` — granted to `beta`, `alpha`, `theta`):

| Piece | Where | Notes |
|-------|-------|-------|
| Staging table | `distribution_tracks` in `shared/schema.ts` (~L648) | Independent of the store-front `tracks` table; per-track metadata: ISRC, genre, release date, language, explicit flag, songwriters, producers, label, copyright, publishing |
| ISRC generation | `server/services/isrcGenerator.ts` + `isrc_sequences` table | Mints `GB-AER-YY-NNNNN` with a row-locked yearly counter. **`AER` is a placeholder, not a registered PPL registrant code** — see Decision D4 |
| API endpoints | `server/routes.ts:9875–10365` | 11 endpoints under `/api/distribution/*`: chunked upload (init/chunk/complete), list, metadata PATCH, ISRC generate/set/remove, cover upload/serve, delete |
| Readiness scoring | `calculateReadiness()` at `server/routes.ts:9882` | 7 required fields → `{percentage, missing, isReady}` |
| Status field | `distribution_tracks.distributionStatus` | **Binary today**: only `'incomplete'` \| `'ready'`. No submitted/live/rejected states |
| Client module | `client/src/components/distribution/` (6 components) | Dashboard, chunked upload form, metadata form (hardcoded genre/language lists), track list, ISRC input, readiness indicator |
| Dashboard entry | `client/src/pages/Dashboard.tsx` (`?tab=distribution`) | No first-class URL; not mentioned on the Pricing page |
| Audio pipeline | `server/services/audioProcessor.ts` | ffprobe metadata, 30s preview, MP3 transcode; originals stored in Replit Object Storage under `distribution/{userId}/{trackId}/` |

**What is missing** (the substance of this phase):

1. **No release/album entity** — distributors deliver *releases* (UPC, release type, ordered tracks), not loose tracks. `UPC` appears nowhere in the codebase.
2. **No submission lifecycle** — no `submitted`/`in_review`/`live`/`rejected`/`taken_down` states, no external distributor IDs, no rejection reasons.
3. **No Too Lost integration** — zero references in the repo; no service client, no webhooks, no env vars.
4. **No royalty model** — the existing `track_splits` system covers *direct fan sales* only; streaming royalty ingestion/reporting is greenfield.
5. **No DSP/territory selection, no artist identity linking** (Spotify for Artists / Apple Music for Artists claim flows).

---

## 3. Too Lost — What We Know

### Confirmed (public pages, verify details in Sprint 0)

- **REST API** with a developer portal at `developer.toolost.com`; developers create a free developer account, register applications, and use **OAuth 2.0** credentials. ([toolost.com/developers](https://toolost.com/developers))
- Advertised API capability areas: **catalog & release management, distribution to 450+ stores, royalties/splits/payouts, analytics & reporting, users/teams/permissions, webhooks & real-time events**.
- **Enterprise/B2B tier** ([toolost.com/suite/enterprise](https://toolost.com/suite/enterprise)): bulk delivery & ingestion, royalty processing, API access, custom data exports, custom DSP contract configuration, dedicated account reps, and a **white-label dashboard** program.
- **Retail pricing** (for reference on unit economics): Artist $2.99/mo or $19.99/yr; Label (unlimited artists) $5.99/mo or $35.99/yr; free "collaborator" accounts for split recipients; 100% royalty pass-through, paid monthly; payout methods include PayPal, Venmo, Tipalti, Stripe.
- **Release rules** (help center): Album = 7+ tracks or ≥30 min; EP = 4–6 tracks and ≤30 min; **UPC auto-assigned if you don't supply one**; ISRCs likewise assignable or auto-generated.
- **Splits**: Too Lost natively supports royalty splits that pay collaborators directly (collaborator accounts are free).
- Their **bulk ingestion tooling fetches assets (audio/artwork) from URLs you provide** rather than accepting direct file pushes — a strong hint the API works the same way (matters for §5.3).

### To verify in Sprint 0 (assumption register)

| # | Assumption | Why it matters |
|---|-----------|----------------|
| A1 | OAuth 2.0 `client_credentials` (or partner token) flow available for server-to-server use | Auth design of the service client |
| A2 | Release create/update/takedown endpoints accept per-track metadata incl. our own ISRCs | Whether we keep self-minted ISRCs |
| A3 | Assets delivered by URL fetch (vs multipart upload); required audio/artwork specs (e.g. WAV/FLAC source, 3000×3000 JPG artwork) | Asset delivery mechanism (§5.3) + validation rules |
| A4 | Webhook catalog covers release status transitions (received → in review → delivered/live, rejected, taken down) + signature scheme | Status lifecycle design; polling fallback scope |
| A5 | Genre/language taxonomies retrievable via API | Replaces hardcoded client lists |
| A6 | Royalty reports retrievable via API (period, per-track/DSP/territory lines) | Epic 15 ingestion design |
| A7 | Splits configurable via API; Too Lost pays collaborators directly | Recommended payout path (§4, D3) |
| A8 | Sandbox/test environment exists; rate limits documented | Dev/test strategy, scheduler tuning |
| A9 | API available on standard developer account vs enterprise agreement required for delivery at platform scale | Commercial path, timeline |

---

## 4. Key Decisions (need product/founder input)

**D1 — Account model. Recommended: single Aermuse label/enterprise account.**
Two options:
- **(A) Aermuse holds one Too Lost label/enterprise account** and delivers all artist releases under it. Artists never touch Too Lost; distribution stays a native Aermuse feature inside existing tiers. This matches Too Lost's white-label/enterprise program and our subscription bundling. *Recommended.*
- **(B) Per-artist Too Lost accounts** connected via OAuth (artist authorizes Aermuse as a client app). Cleaner rights separation, but artists would need Too Lost accounts/subscriptions, and the in-app experience fragments.
Action: open the enterprise conversation with Too Lost in Sprint 0; their answer to A9 may force the choice.

**D2 — Commercial packaging.** Distribution is already gated Beta+ in code, but the Pricing page
never mentions it. Decide: does distribution stay in Beta (£10/mo) or become an Alpha/Theta
differentiator (or metered, e.g. N releases/year on Beta)? Too Lost's label pricing (~$36/yr
unlimited) suggests per-artist marginal cost is low under model A, but confirm enterprise pricing.

**D3 — Royalty payout path. Recommended: Too Lost splits pay artists directly (pending A7).**
If Aermuse receives royalties and re-distributes them, we become a money handler (regulatory,
tax-withholding, FX burden). If Too Lost's split system can pay each artist (and their
collaborators) directly via their free collaborator accounts, Aermuse only *displays* earnings and
never touches the money. Fallback: royalties accrue to Aermuse's account and we pay out via the
existing **Stripe Connect** rails (`server/services/stripeConnect.ts`) — feasible but needs legal
review.

**D4 — ISRC strategy.** `GB-AER` is not a registered registrant code (live caveat in
`isrcGenerator.ts`). Options: (a) register with PPL UK and keep self-minting (continuity with codes
already handed to users — audit whether any are in the wild), or (b) let Too Lost auto-assign ISRCs
and demote our generator to a fallback. Decide in Sprint 0; the release payload supports both.

**D5 — Rights & terms.** Artists must grant Aermuse the right to deliver their masters to Too Lost
and on to DSPs (an updated ToS / distribution agreement, ideally e-signed via the existing DocuSeal
flow). Also define the takedown policy and infringement/DMCA handling. Legal work runs parallel to
Epic 14 and **blocks public launch, not development**.

---

## 5. Target Architecture

Follows the existing external-integration conventions documented in `docs/architecture.md` and
modeled by DocuSeal.

### 5.1 Service client

`server/services/tooLost.ts` + `tooLost.types.ts`, copying the `docuseal.ts` shape: class with
injected `{apiKey/clientId+secret, baseUrl, timeout 30s, maxRetries 3}`, typed
`TooLostServiceError` carrying `statusCode`+`details`, retry on 5xx only, unit tests mirroring
`server/services/__tests__/docuseal.test.ts`. OAuth token acquisition/refresh lives inside the
client. Env vars added to `.env.example`: `TOOLOST_CLIENT_ID`, `TOOLOST_CLIENT_SECRET`,
`TOOLOST_BASE_URL`, `TOOLOST_WEBHOOK_SECRET` (exact names may adjust to the real auth scheme).
Missing-key behavior: Postmark-style **null-client dev mode** (log + fake success) so the feature is
developable without credentials.

### 5.2 Routes

Extract distribution endpoints out of the 10k-line `server/routes.ts` into
`server/routes/distribution.ts` (pattern: `server/routes/mailing-list.ts`), then add release CRUD +
submission + webhook endpoints there. All artist-facing endpoints keep
`requireAuth, requireFeature('distribution')`.

### 5.3 Asset delivery to Too Lost

Replit Object Storage has **no presigned URLs**; today files are proxied through Express. Two paths:
- **URL fetch (expected, per A3):** add tokenized, expiring public asset URLs, e.g.
  `GET /api/distribution/assets/:assetToken` — random token column per file, no auth cookie
  required, single-purpose, revocable. Too Lost fetches the original WAV/JPG from us.
- **Direct upload (if the API accepts bytes):** stream from object storage through the service
  client.
Either way, **originals must be preserved at delivery quality** (current pipeline already keeps the
uploaded original; MP3 transcode is only for previews). If Too Lost requires formats we don't
accept yet (e.g. FLAC) extend `audioUpload` + magic-byte checks.

### 5.4 Status lifecycle

Extend `distributionStatus` (text column — no DB enum migration needed) to:

```
draft → ready → submitted → in_review → delivered/live
                    ↘ rejected (reason) → ready (after edits, resubmit)
live → takedown_requested → taken_down
```

State transitions happen in exactly three places: the submit endpoint, the webhook handler, and the
polling reconciler. New columns persist `tooLostReleaseId`, `submittedAt`, `liveAt`,
`rejectionReason`, `lastSyncedAt`.

### 5.5 Webhooks + polling fallback

- Webhook receiver `POST /api/webhooks/toolost` with signature verification, following the DocuSeal
  HMAC pattern (`verifyWebhookSignature`, `server/routes.ts:7670`) and raw-body capture already in
  `server/index.ts`. If Too Lost supports webhook auto-registration, reuse the register-on-boot
  logic (`server/routes.ts:7600–7660`).
- **Polling reconciler regardless of webhooks** (webhooks get missed; Replit autoscale can drop
  in-flight events): a `setInterval` scheduler hitting an internal endpoint guarded by
  `x-internal-api-key`, same as the splits-deadline job in `server/index.ts:162–198`. Poll
  non-terminal releases every ~15 min.

### 5.6 Data model changes (Drizzle, `shared/schema.ts`)

New `distribution_releases` table:

```
id, userId, title, releaseType ('single'|'ep'|'album'), upcCode,
labelName, primaryGenre, secondaryGenre, language, releaseDate,
originalReleaseDate, coverArtPath, territoryMode ('worldwide'|'custom'),
territories (jsonb), storeMode ('all'|'custom'), stores (jsonb),
distributionStatus, tooLostReleaseId, submittedAt, liveAt,
rejectionReason, lastSyncedAt, createdAt, updatedAt
```

`distribution_tracks` gains: `releaseId` (FK, nullable during migration), `trackNumber`,
`featuredArtists` (jsonb), `assetToken`, plus the per-track `tooLostTrackId`. Existing rows migrate
into auto-created single-track draft releases (Story 14.2). Release-level readiness aggregates the
existing per-track `calculateReadiness()` plus release fields (artwork, UPC-or-auto, type, date).

Epic 15 adds `royalty_reports` (statement periods) and `royalty_report_lines` (per
track/DSP/territory earnings), keyed to ISRC/UPC for reconciliation.

### 5.7 Known infrastructure risks inherited by this phase

| Risk | Impact | Position |
|------|--------|----------|
| Chunked-upload buffers live in an in-process `Map` (`server/routes.ts:9907`) | Breaks under Replit autoscale multi-instance/restart mid-upload | Pre-existing; worsens if Too Lost pushes larger masters. Track as tech-debt story; out of critical path |
| No job queue (bare `setInterval`) | Submission retries/polling are best-effort, die with the process | Acceptable at current scale; reconciler design (§5.5) is idempotent so restarts are safe |
| No CDN/presigned URLs | Asset fetches proxy through Express | Tokenized asset URLs (§5.3) are the bridge; S3 migration is a future consideration |

---

## 6. Phase Plan

### Sprint 0 — Spike & Commercial Setup (1 week, timeboxed — Story 14.1)

1. Create the Too Lost developer account; obtain credentials; open the enterprise/white-label conversation (D1/A9).
2. Work through the assumption register (§3): exercise auth, create/submit a test release end-to-end in sandbox (or a throwaway live account), export taxonomies, catalog webhook events, pull a royalty report sample.
3. Write up findings as an ADR in `docs/architecture.md` (account model, asset delivery, ISRC strategy) and adjust Epic 14/15 stories.

**Exit criteria:** a release delivered to sandbox/test via `curl`/script; D1–D4 decided or explicitly deferred with fallbacks; epics re-estimated.

### Epic 14 — Music Distribution: Releases & Too Lost Delivery (~42 pts)

Release data model & migration, Too Lost service client, route extraction, release builder UI,
delivery-spec validation, taxonomy sync, tokenized asset URLs, submission flow, webhook+polling
status lifecycle, rejection/resubmission & takedown, first-class `/dashboard` routing + pricing
copy. Full stories: [epic-14-music-distribution-releases.md](./epics/epic-14-music-distribution-releases.md).

### Epic 15 — Distribution Royalties & Earnings (~24 pts)

Royalty schema, scheduled ingestion, earnings dashboard (per release/track/DSP/territory), split
configuration pushed to Too Lost (D3), statements & CSV export, payout status surfacing. Full
stories: [epic-15-distribution-royalties.md](./epics/epic-15-distribution-royalties.md).

### Explicitly out of this phase (backlog)

- Spotify for Artists / Apple Music for Artists profile claiming & artist ID linking
- Pre-save/pre-release marketing campaigns; release links (post-live smart links can reuse landing pages)
- YouTube Content ID, publishing administration, neighboring rights
- Unifying `tracks` (store) and `distribution_tracks` (delivery) so one upload feeds both
- Migration off Replit Object Storage to S3; real job queue
- Bulk catalog import (Too Lost CSV ingestion) for labels migrating to Aermuse

---

## 7. Success Criteria

- [ ] An artist on Beta+ can build a release (single/EP/album), submit it, and see it go live on DSPs without leaving Aermuse
- [ ] Release status updates arrive automatically (webhook or ≤15 min poll lag)
- [ ] Rejections surface actionable reasons in-app; artist can fix and resubmit
- [ ] Earnings visible per release/track/store/territory once Too Lost publishes statements
- [ ] Zero royalty money handled by Aermuse directly (if D3 lands as recommended)
- [ ] Distribution marketed on the Pricing page; measurable adoption by existing Beta+ subscribers

## 8. Top Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| API access requires enterprise agreement (A9) — timeline slips on a sales cycle | High | Medium | Start the conversation in Sprint 0 week 1; retail Label account as interim fallback for dev |
| API surface differs materially from assumptions (A1–A8) | High | Medium | Sprint 0 gates the epics; stories touched by each assumption are tagged in Epic 14 |
| Royalty/payout compliance if D3 fallback (Aermuse handles money) is forced | High | Low–Med | Legal review before Epic 15 payout story; prefer Too Lost-direct payouts |
| Unregistered `AER` ISRC prefix already used on delivered releases | Medium | Low | Audit existing `distribution_tracks.isrcCode` rows in Sprint 0; D4 decides remint vs register |
| DSP review/takedown edge cases (store-specific rejections, partial delivery) | Medium | High | Model per-release status generically; keep `rejectionReason` free-text; don't over-model store-level state in v1 |
| Content moderation/fraud (uploads we deliver under Aermuse's account) | Medium | Medium | ToS + manual review queue for first N releases per artist (admin dashboard already exists) |
