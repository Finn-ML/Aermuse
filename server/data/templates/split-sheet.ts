/**
 * 1-Page Split Sheet Template
 *
 * Official document for recording songwriter ownership splits, ISRC details,
 * and contact information for music tracks.
 */

import type { TemplateDefinition } from './artist-agreement';

export const splitSheetTemplate: TemplateDefinition = {
  name: '1-Page Split Sheet',
  description: 'Quick and simple split sheet to document songwriter ownership percentages, ISRC codes, and contact details for a song.',
  category: 'production',
  isActive: true,
  sortOrder: 10,
  version: 1,

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
    },

    // Writer 1
    {
      id: 'writer_1_name',
      label: 'Writer 1 Name',
      type: 'text',
      required: true,
      group: 'Writer 1'
    },
    {
      id: 'writer_1_split',
      label: 'Writer 1 Split (%)',
      type: 'number',
      required: true,
      defaultValue: 50,
      validation: { min: 0, max: 100 },
      group: 'Writer 1'
    },
    {
      id: 'writer_1_email',
      label: 'Writer 1 Email',
      type: 'email',
      required: true,
      group: 'Writer 1'
    },

    // Writer 2
    {
      id: 'writer_2_name',
      label: 'Writer 2 Name',
      type: 'text',
      required: false,
      group: 'Writer 2'
    },
    {
      id: 'writer_2_split',
      label: 'Writer 2 Split (%)',
      type: 'number',
      required: false,
      defaultValue: 0,
      validation: { min: 0, max: 100 },
      group: 'Writer 2'
    },
    {
      id: 'writer_2_email',
      label: 'Writer 2 Email',
      type: 'email',
      required: false,
      group: 'Writer 2'
    },

    // Writer 3
    {
      id: 'writer_3_name',
      label: 'Writer 3 Name',
      type: 'text',
      required: false,
      group: 'Writer 3'
    },
    {
      id: 'writer_3_split',
      label: 'Writer 3 Split (%)',
      type: 'number',
      required: false,
      defaultValue: 0,
      validation: { min: 0, max: 100 },
      group: 'Writer 3'
    },
    {
      id: 'writer_3_email',
      label: 'Writer 3 Email',
      type: 'email',
      required: false,
      group: 'Writer 3'
    },

    // Writer 4
    {
      id: 'writer_4_name',
      label: 'Writer 4 Name',
      type: 'text',
      required: false,
      group: 'Writer 4'
    },
    {
      id: 'writer_4_split',
      label: 'Writer 4 Split (%)',
      type: 'number',
      required: false,
      defaultValue: 0,
      validation: { min: 0, max: 100 },
      group: 'Writer 4'
    },
    {
      id: 'writer_4_email',
      label: 'Writer 4 Email',
      type: 'email',
      required: false,
      group: 'Writer 4'
    }
  ],

  optionalClauses: [],

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
        content: `Writer 1: {{writer_1_name}} - {{writer_1_split}}%

Writer 2: {{writer_2_name}} - {{writer_2_split}}%

Writer 3: {{writer_3_name}} - {{writer_3_split}}%

Writer 4: {{writer_4_name}} - {{writer_4_split}}%

All splits must total 100%. Each writer confirms their percentage ownership of the songwriting and composition.`
      },
      {
        id: 'contact_info',
        heading: 'CONTACT INFORMATION',
        content: `Writer 1 Email: {{writer_1_email}}

Writer 2 Email: {{writer_2_email}}

Writer 3 Email: {{writer_3_email}}

Writer 4 Email: {{writer_4_email}}`
      },
      {
        id: 'signatures',
        heading: 'SIGNATURES',
        content: `By signing below, each writer confirms their agreement to the splits and information stated above.


Writer 1: _____________________________
{{writer_1_name}}
Date: _______________


Writer 2: _____________________________
{{writer_2_name}}
Date: _______________


Writer 3: _____________________________
{{writer_3_name}}
Date: _______________


Writer 4: _____________________________
{{writer_4_name}}
Date: _______________`
      }
    ]
  }
};
