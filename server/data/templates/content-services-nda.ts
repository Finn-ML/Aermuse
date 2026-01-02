/**
 * Content & Creative Services NDA Template
 *
 * Protects creative work, footage, and confidential information shared
 * during creative service provision (videographers, photographers, engineers, etc.).
 */

import type { TemplateDefinition } from './artist-agreement';

export const contentServicesNdaTemplate: TemplateDefinition = {
  name: 'Content & Creative Services NDA',
  description: 'Non-disclosure agreement for videographers, photographers, engineers, designers, and other creative service providers working with artists.',
  category: 'business',
  isActive: true,
  sortOrder: 14,
  version: 2,

  fields: [
    // Host Details
    {
      id: 'host_name',
      label: 'Host (Artist/Producer) Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Jane Smith p/k/a "J. Melody"',
      group: 'Host Details'
    },
    {
      id: 'host_email',
      label: 'Host Email',
      type: 'email',
      required: false,
      group: 'Host Details'
    },
    {
      id: 'host_handle',
      label: 'Host Social Handle',
      type: 'text',
      required: false,
      placeholder: '@jmelody',
      group: 'Host Details'
    },

    // Service Provider Details
    {
      id: 'provider_name',
      label: 'Service Provider Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., "John Smith - Visuals Co."',
      group: 'Service Provider Details'
    },
    {
      id: 'provider_email',
      label: 'Service Provider Email',
      type: 'email',
      required: false,
      group: 'Service Provider Details'
    },
    {
      id: 'provider_handle',
      label: 'Service Provider Social Handle',
      type: 'text',
      required: false,
      placeholder: '@visualsco',
      group: 'Service Provider Details'
    },
    {
      id: 'service_type',
      label: 'Type of Service',
      type: 'select',
      required: true,
      options: [
        { value: 'videographer', label: 'Videographer' },
        { value: 'photographer', label: 'Photographer' },
        { value: 'engineer', label: 'Audio Engineer' },
        { value: 'editor', label: 'Video/Photo Editor' },
        { value: 'designer', label: 'Graphic Designer' },
        { value: 'stylist', label: 'Stylist' },
        { value: 'bts_crew', label: 'BTS Crew' },
        { value: 'other', label: 'Other Service Provider' }
      ],
      group: 'Service Provider Details'
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
      helpText: 'Or longer if material remains unreleased',
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
      id: 'portfolio_rights',
      name: 'Portfolio & Tagging Sign-Off',
      description: 'Specifies approved uses for portfolio, social media, and watermarking',
      defaultEnabled: true,
      fields: [
        {
          id: 'portfolio_use',
          label: 'Portfolio/Showreel Use Approved',
          type: 'select',
          required: true,
          options: [
            { value: 'yes', label: 'Yes - Approved' },
            { value: 'no', label: 'No - Not Approved' }
          ]
        },
        {
          id: 'social_media_use',
          label: 'Social Media Posting',
          type: 'select',
          required: true,
          options: [
            { value: 'with_credit', label: 'Approved with Credit' },
            { value: 'no_credit', label: 'Approved without Credit' },
            { value: 'not_approved', label: 'Not Approved' }
          ]
        },
        {
          id: 'watermark_allowed',
          label: 'Watermark Allowed',
          type: 'select',
          required: true,
          options: [
            { value: 'yes', label: 'Yes - Watermark Allowed' },
            { value: 'no', label: 'No - Watermark Not Allowed' }
          ]
        }
      ]
    },
    {
      id: 'ai_protection',
      name: 'AI & Technology Protection',
      description: 'Prohibits use of footage, content, or files for AI training',
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
            { value: 'host', label: 'Host (Artist/Label/Company)' },
            { value: 'videographer', label: 'Videographer' },
            { value: 'photographer', label: 'Photographer' },
            { value: 'engineer', label: 'Engineer' },
            { value: 'designer', label: 'Designer' },
            { value: 'other_creative', label: 'Other Creative' }
          ]
        },
        {
          id: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          placeholder: 'e.g., Jane Smith or Creative Studios Ltd'
        },
        {
          id: 'email',
          label: 'Email',
          type: 'email',
          required: false
        },
        {
          id: 'phone',
          label: 'Phone',
          type: 'text',
          required: false
        }
      ]
    }
  ],

  content: {
    title: 'CONTENT & CREATIVE SERVICES NDA',
    sections: [
      {
        id: 'intro',
        heading: 'INTRODUCTION',
        content: `This Content & Creative Services Non-Disclosure Agreement ("Agreement") protects the creative work, footage, and confidential information shared while providing creative services. It ensures that anything captured, created, or shared cannot be used, claimed, or distributed without permission.

This Agreement is entered into as of {{effective_date}}.`
      },
      {
        id: 'parties',
        heading: '1. WHO IS INVOLVED',
        content: `This Agreement is between the Host Artist/Producer and the Content/Creative Service Provider ("the Parties"). It applies to videographers, photographers, engineers, editors, designers, stylists, BTS crew, and any service providers.

HOST (Artist/Producer): {{host_name}}

SERVICE PROVIDER: {{provider_name}}
Service Type: {{service_type}}`
      },
      {
        id: 'purpose',
        heading: '2. PURPOSE OF WORKING TOGETHER',
        content: `The purpose of this collaboration is to provide creative services such as filming, photography, design, engineering, or content creation. Any access to unreleased material is only for completing the agreed service.`
      },
      {
        id: 'confidential',
        heading: '3. CONFIDENTIAL & PROTECTED MATERIAL',
        content: `All material shared, captured, viewed, or heard is confidential, including footage, recordings, stems, vocals, lyrics, images, drafts, conversations, screens, concepts, artwork, and ideas.`
      },
      {
        id: 'recording_rights',
        heading: '4. RECORDING, FILMING & USAGE RIGHTS',
        content: `The Service Provider may capture content only for the agreed purpose. No raw files, BTS footage, or unused content may be posted, saved, sold, or shared without permission.`
      },
      {
        id: 'ownership',
        heading: '5. OWNERSHIP OF FOOTAGE & CREATIVE MATERIAL',
        content: `Both Parties may keep a copy, but the Host decides where and how it is shared. Neither Party may release work publicly without written consent.`
      },
      {
        id: 'portfolio',
        heading: '6. PORTFOLIO & TAGGING AGREEMENT',
        content: `Portfolio/Showreel Use: {{portfolio_use}}
Social Media Posting: {{social_media_use}}
Watermark: {{watermark_allowed}}

Portfolio use, social media posting, or watermarking requires written approval as specified above.`,
        isOptional: true,
        clauseId: 'portfolio_rights'
      },
      {
        id: 'ai_protection',
        heading: '7. AI & TECHNOLOGY PROTECTION',
        content: `No footage, content, vocals, stems, or files may be used for AI training, cloning, or replication without permission.`,
        isOptional: true,
        clauseId: 'ai_protection'
      },
      {
        id: 'no_sharing',
        heading: '8. NO SHARING, POSTING OR LEAKING',
        content: `No content may be shared, leaked, or posted outside the agreed purpose without written consent.`
      },
      {
        id: 'conduct',
        heading: '9. BEHAVIOUR & PROFESSIONAL CONDUCT',
        content: `Both Parties agree to act respectfully, maintain confidentiality, and protect the creative environment.`
      },
      {
        id: 'breach',
        heading: '10. CONSEQUENCES OF BREAKING THIS AGREEMENT',
        content: `The responsible Party may be required to stop using material, delete or return files, and may be liable for damages.`
      },
      {
        id: 'duration',
        heading: '11. DURATION OF AGREEMENT',
        content: `This Agreement lasts {{duration_years}} years, or longer if the material remains unreleased.`
      },
      {
        id: 'disputes',
        heading: '12. RESOLVING DISAGREEMENTS',
        content: `Issues should be discussed respectfully first. Legal action may follow under the laws of {{governing_country}} unless agreed otherwise.`
      },
      {
        id: 'signatures',
        heading: 'AGREEMENT & SIGNATURES',
        content: `HOST (Artist/Producer)

Name: {{host_name}}
Signature: _________________________
Date: _______________
Email: {{host_email}}
Handle: {{host_handle}}


SERVICE PROVIDER

Name: {{provider_name}}
Signature: _________________________
Date: _______________
Email: {{provider_email}}
Handle: {{provider_handle}}`
      }
    ]
  }
};
