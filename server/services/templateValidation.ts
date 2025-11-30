/**
 * Template Validation Service
 * Epic 3: Contract Templates System - Story 3.10
 *
 * Validates template structure before saving.
 */

import type { TemplateContent, TemplateField, OptionalClause } from '@shared/types/templates';
import { extractVariables } from './templateRenderer';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTemplateStructure(template: {
  content: TemplateContent;
  fields: TemplateField[];
  optionalClauses?: OptionalClause[];
}): ValidationResult {
  const errors: string[] = [];

  // Validate content
  if (!template.content) {
    errors.push('Template must have content');
    return { valid: false, errors };
  }

  if (!template.content.title) {
    errors.push('Template must have a title');
  }

  if (!template.content.sections || template.content.sections.length === 0) {
    errors.push('Template must have at least one section');
  }

  // Validate sections
  for (const section of template.content.sections || []) {
    if (!section.id) {
      errors.push('Section missing id');
    }
    if (!section.heading) {
      errors.push(`Section ${section.id || '?'} missing heading`);
    }
    if (!section.content) {
      errors.push(`Section ${section.id || '?'} missing content`);
    }

    // If optional, must have clauseId
    if (section.isOptional && !section.clauseId) {
      errors.push(`Optional section ${section.id || '?'} must have clauseId`);
    }
  }

  // Validate fields
  const fieldIds = new Set<string>();
  for (const field of template.fields || []) {
    if (!field.id) {
      errors.push('Field missing id');
      continue;
    }
    if (!field.label) {
      errors.push(`Field ${field.id} missing label`);
    }
    if (!field.type) {
      errors.push(`Field ${field.id} missing type`);
    }

    if (fieldIds.has(field.id)) {
      errors.push(`Duplicate field id: ${field.id}`);
    }
    fieldIds.add(field.id);
  }

  // Validate optional clauses
  const clauseIds = new Set<string>();
  for (const clause of template.optionalClauses || []) {
    if (!clause.id) {
      errors.push('Clause missing id');
      continue;
    }
    if (!clause.name) {
      errors.push(`Clause ${clause.id} missing name`);
    }

    if (clauseIds.has(clause.id)) {
      errors.push(`Duplicate clause id: ${clause.id}`);
    }
    clauseIds.add(clause.id);

    // Validate clause fields
    for (const field of clause.fields || []) {
      if (!field.id) {
        errors.push(`Clause ${clause.id} field missing id`);
      }
      if (fieldIds.has(field.id)) {
        errors.push(`Clause field ${field.id} conflicts with main field`);
      }
    }
  }

  // Collect all field IDs including clause fields
  const allFieldIds = new Set(fieldIds);
  for (const clause of template.optionalClauses || []) {
    for (const field of clause.fields || []) {
      if (field.id) allFieldIds.add(field.id);
    }
  }

  // Validate variables in content match fields
  const variables = extractVariables(template.content);
  for (const variable of variables) {
    if (!allFieldIds.has(variable)) {
      errors.push(`Variable {{${variable}}} has no matching field`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
