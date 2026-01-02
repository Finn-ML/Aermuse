/**
 * Listening Party Early Access + AI/Tech Agreement Template
 *
 * Agreement for attendees at listening parties, covering confidentiality,
 * recording restrictions, AI protections, and early access terms.
 */

import type { TemplateDefinition } from './artist-agreement';

export const listeningPartyAgreementTemplate: TemplateDefinition = {
  name: 'Listening Party Early Access Agreement',
  description: 'Agreement for listening party attendees covering confidentiality, recording restrictions, AI protections, and early access terms for unreleased music.',
  category: 'touring',
  isActive: true,
  sortOrder: 16,
  version: 3,

  fields: [
    // Event Details
    {
      id: 'event_name',
      label: 'Event Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., "Album Preview Party"',
      group: 'Event Details'
    },
    {
      id: 'artist_host',
      label: 'Artist / Host',
      type: 'text',
      required: true,
      placeholder: 'e.g., "J. Melody"',
      group: 'Event Details'
    },
    {
      id: 'event_date',
      label: 'Date of Event',
      type: 'date',
      required: true,
      group: 'Event Details'
    },
    {
      id: 'venue_location',
      label: 'Venue / Location',
      type: 'text',
      required: true,
      placeholder: 'e.g., "Studio 54, London"',
      group: 'Event Details'
    },
    {
      id: 'early_access_window',
      label: 'Early Access Time Window',
      type: 'text',
      required: false,
      placeholder: 'e.g., "7:00 PM - 10:00 PM"',
      group: 'Event Details'
    },

    // Phone Policy
    {
      id: 'phone_policy',
      label: 'Phone Usage Policy',
      type: 'select',
      required: true,
      options: [
        { value: 'no_phones', label: 'No phones allowed (stored away / sealed pouch)' },
        { value: 'silent_away', label: 'Phones on silent, kept away during playback' },
        { value: 'designated_area', label: 'Phones allowed only in designated area' }
      ],
      group: 'Policies'
    },

    // Recording Policy
    {
      id: 'host_recording',
      label: 'Host Recording Policy',
      type: 'select',
      required: true,
      options: [
        { value: 'no_recording', label: 'No host recording' },
        { value: 'crowd_no_faces', label: 'May record crowd (faces not visible)' },
        { value: 'content_zones', label: 'Attendees may stand in content zones to appear' }
      ],
      group: 'Policies'
    }
  ],

  optionalClauses: [
    {
      id: 'entry_fee',
      name: 'Entry Fee / Donation',
      description: 'Optional fee for attendance',
      defaultEnabled: false,
      fields: [
        {
          id: 'entry_fee_amount',
          label: 'Entry Fee Amount',
          type: 'currency',
          required: true
        }
      ]
    },
    {
      id: 'ai_protection',
      name: 'AI & Technology Protection',
      description: 'Prohibits AI training or cloning using event content',
      defaultEnabled: true,
      fields: []
    }
  ],

  personaGroups: [
    {
      id: 'attendees',
      singularName: 'Attendee',
      pluralName: 'Attendees',
      description: 'Add all attendees agreeing to these terms.',
      minCount: 1,
      maxCount: 10,
      fields: [
        {
          id: 'role',
          label: 'Role',
          type: 'select',
          required: true,
          options: [
            { value: 'attendee', label: 'Attendee' },
            { value: 'press', label: 'Press/Media' },
            { value: 'industry', label: 'Industry Professional' },
            { value: 'vip', label: 'VIP Guest' }
          ]
        },
        {
          id: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          placeholder: 'Full legal name'
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
        }
      ]
    }
  ],

  content: {
    title: 'LISTENING PARTY — EARLY ACCESS + AI / TECH AGREEMENT',
    sections: [
      {
        id: 'event_details',
        heading: 'EVENT DETAILS',
        content: `Event Name: {{event_name}}
Artist / Host: {{artist_host}}
Date of Event: {{event_date}}
Venue / Location: {{venue_location}}
Early Access Time Window: {{early_access_window}}`
      },
      {
        id: 'purpose',
        heading: '1. PURPOSE',
        content: `This agreement grants attendees early access to unreleased music and/or visuals solely for a private listening experience. Nothing in this agreement gives ownership or control of the music or visuals to the attendee.`
      },
      {
        id: 'devices',
        heading: '2. DEVICES, RECORDING & PHONE USAGE',
        content: `A. NO RECORDING OR COPYING
Attendees must not record, film, photograph, screenshot, screen-record, or otherwise capture any audio or visuals from the event.

B. PHONE USAGE POLICY
{{phone_policy}}

C. APPS & SOFTWARE
Attendees agree not to use:
- Shazam or similar song-ID apps during playback
- Voice-memo, notes, or camera apps to capture melodies, lyrics, or visuals
- Any tool designed to extract stems, samples, or audio from the experience

Any breach of this section may result in removal from the event and potential legal action.`
      },
      {
        id: 'confidentiality',
        heading: '3. CONFIDENTIALITY',
        content: `All unreleased songs, visuals, concepts, lyrics, features, mixes, demos, conversations and related material are confidential.

Attendee agrees NOT to:
- Describe unreleased tracks in detail online or offline
- Share track names, hooks, or quoted lyrics
- Reveal unannounced features or collaborators
- Repeat private conversations about strategy or rollout

This duty continues after the event.`
      },
      {
        id: 'ai_protection',
        heading: '4. AI & TECHNOLOGY USE',
        content: `A. NO AI TRAINING OR DATA MINING
Attendee must not upload, feed, or describe any unreleased music, lyrics, vocals, or visuals into any AI system for training, cloning, or recreation.

B. NO AI CLONING OF ARTIST / HOST
Attendee must not use any information to generate AI versions of the Artist/Host.

C. HOST-RECORDED CONTENT
{{host_recording}}`,
        isOptional: true,
        clauseId: 'ai_protection'
      },
      {
        id: 'ip',
        heading: '5. INTELLECTUAL PROPERTY',
        content: `All music, visuals, artwork, branding, and materials remain the exclusive property of the Artist/Host. This agreement grants listening access only, not ownership or usage rights.`
      },
      {
        id: 'social_media',
        heading: '6. SOCIAL MEDIA GUIDELINES',
        content: `Attendees may post that they attended a listening party.

Attendees must NOT post:
- Track titles or list
- Audio or visual snippets
- Lyrics or storyline elements
- Photos of documents, artwork, or tracklists`
      },
      {
        id: 'no_leaking',
        heading: '7. NO LEAKING / NO REDISTRIBUTION',
        content: `Any attempt to leak or distribute content may result in removal, a ban from future events, and possible legal action.`
      },
      {
        id: 'entry_fee',
        heading: '8. OPTIONAL FEE / DONATION',
        content: `Entry Fee / Donation: {{entry_fee_amount}}

This is payment for access only, not ownership.`,
        isOptional: true,
        clauseId: 'entry_fee'
      },
      {
        id: 'liability',
        heading: '9. LIABILITY',
        content: `Attendee participates at their own risk. Artist/Host is not responsible for injuries or lost items unless required by law.`
      },
      {
        id: 'entire_agreement',
        heading: '10. ENTIRE AGREEMENT',
        content: `This document replaces all previous discussions. Signing confirms full agreement to all terms.`
      },
      {
        id: 'signatures',
        heading: 'SIGNATURES',
        content: `ATTENDEE

Name: {{attendee_name}}
Signature: _________________________
Date: _______________
Email: {{attendee_email}}
Social: {{attendee_social}}


ARTIST / HOST

Name: {{artist_host}}
Signature: _________________________
Date: _______________`
      }
    ]
  }
};
