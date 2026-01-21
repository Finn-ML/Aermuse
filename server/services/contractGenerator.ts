/**
 * Contract Generator Service
 * Generates professionally formatted Aermuse-styled contracts from parsed field data
 * Supports flexible structure for any contract type
 */

import type {
  ParsedContractFields,
  ParsedContractParty,
  ParsedFillableField,
  ParsedFee,
  ParsedExpense,
  ParsedRoyalty,
  ParsedCancellationPolicy,
  ParsedTermCondition,
} from './openai';

/**
 * Generate an Aermuse-styled HTML contract from parsed field data
 */
export function generateAermuseContract(data: ParsedContractFields): string {
  const sections: string[] = [];
  let sectionNumber = 1;

  // Header with Aermuse branding
  sections.push(generateHeader(data));

  // Parties section
  if (data.parties.length > 0) {
    sections.push(generatePartiesSection(data.parties, sectionNumber++));
  }

  // Fillable fields section (for templates)
  if (data.fillableFields && data.fillableFields.length > 0) {
    sections.push(generateFillableFieldsSection(data.fillableFields, sectionNumber++));
  }

  // Project details / Recitals (legacy)
  if (data.projectDetails?.title || data.projectDetails?.description || (data.projectDetails?.deliverables && data.projectDetails.deliverables.length > 0)) {
    sections.push(generateProjectSection(data.projectDetails, sectionNumber++));
  }

  // Term and dates
  if (data.dates.effectiveDate || data.dates.endDate || (data.dates.otherDates && data.dates.otherDates.length > 0)) {
    sections.push(generateDatesSection(data.dates, sectionNumber++));
  }

  // Financial terms
  if (hasFinancialTerms(data.financialTerms)) {
    sections.push(generateFinancialSection(data.financialTerms, sectionNumber++));
  }

  // Cancellation policy
  if (data.cancellationPolicy?.description || (data.cancellationPolicy?.tiers && data.cancellationPolicy.tiers.length > 0)) {
    sections.push(generateCancellationSection(data.cancellationPolicy, sectionNumber++));
  }

  // Terms and conditions
  if (data.termsAndConditions && data.termsAndConditions.length > 0) {
    sections.push(generateTermsAndConditionsSection(data.termsAndConditions, sectionNumber++));
  }

  // Territory and rights (legacy)
  if (data.territory) {
    sections.push(generateTerritorySection(data.territory, data.exclusivity, sectionNumber++));
  }

  // Termination (legacy)
  if (data.termination?.noticePeriod || (data.termination?.conditions && data.termination.conditions.length > 0)) {
    sections.push(generateTerminationSection(data.termination, sectionNumber++));
  }

  // Additional clauses (legacy)
  if (data.additionalClauses && data.additionalClauses.length > 0) {
    sections.push(generateAdditionalClausesSection(data.additionalClauses, sectionNumber++));
  }

  // Signatures section
  sections.push(generateSignaturesSection(data.parties));

  // Footer
  sections.push(generateFooter());

  return wrapInDocument(sections.join('\n'));
}

function hasFinancialTerms(terms: ParsedContractFields['financialTerms']): boolean {
  return Boolean(
    terms.fees?.length ||
    terms.expenses?.length ||
    terms.royalties?.length ||
    terms.paymentTerms ||
    terms.latePaymentTerms
  );
}

function wrapInDocument(content: string): string {
  return `
<div class="aermuse-contract" style="font-family: 'Times New Roman', Georgia, serif; color: #1a1a1a; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px;">
  ${content}
</div>
  `.trim();
}

function generateHeader(data: ParsedContractFields): string {
  const contractTypeDisplay = getContractTypeDisplay(data.contractType);

  return `
<div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #660033; padding-bottom: 30px;">
  <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px;">
    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #660033 0%, #8B0045 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
      <span style="color: #F7E6CA; font-size: 20px; font-weight: bold;">A</span>
    </div>
    <span style="font-size: 14px; letter-spacing: 3px; color: #660033; text-transform: uppercase;">Aermuse</span>
  </div>
  <h1 style="font-size: 28px; color: #660033; margin: 0 0 10px 0; font-weight: 700;">${escapeHtml(data.title)}</h1>
  <p style="font-size: 14px; color: #666; margin: 0; text-transform: uppercase; letter-spacing: 1px;">${contractTypeDisplay}</p>
</div>
  `.trim();
}

function generatePartiesSection(parties: ParsedContractParty[], sectionNum: number): string {
  const partyItems = parties.map((party, index) => {
    const details: string[] = [];
    if (party.company) details.push(`<strong>Company:</strong> ${escapeHtml(party.company)}`);
    if (party.email) details.push(`<strong>Email:</strong> ${escapeHtml(party.email)}`);
    if (party.phone) details.push(`<strong>Phone:</strong> ${escapeHtml(party.phone)}`);
    if (party.address) {
      let address = escapeHtml(party.address);
      if (party.postcode) address += `, ${escapeHtml(party.postcode)}`;
      details.push(`<strong>Address:</strong> ${address}`);
    }
    if (party.vatNumber) details.push(`<strong>VAT Number:</strong> ${escapeHtml(party.vatNumber)}`);

    return `
<div style="margin-bottom: 20px; padding: 20px; background: rgba(102, 0, 51, 0.03); border-radius: 8px; border-left: 4px solid #660033;">
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
    <span style="background: #660033; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">${index + 1}</span>
    <strong style="color: #660033; font-size: 16px;">${escapeHtml(party.name)}</strong>
    <span style="background: rgba(102, 0, 51, 0.1); color: #660033; padding: 2px 10px; border-radius: 12px; font-size: 12px;">${escapeHtml(party.role)}</span>
  </div>
  ${details.length > 0 ? `<div style="font-size: 14px; color: #444; margin-left: 34px;">${details.join('<br/>')}</div>` : ''}
</div>
    `.trim();
  }).join('\n');

  return `
<div style="margin-bottom: 30px;">
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">${sectionNum}. Parties</h2>
  <p style="margin-bottom: 20px; color: #333;">This Agreement is entered into by and between the following parties:</p>
  ${partyItems}
</div>
  `.trim();
}

function generateFillableFieldsSection(fields: ParsedFillableField[], sectionNum: number): string {
  // Group fields by section
  const grouped: Record<string, ParsedFillableField[]> = {};
  fields.forEach(field => {
    const section = field.section || 'General';
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push(field);
  });

  const sectionItems = Object.entries(grouped).map(([sectionName, sectionFields]) => {
    const fieldItems = sectionFields.map(field => {
      const value = field.value !== null && field.value !== undefined && field.value !== ''
        ? formatFieldValue(field.value, field.type)
        : '<span style="color: #999; font-style: italic;">[To be completed]</span>';

      return `
<div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(102, 0, 51, 0.05);">
  <span style="color: #333; font-weight: 500;">${escapeHtml(field.label)}${field.required ? ' *' : ''}</span>
  <span style="color: #660033;">${value}</span>
</div>
      `.trim();
    }).join('\n');

    return `
<div style="margin-bottom: 20px;">
  <h3 style="font-size: 14px; color: #660033; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">${escapeHtml(sectionName)}</h3>
  <div style="background: rgba(102, 0, 51, 0.02); padding: 15px; border-radius: 8px;">
    ${fieldItems}
  </div>
</div>
    `.trim();
  }).join('\n');

  return `
<div style="margin-bottom: 30px;">
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">${sectionNum}. Contract Details</h2>
  ${sectionItems}
</div>
  `.trim();
}

function formatFieldValue(value: string | number | boolean | null, type: string): string {
  if (value === null || value === undefined) return '';

  switch (type) {
    case 'currency':
      return `£${Number(value).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
    case 'number':
      return Number(value).toLocaleString();
    case 'yes_no':
      return value ? 'Yes' : 'No';
    case 'date':
      return formatDate(String(value));
    default:
      return escapeHtml(String(value));
  }
}

function generateProjectSection(project: { title?: string; description?: string; deliverables?: string[] }, sectionNum: number): string {
  const items: string[] = [];

  if (project.title) {
    items.push(`<p><strong>Project Title:</strong> ${escapeHtml(project.title)}</p>`);
  }

  if (project.description) {
    items.push(`<p><strong>Description:</strong> ${escapeHtml(project.description)}</p>`);
  }

  if (project.deliverables && project.deliverables.length > 0) {
    items.push(`
<div style="margin-top: 15px;">
  <strong>Deliverables:</strong>
  <ul style="margin: 10px 0 0 20px; padding: 0;">
    ${project.deliverables.map(d => `<li style="margin-bottom: 5px;">${escapeHtml(d)}</li>`).join('\n')}
  </ul>
</div>
    `.trim());
  }

  return `
<div style="margin-bottom: 30px;">
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">${sectionNum}. Project Details</h2>
  ${items.join('\n')}
</div>
  `.trim();
}

function generateDatesSection(dates: ParsedContractFields['dates'], sectionNum: number): string {
  const items: string[] = [];

  if (dates.effectiveDate) {
    items.push(`<p><strong>Effective Date:</strong> ${formatDate(dates.effectiveDate)}</p>`);
  }

  if (dates.endDate) {
    items.push(`<p><strong>End Date:</strong> ${formatDate(dates.endDate)}</p>`);
  }

  if (dates.otherDates && dates.otherDates.length > 0) {
    items.push(`
<div style="margin-top: 15px;">
  <strong>Key Dates:</strong>
  <table style="width: 100%; margin-top: 10px; border-collapse: collapse;">
    <thead>
      <tr style="background: rgba(102, 0, 51, 0.05);">
        <th style="padding: 10px; text-align: left; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">Date Type</th>
        <th style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">Date/Time</th>
      </tr>
    </thead>
    <tbody>
      ${dates.otherDates.map(d => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.05);">${escapeHtml(d.label)}</td>
          <td style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(102, 0, 51, 0.05);">${escapeHtml(d.value)}</td>
        </tr>
      `).join('\n')}
    </tbody>
  </table>
</div>
    `.trim());
  }

  return `
<div style="margin-bottom: 30px;">
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">${sectionNum}. Term and Dates</h2>
  ${items.join('\n')}
</div>
  `.trim();
}

function generateFinancialSection(terms: ParsedContractFields['financialTerms'], sectionNum: number): string {
  const items: string[] = [];

  // Fees
  if (terms.fees && terms.fees.length > 0) {
    items.push(`
<div style="margin-bottom: 20px;">
  <strong>Fees:</strong>
  <table style="width: 100%; margin-top: 10px; border-collapse: collapse;">
    <thead>
      <tr style="background: rgba(102, 0, 51, 0.05);">
        <th style="padding: 10px; text-align: left; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">Description</th>
        <th style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${terms.fees.map(f => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.05);">${escapeHtml(f.label)}</td>
          <td style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(102, 0, 51, 0.05);">${getCurrencySymbol(f.currency || 'GBP')}${f.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('\n')}
    </tbody>
  </table>
</div>
    `.trim());
  }

  // Expenses
  if (terms.expenses && terms.expenses.length > 0) {
    items.push(`
<div style="margin-bottom: 20px;">
  <strong>Expenses:</strong>
  <table style="width: 100%; margin-top: 10px; border-collapse: collapse;">
    <thead>
      <tr style="background: rgba(102, 0, 51, 0.05);">
        <th style="padding: 10px; text-align: left; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">Type</th>
        <th style="padding: 10px; text-align: center; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">Covered</th>
        <th style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">Details</th>
      </tr>
    </thead>
    <tbody>
      ${terms.expenses.map(e => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.05);">${escapeHtml(e.type)}</td>
          <td style="padding: 10px; text-align: center; border-bottom: 1px solid rgba(102, 0, 51, 0.05);">
            <span style="color: ${e.covered ? '#28a745' : '#dc3545'}; font-weight: bold;">${e.covered ? 'Yes' : 'No'}</span>
          </td>
          <td style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(102, 0, 51, 0.05);">${e.details ? escapeHtml(e.details) : '-'}</td>
        </tr>
      `).join('\n')}
    </tbody>
  </table>
</div>
    `.trim());
  }

  // Royalties
  if (terms.royalties && terms.royalties.length > 0) {
    items.push(`
<div style="margin-bottom: 20px;">
  <strong>Royalty Splits:</strong>
  <table style="width: 100%; margin-top: 10px; border-collapse: collapse;">
    <thead>
      <tr style="background: rgba(102, 0, 51, 0.05);">
        <th style="padding: 10px; text-align: left; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">Party</th>
        <th style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">Percentage</th>
      </tr>
    </thead>
    <tbody>
      ${terms.royalties.map(r => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.05);">${escapeHtml(r.party)}</td>
          <td style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(102, 0, 51, 0.05);"><strong>${r.percentage}%</strong></td>
        </tr>
      `).join('\n')}
    </tbody>
  </table>
</div>
    `.trim());
  }

  // Payment terms
  if (terms.paymentTerms) {
    items.push(`<p><strong>Payment Terms:</strong> ${escapeHtml(terms.paymentTerms)}</p>`);
  }

  // Late payment terms
  if (terms.latePaymentTerms) {
    items.push(`<p><strong>Late Payment:</strong> ${escapeHtml(terms.latePaymentTerms)}</p>`);
  }

  return `
<div style="margin-bottom: 30px;">
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">${sectionNum}. Financial Terms</h2>
  ${items.join('\n')}
</div>
  `.trim();
}

function generateCancellationSection(policy: ParsedCancellationPolicy, sectionNum: number): string {
  const items: string[] = [];

  if (policy.description) {
    items.push(`<p style="margin-bottom: 15px;">${escapeHtml(policy.description)}</p>`);
  }

  if (policy.tiers && policy.tiers.length > 0) {
    items.push(`
<table style="width: 100%; border-collapse: collapse;">
  <thead>
    <tr style="background: rgba(102, 0, 51, 0.05);">
      <th style="padding: 10px; text-align: left; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">Notice Period</th>
      <th style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">Refund</th>
    </tr>
  </thead>
  <tbody>
    ${policy.tiers.map(t => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.05);">${escapeHtml(t.notice)}</td>
        <td style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(102, 0, 51, 0.05);"><strong>${t.refundPercent}%</strong></td>
      </tr>
    `).join('\n')}
  </tbody>
</table>
    `.trim());
  }

  return `
<div style="margin-bottom: 30px;">
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">${sectionNum}. Cancellation Policy</h2>
  ${items.join('\n')}
</div>
  `.trim();
}

function generateTermsAndConditionsSection(terms: ParsedTermCondition[], sectionNum: number): string {
  const termItems = terms.map(term => `
<div style="margin-bottom: 20px; padding-left: 20px; border-left: 3px solid rgba(102, 0, 51, 0.2);">
  <h3 style="font-size: 14px; color: #660033; margin: 0 0 8px 0;">
    <span style="font-weight: bold;">${term.number}.</span> ${escapeHtml(term.title)}
  </h3>
  <p style="margin: 0; color: #333; line-height: 1.6;">${escapeHtml(term.content)}</p>
</div>
  `.trim()).join('\n');

  return `
<div style="margin-bottom: 30px;">
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">${sectionNum}. Terms and Conditions</h2>
  ${termItems}
</div>
  `.trim();
}

function generateTerritorySection(territory: string, exclusivity: ParsedContractFields['exclusivity'], sectionNum: number): string {
  const items: string[] = [];

  items.push(`<p><strong>Territory:</strong> ${escapeHtml(territory)}</p>`);

  if (exclusivity) {
    items.push(`<p><strong>Exclusivity:</strong> ${exclusivity.isExclusive ? 'Exclusive' : 'Non-Exclusive'}</p>`);
    if (exclusivity.period) {
      items.push(`<p><strong>Exclusivity Period:</strong> ${escapeHtml(exclusivity.period)}</p>`);
    }
    if (exclusivity.scope) {
      items.push(`<p><strong>Scope:</strong> ${escapeHtml(exclusivity.scope)}</p>`);
    }
  }

  return `
<div style="margin-bottom: 30px;">
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">${sectionNum}. Territory and Rights</h2>
  ${items.join('\n')}
</div>
  `.trim();
}

function generateTerminationSection(termination: NonNullable<ParsedContractFields['termination']>, sectionNum: number): string {
  const items: string[] = [];

  if (termination.noticePeriod) {
    items.push(`<p><strong>Notice Period:</strong> ${escapeHtml(termination.noticePeriod)}</p>`);
  }

  if (termination.conditions && termination.conditions.length > 0) {
    items.push(`
<div style="margin-top: 15px;">
  <strong>Termination Conditions:</strong>
  <ul style="margin: 10px 0 0 20px; padding: 0;">
    ${termination.conditions.map(c => `<li style="margin-bottom: 5px;">${escapeHtml(c)}</li>`).join('\n')}
  </ul>
</div>
    `.trim());
  }

  return `
<div style="margin-bottom: 30px;">
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">${sectionNum}. Termination</h2>
  ${items.join('\n')}
</div>
  `.trim();
}

function generateAdditionalClausesSection(clauses: Array<{ title: string; content: string }>, sectionNum: number): string {
  const clauseItems = clauses.map((clause, index) => `
<div style="margin-bottom: 20px;">
  <h3 style="font-size: 14px; color: #660033; margin: 0 0 10px 0;">${sectionNum}.${index + 1} ${escapeHtml(clause.title)}</h3>
  <p style="margin: 0; color: #333;">${escapeHtml(clause.content)}</p>
</div>
  `.trim()).join('\n');

  return `
<div style="margin-bottom: 30px;">
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">${sectionNum}. Additional Terms</h2>
  ${clauseItems}
</div>
  `.trim();
}

function generateSignaturesSection(parties: ParsedContractParty[]): string {
  const signatureBlocks = parties.slice(0, 4).map(party => `
<div style="flex: 1; min-width: 250px;">
  <p style="margin: 0 0 10px 0; font-weight: bold; color: #660033;">${escapeHtml(party.name)}</p>
  ${party.company ? `<p style="margin: 0 0 5px 0; font-size: 13px; color: #666;">${escapeHtml(party.company)}</p>` : ''}
  <p style="margin: 0 0 5px 0; font-size: 12px; color: #999;">${escapeHtml(party.role)}</p>
  <div style="margin-top: 40px; border-top: 1px solid #333; padding-top: 10px;">
    <p style="margin: 0; font-size: 12px; color: #666;">Signature</p>
  </div>
  <div style="margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px;">
    <p style="margin: 0; font-size: 12px; color: #666;">Date</p>
  </div>
</div>
  `.trim()).join('\n');

  return `
<div style="margin-top: 50px; padding-top: 30px; border-top: 2px solid #660033;">
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 30px 0;">Signatures</h2>
  <p style="margin-bottom: 30px; color: #333;">IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.</p>
  <div style="display: flex; flex-wrap: wrap; gap: 40px;">
    ${signatureBlocks}
  </div>
</div>
  `.trim();
}

function generateFooter(): string {
  const currentYear = new Date().getFullYear();

  return `
<div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid rgba(102, 0, 51, 0.1); text-align: center;">
  <p style="margin: 0; font-size: 12px; color: #999;">
    Generated with Aermuse Contract Manager<br/>
    &copy; ${currentYear} Aermuse. All rights reserved.
  </p>
</div>
  `.trim();
}

// Helper functions

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

function getContractTypeDisplay(type: string): string {
  // If it's already a descriptive type, use it directly
  if (type.length > 15 || type.includes(' ')) {
    return type;
  }

  // Map common short types to display names
  const displayNames: Record<string, string> = {
    collaboration: 'Collaboration Agreement',
    licensing: 'Licensing Agreement',
    touring: 'Touring Agreement',
    production: 'Production Agreement',
    business: 'Business Agreement',
    management: 'Management Agreement',
    publishing: 'Publishing Agreement',
    performance: 'Performance Agreement',
    other: 'Contract Agreement',
    contract: 'Contract Agreement'
  };
  return displayNames[type.toLowerCase()] || type;
}

function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    GBP: '£',
    EUR: '€',
    CAD: 'C$',
    AUD: 'A$',
    JPY: '¥'
  };
  return symbols[currency.toUpperCase()] || '£';
}
