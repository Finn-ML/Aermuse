/**
 * Sample Agreement Template
 * Epic 3: Contract Templates System - Story 3.5
 *
 * For sample clearance covering sample usage, royalties, and credit requirements.
 */

import type { TemplateDefinition } from "./artist-agreement";

export const sampleAgreementTemplate: TemplateDefinition = {
  name: 'Sample Clearance Agreement',
  description: 'For clearing samples. Covers sample usage rights, royalty arrangements, and credit requirements for masters and publishing.',
  category: 'production',
  isActive: true,
  sortOrder: 4,
  version: 1,

  fields: [
    // Sample Owner
    {
      id: 'owner_name',
      label: 'Sample Owner Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Original Artist LLC',
      group: 'Sample Owner'
    },
    {
      id: 'owner_address',
      label: 'Owner Address',
      type: 'textarea',
      required: true,
      group: 'Sample Owner'
    },
    {
      id: 'owner_email',
      label: 'Owner Email',
      type: 'email',
      required: true,
      group: 'Sample Owner'
    },

    // Sampling Party
    {
      id: 'sampler_name',
      label: 'Sampling Artist Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., New Artist',
      group: 'Sampling Artist'
    },
    {
      id: 'sampler_address',
      label: 'Sampling Artist Address',
      type: 'textarea',
      required: true,
      group: 'Sampling Artist'
    },
    {
      id: 'sampler_email',
      label: 'Sampling Artist Email',
      type: 'email',
      required: true,
      group: 'Sampling Artist'
    },

    // Original Work
    {
      id: 'original_title',
      label: 'Original Work Title',
      type: 'text',
      required: true,
      placeholder: 'e.g., "Classic Groove"',
      group: 'Original Work'
    },
    {
      id: 'original_artist',
      label: 'Original Performing Artist',
      type: 'text',
      required: true,
      group: 'Original Work'
    },
    {
      id: 'original_writers',
      label: 'Original Songwriters',
      type: 'textarea',
      required: true,
      placeholder: 'List all writers with ownership percentages',
      group: 'Original Work'
    },
    {
      id: 'sample_description',
      label: 'Sample Description',
      type: 'textarea',
      required: true,
      placeholder: 'e.g., 4-bar drum loop from 0:32-0:40',
      helpText: 'Describe exactly what is being sampled',
      group: 'Original Work'
    },

    // New Work
    {
      id: 'new_title',
      label: 'New Work Title',
      type: 'text',
      required: true,
      placeholder: 'e.g., "Modern Remix"',
      group: 'New Work'
    },
    {
      id: 'new_artist',
      label: 'New Work Artist',
      type: 'text',
      required: true,
      group: 'New Work'
    },

    // Rights
    {
      id: 'rights_type',
      label: 'Rights Covered',
      type: 'select',
      required: true,
      defaultValue: 'both',
      options: [
        { value: 'master', label: 'Master Recording Only' },
        { value: 'publishing', label: 'Publishing Only' },
        { value: 'both', label: 'Both Master and Publishing' }
      ],
      group: 'Rights'
    },
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
        { value: 'north_america', label: 'North America' }
      ],
      group: 'Rights'
    },

    // Financial
    {
      id: 'upfront_fee',
      label: 'Upfront Clearance Fee',
      type: 'currency',
      required: true,
      group: 'Financial Terms'
    },
    {
      id: 'effective_date',
      label: 'Effective Date',
      type: 'date',
      required: true,
      group: 'Financial Terms'
    }
  ],

  optionalClauses: [
    {
      id: 'master_royalty',
      name: 'Master Royalty',
      description: 'Ongoing royalty on master recording',
      defaultEnabled: true,
      fields: [
        {
          id: 'master_royalty_rate',
          label: 'Master Royalty Rate (%)',
          type: 'number',
          required: true,
          defaultValue: 3,
          validation: { min: 0, max: 50 },
          helpText: 'Percentage of master recording royalties'
        }
      ]
    },
    {
      id: 'publishing_share',
      name: 'Publishing Share',
      description: 'Share of publishing/songwriting',
      defaultEnabled: true,
      fields: [
        {
          id: 'publishing_percentage',
          label: 'Publishing Ownership (%)',
          type: 'number',
          required: true,
          defaultValue: 15,
          validation: { min: 0, max: 100 },
          helpText: 'Percentage of new song publishing credited to original writers'
        }
      ]
    },
    {
      id: 'credit',
      name: 'Credit Requirements',
      description: 'How original work must be credited',
      defaultEnabled: true,
      fields: [
        {
          id: 'credit_text',
          label: 'Required Credit',
          type: 'text',
          required: true,
          placeholder: 'e.g., "Contains a sample of Classic Groove by Original Artist"'
        }
      ]
    },
    {
      id: 'restrictions',
      name: 'Usage Restrictions',
      description: 'Restrictions on how sample may be used',
      defaultEnabled: false,
      fields: [
        {
          id: 'restriction_details',
          label: 'Restriction Details',
          type: 'textarea',
          required: true,
          placeholder: 'e.g., Not for use in advertising, political campaigns...'
        }
      ]
    }
  ],

  content: {
    title: 'SAMPLE CLEARANCE AGREEMENT',
    sections: [
      {
        id: 'parties',
        heading: '1. PARTIES',
        content: `This Sample Clearance Agreement ("Agreement") is entered into as of {{effective_date}} by and between:

{{owner_name}} ("Owner")
Address: {{owner_address}}
Email: {{owner_email}}

AND

{{sampler_name}} ("Sampler")
Address: {{sampler_address}}
Email: {{sampler_email}}`
      },
      {
        id: 'original_work',
        heading: '2. ORIGINAL WORK',
        content: `Owner is the rights holder of the following original work:

Title: {{original_title}}
Performing Artist: {{original_artist}}
Songwriters: {{original_writers}}

The portion being sampled is described as:
{{sample_description}}`
      },
      {
        id: 'new_work',
        heading: '3. NEW WORK',
        content: `Sampler intends to use the above sample in the following new work:

Title: {{new_title}}
Artist: {{new_artist}}

Owner hereby grants Sampler the right to incorporate the sample into the New Work.`
      },
      {
        id: 'grant',
        heading: '4. GRANT OF RIGHTS',
        content: `Owner grants to Sampler a non-exclusive license to use the sample in the New Work.

Rights Covered: {{rights_type}}
Territory: {{territory}}

This license permits Sampler to reproduce, distribute, and publicly perform the New Work incorporating the sample.`
      },
      {
        id: 'fee',
        heading: '5. CLEARANCE FEE',
        content: `In consideration for the rights granted herein, Sampler agrees to pay Owner an upfront clearance fee of {{upfront_fee}}.

This fee is payable upon execution of this Agreement.`
      },
      {
        id: 'master_royalty_section',
        heading: '6. MASTER ROYALTY',
        content: `In addition to the upfront fee, Sampler agrees to pay Owner a royalty of {{master_royalty_rate}}% of all net receipts from the exploitation of the master recording of the New Work.

Royalty statements and payments shall be rendered quarterly, within 45 days of each quarter end.`,
        isOptional: true,
        clauseId: 'master_royalty'
      },
      {
        id: 'publishing_section',
        heading: '7. PUBLISHING SHARE',
        content: `The original writers shall receive {{publishing_percentage}}% of the publishing/songwriting ownership of the New Work.

This share shall be administered by Owner's designated publishing administrator and shall participate in all income streams from the New Work's composition.`,
        isOptional: true,
        clauseId: 'publishing_share'
      },
      {
        id: 'credit_section',
        heading: '8. CREDIT',
        content: `Sampler agrees to include the following credit on all releases and in all metadata:

{{credit_text}}

Failure to include proper credit shall constitute a material breach of this Agreement.`,
        isOptional: true,
        clauseId: 'credit'
      },
      {
        id: 'restrictions_section',
        heading: '9. RESTRICTIONS',
        content: `The following restrictions apply to the use of the sample:

{{restriction_details}}

Any use in violation of these restrictions shall require additional clearance and fees.`,
        isOptional: true,
        clauseId: 'restrictions'
      },
      {
        id: 'warranties',
        heading: '10. WARRANTIES',
        content: `Owner warrants that:
a) They have full right and authority to grant the rights herein
b) The original work does not infringe any third-party rights
c) They have obtained all necessary consents from co-owners and publishers

Sampler warrants that they will comply with all terms of this Agreement.`
      },
      {
        id: 'general',
        heading: '11. GENERAL PROVISIONS',
        content: `Entire Agreement: This Agreement constitutes the entire understanding between the parties.

Amendments: This Agreement may only be amended in writing signed by both parties.

Governing Law: This Agreement shall be governed by the laws of England and Wales.

No Assignment: Sampler may not assign this license without Owner's prior written consent.`
      },
      {
        id: 'signatures',
        heading: '12. SIGNATURES',
        content: `IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.


_____________________________
{{owner_name}} (Owner)
Date: _______________


_____________________________
{{sampler_name}} (Sampler)
Date: _______________`
      }
    ]
  }
};
