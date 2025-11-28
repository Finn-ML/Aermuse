# Epic 8: Contract Storage & Search Enhancements

## Epic Overview

| Field | Value |
|-------|-------|
| **Epic ID** | EPIC-008 |
| **Title** | Contract Storage & Search |
| **Priority** | P1 - High |
| **Estimated Effort** | 2 days |
| **Dependencies** | Epic 2 (File Upload) |

## Description

Enhance contract storage with advanced search, filtering, folder organization, PDF export, and version history tracking.

## Business Value

- Better contract organization
- Quick retrieval of important documents
- Professional export capabilities
- Audit trail for contract changes

## Acceptance Criteria

- [ ] Search contracts by multiple fields
- [ ] Filter by type, status, date
- [ ] Folder organization
- [ ] Download contracts as PDF
- [ ] Version history for edits

---

## User Stories

### Story 8.1: Contract Search

**As a** user
**I want** to search my contracts
**So that** I can find specific agreements quickly

**Acceptance Criteria:**
- [ ] Search input on contracts page
- [ ] Search by: title, party name, content (if indexed)
- [ ] Real-time search results
- [ ] Highlight matching terms
- [ ] No results state with suggestions

**Story Points:** 3

---

### Story 8.2: Advanced Filtering

**As a** user
**I want** to filter my contracts
**So that** I can narrow down results

**Acceptance Criteria:**
- [ ] Filter by status: All, Pending, Active, Completed, Expired
- [ ] Filter by type: Record Deal, License, Distribution, etc.
- [ ] Filter by date range
- [ ] Multiple filters combinable
- [ ] Clear filters button
- [ ] Filter persistence during session

**Story Points:** 3

---

### Story 8.3: Folder Organization

**As a** user
**I want** to organize contracts into folders
**So that** I can keep them categorized

**Acceptance Criteria:**
- [ ] Create custom folders
- [ ] Rename folders
- [ ] Delete empty folders
- [ ] Move contracts between folders
- [ ] Folder list in sidebar
- [ ] "Unfiled" contracts section
- [ ] Folder color labels (stretch)

**Technical Notes:**
```sql
CREATE TABLE contract_folders (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE contracts ADD COLUMN folder_id VARCHAR REFERENCES contract_folders(id);
```

**Story Points:** 4

---

### Story 8.4: PDF Export

**As a** user
**I want** to download contracts as PDF
**So that** I have offline copies

**Acceptance Criteria:**
- [ ] "Download PDF" button on contract view
- [ ] PDF includes:
  - Contract title and metadata
  - Full contract content
  - Signatures (if signed)
  - Timestamp and version info
- [ ] Professional formatting
- [ ] Aermuse branding in footer
- [ ] Bulk export (stretch)

**Story Points:** 4

---

### Story 8.5: Version History

**As a** user
**I want** to see version history of contracts
**So that** I can track changes over time

**Acceptance Criteria:**
- [ ] Version number increments on edit
- [ ] Version history list on contract
- [ ] View previous versions (read-only)
- [ ] Compare versions (stretch)
- [ ] Restore previous version (stretch)
- [ ] Change summary per version

**Technical Notes:**
```sql
CREATE TABLE contract_versions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id VARCHAR NOT NULL REFERENCES contracts(id),
  version INTEGER NOT NULL,
  content JSONB,
  changed_by VARCHAR REFERENCES users(id),
  change_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Story Points:** 5

---

### Story 8.6: Contract Sorting

**As a** user
**I want** to sort my contracts
**So that** I can view them in preferred order

**Acceptance Criteria:**
- [ ] Sort by: Date created, Name, Status, Expiry date, Last updated
- [ ] Ascending/descending toggle
- [ ] Sort preference saved
- [ ] Default sort: most recent first

**Story Points:** 2

---

## Total Story Points: 21

## Definition of Done

- [ ] Search returns accurate results
- [ ] All filters working
- [ ] Folder system functional
- [ ] PDF export generates correctly
- [ ] Version history tracked
- [ ] Performance acceptable with many contracts
