/**
 * TemplateForm Component
 * Epic 3: Contract Templates System - Story 3.8
 *
 * Dynamic form for filling in template fields.
 */

import { useMemo, useState } from 'react';
import { ArrowLeft, Eye, Trash2, Save, Clock, FileText, Loader2, HelpCircle, X, BookOpen } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useTemplateForm } from '@/hooks/useTemplateForm';
import { useAuth } from '@/lib/auth';
import { DynamicField, type FieldSuggestion } from './DynamicField';
import { ClauseToggle } from './ClauseToggle';
import { PersonaSection } from './PersonaSection';
import type { ContractTemplate } from '@shared/schema';
import type { TemplateField, OptionalClause, TemplateFormData, PersonaGroup } from '@shared/types/templates';

// Keywords that indicate a field might benefit from artist name suggestion
const ARTIST_NAME_FIELD_KEYWORDS = [
  'artist',
  'performer',
  'talent',
  'musician',
  'band',
  'act',
  'your name',
  'your_name',
  'client name',
  'client_name',
  'party a',
  'party_a',
  'first party',
  'licensee',
  'licensor',
];

interface Props {
  template: ContractTemplate;
  onBack: () => void;
  onPreview: (formData: TemplateFormData) => void;
  initialData?: Record<string, string | number | Date | null>;
  proposalId?: string;
  onContractSaved?: (contractId: string) => void;
}

export function TemplateForm({ template, onBack, onPreview, initialData, proposalId, onContractSaved }: Props) {
  const templateFields = (template.fields || []) as TemplateField[];
  const templateClauses = (template.optionalClauses || []) as OptionalClause[];
  const personaGroups = (template.personaGroups || []) as PersonaGroup[];
  const queryClient = useQueryClient();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showReadContract, setShowReadContract] = useState(false);
  const templateContent = template.content as import('@shared/types/templates').TemplateContent;
  const { user } = useAuth();

  // Get suggestions for a field based on its label/id
  const getSuggestionsForField = (field: TemplateField): FieldSuggestion[] => {
    const suggestions: FieldSuggestion[] = [];

    // Only show suggestions for text fields
    if (field.type !== 'text' && field.type !== 'textarea') {
      return suggestions;
    }

    // Check if this field might benefit from artist name suggestion
    const fieldLabel = (field.label || '').toLowerCase();
    // For persona fields (e.g., "artists_0_name"), extract just the base field id
    const fullFieldId = (field.id || '').toLowerCase();
    const fieldId = fullFieldId.includes('_')
      ? fullFieldId.split('_').pop() || fullFieldId
      : fullFieldId;
    const fieldPlaceholder = (field.placeholder || '').toLowerCase();

    const matchesArtistKeyword = ARTIST_NAME_FIELD_KEYWORDS.some(keyword =>
      fieldLabel.includes(keyword) ||
      fieldId.includes(keyword) ||
      fieldPlaceholder.includes(keyword)
    );

    if (matchesArtistKeyword && user?.artistName) {
      suggestions.push({
        label: 'Your Artist Name',
        value: user.artistName,
        icon: 'user',
      });
    }

    return suggestions;
  };

  const {
    formData,
    errors,
    isDirty,
    updateField,
    toggleClause,
    addPersona,
    removePersona,
    updatePersonaField,
    validate,
    clearDraft,
    saveDraft,
    lastSaved,
  } = useTemplateForm(template, proposalId ? `${template.id}-proposal-${proposalId}` : template.id, initialData);

  // Mutation to save contract as draft to the backend
  const saveDraftContractMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/contracts/from-template', {
        templateId: template.id,
        formData,
        title: template.name,
        proposalId,
        status: 'draft',
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Clear local draft
      const draftKey = proposalId
        ? `template-draft-${template.id}-proposal-${proposalId}`
        : `template-draft-${template.id}`;
      localStorage.removeItem(draftKey);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      if (proposalId) {
        queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      if (onContractSaved) {
        onContractSaved(data.contract.id);
      }
    },
  });

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

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowReadContract(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#660033] text-[#F7E6CA] hover:bg-[#7a0d40] transition-all text-sm font-medium"
            title="Read the full contract template"
          >
            <BookOpen size={18} />
            <span className="hidden sm:inline">Read Contract</span>
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.6)] text-[#660033] hover:bg-[rgba(255,255,255,0.8)] transition-all text-sm font-medium"
            title="How to use this form"
          >
            <HelpCircle size={18} />
            <span className="hidden sm:inline">Help</span>
          </button>

          {lastSaved && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(40,167,69,0.1)] text-sm text-[#28a745]">
              <Clock size={14} />
              Saved {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowHelp(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[rgba(102,0,51,0.1)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#660033] flex items-center justify-center">
                  <HelpCircle size={20} className="text-[#F7E6CA]" />
                </div>
                <h3 className="text-lg font-bold text-[#660033]">How to Create Your Contract</h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 rounded-lg hover:bg-[rgba(102,0,51,0.05)] transition-colors"
              >
                <X size={20} className="text-[#660033]" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#660033] text-[#F7E6CA] flex items-center justify-center font-bold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-[#660033] mb-1">Fill in the form fields</h4>
                  <p className="text-sm text-[rgba(102,0,51,0.7)]">
                    Complete each section with the relevant details. Required fields are marked and must be filled before previewing.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#660033] text-[#F7E6CA] flex items-center justify-center font-bold text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-[#660033] mb-1">Toggle optional clauses</h4>
                  <p className="text-sm text-[rgba(102,0,51,0.7)]">
                    Enable or disable optional clauses to customize your contract. Some clauses may have additional fields when enabled.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#660033] text-[#F7E6CA] flex items-center justify-center font-bold text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-[#660033] mb-1">Preview your contract</h4>
                  <p className="text-sm text-[rgba(102,0,51,0.7)]">
                    Click "Preview Contract" to see how your filled contract looks. You can go back and make changes if needed.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#660033] text-[#F7E6CA] flex items-center justify-center font-bold text-sm flex-shrink-0">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-[#660033] mb-1">Save your contract</h4>
                  <p className="text-sm text-[rgba(102,0,51,0.7)]">
                    Use "Save to Contracts" to store your contract in the Contract Manager. From there you can download, share, or send for signatures.
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-[rgba(102,0,51,0.05)]">
                <h4 className="font-semibold text-[#660033] mb-2 flex items-center gap-2">
                  <Clock size={16} />
                  Auto-Save
                </h4>
                <p className="text-sm text-[rgba(102,0,51,0.7)]">
                  Your progress is automatically saved locally as you type. If you close the page, your draft will be restored when you return.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[rgba(102,0,51,0.1)]">
              <button
                onClick={() => setShowHelp(false)}
                className="w-full py-3 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read Contract Modal */}
      {showReadContract && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowReadContract(false)}
          />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[rgba(102,0,51,0.1)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#660033] flex items-center justify-center">
                  <BookOpen size={20} className="text-[#F7E6CA]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#660033]">{templateContent?.title || template.name}</h3>
                  <p className="text-xs text-[rgba(102,0,51,0.5)]">Read-only preview — fill in the form to customise</p>
                </div>
              </div>
              <button
                onClick={() => setShowReadContract(false)}
                className="p-2 rounded-lg hover:bg-[rgba(102,0,51,0.05)] transition-colors"
              >
                <X size={20} className="text-[#660033]" />
              </button>
            </div>

            {/* Contract Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {templateContent?.sections?.map((section, index) => (
                <div key={section.id || index}>
                  {section.heading && (
                    <h4 className="font-bold text-[#660033] text-base mb-2">
                      {section.heading}
                      {section.isOptional && (
                        <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-[rgba(102,0,51,0.08)] text-[rgba(102,0,51,0.5)]">
                          Optional
                        </span>
                      )}
                    </h4>
                  )}
                  <div className="text-sm text-[rgba(102,0,51,0.75)] leading-relaxed whitespace-pre-wrap">
                    {section.content.split(/(\{\{[^}]+\}\})/).map((part, i) =>
                      part.startsWith('{{') && part.endsWith('}}') ? (
                        <span
                          key={i}
                          className="inline-block px-1.5 py-0.5 mx-0.5 rounded bg-[rgba(102,0,51,0.08)] text-[#660033] font-medium text-xs"
                        >
                          {part.slice(2, -2).replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[rgba(102,0,51,0.1)]">
              <button
                onClick={() => setShowReadContract(false)}
                className="w-full py-3 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
              {fields.map(field => {
                // Compute min/max date constraints from afterField/beforeField validation
                let minDate: Date | string | null | undefined;
                let maxDate: Date | string | null | undefined;

                if (field.type === 'date' && field.validation?.afterField) {
                  const afterValue = formData.fields[field.validation.afterField];
                  if (afterValue) {
                    // Set min to the day after the afterField date
                    const afterDate = afterValue instanceof Date ? afterValue : new Date(afterValue as string);
                    const minDateValue = new Date(afterDate);
                    minDateValue.setDate(minDateValue.getDate() + 1);
                    minDate = minDateValue;
                  }
                }

                if (field.type === 'date' && field.validation?.beforeField) {
                  const beforeValue = formData.fields[field.validation.beforeField];
                  if (beforeValue) {
                    // Set max to the day before the beforeField date
                    const beforeDate = beforeValue instanceof Date ? beforeValue : new Date(beforeValue as string);
                    const maxDateValue = new Date(beforeDate);
                    maxDateValue.setDate(maxDateValue.getDate() - 1);
                    maxDate = maxDateValue;
                  }
                }

                return (
                  <div key={field.id} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                    <DynamicField
                      field={field}
                      value={formData.fields[field.id]}
                      onChange={(value) => updateField(field.id, value)}
                      error={errors[field.id]}
                      minDate={minDate}
                      maxDate={maxDate}
                      suggestions={getSuggestionsForField(field)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Persona Groups (Dynamic Artists/Producers/Signatories) */}
        {personaGroups.map(group => (
          <div
            key={group.id}
            className="rounded-[20px] p-7"
            style={{ background: 'rgba(255, 255, 255, 0.6)' }}
          >
            <PersonaSection
              group={group}
              personas={formData.personas?.[group.id] || []}
              onAddPersona={() => addPersona(group.id)}
              onRemovePersona={(personaId) => removePersona(group.id, personaId)}
              onUpdatePersonaField={(personaId, fieldId, value) =>
                updatePersonaField(group.id, personaId, fieldId, value)
              }
              errors={errors}
              getSuggestionsForField={(field) => getSuggestionsForField(field)}
            />
            {/* Show count error if exists */}
            {errors[`${group.id}_count`] && (
              <p className="mt-2 text-sm text-[#dc3545]">{errors[`${group.id}_count`]}</p>
            )}
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

        {/* Success Message */}
        {saveSuccess && (
          <div className="rounded-xl p-4 bg-[rgba(40,167,69,0.1)] text-[#28a745] text-sm font-medium flex items-center gap-2">
            <FileText size={18} />
            Contract saved to Contract Manager!
          </div>
        )}

        {/* Error Message */}
        {saveDraftContractMutation.isError && (
          <div className="rounded-xl p-4 bg-[rgba(220,53,69,0.1)] text-[#dc3545] text-sm">
            Failed to save contract. Please try again.
          </div>
        )}

        {/* Actions */}
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6"
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

          <div className="flex flex-wrap items-center gap-3">
            {isDirty && (
              <button
                type="button"
                onClick={saveDraft}
                className="flex items-center gap-2 px-4 py-2.5 text-[rgba(102,0,51,0.6)] hover:text-[#660033] transition-colors text-sm"
                data-testid="button-save-draft"
              >
                <Save size={16} />
                Save Locally
              </button>
            )}
            <button
              type="button"
              onClick={() => saveDraftContractMutation.mutate()}
              disabled={saveDraftContractMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-[rgba(102,0,51,0.1)] text-[#660033] rounded-xl font-semibold text-sm hover:bg-[rgba(102,0,51,0.15)] transition-all disabled:opacity-50"
              data-testid="button-save-contract"
            >
              {saveDraftContractMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Saving...
                </>
              ) : (
                <>
                  <FileText size={16} />
                  Save to Contracts
                </>
              )}
            </button>
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
