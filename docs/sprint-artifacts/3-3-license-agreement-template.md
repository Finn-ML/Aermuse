# Story 3.3: License Agreement Template

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 3.3 |
| **Epic** | Epic 3: Contract Templates |
| **Title** | License Agreement Template |
| **Priority** | P1 - High |
| **Story Points** | 2 |
| **Status** | Drafted |

## User Story

**As an** artist licensing my music
**I want** to use a License Agreement template
**So that** usage rights are clearly defined

## Context

The License Agreement template covers music and content licensing scenarios including sync licenses, non-exclusive licenses, and exclusive licenses. It defines the scope of permitted use, territory, duration, and compensation.

**Dependencies:**
- Story 3.1 (Data Model) must be completed first

## Acceptance Criteria

- [ ] **AC-1:** License Agreement template created in database
- [ ] **AC-2:** Supports license types: Exclusive, Non-Exclusive, Sync
- [ ] **AC-3:** Fields: Licensor, licensee, work description, fee, territory, duration
- [ ] **AC-4:** Usage restrictions section included
- [ ] **AC-5:** Royalty terms if applicable
- [ ] **AC-6:** Professional formatting consistent with Artist Agreement

## Technical Requirements

### Template Definition

```typescript
// server/data/templates/license-agreement.ts
export const licenseAgreementTemplate = {
  name: 'Music License Agreement',
  description: 'For licensing music for use in media, streaming, or other purposes. Covers sync, mechanical, and performance rights.',
  category: 'licensing',
  isActive: true,
  sortOrder: 2,
  version: 1,

  fields: [
    // Licensor (rights holder)
    {
      id: 'licensor_name',
      label: 'Licensor Name (Rights Holder)',
      type: 'text',
      required: true,
      group: 'Licensor Details'
    },
    {
      id: 'licensor_address',
      label: 'Licensor Address',
      type: 'textarea',
      required: true,
      group: 'Licensor Details'
    },
    {
      id: 'licensor_email',
      label: 'Licensor Email',
      type: 'email',
      required: true,
      group: 'Licensor Details'
    },

    // Licensee
    {
      id: 'licensee_name',
      label: 'Licensee Name',
      type: 'text',
      required: true,
      group: 'Licensee Details'
    },
    {
      id: 'licensee_company',
      label: 'Company (if applicable)',
      type: 'text',
      required: false,
      group: 'Licensee Details'
    },
    {
      id: 'licensee_address',
      label: 'Licensee Address',
      type: 'textarea',
      required: true,
      group: 'Licensee Details'
    },
    {
      id: 'licensee_email',
      label: 'Licensee Email',
      type: 'email',
      required: true,
      group: 'Licensee Details'
    },

    // Work Details
    {
      id: 'work_title',
      label: 'Work Title',
      type: 'text',
      required: true,
      placeholder: 'Song or composition title',
      group: 'Licensed Work'
    },
    {
      id: 'work_description',
      label: 'Work Description',
      type: 'textarea',
      required: true,
      helpText: 'Describe the work being licensed (recordings, compositions, etc.)',
      group: 'Licensed Work'
    },
    {
      id: 'work_duration',
      label: 'Work Duration',
      type: 'text',
      required: false,
      placeholder: 'e.g., 3:45',
      group: 'Licensed Work'
    },

    // License Type
    {
      id: 'license_type',
      label: 'License Type',
      type: 'select',
      required: true,
      options: [
        { value: 'non_exclusive', label: 'Non-Exclusive License' },
        { value: 'exclusive', label: 'Exclusive License' },
        { value: 'sync', label: 'Synchronization License' },
        { value: 'mechanical', label: 'Mechanical License' }
      ],
      group: 'License Terms'
    },
    {
      id: 'permitted_use',
      label: 'Permitted Use',
      type: 'textarea',
      required: true,
      placeholder: 'e.g., Background music for YouTube video, Film soundtrack, etc.',
      helpText: 'Describe how the licensee may use the work',
      group: 'License Terms'
    },

    // Territory & Duration
    {
      id: 'territory',
      label: 'Territory',
      type: 'select',
      required: true,
      defaultValue: 'worldwide',
      options: [
        { value: 'worldwide', label: 'Worldwide' },
        { value: 'uk', label: 'United Kingdom' },
        { value: 'europe', label: 'Europe' },
        { value: 'north_america', label: 'North America' },
        { value: 'custom', label: 'Custom (specify in permitted use)' }
      ],
      group: 'Scope'
    },
    {
      id: 'license_duration',
      label: 'License Duration',
      type: 'select',
      required: true,
      options: [
        { value: '1_year', label: '1 Year' },
        { value: '2_years', label: '2 Years' },
        { value: '5_years', label: '5 Years' },
        { value: 'perpetual', label: 'Perpetual (unlimited)' },
        { value: 'custom', label: 'Custom period' }
      ],
      group: 'Scope'
    },
    {
      id: 'custom_duration',
      label: 'Custom Duration Details',
      type: 'text',
      required: false,
      placeholder: 'e.g., Duration of film theatrical release',
      group: 'Scope'
    },

    // Compensation
    {
      id: 'license_fee',
      label: 'License Fee',
      type: 'currency',
      required: true,
      group: 'Compensation'
    },
    {
      id: 'payment_terms',
      label: 'Payment Terms',
      type: 'select',
      required: true,
      defaultValue: 'upfront',
      options: [
        { value: 'upfront', label: 'Full payment upfront' },
        { value: '50_50', label: '50% upfront, 50% on delivery' },
        { value: 'net_30', label: 'Net 30 days' },
        { value: 'custom', label: 'Custom terms' }
      ],
      group: 'Compensation'
    },

    // Dates
    {
      id: 'effective_date',
      label: 'Effective Date',
      type: 'date',
      required: true,
      group: 'Dates'
    }
  ],

  optionalClauses: [
    {
      id: 'royalties',
      name: 'Ongoing Royalties',
      description: 'Include royalty payments in addition to the license fee',
      defaultEnabled: false,
      fields: [
        {
          id: 'royalty_rate',
          label: 'Royalty Rate (%)',
          type: 'number',
          required: true,
          defaultValue: 10,
          validation: { min: 1, max: 50 }
        },
        {
          id: 'royalty_basis',
          label: 'Royalty Basis',
          type: 'select',
          required: true,
          options: [
            { value: 'gross', label: 'Gross Revenue' },
            { value: 'net', label: 'Net Revenue' },
            { value: 'per_unit', label: 'Per Unit/Stream' }
          ]
        }
      ]
    },
    {
      id: 'attribution',
      name: 'Attribution Requirement',
      description: 'Require the licensee to credit the licensor',
      defaultEnabled: true,
      fields: [
        {
          id: 'attribution_text',
          label: 'Required Credit Text',
          type: 'text',
          required: true,
          placeholder: 'e.g., "Music by [Artist Name]"'
        }
      ]
    },
    {
      id: 'restrictions',
      name: 'Usage Restrictions',
      description: 'Specify prohibited uses of the licensed work',
      defaultEnabled: true,
      fields: [
        {
          id: 'prohibited_uses',
          label: 'Prohibited Uses',
          type: 'textarea',
          required: true,
          placeholder: 'e.g., Political advertising, adult content, etc.'
        }
      ]
    }
  ],

  content: {
    title: 'MUSIC LICENSE AGREEMENT',
    sections: [
      {
        id: 'parties',
        heading: '1. PARTIES',
        content: `This Music License Agreement ("Agreement") is made effective as of {{effective_date}} between:

LICENSOR:
{{licensor_name}}
{{licensor_address}}
Email: {{licensor_email}}

LICENSEE:
{{licensee_name}}
{{#if licensee_company}}{{licensee_company}}{{/if}}
{{licensee_address}}
Email: {{licensee_email}}`
      },
      {
        id: 'grant',
        heading: '2. GRANT OF LICENSE',
        content: `The Licensor hereby grants to the Licensee a {{license_type}} license to use the following work:

Work Title: "{{work_title}}"
Description: {{work_description}}
{{#if work_duration}}Duration: {{work_duration}}{{/if}}

This license is granted for the following permitted uses:
{{permitted_use}}`
      },
      {
        id: 'scope',
        heading: '3. SCOPE AND TERRITORY',
        content: `Territory: {{territory}}
Duration: {{license_duration}}
{{#if custom_duration}}({{custom_duration}}){{/if}}

This license is {{license_type}}. {{#if license_type === 'exclusive'}}The Licensor agrees not to license this work to any other party within the specified territory and duration.{{else}}The Licensor retains the right to license this work to other parties.{{/if}}`
      },
      {
        id: 'compensation',
        heading: '4. COMPENSATION',
        content: `License Fee: {{license_fee}}
Payment Terms: {{payment_terms}}

All payments shall be made to the Licensor via bank transfer or other method agreed upon by the parties. The Licensee is responsible for any transaction fees.`
      },
      {
        id: 'royalties_section',
        heading: '5. ROYALTIES',
        content: `In addition to the License Fee, the Licensee agrees to pay ongoing royalties as follows:

Royalty Rate: {{royalty_rate}}% of {{royalty_basis}}

Royalty payments shall be calculated quarterly and paid within 30 days of each quarter end. The Licensee shall provide accurate statements of usage with each payment.`,
        isOptional: true,
        clauseId: 'royalties'
      },
      {
        id: 'attribution_section',
        heading: '6. ATTRIBUTION',
        content: `The Licensee agrees to provide the following credit in all uses of the Licensed Work where technically feasible:

"{{attribution_text}}"

This credit shall appear in end credits, metadata, or other appropriate location depending on the medium of use.`,
        isOptional: true,
        clauseId: 'attribution'
      },
      {
        id: 'restrictions_section',
        heading: '7. RESTRICTIONS',
        content: `The Licensee may NOT use the Licensed Work for the following purposes:

{{prohibited_uses}}

Any use outside the scope of this license requires separate written permission from the Licensor.`,
        isOptional: true,
        clauseId: 'restrictions'
      },
      {
        id: 'ownership',
        heading: '8. OWNERSHIP',
        content: `The Licensor retains all ownership rights, including copyright, in the Licensed Work. This Agreement does not transfer any ownership rights to the Licensee.

The Licensee may not sublicense, transfer, or assign this license without the prior written consent of the Licensor.`
      },
      {
        id: 'warranties',
        heading: '9. WARRANTIES',
        content: `The Licensor warrants that:
a) They are the rightful owner of the Licensed Work
b) They have the authority to grant this license
c) The Licensed Work does not infringe upon any third-party rights

The Licensee warrants that they will use the Licensed Work only as permitted under this Agreement.`
      },
      {
        id: 'termination',
        heading: '10. TERMINATION',
        content: `This Agreement may be terminated:
a) By mutual written agreement of both parties
b) By either party if the other materially breaches this Agreement and fails to cure within 30 days of notice

Upon termination, the Licensee shall immediately cease all use of the Licensed Work and destroy any copies in their possession.`
      },
      {
        id: 'signatures',
        heading: '11. SIGNATURES',
        content: `IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.


LICENSOR:
_____________________________
{{licensor_name}}
Date: _______________


LICENSEE:
_____________________________
{{licensee_name}}
Date: _______________`
      }
    ]
  }
};
```

## Definition of Done

- [ ] Template definition created
- [ ] Template seeded to database
- [ ] All license types selectable
- [ ] Royalty clause properly optional
- [ ] Attribution clause functional
- [ ] Usage restrictions section works
- [ ] Renders with professional formatting

## Testing Checklist

### Unit Tests

- [ ] All field types validate correctly
- [ ] Optional clauses toggle sections

### Integration Tests

- [ ] Template retrieves from database
- [ ] Render produces valid output

### Manual Testing

- [ ] Test sync license scenario
- [ ] Test exclusive license scenario
- [ ] Verify legal language appropriate

## Related Documents

- [Epic 3 Tech Spec](./tech-spec-epic-3.md)
- [Story 3.1: Template Data Model](./3-1-template-data-model-and-storage.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create template definition file**
  - [ ] Create server/data/templates/license-agreement.ts
  - [ ] Define licensor fields
  - [ ] Define licensee fields
  - [ ] Define work details fields
  - [ ] Define license type and scope fields
  - [ ] Define compensation fields

- [ ] **Task 2: Define optional clauses**
  - [ ] Add ongoing royalties clause
  - [ ] Add attribution requirement clause
  - [ ] Add usage restrictions clause

- [ ] **Task 3: Create template content sections**
  - [ ] Write parties section
  - [ ] Write grant of license section
  - [ ] Write scope and territory section
  - [ ] Write compensation section
  - [ ] Write optional royalties section
  - [ ] Write optional attribution section
  - [ ] Write optional restrictions section
  - [ ] Write ownership section
  - [ ] Write warranties section
  - [ ] Write termination section
  - [ ] Write signatures section

- [ ] **Task 4: Add to seed script**
  - [ ] Export license agreement template
  - [ ] Add to seedTemplates function

- [ ] **Task 5: Write tests**
  - [ ] Unit tests for license type rendering
  - [ ] Integration test for seeding
  - [ ] Render test with sync license scenario
  - [ ] Render test with exclusive license scenario

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
