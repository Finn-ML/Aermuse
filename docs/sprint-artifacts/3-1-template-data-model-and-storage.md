# Story 3.1: Template Data Model & Storage

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 3.1 |
| **Epic** | Epic 3: Contract Templates |
| **Title** | Template Data Model & Storage |
| **Priority** | P1 - High |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** developer
**I want** to define the template data structure
**So that** templates can be stored and managed

## Context

This foundational story establishes the database schema and TypeScript types for the contract template system. Templates are stored with JSONB content that supports variable substitution ({{party_name}}) and optional clause toggling.

**Dependencies:**
- None (first story in Epic 3)

## Acceptance Criteria

- [ ] **AC-1:** `contract_templates` table created in database
- [ ] **AC-2:** Drizzle schema defined with proper types
- [ ] **AC-3:** Template content supports {{variable}} syntax
- [ ] **AC-4:** Field definitions stored as JSONB array
- [ ] **AC-5:** Optional clauses can be defined per template
- [ ] **AC-6:** Template versioning support (version field)
- [ ] **AC-7:** TypeScript interfaces exported for frontend use

## Technical Requirements

### Database Migration

```sql
-- Create contract_templates table
CREATE TABLE contract_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  content JSONB NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]',
  optional_clauses JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_templates_category ON contract_templates(category);
CREATE INDEX idx_templates_active ON contract_templates(is_active);
CREATE INDEX idx_templates_sort ON contract_templates(sort_order);

-- Extend contracts table for template-based contracts
ALTER TABLE contracts ADD COLUMN template_id VARCHAR REFERENCES contract_templates(id);
ALTER TABLE contracts ADD COLUMN template_data JSONB;
ALTER TABLE contracts ADD COLUMN rendered_content TEXT;
```

### Drizzle Schema

```typescript
// shared/schema.ts
import { pgTable, varchar, text, jsonb, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const contractTemplates = pgTable("contract_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  content: jsonb("content").notNull().$type<TemplateContent>(),
  fields: jsonb("fields").notNull().$type<TemplateField[]>().default([]),
  optionalClauses: jsonb("optional_clauses").$type<OptionalClause[]>().default([]),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  version: integer("version").default(1),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Extend contracts table
export const contracts = pgTable("contracts", {
  // ... existing fields
  templateId: varchar("template_id").references(() => contractTemplates.id),
  templateData: jsonb("template_data").$type<TemplateFormData>(),
  renderedContent: text("rendered_content"),
});
```

### TypeScript Interfaces

```typescript
// shared/types/templates.ts

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
  content: string;  // Supports {{variable}} syntax
  isOptional?: boolean;
  clauseId?: string;  // Links to OptionalClause.id
}

/**
 * Field definition for form generation
 */
export interface TemplateField {
  id: string;  // Variable name matching {{id}} in content
  label: string;
  type: FieldType;
  placeholder?: string;
  required: boolean;
  defaultValue?: string | number;
  options?: SelectOption[];  // For 'select' type
  validation?: FieldValidation;
  helpText?: string;
  group?: string;  // Visual grouping
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'number'
  | 'select'
  | 'email'
  | 'currency';

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  min?: number;
  max?: number;
}

/**
 * Optional clause that can be toggled
 */
export interface OptionalClause {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  fields?: TemplateField[];  // Additional fields when enabled
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
 * Full template type
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
```

### Template Rendering Service (Foundation)

```typescript
// server/services/templateRenderer.ts

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

    // Format currency
    if (typeof value === 'number' && variable.includes('amount') || variable.includes('fee')) {
      return formatCurrency(value);
    }

    return String(value);
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(amount);
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
 * Validate that all required fields are provided
 */
export function validateFormData(
  template: ContractTemplate,
  formData: TemplateFormData
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const field of template.fields) {
    if (field.required) {
      const value = formData.fields[field.id];
      if (value === undefined || value === null || value === '') {
        errors[field.id] = `${field.label} is required`;
      }
    }
  }

  // Validate optional clause fields
  for (const clause of template.optionalClauses) {
    if (formData.enabledClauses.includes(clause.id) && clause.fields) {
      for (const field of clause.fields) {
        if (field.required) {
          const value = formData.fields[field.id];
          if (value === undefined || value === null || value === '') {
            errors[field.id] = `${field.label} is required`;
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
```

### Files to Create/Modify

| File | Changes |
|------|---------|
| `shared/schema.ts` | Add contractTemplates table |
| `shared/types/templates.ts` | New: Template type definitions |
| `server/services/templateRenderer.ts` | New: Variable substitution |
| `server/db/migrations/xxx_add_templates.sql` | New: Database migration |

## Definition of Done

- [ ] Database migration created and applied
- [ ] Drizzle schema with typed JSONB fields
- [ ] TypeScript interfaces exported
- [ ] Variable substitution function working
- [ ] Validation function for form data
- [ ] contracts table extended for template references

## Testing Checklist

### Unit Tests

- [ ] substituteVariables replaces all placeholders
- [ ] substituteVariables handles missing values
- [ ] substituteVariables formats dates correctly
- [ ] extractVariables finds all variables in content
- [ ] validateFormData catches missing required fields
- [ ] validateFormData handles optional clause fields

### Integration Tests

- [ ] Can insert template into database
- [ ] Can query templates with JSONB content
- [ ] Can update template version
- [ ] contracts.template_id references work

## Related Documents

- [Epic 3 Tech Spec](./tech-spec-epic-3.md)
- [Architecture: Database Schema](../architecture.md#database-schema-extensions)

---

## Tasks/Subtasks

- [ ] **Task 1: Create database migration**
  - [ ] Add contract_templates table with all fields
  - [ ] Add indexes for category, isActive, sortOrder
  - [ ] Add template_id and template_data to contracts table
  - [ ] Add rendered_content field to contracts table
  - [ ] Run migration

- [ ] **Task 2: Update Drizzle schema**
  - [ ] Add contractTemplates table in shared/schema.ts
  - [ ] Define typed JSONB fields with $type
  - [ ] Add relations between contracts and templates
  - [ ] Export table for use in queries

- [ ] **Task 3: Create TypeScript interfaces**
  - [ ] Create shared/types/templates.ts
  - [ ] Define TemplateContent and TemplateSection
  - [ ] Define TemplateField and FieldType
  - [ ] Define OptionalClause
  - [ ] Define TemplateFormData
  - [ ] Define ContractTemplate
  - [ ] Export all types

- [ ] **Task 4: Create template renderer service**
  - [ ] Create server/services/templateRenderer.ts
  - [ ] Implement substituteVariables function
  - [ ] Implement formatDate helper
  - [ ] Implement formatCurrency helper
  - [ ] Implement extractVariables function
  - [ ] Implement validateFormData function

- [ ] **Task 5: Write tests**
  - [ ] Unit tests for substituteVariables
  - [ ] Unit tests for extractVariables
  - [ ] Unit tests for validateFormData
  - [ ] Integration tests for template insert/query
  - [ ] Integration tests for contracts.template_id references

---

## Dev Agent Record

### Debug Log
<!-- Automatically updated by dev agent during implementation -->

### Completion Notes
<!-- Summary of implementation, decisions made, any follow-ups needed -->

---

## File List

| Action | File Path |
|--------|-----------|
| | |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| | | |
