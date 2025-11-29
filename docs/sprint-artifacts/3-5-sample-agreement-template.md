# Story 3.5: Sample Agreement Template

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 3.5 |
| **Epic** | Epic 3: Contract Templates |
| **Title** | Sample Agreement Template |
| **Priority** | P1 - High |
| **Story Points** | 2 |
| **Status** | Drafted |

## User Story

**As an** artist using samples
**I want** to use a Sample Agreement template
**So that** sample clearance is documented

## Context

The Sample Agreement covers sample clearance for using portions of existing recordings in new works. It addresses master and publishing rights, royalty arrangements, and credit requirements.

**Dependencies:**
- Story 3.1 (Data Model) must be completed first

## Acceptance Criteria

- [ ] **AC-1:** Sample Agreement template created
- [ ] **AC-2:** Fields: Sample owner, sampling artist, original/new work details
- [ ] **AC-3:** One-time fee and/or royalty options
- [ ] **AC-4:** Credit requirements section
- [ ] **AC-5:** Scope of use (masters, publishing, both)
- [ ] **AC-6:** Territory and duration terms

## Technical Requirements

### Template Definition (Summary)

```typescript
export const sampleAgreementTemplate = {
  name: 'Sample Clearance Agreement',
  description: 'For clearing samples from existing recordings. Covers master and publishing rights, fees, and credits.',
  category: 'production',
  isActive: true,
  sortOrder: 4,
  version: 1,

  fields: [
    // Sample Owner
    { id: 'owner_name', label: 'Sample Owner / Rights Holder', type: 'text', required: true, group: 'Sample Owner' },
    { id: 'owner_address', label: 'Owner Address', type: 'textarea', required: true, group: 'Sample Owner' },
    { id: 'owner_email', label: 'Owner Email', type: 'email', required: true, group: 'Sample Owner' },

    // Sampling Artist
    { id: 'artist_name', label: 'Sampling Artist Name', type: 'text', required: true, group: 'Sampling Artist' },
    { id: 'artist_address', label: 'Artist Address', type: 'textarea', required: true, group: 'Sampling Artist' },
    { id: 'artist_email', label: 'Artist Email', type: 'email', required: true, group: 'Sampling Artist' },

    // Original Work
    { id: 'original_title', label: 'Original Work Title', type: 'text', required: true, group: 'Original Work' },
    { id: 'original_artist', label: 'Original Artist', type: 'text', required: true, group: 'Original Work' },
    { id: 'sample_description', label: 'Sample Description', type: 'textarea', required: true,
      placeholder: 'Describe the portion being sampled (e.g., "4-bar drum loop from intro")', group: 'Original Work' },
    { id: 'sample_duration', label: 'Sample Duration (seconds)', type: 'number', required: true, group: 'Original Work' },

    // New Work
    { id: 'new_title', label: 'New Work Title', type: 'text', required: true, group: 'New Work' },
    { id: 'new_description', label: 'How Sample Will Be Used', type: 'textarea', required: true, group: 'New Work' },

    // Rights Scope
    { id: 'rights_type', label: 'Rights Cleared', type: 'select', required: true,
      options: [
        { value: 'master', label: 'Master Recording Only' },
        { value: 'publishing', label: 'Publishing Only' },
        { value: 'both', label: 'Master and Publishing' }
      ], group: 'Rights' },
    { id: 'territory', label: 'Territory', type: 'select', required: true, defaultValue: 'worldwide',
      options: [
        { value: 'worldwide', label: 'Worldwide' },
        { value: 'north_america', label: 'North America' },
        { value: 'europe', label: 'Europe' },
        { value: 'custom', label: 'Custom' }
      ], group: 'Rights' },

    // Compensation
    { id: 'upfront_fee', label: 'One-Time Clearance Fee', type: 'currency', required: true, group: 'Compensation' },

    { id: 'effective_date', label: 'Agreement Date', type: 'date', required: true, group: 'Dates' }
  ],

  optionalClauses: [
    {
      id: 'royalties',
      name: 'Ongoing Royalties',
      description: 'Include ongoing royalty payments',
      defaultEnabled: false,
      fields: [
        { id: 'royalty_rate', label: 'Royalty Rate (%)', type: 'number', required: true, defaultValue: 5 },
        { id: 'royalty_type', label: 'Royalty Type', type: 'select', required: true,
          options: [
            { value: 'mechanical', label: 'Mechanical Royalties' },
            { value: 'all', label: 'All Revenue Streams' }
          ] }
      ]
    },
    {
      id: 'credit',
      name: 'Credit Requirement',
      description: 'Specify how the sample must be credited',
      defaultEnabled: true,
      fields: [
        { id: 'credit_text', label: 'Required Credit', type: 'text', required: true,
          placeholder: 'e.g., "Contains elements of [Song] by [Artist]"' }
      ]
    },
    {
      id: 'modifications',
      name: 'Modification Rights',
      description: 'Allow modifications to the sample',
      defaultEnabled: true,
      fields: [
        { id: 'modification_scope', label: 'Permitted Modifications', type: 'textarea', required: true,
          placeholder: 'e.g., Tempo changes, pitch shifting, effects processing...' }
      ]
    }
  ],

  content: {
    title: 'SAMPLE CLEARANCE AGREEMENT',
    sections: [
      { id: 'parties', heading: '1. PARTIES', content: '...' },
      { id: 'sample', heading: '2. SAMPLE IDENTIFICATION', content: '...' },
      { id: 'new_work', heading: '3. NEW WORK', content: '...' },
      { id: 'grant', heading: '4. GRANT OF RIGHTS', content: '...' },
      { id: 'compensation', heading: '5. COMPENSATION', content: '...' },
      { id: 'royalties_section', heading: '6. ROYALTIES', content: '...', isOptional: true, clauseId: 'royalties' },
      { id: 'credit_section', heading: '7. CREDIT', content: '...', isOptional: true, clauseId: 'credit' },
      { id: 'modifications_section', heading: '8. MODIFICATIONS', content: '...', isOptional: true, clauseId: 'modifications' },
      { id: 'warranties', heading: '9. WARRANTIES', content: '...' },
      { id: 'signatures', heading: '10. SIGNATURES', content: '...' }
    ]
  }
};
```

## Definition of Done

- [ ] Template complete with all sections
- [ ] Rights types (master/publishing) work correctly
- [ ] Royalty option functional
- [ ] Credit requirements clear
- [ ] Sample description captured accurately

## Related Documents

- [Epic 3 Tech Spec](./tech-spec-epic-3.md)
- [Story 3.1: Template Data Model](./3-1-template-data-model-and-storage.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create template definition file**
  - [ ] Create server/data/templates/sample-agreement.ts
  - [ ] Define sample owner fields
  - [ ] Define sampling artist fields
  - [ ] Define original work fields
  - [ ] Define new work fields
  - [ ] Define rights scope fields
  - [ ] Define compensation fields

- [ ] **Task 2: Define optional clauses**
  - [ ] Add ongoing royalties clause
  - [ ] Add credit requirement clause
  - [ ] Add modification rights clause

- [ ] **Task 3: Create template content sections**
  - [ ] Write parties section
  - [ ] Write sample identification section
  - [ ] Write new work section
  - [ ] Write grant of rights section
  - [ ] Write compensation section
  - [ ] Write optional royalties section
  - [ ] Write optional credit section
  - [ ] Write optional modifications section
  - [ ] Write warranties section
  - [ ] Write signatures section

- [ ] **Task 4: Add to seed script**
  - [ ] Export sample agreement template
  - [ ] Add to seedTemplates function

- [ ] **Task 5: Write tests**
  - [ ] Unit tests for rights type rendering
  - [ ] Integration test for seeding
  - [ ] Render test with master only rights
  - [ ] Render test with both master and publishing

---

## Dev Agent Record

### Debug Log
<!-- Automatically updated by dev agent during implementation -->

### Completion Notes
<!-- Summary of implementation, decisions made, any follow-ups needed -->

---

## File List

| Action | File Path |
|--------|-----------|
| | |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| | | |
