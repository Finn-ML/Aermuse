/**
 * Artist x Producer Creative Collaboration NDA Template
 *
 * Protects ideas, creative work, and confidential information shared between
 * Artist and Producer during collaboration.
 */

import type { TemplateDefinition } from './artist-agreement';

export const artistProducerNdaTemplate: TemplateDefinition = {
  name: 'Artist x Producer Creative Collaboration NDA',
  description: 'Non-disclosure agreement protecting creative work, demos, beats, and confidential information shared during artist-producer collaborations.',
  category: 'artist',
  isActive: true,
  sortOrder: 12,
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

    // Producer Details
    {
      id: 'producer_name',
      label: 'Producer Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., John Doe p/k/a "Beat Master"',
      group: 'Producer Details'
    },
    {
      id: 'producer_email',
      label: 'Producer Email',
      type: 'email',
      required: false,
      group: 'Producer Details'
    },
    {
      id: 'producer_handle',
      label: 'Producer Social Handle',
      type: 'text',
      required: false,
      placeholder: '@beatmaster',
      group: 'Producer Details'
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
      helpText: 'Or longer if creative material remains unreleased',
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
      id: 'producer_tag_protection',
      name: 'Producer Tag & Sound Protection',
      description: 'Protects producer tags, sounds, kits, and watermark elements',
      defaultEnabled: true,
      fields: []
    },
    {
      id: 'ai_protection',
      name: 'AI & Technology Protection',
      description: 'Prohibits use of stems, vocals, beats for AI training or cloning',
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
            { value: 'producer', label: 'Producer' },
            { value: 'engineer', label: 'Engineer' },
            { value: 'manager', label: 'Manager' }
          ]
        },
        {
          id: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          placeholder: 'e.g., Jane Smith p/k/a "J. Melody"'
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
    title: 'ARTIST x PRODUCER — CREATIVE COLLABORATION NDA',
    sections: [
      {
        id: 'intro',
        heading: 'INTRODUCTION',
        content: `This Artist x Producer Creative Collaboration Non-Disclosure Agreement ("Agreement") protects the ideas, creative work, and confidential information shared between the signing Parties. It ensures that anything shared cannot be used, claimed, or distributed without permission.

This Agreement is entered into as of {{effective_date}}.`
      },
      {
        id: 'parties',
        heading: '1. WHO IS INVOLVED',
        content: `This Agreement is between the Artist and Producer signing below ("the Parties"). It covers conversations, ideas, creative work, and all material shared between them.

ARTIST: {{artist_name}}

PRODUCER: {{producer_name}}`
      },
      {
        id: 'purpose',
        heading: '2. PURPOSE OF SHARING',
        content: `Information and creative work are being shared solely to explore or work on a potential collaboration.`
      },
      {
        id: 'protected',
        heading: '3. WHAT IS PROTECTED',
        content: `All creative material shared is protected, including: voice notes, demos, lyrics, recordings, project files, stems, beats, visuals, messages, texts, AirDrops, screenshots, artwork, drafts, and concepts at any stage.`
      },
      {
        id: 'ownership',
        heading: '4. OWNERSHIP OF CREATIVE CONTRIBUTIONS',
        content: `Each Party keeps full ownership of anything they create or share unless a separate agreement says otherwise.`
      },
      {
        id: 'producer_tag',
        heading: '5. PRODUCER TAG & SOUND PROTECTION',
        content: `The Producer's tag, sound, kits, style, or watermark elements remain their property and cannot be altered or used without permission.`,
        isOptional: true,
        clauseId: 'producer_tag_protection'
      },
      {
        id: 'early_splits',
        heading: '6. EARLY SPLIT UNDERSTANDING (NOT A SPLITS CONTRACT)',
        content: `Contributing ideas does not automatically grant rights. Splits must be agreed in writing later.`
      },
      {
        id: 'no_sharing',
        heading: '7. NO SHARING, POSTING, OR LEAKING',
        content: `No sharing, leaking, or posting of any protected material or conversations without written permission.`
      },
      {
        id: 'ai_protection',
        heading: '8. AI & TECHNOLOGY PROTECTION',
        content: `No stems, vocals, beats, lyrics, or recordings may be used for AI training, cloning, or replication without permission. Any AI-assisted work must be discussed first.`,
        isOptional: true,
        clauseId: 'ai_protection'
      },
      {
        id: 'breach',
        heading: '9. CONSEQUENCES OF BREAKING THIS AGREEMENT',
        content: `The responsible Party may be required to stop using the material, delete or return content, and may be liable for damages.`
      },
      {
        id: 'duration',
        heading: '10. DURATION OF AGREEMENT',
        content: `This Agreement lasts {{duration_years}} years or longer if the creative material remains unreleased.`
      },
      {
        id: 'disputes',
        heading: '11. RESOLVING DISAGREEMENTS',
        content: `Issues should be discussed respectfully first. Legal action may follow under the laws of {{governing_country}} unless both Parties agree otherwise.`
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


PRODUCER

Name: {{producer_name}}
Signature: _________________________
Date: _______________
Email: {{producer_email}}
Handle: {{producer_handle}}`
      }
    ]
  }
};
