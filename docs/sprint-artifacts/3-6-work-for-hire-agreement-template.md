# Story 3.6: Work-for-Hire Agreement Template

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 3.6 |
| **Epic** | Epic 3: Contract Templates |
| **Title** | Work-for-Hire Agreement Template |
| **Priority** | P1 - High |
| **Story Points** | 2 |
| **Status** | Drafted |

## User Story

**As someone** commissioning creative work
**I want** to use a Work-for-Hire template
**So that** ownership is clearly assigned

## Context

The Work-for-Hire Agreement covers commissioned creative work where the client owns all resulting intellectual property. Common use cases include custom music production, jingle creation, and session work.

**Dependencies:**
- Story 3.1 (Data Model) must be completed first

## Acceptance Criteria

- [ ] **AC-1:** Work-for-Hire template created
- [ ] **AC-2:** Fields: Client, contractor, project description, fee, deliverables
- [ ] **AC-3:** IP assignment clause clearly stated
- [ ] **AC-4:** Revision terms and limits
- [ ] **AC-5:** Payment schedule options
- [ ] **AC-6:** Deadline and delivery terms

## Technical Requirements

### Template Definition (Summary)

```typescript
export const workForHireTemplate = {
  name: 'Work-for-Hire Agreement',
  description: 'For commissioned creative work where the client retains all ownership. Ideal for custom production, session work, or jingles.',
  category: 'production',
  isActive: true,
  sortOrder: 5,
  version: 1,

  fields: [
    // Client
    { id: 'client_name', label: 'Client Name / Company', type: 'text', required: true, group: 'Client' },
    { id: 'client_address', label: 'Client Address', type: 'textarea', required: true, group: 'Client' },
    { id: 'client_email', label: 'Client Email', type: 'email', required: true, group: 'Client' },

    // Contractor
    { id: 'contractor_name', label: 'Contractor Name', type: 'text', required: true, group: 'Contractor' },
    { id: 'contractor_address', label: 'Contractor Address', type: 'textarea', required: true, group: 'Contractor' },
    { id: 'contractor_email', label: 'Contractor Email', type: 'email', required: true, group: 'Contractor' },

    // Project
    { id: 'project_title', label: 'Project Title', type: 'text', required: true, group: 'Project' },
    { id: 'project_description', label: 'Project Description', type: 'textarea', required: true,
      placeholder: 'Detailed description of the work to be created...', group: 'Project' },
    { id: 'deliverables', label: 'Deliverables', type: 'textarea', required: true,
      placeholder: 'List all deliverables (e.g., Stems, master files, etc.)', group: 'Project' },
    { id: 'file_formats', label: 'Required File Formats', type: 'text', required: true,
      placeholder: 'e.g., WAV 24-bit/48kHz, MP3 320kbps', group: 'Project' },

    // Timeline
    { id: 'start_date', label: 'Project Start Date', type: 'date', required: true, group: 'Timeline' },
    { id: 'deadline', label: 'Final Deadline', type: 'date', required: true, group: 'Timeline' },
    { id: 'milestones', label: 'Milestones (if any)', type: 'textarea', required: false,
      placeholder: 'List interim deliverables and dates...', group: 'Timeline' },

    // Compensation
    { id: 'total_fee', label: 'Total Fee', type: 'currency', required: true, group: 'Compensation' },
    { id: 'payment_schedule', label: 'Payment Schedule', type: 'select', required: true,
      options: [
        { value: 'upfront', label: '100% upfront' },
        { value: '50_50', label: '50% upfront, 50% on delivery' },
        { value: 'thirds', label: '1/3 upfront, 1/3 mid, 1/3 final' },
        { value: 'milestone', label: 'Per milestone' },
        { value: 'on_delivery', label: '100% on delivery' }
      ], group: 'Compensation' },

    { id: 'effective_date', label: 'Agreement Date', type: 'date', required: true, group: 'Dates' }
  ],

  optionalClauses: [
    {
      id: 'revisions',
      name: 'Revision Policy',
      description: 'Include revision limits and additional revision fees',
      defaultEnabled: true,
      fields: [
        { id: 'included_revisions', label: 'Included Revisions', type: 'number', required: true, defaultValue: 2 },
        { id: 'additional_revision_fee', label: 'Additional Revision Fee', type: 'currency', required: true }
      ]
    },
    {
      id: 'kill_fee',
      name: 'Kill Fee / Cancellation',
      description: 'Specify payment if project is cancelled',
      defaultEnabled: true,
      fields: [
        { id: 'kill_fee_percentage', label: 'Kill Fee (% of total)', type: 'number', required: true, defaultValue: 50 }
      ]
    },
    {
      id: 'credit',
      name: 'Credit / Portfolio',
      description: 'Allow contractor to use work in portfolio',
      defaultEnabled: false,
      fields: [
        { id: 'portfolio_allowed', label: 'Portfolio Use', type: 'select', required: true,
          options: [
            { value: 'yes', label: 'Yes, after release' },
            { value: 'no', label: 'No, confidential' },
            { value: 'limited', label: 'Limited (specify)' }
          ] },
        { id: 'credit_text', label: 'Credit (if applicable)', type: 'text', required: false }
      ]
    },
    {
      id: 'confidentiality',
      name: 'Confidentiality',
      description: 'Non-disclosure requirements',
      defaultEnabled: false,
      fields: [
        { id: 'confidentiality_period', label: 'Confidentiality Period', type: 'select', required: true,
          options: [
            { value: 'perpetual', label: 'Perpetual' },
            { value: '1_year', label: '1 Year after completion' },
            { value: '2_years', label: '2 Years after completion' }
          ] }
      ]
    }
  ],

  content: {
    title: 'WORK-FOR-HIRE AGREEMENT',
    sections: [
      { id: 'parties', heading: '1. PARTIES', content: '...' },
      { id: 'scope', heading: '2. SCOPE OF WORK', content: '...' },
      { id: 'deliverables', heading: '3. DELIVERABLES', content: '...' },
      { id: 'timeline', heading: '4. TIMELINE', content: '...' },
      { id: 'compensation', heading: '5. COMPENSATION', content: '...' },
      { id: 'ip_assignment', heading: '6. INTELLECTUAL PROPERTY ASSIGNMENT', content: 'The Contractor agrees that all Work created under this Agreement is "work made for hire" and all rights belong exclusively to the Client...' },
      { id: 'revisions_section', heading: '7. REVISIONS', content: '...', isOptional: true, clauseId: 'revisions' },
      { id: 'kill_fee_section', heading: '8. CANCELLATION', content: '...', isOptional: true, clauseId: 'kill_fee' },
      { id: 'credit_section', heading: '9. CREDIT & PORTFOLIO', content: '...', isOptional: true, clauseId: 'credit' },
      { id: 'confidentiality_section', heading: '10. CONFIDENTIALITY', content: '...', isOptional: true, clauseId: 'confidentiality' },
      { id: 'warranties', heading: '11. WARRANTIES', content: '...' },
      { id: 'signatures', heading: '12. SIGNATURES', content: '...' }
    ]
  }
};
```

## Definition of Done

- [ ] Template complete with IP assignment clause
- [ ] Payment schedules work correctly
- [ ] Revision policy functional
- [ ] Kill fee calculated properly
- [ ] Confidentiality terms clear

## Related Documents

- [Epic 3 Tech Spec](./tech-spec-epic-3.md)
- [Story 3.1: Template Data Model](./3-1-template-data-model-and-storage.md)
