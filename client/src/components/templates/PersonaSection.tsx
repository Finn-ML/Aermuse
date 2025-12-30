/**
 * PersonaSection Component
 * Epic 3: Contract Templates System
 *
 * Renders a dynamic section for persona groups (artists, producers, signatories)
 * with add/delete functionality.
 */

import { Plus, Trash2, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { DynamicField, type FieldSuggestion } from './DynamicField';
import type { PersonaGroup, PersonaInstance, TemplateField } from '@shared/types/templates';

interface Props {
  group: PersonaGroup;
  personas: PersonaInstance[];
  onAddPersona: () => void;
  onRemovePersona: (personaId: string) => void;
  onUpdatePersonaField: (personaId: string, fieldId: string, value: string | number | Date | null) => void;
  errors?: Record<string, string>;
  getSuggestionsForField?: (field: TemplateField, personaIndex: number) => FieldSuggestion[];
}

export function PersonaSection({
  group,
  personas,
  onAddPersona,
  onRemovePersona,
  onUpdatePersonaField,
  errors = {},
  getSuggestionsForField,
}: Props) {
  const [expandedPersonas, setExpandedPersonas] = useState<Set<string>>(() => {
    // Start with all personas expanded
    return new Set(personas.map(p => p.id));
  });

  const canAdd = personas.length < group.maxCount;
  const canRemove = personas.length > group.minCount;

  const toggleExpanded = (personaId: string) => {
    setExpandedPersonas(prev => {
      const next = new Set(prev);
      if (next.has(personaId)) {
        next.delete(personaId);
      } else {
        next.add(personaId);
      }
      return next;
    });
  };

  // Convert PersonaField to TemplateField for DynamicField component
  const createTemplateField = (
    personaField: PersonaGroup['fields'][0],
    personaIndex: number
  ): TemplateField => ({
    id: `${group.id}_${personaIndex}_${personaField.id}`,
    label: personaField.label,
    type: personaField.type,
    placeholder: personaField.placeholder,
    required: personaField.required,
    defaultValue: personaField.defaultValue,
    options: personaField.options,
    validation: personaField.validation,
    helpText: personaField.helpText,
    group: `${group.singularName} ${personaIndex + 1}`,
  });

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#660033]">
            {group.pluralName}
          </h3>
          {group.description && (
            <p className="text-sm text-[rgba(102,0,51,0.6)]">{group.description}</p>
          )}
          <p className="text-xs text-[rgba(102,0,51,0.5)] mt-1">
            {group.minCount === group.maxCount
              ? `Exactly ${group.minCount} required`
              : `${group.minCount} to ${group.maxCount} allowed`}
          </p>
        </div>

        {/* Add Button */}
        <button
          type="button"
          onClick={onAddPersona}
          disabled={!canAdd}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            canAdd
              ? 'bg-[#660033] text-[#F7E6CA] hover:shadow-[0_5px_15px_rgba(102,0,51,0.3)]'
              : 'bg-[rgba(102,0,51,0.1)] text-[rgba(102,0,51,0.4)] cursor-not-allowed'
          }`}
          data-testid={`add-${group.id}`}
        >
          <Plus size={16} />
          Add {group.singularName}
        </button>
      </div>

      {/* Persona Cards */}
      <div className="space-y-3">
        {personas.map((persona, index) => {
          const isExpanded = expandedPersonas.has(persona.id);
          const personaNumber = index + 1;

          return (
            <div
              key={persona.id}
              className="rounded-[20px] border-2 border-[rgba(102,0,51,0.1)] overflow-hidden transition-all"
              style={{ background: 'rgba(255, 255, 255, 0.6)' }}
            >
              {/* Persona Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-[rgba(102,0,51,0.02)] transition-colors"
                onClick={() => toggleExpanded(persona.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[rgba(102,0,51,0.1)] flex items-center justify-center">
                    <User size={20} className="text-[#660033]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#660033]">
                      {group.singularName} {personaNumber}
                    </h4>
                    {/* Show name preview if available */}
                    {persona.values.name && (
                      <p className="text-sm text-[rgba(102,0,51,0.6)]">
                        {persona.values.name as string}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Remove Button */}
                  {canRemove && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePersona(persona.id);
                      }}
                      className="p-2 rounded-lg text-[rgba(102,0,51,0.4)] hover:text-[#dc3545] hover:bg-[rgba(220,53,69,0.1)] transition-all"
                      title={`Remove ${group.singularName} ${personaNumber}`}
                      data-testid={`remove-${group.id}-${index}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}

                  {/* Expand/Collapse */}
                  <div className="p-2 text-[rgba(102,0,51,0.4)]">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </div>

              {/* Persona Fields */}
              {isExpanded && (
                <div className="p-5 pt-0 border-t border-[rgba(102,0,51,0.08)]">
                  <div className="grid gap-4 sm:grid-cols-2 pt-4">
                    {group.fields.map(personaField => {
                      const templateField = createTemplateField(personaField, index);
                      const fieldKey = `${group.id}_${index}_${personaField.id}`;
                      const fieldError = errors[fieldKey];

                      return (
                        <div
                          key={personaField.id}
                          className={personaField.type === 'textarea' ? 'sm:col-span-2' : ''}
                        >
                          <DynamicField
                            field={templateField}
                            value={persona.values[personaField.id]}
                            onChange={(value) => onUpdatePersonaField(persona.id, personaField.id, value)}
                            error={fieldError}
                            suggestions={getSuggestionsForField?.(templateField, index)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {personas.length === 0 && (
        <div className="text-center py-8 rounded-xl border-2 border-dashed border-[rgba(102,0,51,0.2)]">
          <User size={40} className="mx-auto text-[rgba(102,0,51,0.3)] mb-3" />
          <p className="text-[rgba(102,0,51,0.5)]">
            No {group.pluralName.toLowerCase()} added yet.
          </p>
          <p className="text-xs text-[rgba(102,0,51,0.4)] mt-1">
            Click "Add {group.singularName}" to get started.
          </p>
        </div>
      )}
    </div>
  );
}
