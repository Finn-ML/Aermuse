/**
 * Live Performance Agreement Template
 *
 * Agreement for live performances covering fees, deposits, technical requirements,
 * hospitality, recording rights, and cancellation terms.
 */

import type { TemplateDefinition } from './artist-agreement';

export const livePerformanceAgreementTemplate: TemplateDefinition = {
  name: 'Live Performance Agreement',
  description: 'Booking agreement for live performances by artists, DJs, or bands covering fees, deposits, technical requirements, hospitality, and cancellation terms.',
  category: 'touring',
  isActive: true,
  sortOrder: 20,
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

    // Performer Details
    {
      id: 'performer_name',
      label: 'Performer / Artist / DJ / Band',
      type: 'text',
      required: true,
      placeholder: 'e.g., "J. Melody" or "The Soundwaves"',
      group: 'Performer Details'
    },
    {
      id: 'performer_email',
      label: 'Performer Email',
      type: 'email',
      required: true,
      group: 'Performer Details'
    },
    {
      id: 'performer_phone',
      label: 'Performer Phone',
      type: 'text',
      required: false,
      group: 'Performer Details'
    },
    {
      id: 'performer_social',
      label: 'Performer Social Media',
      type: 'text',
      required: false,
      group: 'Performer Details'
    },

    // Venue/Promoter Details
    {
      id: 'venue_name',
      label: 'Venue / Promoter / Organiser',
      type: 'text',
      required: true,
      placeholder: 'e.g., "Club XYZ" or "Events Co."',
      group: 'Venue Details'
    },
    {
      id: 'venue_email',
      label: 'Venue/Promoter Email',
      type: 'email',
      required: true,
      group: 'Venue Details'
    },
    {
      id: 'venue_phone',
      label: 'Venue/Promoter Phone',
      type: 'text',
      required: false,
      group: 'Venue Details'
    },
    {
      id: 'venue_social',
      label: 'Venue/Promoter Social Media',
      type: 'text',
      required: false,
      group: 'Venue Details'
    },

    // Event Details
    {
      id: 'event_name',
      label: 'Event Name (if any)',
      type: 'text',
      required: false,
      placeholder: 'e.g., "Summer Festival 2025"',
      group: 'Event Details'
    },
    {
      id: 'event_date',
      label: 'Event Date',
      type: 'date',
      required: true,
      group: 'Event Details',
      validation: {
        afterField: 'agreement_date',
        afterFieldMessage: 'Event date must be after the agreement date'
      }
    },
    {
      id: 'event_location',
      label: 'Event Location',
      type: 'text',
      required: true,
      placeholder: 'e.g., "123 Main Street, London"',
      group: 'Event Details'
    },

    // Performance Details
    {
      id: 'set_length',
      label: 'Set Length (minutes)',
      type: 'number',
      required: true,
      defaultValue: 60,
      validation: { min: 15, max: 240 },
      group: 'Performance Details'
    },
    {
      id: 'call_time',
      label: 'Call Time',
      type: 'time',
      required: true,
      group: 'Performance Details',
      helpText: 'When the artist should arrive at the venue'
    },
    {
      id: 'performance_start',
      label: 'Performance Start Time',
      type: 'time',
      required: true,
      group: 'Performance Details',
      validation: {
        afterField: 'call_time',
        afterFieldMessage: 'Performance must start after call time'
      }
    },
    {
      id: 'soundcheck_time',
      label: 'Soundcheck Time',
      type: 'time',
      required: false,
      group: 'Performance Details',
      validation: {
        beforeField: 'performance_start',
        beforeFieldMessage: 'Soundcheck must be before performance start'
      }
    },

    // Fees
    {
      id: 'performance_fee',
      label: 'Performance Fee',
      type: 'currency',
      required: true,
      group: 'Fees & Payment'
    },
    {
      id: 'vat_status',
      label: 'VAT Status',
      type: 'select',
      required: true,
      options: [
        { value: 'not_registered', label: 'Not VAT Registered - Fee is final' },
        { value: 'vat_registered', label: 'VAT Registered - Add VAT on top' }
      ],
      group: 'Fees & Payment'
    },
    {
      id: 'payment_method',
      label: 'Payment Method',
      type: 'select',
      required: true,
      options: [
        { value: 'bank_transfer', label: 'Bank Transfer' },
        { value: 'cash', label: 'Cash' },
        { value: 'paypal', label: 'PayPal' },
        { value: 'other', label: 'Other' }
      ],
      group: 'Fees & Payment'
    },
    {
      id: 'payment_timing',
      label: 'Payment Timing',
      type: 'select',
      required: true,
      options: [
        { value: 'before', label: 'Before Performance' },
        { value: 'after', label: 'Immediately After' },
        { value: 'within_7', label: 'Within 7 Days' },
        { value: 'within_14', label: 'Within 14 Days' },
        { value: 'within_30', label: 'Within 30 Days' }
      ],
      group: 'Fees & Payment'
    }
  ],

  optionalClauses: [
    {
      id: 'deposit',
      name: 'Deposit Requirement',
      description: 'Require a non-refundable deposit',
      defaultEnabled: true,
      fields: [
        {
          id: 'deposit_amount',
          label: 'Deposit Amount',
          type: 'currency',
          required: true
        },
        {
          id: 'deposit_due_date',
          label: 'Deposit Due Date',
          type: 'date',
          required: true,
          validation: {
            afterField: 'agreement_date',
            afterFieldMessage: 'Deposit due date must be after the agreement date',
            beforeField: 'event_date',
            beforeFieldMessage: 'Deposit due date must be before the event date'
          }
        }
      ]
    },
    {
      id: 'tech_rider',
      name: 'Technical Requirements (Tech Rider)',
      description: 'Specify equipment needed to perform',
      defaultEnabled: true,
      fields: [
        {
          id: 'equipment_needed',
          label: 'Equipment Needed',
          type: 'textarea',
          required: true,
          placeholder: 'e.g., PA System, DJ Decks, 2x Microphones, Monitor speakers'
        }
      ]
    },
    {
      id: 'hospitality',
      name: 'Hospitality Requirements',
      description: 'Food, drinks, and amenities provided',
      defaultEnabled: false,
      fields: [
        {
          id: 'hospitality_details',
          label: 'Hospitality Details',
          type: 'textarea',
          required: true,
          placeholder: 'e.g., Water, light snacks, private changing area'
        }
      ]
    },
    {
      id: 'merchandise',
      name: 'Merchandise Sales',
      description: 'Terms for selling merchandise at the event',
      defaultEnabled: false,
      fields: [
        {
          id: 'merch_split',
          label: 'Venue/Promoter Merchandise Cut (%)',
          type: 'number',
          required: true,
          defaultValue: 0,
          validation: { min: 0, max: 50 },
          helpText: '0 means performer keeps 100%'
        }
      ]
    },
    {
      id: 'recording_rights',
      name: 'Recording, Filming & Livestream Rights',
      description: 'Terms for recording the performance',
      defaultEnabled: true,
      fields: []
    }
  ],

  content: {
    title: 'LIVE PERFORMANCE AGREEMENT',
    sections: [
      {
        id: 'intro',
        heading: 'AGREEMENT DETAILS',
        content: `Date: {{agreement_date}}

This Live Performance Agreement is entered into between the Performer and the Venue/Promoter/Organiser.`
      },
      {
        id: 'parties',
        heading: 'PARTIES',
        content: `PERFORMER / ARTIST / DJ / BAND: {{performer_name}}
Email: {{performer_email}}
Phone: {{performer_phone}}
Social Media: {{performer_social}}

VENUE / PROMOTER / ORGANISER: {{venue_name}}
Email: {{venue_email}}
Phone: {{venue_phone}}
Social Media: {{venue_social}}`
      },
      {
        id: 'event_details',
        heading: 'EVENT DETAILS',
        content: `Event Name: {{event_name}}
Event Date: {{event_date}}
Event Location: {{event_location}}`
      },
      {
        id: 'performance_fee',
        heading: '1. PERFORMANCE FEE',
        content: `The Venue/Promoter will pay the Performer:

Performance Fee: {{performance_fee}}
VAT Status: {{vat_status}}`
      },
      {
        id: 'deposit',
        heading: '2. DEPOSIT (IF REQUIRED)',
        content: `A deposit of {{deposit_amount}} is required and must be paid by: {{deposit_due_date}}

This deposit is non-refundable unless the Venue/Promoter cancels the event.`,
        isOptional: true,
        clauseId: 'deposit'
      },
      {
        id: 'payment_method',
        heading: '3. PAYMENT METHOD',
        content: `Payments shall be made via: {{payment_method}}

Final payment must be made: {{payment_timing}}

Late payments may incur a reasonable late fee.`
      },
      {
        id: 'performance_details',
        heading: '4. PERFORMANCE DETAILS',
        content: `Set Length: {{set_length}} minutes
Call Time: {{call_time}}
Performance Start: {{performance_start}}
Soundcheck: {{soundcheck_time}}`
      },
      {
        id: 'tech_rider',
        heading: '5. TECHNICAL REQUIREMENTS (TECH RIDER)',
        content: `Equipment Needed:

{{equipment_needed}}

A tech rider lists the equipment needed to perform.`,
        isOptional: true,
        clauseId: 'tech_rider'
      },
      {
        id: 'hospitality',
        heading: '6. HOSPITALITY REQUIREMENTS',
        content: `If agreed, the Venue/Promoter will provide:

{{hospitality_details}}

Hospitality includes food, drinks, towels, etc.`,
        isOptional: true,
        clauseId: 'hospitality'
      },
      {
        id: 'recording',
        heading: '7. RECORDING, FILMING & LIVESTREAM',
        content: `Permission must be requested before recording or livestreaming.

Raw recordings cannot be sold or reused without written approval.`,
        isOptional: true,
        clauseId: 'recording_rights'
      },
      {
        id: 'merchandise',
        heading: '8. MERCHANDISE',
        content: `Venue/Promoter receives {{merch_split}}% of merchandise sales.

(0% means Performer keeps 100%)`,
        isOptional: true,
        clauseId: 'merchandise'
      },
      {
        id: 'cancellation',
        heading: '9. CANCELLATION',
        content: `If Performer cancels within 7 days: deposit forfeited.
If Venue/Promoter cancels within 7 days: 50% of the fee is owed.`
      },
      {
        id: 'liability',
        heading: '10. LIABILITY & SAFETY',
        content: `Venue must provide a safe working environment.`
      },
      {
        id: 'conduct',
        heading: '11. CONDUCT',
        content: `Both parties agree to behave professionally and respectfully.`
      },
      {
        id: 'signatures',
        heading: 'SIGNATURES',
        content: `PERFORMER / ARTIST / DJ / BAND

Name: {{performer_name}}
Signature: _________________________
Date: _______________
Email: {{performer_email}}
Phone: {{performer_phone}}
Social Media: {{performer_social}}


VENUE / PROMOTER / ORGANISER

Name: {{venue_name}}
Signature: _________________________
Date: _______________
Email: {{venue_email}}
Phone: {{venue_phone}}
Social Media: {{venue_social}}`
      }
    ]
  }
};
