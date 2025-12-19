/**
 * Collaboration & Splits Agreement Template
 *
 * Documents ownership splits between contributors for master and publishing,
 * with sections for established creatives and first-time collaborators.
 */

import type { TemplateDefinition } from './artist-agreement';

export const collaborationSplitsTemplate: TemplateDefinition = {
  name: 'Collaboration & Splits Agreement',
  description: 'Document ownership splits between songwriters, producers, and contributors for master and publishing rights on a specific song.',
  category: 'artist',
  isActive: true,
  sortOrder: 18,
  version: 1,

  fields: [
    // Agreement Details
    {
      id: 'agreement_date',
      label: 'Agreement Date',
      type: 'date',
      required: true,
      group: 'Agreement Details'
    },
    {
      id: 'song_title',
      label: 'Song Title',
      type: 'text',
      required: true,
      placeholder: 'e.g., "Midnight Dreams"',
      group: 'Song Details'
    },

    // Contributor 1
    {
      id: 'contributor_1_name',
      label: 'Contributor 1 Name',
      type: 'text',
      required: true,
      group: 'Contributor 1'
    },
    {
      id: 'contributor_1_role',
      label: 'Contributor 1 Role',
      type: 'text',
      required: true,
      placeholder: 'e.g., writing, production, vocals',
      group: 'Contributor 1'
    },
    {
      id: 'contributor_1_master_split',
      label: 'Contributor 1 Master Split (%)',
      type: 'number',
      required: true,
      defaultValue: 50,
      validation: { min: 0, max: 100 },
      group: 'Contributor 1'
    },
    {
      id: 'contributor_1_publishing_split',
      label: 'Contributor 1 Publishing Split (%)',
      type: 'number',
      required: true,
      defaultValue: 50,
      validation: { min: 0, max: 100 },
      group: 'Contributor 1'
    },
    {
      id: 'contributor_1_email',
      label: 'Contributor 1 Email',
      type: 'email',
      required: true,
      group: 'Contributor 1'
    },
    {
      id: 'contributor_1_social',
      label: 'Contributor 1 Social Media',
      type: 'text',
      required: false,
      group: 'Contributor 1'
    },
    {
      id: 'contributor_1_phone',
      label: 'Contributor 1 Phone',
      type: 'text',
      required: false,
      group: 'Contributor 1'
    },

    // Contributor 2
    {
      id: 'contributor_2_name',
      label: 'Contributor 2 Name',
      type: 'text',
      required: true,
      group: 'Contributor 2'
    },
    {
      id: 'contributor_2_role',
      label: 'Contributor 2 Role',
      type: 'text',
      required: true,
      placeholder: 'e.g., writing, production, vocals',
      group: 'Contributor 2'
    },
    {
      id: 'contributor_2_master_split',
      label: 'Contributor 2 Master Split (%)',
      type: 'number',
      required: true,
      defaultValue: 50,
      validation: { min: 0, max: 100 },
      group: 'Contributor 2'
    },
    {
      id: 'contributor_2_publishing_split',
      label: 'Contributor 2 Publishing Split (%)',
      type: 'number',
      required: true,
      defaultValue: 50,
      validation: { min: 0, max: 100 },
      group: 'Contributor 2'
    },
    {
      id: 'contributor_2_email',
      label: 'Contributor 2 Email',
      type: 'email',
      required: true,
      group: 'Contributor 2'
    },
    {
      id: 'contributor_2_social',
      label: 'Contributor 2 Social Media',
      type: 'text',
      required: false,
      group: 'Contributor 2'
    },
    {
      id: 'contributor_2_phone',
      label: 'Contributor 2 Phone',
      type: 'text',
      required: false,
      group: 'Contributor 2'
    }
  ],

  optionalClauses: [
    {
      id: 'contributor_3',
      name: 'Additional Contributor 3',
      description: 'Add a third contributor to the agreement',
      defaultEnabled: false,
      fields: [
        {
          id: 'contributor_3_name',
          label: 'Contributor 3 Name',
          type: 'text',
          required: true
        },
        {
          id: 'contributor_3_role',
          label: 'Contributor 3 Role',
          type: 'text',
          required: true
        },
        {
          id: 'contributor_3_master_split',
          label: 'Contributor 3 Master Split (%)',
          type: 'number',
          required: true,
          defaultValue: 0,
          validation: { min: 0, max: 100 }
        },
        {
          id: 'contributor_3_publishing_split',
          label: 'Contributor 3 Publishing Split (%)',
          type: 'number',
          required: true,
          defaultValue: 0,
          validation: { min: 0, max: 100 }
        },
        {
          id: 'contributor_3_email',
          label: 'Contributor 3 Email',
          type: 'email',
          required: true
        }
      ]
    },
    {
      id: 'payment_clause',
      name: 'Payment for Services',
      description: 'Include an upfront payment for services rendered',
      defaultEnabled: false,
      fields: [
        {
          id: 'service_fee',
          label: 'Service Fee',
          type: 'currency',
          required: true
        },
        {
          id: 'vat_registered',
          label: 'VAT Status',
          type: 'select',
          required: true,
          options: [
            { value: 'not_registered', label: 'Not VAT Registered' },
            { value: 'vat_registered', label: 'VAT Registered - Add VAT' }
          ]
        }
      ]
    }
  ],

  content: {
    title: 'COLLABORATION & SPLITS AGREEMENT',
    sections: [
      {
        id: 'intro',
        heading: 'AGREEMENT DETAILS',
        content: `Date: {{agreement_date}}

This agreement confirms each contributor's percentage ownership of the final song.`
      },
      {
        id: 'song_info',
        heading: 'SONG INFORMATION',
        content: `Song Title: {{song_title}}`
      },
      {
        id: 'ownership_splits',
        heading: '1. OWNERSHIP SPLITS',
        content: `Master Ownership:
- {{contributor_1_name}}: {{contributor_1_master_split}}%
- {{contributor_2_name}}: {{contributor_2_master_split}}%

Publishing Ownership:
- {{contributor_1_name}}: {{contributor_1_publishing_split}}%
- {{contributor_2_name}}: {{contributor_2_publishing_split}}%

All splits must total 100%.`
      },
      {
        id: 'contributions',
        heading: '2. CONTRIBUTIONS',
        content: `Each contributor's role:

{{contributor_1_name}}: {{contributor_1_role}}

{{contributor_2_name}}: {{contributor_2_role}}`
      },
      {
        id: 'contributor_3_section',
        heading: 'ADDITIONAL CONTRIBUTOR',
        content: `{{contributor_3_name}}
Role: {{contributor_3_role}}
Master Split: {{contributor_3_master_split}}%
Publishing Split: {{contributor_3_publishing_split}}%
Email: {{contributor_3_email}}`,
        isOptional: true,
        clauseId: 'contributor_3'
      },
      {
        id: 'payment',
        heading: '3. PAYMENT (IF ANY)',
        content: `Fee for services: {{service_fee}}
VAT Status: {{vat_registered}}`,
        isOptional: true,
        clauseId: 'payment_clause'
      },
      {
        id: 'delivery',
        heading: '4. DELIVERY OF FILES',
        content: `Each contributor agrees to provide agreed files (e.g., stems, projects, etc.) by the agreed date.`
      },
      {
        id: 'credits',
        heading: '5. CREDITS',
        content: `All parties agree to give proper credit in all releases and posts.`
      },
      {
        id: 'permission',
        heading: '6. PERMISSION & RELEASES',
        content: `No one may upload, release, or distribute the song without all parties' written approval.`
      },
      {
        id: 'disputes',
        heading: '7. DISPUTES',
        content: `Disagreements will be resolved fairly and respectfully before release.`
      },
      {
        id: 'signatures',
        heading: 'SIGNATURES',
        content: `Contributor 1

Name: {{contributor_1_name}}
Signature: _________________________
Date: _______________
Social Media: {{contributor_1_social}}
Email: {{contributor_1_email}}
Phone: {{contributor_1_phone}}


Contributor 2

Name: {{contributor_2_name}}
Signature: _________________________
Date: _______________
Social Media: {{contributor_2_social}}
Email: {{contributor_2_email}}
Phone: {{contributor_2_phone}}`
      }
    ]
  }
};
