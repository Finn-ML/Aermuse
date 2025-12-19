/**
 * Artist to Artist Creative Collaboration NDA Template
 *
 * Protects ideas, creative work, and confidential information shared between
 * artists during collaboration discussions.
 */

import type { TemplateDefinition } from './artist-agreement';

export const artistArtistNdaTemplate: TemplateDefinition = {
  name: 'Artist to Artist Creative Collaboration NDA',
  description: 'Non-disclosure agreement protecting creative work, ideas, and confidential information shared between two artists exploring collaboration.',
  category: 'artist',
  isActive: true,
  sortOrder: 13,
  version: 1,

  fields: [
    // Artist 1 Details
    {
      id: 'artist_1_name',
      label: 'Artist 1 Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Jane Smith p/k/a "J. Melody"',
      group: 'Artist 1 Details'
    },
    {
      id: 'artist_1_email',
      label: 'Artist 1 Email',
      type: 'email',
      required: false,
      group: 'Artist 1 Details'
    },
    {
      id: 'artist_1_handle',
      label: 'Artist 1 Social Handle',
      type: 'text',
      required: false,
      placeholder: '@jmelody',
      group: 'Artist 1 Details'
    },

    // Artist 2 Details
    {
      id: 'artist_2_name',
      label: 'Artist 2 Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., John Doe p/k/a "J. Thunder"',
      group: 'Artist 2 Details'
    },
    {
      id: 'artist_2_email',
      label: 'Artist 2 Email',
      type: 'email',
      required: false,
      group: 'Artist 2 Details'
    },
    {
      id: 'artist_2_handle',
      label: 'Artist 2 Social Handle',
      type: 'text',
      required: false,
      placeholder: '@jthunder',
      group: 'Artist 2 Details'
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

  optionalClauses: [],

  content: {
    title: 'ARTIST TO ARTIST — CREATIVE COLLABORATION NDA',
    sections: [
      {
        id: 'intro',
        heading: 'INTRODUCTION',
        content: `This Artist-to-Artist Creative Collaboration Non-Disclosure Agreement ("Agreement") protects the ideas, creative work, and confidential information shared between the signing artists. It ensures that anything shared cannot be used, claimed, or distributed without permission.

This Agreement is entered into as of {{effective_date}}.`
      },
      {
        id: 'parties',
        heading: '1. WHO IS INVOLVED',
        content: `This Agreement is between the artists signing below ("the Parties"). It covers conversations, ideas, creative work, and any material shared between them.

ARTIST 1: {{artist_1_name}}

ARTIST 2: {{artist_2_name}}`
      },
      {
        id: 'purpose',
        heading: '2. PURPOSE OF SHARING',
        content: `Information and creative work are being shared solely to explore or work on a potential artistic collaboration. It must only be used for that purpose.`
      },
      {
        id: 'protected',
        heading: '3. WHAT COUNTS AS CONFIDENTIAL & PROTECTED',
        content: `All creative material shared in any format is protected, including: voice notes, demos, lyrics, recordings, project files, beats, visuals, messages, DMs, texts, AirDrops, screenshots, artwork, drafts, concepts, and ideas at any stage.`
      },
      {
        id: 'ownership',
        heading: '4. OWNERSHIP OF IDEAS',
        content: `Any idea, concept, lyric, melody, style, or creation remains owned by the person who originally shared or created it unless a separate written agreement states otherwise.`
      },
      {
        id: 'early_splits',
        heading: '5. EARLY SPLIT UNDERSTANDING (NOT A SPLITS CONTRACT)',
        content: `Sharing an idea or contributing to a conversation does not automatically grant rights or ownership to a song or project. Splits must be agreed later in writing if the Parties decide to fully collaborate.`
      },
      {
        id: 'no_sharing',
        heading: '6. NO SHARING, POSTING, OR LEAKING',
        content: `The Parties must not share, post, leak, forward, or use any creative material or private conversations without written permission. This includes social media, group chats, or private listening spaces.`
      },
      {
        id: 'breach',
        heading: '7. CONSEQUENCES OF BREAKING THIS AGREEMENT',
        content: `If this Agreement is broken, the responsible Party may be required to stop using the material, delete or return content, and may be held responsible for losses or damages caused by the breach.`
      },
      {
        id: 'duration',
        heading: '8. HOW LONG THIS AGREEMENT LASTS',
        content: `This Agreement begins upon signing and lasts for {{duration_years}} years, or longer if the creative material is still not released or public.`
      },
      {
        id: 'disputes',
        heading: '9. RESOLVING DISAGREEMENTS',
        content: `The Parties agree to speak directly and respectfully to resolve issues first. If needed, legal steps may follow based on the laws of {{governing_country}} unless both Parties agree otherwise.`
      },
      {
        id: 'signatures',
        heading: 'AGREEMENT & SIGNATURES',
        content: `ARTIST 1

Name: {{artist_1_name}}
Signature: _________________________
Date: _______________
Email: {{artist_1_email}}
Handle: {{artist_1_handle}}


ARTIST 2

Name: {{artist_2_name}}
Signature: _________________________
Date: _______________
Email: {{artist_2_email}}
Handle: {{artist_2_handle}}`
      }
    ]
  }
};
