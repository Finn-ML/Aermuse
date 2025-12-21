/**
 * useTemplateForm Hook
 * Epic 3: Contract Templates System - Story 3.8
 *
 * Manages form state for template fill-in with auto-save and validation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ContractTemplate } from '@shared/schema';
import type { TemplateField, OptionalClause, TemplateFormData } from '@shared/types/templates';

const AUTOSAVE_INTERVAL = 30000; // 30 seconds

interface UseTemplateFormReturn {
  formData: TemplateFormData;
  errors: Record<string, string>;
  isDirty: boolean;
  updateField: (fieldId: string, value: string | number | Date | null) => void;
  toggleClause: (clauseId: string) => void;
  validate: () => boolean;
  clearDraft: () => void;
  saveDraft: () => void;
  lastSaved: Date | null;
}

export function useTemplateForm(
  template: ContractTemplate,
  templateId: string,
  initialData?: Record<string, string | number | Date | null>
): UseTemplateFormReturn {
  const storageKey = `template-draft-${templateId}`;

  // Get fields from template
  const templateFields = (template.fields || []) as TemplateField[];
  const templateClauses = (template.optionalClauses || []) as OptionalClause[];

  // Initialize from localStorage or defaults
  const getInitialData = useCallback((): TemplateFormData => {
    // If initialData is provided (e.g., from a proposal), use it instead of localStorage
    if (initialData && Object.keys(initialData).length > 0) {
      // Start with defaults, then overlay initialData
      const fields: Record<string, string | number | Date | null> = {};
      for (const field of templateFields) {
        if (field.defaultValue !== undefined) {
          fields[field.id] = field.defaultValue as string | number | Date | null;
        }
      }
      // Also add default values for clause fields
      for (const clause of templateClauses) {
        if (clause.fields) {
          for (const field of clause.fields) {
            if (field.defaultValue !== undefined) {
              fields[field.id] = field.defaultValue as string | number | Date | null;
            }
          }
        }
      }
      // Overlay initialData
      Object.assign(fields, initialData);

      const enabledClauses = templateClauses
        .filter(c => c.defaultEnabled)
        .map(c => c.id);

      return { fields, enabledClauses };
    }

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Restore Date objects
        for (const field of templateFields) {
          if (field.type === 'date' && parsed.fields[field.id]) {
            parsed.fields[field.id] = new Date(parsed.fields[field.id]);
          }
        }
        return parsed;
      } catch {
        // Ignore parse errors
      }
    }

    // Build defaults
    const fields: Record<string, string | number | Date | null> = {};
    for (const field of templateFields) {
      if (field.defaultValue !== undefined) {
        fields[field.id] = field.defaultValue as string | number | Date | null;
      }
    }

    // Also add default values for clause fields
    for (const clause of templateClauses) {
      if (clause.fields) {
        for (const field of clause.fields) {
          if (field.defaultValue !== undefined) {
            fields[field.id] = field.defaultValue as string | number | Date | null;
          }
        }
      }
    }

    const enabledClauses = templateClauses
      .filter(c => c.defaultEnabled)
      .map(c => c.id);

    return { fields, enabledClauses };
  }, [storageKey, templateFields, templateClauses, initialData]);

  const [formData, setFormData] = useState<TemplateFormData>(getInitialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

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

  // Save immediately when leaving page (browser close/refresh)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirty) {
        localStorage.setItem(storageKey, JSON.stringify(formData));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, isDirty, storageKey]);

  // Save draft when component unmounts (e.g., navigating away within the app)
  // This uses a ref to access current values in cleanup without re-running effect
  const formDataRef = useRef(formData);
  const isDirtyRef = useRef(isDirty);
  const storageKeyRef = useRef(storageKey);

  // Keep refs updated with latest values
  useEffect(() => {
    formDataRef.current = formData;
    isDirtyRef.current = isDirty;
    storageKeyRef.current = storageKey;
  }, [formData, isDirty, storageKey]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        localStorage.setItem(storageKeyRef.current, JSON.stringify(formDataRef.current));
      }
    };
  }, []);

  const updateField = useCallback((fieldId: string, value: string | number | Date | null) => {
    setFormData(prev => ({
      ...prev,
      fields: { ...prev.fields, [fieldId]: value }
    }));
    setIsDirty(true);

    // Clear error on change
    setErrors(prev => {
      if (prev[fieldId]) {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      }
      return prev;
    });
  }, []);

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
    for (const field of templateFields) {
      if (field.required) {
        const value = formData.fields[field.id];
        if (value === undefined || value === null || value === '') {
          newErrors[field.id] = `${field.label} is required`;
        }
      }

      // Validate number range
      const fieldValue = formData.fields[field.id];
      if (field.type === 'number' && field.validation && fieldValue !== undefined && fieldValue !== null) {
        const value = fieldValue as number;
        if (field.validation.min !== undefined && value < field.validation.min) {
          newErrors[field.id] = `Must be at least ${field.validation.min}`;
        }
        if (field.validation.max !== undefined && value > field.validation.max) {
          newErrors[field.id] = `Must be at most ${field.validation.max}`;
        }
      }

      // Validate time format (HH:MM)
      if (field.type === 'time' && fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(fieldValue as string)) {
          newErrors[field.id] = `${field.label} must be a valid time (e.g., 14:30)`;
        }
      }

      // Cross-field date validation: afterField
      if (field.type === 'date' && field.validation?.afterField && fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
        const afterFieldValue = formData.fields[field.validation.afterField];
        if (afterFieldValue !== undefined && afterFieldValue !== null && afterFieldValue !== '') {
          const currentDate = fieldValue instanceof Date ? fieldValue : new Date(fieldValue as string);
          const afterDate = afterFieldValue instanceof Date ? afterFieldValue : new Date(afterFieldValue as string);

          if (!isNaN(currentDate.getTime()) && !isNaN(afterDate.getTime())) {
            if (currentDate <= afterDate) {
              newErrors[field.id] = field.validation.afterFieldMessage || `${field.label} must be after the start date`;
            }
          }
        }
      }

      // Cross-field date validation: beforeField
      if (field.type === 'date' && field.validation?.beforeField && fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
        const beforeFieldValue = formData.fields[field.validation.beforeField];
        if (beforeFieldValue !== undefined && beforeFieldValue !== null && beforeFieldValue !== '') {
          const currentDate = fieldValue instanceof Date ? fieldValue : new Date(fieldValue as string);
          const beforeDate = beforeFieldValue instanceof Date ? beforeFieldValue : new Date(beforeFieldValue as string);

          if (!isNaN(currentDate.getTime()) && !isNaN(beforeDate.getTime())) {
            if (currentDate >= beforeDate) {
              newErrors[field.id] = field.validation.beforeFieldMessage || `${field.label} must be before the end date`;
            }
          }
        }
      }
    }

    // Validate optional clause fields
    for (const clause of templateClauses) {
      if (formData.enabledClauses.includes(clause.id) && clause.fields) {
        for (const field of clause.fields) {
          if (field.required) {
            const value = formData.fields[field.id];
            if (value === undefined || value === null || value === '') {
              newErrors[field.id] = `${field.label} is required`;
            }
          }

          // Validate number range for clause fields
          const clauseFieldValue = formData.fields[field.id];
          if (field.type === 'number' && field.validation && clauseFieldValue !== undefined && clauseFieldValue !== null) {
            const value = clauseFieldValue as number;
            if (field.validation.min !== undefined && value < field.validation.min) {
              newErrors[field.id] = `Must be at least ${field.validation.min}`;
            }
            if (field.validation.max !== undefined && value > field.validation.max) {
              newErrors[field.id] = `Must be at most ${field.validation.max}`;
            }
          }

          // Validate time format for clause fields (HH:MM)
          if (field.type === 'time' && clauseFieldValue !== undefined && clauseFieldValue !== null && clauseFieldValue !== '') {
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(clauseFieldValue as string)) {
              newErrors[field.id] = `${field.label} must be a valid time (e.g., 14:30)`;
            }
          }

          // Cross-field date validation for clause fields: afterField
          if (field.type === 'date' && field.validation?.afterField && clauseFieldValue !== undefined && clauseFieldValue !== null && clauseFieldValue !== '') {
            const afterFieldValue = formData.fields[field.validation.afterField];
            if (afterFieldValue !== undefined && afterFieldValue !== null && afterFieldValue !== '') {
              const currentDate = clauseFieldValue instanceof Date ? clauseFieldValue : new Date(clauseFieldValue as string);
              const afterDate = afterFieldValue instanceof Date ? afterFieldValue : new Date(afterFieldValue as string);

              if (!isNaN(currentDate.getTime()) && !isNaN(afterDate.getTime())) {
                if (currentDate <= afterDate) {
                  newErrors[field.id] = field.validation.afterFieldMessage || `${field.label} must be after the start date`;
                }
              }
            }
          }

          // Cross-field date validation for clause fields: beforeField
          if (field.type === 'date' && field.validation?.beforeField && clauseFieldValue !== undefined && clauseFieldValue !== null && clauseFieldValue !== '') {
            const beforeFieldValue = formData.fields[field.validation.beforeField];
            if (beforeFieldValue !== undefined && beforeFieldValue !== null && beforeFieldValue !== '') {
              const currentDate = clauseFieldValue instanceof Date ? clauseFieldValue : new Date(clauseFieldValue as string);
              const beforeDate = beforeFieldValue instanceof Date ? beforeFieldValue : new Date(beforeFieldValue as string);

              if (!isNaN(currentDate.getTime()) && !isNaN(beforeDate.getTime())) {
                if (currentDate >= beforeDate) {
                  newErrors[field.id] = field.validation.beforeFieldMessage || `${field.label} must be before the end date`;
                }
              }
            }
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [templateFields, templateClauses, formData]);

  const saveDraft = useCallback(() => {
    localStorage.setItem(storageKey, JSON.stringify(formData));
    setLastSaved(new Date());
    setIsDirty(false);
  }, [storageKey, formData]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setFormData(getInitialData());
    setErrors({});
    setIsDirty(false);
    setLastSaved(null);
  }, [storageKey, getInitialData]);

  return {
    formData,
    errors,
    isDirty,
    updateField,
    toggleClause,
    validate,
    clearDraft,
    saveDraft,
    lastSaved,
  };
}
