/**
 * UserTemplateEditor Component
 * Alpha Feature: Advanced User Template Editing
 *
 * Step-by-step wizard for ALPHA users to customize their templates:
 * Step 1: Basic Info (name, description)
 * Step 2: Content Sections (edit section headings and content with variable insertion)
 * Step 3: Variables/Fields (configure detected variables - label, type, required, placeholder)
 * Step 4: Review & Save (preview and confirm)
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  FileText,
  Settings,
  Eye,
  PenLine,
  AlertCircle,
} from 'lucide-react';
import { useUpdateUserTemplate } from '@/hooks/useUserTemplates';
import { useToast } from '@/hooks/use-toast';
import type { ContractTemplate } from '@shared/schema';
import type {
  TemplateContent,
  TemplateSection,
  TemplateField,
  OptionalClause,
  FieldType,
} from '@shared/types/templates';

interface Props {
  template: ContractTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (template: ContractTemplate) => void;
}

// Simplified field types for user-friendly editing
const USER_FIELD_TYPES: { value: FieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Text', description: 'Short text like names' },
  { value: 'textarea', label: 'Long Text', description: 'Multi-line descriptions' },
  { value: 'number', label: 'Number', description: 'Numeric values' },
  { value: 'date', label: 'Date', description: 'Calendar date picker' },
  { value: 'select', label: 'Dropdown', description: 'Choose from options' },
];

const STEPS = [
  { id: 1, title: 'Basic Info', icon: FileText },
  { id: 2, title: 'Content', icon: PenLine },
  { id: 3, title: 'Variables', icon: Settings },
  { id: 4, title: 'Review', icon: Eye },
];

/**
 * Extract all {{variable}} placeholders from template content
 */
function extractVariables(content: TemplateContent): string[] {
  const variables = new Set<string>();
  const regex = /\{\{(\w+)\}\}/g;

  // Extract from title
  let match;
  while ((match = regex.exec(content.title || '')) !== null) {
    variables.add(match[1]);
  }

  // Extract from sections
  for (const section of content.sections || []) {
    regex.lastIndex = 0;
    while ((match = regex.exec(section.heading || '')) !== null) {
      variables.add(match[1]);
    }
    regex.lastIndex = 0;
    while ((match = regex.exec(section.content || '')) !== null) {
      variables.add(match[1]);
    }
  }

  return Array.from(variables);
}

/**
 * Create an empty section
 */
const createSection = (): TemplateSection => ({
  id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  heading: '',
  content: '',
  isOptional: false,
});

/**
 * Create an empty field
 */
const createField = (id: string = ''): TemplateField => ({
  id: id || `field-${Date.now()}`,
  label: id ? id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '',
  type: 'text',
  required: true,
  placeholder: '',
});

export function UserTemplateEditor({ template, isOpen, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const { mutateAsync: updateTemplate, isPending } = useUpdateUserTemplate();

  // Current step
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contentTitle, setContentTitle] = useState('');
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [optionalClauses, setOptionalClauses] = useState<OptionalClause[]>([]);

  // Validation
  const [errors, setErrors] = useState<string[]>([]);

  // Reset form when template changes or dialog opens
  useEffect(() => {
    if (template && isOpen) {
      setName(template.name);
      setDescription(template.description || '');
      const content = template.content as TemplateContent;
      setContentTitle(content?.title || '');
      setSections(content?.sections?.length ? [...content.sections] : [createSection()]);
      setFields(template.fields as TemplateField[] || []);
      setOptionalClauses(template.optionalClauses as OptionalClause[] || []);
      setCurrentStep(1);
      setErrors([]);
    }
  }, [template, isOpen]);

  // Auto-detect new variables when content changes
  useEffect(() => {
    const content: TemplateContent = { title: contentTitle, sections };
    const detectedVariables = extractVariables(content);
    const existingFieldIds = new Set(fields.map(f => f.id));

    // Add fields for any new variables that don't have a field yet
    const newFields: TemplateField[] = [];
    for (const variable of detectedVariables) {
      if (!existingFieldIds.has(variable)) {
        newFields.push(createField(variable));
      }
    }

    if (newFields.length > 0) {
      setFields(prev => [...prev, ...newFields]);
    }
  }, [contentTitle, sections]);

  // Section handlers
  const addSection = () => setSections([...sections, createSection()]);
  const removeSection = (index: number) => {
    if (sections.length > 1) {
      setSections(sections.filter((_, i) => i !== index));
    }
  };
  const updateSection = (index: number, updates: Partial<TemplateSection>) => {
    setSections(sections.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  // Field handlers
  const addField = () => setFields([...fields, createField()]);
  const removeField = (index: number) => setFields(fields.filter((_, i) => i !== index));
  const updateField = (index: number, updates: Partial<TemplateField>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  // Insert variable into text
  const insertVariable = (textareaId: string, variableId: string, currentValue: string, setValue: (val: string) => void) => {
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart || currentValue.length;
      const end = textarea.selectionEnd || currentValue.length;
      const newText = currentValue.substring(0, start) + `{{${variableId}}}` + currentValue.substring(end);
      setValue(newText);
      // Restore focus and cursor position
      setTimeout(() => {
        textarea.focus();
        const newPos = start + variableId.length + 4;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }
  };

  // Validation
  const validateStep = (step: number): boolean => {
    const stepErrors: string[] = [];

    switch (step) {
      case 1:
        if (!name.trim()) stepErrors.push('Template name is required');
        break;
      case 2:
        if (!contentTitle.trim()) stepErrors.push('Document title is required');
        const validSections = sections.filter(s => s.heading?.trim() || s.content?.trim());
        if (validSections.length === 0) {
          stepErrors.push('At least one section with content is required');
        }
        for (const section of validSections) {
          if (!section.heading?.trim()) {
            stepErrors.push(`Section "${section.id}" is missing a heading`);
          }
          if (!section.content?.trim()) {
            stepErrors.push(`Section "${section.heading || section.id}" is missing content`);
          }
        }
        break;
      case 3:
        // Validate fields
        const fieldIds = new Set<string>();
        for (const field of fields) {
          if (!field.id?.trim()) {
            stepErrors.push('Each variable must have an ID');
          } else if (fieldIds.has(field.id)) {
            stepErrors.push(`Duplicate variable ID: "${field.id}"`);
          } else {
            fieldIds.add(field.id);
          }
          if (!field.label?.trim()) {
            stepErrors.push(`Variable "${field.id}" is missing a label`);
          }
        }
        break;
    }

    setErrors(stepErrors);
    return stepErrors.length === 0;
  };

  const goToNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const goToPrevStep = () => {
    setErrors([]);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSave = async () => {
    // Validate all steps
    for (let step = 1; step <= 3; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        return;
      }
    }

    try {
      const content: TemplateContent = {
        title: contentTitle,
        sections: sections.filter(s => s.heading?.trim() || s.content?.trim()),
      };

      const filteredFields = fields.filter(f => f.id?.trim() && f.label?.trim());

      const result = await updateTemplate({
        id: template.id,
        name: name.trim(),
        description: description.trim(),
        content,
        fields: filteredFields,
        optionalClauses,
      });

      toast({
        title: 'Template saved',
        description: 'Your template has been updated successfully',
      });

      onSuccess?.(result.template);
      onClose();
    } catch (error: any) {
      toast({
        title: 'Failed to save template',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    }
  };

  // Get variables used in content for preview
  const usedVariables = extractVariables({ title: contentTitle, sections });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#660033]">Customize Template</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-4 border-b border-[rgba(102,0,51,0.1)]">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => {
                    if (isCompleted || (step.id < currentStep && validateStep(currentStep))) {
                      setCurrentStep(step.id);
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#660033] text-white'
                      : isCompleted
                      ? 'bg-[rgba(102,0,51,0.1)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)]'
                      : 'text-[rgba(102,0,51,0.4)]'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={16} />
                  ) : (
                    <Icon size={16} />
                  )}
                  <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <ChevronRight size={16} className="mx-1 text-[rgba(102,0,51,0.3)]" />
                )}
              </div>
            );
          })}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium mb-1">Please fix the following:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-4">
          <div className="py-4 space-y-4">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name" className="text-[#660033] font-semibold">
                    Template Name *
                  </Label>
                  <Input
                    id="template-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., My Recording Agreement"
                    className="border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-description" className="text-[#660033] font-semibold">
                    Description
                  </Label>
                  <Textarea
                    id="template-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this template is for..."
                    rows={3}
                    className="border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033]"
                  />
                  <p className="text-xs text-[rgba(102,0,51,0.5)]">
                    This helps you remember what this template is for when browsing your templates.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Content Sections */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content-title" className="text-[#660033] font-semibold">
                    Document Title *
                  </Label>
                  <Input
                    id="content-title"
                    value={contentTitle}
                    onChange={(e) => setContentTitle(e.target.value)}
                    placeholder="e.g., Recording Agreement"
                    className="border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033]"
                  />
                  <p className="text-xs text-[rgba(102,0,51,0.5)]">
                    The title that appears at the top of the generated contract.
                    Use {"{{variable_name}}"} to insert dynamic values.
                  </p>
                  {/* Variable pills for title */}
                  {fields.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-[rgba(102,0,51,0.5)] uppercase tracking-wide self-center mr-1">
                        Insert:
                      </span>
                      {fields.slice(0, 6).map((field) => (
                        <button
                          key={field.id}
                          type="button"
                          onClick={() => insertVariable('content-title', field.id, contentTitle, setContentTitle)}
                          className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-[#660033] bg-[rgba(102,0,51,0.1)] hover:bg-[rgba(102,0,51,0.15)] rounded transition-colors"
                        >
                          {field.label || field.id}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[#660033] font-semibold">Sections</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSection}
                      className="border-[rgba(102,0,51,0.2)] text-[#660033] hover:bg-[rgba(102,0,51,0.05)]"
                    >
                      <Plus size={14} className="mr-1" /> Add Section
                    </Button>
                  </div>

                  {sections.map((section, index) => (
                    <Card key={section.id} className="border-[rgba(102,0,51,0.1)]">
                      <CardHeader className="py-3 px-4 bg-[rgba(102,0,51,0.02)]">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-[#660033]">
                            Section {index + 1}
                          </CardTitle>
                          {sections.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSection(index)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        <div className="space-y-2">
                          <Label className="text-sm text-[rgba(102,0,51,0.7)]">Section Heading</Label>
                          <Input
                            value={section.heading}
                            onChange={(e) => updateSection(index, { heading: e.target.value })}
                            placeholder="e.g., 1. PARTIES"
                            className="border-[rgba(102,0,51,0.1)] focus:border-[#660033]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-[rgba(102,0,51,0.7)]">Content</Label>
                          <Textarea
                            id={`section-${index}-content`}
                            value={section.content}
                            onChange={(e) => updateSection(index, { content: e.target.value })}
                            placeholder="Section content..."
                            rows={4}
                            className="border-[rgba(102,0,51,0.1)] focus:border-[#660033] font-mono text-sm"
                          />
                          {/* Variable pills */}
                          {fields.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <span className="text-[10px] text-[rgba(102,0,51,0.5)] uppercase tracking-wide self-center mr-1">
                                Insert:
                              </span>
                              {fields.map((field) => (
                                <button
                                  key={field.id}
                                  type="button"
                                  onClick={() => insertVariable(
                                    `section-${index}-content`,
                                    field.id,
                                    section.content,
                                    (val) => updateSection(index, { content: val })
                                  )}
                                  className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-[#660033] bg-[rgba(102,0,51,0.1)] hover:bg-[rgba(102,0,51,0.15)] rounded transition-colors"
                                >
                                  {field.label || field.id}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Variables/Fields */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="bg-[rgba(102,0,51,0.03)] rounded-lg p-4 mb-4">
                  <h3 className="text-sm font-semibold text-[#660033] mb-1">Configure Your Variables</h3>
                  <p className="text-xs text-[rgba(102,0,51,0.6)]">
                    These are the fields users will fill out when creating a contract from this template.
                    Variables in your content (like {"{{artist_name}}"}) will be replaced with the values entered here.
                  </p>
                </div>

                {usedVariables.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="text-xs text-[rgba(102,0,51,0.5)]">Variables in use:</span>
                    {usedVariables.map(v => (
                      <Badge key={v} variant="secondary" className="bg-[rgba(102,0,51,0.1)] text-[#660033]">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[#660033] font-semibold">Variables ({fields.length})</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addField}
                    className="border-[rgba(102,0,51,0.2)] text-[#660033] hover:bg-[rgba(102,0,51,0.05)]"
                  >
                    <Plus size={14} className="mr-1" /> Add Variable
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <Card className="border-[rgba(102,0,51,0.1)]">
                    <CardContent className="py-8 text-center text-[rgba(102,0,51,0.5)]">
                      No variables defined. Add {"{{variable_name}}"} placeholders in your content
                      or click "Add Variable" to create form fields.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <Card key={index} className="border-[rgba(102,0,51,0.1)]">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-[rgba(102,0,51,0.7)]">Variable ID</Label>
                                <Input
                                  value={field.id}
                                  onChange={(e) => updateField(index, { id: e.target.value.replace(/\s/g, '_').toLowerCase() })}
                                  placeholder="e.g., artist_name"
                                  className="border-[rgba(102,0,51,0.1)] focus:border-[#660033] font-mono text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-[rgba(102,0,51,0.7)]">Display Label</Label>
                                <Input
                                  value={field.label}
                                  onChange={(e) => updateField(index, { label: e.target.value })}
                                  placeholder="e.g., Artist Name"
                                  className="border-[rgba(102,0,51,0.1)] focus:border-[#660033]"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-[rgba(102,0,51,0.7)]">Field Type</Label>
                                <Select
                                  value={field.type}
                                  onValueChange={(v) => updateField(index, { type: v as FieldType })}
                                >
                                  <SelectTrigger className="border-[rgba(102,0,51,0.1)] focus:border-[#660033]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {USER_FIELD_TYPES.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        <div className="flex flex-col">
                                          <span>{type.label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-[rgba(102,0,51,0.7)]">Placeholder</Label>
                                <Input
                                  value={field.placeholder || ''}
                                  onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                  placeholder="Hint text shown in field"
                                  className="border-[rgba(102,0,51,0.1)] focus:border-[#660033]"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col items-center gap-2 pt-5">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={field.required}
                                  onCheckedChange={(checked) => updateField(index, { required: checked })}
                                />
                                <span className="text-xs text-[rgba(102,0,51,0.6)]">Required</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeField(index)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Review & Save */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="bg-[rgba(102,0,51,0.03)] rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-[#660033] mb-1">Review Your Template</h3>
                  <p className="text-xs text-[rgba(102,0,51,0.6)]">
                    Please review the summary below before saving your changes.
                  </p>
                </div>

                <Card className="border-[rgba(102,0,51,0.1)]">
                  <CardHeader className="py-3 px-4 bg-[rgba(102,0,51,0.02)]">
                    <CardTitle className="text-sm font-medium text-[#660033]">Template Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <span className="text-xs text-[rgba(102,0,51,0.5)]">Name</span>
                      <p className="font-medium text-[#660033]">{name}</p>
                    </div>
                    {description && (
                      <div>
                        <span className="text-xs text-[rgba(102,0,51,0.5)]">Description</span>
                        <p className="text-sm text-[rgba(102,0,51,0.8)]">{description}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-[rgba(102,0,51,0.5)]">Document Title</span>
                      <p className="text-sm text-[rgba(102,0,51,0.8)]">{contentTitle}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[rgba(102,0,51,0.1)]">
                  <CardHeader className="py-3 px-4 bg-[rgba(102,0,51,0.02)]">
                    <CardTitle className="text-sm font-medium text-[#660033]">
                      Sections ({sections.filter(s => s.heading?.trim()).length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {sections.filter(s => s.heading?.trim()).map((section, index) => (
                        <div key={section.id} className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-[rgba(102,0,51,0.05)]">
                            {index + 1}
                          </Badge>
                          <span className="text-sm text-[rgba(102,0,51,0.8)]">{section.heading}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[rgba(102,0,51,0.1)]">
                  <CardHeader className="py-3 px-4 bg-[rgba(102,0,51,0.02)]">
                    <CardTitle className="text-sm font-medium text-[#660033]">
                      Variables ({fields.filter(f => f.id?.trim() && f.label?.trim()).length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {fields.filter(f => f.id?.trim() && f.label?.trim()).length === 0 ? (
                      <p className="text-sm text-[rgba(102,0,51,0.5)]">No variables defined</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {fields.filter(f => f.id?.trim() && f.label?.trim()).map((field) => (
                          <Badge key={field.id} variant="secondary" className="bg-[rgba(102,0,51,0.1)] text-[#660033]">
                            {field.label} ({field.type})
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-[rgba(102,0,51,0.1)]">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? onClose : goToPrevStep}
            disabled={isPending}
            className="border-[rgba(102,0,51,0.2)] text-[#660033] hover:bg-[rgba(102,0,51,0.05)]"
          >
            <ChevronLeft size={16} className="mr-1" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep < 4 ? (
            <Button
              type="button"
              onClick={goToNextStep}
              className="bg-[#660033] text-[#F7E6CA] hover:bg-[#550028]"
            >
              Next
              <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="bg-[#660033] text-[#F7E6CA] hover:bg-[#550028]"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} className="mr-1" />
                  Save Template
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
