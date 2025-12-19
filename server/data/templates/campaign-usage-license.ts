/**
 * Campaign Usage License & Brand Deliverables Agreement Template
 *
 * Outlines how a Brand may use an Artist's image, music, likeness, and creative
 * assets for campaigns, including deliverables, fees, timelines, and rights.
 */

import type { TemplateDefinition } from './artist-agreement';

export const campaignUsageLicenseTemplate: TemplateDefinition = {
  name: 'Campaign Usage License & Brand Deliverables',
  description: 'License agreement for brand campaigns outlining usage rights for artist image, music, and likeness, plus deliverables, fees, and timelines.',
  category: 'licensing',
  isActive: true,
  sortOrder: 15,
  version: 1,

  fields: [
    // Artist Details
    {
      id: 'artist_name',
      label: 'Artist Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Jane Smith p/k/a "J. Melody"',
      group: 'Artist Details'
    },
    {
      id: 'artist_email',
      label: 'Artist Email',
      type: 'email',
      required: true,
      group: 'Artist Details'
    },
    {
      id: 'artist_handle',
      label: 'Artist Social Handle',
      type: 'text',
      required: false,
      placeholder: '@jmelody',
      group: 'Artist Details'
    },

    // Brand Details
    {
      id: 'brand_name',
      label: 'Brand Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., "Acme Fashion Co."',
      group: 'Brand Details'
    },
    {
      id: 'brand_representative',
      label: 'Brand Representative',
      type: 'text',
      required: true,
      group: 'Brand Details'
    },
    {
      id: 'brand_email',
      label: 'Brand Email',
      type: 'email',
      required: true,
      group: 'Brand Details'
    },
    {
      id: 'brand_contact',
      label: 'Brand Contact Number',
      type: 'text',
      required: false,
      group: 'Brand Details'
    },

    // Agreement Details
    {
      id: 'effective_date',
      label: 'Agreement Date',
      type: 'date',
      required: true,
      group: 'Agreement Details'
    },

    // Deliverables
    {
      id: 'deliverables',
      label: 'Artist Deliverables',
      type: 'textarea',
      required: true,
      placeholder: 'e.g., 2x social media posts, 1x video appearance, product placement in music video',
      helpText: 'List all deliverables the artist will provide',
      group: 'Deliverables'
    },

    // Usage Rights
    {
      id: 'usage_social_media',
      label: 'Social Media Usage',
      type: 'select',
      required: true,
      options: [
        { value: 'yes', label: 'Yes - Approved' },
        { value: 'no', label: 'No - Not Approved' }
      ],
      group: 'Brand Usage Rights'
    },
    {
      id: 'usage_website',
      label: 'Website Usage',
      type: 'select',
      required: true,
      options: [
        { value: 'yes', label: 'Yes - Approved' },
        { value: 'no', label: 'No - Not Approved' }
      ],
      group: 'Brand Usage Rights'
    },
    {
      id: 'usage_paid_ads',
      label: 'Paid Advertising',
      type: 'select',
      required: true,
      options: [
        { value: 'yes', label: 'Yes - Approved' },
        { value: 'no', label: 'No - Not Approved' }
      ],
      group: 'Brand Usage Rights'
    },
    {
      id: 'usage_print',
      label: 'Print Materials',
      type: 'select',
      required: true,
      options: [
        { value: 'yes', label: 'Yes - Approved' },
        { value: 'no', label: 'No - Not Approved' }
      ],
      group: 'Brand Usage Rights'
    },
    {
      id: 'usage_other',
      label: 'Other Usage Rights',
      type: 'text',
      required: false,
      placeholder: 'e.g., Retail screens, product packaging, PR',
      group: 'Brand Usage Rights'
    },

    // Music Usage
    {
      id: 'music_usage_type',
      label: 'Music Usage Type',
      type: 'select',
      required: true,
      options: [
        { value: 'none', label: 'No Music Usage' },
        { value: 'snippet', label: 'Snippet Use Only' },
        { value: 'full_track', label: 'Full Track Use' },
        { value: 'instrumental', label: 'Instrumental Only' },
        { value: 'custom_edit', label: 'Custom Edit' }
      ],
      group: 'Music Usage Rights'
    },
    {
      id: 'music_territory',
      label: 'Music Usage Territory',
      type: 'text',
      required: false,
      defaultValue: 'Worldwide',
      group: 'Music Usage Rights'
    },

    // Fees & Payment
    {
      id: 'campaign_fee',
      label: 'Campaign Fee',
      type: 'currency',
      required: true,
      group: 'Fees & Payment'
    },
    {
      id: 'payment_terms',
      label: 'Payment Terms',
      type: 'select',
      required: true,
      options: [
        { value: 'upfront', label: 'Upfront (100%)' },
        { value: '50_50', label: '50/50 (Half upfront, half on delivery)' },
        { value: 'net_30', label: 'Net 30 (Within 30 days)' },
        { value: 'net_14', label: 'Net 14 (Within 14 days)' }
      ],
      group: 'Fees & Payment'
    },
    {
      id: 'additional_fees',
      label: 'Additional Usage Fees',
      type: 'text',
      required: false,
      placeholder: 'e.g., Extended usage fee of £500/month',
      group: 'Fees & Payment'
    },

    // Usage Period
    {
      id: 'usage_period',
      label: 'Usage Period',
      type: 'select',
      required: true,
      options: [
        { value: '30_days', label: '30 Days' },
        { value: '60_days', label: '60 Days' },
        { value: '90_days', label: '90 Days' },
        { value: '6_months', label: '6 Months' },
        { value: '1_year', label: '1 Year' },
        { value: 'perpetual', label: 'Perpetual' }
      ],
      group: 'Usage Period'
    },

    // Governing Law
    {
      id: 'governing_country',
      label: 'Governing Law Country',
      type: 'text',
      required: true,
      defaultValue: 'United Kingdom',
      group: 'Legal'
    }
  ],

  optionalClauses: [
    {
      id: 'exclusivity',
      name: 'Exclusivity Clause',
      description: 'Artist exclusivity within a product category for a specified duration',
      defaultEnabled: false,
      fields: [
        {
          id: 'exclusivity_category',
          label: 'Exclusivity Category',
          type: 'text',
          required: true,
          placeholder: 'e.g., Sportswear, Beverages, Fashion'
        },
        {
          id: 'exclusivity_duration',
          label: 'Exclusivity Duration',
          type: 'text',
          required: true,
          placeholder: 'e.g., 6 months, 1 year'
        }
      ]
    },
    {
      id: 'content_approval',
      name: 'Content Approval Requirement',
      description: 'All content must be approved by Artist before posting',
      defaultEnabled: true,
      fields: []
    },
    {
      id: 'ai_restrictions',
      name: 'AI & Technology Restrictions',
      description: 'Prohibits use of artist likeness for AI training or synthetic generation',
      defaultEnabled: true,
      fields: []
    }
  ],

  content: {
    title: 'CAMPAIGN USAGE LICENSE & BRAND DELIVERABLES AGREEMENT',
    sections: [
      {
        id: 'intro',
        heading: 'INTRODUCTION',
        content: `This Campaign Usage License outlines how the Brand may use the Artist's image, music, likeness, and creative assets. It also sets out the required deliverables, fees, timelines, and rights for the collaboration.

This Agreement is entered into as of {{effective_date}}.`
      },
      {
        id: 'parties',
        heading: '1. PARTIES',
        content: `This Agreement is between the Artist and the Brand, including their teams and representatives.

ARTIST: {{artist_name}}
Email: {{artist_email}}
Handle: {{artist_handle}}

BRAND: {{brand_name}}
Representative: {{brand_representative}}
Email: {{brand_email}}
Contact: {{brand_contact}}`
      },
      {
        id: 'purpose',
        heading: '2. PURPOSE OF LICENSE',
        content: `The Brand is engaging the Artist for campaign-related usage of image, name, likeness, performance, or music.`
      },
      {
        id: 'deliverables',
        heading: '3. ARTIST DELIVERABLES',
        content: `The Artist agrees to provide the following deliverables:

{{deliverables}}`
      },
      {
        id: 'brand_usage',
        heading: '4. BRAND USAGE RIGHTS',
        content: `Allowed usage:

Social Media: {{usage_social_media}}
Website: {{usage_website}}
Paid Ads: {{usage_paid_ads}}
Print: {{usage_print}}
Other: {{usage_other}}`
      },
      {
        id: 'music_usage',
        heading: '5. MUSIC USAGE RIGHTS',
        content: `Music Usage Type: {{music_usage_type}}
Territory: {{music_territory}}`
      },
      {
        id: 'fees',
        heading: '6. FEES & PAYMENT TERMS',
        content: `Campaign Fee: {{campaign_fee}}
Payment Terms: {{payment_terms}}
Additional Usage Fees: {{additional_fees}}`
      },
      {
        id: 'usage_period',
        heading: '7. USAGE PERIOD',
        content: `The Brand may use the licensed content for: {{usage_period}}`
      },
      {
        id: 'exclusivity',
        heading: '8. EXCLUSIVITY',
        content: `Category: {{exclusivity_category}}
Duration: {{exclusivity_duration}}`,
        isOptional: true,
        clauseId: 'exclusivity'
      },
      {
        id: 'content_approval',
        heading: '9. CONTENT APPROVAL',
        content: `All content featuring the Artist must be approved before posting.`,
        isOptional: true,
        clauseId: 'content_approval'
      },
      {
        id: 'ai_restrictions',
        heading: '10. AI & TECHNOLOGY RESTRICTIONS',
        content: `The Brand must not use the Artist's image, voice, likeness, or music for AI training, cloning, or synthetic generation.`,
        isOptional: true,
        clauseId: 'ai_restrictions'
      },
      {
        id: 'confidentiality',
        heading: '11. CONFIDENTIALITY',
        content: `Campaign plans, drafts, rates, and assets are confidential unless approved for disclosure.`
      },
      {
        id: 'termination',
        heading: '12. TERMINATION',
        content: `If terminated, all content must be removed within 72 hours.`
      },
      {
        id: 'liability',
        heading: '13. LIABILITY',
        content: `Each Party is responsible for their own obligations.`
      },
      {
        id: 'governing_law',
        heading: '14. GOVERNING LAW',
        content: `This Agreement follows the laws of {{governing_country}} unless agreed otherwise.`
      },
      {
        id: 'signatures',
        heading: 'AGREEMENT & SIGNATURES',
        content: `ARTIST

Name: {{artist_name}}
Signature: _________________________
Date: _______________
Email: {{artist_email}}
Handle: {{artist_handle}}


BRAND

Brand Name: {{brand_name}}
Representative: {{brand_representative}}
Signature: _________________________
Date: _______________
Email: {{brand_email}}
Contact: {{brand_contact}}`
      }
    ]
  }
};
