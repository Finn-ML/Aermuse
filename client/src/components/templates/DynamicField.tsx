/**
 * DynamicField Component
 * Epic 3: Contract Templates System - Story 3.8
 *
 * Renders the appropriate input for each field type.
 */

import { AlertCircle } from 'lucide-react';
import type { TemplateField } from '@shared/types/templates';

interface Props {
  field: TemplateField;
  value: string | number | Date | null | undefined;
  onChange: (value: string | number | Date | null) => void;
  error?: string;
  minDate?: Date | string | null;
  maxDate?: Date | string | null;
}

export function DynamicField({ field, value, onChange, error, minDate, maxDate }: Props) {
  const baseInputClass = `
    w-full px-4 py-3 rounded-xl bg-white border-2 transition-all outline-none
    ${error
      ? 'border-[#dc3545] focus:border-[#dc3545]'
      : 'border-[rgba(102,0,51,0.1)] focus:border-[#660033]'
    }
  `;

  const renderInput = () => {
    switch (field.type) {
      case 'text':
      case 'email':
        return (
          <input
            type={field.type}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
            data-testid={`field-${field.id}`}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={`${baseInputClass} resize-none min-h-[100px]`}
            data-testid={`field-${field.id}`}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value !== undefined && value !== null ? String(value) : ''}
            onChange={(e) => onChange(e.target.value ? e.target.valueAsNumber : null)}
            onKeyDown={(e) => {
              // Block letters and invalid characters for number input
              if (['e', 'E', '+', '-'].includes(e.key)) {
                e.preventDefault();
              }
            }}
            min={field.validation?.min}
            max={field.validation?.max}
            className={baseInputClass}
            data-testid={`field-${field.id}`}
          />
        );

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgba(102,0,51,0.5)] font-medium">
              £
            </span>
            <input
              type="number"
              value={value !== undefined && value !== null ? String(value) : ''}
              onChange={(e) => onChange(e.target.value ? e.target.valueAsNumber : null)}
              onKeyDown={(e) => {
                // Block letters and invalid characters for currency input
                if (['e', 'E', '+', '-'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              min={0}
              step="0.01"
              className={`${baseInputClass} pl-8`}
              data-testid={`field-${field.id}`}
            />
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value ? formatDateForInput(value as Date | string) : ''}
            onChange={(e) => {
              if (!e.target.value) {
                onChange(null);
                return;
              }
              const selectedDate = new Date(e.target.value);

              // Validate against min date
              if (minDate) {
                const minDateObj = typeof minDate === 'string' ? new Date(minDate) : minDate;
                if (selectedDate < minDateObj) {
                  // Reject the selection - don't update
                  e.target.value = value ? formatDateForInput(value as Date | string) : '';
                  return;
                }
              }

              // Validate against max date
              if (maxDate) {
                const maxDateObj = typeof maxDate === 'string' ? new Date(maxDate) : maxDate;
                if (selectedDate > maxDateObj) {
                  // Reject the selection - don't update
                  e.target.value = value ? formatDateForInput(value as Date | string) : '';
                  return;
                }
              }

              onChange(selectedDate);
            }}
            min={minDate ? formatDateForInput(minDate) : undefined}
            max={maxDate ? formatDateForInput(maxDate) : undefined}
            className={baseInputClass}
            data-testid={`field-${field.id}`}
          />
        );

      case 'time':
        return (
          <input
            type="time"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || null)}
            onKeyDown={(e) => {
              // Allow: digits, colon, backspace, delete, tab, arrows, enter
              const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ':'];
              if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key)) {
                e.preventDefault();
              }
            }}
            pattern="[0-9]{2}:[0-9]{2}"
            className={baseInputClass}
            data-testid={`field-${field.id}`}
          />
        );

      case 'select':
        return (
          <select
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
            data-testid={`field-${field.id}`}
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
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)]">
        {field.label}
        {field.required && <span className="text-[#dc3545] ml-1">*</span>}
      </label>

      {renderInput()}

      {field.helpText && !error && (
        <p className="text-xs text-[rgba(102,0,51,0.5)]">{field.helpText}</p>
      )}

      {error && (
        <p className="text-xs text-[#dc3545] flex items-center gap-1">
          <AlertCircle size={12} />
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
