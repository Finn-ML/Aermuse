/**
 * Contract Template Type Definitions
 * Epic 3: Contract Templates System
 */

/**
 * Template content structure with sections
 */
export interface TemplateContent {
  title: string;
  sections: TemplateSection[];
}

export interface TemplateSection {
  id: string;
  heading: string;
  content: string; // Supports {{variable}} syntax
  isOptional?: boolean;
  clauseId?: string; // Links to OptionalClause.id
}

/**
 * Field types supported in template forms
 */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'number'
  | 'select'
  | 'email'
  | 'currency';

/**
 * Select option for dropdown fields
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Field validation rules
 */
export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  min?: number;
  max?: number;
}

/**
 * Field definition for form generation
 */
export interface TemplateField {
  id: string; // Variable name matching {{id}} in content
  label: string;
  type: FieldType;
  placeholder?: string;
  required: boolean;
  defaultValue?: string | number;
  options?: SelectOption[]; // For 'select' type
  validation?: FieldValidation;
  helpText?: string;
  group?: string; // Visual grouping
}

/**
 * Optional clause that can be toggled
 */
export interface OptionalClause {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  fields?: TemplateField[]; // Additional fields when enabled
}

/**
 * Template categories
 */
export type TemplateCategory =
  | 'artist'
  | 'licensing'
  | 'touring'
  | 'production'
  | 'business';

/**
 * User-submitted form data
 */
export interface TemplateFormData {
  fields: Record<string, string | number | Date | null>;
  enabledClauses: string[];
}

/**
 * Full template type (matches database schema)
 */
export interface ContractTemplate {
  id: string;
  name: string;
  description: string | null;
  category: TemplateCategory;
  content: TemplateContent;
  fields: TemplateField[];
  optionalClauses: OptionalClause[];
  isActive: boolean;
  sortOrder: number;
  version: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Insert type for creating new templates
 */
export interface InsertContractTemplate {
  name: string;
  description?: string | null;
  category: TemplateCategory;
  content: TemplateContent;
  fields: TemplateField[];
  optionalClauses?: OptionalClause[];
  isActive?: boolean;
  sortOrder?: number;
  version?: number;
  createdBy?: string | null;
}
