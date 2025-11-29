# Story 3.4: Tour Agreement Template

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 3.4 |
| **Epic** | Epic 3: Contract Templates |
| **Title** | Tour Agreement Template |
| **Priority** | P1 - High |
| **Story Points** | 2 |
| **Status** | Drafted |

## User Story

**As an** artist going on tour
**I want** to use a Tour Agreement template
**So that** performance terms are documented

## Context

The Tour Agreement covers live performance arrangements between artists and venues/promoters. It includes performance details, fees, technical requirements, and cancellation terms.

**Dependencies:**
- Story 3.1 (Data Model) must be completed first

## Acceptance Criteria

- [ ] **AC-1:** Tour Agreement template created
- [ ] **AC-2:** Fields: Artist, promoter/venue, dates, locations, fees
- [ ] **AC-3:** Technical/rider requirements section
- [ ] **AC-4:** Cancellation and force majeure terms
- [ ] **AC-5:** Travel and accommodation provisions (optional)
- [ ] **AC-6:** Multiple performance dates supported

## Technical Requirements

### Template Definition (Summary)

```typescript
export const tourAgreementTemplate = {
  name: 'Live Performance Agreement',
  description: 'For booking live performances at venues or events. Covers fees, technical requirements, and logistics.',
  category: 'touring',
  isActive: true,
  sortOrder: 3,
  version: 1,

  fields: [
    // Artist Details
    { id: 'artist_name', label: 'Artist/Band Name', type: 'text', required: true, group: 'Artist' },
    { id: 'artist_contact', label: 'Artist Contact Name', type: 'text', required: true, group: 'Artist' },
    { id: 'artist_email', label: 'Artist Email', type: 'email', required: true, group: 'Artist' },
    { id: 'artist_phone', label: 'Artist Phone', type: 'text', required: true, group: 'Artist' },

    // Venue/Promoter
    { id: 'venue_name', label: 'Venue/Event Name', type: 'text', required: true, group: 'Venue' },
    { id: 'promoter_name', label: 'Promoter/Booker Name', type: 'text', required: true, group: 'Venue' },
    { id: 'venue_address', label: 'Venue Address', type: 'textarea', required: true, group: 'Venue' },
    { id: 'venue_email', label: 'Venue/Promoter Email', type: 'email', required: true, group: 'Venue' },

    // Performance Details
    { id: 'performance_date', label: 'Performance Date', type: 'date', required: true, group: 'Performance' },
    { id: 'load_in_time', label: 'Load-in Time', type: 'text', required: true, placeholder: 'e.g., 4:00 PM', group: 'Performance' },
    { id: 'soundcheck_time', label: 'Soundcheck Time', type: 'text', required: true, placeholder: 'e.g., 5:00 PM', group: 'Performance' },
    { id: 'set_time', label: 'Set Time', type: 'text', required: true, placeholder: 'e.g., 9:00 PM', group: 'Performance' },
    { id: 'set_length', label: 'Set Length (minutes)', type: 'number', required: true, defaultValue: 60, group: 'Performance' },

    // Compensation
    { id: 'guarantee_fee', label: 'Guarantee Fee', type: 'currency', required: true, group: 'Compensation' },
    { id: 'payment_timing', label: 'Payment Timing', type: 'select', required: true,
      options: [
        { value: 'before', label: 'Full payment before show' },
        { value: 'after', label: 'Full payment after show' },
        { value: 'split', label: '50% deposit, 50% on night' }
      ], group: 'Compensation' },

    // Technical
    { id: 'backline_provided', label: 'Backline Provided', type: 'select', required: true,
      options: [
        { value: 'full', label: 'Full backline provided' },
        { value: 'partial', label: 'Partial (specify below)' },
        { value: 'none', label: 'Artist provides all' }
      ], group: 'Technical' },
    { id: 'sound_engineer', label: 'Sound Engineer', type: 'select', required: true,
      options: [
        { value: 'venue', label: 'Venue provides' },
        { value: 'artist', label: 'Artist provides' }
      ], group: 'Technical' },

    { id: 'effective_date', label: 'Agreement Date', type: 'date', required: true, group: 'Dates' }
  ],

  optionalClauses: [
    {
      id: 'door_split',
      name: 'Door Split / Backend',
      description: 'Additional payment based on ticket sales',
      defaultEnabled: false,
      fields: [
        { id: 'split_percentage', label: 'Artist Door Percentage', type: 'number', required: true, defaultValue: 80 },
        { id: 'after_expenses', label: 'After Expenses', type: 'select', required: true,
          options: [{ value: 'gross', label: 'Of gross door' }, { value: 'net', label: 'Of net (after expenses)' }] }
      ]
    },
    {
      id: 'hospitality',
      name: 'Hospitality Rider',
      description: 'Food, drinks, and dressing room requirements',
      defaultEnabled: true,
      fields: [
        { id: 'hospitality_requirements', label: 'Hospitality Requirements', type: 'textarea', required: true,
          placeholder: 'e.g., Hot meal for 4, bottled water, private dressing room...' }
      ]
    },
    {
      id: 'travel',
      name: 'Travel & Accommodation',
      description: 'Venue provides travel or accommodation',
      defaultEnabled: false,
      fields: [
        { id: 'travel_provided', label: 'Travel Arrangements', type: 'textarea', required: true },
        { id: 'accommodation_details', label: 'Accommodation Details', type: 'textarea', required: false }
      ]
    },
    {
      id: 'merchandise',
      name: 'Merchandise Rights',
      description: 'Artist's right to sell merchandise',
      defaultEnabled: true,
      fields: [
        { id: 'merch_split', label: 'Venue Merchandise Take (%)', type: 'number', required: true, defaultValue: 0 }
      ]
    }
  ],

  content: {
    title: 'LIVE PERFORMANCE AGREEMENT',
    sections: [
      { id: 'parties', heading: '1. PARTIES', content: '...' },
      { id: 'engagement', heading: '2. ENGAGEMENT', content: '...' },
      { id: 'compensation', heading: '3. COMPENSATION', content: '...' },
      { id: 'technical', heading: '4. TECHNICAL REQUIREMENTS', content: '...' },
      { id: 'door_split_section', heading: '5. DOOR SPLIT', content: '...', isOptional: true, clauseId: 'door_split' },
      { id: 'hospitality_section', heading: '6. HOSPITALITY', content: '...', isOptional: true, clauseId: 'hospitality' },
      { id: 'travel_section', heading: '7. TRAVEL & ACCOMMODATION', content: '...', isOptional: true, clauseId: 'travel' },
      { id: 'merchandise_section', heading: '8. MERCHANDISE', content: '...', isOptional: true, clauseId: 'merchandise' },
      { id: 'cancellation', heading: '9. CANCELLATION', content: '...' },
      { id: 'signatures', heading: '10. SIGNATURES', content: '...' }
    ]
  }
};
```

## Definition of Done

- [ ] Template definition complete with all sections
- [ ] Seeded to database
- [ ] Performance times render correctly
- [ ] Door split calculations work
- [ ] Hospitality rider functional
- [ ] Cancellation terms included

## Related Documents

- [Epic 3 Tech Spec](./tech-spec-epic-3.md)
- [Story 3.1: Template Data Model](./3-1-template-data-model-and-storage.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create template definition file**
  - [ ] Create server/data/templates/tour-agreement.ts
  - [ ] Define artist fields
  - [ ] Define venue/promoter fields
  - [ ] Define performance details fields
  - [ ] Define compensation fields
  - [ ] Define technical requirements fields

- [ ] **Task 2: Define optional clauses**
  - [ ] Add door split/backend clause
  - [ ] Add hospitality rider clause
  - [ ] Add travel & accommodation clause
  - [ ] Add merchandise rights clause

- [ ] **Task 3: Create template content sections**
  - [ ] Write parties section
  - [ ] Write engagement section
  - [ ] Write compensation section
  - [ ] Write technical requirements section
  - [ ] Write optional door split section
  - [ ] Write optional hospitality section
  - [ ] Write optional travel section
  - [ ] Write optional merchandise section
  - [ ] Write cancellation section
  - [ ] Write signatures section

- [ ] **Task 4: Add to seed script**
  - [ ] Export tour agreement template
  - [ ] Add to seedTemplates function

- [ ] **Task 5: Write tests**
  - [ ] Unit tests for time field validation
  - [ ] Integration test for seeding
  - [ ] Render test with all optional clauses
  - [ ] Render test with door split calculation

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
