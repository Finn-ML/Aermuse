# Story 3.8: Template Fill-in Form

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 3.8 |
| **Epic** | Epic 3: Contract Templates |
| **Title** | Template Fill-in Form |
| **Priority** | P1 - High |
| **Story Points** | 5 |
| **Status** | Drafted |

## User Story

**As a** user
**I want** to fill in template fields
**So that** the contract is personalized

## Context

The template fill-in form dynamically generates form fields based on the template's field definitions. Users fill in party information, dates, financial terms, and toggle optional clauses. The form auto-saves and shows a live preview of the rendered contract.

**Dependencies:**
- Story 3.7 (Template Selection) must be completed first

## Acceptance Criteria

- [ ] **AC-1:** Dynamic form generated from template field definitions
- [ ] **AC-2:** All field types render correctly (text, textarea, date, number, select, email, currency)
- [ ] **AC-3:** Required field validation with error messages
- [ ] **AC-4:** Auto-save to localStorage every 30 seconds
- [ ] **AC-5:** Optional clause toggles show/hide related fields
- [ ] **AC-6:** Field groups displayed with visual separation
- [ ] **AC-7:** "Preview" button shows rendered contract
- [ ] **AC-8:** Form state preserved on page refresh
- [ ] **AC-9:** Clear draft option available

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `client/src/pages/TemplateForm.tsx` | New: Form page |
| `client/src/components/templates/DynamicField.tsx` | New: Field renderer |
| `client/src/components/templates/ClauseToggle.tsx` | New: Optional clause toggle |
| `client/src/components/templates/FieldGroup.tsx` | New: Field grouping |
| `client/src/hooks/useTemplateForm.ts` | New: Form state management |

### Implementation Details

#### 1. Form State Hook

```typescript
// client/src/hooks/useTemplateForm.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { ContractTemplate, TemplateFormData, TemplateField } from '../types';

const AUTOSAVE_INTERVAL = 30000; // 30 seconds

interface UseTemplateFormReturn {
  formData: TemplateFormData;
  errors: Record<string, string>;
  isDirty: boolean;
  updateField: (fieldId: string, value: any) => void;
  toggleClause: (clauseId: string) => void;
  validate: () => boolean;
  clearDraft: () => void;
  lastSaved: Date | null;
}

export function useTemplateForm(
  template: ContractTemplate,
  templateId: string
): UseTemplateFormReturn {
  const storageKey = `template-draft-${templateId}`;

  // Initialize from localStorage or defaults
  const getInitialData = (): TemplateFormData => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Ignore parse errors
      }
    }

    // Build defaults
    const fields: Record<string, any> = {};
    for (const field of template.fields) {
      if (field.defaultValue !== undefined) {
        fields[field.id] = field.defaultValue;
      }
    }

    const enabledClauses = template.optionalClauses
      .filter(c => c.defaultEnabled)
      .map(c => c.id);

    return { fields, enabledClauses };
  };

  const [formData, setFormData] = useState<TemplateFormData>(getInitialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-save effect
  useEffect(() => {
    if (isDirty) {
      saveTimeoutRef.current = setTimeout(() => {
        localStorage.setItem(storageKey, JSON.stringify(formData));
        setLastSaved(new Date());
        setIsDirty(false);
      }, AUTOSAVE_INTERVAL);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, isDirty, storageKey]);

  // Save immediately when leaving page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirty) {
        localStorage.setItem(storageKey, JSON.stringify(formData));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, isDirty, storageKey]);

  const updateField = useCallback((fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      fields: { ...prev.fields, [fieldId]: value }
    }));
    setIsDirty(true);

    // Clear error on change
    if (errors[fieldId]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  }, [errors]);

  const toggleClause = useCallback((clauseId: string) => {
    setFormData(prev => {
      const enabled = prev.enabledClauses.includes(clauseId);
      return {
        ...prev,
        enabledClauses: enabled
          ? prev.enabledClauses.filter(id => id !== clauseId)
          : [...prev.enabledClauses, clauseId]
      };
    });
    setIsDirty(true);
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate main fields
    for (const field of template.fields) {
      if (field.required) {
        const value = formData.fields[field.id];
        if (value === undefined || value === null || value === '') {
          newErrors[field.id] = `${field.label} is required`;
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
              newErrors[field.id] = `${field.label} is required`;
            }
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [template, formData]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setFormData(getInitialData());
    setErrors({});
    setIsDirty(false);
    setLastSaved(null);
  }, [storageKey]);

  return {
    formData,
    errors,
    isDirty,
    updateField,
    toggleClause,
    validate,
    clearDraft,
    lastSaved
  };
}
```

#### 2. Dynamic Field Component

```tsx
// client/src/components/templates/DynamicField.tsx
import { TemplateField } from '../../types';
import { AlertCircle } from 'lucide-react';

interface Props {
  field: TemplateField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export function DynamicField({ field, value, onChange, error }: Props) {
  const baseInputClass = `
    w-full px-3 py-2 border rounded-md
    focus:outline-none focus:ring-2 focus:ring-burgundy
    ${error ? 'border-red-500' : 'border-gray-300'}
  `;

  const renderInput = () => {
    switch (field.type) {
      case 'text':
      case 'email':
        return (
          <input
            type={field.type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={baseInputClass}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.valueAsNumber)}
            min={field.validation?.min}
            max={field.validation?.max}
            className={baseInputClass}
          />
        );

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              £
            </span>
            <input
              type="number"
              value={value ?? ''}
              onChange={(e) => onChange(e.target.valueAsNumber)}
              min={0}
              step="0.01"
              className={`${baseInputClass} pl-7`}
            />
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value ? formatDateForInput(value) : ''}
            onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
            className={baseInputClass}
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
          >
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {renderInput()}

      {field.helpText && !error && (
        <p className="text-xs text-gray-500">{field.helpText}</p>
      )}

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function formatDateForInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}
```

#### 3. Clause Toggle Component

```tsx
// client/src/components/templates/ClauseToggle.tsx
import { OptionalClause } from '../../types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DynamicField } from './DynamicField';

interface Props {
  clause: OptionalClause;
  enabled: boolean;
  onToggle: () => void;
  fieldValues: Record<string, any>;
  onFieldChange: (fieldId: string, value: any) => void;
  errors: Record<string, string>;
}

export function ClauseToggle({
  clause,
  enabled,
  onToggle,
  fieldValues,
  onFieldChange,
  errors
}: Props) {
  return (
    <div className={`border rounded-lg overflow-hidden ${enabled ? 'border-burgundy' : 'border-gray-200'}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`
          w-full px-4 py-3 flex items-center justify-between
          ${enabled ? 'bg-burgundy/5' : 'bg-gray-50 hover:bg-gray-100'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`
            w-5 h-5 rounded border-2 flex items-center justify-center
            ${enabled ? 'bg-burgundy border-burgundy' : 'border-gray-300'}
          `}>
            {enabled && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                <path d="M10.28 2.28L4 8.56 1.72 6.28a.75.75 0 00-1.06 1.06l3 3a.75.75 0 001.06 0l7-7a.75.75 0 00-1.06-1.06z"/>
              </svg>
            )}
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900">{clause.name}</div>
            <div className="text-sm text-gray-500">{clause.description}</div>
          </div>
        </div>
        {enabled ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {enabled && clause.fields && clause.fields.length > 0 && (
        <div className="p-4 border-t bg-white space-y-4">
          {clause.fields.map(field => (
            <DynamicField
              key={field.id}
              field={field}
              value={fieldValues[field.id]}
              onChange={(value) => onFieldChange(field.id, value)}
              error={errors[field.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 4. Template Form Page

```tsx
// client/src/pages/TemplateForm.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTemplateForm } from '../hooks/useTemplateForm';
import { DynamicField } from '../components/templates/DynamicField';
import { ClauseToggle } from '../components/templates/ClauseToggle';
import { ContractTemplate } from '../types';
import { ArrowLeft, Eye, Trash2, Save } from 'lucide-react';

export default function TemplateForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/templates/${id}`)
      .then(res => res.json())
      .then(data => {
        setTemplate(data.template);
        setLoading(false);
      });
  }, [id]);

  if (loading || !template) {
    return <div>Loading...</div>;
  }

  return <TemplateFormContent template={template} templateId={id!} />;
}

function TemplateFormContent({
  template,
  templateId
}: {
  template: ContractTemplate;
  templateId: string;
}) {
  const navigate = useNavigate();
  const {
    formData,
    errors,
    isDirty,
    updateField,
    toggleClause,
    validate,
    clearDraft,
    lastSaved
  } = useTemplateForm(template, templateId);

  // Group fields by group property
  const fieldGroups = template.fields.reduce((acc, field) => {
    const group = field.group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {} as Record<string, typeof template.fields>);

  const handlePreview = () => {
    if (validate()) {
      // Save current state
      localStorage.setItem(`template-draft-${templateId}`, JSON.stringify(formData));
      navigate(`/templates/${templateId}/preview`);
    }
  };

  const handleClearDraft = () => {
    if (confirm('Clear all form data? This cannot be undone.')) {
      clearDraft();
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/templates')}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{template.name}</h1>
            <p className="text-sm text-gray-500">Fill in the details below</p>
          </div>
        </div>

        {lastSaved && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Save className="h-3 w-3" />
            Saved {lastSaved.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={(e) => { e.preventDefault(); handlePreview(); }} className="space-y-8">
        {/* Field Groups */}
        {Object.entries(fieldGroups).map(([groupName, fields]) => (
          <div key={groupName} className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {groupName}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map(field => (
                <div key={field.id} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <DynamicField
                    field={field}
                    value={formData.fields[field.id]}
                    onChange={(value) => updateField(field.id, value)}
                    error={errors[field.id]}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Optional Clauses */}
        {template.optionalClauses.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Optional Clauses
            </h2>
            <div className="space-y-3">
              {template.optionalClauses.map(clause => (
                <ClauseToggle
                  key={clause.id}
                  clause={clause}
                  enabled={formData.enabledClauses.includes(clause.id)}
                  onToggle={() => toggleClause(clause.id)}
                  fieldValues={formData.fields}
                  onFieldChange={updateField}
                  errors={errors}
                />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <button
            type="button"
            onClick={handleClearDraft}
            className="flex items-center gap-2 text-gray-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            Clear Draft
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2 bg-burgundy text-white rounded-md hover:bg-burgundy-dark"
          >
            <Eye className="h-4 w-4" />
            Preview Contract
          </button>
        </div>
      </form>
    </div>
  );
}
```

## Definition of Done

- [ ] All field types render and function
- [ ] Required validation works
- [ ] Auto-save to localStorage working
- [ ] Optional clauses toggle fields
- [ ] Field groups display correctly
- [ ] Preview button validates and navigates
- [ ] Draft persists across refresh
- [ ] Clear draft removes localStorage
- [ ] Error messages display properly

## Testing Checklist

### Unit Tests

- [ ] DynamicField renders each type
- [ ] ClauseToggle expands/collapses
- [ ] Form hook manages state correctly
- [ ] Validation catches required fields

### Integration Tests

- [ ] Form loads template fields
- [ ] Auto-save persists data
- [ ] Validation before preview

### E2E Tests

- [ ] Fill all fields → Preview
- [ ] Toggle clauses → See additional fields
- [ ] Refresh → Data persisted
- [ ] Clear draft → Form reset

## Related Documents

- [Epic 3 Tech Spec](./tech-spec-epic-3.md)
- [Story 3.7: Template Selection UI](./3-7-template-selection-ui.md)
- [Story 3.9: Contract Preview](./3-9-contract-preview-and-editing.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create template detail API endpoint**
  - [ ] Add GET /api/templates/:id to routes
  - [ ] Return full template with fields and clauses

- [ ] **Task 2: Create useTemplateForm hook**
  - [ ] Create client/src/hooks/useTemplateForm.ts
  - [ ] Initialize from localStorage or defaults
  - [ ] Implement updateField function
  - [ ] Implement toggleClause function
  - [ ] Implement validate function
  - [ ] Implement auto-save to localStorage
  - [ ] Implement clearDraft function
  - [ ] Save on beforeunload

- [ ] **Task 3: Create DynamicField component**
  - [ ] Create client/src/components/templates/DynamicField.tsx
  - [ ] Render text/email input
  - [ ] Render textarea
  - [ ] Render number input with min/max
  - [ ] Render currency input with symbol
  - [ ] Render date input
  - [ ] Render select dropdown
  - [ ] Show error state and help text

- [ ] **Task 4: Create ClauseToggle component**
  - [ ] Create client/src/components/templates/ClauseToggle.tsx
  - [ ] Render checkbox with name and description
  - [ ] Expand/collapse clause fields
  - [ ] Render nested DynamicFields

- [ ] **Task 5: Create FieldGroup component**
  - [ ] Create client/src/components/templates/FieldGroup.tsx
  - [ ] Render group heading
  - [ ] Layout fields in grid

- [ ] **Task 6: Create TemplateForm page**
  - [ ] Create client/src/pages/TemplateForm.tsx
  - [ ] Fetch template on mount
  - [ ] Group fields by group property
  - [ ] Render field groups
  - [ ] Render optional clauses section
  - [ ] Add Clear Draft button
  - [ ] Add Preview button with validation
  - [ ] Show last saved indicator
  - [ ] Add route to App.tsx

- [ ] **Task 7: Write tests**
  - [ ] Unit tests for each field type
  - [ ] Unit tests for ClauseToggle
  - [ ] Unit tests for validation
  - [ ] Integration tests for auto-save
  - [ ] E2E test for fill form → preview

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
