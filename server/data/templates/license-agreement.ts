/**
 * License Agreement Template
 * Epic 3: Contract Templates System - Story 3.3
 *
 * For music/content licensing covering usage rights, territories, and royalties.
 */

import type { TemplateDefinition } from "./artist-agreement";

export const licenseAgreementTemplate: TemplateDefinition = {
  name: 'Music License Agreement',
  description: 'For licensing music or content. Covers exclusive/non-exclusive rights, sync, mechanical, and usage restrictions.',
  category: 'licensing',
  isActive: true,
  sortOrder: 2,
  version: 1,

  fields: [
    // Licensor (Rights Holder)
    {
      id: 'licensor_name',
      label: 'Licensor Name (Rights Holder)',
      type: 'text',
      required: true,
      placeholder: 'e.g., Jane Smith Music Ltd',
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
      placeholder: 'e.g., Production Company Inc',
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
      placeholder: 'e.g., "Summer Vibes"',
      group: 'Licensed Work'
    },
    {
      id: 'work_description',
      label: 'Work Description',
      type: 'textarea',
      required: true,
      placeholder: 'Describe the work being licensed...',
      group: 'Licensed Work'
    },

    // License Type
    {
      id: 'license_type',
      label: 'License Type',
      type: 'select',
      required: true,
      defaultValue: 'non_exclusive',
      options: [
        { value: 'exclusive', label: 'Exclusive' },
        { value: 'non_exclusive', label: 'Non-Exclusive' },
        { value: 'sync', label: 'Synchronization (Sync)' },
        { value: 'mechanical', label: 'Mechanical' },
        { value: 'master', label: 'Master Use' }
      ],
      group: 'License Terms'
    },
    {
      id: 'permitted_use',
      label: 'Permitted Use',
      type: 'textarea',
      required: true,
      placeholder: 'e.g., Background music in promotional video, streaming platforms...',
      helpText: 'Describe exactly how the licensee may use the work',
      group: 'License Terms'
    },

    // Territory and Duration
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
        { value: 'custom', label: 'Custom (specify in permitted use)' }
      ],
      group: 'Territory & Duration'
    },
    {
      id: 'effective_date',
      label: 'License Start Date',
      type: 'date',
      required: true,
      group: 'Territory & Duration'
    },
    {
      id: 'expiry_date',
      label: 'License End Date',
      type: 'date',
      required: false,
      helpText: 'Leave blank for perpetual license',
      group: 'Territory & Duration'
    },

    // Fees
    {
      id: 'license_fee',
      label: 'License Fee',
      type: 'currency',
      required: true,
      group: 'Financial Terms'
    },
    {
      id: 'payment_terms',
      label: 'Payment Terms',
      type: 'select',
      required: true,
      defaultValue: 'upfront',
      options: [
        { value: 'upfront', label: 'Full payment upfront' },
        { value: 'installments', label: '50% upfront, 50% on delivery' },
        { value: 'net_30', label: 'Net 30 days' },
        { value: 'net_60', label: 'Net 60 days' }
      ],
      group: 'Financial Terms'
    }
  ],

  optionalClauses: [
    {
      id: 'royalties',
      name: 'Ongoing Royalties',
      description: 'Additional royalty payments based on usage',
      defaultEnabled: false,
      fields: [
        {
          id: 'royalty_rate',
          label: 'Royalty Rate (%)',
          type: 'number',
          required: true,
          defaultValue: 5,
          validation: { min: 0, max: 100 }
        },
        {
          id: 'royalty_basis',
          label: 'Royalty Basis',
          type: 'select',
          required: true,
          options: [
            { value: 'gross', label: 'Gross Revenue' },
            { value: 'net', label: 'Net Revenue' },
            { value: 'streams', label: 'Per Stream/Play' }
          ]
        }
      ]
    },
    {
      id: 'attribution',
      name: 'Attribution Requirements',
      description: 'Credit requirements for the licensor',
      defaultEnabled: true,
      fields: [
        {
          id: 'attribution_text',
          label: 'Required Credit Text',
          type: 'text',
          required: true,
          placeholder: 'e.g., "Music by Jane Smith"'
        }
      ]
    },
    {
      id: 'restrictions',
      name: 'Usage Restrictions',
      description: 'Specific prohibited uses',
      defaultEnabled: true,
      fields: [
        {
          id: 'prohibited_uses',
          label: 'Prohibited Uses',
          type: 'textarea',
          required: true,
          placeholder: 'e.g., Political advertising, adult content...'
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
        content: `This Music License Agreement ("Agreement") is entered into as of {{effective_date}} by and between:

{{licensor_name}} ("Licensor")
Address: {{licensor_address}}
Email: {{licensor_email}}

AND

{{licensee_name}} ("Licensee")
Address: {{licensee_address}}
Email: {{licensee_email}}`
      },
      {
        id: 'grant',
        heading: '2. GRANT OF LICENSE',
        content: `Subject to the terms of this Agreement, Licensor hereby grants to Licensee a {{license_type}} license to use the following work:

Work Title: {{work_title}}
Description: {{work_description}}

The license covers the following territory: {{territory}}

This license is effective from {{effective_date}} and shall remain in effect until {{expiry_date}}.`
      },
      {
        id: 'permitted_use',
        heading: '3. PERMITTED USE',
        content: `Licensee may use the Work solely for the following purposes:

{{permitted_use}}

Any use beyond the scope defined above requires prior written consent from the Licensor.`
      },
      {
        id: 'fees',
        heading: '4. LICENSE FEE AND PAYMENT',
        content: `In consideration for the rights granted herein, Licensee agrees to pay Licensor a license fee of {{license_fee}}.

Payment Terms: {{payment_terms}}

All payments shall be made in GBP unless otherwise agreed in writing.`
      },
      {
        id: 'royalties_section',
        heading: '5. ROYALTIES',
        content: `In addition to the license fee, Licensee shall pay Licensor ongoing royalties at a rate of {{royalty_rate}}% based on {{royalty_basis}}.

Royalty payments shall be made quarterly, within 30 days of each quarter end, accompanied by a statement showing the calculation basis.`,
        isOptional: true,
        clauseId: 'royalties'
      },
      {
        id: 'attribution_section',
        heading: '6. ATTRIBUTION',
        content: `Licensee agrees to provide the following credit to Licensor in connection with any use of the Work:

{{attribution_text}}

This credit shall appear in all reasonable opportunities where credits are customarily displayed.`,
        isOptional: true,
        clauseId: 'attribution'
      },
      {
        id: 'restrictions_section',
        heading: '7. RESTRICTIONS',
        content: `The following uses of the Work are expressly prohibited:

{{prohibited_uses}}

Any violation of these restrictions shall constitute a material breach of this Agreement.`,
        isOptional: true,
        clauseId: 'restrictions'
      },
      {
        id: 'ownership',
        heading: '8. OWNERSHIP',
        content: `Licensor retains all ownership rights in and to the Work, including all copyrights, trademarks, and other intellectual property rights. This Agreement does not transfer any ownership rights to Licensee.

Licensee shall not register any trademarks or copyrights that incorporate the Work without Licensor's prior written consent.`
      },
      {
        id: 'warranties',
        heading: '9. WARRANTIES AND INDEMNIFICATION',
        content: `Licensor warrants that:
a) They have the full right and authority to grant this license
b) The Work does not infringe any third-party rights
c) There are no outstanding claims against the Work

Each party agrees to indemnify the other against any claims arising from a breach of their warranties under this Agreement.`
      },
      {
        id: 'termination',
        heading: '10. TERMINATION',
        content: `This Agreement may be terminated:
a) By mutual written agreement of the parties
b) By either party upon 30 days written notice if the other party breaches any material term
c) Automatically upon expiration of the license term

Upon termination, Licensee shall cease all use of the Work and destroy any copies in their possession.`
      },
      {
        id: 'general',
        heading: '11. GENERAL PROVISIONS',
        content: `Entire Agreement: This Agreement constitutes the entire understanding between the parties.

Amendments: This Agreement may only be amended in writing signed by both parties.

Governing Law: This Agreement shall be governed by the laws of England and Wales.

Severability: If any provision is found unenforceable, the remaining provisions shall continue in effect.`
      },
      {
        id: 'signatures',
        heading: '12. SIGNATURES',
        content: `IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.


_____________________________
{{licensor_name}} (Licensor)
Date: _______________


_____________________________
{{licensee_name}} (Licensee)
Date: _______________`
      }
    ]
  }
};
