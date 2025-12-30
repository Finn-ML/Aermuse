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
  | 'time'
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
  // Cross-field date validation
  afterField?: string;        // This date must be after the specified field
  afterFieldMessage?: string; // Custom error message for afterField validation
  beforeField?: string;       // This date must be before the specified field
  beforeFieldMessage?: string; // Custom error message for beforeField validation
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
 * Persona group definition for repeatable field sections
 * (e.g., artists, producers, signatories that can be added/removed)
 */
export interface PersonaGroup {
  id: string; // e.g., 'artists', 'producers', 'signatories'
  singularName: string; // e.g., 'Artist', 'Producer', 'Signatory'
  pluralName: string; // e.g., 'Artists', 'Producers', 'Signatories'
  description?: string;
  minCount: number; // Minimum required (usually 1 or 2)
  maxCount: number; // Maximum allowed (up to 10)
  fields: PersonaField[]; // Fields for each persona instance
}

/**
 * Field within a persona group (similar to TemplateField but for personas)
 */
export interface PersonaField {
  id: string; // Base field id (will be suffixed with persona index)
  label: string; // Base label (persona name will be prefixed)
  type: FieldType;
  placeholder?: string;
  required: boolean;
  defaultValue?: string | number;
  options?: SelectOption[];
  validation?: FieldValidation;
  helpText?: string;
}

/**
 * Instance of a persona with filled-in values
 */
export interface PersonaInstance {
  id: string; // Unique ID for this persona instance
  values: Record<string, string | number | Date | null>;
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
  personas?: Record<string, PersonaInstance[]>; // Grouped by persona group id
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
  personaGroups?: PersonaGroup[]; // Dynamic persona sections
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
  personaGroups?: PersonaGroup[]; // Dynamic persona sections
  isActive?: boolean;
  sortOrder?: number;
  version?: number;
  createdBy?: string | null;
}
