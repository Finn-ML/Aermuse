/**
 * Template Rendering Service
 * Epic 3: Contract Templates System
 *
 * Handles variable substitution, validation, and content rendering for contract templates.
 */

import type {
  TemplateContent,
  TemplateField,
  OptionalClause,
  TemplateFormData,
  ContractTemplate
} from "../../shared/types/templates";

/**
 * Format a date value for display in contracts
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format a currency value for display in contracts
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(amount);
}

/**
 * Format a time value (HH:MM) for display in contracts
 */
export function formatTime(time: string): string {
  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  const match = time.match(timeRegex);
  if (!match) return time;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? 'PM' : 'AM';

  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;

  return `${hours}:${minutes} ${period}`;
}

/**
 * Check if a string is an ISO date format
 */
function isISODateString(value: string): boolean {
  // Match ISO 8601 date formats like "2025-11-30" or "2025-11-30T00:00:00.000Z"
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(value);
}

/**
 * Substitute {{variable}} placeholders with values
 */
export function substituteVariables(
  text: string,
  values: Record<string, string | number | Date | null>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    const value = values[variable];

    if (value === undefined || value === null) {
      return match; // Keep placeholder if no value
    }

    // Format dates nicely
    if (value instanceof Date) {
      return formatDate(value);
    }

    // Handle ISO date strings (from form inputs)
    if (typeof value === 'string' && isISODateString(value)) {
      return formatDate(new Date(value));
    }

    // Format currency for amount/fee fields
    if (typeof value === 'number' && (variable.includes('amount') || variable.includes('fee') || variable.includes('price') || variable.includes('value'))) {
      return formatCurrency(value);
    }

    // Format time values (HH:MM) nicely
    if (typeof value === 'string' && /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
      return formatTime(value);
    }

    return String(value);
  });
}

/**
 * Extract all variable names from template content
 */
export function extractVariables(content: TemplateContent): string[] {
  const variables = new Set<string>();
  const regex = /\{\{(\w+)\}\}/g;

  // Extract from title
  let match;
  while ((match = regex.exec(content.title)) !== null) {
    variables.add(match[1]);
  }

  // Extract from sections
  for (const section of content.sections) {
    // Reset regex lastIndex for each string
    regex.lastIndex = 0;
    while ((match = regex.exec(section.heading)) !== null) {
      variables.add(match[1]);
    }
    regex.lastIndex = 0;
    while ((match = regex.exec(section.content)) !== null) {
      variables.add(match[1]);
    }
  }

  return Array.from(variables);
}

/**
 * Extract variable names mapped to their section headings
 * Used to auto-assign group property to fields
 */
export function extractVariableGroups(content: TemplateContent): Record<string, string> {
  const variableGroups: Record<string, string> = {};
  const regex = /\{\{(\w+)\}\}/g;

  // Variables in title get "General" group
  let match;
  while ((match = regex.exec(content.title)) !== null) {
    variableGroups[match[1]] = 'General';
  }

  // Extract from sections - map to section heading
  for (const section of content.sections) {
    const groupName = section.heading || 'Other';

    // Reset regex lastIndex for each string
    regex.lastIndex = 0;
    while ((match = regex.exec(section.heading)) !== null) {
      variableGroups[match[1]] = groupName;
    }
    regex.lastIndex = 0;
    while ((match = regex.exec(section.content)) !== null) {
      variableGroups[match[1]] = groupName;
    }
  }

  return variableGroups;
}

/**
 * Auto-assign group property to fields based on where their variables appear in content
 */
export function assignFieldGroups(
  fields: TemplateField[],
  content: TemplateContent
): TemplateField[] {
  const variableGroups = extractVariableGroups(content);

  return fields.map(field => ({
    ...field,
    // Use existing group if defined, otherwise use the section heading where the variable appears
    group: field.group || variableGroups[field.id] || 'Other'
  }));
}

/**
 * Validate that all required fields are provided
 */
export function validateFormData(
  template: { fields: TemplateField[]; optionalClauses?: OptionalClause[] },
  formData: TemplateFormData
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // Validate main template fields
  for (const field of template.fields) {
    if (field.required) {
      const value = formData.fields[field.id];
      if (value === undefined || value === null || value === '') {
        errors[field.id] = `${field.label} is required`;
      }
    }

    // Apply additional validation rules
    if (formData.fields[field.id] !== undefined && formData.fields[field.id] !== null && formData.fields[field.id] !== '') {
      const value = formData.fields[field.id];
      const validation = field.validation;

      if (validation) {
        if (typeof value === 'string') {
          if (validation.minLength && value.length < validation.minLength) {
            errors[field.id] = `${field.label} must be at least ${validation.minLength} characters`;
          }
          if (validation.maxLength && value.length > validation.maxLength) {
            errors[field.id] = `${field.label} must be at most ${validation.maxLength} characters`;
          }
          if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
            errors[field.id] = validation.patternMessage || `${field.label} format is invalid`;
          }
        }

        if (typeof value === 'number') {
          if (validation.min !== undefined && value < validation.min) {
            errors[field.id] = `${field.label} must be at least ${validation.min}`;
          }
          if (validation.max !== undefined && value > validation.max) {
            errors[field.id] = `${field.label} must be at most ${validation.max}`;
          }
        }

        // Cross-field date validation: afterField
        if (validation.afterField && field.type === 'date') {
          const afterFieldValue = formData.fields[validation.afterField];
          if (afterFieldValue !== undefined && afterFieldValue !== null && afterFieldValue !== '') {
            const currentDate = value instanceof Date ? value : new Date(value as string);
            const afterDate = afterFieldValue instanceof Date ? afterFieldValue : new Date(afterFieldValue as string);

            if (!isNaN(currentDate.getTime()) && !isNaN(afterDate.getTime())) {
              if (currentDate <= afterDate) {
                errors[field.id] = validation.afterFieldMessage || `${field.label} must be after the start date`;
              }
            }
          }
        }

        // Cross-field date validation: beforeField
        if (validation.beforeField && field.type === 'date') {
          const beforeFieldValue = formData.fields[validation.beforeField];
          if (beforeFieldValue !== undefined && beforeFieldValue !== null && beforeFieldValue !== '') {
            const currentDate = value instanceof Date ? value : new Date(value as string);
            const beforeDate = beforeFieldValue instanceof Date ? beforeFieldValue : new Date(beforeFieldValue as string);

            if (!isNaN(currentDate.getTime()) && !isNaN(beforeDate.getTime())) {
              if (currentDate >= beforeDate) {
                errors[field.id] = validation.beforeFieldMessage || `${field.label} must be before the end date`;
              }
            }
          }
        }
      }

      // Validate time format (HH:MM) for time fields
      if (field.type === 'time') {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (typeof value === 'string' && !timeRegex.test(value)) {
          errors[field.id] = `${field.label} must be a valid time (e.g., 14:30)`;
        }
      }
    }
  }

  // Validate optional clause fields when clause is enabled
  if (template.optionalClauses) {
    for (const clause of template.optionalClauses) {
      if (formData.enabledClauses.includes(clause.id) && clause.fields) {
        for (const field of clause.fields) {
          if (field.required) {
            const value = formData.fields[field.id];
            if (value === undefined || value === null || value === '') {
              errors[field.id] = `${field.label} is required when ${clause.name} is enabled`;
            }
          }

          // Cross-field date validation for clause fields: afterField
          const clauseFieldValue = formData.fields[field.id];
          if (field.type === 'date' && field.validation?.afterField &&
              clauseFieldValue !== undefined && clauseFieldValue !== null && clauseFieldValue !== '') {
            const afterFieldValue = formData.fields[field.validation.afterField];
            if (afterFieldValue !== undefined && afterFieldValue !== null && afterFieldValue !== '') {
              const currentDate = clauseFieldValue instanceof Date ? clauseFieldValue : new Date(clauseFieldValue as string);
              const afterDate = afterFieldValue instanceof Date ? afterFieldValue : new Date(afterFieldValue as string);

              if (!isNaN(currentDate.getTime()) && !isNaN(afterDate.getTime())) {
                if (currentDate <= afterDate) {
                  errors[field.id] = field.validation.afterFieldMessage || `${field.label} must be after the start date`;
                }
              }
            }
          }

          // Cross-field date validation for clause fields: beforeField
          if (field.type === 'date' && field.validation?.beforeField &&
              clauseFieldValue !== undefined && clauseFieldValue !== null && clauseFieldValue !== '') {
            const beforeFieldValue = formData.fields[field.validation.beforeField];
            if (beforeFieldValue !== undefined && beforeFieldValue !== null && beforeFieldValue !== '') {
              const currentDate = clauseFieldValue instanceof Date ? clauseFieldValue : new Date(clauseFieldValue as string);
              const beforeDate = beforeFieldValue instanceof Date ? beforeFieldValue : new Date(beforeFieldValue as string);

              if (!isNaN(currentDate.getTime()) && !isNaN(beforeDate.getTime())) {
                if (currentDate >= beforeDate) {
                  errors[field.id] = field.validation.beforeFieldMessage || `${field.label} must be before the end date`;
                }
              }
            }
          }

          // Validate time format for clause fields (HH:MM)
          if (field.type === 'time' && clauseFieldValue !== undefined && clauseFieldValue !== null && clauseFieldValue !== '') {
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (typeof clauseFieldValue === 'string' && !timeRegex.test(clauseFieldValue)) {
              errors[field.id] = `${field.label} must be a valid time (e.g., 14:30)`;
            }
          }
        }
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Render template content with form data
 */
export function renderTemplateContent(
  template: { content: TemplateContent; optionalClauses?: OptionalClause[] },
  formData: TemplateFormData
): { title: string; sections: Array<{ heading: string; content: string }> } {
  const { fields, enabledClauses } = formData;

  // Render title
  const title = substituteVariables(template.content.title, fields);

  // Filter and render sections
  const sections = template.content.sections
    .filter(section => {
      // Include section if not optional, or if its clause is enabled
      if (!section.isOptional) return true;
      return section.clauseId && enabledClauses.includes(section.clauseId);
    })
    .map(section => ({
      heading: substituteVariables(section.heading, fields),
      content: substituteVariables(section.content, fields)
    }));

  return { title, sections };
}

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generate HTML from rendered template content
 */
export function generateHTML(
  title: string,
  sections: Array<{ heading: string; content: string }>,
  includeStyles: boolean = true
): string {
  const styles = includeStyles ? `
    <style>
      .contract { font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px; }
      .contract-title { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px; text-transform: uppercase; }
      .section { margin-bottom: 24px; }
      .section-heading { font-size: 14px; font-weight: bold; margin-bottom: 12px; text-transform: uppercase; }
      .section-content { font-size: 12px; line-height: 1.6; text-align: justify; }
      .section-content p { margin-bottom: 12px; }
    </style>
  ` : '';

  const formatParagraphs = (text: string): string => {
    return text.split('\n\n').map(p => `<p>${escapeHtml(p)}</p>`).join('');
  };

  const sectionsHTML = sections.map(s => `
    <div class="section">
      <div class="section-heading">${escapeHtml(s.heading)}</div>
      <div class="section-content">${formatParagraphs(s.content)}</div>
    </div>
  `).join('\n');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      ${styles}
    </head>
    <body>
      <div class="contract">
        <div class="contract-title">${escapeHtml(title)}</div>
        ${sectionsHTML}
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text from rendered template content
 */
export function generateText(
  title: string,
  sections: Array<{ heading: string; content: string }>
): string {
  const divider = '='.repeat(60);
  const sectionText = sections.map(s =>
    `${s.heading}\n${'-'.repeat(s.heading.length)}\n\n${s.content}`
  ).join('\n\n');

  return `${divider}\n${title.toUpperCase()}\n${divider}\n\n${sectionText}`;
}
