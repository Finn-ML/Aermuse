/**
 * ClauseToggle Component
 * Epic 3: Contract Templates System - Story 3.8
 *
 * Toggle for optional clauses with expandable fields.
 */

import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { DynamicField } from './DynamicField';
import type { OptionalClause } from '@shared/types/templates';

interface Props {
  clause: OptionalClause;
  enabled: boolean;
  onToggle: () => void;
  fieldValues: Record<string, string | number | Date | null>;
  onFieldChange: (fieldId: string, value: string | number | Date | null) => void;
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
    <div
      className={`rounded-[16px] overflow-hidden transition-all ${
        enabled
          ? 'border-2 border-[#660033] shadow-[0_5px_20px_rgba(102,0,51,0.1)]'
          : 'border-2 border-[rgba(102,0,51,0.1)]'
      }`}
      data-testid={`clause-${clause.id}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`w-full px-5 py-4 flex items-center justify-between transition-all ${
          enabled
            ? 'bg-[rgba(102,0,51,0.05)]'
            : 'bg-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.8)]'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
              enabled
                ? 'bg-[#660033]'
                : 'border-2 border-[rgba(102,0,51,0.3)]'
            }`}
          >
            {enabled && <Check size={14} className="text-[#F7E6CA]" />}
          </div>
          <div className="text-left">
            <div className="font-semibold text-[#660033]">{clause.name}</div>
            <div className="text-sm text-[rgba(102,0,51,0.6)]">{clause.description}</div>
          </div>
        </div>
        {enabled ? (
          <ChevronUp size={20} className="text-[rgba(102,0,51,0.5)]" />
        ) : (
          <ChevronDown size={20} className="text-[rgba(102,0,51,0.5)]" />
        )}
      </button>

      {enabled && clause.fields && clause.fields.length > 0 && (
        <div
          className="px-5 py-4 border-t border-[rgba(102,0,51,0.1)] space-y-4"
          style={{ background: 'rgba(255, 255, 255, 0.6)' }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {clause.fields.map(field => (
              <div key={field.id} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <DynamicField
                  field={field}
                  value={fieldValues[field.id]}
                  onChange={(value) => onFieldChange(field.id, value)}
                  error={errors[field.id]}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
