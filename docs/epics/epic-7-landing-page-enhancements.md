# Epic 7: Landing Page Enhancements

## Epic Overview

| Field | Value |
|-------|-------|
| **Epic ID** | EPIC-007 |
| **Title** | Landing Page Enhancements |
| **Priority** | P2 - Medium |
| **Estimated Effort** | 1-2 days |
| **Dependencies** | None |

## Description

Enhance the artist landing page feature to include a "Send Proposal" button for external parties to initiate contract discussions. This enables artists to receive business inquiries through their Aermuse page.

## Business Value

- Enables inbound contract requests
- Makes landing pages more functional
- Creates additional touchpoint for platform usage
- Foundation for Phase 1 Artist Launcher

## Acceptance Criteria

- [ ] "Send Proposal" button on artist pages
- [ ] Proposal form for external parties
- [ ] Artist receives notification of proposals
- [ ] Proposal management in dashboard

---

## User Stories

### Story 7.1: Proposal Data Model

**As a** developer
**I want** to store incoming proposals
**So that** artists can manage them

**Acceptance Criteria:**
- [ ] `proposals` table created
- [ ] Fields: id, landing_page_id, sender_name, sender_email, message, status, created_at
- [ ] Status values: new, viewed, responded, archived

**Technical Notes:**
```sql
CREATE TABLE proposals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id VARCHAR NOT NULL REFERENCES landing_pages(id),
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  company TEXT,
  proposal_type TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Story Points:** 1

---

### Story 7.2: Send Proposal Button

**As a** visitor on an artist's page
**I want** to see a "Send Proposal" button
**So that** I can initiate a business conversation

**Acceptance Criteria:**
- [ ] Button prominently displayed on published landing pages
- [ ] Matches brand styling
- [ ] Opens proposal form modal
- [ ] Visible on both mobile and desktop

**Story Points:** 1

---

### Story 7.3: Proposal Submission Form

**As a** visitor
**I want** to fill out a proposal form
**So that** the artist knows about my interest

**Acceptance Criteria:**
- [ ] Modal form with fields:
  - Name (required)
  - Email (required)
  - Company/Organization (optional)
  - Proposal type: Collaboration, Licensing, Booking, Other
  - Message (required, 1000 char limit)
- [ ] Form validation
- [ ] Submit button
- [ ] Success confirmation message
- [ ] No account required

**Story Points:** 3

---

### Story 7.4: Proposal Notification

**As an** artist
**I want** to be notified of new proposals
**So that** I don't miss opportunities

**Acceptance Criteria:**
- [ ] Email notification sent to artist
- [ ] Email includes sender name, email, proposal type, message preview
- [ ] "View Proposal" link in email
- [ ] In-app notification (badge/alert)

**Story Points:** 2

---

### Story 7.5: Proposal Management Dashboard

**As an** artist
**I want** to view and manage proposals
**So that** I can respond to inquiries

**Acceptance Criteria:**
- [ ] "Proposals" section in dashboard (or tab on landing page section)
- [ ] List of proposals with:
  - Sender name and email
  - Proposal type
  - Date received
  - Status badge
- [ ] View full proposal details
- [ ] Mark as viewed/responded/archived
- [ ] Reply via email link
- [ ] Delete proposal

**Story Points:** 3

---

### Story 7.6: Proposal-to-Contract Flow (Stretch)

**As an** artist
**I want** to convert a proposal into a contract
**So that** I can formalize the agreement

**Acceptance Criteria:**
- [ ] "Create Contract" button on proposal
- [ ] Pre-fills contract with sender info
- [ ] Links contract back to proposal
- [ ] Proposal status updated when contract sent

**Story Points:** 2

---

## Total Story Points: 12

## Definition of Done

- [ ] Send Proposal button visible
- [ ] Form submits correctly
- [ ] Artist receives notification
- [ ] Proposals manageable in dashboard
- [ ] Works on mobile
- [ ] Spam considerations addressed (rate limiting)
