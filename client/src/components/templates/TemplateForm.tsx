/**
 * TemplateForm Component
 * Epic 3: Contract Templates System - Story 3.8
 *
 * Dynamic form for filling in template fields.
 */

import { useMemo } from 'react';
import { ArrowLeft, Eye, Trash2, Save, Clock } from 'lucide-react';
import { useTemplateForm } from '@/hooks/useTemplateForm';
import { DynamicField } from './DynamicField';
import { ClauseToggle } from './ClauseToggle';
import type { ContractTemplate } from '@shared/schema';
import type { TemplateField, OptionalClause, TemplateFormData } from '@shared/types/templates';

interface Props {
  template: ContractTemplate;
  onBack: () => void;
  onPreview: (formData: TemplateFormData) => void;
}

export function TemplateForm({ template, onBack, onPreview }: Props) {
  const templateFields = (template.fields || []) as TemplateField[];
  const templateClauses = (template.optionalClauses || []) as OptionalClause[];

  const {
    formData,
    errors,
    isDirty,
    updateField,
    toggleClause,
    validate,
    clearDraft,
    saveDraft,
    lastSaved,
  } = useTemplateForm(template, template.id);

  // Group fields by group property
  const fieldGroups = useMemo(() => {
    return templateFields.reduce((acc, field) => {
      const group = field.group || 'Other';
      if (!acc[group]) acc[group] = [];
      acc[group].push(field);
      return acc;
    }, {} as Record<string, TemplateField[]>);
  }, [templateFields]);

  const handlePreview = () => {
    if (validate()) {
      saveDraft();
      onPreview(formData);
    }
  };

  const handleClearDraft = () => {
    if (confirm('Clear all form data? This cannot be undone.')) {
      clearDraft();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-[rgba(255,255,255,0.6)] text-[#660033] hover:bg-[rgba(255,255,255,0.8)] transition-all"
            data-testid="button-back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[#660033]">{template.name}</h2>
            <p className="text-sm text-[rgba(102,0,51,0.6)]">Fill in the details below</p>
          </div>
        </div>

        {lastSaved && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(40,167,69,0.1)] text-sm text-[#28a745]">
            <Clock size={14} />
            Saved {lastSaved.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={(e) => { e.preventDefault(); handlePreview(); }} className="space-y-6">
        {/* Field Groups */}
        {Object.entries(fieldGroups).map(([groupName, fields]) => (
          <div
            key={groupName}
            className="rounded-[20px] p-7"
            style={{ background: 'rgba(255, 255, 255, 0.6)' }}
          >
            <h3 className="text-lg font-bold text-[#660033] mb-5">
              {groupName}
            </h3>
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
        {templateClauses.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-[#660033] mb-4">
              Optional Clauses
            </h3>
            <div className="space-y-3">
              {templateClauses.map(clause => (
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
        <div
          className="flex items-center justify-between pt-6"
          style={{ borderTop: '1px solid rgba(102, 0, 51, 0.08)' }}
        >
          <button
            type="button"
            onClick={handleClearDraft}
            className="flex items-center gap-2 px-4 py-2.5 text-[rgba(102,0,51,0.6)] hover:text-[#dc3545] transition-colors"
            data-testid="button-clear-draft"
          >
            <Trash2 size={18} />
            Clear Draft
          </button>

          <div className="flex items-center gap-3">
            {isDirty && (
              <button
                type="button"
                onClick={saveDraft}
                className="flex items-center gap-2 px-5 py-2.5 bg-[rgba(102,0,51,0.1)] text-[#660033] rounded-xl font-semibold text-sm hover:bg-[rgba(102,0,51,0.15)] transition-all"
                data-testid="button-save-draft"
              >
                <Save size={16} />
                Save Draft
              </button>
            )}
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_rgba(102,0,51,0.3)] transition-all"
              data-testid="button-preview"
            >
              <Eye size={18} />
              Preview Contract
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
