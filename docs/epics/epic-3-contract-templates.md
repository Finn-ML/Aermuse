# Epic 3: Contract Templates System

## Epic Overview

| Field | Value |
|-------|-------|
| **Epic ID** | EPIC-003 |
| **Title** | Contract Templates System |
| **Priority** | P1 - High |
| **Estimated Effort** | 3-4 days |
| **Dependencies** | E-Signing System (Epic 4) |

## Description

Implement a contract template system with pre-built music industry agreements. Users can select templates, fill in customizable fields, toggle optional clauses, and send for signature.

## Business Value

- Reduces contract creation time from hours to minutes
- Provides legally-sound starting points for artists
- Increases platform stickiness and subscription value
- Differentiates from generic e-signing tools

## Acceptance Criteria

- [ ] 5 pre-built templates available
- [ ] Templates have fill-in-the-blank fields
- [ ] Optional clauses can be toggled
- [ ] Preview before sending for signature
- [ ] Admin can manage template catalogue

---

## User Stories

### Story 3.1: Template Data Model & Storage

**As a** developer
**I want** to define the template data structure
**So that** templates can be stored and managed

**Acceptance Criteria:**
- [ ] `contract_templates` table created
- [ ] Fields: id, name, description, category, content (JSONB), is_active, created_at
- [ ] Template content supports variables: `{{party_a_name}}`, `{{date}}`, etc.
- [ ] Optional clauses marked with flags
- [ ] Template versioning support

**Technical Notes:**
```sql
CREATE TABLE contract_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  content JSONB NOT NULL,
  fields JSONB NOT NULL,  -- field definitions
  clauses JSONB,          -- optional clause toggles
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Story Points:** 3

---

### Story 3.2: Artist Agreement Template

**As an** artist entering a collaboration
**I want** to use an Artist Agreement template
**So that** both parties are protected

**Acceptance Criteria:**
- [ ] Template covers collaboration terms
- [ ] Fields: Party names, project description, revenue split, duration, territory
- [ ] Optional clauses: Exclusivity, credit requirements, termination
- [ ] Preview renders with sample data
- [ ] Legally reviewed language (placeholder for legal review)

**Template Sections:**
1. Parties identification
2. Scope of collaboration
3. Compensation & revenue sharing
4. Intellectual property rights
5. Credit and attribution
6. Term and termination
7. Signatures

**Story Points:** 3

---

### Story 3.3: License Agreement Template

**As an** artist licensing my music
**I want** to use a License Agreement template
**So that** usage rights are clearly defined

**Acceptance Criteria:**
- [ ] Template covers music/content licensing
- [ ] Fields: Licensor, licensee, work description, fee, territory, duration
- [ ] License types: Exclusive, non-exclusive, sync, mechanical
- [ ] Usage restrictions section
- [ ] Royalty terms if applicable

**Story Points:** 2

---

### Story 3.4: Tour Agreement Template

**As an** artist going on tour
**I want** to use a Tour Agreement template
**So that** performance terms are documented

**Acceptance Criteria:**
- [ ] Template covers touring arrangements
- [ ] Fields: Artist, promoter/venue, dates, locations, fees, rider requirements
- [ ] Technical requirements section
- [ ] Cancellation terms
- [ ] Travel and accommodation provisions

**Story Points:** 2

---

### Story 3.5: Sample Agreement Template

**As an** artist using samples
**I want** to use a Sample Agreement template
**So that** sample clearance is documented

**Acceptance Criteria:**
- [ ] Template covers sample clearance
- [ ] Fields: Sample owner, sampling artist, original work, new work, fee
- [ ] Royalty arrangements
- [ ] Credit requirements
- [ ] Scope of use (masters, publishing)

**Story Points:** 2

---

### Story 3.6: Work-for-Hire Agreement Template

**As someone** commissioning creative work
**I want** to use a Work-for-Hire template
**So that** ownership is clearly assigned

**Acceptance Criteria:**
- [ ] Template covers commissioned work
- [ ] Fields: Client, contractor, project description, fee, deliverables, deadline
- [ ] IP assignment clause
- [ ] Revision terms
- [ ] Payment schedule options

**Story Points:** 2

---

### Story 3.7: Template Selection UI

**As a** user
**I want** to browse and select contract templates
**So that** I can create contracts quickly

**Acceptance Criteria:**
- [ ] Template gallery/list view
- [ ] Category filters (Artist, Licensing, Touring, etc.)
- [ ] Template cards show: name, description, category
- [ ] "Use Template" button starts creation flow
- [ ] Search functionality

**Story Points:** 3

---

### Story 3.8: Template Fill-in Form

**As a** user
**I want** to fill in template fields
**So that** the contract is personalized

**Acceptance Criteria:**
- [ ] Dynamic form generated from template fields
- [ ] Field types: text, date, number, select, textarea
- [ ] Required field validation
- [ ] Auto-save draft functionality
- [ ] Party information can be saved for reuse
- [ ] Toggle switches for optional clauses
- [ ] Live preview of filled contract

**Story Points:** 5

---

### Story 3.9: Contract Preview & Editing

**As a** user
**I want** to preview the completed contract
**So that** I can review before sending

**Acceptance Criteria:**
- [ ] Full contract preview with all fields filled
- [ ] Professional formatting/styling
- [ ] Edit button to return to form
- [ ] Download draft as PDF
- [ ] "Send for Signature" proceeds to e-signing flow

**Story Points:** 3

---

### Story 3.10: Admin Template Management

**As an** admin
**I want** to manage the template catalogue
**So that** templates can be added, edited, or retired

**Acceptance Criteria:**
- [ ] Admin can view all templates
- [ ] Create new template with visual editor
- [ ] Edit existing template (creates new version)
- [ ] Deactivate/reactivate templates
- [ ] Reorder templates in gallery
- [ ] Clone template for variations

**Story Points:** 5

---

## Total Story Points: 30

## Definition of Done

- [ ] All 5 templates created and reviewed
- [ ] Template system fully functional
- [ ] Admin can manage templates
- [ ] Preview renders correctly
- [ ] Integration with e-signing ready
- [ ] Mobile-responsive forms
