/**
 * Work-for-Hire Agreement Template
 * Epic 3: Contract Templates System - Story 3.6
 *
 * For commissioned creative work where ownership is assigned to the client.
 */

import type { TemplateDefinition } from "./artist-agreement";

export const workForHireAgreementTemplate: TemplateDefinition = {
  name: 'Work-for-Hire Agreement',
  description: 'For commissioned creative work. Covers project scope, deliverables, payment, IP assignment, and revision terms.',
  category: 'production',
  isActive: true,
  sortOrder: 5,
  version: 1,

  fields: [
    // Client
    {
      id: 'client_name',
      label: 'Client Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Music Production Ltd',
      group: 'Client Details'
    },
    {
      id: 'client_address',
      label: 'Client Address',
      type: 'textarea',
      required: true,
      group: 'Client Details'
    },
    {
      id: 'client_email',
      label: 'Client Email',
      type: 'email',
      required: true,
      group: 'Client Details'
    },

    // Contractor
    {
      id: 'contractor_name',
      label: 'Contractor Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Jane Smith (Producer)',
      group: 'Contractor Details'
    },
    {
      id: 'contractor_address',
      label: 'Contractor Address',
      type: 'textarea',
      required: true,
      group: 'Contractor Details'
    },
    {
      id: 'contractor_email',
      label: 'Contractor Email',
      type: 'email',
      required: true,
      group: 'Contractor Details'
    },

    // Project Details
    {
      id: 'project_title',
      label: 'Project Title',
      type: 'text',
      required: true,
      placeholder: 'e.g., Album Production',
      group: 'Project Details'
    },
    {
      id: 'project_description',
      label: 'Project Description',
      type: 'textarea',
      required: true,
      placeholder: 'Describe the work to be performed...',
      group: 'Project Details'
    },
    {
      id: 'deliverables',
      label: 'Deliverables',
      type: 'textarea',
      required: true,
      placeholder: 'List all deliverables (e.g., 10 mixed and mastered tracks, project files...)',
      group: 'Project Details'
    },

    // Timeline
    {
      id: 'start_date',
      label: 'Project Start Date',
      type: 'date',
      required: true,
      group: 'Timeline'
    },
    {
      id: 'deadline',
      label: 'Delivery Deadline',
      type: 'date',
      required: true,
      group: 'Timeline'
    },

    // Payment
    {
      id: 'total_fee',
      label: 'Total Project Fee',
      type: 'currency',
      required: true,
      group: 'Payment'
    },
    {
      id: 'payment_schedule',
      label: 'Payment Schedule',
      type: 'select',
      required: true,
      defaultValue: 'milestone',
      options: [
        { value: 'upfront', label: '100% upfront' },
        { value: 'half', label: '50% upfront, 50% on delivery' },
        { value: 'thirds', label: '1/3 upfront, 1/3 midpoint, 1/3 on delivery' },
        { value: 'milestone', label: 'Milestone-based' },
        { value: 'completion', label: '100% on completion' }
      ],
      group: 'Payment'
    }
  ],

  optionalClauses: [
    {
      id: 'deposit',
      name: 'Deposit Terms',
      description: 'Upfront deposit requirements',
      defaultEnabled: true,
      fields: [
        {
          id: 'deposit_amount',
          label: 'Deposit Amount',
          type: 'currency',
          required: true
        },
        {
          id: 'deposit_refundable',
          label: 'Deposit Refundable?',
          type: 'select',
          required: true,
          options: [
            { value: 'yes', label: 'Yes, fully refundable' },
            { value: 'partial', label: 'Partially refundable' },
            { value: 'no', label: 'Non-refundable' }
          ]
        }
      ]
    },
    {
      id: 'revisions',
      name: 'Revision Terms',
      description: 'Number of revisions included and additional revision fees',
      defaultEnabled: true,
      fields: [
        {
          id: 'included_revisions',
          label: 'Revisions Included',
          type: 'number',
          required: true,
          defaultValue: 2,
          validation: { min: 0, max: 10 }
        },
        {
          id: 'revision_fee',
          label: 'Additional Revision Fee',
          type: 'currency',
          required: true,
          helpText: 'Fee per additional revision beyond included amount'
        }
      ]
    },
    {
      id: 'credit',
      name: 'Credit/Attribution',
      description: 'Whether contractor receives credit',
      defaultEnabled: false,
      fields: [
        {
          id: 'credit_text',
          label: 'Credit Text',
          type: 'text',
          required: true,
          placeholder: 'e.g., "Produced by Jane Smith"'
        }
      ]
    },
    {
      id: 'kill_fee',
      name: 'Kill Fee',
      description: 'Compensation if project is cancelled',
      defaultEnabled: true,
      fields: [
        {
          id: 'kill_fee_percentage',
          label: 'Kill Fee (%)',
          type: 'number',
          required: true,
          defaultValue: 50,
          validation: { min: 0, max: 100 },
          helpText: 'Percentage of total fee due if project is cancelled'
        }
      ]
    },
    {
      id: 'confidentiality',
      name: 'Confidentiality',
      description: 'Non-disclosure obligations',
      defaultEnabled: true,
      fields: [
        {
          id: 'confidentiality_period',
          label: 'Confidentiality Period (months)',
          type: 'number',
          required: true,
          defaultValue: 24,
          validation: { min: 6, max: 60 }
        }
      ]
    }
  ],

  content: {
    title: 'WORK-FOR-HIRE AGREEMENT',
    sections: [
      {
        id: 'parties',
        heading: '1. PARTIES',
        content: `This Work-for-Hire Agreement ("Agreement") is entered into as of {{start_date}} by and between:

{{client_name}} ("Client")
Address: {{client_address}}
Email: {{client_email}}

AND

{{contractor_name}} ("Contractor")
Address: {{contractor_address}}
Email: {{contractor_email}}`
      },
      {
        id: 'engagement',
        heading: '2. ENGAGEMENT',
        content: `Client hereby engages Contractor to perform the following work:

Project Title: {{project_title}}

Project Description:
{{project_description}}

This engagement begins on {{start_date}} and all deliverables must be completed by {{deadline}}.`
      },
      {
        id: 'deliverables',
        heading: '3. DELIVERABLES',
        content: `Contractor agrees to deliver the following:

{{deliverables}}

All deliverables shall be provided in industry-standard formats as agreed between the parties.`
      },
      {
        id: 'payment',
        heading: '4. PAYMENT',
        content: `Client agrees to pay Contractor a total fee of {{total_fee}} for the work described herein.

Payment Schedule: {{payment_schedule}}

All payments shall be made in GBP via bank transfer within 14 days of invoice.`
      },
      {
        id: 'deposit_section',
        heading: '5. DEPOSIT',
        content: `A deposit of {{deposit_amount}} is required before work commences.

Refund Policy: {{deposit_refundable}}

Work will not begin until the deposit is received.`,
        isOptional: true,
        clauseId: 'deposit'
      },
      {
        id: 'revisions_section',
        heading: '6. REVISIONS',
        content: `This Agreement includes {{included_revisions}} round(s) of revisions.

Additional revisions beyond those included shall be charged at {{revision_fee}} per revision round.

Revision requests must be submitted in writing within 7 days of receiving deliverables.`,
        isOptional: true,
        clauseId: 'revisions'
      },
      {
        id: 'ip_assignment',
        heading: '7. INTELLECTUAL PROPERTY',
        content: `All work created under this Agreement shall be considered "work made for hire" under applicable copyright law.

Client shall own all rights, title, and interest in the deliverables, including all copyrights, from the moment of creation.

Contractor hereby assigns to Client any and all rights that may not automatically vest in Client under work-for-hire doctrine.

Contractor retains no rights to use, license, or exploit the deliverables without Client's prior written consent.`
      },
      {
        id: 'credit_section',
        heading: '8. CREDIT',
        content: `Client agrees to credit Contractor as follows where reasonably practicable:

{{credit_text}}

Such credit shall be at Client's sole discretion and failure to provide credit shall not constitute a breach of this Agreement.`,
        isOptional: true,
        clauseId: 'credit'
      },
      {
        id: 'kill_fee_section',
        heading: '9. CANCELLATION AND KILL FEE',
        content: `If Client cancels the project after work has commenced, Client shall pay Contractor a kill fee equal to {{kill_fee_percentage}}% of the total fee, less any amounts already paid.

The kill fee compensates Contractor for time reserved and work performed.`,
        isOptional: true,
        clauseId: 'kill_fee'
      },
      {
        id: 'confidentiality_section',
        heading: '10. CONFIDENTIALITY',
        content: `Contractor agrees to keep all project information confidential for a period of {{confidentiality_period}} months from the completion or termination of this Agreement.

This includes all materials, creative direction, and business information disclosed by Client.`,
        isOptional: true,
        clauseId: 'confidentiality'
      },
      {
        id: 'warranties',
        heading: '11. WARRANTIES',
        content: `Contractor warrants that:
a) All work will be original and will not infringe any third-party rights
b) Contractor has the skills and experience to perform the work
c) Work will be performed in a professional manner

Client warrants that any materials provided to Contractor do not infringe third-party rights.`
      },
      {
        id: 'general',
        heading: '12. GENERAL PROVISIONS',
        content: `Independent Contractor: Contractor is an independent contractor, not an employee.

Entire Agreement: This Agreement constitutes the entire understanding between the parties.

Amendments: This Agreement may only be amended in writing signed by both parties.

Governing Law: This Agreement shall be governed by the laws of England and Wales.`
      },
      {
        id: 'signatures',
        heading: '13. SIGNATURES',
        content: `IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.


_____________________________
{{client_name}} (Client)
Date: _______________


_____________________________
{{contractor_name}} (Contractor)
Date: _______________`
      }
    ]
  }
};
