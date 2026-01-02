/**
 * 1-Page Split Sheet Template
 *
 * Official document for recording songwriter ownership splits, ISRC details,
 * and contact information for music tracks.
 *
 * Updated to use PersonaGroups for dynamic writers (1-10).
 */

import type { TemplateDefinition } from './artist-agreement';

export const splitSheetTemplate: TemplateDefinition = {
  name: '1-Page Split Sheet',
  description: 'Quick and simple split sheet to document songwriter ownership percentages, ISRC codes, and contact details for a song.',
  category: 'production',
  isActive: true,
  sortOrder: 10,
  version: 2,

  fields: [
    // Song Information
    {
      id: 'song_title',
      label: 'Song Title',
      type: 'text',
      required: true,
      placeholder: 'e.g., "Midnight Dreams"',
      group: 'Song Information'
    },
    {
      id: 'artists',
      label: 'Artist(s)',
      type: 'text',
      required: true,
      placeholder: 'e.g., "J. Melody, DJ Thunder"',
      group: 'Song Information'
    },
    {
      id: 'producers',
      label: 'Producer(s)',
      type: 'text',
      required: true,
      placeholder: 'e.g., "Beat Master Productions"',
      group: 'Song Information'
    },
    {
      id: 'session_date',
      label: 'Date of Session',
      type: 'date',
      required: true,
      group: 'Song Information'
    },
    {
      id: 'studio_location',
      label: 'Studio / Location',
      type: 'text',
      required: false,
      placeholder: 'e.g., "Sunset Studios, London"',
      group: 'Song Information'
    },

    // ISRC Details
    {
      id: 'main_isrc',
      label: 'Main ISRC Code',
      type: 'text',
      required: false,
      placeholder: 'e.g., "GBxxx1234567"',
      helpText: 'International Standard Recording Code for the main version',
      group: 'ISRC Details'
    },
    {
      id: 'alternate_isrc',
      label: 'Alternate Versions ISRC',
      type: 'textarea',
      required: false,
      placeholder: 'Clean version: GBXXX...\nExplicit version: GBXXX...',
      helpText: 'ISRC codes for clean, explicit, remix, or other versions',
      group: 'ISRC Details'
    }
  ],

  optionalClauses: [],

  personaGroups: [
    {
      id: 'writers',
      singularName: 'Writer',
      pluralName: 'Writers',
      description: 'Add all songwriters and their ownership splits. Splits must total 100%.',
      minCount: 1,
      maxCount: 10,
      fields: [
        {
          id: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          placeholder: 'Full legal name'
        },
        {
          id: 'split',
          label: 'Split (%)',
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
          id: 'pro',
          label: 'PRO (e.g., PRS, ASCAP)',
          type: 'text',
          required: false,
          placeholder: 'e.g., PRS, ASCAP, BMI'
        },
        {
          id: 'ipi',
          label: 'IPI/CAE Number',
          type: 'text',
          required: false,
          placeholder: 'e.g., 123456789'
        }
      ]
    }
  ],

  content: {
    title: 'OFFICIAL 1-PAGE SPLIT SHEET',
    sections: [
      {
        id: 'song_info',
        heading: 'SONG INFORMATION',
        content: `Song Title: {{song_title}}

Artist(s): {{artists}}

Producer(s): {{producers}}

Date of Session: {{session_date}}

Studio / Location: {{studio_location}}`
      },
      {
        id: 'isrc_details',
        heading: 'ISRC DETAILS',
        content: `Main ISRC Code: {{main_isrc}}

Alternate Versions (Clean / Explicit / Remix / Other):
{{alternate_isrc}}`
      },
      {
        id: 'songwriter_splits',
        heading: 'SONGWRITER SPLITS (MUST TOTAL 100%)',
        content: `[Writers and their splits are listed in the form above]

All splits must total 100%. Each writer confirms their percentage ownership of the songwriting and composition.

Note: Writer details, splits, PRO affiliations, and IPI numbers are captured in the Writers section of this form.`
      },
      {
        id: 'agreement',
        heading: 'AGREEMENT',
        content: `By signing below, each writer confirms:
1. Their agreement to the splits stated above
2. That all information provided is accurate
3. That they have the authority to enter into this agreement`
      },
      {
        id: 'signatures',
        heading: 'SIGNATURES',
        content: `[Signature lines for each writer listed above]

Each writer should sign and date below their printed name.

Writer signatures confirm agreement to the splits and information stated in this document.`
      }
    ]
  }
};
