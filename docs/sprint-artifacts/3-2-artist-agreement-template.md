# Story 3.2: Artist Agreement Template

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 3.2 |
| **Epic** | Epic 3: Contract Templates |
| **Title** | Artist Agreement Template |
| **Priority** | P1 - High |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As an** artist entering a collaboration
**I want** to use an Artist Agreement template
**So that** both parties are protected

## Context

The Artist Agreement is the most commonly used template, covering collaborations between artists, producers, and other creatives. It defines revenue splits, credits, rights, and termination terms.

**Dependencies:**
- Story 3.1 (Data Model) must be completed first

## Acceptance Criteria

- [ ] **AC-1:** Artist Agreement template created in database
- [ ] **AC-2:** Template covers: parties, scope, revenue, rights, credits, term
- [ ] **AC-3:** All required fields defined with proper types
- [ ] **AC-4:** Optional clauses: Exclusivity, Credit Requirements, Termination Rights
- [ ] **AC-5:** Preview renders correctly with sample data
- [ ] **AC-6:** Professional legal-style formatting

## Technical Requirements

### Template Definition

```typescript
// server/data/templates/artist-agreement.ts
import { ContractTemplate, TemplateContent, TemplateField, OptionalClause } from '../../shared/types/templates';

export const artistAgreementTemplate: Omit<ContractTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
  name: 'Artist Collaboration Agreement',
  description: 'For collaborations between artists, producers, or other creatives. Covers revenue splits, credits, and rights.',
  category: 'artist',
  isActive: true,
  sortOrder: 1,
  version: 1,

  fields: [
    // Party A (Primary Artist)
    {
      id: 'party_a_name',
      label: 'Your Name / Artist Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Jane Smith p/k/a "J. Melody"',
      group: 'Your Details'
    },
    {
      id: 'party_a_address',
      label: 'Your Address',
      type: 'textarea',
      required: true,
      group: 'Your Details'
    },
    {
      id: 'party_a_email',
      label: 'Your Email',
      type: 'email',
      required: true,
      group: 'Your Details'
    },

    // Party B (Collaborator)
    {
      id: 'party_b_name',
      label: 'Collaborator Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., John Doe p/k/a "DJ Thunder"',
      group: 'Collaborator Details'
    },
    {
      id: 'party_b_address',
      label: 'Collaborator Address',
      type: 'textarea',
      required: true,
      group: 'Collaborator Details'
    },
    {
      id: 'party_b_email',
      label: 'Collaborator Email',
      type: 'email',
      required: true,
      group: 'Collaborator Details'
    },

    // Project Details
    {
      id: 'project_title',
      label: 'Project / Song Title',
      type: 'text',
      required: true,
      placeholder: 'e.g., "Summer Nights"',
      group: 'Project Details'
    },
    {
      id: 'project_description',
      label: 'Project Description',
      type: 'textarea',
      required: true,
      placeholder: 'Describe the collaboration scope...',
      helpText: 'Describe what each party will contribute to the project',
      group: 'Project Details'
    },

    // Financial Terms
    {
      id: 'party_a_split',
      label: 'Your Revenue Share (%)',
      type: 'number',
      required: true,
      defaultValue: 50,
      validation: { min: 0, max: 100 },
      group: 'Financial Terms'
    },
    {
      id: 'party_b_split',
      label: 'Collaborator Revenue Share (%)',
      type: 'number',
      required: true,
      defaultValue: 50,
      validation: { min: 0, max: 100 },
      group: 'Financial Terms'
    },
    {
      id: 'advance_amount',
      label: 'Advance Payment (if any)',
      type: 'currency',
      required: false,
      defaultValue: 0,
      helpText: 'Leave as 0 if no advance',
      group: 'Financial Terms'
    },

    // Dates
    {
      id: 'effective_date',
      label: 'Agreement Start Date',
      type: 'date',
      required: true,
      group: 'Dates'
    },
    {
      id: 'delivery_date',
      label: 'Expected Completion Date',
      type: 'date',
      required: false,
      group: 'Dates'
    },

    // Territory
    {
      id: 'territory',
      label: 'Territory',
      type: 'select',
      required: true,
      defaultValue: 'worldwide',
      options: [
        { value: 'worldwide', label: 'Worldwide' },
        { value: 'uk', label: 'United Kingdom only' },
        { value: 'europe', label: 'Europe' },
        { value: 'north_america', label: 'North America' },
        { value: 'custom', label: 'Custom (specify in description)' }
      ],
      group: 'Rights'
    }
  ],

  optionalClauses: [
    {
      id: 'exclusivity',
      name: 'Exclusivity Clause',
      description: 'Prevents either party from releasing similar work during the collaboration period',
      defaultEnabled: false,
      fields: [
        {
          id: 'exclusivity_period',
          label: 'Exclusivity Period (months)',
          type: 'number',
          required: true,
          defaultValue: 6,
          validation: { min: 1, max: 24 }
        }
      ]
    },
    {
      id: 'credit_requirements',
      name: 'Credit Requirements',
      description: 'Specifies how each party must be credited',
      defaultEnabled: true,
      fields: [
        {
          id: 'party_a_credit',
          label: 'Your Credit Name',
          type: 'text',
          required: true,
          placeholder: 'e.g., "Produced by J. Melody"'
        },
        {
          id: 'party_b_credit',
          label: 'Collaborator Credit Name',
          type: 'text',
          required: true,
          placeholder: 'e.g., "Featuring DJ Thunder"'
        }
      ]
    },
    {
      id: 'termination',
      name: 'Early Termination Rights',
      description: 'Allows either party to terminate with written notice',
      defaultEnabled: true,
      fields: [
        {
          id: 'notice_period',
          label: 'Notice Period (days)',
          type: 'number',
          required: true,
          defaultValue: 30,
          validation: { min: 7, max: 90 }
        }
      ]
    }
  ],

  content: {
    title: 'ARTIST COLLABORATION AGREEMENT',
    sections: [
      {
        id: 'parties',
        heading: '1. PARTIES',
        content: `This Artist Collaboration Agreement ("Agreement") is entered into as of {{effective_date}} by and between:

{{party_a_name}} ("Party A")
Address: {{party_a_address}}
Email: {{party_a_email}}

AND

{{party_b_name}} ("Party B")
Address: {{party_b_address}}
Email: {{party_b_email}}

Collectively referred to as the "Parties."`
      },
      {
        id: 'project',
        heading: '2. PROJECT SCOPE',
        content: `The Parties agree to collaborate on the following project:

Project Title: {{project_title}}

Description: {{project_description}}

The collaboration shall commence on {{effective_date}}${`{{#if delivery_date}}`} and the deliverables are expected to be completed by {{delivery_date}}${`{{/if}}`}.`
      },
      {
        id: 'revenue',
        heading: '3. REVENUE SHARING',
        content: `All revenues derived from the Project, including but not limited to streaming royalties, synchronization fees, performance royalties, and mechanical royalties, shall be divided as follows:

Party A: {{party_a_split}}%
Party B: {{party_b_split}}%

${`{{#if advance_amount}}`}Party A agrees to pay Party B an advance of {{advance_amount}} upon execution of this Agreement. This advance shall be recoupable from Party B's share of revenues.${`{{/if}}`}

Each Party shall be responsible for their own taxes on income received under this Agreement.`
      },
      {
        id: 'rights',
        heading: '4. INTELLECTUAL PROPERTY RIGHTS',
        content: `The Parties shall jointly own all intellectual property created as part of this Project. Neither Party may license, sell, or transfer their rights in the Project without the written consent of the other Party.

Territory: This Agreement covers the exploitation of the Project in {{territory}}.

Each Party retains ownership of any pre-existing materials they contribute to the Project.`
      },
      {
        id: 'exclusivity_section',
        heading: '5. EXCLUSIVITY',
        content: `During the exclusivity period of {{exclusivity_period}} months from the Effective Date, neither Party shall engage in any collaboration that would directly compete with or diminish the value of the Project.

This exclusivity applies only to projects of a substantially similar nature and does not restrict either Party's other creative endeavors.`,
        isOptional: true,
        clauseId: 'exclusivity'
      },
      {
        id: 'credits_section',
        heading: '6. CREDITS AND ATTRIBUTION',
        content: `The Parties agree to the following credit requirements for all releases and promotional materials:

Party A Credit: {{party_a_credit}}
Party B Credit: {{party_b_credit}}

Both Parties shall ensure that proper credits are included on all platforms and in all metadata where technically feasible.`,
        isOptional: true,
        clauseId: 'credit_requirements'
      },
      {
        id: 'termination_section',
        heading: '7. TERMINATION',
        content: `Either Party may terminate this Agreement by providing {{notice_period}} days written notice to the other Party.

Upon termination:
a) All revenues earned prior to termination shall be divided according to Section 3
b) Neither Party may use the other's name or likeness for new promotions
c) Existing licenses and agreements shall remain in effect

If a Party terminates without cause before the Project is complete, that Party forfeits their right to any advance payments not yet recouped.`,
        isOptional: true,
        clauseId: 'termination'
      },
      {
        id: 'general',
        heading: '8. GENERAL PROVISIONS',
        content: `Entire Agreement: This Agreement constitutes the entire understanding between the Parties and supersedes all prior negotiations and agreements.

Amendments: This Agreement may only be amended in writing signed by both Parties.

Governing Law: This Agreement shall be governed by the laws of England and Wales.

Disputes: Any disputes arising from this Agreement shall first be addressed through good faith negotiation. If unresolved after 30 days, the Parties agree to submit to mediation before pursuing legal action.`
      },
      {
        id: 'signatures',
        heading: '9. SIGNATURES',
        content: `IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.


_____________________________
{{party_a_name}}
Date: _______________


_____________________________
{{party_b_name}}
Date: _______________`
      }
    ]
  }
};
```

### Seed Script

```typescript
// server/scripts/seed-templates.ts
import { db } from '../db';
import { contractTemplates } from '../../shared/schema';
import { artistAgreementTemplate } from '../data/templates/artist-agreement';

export async function seedTemplates(): Promise<void> {
  console.log('[SEED] Seeding contract templates...');

  // Check if template already exists
  const existing = await db.query.contractTemplates.findFirst({
    where: eq(contractTemplates.name, artistAgreementTemplate.name)
  });

  if (existing) {
    console.log('[SEED] Artist Agreement template already exists');
    return;
  }

  await db.insert(contractTemplates).values(artistAgreementTemplate);
  console.log('[SEED] Artist Agreement template created');
}
```

## Definition of Done

- [ ] Template definition created in code
- [ ] Template seeded to database
- [ ] All 9 sections render correctly
- [ ] All fields have proper validation
- [ ] Optional clauses toggle sections on/off
- [ ] Revenue splits validate to 100%
- [ ] Sample data renders professional output

## Testing Checklist

### Unit Tests

- [ ] All required fields defined
- [ ] Field validations work (min/max, patterns)
- [ ] Revenue split adds to 100%
- [ ] Optional sections filter correctly

### Integration Tests

- [ ] Template seeds successfully
- [ ] Template retrieved with full content
- [ ] Render with sample data produces valid HTML

### Manual Testing

- [ ] Review template language with legal placeholder
- [ ] Verify professional formatting
- [ ] Check all variables substitute correctly

## Sample Data for Testing

```typescript
const sampleData = {
  fields: {
    party_a_name: 'Jane Smith p/k/a "J. Melody"',
    party_a_address: '123 Music Lane, London, UK',
    party_a_email: 'jane@example.com',
    party_b_name: 'John Doe p/k/a "DJ Thunder"',
    party_b_address: '456 Beat Street, Manchester, UK',
    party_b_email: 'john@example.com',
    project_title: 'Summer Nights',
    project_description: 'A collaborative single featuring vocals by J. Melody and production by DJ Thunder.',
    party_a_split: 50,
    party_b_split: 50,
    advance_amount: 500,
    effective_date: new Date('2025-01-15'),
    delivery_date: new Date('2025-03-01'),
    territory: 'worldwide',
    exclusivity_period: 6,
    party_a_credit: 'Vocals by J. Melody',
    party_b_credit: 'Produced by DJ Thunder',
    notice_period: 30
  },
  enabledClauses: ['credit_requirements', 'termination']
};
```

## Related Documents

- [Epic 3 Tech Spec](./tech-spec-epic-3.md)
- [Story 3.1: Template Data Model](./3-1-template-data-model-and-storage.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create template definition file**
  - [ ] Create server/data/templates/artist-agreement.ts
  - [ ] Define all party fields (Party A and B)
  - [ ] Define project fields
  - [ ] Define financial terms fields
  - [ ] Define dates and territory fields

- [ ] **Task 2: Define optional clauses**
  - [ ] Add exclusivity clause with period field
  - [ ] Add credit requirements clause with credit name fields
  - [ ] Add termination clause with notice period field

- [ ] **Task 3: Create template content sections**
  - [ ] Write parties section
  - [ ] Write project scope section
  - [ ] Write revenue sharing section
  - [ ] Write IP rights section
  - [ ] Write optional exclusivity section
  - [ ] Write optional credits section
  - [ ] Write optional termination section
  - [ ] Write general provisions section
  - [ ] Write signatures section

- [ ] **Task 4: Create seed script**
  - [ ] Create server/scripts/seed-templates.ts
  - [ ] Implement seedTemplates function
  - [ ] Check for existing template before insert
  - [ ] Export for use in startup

- [ ] **Task 5: Write tests**
  - [ ] Unit tests for field validations
  - [ ] Test revenue split validates to 100%
  - [ ] Integration test for template seeding
  - [ ] Render test with sample data

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
