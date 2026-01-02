/**
 * Artist x Brand Collaboration NDA Template
 *
 * Protects creative concepts, brand materials, strategic plans, and confidential
 * information shared between Artist and Brand during collaboration discussions.
 */

import type { TemplateDefinition } from './artist-agreement';

export const artistBrandNdaTemplate: TemplateDefinition = {
  name: 'Artist x Brand Collaboration NDA',
  description: 'Non-disclosure agreement protecting creative concepts and confidential information during artist-brand partnerships, campaigns, sponsorships, or endorsements.',
  category: 'business',
  isActive: true,
  sortOrder: 11,
  version: 2,

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
      required: false,
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
      label: 'Brand Representative Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., "John Smith, Marketing Director"',
      group: 'Brand Details'
    },
    {
      id: 'brand_email',
      label: 'Brand Contact Email',
      type: 'email',
      required: false,
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
    {
      id: 'duration_years',
      label: 'Duration (Years)',
      type: 'number',
      required: true,
      defaultValue: 3,
      validation: { min: 1, max: 10 },
      helpText: 'How long confidentiality obligations last',
      group: 'Agreement Details'
    },
    {
      id: 'governing_country',
      label: 'Governing Law Country',
      type: 'text',
      required: true,
      defaultValue: 'United Kingdom',
      group: 'Agreement Details'
    }
  ],

  optionalClauses: [
    {
      id: 'ai_protection',
      name: 'AI & Technology Protection',
      description: 'Explicitly prohibits use of materials for AI training, cloning, or replication',
      defaultEnabled: true,
      fields: []
    },
    {
      id: 'non_disparagement',
      name: 'Mutual Non-Disparagement',
      description: 'Prevents both parties from making negative public statements',
      defaultEnabled: true,
      fields: []
    }
  ],

  personaGroups: [
    {
      id: 'parties',
      singularName: 'Party',
      pluralName: 'Parties',
      description: 'Add all parties involved in this NDA.',
      minCount: 2,
      maxCount: 10,
      fields: [
        {
          id: 'role',
          label: 'Role',
          type: 'select',
          required: true,
          options: [
            { value: 'artist', label: 'Artist' },
            { value: 'brand', label: 'Brand' },
            { value: 'representative', label: 'Representative/Manager' }
          ]
        },
        {
          id: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          placeholder: 'e.g., Jane Smith or Acme Fashion Co.'
        },
        {
          id: 'email',
          label: 'Email',
          type: 'email',
          required: false
        },
        {
          id: 'social_handle',
          label: 'Social Handle',
          type: 'text',
          required: false,
          placeholder: '@handle'
        }
      ]
    }
  ],

  content: {
    title: 'ARTIST x BRAND — COLLABORATION NDA',
    sections: [
      {
        id: 'intro',
        heading: 'INTRODUCTION',
        content: `This Artist x Brand Collaboration Non-Disclosure Agreement ("Agreement") protects all creative concepts, brand materials, strategic plans, and confidential information shared between the Artist and the Brand during collaboration discussions or active projects.

This Agreement is entered into as of {{effective_date}}.`
      },
      {
        id: 'parties',
        heading: '1. WHO IS INVOLVED',
        content: `This Agreement is between the Artist and the Brand ("the Parties"). It applies to all representatives, managers, contractors, creatives, or team members involved.

ARTIST: {{artist_name}}

BRAND: {{brand_name}}
Representative: {{brand_representative}}`
      },
      {
        id: 'purpose',
        heading: '2. PURPOSE OF SHARING',
        content: `Information is shared solely for exploring or executing a potential brand partnership, campaign, sponsorship, endorsement, or promotional collaboration.`
      },
      {
        id: 'confidential',
        heading: '3. CONFIDENTIAL & PROTECTED MATERIAL',
        content: `All material shared is confidential, including concepts, campaign ideas, product designs, mockups, visuals, unreleased music, images, scripts, marketing plans, pricing, and internal documents.`
      },
      {
        id: 'brand_materials',
        heading: '4. BRAND MATERIALS & CREATIVE CONCEPTS',
        content: `All brand assets—logos, taglines, product images, moodboards, brand guidelines—remain the property of the Brand. They may only be used for the agreed collaboration.`
      },
      {
        id: 'artist_materials',
        heading: '5. ARTIST MATERIAL & IMAGE PROTECTION',
        content: `All Artist-owned material—music, likeness, imagery, performance concepts, branding, drafts—remains the Artist's property and cannot be used without written permission.`
      },
      {
        id: 'no_sharing',
        heading: '6. NO SHARING, POSTING, OR LEAKING',
        content: `No content, conversations, files, screenshots, or ideas may be shared, leaked, or posted publicly or privately without written consent.`
      },
      {
        id: 'ai_protection',
        heading: '7. AI & TECHNOLOGY PROTECTION',
        content: `No material (Artist or Brand) may be uploaded to AI platforms, used for AI training, cloning, or replication. No AI-generated assets may represent the Artist or Brand without written approval.`,
        isOptional: true,
        clauseId: 'ai_protection'
      },
      {
        id: 'non_disparagement',
        heading: '8. MUTUAL NON-DISPARAGEMENT',
        content: `Both Parties agree not to make negative or damaging public statements about each other, the collaboration, or any internal discussions.`,
        isOptional: true,
        clauseId: 'non_disparagement'
      },
      {
        id: 'usage_rights',
        heading: '9. USAGE RIGHTS (NOT A LICENSE)',
        content: `This Agreement does not grant the Brand or Artist any usage rights. Any rights for promotional use, campaigns, product placement, or content release must be agreed separately in writing.`
      },
      {
        id: 'breach',
        heading: '10. CONSEQUENCES OF BREACH',
        content: `If this Agreement is broken, the responsible Party may be required to cease use of materials, delete files, and may be held liable for losses or damages.`
      },
      {
        id: 'duration',
        heading: '11. DURATION OF AGREEMENT',
        content: `This Agreement lasts for {{duration_years}} years or longer if the shared material remains unreleased or confidential.`
      },
      {
        id: 'disputes',
        heading: '12. RESOLVING DISAGREEMENTS',
        content: `Parties agree to discuss issues respectfully first. Legal action, if required, follows the laws of {{governing_country}} unless otherwise agreed.`
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
