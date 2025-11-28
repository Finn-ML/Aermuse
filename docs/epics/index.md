# MVP Epics & User Stories

## Overview

This document outlines the epics and user stories required to complete the Aermuse MVP based on the PRD requirements.

**Total Story Points:** 202
**Estimated Duration:** 4-6 weeks

---

## Epic Summary

| Epic | Title | Priority | Story Points | Effort |
|------|-------|----------|--------------|--------|
| [EPIC-001](./epic-1-authentication-security.md) | Authentication & Security | P0 | 17 | 2-3 days |
| [EPIC-002](./epic-2-ai-attorney.md) | AI Attorney - Real AI | P0 | 24 | 4-5 days |
| [EPIC-003](./epic-3-contract-templates.md) | Contract Templates | P1 | 30 | 3-4 days |
| [EPIC-004](./epic-4-esigning-system.md) | E-Signing System | P0 | 35 | 5-6 days |
| [EPIC-005](./epic-5-subscription-billing.md) | Subscription & Billing | P0 | 26 | 3-4 days |
| [EPIC-006](./epic-6-admin-dashboard.md) | Admin Dashboard | P1 | 37 | 3-4 days |
| [EPIC-007](./epic-7-landing-page-enhancements.md) | Landing Page Enhancements | P2 | 12 | 1-2 days |
| [EPIC-008](./epic-8-contract-storage-search.md) | Contract Storage & Search | P1 | 21 | 2 days |

---

## Priority Definitions

| Priority | Definition | MVP Impact |
|----------|------------|------------|
| **P0 - Critical** | Core MVP functionality, must have | Blocks launch |
| **P1 - High** | Important features, strongly needed | Degrades experience |
| **P2 - Medium** | Nice to have, enhances experience | Can launch without |

---

## Recommended Implementation Order

### Phase 1: Foundation (Week 1-2)
1. **EPIC-001: Authentication & Security** (P0)
   - Secure the platform before adding more features
   - bcrypt, password reset, email verification

2. **EPIC-005: Subscription & Billing** (P0)
   - Revenue enablement
   - Stripe integration, paywall

### Phase 2: Core Features (Week 2-4)
3. **EPIC-002: AI Attorney** (P0)
   - Core value proposition
   - File upload, OpenAI integration, analysis

4. **EPIC-004: E-Signing System** (P0)
   - Complete contract workflow
   - Multi-party signing, notifications

### Phase 3: Content & Enhancement (Week 4-5)
5. **EPIC-003: Contract Templates** (P1)
   - Pre-built agreement templates
   - Fill-in forms, template management

6. **EPIC-008: Contract Storage & Search** (P1)
   - Better organization
   - Search, filter, folders, PDF export

### Phase 4: Operations & Polish (Week 5-6)
7. **EPIC-006: Admin Dashboard** (P1)
   - Operational visibility
   - User management, metrics

8. **EPIC-007: Landing Page Enhancements** (P2)
   - Proposal receiving
   - Inbound lead generation

---

## Dependencies Graph

```
EPIC-001 (Auth)
    └── EPIC-006 (Admin) - requires admin role

EPIC-002 (AI Attorney)
    └── Requires file storage infrastructure

EPIC-003 (Templates)
    └── EPIC-004 (E-Signing) - templates feed into signing

EPIC-005 (Billing)
    └── Standalone, can start early

EPIC-007 (Landing Page)
    └── Email service (shared with EPIC-004)

EPIC-008 (Storage)
    └── File infrastructure from EPIC-002
```

---

## Story Points by Category

| Category | Stories | Points |
|----------|---------|--------|
| Authentication | 6 | 17 |
| AI/ML Integration | 7 | 24 |
| Templates | 10 | 30 |
| E-Signing | 10 | 35 |
| Billing | 10 | 26 |
| Admin | 9 | 37 |
| Landing Pages | 6 | 12 |
| Storage/Search | 6 | 21 |
| **Total** | **64** | **202** |

---

## External Dependencies

| Dependency | Required For | Setup Needed |
|------------|--------------|--------------|
| Stripe | EPIC-005 | Account, API keys, products |
| OpenAI | EPIC-002 | Account, API key, billing |
| SendGrid/Email | EPIC-001, 004, 007 | Account, API key, templates |
| AWS S3 / Cloudinary | EPIC-002, 008 | Account, bucket/folder |
| PDF Library | EPIC-004, 008 | npm package (pdfkit/puppeteer) |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenAI API costs | Medium | Token monitoring, rate limiting |
| E-signing legal compliance | High | Review e-signature laws by region |
| Stripe integration complexity | Medium | Use Stripe Checkout (simplest) |
| PDF generation quality | Low | Use proven library, test thoroughly |
| Scope creep | High | Strict adherence to MVP scope |

---

## Success Criteria (from PRD)

- [ ] 50+ active subscribers at £9/month
- [ ] 200+ contracts uploaded or created
- [ ] 100+ e-signatures completed
- [ ] NPS > 30
- [ ] Monthly churn < 10%

---

## Quick Links

- [Gap Analysis](../prd-gap-analysis.md)
- [Project Overview](../project-overview.md)
- [PRD Source](../Aermuse-MVP-PRD.docx)
