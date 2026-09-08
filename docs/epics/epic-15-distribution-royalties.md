# Epic 15: Distribution Royalties & Earnings

## Epic Overview

| Field | Value |
|-------|-------|
| **Epic ID** | EPIC-015 |
| **Title** | Distribution Royalties & Earnings |
| **Priority** | P1 - High (distribution phase, follows EPIC-014) |
| **Estimated Effort** | 14–18 hours, AI-assisted delivery |
| **Dependencies** | EPIC-014 (releases live via Too Lost), Decision D3 (payout path, see scoping doc §4) |
| **Scoping doc** | [music-distribution-scoping.md](../music-distribution-scoping.md) |

## Description

Close the money loop for distributed music: ingest Too Lost royalty statements, show artists what
they earned per release/track/store/territory, push collaborator splits to Too Lost so payees are
paid directly, and generate statements. Aermuse **displays** royalty data; per Decision D3 the
recommended model is that **Too Lost pays artists and collaborators directly** (via their free
collaborator accounts and native split system), keeping Aermuse out of money transmission. The
existing `track_splits` system (email-verified percentages for direct fan sales) provides the
split-definition UX to mirror — distribution splits are a **separate concern** wired to Too Lost,
not Stripe Connect.

Stories marked **⚠ A6/A7** depend on assumptions verified in the Story 14.1 spike.

## Business Value

- **"Where's my money?" answered in-app** — the single most common artist support question in distribution
- **Justifies subscription price**: earnings dashboards are the stickiest recurring-visit surface a distributor has
- **Collaborator goodwill**: producers/writers get paid their share automatically, extending Aermuse's existing splits story from sales to streaming
- **Zero money-handling liability** for Aermuse under the recommended model
- **Data asset**: earnings data powers future features (advances, analytics, catalog valuation)

## Acceptance Criteria

- [ ] Royalty statements ingested on a schedule, idempotently, keyed to ISRC/UPC
- [ ] Artist earnings dashboard: totals + breakdowns by release, track, store, territory, and period
- [ ] Collaborator splits definable per distribution track and pushed to Too Lost (or explicit fallback per D3)
- [ ] Downloadable statement (CSV) per period; email notification when a new statement lands
- [ ] Free/ungated users never see royalty endpoints (`requireFeature('distribution')`)

---

## User Stories

### Story 15.1: Royalty Data Model

**As a** developer
**I want** normalized royalty tables keyed to our catalog identifiers
**So that** statements from Too Lost reconcile to releases, tracks, and artists

**Acceptance Criteria:**
- [ ] `royalty_reports` table: `userId`, `tooLostReportId`, `periodStart/End`, `currency`, `totalAmountMicros`, `status (pending|ingested|reconciled|error)`, `rawPayloadPath`, timestamps
- [ ] `royalty_report_lines` table: `reportId`, `releaseId`/`trackId` (nullable FKs), `isrc`, `upc`, `store`, `territory`, `saleType (stream|download|other)`, `quantity`, `amountMicros`, `currency`
- [ ] Amounts stored as integer micros (streaming line items are fractions of pennies — cents lose precision)
- [ ] Unmatched lines (ISRC/UPC not in our catalog) retained with null FKs and surfaced in an admin reconciliation view
- [ ] `IStorage`/`DatabaseStorage` methods + indexes on (`userId`, `periodStart`), (`isrc`), (`reportId`)

**Technical Notes:**
- Raw statement payloads archived to object storage (`royalties/{userId}/{reportId}.json|csv`) for audit/re-ingestion

**Story Points:** 3
**Estimated Hours:** 1.5–2 h (AI-assisted)

---

### Story 15.2: Statement Ingestion Job ⚠ A6

**As a** developer
**I want** new Too Lost statements pulled and parsed automatically
**So that** earnings appear without manual imports

**Acceptance Criteria:**
- [ ] Service-client methods for listing/fetching royalty reports (shape per A6 findings: API endpoints, webhook `report.ready` event, or scheduled export)
- [ ] Scheduled ingestion via the `setInterval` + `x-internal-api-key` internal-endpoint pattern (daily; monthly statements make tighter polling pointless)
- [ ] Idempotent by `tooLostReportId`: re-runs update, never duplicate lines (delete-and-reinsert lines inside a transaction)
- [ ] Line items matched to catalog by ISRC first, UPC fallback; match rate logged
- [ ] Ingestion failures set `status: 'error'` with detail, visible in admin; retried next cycle
- [ ] Postmark email to artist when a new statement is ingested ("Your March earnings are in")

**Story Points:** 5
**Estimated Hours:** 3–4 h (AI-assisted)

---

### Story 15.3: Earnings Dashboard UI

**As an** artist
**I want** to see what my music earned, sliced the way I think about it
**So that** I understand my streaming income without spreadsheets

**Acceptance Criteria:**
- [ ] Earnings tab within distribution UI: headline cards (lifetime, last statement period, pending period note)
- [ ] Breakdown table + chart by: release, track, store (Spotify/Apple/…), territory, month — switchable dimension, sortable, paginated
- [ ] Period selector (statement months); currency displayed as reported (no FX conversion in v1)
- [ ] Empty/zero states for artists with no live releases or no statements yet (statement lag explained — royalties typically report 1–3 months behind)
- [ ] Aggregation server-side: `GET /api/distribution/royalties/summary?by=store&period=...` (SQL GROUP BY, not client-side folding of raw lines)

**Technical Notes:**
- Charting: follow existing analytics dashboard conventions (`client/src/components/` analytics patterns from EPIC-010)

**Story Points:** 5
**Estimated Hours:** 3.5–4 h (AI-assisted)

---

### Story 15.4: Distribution Splits Pushed to Too Lost ⚠ A7

**As an** artist
**I want** my collaborators' percentages applied to streaming royalties automatically
**So that** everyone gets their share without me forwarding money

**Acceptance Criteria:**
- [ ] Split editor per distribution track (reuse UX patterns from existing `track_splits` flow: collaborator name/email/role/percentage, must total 100%)
- [ ] New `distribution_splits` table (parallel to `track_splits`, FK to `distribution_tracks`; do **not** overload the sales-splits table)
- [ ] Splits pushed to Too Lost via API at/after submission; Too Lost invites collaborators to their free payee accounts (per A7)
- [ ] Split changes after go-live handled per A7 findings (re-push or documented limitation)
- [ ] Dashboard shows split status per collaborator (invited/accepted) as reported by Too Lost
- [ ] **Fallback if A7 fails** (splits not API-configurable): story descopes to display-only split math on the earnings dashboard + explicit "paid out via Too Lost account owner" messaging; payout implications escalate to Decision D3 fallback (Stripe Connect + legal review) as a separate follow-up epic

**Story Points:** 5
**Estimated Hours:** 3–4 h (AI-assisted)

---

### Story 15.5: Statements & Export

**As an** artist
**I want** downloadable royalty statements
**So that** I can do accounting, taxes, and label reporting

**Acceptance Criteria:**
- [ ] CSV export per statement period (all lines for the artist, catalog identifiers included) via streamed download endpoint
- [ ] "All time" CSV export with date-range filter
- [ ] Statement list view: period, total, ingested date, download action
- [ ] PDF statement — stretch only, reuse `pdfGenerator.ts` if trivial, else backlog

**Story Points:** 3
**Estimated Hours:** 1.5–2 h (AI-assisted)

---

### Story 15.6: Payout Visibility ⚠ A7

**As an** artist
**I want** to see when and how royalties get paid out
**So that** I trust the pipeline from stream to bank account

**Acceptance Criteria:**
- [ ] Payout status surfaced from Too Lost (method configured? balance? last payout date) to the extent the API exposes it per A7
- [ ] Clear onboarding prompt when the artist has earnings but no payout method configured on the Too Lost side, deep-linking to the configuration flow (in-app if API-supported, otherwise guided external link)
- [ ] Copy makes the money path explicit: "Paid directly by our distribution partner — Aermuse never holds your royalties"
- [ ] If the account model (Decision D1) means artists have no Too Lost identity: payout onboarding flow defined with founder before implementation (blocked-by-decision guard)

**Story Points:** 3
**Estimated Hours:** 1.5–2 h (AI-assisted)

---

## Total Story Points: 24

## Estimated Hours: 14–18

Hours assume AI-assisted delivery, as for Epic 14. Cross-cutting QA, documentation and vendor liaison for the phase are estimated separately in the scoping document.

## Definition of Done

- [ ] A real (or sandbox) statement ingested end-to-end and rendered on the dashboard
- [ ] Re-running ingestion of the same report produces identical totals (idempotency proven)
- [ ] Split push exercised with a two-collaborator test track
- [ ] Unit tests: line matching (ISRC/UPC/unmatched), micro-amount aggregation, CSV export
- [ ] Admin reconciliation view lists unmatched lines and errored reports
- [ ] `docs/data-models.md` + `docs/api-contracts.md` updated

---

## Technical Architecture Notes

```
Too Lost ──(webhook report.ready / daily poll)──► ingestion job
    │                                                  │
    ▼                                                  ▼
raw payload → object storage           royalty_reports + royalty_report_lines
                                                       │ (ISRC/UPC match)
                                                       ▼
                                    /api/distribution/royalties/* (GROUP BY summaries)
                                                       │
                                                       ▼
                                          Earnings dashboard + CSV export

Money flow (recommended, D3): DSPs → Too Lost → artist & collaborators directly.
Aermuse displays; never transmits funds.
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Royalty report format/API differs from assumption (A6) | High | Sample report pulled in Story 14.1 spike before this epic starts |
| Splits not configurable via API (A7) | High | Explicit descoped fallback in Story 15.4; D3 fallback path pre-agreed |
| Unmatched lines erode trust in totals | Medium | Retain + surface unmatched lines; admin reconciliation; match-rate metric |
| Currency/precision errors | Medium | Integer micros everywhere; report currency displayed verbatim; no FX in v1 |
| Statement lag disappoints artists | Low | Set expectations in UI copy (industry-standard 1–3 month lag) |
