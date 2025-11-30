/**
 * Tour Agreement Template
 * Epic 3: Contract Templates System - Story 3.4
 *
 * For touring arrangements covering performance terms, dates, venues, and fees.
 */

import type { TemplateDefinition } from "./artist-agreement";

export const tourAgreementTemplate: TemplateDefinition = {
  name: 'Tour/Performance Agreement',
  description: 'For live performances and touring. Covers dates, venues, fees, technical requirements, and travel provisions.',
  category: 'touring',
  isActive: true,
  sortOrder: 3,
  version: 1,

  fields: [
    // Artist
    {
      id: 'artist_name',
      label: 'Artist/Performer Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., The Night Owls',
      group: 'Artist Details'
    },
    {
      id: 'artist_address',
      label: 'Artist Address',
      type: 'textarea',
      required: true,
      group: 'Artist Details'
    },
    {
      id: 'artist_email',
      label: 'Artist Contact Email',
      type: 'email',
      required: true,
      group: 'Artist Details'
    },
    {
      id: 'artist_manager',
      label: 'Manager/Representative Name',
      type: 'text',
      required: false,
      group: 'Artist Details'
    },

    // Promoter/Venue
    {
      id: 'promoter_name',
      label: 'Promoter/Venue Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Live Nation UK',
      group: 'Promoter/Venue Details'
    },
    {
      id: 'promoter_address',
      label: 'Promoter Address',
      type: 'textarea',
      required: true,
      group: 'Promoter/Venue Details'
    },
    {
      id: 'promoter_email',
      label: 'Promoter Contact Email',
      type: 'email',
      required: true,
      group: 'Promoter/Venue Details'
    },

    // Performance Details
    {
      id: 'venue_name',
      label: 'Venue Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., O2 Academy Brixton',
      group: 'Performance Details'
    },
    {
      id: 'venue_address',
      label: 'Venue Address',
      type: 'textarea',
      required: true,
      group: 'Performance Details'
    },
    {
      id: 'performance_date',
      label: 'Performance Date',
      type: 'date',
      required: true,
      group: 'Performance Details'
    },
    {
      id: 'doors_time',
      label: 'Doors Open Time',
      type: 'text',
      required: true,
      placeholder: 'e.g., 7:00 PM',
      group: 'Performance Details'
    },
    {
      id: 'set_time',
      label: 'Set Start Time',
      type: 'text',
      required: true,
      placeholder: 'e.g., 9:00 PM',
      group: 'Performance Details'
    },
    {
      id: 'set_length',
      label: 'Set Length (minutes)',
      type: 'number',
      required: true,
      defaultValue: 60,
      validation: { min: 15, max: 180 },
      group: 'Performance Details'
    },

    // Financial Terms
    {
      id: 'performance_fee',
      label: 'Performance Fee',
      type: 'currency',
      required: true,
      group: 'Financial Terms'
    },
    {
      id: 'deposit_amount',
      label: 'Deposit Amount',
      type: 'currency',
      required: false,
      helpText: 'Amount due upon signing',
      group: 'Financial Terms'
    },
    {
      id: 'ticket_price',
      label: 'Ticket Price',
      type: 'currency',
      required: false,
      group: 'Financial Terms'
    },
    {
      id: 'venue_capacity',
      label: 'Venue Capacity',
      type: 'number',
      required: false,
      group: 'Financial Terms'
    }
  ],

  optionalClauses: [
    {
      id: 'rider',
      name: 'Technical Rider',
      description: 'Technical and hospitality requirements',
      defaultEnabled: true,
      fields: [
        {
          id: 'sound_requirements',
          label: 'Sound System Requirements',
          type: 'textarea',
          required: true,
          placeholder: 'e.g., Full PA system, monitors, microphones...'
        },
        {
          id: 'backline_requirements',
          label: 'Backline Requirements',
          type: 'textarea',
          required: false,
          placeholder: 'e.g., Drum kit, amplifiers, keyboard...'
        },
        {
          id: 'hospitality_requirements',
          label: 'Hospitality Requirements',
          type: 'textarea',
          required: false,
          placeholder: 'e.g., Dressing room, refreshments, meals...'
        }
      ]
    },
    {
      id: 'travel',
      name: 'Travel and Accommodation',
      description: 'Travel and lodging provisions',
      defaultEnabled: false,
      fields: [
        {
          id: 'travel_arrangement',
          label: 'Travel Arrangements',
          type: 'select',
          required: true,
          options: [
            { value: 'artist', label: 'Artist arranges, Promoter reimburses' },
            { value: 'promoter', label: 'Promoter arranges and pays' },
            { value: 'artist_pays', label: 'Artist arranges and pays' }
          ]
        },
        {
          id: 'hotel_rooms',
          label: 'Number of Hotel Rooms Required',
          type: 'number',
          required: true,
          defaultValue: 2,
          validation: { min: 1, max: 20 }
        }
      ]
    },
    {
      id: 'merchandise',
      name: 'Merchandise Rights',
      description: 'Artist merchandise sales at venue',
      defaultEnabled: true,
      fields: [
        {
          id: 'merch_split',
          label: 'Artist Merchandise Percentage',
          type: 'number',
          required: true,
          defaultValue: 80,
          validation: { min: 0, max: 100 },
          helpText: 'Artist keeps this percentage, venue/promoter keeps the rest'
        }
      ]
    },
    {
      id: 'cancellation',
      name: 'Cancellation Terms',
      description: 'Terms for cancellation by either party',
      defaultEnabled: true,
      fields: [
        {
          id: 'artist_cancel_notice',
          label: 'Artist Cancellation Notice (days)',
          type: 'number',
          required: true,
          defaultValue: 30,
          validation: { min: 7, max: 90 }
        },
        {
          id: 'promoter_cancel_notice',
          label: 'Promoter Cancellation Notice (days)',
          type: 'number',
          required: true,
          defaultValue: 14,
          validation: { min: 7, max: 90 }
        }
      ]
    }
  ],

  content: {
    title: 'PERFORMANCE AGREEMENT',
    sections: [
      {
        id: 'parties',
        heading: '1. PARTIES',
        content: `This Performance Agreement ("Agreement") is entered into by and between:

{{artist_name}} ("Artist")
Address: {{artist_address}}
Email: {{artist_email}}
Manager: {{artist_manager}}

AND

{{promoter_name}} ("Promoter")
Address: {{promoter_address}}
Email: {{promoter_email}}`
      },
      {
        id: 'engagement',
        heading: '2. ENGAGEMENT',
        content: `Promoter hereby engages Artist to perform at:

Venue: {{venue_name}}
Address: {{venue_address}}
Date: {{performance_date}}
Doors: {{doors_time}}
Set Time: {{set_time}}
Set Length: {{set_length}} minutes

Artist agrees to perform their scheduled set in a professional manner consistent with their usual standard of performance.`
      },
      {
        id: 'compensation',
        heading: '3. COMPENSATION',
        content: `Promoter agrees to pay Artist a performance fee of {{performance_fee}}.

Deposit: A deposit of {{deposit_amount}} is due upon execution of this Agreement.

Balance: The remaining balance shall be paid in full on the day of the performance, prior to Artist taking the stage.

All payments shall be made in GBP by bank transfer or certified funds.`
      },
      {
        id: 'tickets',
        heading: '4. TICKETS AND CAPACITY',
        content: `Ticket Price: {{ticket_price}}
Venue Capacity: {{venue_capacity}}

Promoter shall be responsible for all ticket sales and marketing. Artist shall receive {{venue_capacity}} complimentary tickets upon request.`
      },
      {
        id: 'rider_section',
        heading: '5. TECHNICAL RIDER',
        content: `Promoter agrees to provide the following technical requirements:

SOUND SYSTEM:
{{sound_requirements}}

BACKLINE:
{{backline_requirements}}

HOSPITALITY:
{{hospitality_requirements}}

Any failure to meet these requirements may result in a reduction of the performance fee at Artist's discretion.`,
        isOptional: true,
        clauseId: 'rider'
      },
      {
        id: 'travel_section',
        heading: '6. TRAVEL AND ACCOMMODATION',
        content: `Travel Arrangements: {{travel_arrangement}}

Accommodation: Promoter shall provide {{hotel_rooms}} hotel room(s) of at least 4-star quality for the night of the performance.

All travel and accommodation expenses shall be settled in accordance with the arrangement specified above.`,
        isOptional: true,
        clauseId: 'travel'
      },
      {
        id: 'merchandise_section',
        heading: '7. MERCHANDISE',
        content: `Artist shall have the exclusive right to sell merchandise at the venue.

Revenue Split: Artist retains {{merch_split}}% of all merchandise sales.

Promoter shall provide a suitable merchandise area with adequate lighting and security.`,
        isOptional: true,
        clauseId: 'merchandise'
      },
      {
        id: 'cancellation_section',
        heading: '8. CANCELLATION',
        content: `Artist Cancellation: Artist may cancel with {{artist_cancel_notice}} days written notice, with full return of any deposits.

Promoter Cancellation: Promoter may cancel with {{promoter_cancel_notice}} days written notice, subject to payment of 50% of the performance fee.

Cancellation with less than 7 days notice by either party shall result in payment of the full performance fee to the non-cancelling party.

Force Majeure: Neither party shall be liable for cancellation due to events beyond their reasonable control.`,
        isOptional: true,
        clauseId: 'cancellation'
      },
      {
        id: 'insurance',
        heading: '9. INSURANCE AND LIABILITY',
        content: `Promoter shall maintain adequate public liability insurance for the venue and event.

Artist shall be responsible for insuring their own equipment.

Each party shall indemnify the other against claims arising from their own negligence or breach of this Agreement.`
      },
      {
        id: 'general',
        heading: '10. GENERAL PROVISIONS',
        content: `Entire Agreement: This Agreement constitutes the entire understanding between the parties.

Amendments: This Agreement may only be amended in writing signed by both parties.

Governing Law: This Agreement shall be governed by the laws of England and Wales.

Recording: No audio or video recording of the performance shall be made without Artist's prior written consent.`
      },
      {
        id: 'signatures',
        heading: '11. SIGNATURES',
        content: `IN WITNESS WHEREOF, the parties have executed this Agreement.


_____________________________
{{artist_name}} (Artist)
Date: _______________


_____________________________
{{promoter_name}} (Promoter)
Date: _______________`
      }
    ]
  }
};
