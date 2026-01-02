/**
 * Collaboration & Splits Agreement Template
 *
 * Documents ownership splits between contributors for master and publishing,
 * with sections for established creatives and first-time collaborators.
 *
 * Updated to use PersonaGroups for dynamic contributors (2-10).
 */

import type { TemplateDefinition } from './artist-agreement';

export const collaborationSplitsTemplate: TemplateDefinition = {
  name: 'Collaboration & Splits Agreement',
  description: 'Document ownership splits between songwriters, producers, and contributors for master and publishing rights on a specific song.',
  category: 'artist',
  isActive: true,
  sortOrder: 18,
  version: 2,

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
    {
      id: 'working_title',
      label: 'Working Title (if different)',
      type: 'text',
      required: false,
      group: 'Song Details'
    }
  ],

  optionalClauses: [
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
    },
    {
      id: 'delivery_clause',
      name: 'File Delivery Requirements',
      description: 'Specify what files each contributor must provide',
      defaultEnabled: true,
      fields: [
        {
          id: 'delivery_deadline',
          label: 'Delivery Deadline',
          type: 'date',
          required: true
        },
        {
          id: 'delivery_format',
          label: 'Required Format',
          type: 'select',
          required: true,
          options: [
            { value: 'stems', label: 'Stems (individual tracks)' },
            { value: 'project', label: 'Full project file' },
            { value: 'wav', label: 'WAV mixdown only' },
            { value: 'both', label: 'Stems + project file' }
          ]
        }
      ]
    }
  ],

  personaGroups: [
    {
      id: 'contributors',
      singularName: 'Contributor',
      pluralName: 'Contributors',
      description: 'Add all contributors to this song. Master and publishing splits should each total 100%.',
      minCount: 2,
      maxCount: 10,
      fields: [
        {
          id: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          placeholder: 'Full legal name or stage name'
        },
        {
          id: 'role',
          label: 'Role/Contribution',
          type: 'text',
          required: true,
          placeholder: 'e.g., writing, production, vocals, mixing'
        },
        {
          id: 'master_split',
          label: 'Master Split (%)',
          type: 'number',
          required: true,
          defaultValue: 50,
          validation: { min: 0, max: 100 }
        },
        {
          id: 'publishing_split',
          label: 'Publishing Split (%)',
          type: 'number',
          required: true,
          defaultValue: 50,
          validation: { min: 0, max: 100 }
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
          id: 'social',
          label: 'Social Media Handle',
          type: 'text',
          required: false,
          placeholder: '@username'
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
        content: `Song Title: {{song_title}}
Working Title: {{working_title}}`
      },
      {
        id: 'ownership_splits',
        heading: '1. OWNERSHIP SPLITS',
        content: `[Contributors and their splits are listed in the form above]

Master Ownership and Publishing Ownership percentages for each contributor are captured in the Contributors section.

IMPORTANT: Both master and publishing splits must each total 100%.`
      },
      {
        id: 'contributions',
        heading: '2. CONTRIBUTIONS',
        content: `Each contributor's role and contribution type is documented in the Contributors section above.

All parties confirm that their stated contributions are accurate and complete.`
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
        content: `Delivery Deadline: {{delivery_deadline}}
Required Format: {{delivery_format}}

Each contributor agrees to provide their agreed files (e.g., stems, projects, etc.) by the deadline specified above.`,
        isOptional: true,
        clauseId: 'delivery_clause'
      },
      {
        id: 'credits',
        heading: '5. CREDITS',
        content: `All parties agree to give proper credit in all releases and posts. Credits should reflect each contributor's role as documented in this agreement.`
      },
      {
        id: 'permission',
        heading: '6. PERMISSION & RELEASES',
        content: `No one may upload, release, or distribute the song without all parties' written approval.

Any release must include proper credits for all contributors.`
      },
      {
        id: 'disputes',
        heading: '7. DISPUTES',
        content: `Disagreements will be resolved fairly and respectfully before release.

If a resolution cannot be reached, parties agree to seek mediation before legal action.`
      },
      {
        id: 'signatures',
        heading: 'SIGNATURES',
        content: `[Signature lines for each contributor listed above]

By signing, each contributor confirms:
1. Agreement to the splits stated above
2. Accuracy of their contribution description
3. Authority to enter into this agreement

Each contributor should sign and date below their printed name.`
      }
    ]
  }
};
