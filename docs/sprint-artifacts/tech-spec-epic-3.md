# Epic Technical Specification: Contract Templates System

Date: 2025-11-28
Author: Claude
Epic ID: 3
Status: Draft

---

## Overview

Epic 3 implements a contract template system with pre-built music industry agreements. Users can select from 5 core template types, fill in customizable fields, toggle optional clauses, preview the completed contract, and proceed to the e-signing flow. Admins can manage the template catalogue including adding, editing, and retiring templates.

This is a **P1 (High)** priority epic that significantly increases platform value by reducing contract creation time from hours to minutes with legally-sound starting points.

## Objectives and Scope

### In Scope

- Template data model with JSONB content and field definitions
- 5 pre-built music industry templates:
  - Artist Agreement (collaboration)
  - License Agreement (music/sync licensing)
  - Tour Agreement (live performance)
  - Sample Agreement (sample clearance)
  - Work-for-Hire Agreement (commissioned work)
- Template selection UI with categories and search
- Dynamic form generation from template field definitions
- Optional clause toggles
- Contract preview with professional formatting
- Draft auto-save functionality
- Admin template management CRUD
- Template versioning

### Out of Scope

- Visual WYSIWYG template editor (admin uses JSON/structured form)
- Template marketplace/third-party templates
- Multi-language templates
- Template analytics/usage tracking
- AI-assisted template customization
- Collaborative template editing

## System Architecture Alignment

This epic aligns with the following architectural decisions:

| ADR | Application |
|-----|-------------|
| ADR-005: Admin Role | Admin-only template management |
| ADR-003: PDF Generation | pdf-lib for draft PDF export |

**Database:** New `contract_templates` table with JSONB for flexible content structure.

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Location |
|----------------|----------------|----------|
| `templates.ts` (routes) | Template CRUD API | `server/routes/templates.ts` |
| `admin.ts` (routes) | Admin template management | `server/routes/admin.ts` |
| `templateRenderer.ts` | Variable substitution engine | `server/services/templateRenderer.ts` |
| `TemplateGallery` | Template selection UI | `client/src/components/templates/TemplateGallery.tsx` |
| `TemplateForm` | Dynamic form component | `client/src/components/templates/TemplateForm.tsx` |
| `ContractPreview` | Preview renderer | `client/src/components/templates/ContractPreview.tsx` |

### Data Models and Contracts

#### Contract Templates Table

```sql
CREATE TABLE contract_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  -- Template structure
  content JSONB NOT NULL,        -- Sections and text with variables
  fields JSONB NOT NULL,         -- Field definitions
  optional_clauses JSONB,        -- Optional clause definitions
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for category filtering
CREATE INDEX idx_templates_category ON contract_templates(category);
CREATE INDEX idx_templates_active ON contract_templates(is_active);
```

#### Drizzle Schema

```typescript
// shared/schema.ts
export const contractTemplates = pgTable("contract_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  content: jsonb("content").notNull().$type<TemplateContent>(),
  fields: jsonb("fields").notNull().$type<TemplateField[]>(),
  optionalClauses: jsonb("optional_clauses").$type<OptionalClause[]>(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  version: integer("version").default(1),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### Template Content Structure

```typescript
// shared/types.ts

// Template content with sections and variables
interface TemplateContent {
  title: string;                    // Contract title with optional variables
  sections: TemplateSection[];
}

interface TemplateSection {
  id: string;                       // Unique section identifier
  heading: string;                  // Section heading
  content: string;                  // Text content with {{variables}}
  isOptional?: boolean;             // If true, tied to optional clause
  clauseId?: string;                // Reference to optional clause
}

// Field definition for dynamic form generation
interface TemplateField {
  id: string;                       // Variable name: party_a_name
  label: string;                    // Display label: "Party A Name"
  type: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'email';
  placeholder?: string;
  required: boolean;
  defaultValue?: string;
  options?: { value: string; label: string }[];  // For select type
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  helpText?: string;                // Tooltip/helper text
  group?: string;                   // Group fields visually
}

// Optional clause that can be toggled on/off
interface OptionalClause {
  id: string;                       // Clause identifier
  name: string;                     // Display name: "Exclusivity Clause"
  description: string;              // What this clause does
  defaultEnabled: boolean;          // On by default?
  fields?: TemplateField[];         // Additional fields if enabled
}

// Categories for template organization
type TemplateCategory =
  | 'artist'      // Artist/collaboration agreements
  | 'licensing'   // Music licensing
  | 'touring'     // Live performance
  | 'production'  // Studio/production work
  | 'business';   // General business

// User-filled template data
interface TemplateFormData {
  fields: Record<string, string | number | Date>;
  enabledClauses: string[];         // IDs of enabled optional clauses
}
```

### APIs and Interfaces

| Method | Path | Description | Auth | Request | Response |
|--------|------|-------------|------|---------|----------|
| GET | `/api/templates` | List active templates | Auth | `?category=` | `{templates[]}` |
| GET | `/api/templates/:id` | Get template details | Auth | - | `{template}` |
| POST | `/api/templates/:id/render` | Render with data | Auth | `{formData}` | `{html, text}` |
| POST | `/api/contracts/from-template` | Create contract from template | Auth | `{templateId, formData, title}` | `{contract}` |
| GET | `/api/admin/templates` | List all templates | Admin | - | `{templates[]}` |
| POST | `/api/admin/templates` | Create template | Admin | `{template}` | `{template}` |
| PUT | `/api/admin/templates/:id` | Update template | Admin | `{template}` | `{template}` |
| DELETE | `/api/admin/templates/:id` | Deactivate template | Admin | - | `{success}` |
| POST | `/api/admin/templates/:id/clone` | Clone template | Admin | `{name}` | `{template}` |
| PUT | `/api/admin/templates/reorder` | Reorder templates | Admin | `{ids[]}` | `{success}` |

### Template Rendering Engine

```typescript
// server/services/templateRenderer.ts

interface RenderOptions {
  format: 'html' | 'text' | 'pdf';
  includeStyles?: boolean;
}

interface RenderResult {
  html: string;
  text: string;
  title: string;
}

/**
 * Render a template with provided form data
 */
export function renderTemplate(
  template: ContractTemplate,
  formData: TemplateFormData,
  options: RenderOptions = { format: 'html', includeStyles: true }
): RenderResult {
  const { fields, enabledClauses } = formData;

  // Build title
  const title = substituteVariables(template.content.title, fields);

  // Build content sections
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

  // Generate HTML
  const html = generateHTML(title, sections, options.includeStyles);

  // Generate plain text
  const text = generateText(title, sections);

  return { html, text, title };
}

/**
 * Substitute {{variable}} placeholders with values
 */
function substituteVariables(
  text: string,
  values: Record<string, string | number | Date>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    const value = values[variable];
    if (value === undefined) return match; // Keep placeholder if no value

    // Format dates
    if (value instanceof Date) {
      return value.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }

    return String(value);
  });
}

/**
 * Generate styled HTML document
 */
function generateHTML(
  title: string,
  sections: { heading: string; content: string }[],
  includeStyles: boolean
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

  const sectionsHTML = sections.map(s => `
    <div class="section">
      <div class="section-heading">${s.heading}</div>
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
        <div class="contract-title">${title}</div>
        ${sectionsHTML}
      </div>
    </body>
    </html>
  `;
}

function formatParagraphs(text: string): string {
  return text.split('\n\n').map(p => `<p>${p}</p>`).join('');
}

function generateText(title: string, sections: { heading: string; content: string }[]): string {
  const divider = '='.repeat(60);
  const sectionText = sections.map(s =>
    `${s.heading}\n${'-'.repeat(s.heading.length)}\n\n${s.content}`
  ).join('\n\n');

  return `${divider}\n${title.toUpperCase()}\n${divider}\n\n${sectionText}`;
}
```

### Draft Contracts Table Extension

```sql
-- Extend contracts table for template-based contracts
ALTER TABLE contracts ADD COLUMN template_id VARCHAR REFERENCES contract_templates(id);
ALTER TABLE contracts ADD COLUMN template_data JSONB;  -- Filled form data
ALTER TABLE contracts ADD COLUMN rendered_content TEXT;  -- Cached rendered HTML
```

## Template Definitions

### Template Field Groups

Common field groups shared across templates:

```typescript
const PARTY_A_FIELDS: TemplateField[] = [
  { id: 'party_a_name', label: 'Your Name / Company', type: 'text', required: true, group: 'Party A' },
  { id: 'party_a_address', label: 'Address', type: 'textarea', required: true, group: 'Party A' },
  { id: 'party_a_email', label: 'Email', type: 'email', required: true, group: 'Party A' },
];

const PARTY_B_FIELDS: TemplateField[] = [
  { id: 'party_b_name', label: 'Other Party Name', type: 'text', required: true, group: 'Party B' },
  { id: 'party_b_address', label: 'Address', type: 'textarea', required: true, group: 'Party B' },
  { id: 'party_b_email', label: 'Email', type: 'email', required: true, group: 'Party B' },
];

const DATE_FIELDS: TemplateField[] = [
  { id: 'effective_date', label: 'Effective Date', type: 'date', required: true, group: 'Dates' },
  { id: 'end_date', label: 'End Date (if applicable)', type: 'date', required: false, group: 'Dates' },
];
```

### Template Categories

| Category | Templates | Description |
|----------|-----------|-------------|
| `artist` | Artist Agreement | Collaborations, features, splits |
| `licensing` | License Agreement | Sync, mechanical, usage rights |
| `touring` | Tour Agreement | Live performance contracts |
| `production` | Sample Agreement, Work-for-Hire | Studio/creative work |
| `business` | (Future) | Management, publishing |

## Non-Functional Requirements

### Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Template list load | < 500ms | Cached, indexed queries |
| Form render | < 200ms | Client-side generation |
| Template render | < 1s | Server-side HTML generation |
| PDF export | < 3s | pdf-lib processing |

### Security

- **Template Access:** All active templates visible to authenticated users
- **Admin Only:** Template creation/editing requires admin role
- **Form Validation:** Server-side validation of all form inputs
- **XSS Prevention:** Sanitize rendered HTML content
- **Version Control:** Template edits create new versions, preserving history

### Reliability

- **Draft Auto-save:** Save to localStorage every 30 seconds
- **Form State:** Preserve form state on navigation away (with warning)
- **Template Versioning:** Contracts reference specific template version

## Acceptance Criteria (Authoritative)

1. **AC-3.1.1:** contract_templates table created with all required fields
2. **AC-3.1.2:** Template content supports {{variable}} substitution
3. **AC-3.1.3:** Optional clauses can be defined and toggled
4. **AC-3.1.4:** Template versioning tracks changes
5. **AC-3.2.1:** Artist Agreement template available with all sections
6. **AC-3.2.2:** Template includes revenue split, credit, and term fields
7. **AC-3.3.1:** License Agreement template available
8. **AC-3.3.2:** Supports exclusive/non-exclusive license types
9. **AC-3.4.1:** Tour Agreement template available
10. **AC-3.4.2:** Includes dates, venues, fees, and rider sections
11. **AC-3.5.1:** Sample Agreement template available
12. **AC-3.5.2:** Covers sample clearance and royalty terms
13. **AC-3.6.1:** Work-for-Hire Agreement template available
14. **AC-3.6.2:** Includes IP assignment and payment terms
15. **AC-3.7.1:** Template gallery displays all active templates
16. **AC-3.7.2:** Category filters work correctly
17. **AC-3.7.3:** Search finds templates by name/description
18. **AC-3.8.1:** Dynamic form generated from template fields
19. **AC-3.8.2:** All field types render correctly
20. **AC-3.8.3:** Required field validation works
21. **AC-3.8.4:** Auto-save preserves draft progress
22. **AC-3.8.5:** Optional clause toggles show/hide sections
23. **AC-3.9.1:** Preview shows fully rendered contract
24. **AC-3.9.2:** Professional formatting applied
25. **AC-3.9.3:** PDF download available
26. **AC-3.9.4:** Edit returns to form with data preserved
27. **AC-3.10.1:** Admin can create new templates
28. **AC-3.10.2:** Admin can edit templates (creates version)
29. **AC-3.10.3:** Admin can deactivate/reactivate templates
30. **AC-3.10.4:** Admin can reorder template display order
31. **AC-3.10.5:** Admin can clone templates

## Dependencies and Integrations

### New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `dompurify` | ^3.x | HTML sanitization |
| `pdf-lib` | ^1.17.x | PDF generation |

### Integration Points

| System | Integration |
|--------|-------------|
| Epic 4 (E-Signing) | "Send for Signature" triggers signing flow |
| Epic 6 (Admin) | Template management in admin dashboard |
| Epic 1 (Auth) | requireAdmin middleware for management |

## Test Strategy Summary

### Unit Tests

- Variable substitution function
- Optional clause filtering
- HTML generation
- Field validation

### Integration Tests

- Template CRUD operations
- Form data persistence
- Render endpoint
- Create contract from template

### E2E Tests

- Select template → Fill form → Preview → Create contract
- Admin create/edit/deactivate template
- Category filtering and search

---

*Generated: 2025-11-28*
*Methodology: BMad Method - Brownfield Track*
