import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2, GripVertical, HelpCircle, X } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { ContractTemplate } from '@shared/schema';
import type {
  TemplateContent,
  TemplateSection,
  TemplateField,
  OptionalClause,
  TemplateCategory,
  FieldType,
} from '@shared/types/templates';

interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ContractTemplate | null;
}

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'artist', label: 'Artist' },
  { value: 'licensing', label: 'Licensing' },
  { value: 'touring', label: 'Touring' },
  { value: 'production', label: 'Production' },
  { value: 'business', label: 'Business' },
];

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
];

const emptySection = (): TemplateSection => ({
  id: `section-${Date.now()}`,
  heading: '',
  content: '',
  isOptional: false,
});

const emptyField = (): TemplateField => ({
  id: `field-${Date.now()}`,
  label: '',
  type: 'text',
  required: true,
  placeholder: '',
});

const emptyClause = (): OptionalClause => ({
  id: `clause-${Date.now()}`,
  name: '',
  description: '',
  defaultEnabled: false,
  fields: [],
});

function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>How to Create Contract Templates</DialogTitle>
          <DialogDescription>
            A guide to building dynamic contract templates with variable substitution
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="font-semibold text-base mb-2">Overview</h3>
              <p className="text-muted-foreground">
                Templates use a variable syntax <code className="bg-muted px-1 rounded">{"{{field_id}}"}</code> that gets replaced with user-provided values when generating contracts.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">Step 1: Basic Info</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Template Name</strong> - Display name shown to users (e.g., "Artist Recording Agreement")</li>
                <li><strong>Description</strong> - Brief explanation of when to use this template</li>
                <li><strong>Category</strong> - Groups templates: artist, licensing, touring, production, business</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">Step 2: Content Sections</h3>
              <p className="text-muted-foreground mb-2">
                Build your contract with sections. Each section has a heading and content body.
              </p>
              <div className="bg-muted p-3 rounded text-xs font-mono">
                <p className="text-muted-foreground mb-1"># Example section content:</p>
                <p>This Agreement is entered into between {"{{artist_name}}"} ("Artist") and {"{{label_name}}"} ("Label") on {"{{effective_date}}"}.</p>
              </div>
              <p className="text-muted-foreground mt-2">
                <strong>Optional sections:</strong> Toggle "Optional section" and link to a clause ID. The section only appears if the user enables that clause.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">Step 3: Define Fields</h3>
              <p className="text-muted-foreground mb-2">
                Each <code className="bg-muted px-1 rounded">{"{{variable}}"}</code> in your content needs a matching field definition.
              </p>
              <div className="border rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Field Type</th>
                      <th className="text-left p-2">Use For</th>
                      <th className="text-left p-2">Example ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr><td className="p-2">Text</td><td className="p-2">Names, short text</td><td className="p-2 font-mono">artist_name</td></tr>
                    <tr><td className="p-2">Text Area</td><td className="p-2">Long descriptions</td><td className="p-2 font-mono">project_description</td></tr>
                    <tr><td className="p-2">Email</td><td className="p-2">Email addresses</td><td className="p-2 font-mono">contact_email</td></tr>
                    <tr><td className="p-2">Number</td><td className="p-2">Quantities, percentages</td><td className="p-2 font-mono">royalty_rate</td></tr>
                    <tr><td className="p-2">Currency</td><td className="p-2">Money amounts</td><td className="p-2 font-mono">advance_amount</td></tr>
                    <tr><td className="p-2">Date</td><td className="p-2">Dates</td><td className="p-2 font-mono">effective_date</td></tr>
                    <tr><td className="p-2">Dropdown</td><td className="p-2">Fixed choices</td><td className="p-2 font-mono">territory</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground mt-2">
                <strong>Field ID rules:</strong> Use lowercase with underscores (snake_case). Must match the variable name in content exactly.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">Step 4: Optional Clauses</h3>
              <p className="text-muted-foreground mb-2">
                Create toggleable sections users can enable/disable. Link clauses to optional sections using matching IDs.
              </p>
              <div className="bg-muted p-3 rounded text-xs">
                <p><strong>Example:</strong></p>
                <p>1. Create clause with ID: <code>royalty_clause</code></p>
                <p>2. In Content tab, mark a section as optional</p>
                <p>3. Set section's Clause ID to: <code>royalty_clause</code></p>
                <p>4. Section only appears when user enables the clause</p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">Common Field IDs</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted p-2 rounded">
                  <p className="font-semibold mb-1">Parties</p>
                  <code className="block">artist_name</code>
                  <code className="block">artist_address</code>
                  <code className="block">label_name</code>
                  <code className="block">label_address</code>
                  <code className="block">producer_name</code>
                </div>
                <div className="bg-muted p-2 rounded">
                  <p className="font-semibold mb-1">Dates</p>
                  <code className="block">effective_date</code>
                  <code className="block">start_date</code>
                  <code className="block">end_date</code>
                  <code className="block">delivery_date</code>
                  <code className="block">term_length</code>
                </div>
                <div className="bg-muted p-2 rounded">
                  <p className="font-semibold mb-1">Financial</p>
                  <code className="block">advance_amount</code>
                  <code className="block">royalty_rate</code>
                  <code className="block">payment_terms</code>
                  <code className="block">budget</code>
                  <code className="block">fee</code>
                </div>
                <div className="bg-muted p-2 rounded">
                  <p className="font-semibold mb-1">Project</p>
                  <code className="block">project_title</code>
                  <code className="block">project_description</code>
                  <code className="block">territory</code>
                  <code className="block">deliverables</code>
                  <code className="block">rights_granted</code>
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">Tips</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Use descriptive field IDs that match the label</li>
                <li>Mark only truly required fields as required</li>
                <li>Add placeholder text to guide users</li>
                <li>Test your template by cloning and filling it out</li>
                <li>Keep section headings consistent with legal standards</li>
              </ul>
            </section>
          </div>
        </ScrollArea>
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TemplateEditor({ open, onOpenChange, template }: TemplateEditorProps) {
  const { toast } = useToast();
  const isEditing = !!template;
  const [helpOpen, setHelpOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('business');
  const [contentTitle, setContentTitle] = useState('');
  const [sections, setSections] = useState<TemplateSection[]>([emptySection()]);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [optionalClauses, setOptionalClauses] = useState<OptionalClause[]>([]);

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setCategory(template.category as TemplateCategory);
      const content = template.content as TemplateContent;
      setContentTitle(content?.title || '');
      setSections(content?.sections?.length ? content.sections : [emptySection()]);
      setFields(template.fields as TemplateField[] || []);
      setOptionalClauses(template.optionalClauses as OptionalClause[] || []);
    } else {
      setName('');
      setDescription('');
      setCategory('business');
      setContentTitle('');
      setSections([emptySection()]);
      setFields([]);
      setOptionalClauses([]);
    }
  }, [template, open]);

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest('POST', '/api/admin/templates', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/templates'] });
      toast({ title: 'Template created successfully' });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create template', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest('PUT', `/api/admin/templates/${template?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/templates'] });
      toast({ title: 'Template updated successfully' });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update template', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    const content: TemplateContent = {
      title: contentTitle,
      sections: sections.filter(s => s.heading || s.content),
    };

    const data = {
      name,
      description: description || null,
      category,
      content,
      fields: fields.filter(f => f.id && f.label),
      optionalClauses: optionalClauses.filter(c => c.id && c.name),
    };

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Section handlers
  const addSection = () => setSections([...sections, emptySection()]);
  const removeSection = (index: number) => setSections(sections.filter((_, i) => i !== index));
  const updateSection = (index: number, updates: Partial<TemplateSection>) => {
    setSections(sections.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  // Field handlers
  const addField = () => setFields([...fields, emptyField()]);
  const removeField = (index: number) => setFields(fields.filter((_, i) => i !== index));
  const updateField = (index: number, updates: Partial<TemplateField>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  // Clause handlers
  const addClause = () => setOptionalClauses([...optionalClauses, emptyClause()]);
  const removeClause = (index: number) => setOptionalClauses(optionalClauses.filter((_, i) => i !== index));
  const updateClause = (index: number, updates: Partial<OptionalClause>) => {
    setOptionalClauses(optionalClauses.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{isEditing ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)}>
              <HelpCircle className="h-4 w-4 mr-1" />
              How to Use
            </Button>
          </div>
        </DialogHeader>

        <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="clauses">Clauses</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Artist Recording Agreement"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this template..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="contentTitle">Document Title</Label>
              <Input
                id="contentTitle"
                value={contentTitle}
                onChange={(e) => setContentTitle(e.target.value)}
                placeholder="e.g., {{artist_name}} Recording Agreement"
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{variable_name}}"} syntax for dynamic values
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Sections</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSection}>
                  <Plus className="h-4 w-4 mr-1" /> Add Section
                </Button>
              </div>

              {sections.map((section, index) => (
                <Card key={section.id}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Section {index + 1}</span>
                        {section.isOptional && (
                          <Badge variant="secondary" className="text-xs">Optional</Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSection(index)}
                        disabled={sections.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label>Heading</Label>
                      <Input
                        value={section.heading}
                        onChange={(e) => updateSection(index, { heading: e.target.value })}
                        placeholder="Section heading"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea
                        value={section.content}
                        onChange={(e) => updateSection(index, { content: e.target.value })}
                        placeholder="Section content with {{variables}}..."
                        rows={4}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={section.isOptional || false}
                        onCheckedChange={(checked) => updateSection(index, { isOptional: checked })}
                      />
                      <Label className="text-sm">Optional section</Label>
                    </div>
                    {section.isOptional && (
                      <div className="space-y-2">
                        <Label>Clause ID</Label>
                        <Input
                          value={section.clauseId || ''}
                          onChange={(e) => updateSection(index, { clauseId: e.target.value })}
                          placeholder="Link to optional clause ID"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Fields Tab */}
          <TabsContent value="fields" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Form Fields</Label>
                <p className="text-xs text-muted-foreground">
                  Define fields that users will fill out. Field IDs match {"{{variable}}"} in content.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addField}>
                <Plus className="h-4 w-4 mr-1" /> Add Field
              </Button>
            </div>

            {fields.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No fields defined. Add fields to create a form.
                </CardContent>
              </Card>
            ) : (
              fields.map((field, index) => (
                <Card key={field.id}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid grid-cols-2 gap-3 flex-1">
                        <div className="space-y-2">
                          <Label>Field ID (variable name)</Label>
                          <Input
                            value={field.id}
                            onChange={(e) => updateField(index, { id: e.target.value.replace(/\s/g, '_') })}
                            placeholder="e.g., artist_name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Label</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(index, { label: e.target.value })}
                            placeholder="e.g., Artist Name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(v) => updateField(index, { type: v as FieldType })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Placeholder</Label>
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(index, { placeholder: e.target.value })}
                            placeholder="Placeholder text"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeField(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => updateField(index, { required: checked })}
                      />
                      <Label className="text-sm">Required field</Label>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Clauses Tab */}
          <TabsContent value="clauses" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Optional Clauses</Label>
                <p className="text-xs text-muted-foreground">
                  Define toggleable sections that users can enable/disable.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addClause}>
                <Plus className="h-4 w-4 mr-1" /> Add Clause
              </Button>
            </div>

            {optionalClauses.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No optional clauses. Add clauses for toggleable content sections.
                </CardContent>
              </Card>
            ) : (
              optionalClauses.map((clause, index) => (
                <Card key={clause.id}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid grid-cols-2 gap-3 flex-1">
                        <div className="space-y-2">
                          <Label>Clause ID</Label>
                          <Input
                            value={clause.id}
                            onChange={(e) => updateClause(index, { id: e.target.value.replace(/\s/g, '_') })}
                            placeholder="e.g., royalty_clause"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={clause.name}
                            onChange={(e) => updateClause(index, { name: e.target.value })}
                            placeholder="e.g., Royalty Terms"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeClause(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={clause.description}
                        onChange={(e) => updateClause(index, { description: e.target.value })}
                        placeholder="Explain what this clause includes..."
                        rows={2}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={clause.defaultEnabled}
                        onCheckedChange={(checked) => updateClause(index, { defaultEnabled: checked })}
                      />
                      <Label className="text-sm">Enabled by default</Label>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !name || !category}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
