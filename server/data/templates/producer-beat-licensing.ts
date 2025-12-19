/**
 * Producer & Beat Licensing Master Agreement Template
 *
 * Comprehensive agreement covering producer services, studio terms,
 * ownership, royalties, and beat licensing options.
 */

import type { TemplateDefinition } from './artist-agreement';

export const producerBeatLicensingTemplate: TemplateDefinition = {
  name: 'Producer & Beat Licensing Master Agreement',
  description: 'Comprehensive producer agreement covering services, studio terms, ownership splits, royalties, publishing, and beat licensing options (MP3, WAV, Unlimited, Exclusive).',
  category: 'production',
  isActive: true,
  sortOrder: 17,
  version: 1,

  fields: [
    // Producer Details
    {
      id: 'producer_name',
      label: 'Producer Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., John Doe p/k/a "Beat Master"',
      group: 'Producer Details'
    },

    // Artist Details
    {
      id: 'artist_name',
      label: 'Artist Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Jane Smith p/k/a "J. Melody"',
      group: 'Artist Details'
    },

    // Agreement Details
    {
      id: 'effective_date',
      label: 'Agreement Date',
      type: 'date',
      required: true,
      group: 'Agreement Details'
    },

    // Ownership & Royalties
    {
      id: 'artist_master_ownership',
      label: 'Artist Master Ownership (%)',
      type: 'number',
      required: true,
      defaultValue: 50,
      validation: { min: 0, max: 100 },
      group: 'Ownership & Royalties'
    },
    {
      id: 'producer_master_ownership',
      label: 'Producer Master Ownership (%)',
      type: 'number',
      required: true,
      defaultValue: 50,
      validation: { min: 0, max: 100 },
      group: 'Ownership & Royalties'
    },
    {
      id: 'producer_royalty_percentage',
      label: 'Producer Royalty (%)',
      type: 'number',
      required: true,
      defaultValue: 3,
      validation: { min: 0, max: 50 },
      helpText: 'Percentage of net master royalties',
      group: 'Ownership & Royalties'
    },

    // Producer Credit
    {
      id: 'producer_credit',
      label: 'Producer Credit Format',
      type: 'text',
      required: true,
      placeholder: 'e.g., "Prod. by Beat Master"',
      group: 'Credits'
    },

    // Beat Licensing - Optional pricing
    {
      id: 'license_type',
      label: 'License Type',
      type: 'select',
      required: true,
      options: [
        { value: 'custom_production', label: 'Custom Production (no beat lease)' },
        { value: 'mp3_lease', label: 'MP3 Lease (Non-Exclusive)' },
        { value: 'wav_lease', label: 'WAV Lease (Non-Exclusive)' },
        { value: 'unlimited_lease', label: 'Unlimited Lease (Non-Exclusive)' },
        { value: 'exclusive', label: 'Exclusive Rights Purchase' }
      ],
      group: 'Beat Licensing'
    }
  ],

  optionalClauses: [
    {
      id: 'mp3_lease',
      name: 'MP3 Lease Terms',
      description: 'Non-exclusive MP3 license with limited streams and usage',
      defaultEnabled: false,
      fields: [
        {
          id: 'mp3_lease_price',
          label: 'MP3 Lease Price',
          type: 'currency',
          required: true
        }
      ]
    },
    {
      id: 'wav_lease',
      name: 'WAV Lease Terms',
      description: 'Non-exclusive WAV license with extended usage rights',
      defaultEnabled: false,
      fields: [
        {
          id: 'wav_lease_price',
          label: 'WAV Lease Price',
          type: 'currency',
          required: true
        }
      ]
    },
    {
      id: 'unlimited_lease',
      name: 'Unlimited Lease Terms',
      description: 'Non-exclusive license with unlimited streams and usage',
      defaultEnabled: false,
      fields: [
        {
          id: 'unlimited_lease_price',
          label: 'Unlimited Lease Price',
          type: 'currency',
          required: true
        }
      ]
    },
    {
      id: 'exclusive_rights',
      name: 'Exclusive Rights Purchase',
      description: 'Full exclusive rights with stems, beat removed from all platforms',
      defaultEnabled: false,
      fields: [
        {
          id: 'exclusive_price',
          label: 'Exclusive Rights Price',
          type: 'currency',
          required: true
        },
        {
          id: 'exclusive_publishing_split',
          label: 'Publishing Split for Producer (%)',
          type: 'number',
          required: true,
          defaultValue: 50,
          validation: { min: 0, max: 100 }
        }
      ]
    },
    {
      id: 'ai_safeguards',
      name: 'AI Safeguards',
      description: 'Prohibits use of stems or vocals for AI training or replication',
      defaultEnabled: true,
      fields: []
    }
  ],

  content: {
    title: 'PRODUCER & BEAT LICENSING MASTER AGREEMENT',
    sections: [
      {
        id: 'intro',
        heading: 'INTRODUCTION',
        content: `This Producer & Beat Licensing Master Agreement ("Agreement") is entered into as of {{effective_date}} between:

PRODUCER: {{producer_name}}

ARTIST: {{artist_name}}`
      },
      {
        id: 'section_a_intro',
        heading: 'SECTION A — GENERAL PRODUCER TERMS',
        content: `The following terms apply to the working relationship between Producer and Artist.`
      },
      {
        id: 'appointment',
        heading: 'A1. Appointment of Producer',
        content: `The Artist appoints the Producer to provide production services including composing, arranging, sound design, engineering, mixing, vocal direction, or other creative work.`
      },
      {
        id: 'scope',
        heading: 'A2. Scope of Work',
        content: `The Producer will create or assist in creating original music, supervise sessions, deliver files, disclose samples, and provide reasonable revisions.`
      },
      {
        id: 'ownership_contributions',
        heading: 'A3. Ownership of Producer Contributions',
        content: `All beats, compositions, or production elements remain the Producer's intellectual property until exclusive rights or splits are agreed.`
      },
      {
        id: 'producer_credit',
        heading: 'A4. Producer Credit',
        content: `The Artist must credit the Producer on all releases as: "{{producer_credit}}".`
      },
      {
        id: 'delivery',
        heading: 'A5. Delivery Requirements',
        content: `Producer delivers drafts, finals, and stems once payment terms are met. Project files are not required unless agreed.`
      },
      {
        id: 'payment_model',
        heading: 'A6. Payment Model',
        content: `Payments may include upfront fees, royalties, publishing splits, beat leases, or exclusive rights.`
      },
      {
        id: 'revisions',
        heading: 'A7. Revisions',
        content: `Revisions must follow agreed limits. Additional work may require additional payment.`
      },
      {
        id: 'studio_etiquette',
        heading: 'A8. Studio Etiquette',
        content: `Both parties agree to professional conduct and no unauthorised recording or leaks.`
      },
      {
        id: 'confidentiality',
        heading: 'A9. Confidentiality',
        content: `All creative ideas and drafts remain confidential.`
      },
      {
        id: 'section_b_intro',
        heading: 'SECTION B — STUDIO, SESSION & CREATIVE WORK TERMS',
        content: `The following terms apply to studio sessions and creative work.`
      },
      {
        id: 'session_rights',
        heading: 'B1. Session Recording Rights',
        content: `The Artist owns their vocals; the Producer may withhold files until payment is complete.`
      },
      {
        id: 'custom_beats',
        heading: 'B2. Custom Beat Creation',
        content: `Custom beats remain Producer's copyright unless exclusive rights are granted.`
      },
      {
        id: 'studio_usage',
        heading: 'B3. Studio Usage',
        content: `The Artist must respect equipment and may not copy software or presets.`
      },
      {
        id: 'engineering',
        heading: 'B4. Engineering & Mixing',
        content: `Final mixes must be approved. Project files are not required unless purchased.`
      },
      {
        id: 'data_protection',
        heading: 'B5. Data Protection',
        content: `Producer must store files safely but is not liable for unavoidable losses.`
      },
      {
        id: 'ai_safeguards',
        heading: 'B6. AI Safeguards',
        content: `No stems or vocals may be used for AI training, modelling, or replication.`,
        isOptional: true,
        clauseId: 'ai_safeguards'
      },
      {
        id: 'section_c_intro',
        heading: 'SECTION C — OWNERSHIP, ROYALTIES, MASTER RIGHTS & PUBLISHING',
        content: `The following terms define ownership and compensation.`
      },
      {
        id: 'final_ownership',
        heading: 'C1. Ownership of the Final Song',
        content: `Master ownership: Artist {{artist_master_ownership}}% | Producer {{producer_master_ownership}}%`
      },
      {
        id: 'publishing',
        heading: 'C2. Publishing & Songwriting Splits',
        content: `Publishing must match contribution. ISRC codes must be correctly registered.`
      },
      {
        id: 'royalty_structure',
        heading: 'C3. Royalty Structure',
        content: `Producer receives {{producer_royalty_percentage}}% royalties unless a buyout is agreed.`
      },
      {
        id: 'master_usage',
        heading: 'C4. Master Usage Rights',
        content: `Artist may release the Master once payments are complete.`
      },
      {
        id: 'portfolio_rights',
        heading: 'C5. Producer Portfolio Rights',
        content: `Producer may showcase the finished track unless confidentiality is requested.`
      },
      {
        id: 'release_approval',
        heading: 'C6. Release Approval',
        content: `Release requires correct credits, payments, samples, and ISRCs.`
      },
      {
        id: 'disputes',
        heading: 'C7. Disputes',
        content: `Parties must attempt private resolution before legal escalation.`
      },
      {
        id: 'section_d_intro',
        heading: 'SECTION D — BEAT LICENSING OPTIONS (LEASES & EXCLUSIVE RIGHTS)',
        content: `License Type Selected: {{license_type}}`
      },
      {
        id: 'mp3_lease',
        heading: 'D1. MP3 Lease — Non-Exclusive',
        content: `Price: {{mp3_lease_price}}

MP3 delivery. Limited streams, videos, and performances. ISRCs mandatory.

Restrictions: No reselling, sublicensing, redistribution, or AI training.`,
        isOptional: true,
        clauseId: 'mp3_lease'
      },
      {
        id: 'wav_lease',
        heading: 'D2. WAV Lease — Non-Exclusive',
        content: `Price: {{wav_lease_price}}

Includes WAV delivery and extended usage rights. ISRC and restriction rules apply.`,
        isOptional: true,
        clauseId: 'wav_lease'
      },
      {
        id: 'unlimited_lease',
        heading: 'D3. Unlimited Lease — Non-Exclusive',
        content: `Price: {{unlimited_lease_price}}

Unlimited streams, videos, and performances. Delivery includes WAV+MP3. Still non-exclusive.`,
        isOptional: true,
        clauseId: 'unlimited_lease'
      },
      {
        id: 'exclusive_rights',
        heading: 'D4. Exclusive Rights Purchase',
        content: `Exclusive Price: {{exclusive_price}}

Includes stems, WAV, MP3. Beat removed from all platforms.

Publishing Split: Producer retains {{exclusive_publishing_split}}%`,
        isOptional: true,
        clauseId: 'exclusive_rights'
      },
      {
        id: 'upgrade_rights',
        heading: 'D5. Upgrade Rights',
        content: `Artist may upgrade any lease to Exclusive by paying the difference.`
      },
      {
        id: 'general_restrictions',
        heading: 'D6. General Restrictions',
        content: `Artist may not claim ownership of the beat, resell it, upload it alone, or use it for AI training.`
      },
      {
        id: 'signatures',
        heading: 'SIGNATURES',
        content: `PRODUCER

Name: {{producer_name}}
Digital Signature: _________________________
Date: _______________


ARTIST

Name: {{artist_name}}
Digital Signature: _________________________
Date: _______________`
      }
    ]
  }
};
