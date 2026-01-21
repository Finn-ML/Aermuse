/**
 * Contract Generator Service
 * Generates professionally formatted Aermuse-styled contracts from parsed field data
 */

import type { ParsedContractFields, ParsedContractParty, ParsedRoyaltySplit, ParsedFee, ParsedAdditionalClause } from './openai';

/**
 * Generate an Aermuse-styled HTML contract from parsed field data
 */
export function generateAermuseContract(data: ParsedContractFields): string {
  const sections: string[] = [];

  // Header with Aermuse branding
  sections.push(generateHeader(data));

  // Parties section
  if (data.parties.length > 0) {
    sections.push(generatePartiesSection(data.parties));
  }

  // Project details / Recitals
  if (data.projectDetails.title || data.projectDetails.description || (data.projectDetails.deliverables && data.projectDetails.deliverables.length > 0)) {
    sections.push(generateProjectSection(data.projectDetails));
  }

  // Term and dates
  if (data.dates.effectiveDate || data.dates.endDate || data.dates.deliveryDate) {
    sections.push(generateDatesSection(data.dates));
  }

  // Financial terms
  if (data.financialTerms.advanceAmount || data.financialTerms.royaltySplits?.length || data.financialTerms.fees?.length) {
    sections.push(generateFinancialSection(data.financialTerms));
  }

  // Territory and rights
  if (data.territory) {
    sections.push(generateTerritorySection(data.territory, data.exclusivity));
  }

  // Termination
  if (data.termination?.noticePeriod || data.termination?.conditions?.length) {
    sections.push(generateTerminationSection(data.termination));
  }

  // Additional clauses
  if (data.additionalClauses?.length) {
    sections.push(generateAdditionalClausesSection(data.additionalClauses));
  }

  // Signatures section
  sections.push(generateSignaturesSection(data.parties));

  // Footer
  sections.push(generateFooter());

  return wrapInDocument(sections.join('\n'));
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
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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

function generatePartiesSection(parties: ParsedContractParty[]): string {
  const partyItems = parties.map((party, index) => {
    const details: string[] = [];
    if (party.company) details.push(`<strong>Company:</strong> ${escapeHtml(party.company)}`);
    if (party.email) details.push(`<strong>Email:</strong> ${escapeHtml(party.email)}`);
    if (party.address) details.push(`<strong>Address:</strong> ${escapeHtml(party.address)}`);

    return `
<div style="margin-bottom: 20px; padding: 20px; background: rgba(102, 0, 51, 0.03); border-radius: 8px; border-left: 4px solid #660033;">
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
    <span style="background: #660033; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">${index + 1}</span>
    <strong style="color: #660033; font-size: 16px;">${escapeHtml(party.name)}</strong>
    <span style="background: rgba(102, 0, 51, 0.1); color: #660033; padding: 2px 10px; border-radius: 12px; font-size: 12px; text-transform: capitalize;">${party.role}</span>
  </div>
  ${details.length > 0 ? `<div style="font-size: 14px; color: #444; margin-left: 34px;">${details.join('<br/>')}</div>` : ''}
</div>
    `.trim();
  }).join('\n');

  return `
<div style="margin-bottom: 30px;">
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">1. Parties</h2>
  <p style="margin-bottom: 20px; color: #333;">This Agreement is entered into by and between the following parties:</p>
  ${partyItems}
</div>
  `.trim();
}

function generateProjectSection(project: { title?: string | null; description?: string | null; deliverables?: string[] }): string {
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
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">2. Project Details</h2>
  ${items.join('\n')}
</div>
  `.trim();
}

function generateDatesSection(dates: { effectiveDate?: string; endDate?: string; deliveryDate?: string; milestones?: Array<{ description: string; date: string }> }): string {
  const items: string[] = [];

  if (dates.effectiveDate) {
    items.push(`<p><strong>Effective Date:</strong> ${formatDate(dates.effectiveDate)}</p>`);
  }

  if (dates.endDate) {
    items.push(`<p><strong>End Date:</strong> ${formatDate(dates.endDate)}</p>`);
  }

  if (dates.deliveryDate) {
    items.push(`<p><strong>Delivery Date:</strong> ${formatDate(dates.deliveryDate)}</p>`);
  }

  if (dates.milestones && dates.milestones.length > 0) {
    items.push(`
<div style="margin-top: 15px;">
  <strong>Key Milestones:</strong>
  <table style="width: 100%; margin-top: 10px; border-collapse: collapse;">
    <thead>
      <tr style="background: rgba(102, 0, 51, 0.05);">
        <th style="padding: 10px; text-align: left; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">Milestone</th>
        <th style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">Date</th>
      </tr>
    </thead>
    <tbody>
      ${dates.milestones.map(m => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.05);">${escapeHtml(m.description)}</td>
          <td style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(102, 0, 51, 0.05);">${formatDate(m.date)}</td>
        </tr>
      `).join('\n')}
    </tbody>
  </table>
</div>
    `.trim());
  }

  return `
<div style="margin-bottom: 30px;">
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">3. Term and Dates</h2>
  ${items.join('\n')}
</div>
  `.trim();
}

function generateFinancialSection(terms: { advanceAmount?: number; currency?: string; royaltySplits?: ParsedRoyaltySplit[]; fees?: ParsedFee[]; paymentSchedule?: string }): string {
  const items: string[] = [];
  const currency = terms.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);

  if (terms.advanceAmount) {
    items.push(`<p><strong>Advance Payment:</strong> ${currencySymbol}${terms.advanceAmount.toLocaleString()} ${currency}</p>`);
  }

  if (terms.royaltySplits && terms.royaltySplits.length > 0) {
    items.push(`
<div style="margin-top: 15px;">
  <strong>Royalty Splits:</strong>
  <table style="width: 100%; margin-top: 10px; border-collapse: collapse;">
    <thead>
      <tr style="background: rgba(102, 0, 51, 0.05);">
        <th style="padding: 10px; text-align: left; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">Party</th>
        <th style="padding: 10px; text-align: center; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">Percentage</th>
        <th style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">Type</th>
      </tr>
    </thead>
    <tbody>
      ${terms.royaltySplits.map(s => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.05);">${escapeHtml(s.party)}</td>
          <td style="padding: 10px; text-align: center; border-bottom: 1px solid rgba(102, 0, 51, 0.05);"><strong>${s.percentage}%</strong></td>
          <td style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(102, 0, 51, 0.05);">${s.type ? escapeHtml(s.type) : '-'}</td>
        </tr>
      `).join('\n')}
    </tbody>
  </table>
</div>
    `.trim());
  }

  if (terms.fees && terms.fees.length > 0) {
    items.push(`
<div style="margin-top: 15px;">
  <strong>Additional Fees:</strong>
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
          <td style="padding: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.05);">${escapeHtml(f.description)}</td>
          <td style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(102, 0, 51, 0.05);">${getCurrencySymbol(f.currency || currency)}${f.amount.toLocaleString()}</td>
        </tr>
      `).join('\n')}
    </tbody>
  </table>
</div>
    `.trim());
  }

  if (terms.paymentSchedule) {
    items.push(`<p style="margin-top: 15px;"><strong>Payment Schedule:</strong> ${escapeHtml(terms.paymentSchedule)}</p>`);
  }

  return `
<div style="margin-bottom: 30px;">
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">4. Financial Terms</h2>
  ${items.join('\n')}
</div>
  `.trim();
}

function generateTerritorySection(territory: string, exclusivity?: { isExclusive: boolean; period?: string | null; scope?: string | null }): string {
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
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">5. Territory and Rights</h2>
  ${items.join('\n')}
</div>
  `.trim();
}

function generateTerminationSection(termination: { noticePeriod?: string | null; conditions?: string[] }): string {
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
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">6. Termination</h2>
  ${items.join('\n')}
</div>
  `.trim();
}

function generateAdditionalClausesSection(clauses: ParsedAdditionalClause[]): string {
  const clauseItems = clauses.map((clause, index) => `
<div style="margin-bottom: 20px;">
  <h3 style="font-size: 14px; color: #660033; margin: 0 0 10px 0;">7.${index + 1} ${escapeHtml(clause.title)}</h3>
  <p style="margin: 0; color: #333;">${escapeHtml(clause.content)}</p>
</div>
  `.trim()).join('\n');

  return `
<div style="margin-bottom: 30px;">
  <h2 style="font-size: 18px; color: #660033; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid rgba(102, 0, 51, 0.1);">7. Additional Terms</h2>
  ${clauseItems}
</div>
  `.trim();
}

function generateSignaturesSection(parties: ParsedContractParty[]): string {
  const signatureBlocks = parties.slice(0, 4).map(party => `
<div style="flex: 1; min-width: 250px;">
  <p style="margin: 0 0 10px 0; font-weight: bold; color: #660033;">${escapeHtml(party.name)}</p>
  ${party.company ? `<p style="margin: 0 0 5px 0; font-size: 13px; color: #666;">${escapeHtml(party.company)}</p>` : ''}
  <p style="margin: 0 0 5px 0; font-size: 12px; color: #999; text-transform: capitalize;">${party.role}</p>
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
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

function getContractTypeDisplay(type: string): string {
  const displayNames: Record<string, string> = {
    collaboration: 'Collaboration Agreement',
    licensing: 'Licensing Agreement',
    touring: 'Touring Agreement',
    production: 'Production Agreement',
    business: 'Business Agreement',
    management: 'Management Agreement',
    publishing: 'Publishing Agreement',
    other: 'Contract Agreement'
  };
  return displayNames[type] || 'Contract Agreement';
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
  return symbols[currency.toUpperCase()] || '$';
}
