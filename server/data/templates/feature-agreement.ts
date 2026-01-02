/**
 * Feature Agreement Template
 *
 * Agreement for featured artist performances on tracks, covering paid features,
 * royalty-based features, and feature swaps.
 *
 * Updated to use PersonaGroups for dynamic artists (1-10).
 */

import type { TemplateDefinition } from './artist-agreement';

export const featureAgreementTemplate: TemplateDefinition = {
  name: 'Feature Agreement',
  description: 'Agreement for featured artist performances covering paid features, royalty-based features, and feature-for-feature swaps with delivery requirements and usage rights.',
  category: 'artist',
  isActive: true,
  sortOrder: 19,
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

    // Track Details
    {
      id: 'song_title',
      label: 'Song Title',
      type: 'text',
      required: true,
      placeholder: 'e.g., "Summer Nights"',
      group: 'Track Details'
    },
    {
      id: 'working_title',
      label: 'Working Title (if different)',
      type: 'text',
      required: false,
      group: 'Track Details'
    },
    {
      id: 'genre_style',
      label: 'Genre / Style',
      type: 'text',
      required: false,
      placeholder: 'e.g., "R&B / Pop"',
      group: 'Track Details'
    },

    // Feature Type
    {
      id: 'feature_type',
      label: 'Feature Type',
      type: 'select',
      required: true,
      options: [
        { value: 'paid', label: 'Paid Feature (Flat Fee)' },
        { value: 'royalty', label: 'Royalty Feature (Percentage)' },
        { value: 'swap', label: 'Feature-for-Feature Swap' }
      ],
      group: 'Feature Terms'
    },

    // Credit
    {
      id: 'featured_credit',
      label: 'Featured Artist Credit',
      type: 'text',
      required: true,
      placeholder: 'e.g., "feat. J. Thunder"',
      group: 'Credits'
    },

    // Delivery
    {
      id: 'delivery_format',
      label: 'Delivery Format',
      type: 'select',
      required: true,
      options: [
        { value: 'wav', label: 'WAV' },
        { value: 'mp3', label: 'MP3' },
        { value: 'stems', label: 'Stems' },
        { value: 'dry_vocals', label: 'Dry Vocals' }
      ],
      group: 'Delivery'
    },
    {
      id: 'delivery_deadline',
      label: 'Delivery Deadline',
      type: 'date',
      required: true,
      group: 'Delivery'
    },
    {
      id: 'revisions_allowed',
      label: 'Revisions Allowed',
      type: 'select',
      required: true,
      options: [
        { value: 'none', label: 'None' },
        { value: 'one', label: 'One Revision' },
        { value: 'two', label: 'Two Revisions' }
      ],
      group: 'Delivery'
    }
  ],

  optionalClauses: [
    {
      id: 'paid_feature',
      name: 'Paid Feature Terms',
      description: 'Flat fee payment for the feature',
      defaultEnabled: false,
      fields: [
        {
          id: 'feature_fee',
          label: 'Feature Fee',
          type: 'currency',
          required: true
        },
        {
          id: 'vat_status',
          label: 'VAT Status',
          type: 'select',
          required: true,
          options: [
            { value: 'not_registered', label: 'Not VAT Registered' },
            { value: 'vat_registered', label: 'VAT Registered - Add VAT' }
          ]
        },
        {
          id: 'payment_due',
          label: 'Payment Due',
          type: 'select',
          required: true,
          options: [
            { value: 'before_recording', label: 'Before Recording' },
            { value: 'on_delivery', label: 'On Delivery' },
            { value: 'other', label: 'Other (specify in notes)' }
          ]
        }
      ]
    },
    {
      id: 'royalty_feature',
      name: 'Royalty Feature Terms',
      description: 'Percentage of royalties instead of flat fee',
      defaultEnabled: false,
      fields: [
        {
          id: 'royalty_percentage',
          label: 'Royalty Percentage (%)',
          type: 'number',
          required: true,
          defaultValue: 15,
          validation: { min: 1, max: 50 }
        },
        {
          id: 'publishing_share',
          label: 'Publishing Share (if lyrics written) (%)',
          type: 'number',
          required: false,
          defaultValue: 0,
          validation: { min: 0, max: 50 }
        }
      ]
    },
    {
      id: 'swap_feature',
      name: 'Feature-for-Feature Swap Terms',
      description: 'Exchange features between artists',
      defaultEnabled: false,
      fields: [
        {
          id: 'swap_song_1',
          label: 'Song 1 (Main Artist\'s Track)',
          type: 'text',
          required: true
        },
        {
          id: 'swap_song_2',
          label: 'Song 2 (Featured Artist\'s Track)',
          type: 'text',
          required: true
        },
        {
          id: 'swap_deadline_days',
          label: 'Delivery Deadline for Both (days)',
          type: 'number',
          required: true,
          defaultValue: 14,
          validation: { min: 1, max: 90 }
        }
      ]
    },
    {
      id: 'social_promo',
      name: 'Social Media Promotion',
      description: 'Agreed promotional posts from featured artist',
      defaultEnabled: false,
      fields: [
        {
          id: 'promo_type',
          label: 'Promotion Type',
          type: 'select',
          required: true,
          options: [
            { value: 'no_promo', label: 'No Promo Required' },
            { value: 'story', label: '1 Story Post' },
            { value: 'feed', label: '1 Feed Post' },
            { value: 'repost', label: '1 Repost' }
          ]
        }
      ]
    }
  ],

  personaGroups: [
    {
      id: 'artists',
      singularName: 'Artist',
      pluralName: 'Artists',
      description: 'Add all artists involved in this feature agreement. Include the main artist and all featured artists.',
      minCount: 2,
      maxCount: 10,
      fields: [
        {
          id: 'role',
          label: 'Role',
          type: 'select',
          required: true,
          options: [
            { value: 'main_artist', label: 'Main Artist' },
            { value: 'featured_artist', label: 'Featured Artist' }
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
          label: 'Social Media',
          type: 'text',
          required: false,
          placeholder: '@handle'
        },
        {
          id: 'credit',
          label: 'Credit (how to be credited)',
          type: 'text',
          required: false,
          placeholder: 'e.g., "feat. J. Thunder"'
        }
      ]
    }
  ],

  content: {
    title: 'FEATURE AGREEMENT',
    sections: [
      {
        id: 'intro',
        heading: 'AGREEMENT DETAILS',
        content: `Date: {{agreement_date}}

This agreement sets out the terms under which the Featured Artist will record and deliver a feature performance for the Main Artist's track.`
      },
      {
        id: 'parties',
        heading: 'PARTIES',
        content: `MAIN ARTIST: {{main_artist_name}}
Email: {{main_artist_email}}
Phone: {{main_artist_phone}}
Social Media: {{main_artist_social}}

FEATURED ARTIST: {{featured_artist_name}}
Email: {{featured_artist_email}}
Phone: {{featured_artist_phone}}
Social Media: {{featured_artist_social}}`
      },
      {
        id: 'track_details',
        heading: '1. TRACK DETAILS',
        content: `Song Title: {{song_title}}
Working Title: {{working_title}}
Genre / Style: {{genre_style}}`
      },
      {
        id: 'feature_type',
        heading: '2. FEATURE TYPE',
        content: `Feature Type Selected: {{feature_type}}`
      },
      {
        id: 'paid_terms',
        heading: 'PAID FEATURE TERMS',
        content: `Fee: {{feature_fee}}
VAT Status: {{vat_status}}
Payment Due: {{payment_due}}

Rights:
- Main Artist owns 100% of the master
- Featured Artist grants full permission to use their voice, name, and likeness`,
        isOptional: true,
        clauseId: 'paid_feature'
      },
      {
        id: 'royalty_terms',
        heading: 'ROYALTY-BASED FEATURE TERMS',
        content: `Royalty to Featured Artist: {{royalty_percentage}}% of net master royalties
Publishing Share (if lyrics written): {{publishing_share}}%
Payment Schedule: Quarterly unless agreed otherwise

Rights:
- Main Artist owns the master
- Featured Artist receives royalties only`,
        isOptional: true,
        clauseId: 'royalty_feature'
      },
      {
        id: 'swap_terms',
        heading: 'FEATURE-FOR-FEATURE SWAP TERMS',
        content: `Song 1 (Main Artist): {{swap_song_1}}
Song 2 (Featured Artist): {{swap_song_2}}
Delivery Deadline for BOTH: {{swap_deadline_days}} days

Exchange: Equal value exchange unless otherwise agreed.`,
        isOptional: true,
        clauseId: 'swap_feature'
      },
      {
        id: 'delivery',
        heading: '3. DELIVERY REQUIREMENTS',
        content: `Delivery Format: {{delivery_format}}
Deadline: {{delivery_deadline}}
Revisions Allowed: {{revisions_allowed}}`
      },
      {
        id: 'credits',
        heading: '4. CREDITS',
        content: `Featured Artist will be credited as: "{{featured_credit}}"`
      },
      {
        id: 'usage_rights',
        heading: '5. USAGE RIGHTS',
        content: `Main Artist may use the feature for:
- Commercial Release
- Social Media
- Live Performances
- Music Videos
- Advertising (with approval)`
      },
      {
        id: 'social_promo',
        heading: '6. SOCIAL MEDIA PROMOTION',
        content: `Promotion Agreement: {{promo_type}}`,
        isOptional: true,
        clauseId: 'social_promo'
      },
      {
        id: 'cancellations',
        heading: '7. CANCELLATIONS',
        content: `If Featured Artist cancels: refund any deposit.
If Main Artist cancels: deposit remains unless unreasonable.`
      },
      {
        id: 'professionalism',
        heading: '8. PROFESSIONALISM',
        content: `Both parties agree to respectful communication.`
      },
      {
        id: 'signatures',
        heading: 'SIGNATURES',
        content: `MAIN ARTIST

Name: {{main_artist_name}}
Signature: _________________________
Date: _______________
Email: {{main_artist_email}}
Phone: {{main_artist_phone}}
Social Media: {{main_artist_social}}


FEATURED ARTIST

Name: {{featured_artist_name}}
Signature: _________________________
Date: _______________
Email: {{featured_artist_email}}
Phone: {{featured_artist_phone}}
Social Media: {{featured_artist_social}}`
      }
    ]
  }
};
