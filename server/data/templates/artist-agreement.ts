/**
 * Artist Collaboration Agreement Template
 * Epic 3: Contract Templates System
 *
 * The most commonly used template for collaborations between artists, producers, and creatives.
 *
 * Updated to use PersonaGroups for dynamic collaborators (2-10).
 */

import type { TemplateContent, TemplateField, OptionalClause, PersonaGroup } from "../../../shared/types/templates";

export interface TemplateDefinition {
  name: string;
  description: string;
  category: 'artist' | 'licensing' | 'touring' | 'production' | 'business';
  isActive: boolean;
  sortOrder: number;
  version: number;
  fields: TemplateField[];
  optionalClauses: OptionalClause[];
  personaGroups?: PersonaGroup[];
  content: TemplateContent;
}

export const artistAgreementTemplate: TemplateDefinition = {
  name: 'Artist Collaboration Agreement',
  description: 'For collaborations between artists, producers, or other creatives. Covers revenue splits, credits, and rights.',
  category: 'artist',
  isActive: true,
  sortOrder: 1,
  version: 2,

  fields: [
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
      group: 'Dates',
      validation: {
        afterField: 'effective_date',
        afterFieldMessage: 'Expected completion date must be after agreement start date'
      }
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
      description: 'Prevents parties from releasing similar work during the collaboration period',
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
      id: 'advance_payment',
      name: 'Advance Payment',
      description: 'Include an advance payment to be recouped from revenues',
      defaultEnabled: false,
      fields: [
        {
          id: 'advance_amount',
          label: 'Advance Amount',
          type: 'currency',
          required: true,
          defaultValue: 0
        },
        {
          id: 'advance_recipient',
          label: 'Advance Recipient',
          type: 'text',
          required: true,
          placeholder: 'Name of party receiving advance'
        }
      ]
    },
    {
      id: 'termination',
      name: 'Early Termination Rights',
      description: 'Allows parties to terminate with written notice',
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

  personaGroups: [
    {
      id: 'parties',
      singularName: 'Party',
      pluralName: 'Parties',
      description: 'Add all collaborators to this agreement. Revenue splits should total 100%.',
      minCount: 2,
      maxCount: 10,
      fields: [
        {
          id: 'name',
          label: 'Name / Artist Name',
          type: 'text',
          required: true,
          placeholder: 'e.g., Jane Smith p/k/a "J. Melody"'
        },
        {
          id: 'address',
          label: 'Address',
          type: 'textarea',
          required: true
        },
        {
          id: 'email',
          label: 'Email',
          type: 'email',
          required: true
        },
        {
          id: 'phone',
          label: 'Phone',
          type: 'text',
          required: false
        },
        {
          id: 'revenue_split',
          label: 'Revenue Share (%)',
          type: 'number',
          required: true,
          defaultValue: 50,
          validation: { min: 0, max: 100 }
        },
        {
          id: 'credit',
          label: 'Credit Name',
          type: 'text',
          required: false,
          placeholder: 'e.g., "Produced by J. Melody"'
        },
        {
          id: 'contribution',
          label: 'Contribution',
          type: 'text',
          required: false,
          placeholder: 'e.g., vocals, production, writing'
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
        content: `This Artist Collaboration Agreement ("Agreement") is entered into as of {{effective_date}} by and between the Parties listed in this agreement.

[Party details are captured in the Parties section of this form]

All parties are collectively referred to as the "Parties."`
      },
      {
        id: 'project',
        heading: '2. PROJECT SCOPE',
        content: `The Parties agree to collaborate on the following project:

Project Title: {{project_title}}

Description: {{project_description}}

The collaboration shall commence on {{effective_date}} with deliverables expected to be completed by {{delivery_date}}.`
      },
      {
        id: 'revenue',
        heading: '3. REVENUE SHARING',
        content: `All revenues derived from the Project, including but not limited to streaming royalties, synchronization fees, performance royalties, and mechanical royalties, shall be divided according to each Party's revenue share percentage as specified in this agreement.

[Revenue splits are captured in the Parties section - splits must total 100%]

Each Party shall be responsible for their own taxes on income received under this Agreement.`
      },
      {
        id: 'advance',
        heading: '4. ADVANCE PAYMENT',
        content: `An advance payment of {{advance_amount}} shall be paid to {{advance_recipient}}.

This advance is recoupable from the receiving Party's share of revenues.`,
        isOptional: true,
        clauseId: 'advance_payment'
      },
      {
        id: 'rights',
        heading: '5. INTELLECTUAL PROPERTY RIGHTS',
        content: `The Parties shall jointly own all intellectual property created as part of this Project. No Party may license, sell, or transfer their rights in the Project without the written consent of all other Parties.

Territory: This Agreement covers the exploitation of the Project in {{territory}}.

Each Party retains ownership of any pre-existing materials they contribute to the Project.`
      },
      {
        id: 'exclusivity_section',
        heading: '6. EXCLUSIVITY',
        content: `During the exclusivity period of {{exclusivity_period}} months from the Effective Date, no Party shall engage in any collaboration that would directly compete with or diminish the value of the Project.

This exclusivity applies only to projects of a substantially similar nature and does not restrict any Party's other creative endeavors.`,
        isOptional: true,
        clauseId: 'exclusivity'
      },
      {
        id: 'credits_section',
        heading: '7. CREDITS AND ATTRIBUTION',
        content: `The Parties agree to proper credit requirements for all releases and promotional materials.

[Credit names are specified for each Party in the form above]

All Parties shall ensure that proper credits are included on all platforms and in all metadata where technically feasible.`
      },
      {
        id: 'termination_section',
        heading: '8. TERMINATION',
        content: `Any Party may terminate this Agreement by providing {{notice_period}} days written notice to all other Parties.

Upon termination:
a) All revenues earned prior to termination shall be divided according to Section 3
b) No Party may use another Party's name or likeness for new promotions
c) Existing licenses and agreements shall remain in effect

If a Party terminates without cause before the Project is complete, that Party forfeits their right to any advance payments not yet recouped.`,
        isOptional: true,
        clauseId: 'termination'
      },
      {
        id: 'general',
        heading: '9. GENERAL PROVISIONS',
        content: `Entire Agreement: This Agreement constitutes the entire understanding between the Parties and supersedes all prior negotiations and agreements.

Amendments: This Agreement may only be amended in writing signed by all Parties.

Governing Law: This Agreement shall be governed by the laws of England and Wales.

Disputes: Any disputes arising from this Agreement shall first be addressed through good faith negotiation. If unresolved after 30 days, the Parties agree to submit to mediation before pursuing legal action.`
      },
      {
        id: 'signatures',
        heading: '10. SIGNATURES',
        content: `IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.

[Signature lines for each Party listed above]

Each Party should sign and date below their printed name to confirm their agreement to the terms stated herein.`
      }
    ]
  }
};

/**
 * Sample data for testing template rendering
 */
export const artistAgreementSampleData = {
  fields: {
    project_title: 'Summer Nights',
    project_description: 'A collaborative single featuring multiple artists.',
    effective_date: new Date('2025-01-15'),
    delivery_date: new Date('2025-03-01'),
    territory: 'worldwide',
    exclusivity_period: 6,
    advance_amount: 500,
    advance_recipient: 'J. Melody',
    notice_period: 30
  },
  enabledClauses: ['termination'],
  personas: {
    parties: [
      {
        id: 'party_1',
        values: {
          name: 'Jane Smith p/k/a "J. Melody"',
          address: '123 Music Lane, London, UK',
          email: 'jane@example.com',
          phone: '+44 123 456 7890',
          revenue_split: 50,
          credit: 'Vocals by J. Melody',
          contribution: 'vocals, writing'
        }
      },
      {
        id: 'party_2',
        values: {
          name: 'John Doe p/k/a "DJ Thunder"',
          address: '456 Beat Street, Manchester, UK',
          email: 'john@example.com',
          phone: '+44 098 765 4321',
          revenue_split: 50,
          credit: 'Produced by DJ Thunder',
          contribution: 'production, mixing'
        }
      }
    ]
  }
};
