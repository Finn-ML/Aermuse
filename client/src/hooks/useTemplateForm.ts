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
  templateId: string
): UseTemplateFormReturn {
  const storageKey = `template-draft-${templateId}`;

  // Get fields from template
  const templateFields = (template.fields || []) as TemplateField[];
  const templateClauses = (template.optionalClauses || []) as OptionalClause[];

  // Initialize from localStorage or defaults
  const getInitialData = useCallback((): TemplateFormData => {
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
  }, [storageKey, templateFields, templateClauses]);

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
