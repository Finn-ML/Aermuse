# Story 6.5: Template Catalogue Management

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 6.5 |
| **Epic** | Epic 6: Admin Dashboard |
| **Title** | Template Catalogue Management |
| **Priority** | P1 - High |
| **Story Points** | 8 |
| **Status** | Drafted |

## User Story

**As an** admin
**I want** to manage contract templates
**So that** the template library stays current

## Context

Admins need full CRUD capabilities for contract templates. This includes creating new templates, editing existing ones, managing fields, and controlling which templates are active. This is the largest story in Epic 6 due to the template editor complexity.

**Dependencies:**
- Story 6.1 (Admin Layout)
- Epic 3 (Template data structure)

## Acceptance Criteria

- [ ] **AC-1:** Template list view with status
- [ ] **AC-2:** Create new template
- [ ] **AC-3:** Edit existing template
- [ ] **AC-4:** Template editor with name, description, category
- [ ] **AC-5:** Rich text content editor
- [ ] **AC-6:** Field definitions management
- [ ] **AC-7:** Optional clause management
- [ ] **AC-8:** Preview template as user would see it
- [ ] **AC-9:** Activate/deactivate templates
- [ ] **AC-10:** Reorder templates (drag and drop)
- [ ] **AC-11:** Clone template for variations

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/routes/admin/templates.ts` | New: Template CRUD API |
| `client/src/pages/admin/TemplateManagement.tsx` | New: Template list |
| `client/src/pages/admin/TemplateEditor.tsx` | New: Template editor |
| `client/src/components/admin/TemplateList.tsx` | New: Sortable list |
| `client/src/components/admin/FieldEditor.tsx` | New: Field config |
| `client/src/components/admin/TemplatePreview.tsx` | New: Preview modal |

### Implementation

#### Template Admin API

```typescript
// server/routes/admin/templates.ts
import { Router } from 'express';
import { db } from '../../db';
import { templates } from '../../db/schema/templates';
import { eq, asc, desc, max } from 'drizzle-orm';
import { logAdminActivity } from '../../services/adminActivity';

const router = Router();

// GET /api/admin/templates
router.get('/', async (req, res) => {
  try {
    const templateList = await db.query.templates.findMany({
      orderBy: [asc(templates.sortOrder), desc(templates.createdAt)],
    });

    res.json({ templates: templateList });
  } catch (error) {
    console.error('[ADMIN] List templates error:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// GET /api/admin/templates/:id
router.get('/:id', async (req, res) => {
  try {
    const template = await db.query.templates.findFirst({
      where: eq(templates.id, req.params.id),
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template });
  } catch (error) {
    console.error('[ADMIN] Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// POST /api/admin/templates
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      content,
      fields,
      optionalClauses,
    } = req.body;

    // Get max sort order
    const [maxOrder] = await db
      .select({ max: max(templates.sortOrder) })
      .from(templates);

    const newTemplate = await db
      .insert(templates)
      .values({
        name,
        description,
        category,
        content,
        fields: fields || [],
        optionalClauses: optionalClauses || [],
        sortOrder: (maxOrder.max || 0) + 1,
        isActive: false, // Start inactive
        createdBy: req.session.userId,
      })
      .returning();

    await logAdminActivity({
      req,
      action: 'template.create',
      entityType: 'template',
      entityId: newTemplate[0].id,
      details: { name },
    });

    res.status(201).json({ template: newTemplate[0] });
  } catch (error) {
    console.error('[ADMIN] Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT /api/admin/templates/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      content,
      fields,
      optionalClauses,
    } = req.body;

    const updated = await db
      .update(templates)
      .set({
        name,
        description,
        category,
        content,
        fields,
        optionalClauses,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await logAdminActivity({
      req,
      action: 'template.update',
      entityType: 'template',
      entityId: id,
      details: { name },
    });

    res.json({ template: updated[0] });
  } catch (error) {
    console.error('[ADMIN] Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// POST /api/admin/templates/:id/toggle
router.post('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const template = await db.query.templates.findFirst({
      where: eq(templates.id, id),
      columns: { isActive: true, name: true },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const newStatus = !template.isActive;

    await db
      .update(templates)
      .set({
        isActive: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, id));

    await logAdminActivity({
      req,
      action: 'template.toggle',
      entityType: 'template',
      entityId: id,
      details: { name: template.name, isActive: newStatus },
    });

    res.json({ success: true, isActive: newStatus });
  } catch (error) {
    console.error('[ADMIN] Toggle template error:', error);
    res.status(500).json({ error: 'Failed to toggle template' });
  }
});

// POST /api/admin/templates/:id/clone
router.post('/:id/clone', async (req, res) => {
  try {
    const template = await db.query.templates.findFirst({
      where: eq(templates.id, req.params.id),
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const [maxOrder] = await db
      .select({ max: max(templates.sortOrder) })
      .from(templates);

    const cloned = await db
      .insert(templates)
      .values({
        name: `${template.name} (Copy)`,
        description: template.description,
        category: template.category,
        content: template.content,
        fields: template.fields,
        optionalClauses: template.optionalClauses,
        sortOrder: (maxOrder.max || 0) + 1,
        isActive: false,
        createdBy: req.session.userId,
      })
      .returning();

    await logAdminActivity({
      req,
      action: 'template.create',
      entityType: 'template',
      entityId: cloned[0].id,
      details: { name: cloned[0].name, clonedFrom: template.id },
    });

    res.status(201).json({ template: cloned[0] });
  } catch (error) {
    console.error('[ADMIN] Clone template error:', error);
    res.status(500).json({ error: 'Failed to clone template' });
  }
});

// POST /api/admin/templates/reorder
router.post('/reorder', async (req, res) => {
  try {
    const { order } = req.body; // Array of { id, sortOrder }

    await Promise.all(
      order.map(({ id, sortOrder }: { id: string; sortOrder: number }) =>
        db
          .update(templates)
          .set({ sortOrder, updatedAt: new Date() })
          .where(eq(templates.id, id))
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[ADMIN] Reorder templates error:', error);
    res.status(500).json({ error: 'Failed to reorder templates' });
  }
});

// DELETE /api/admin/templates/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const template = await db.query.templates.findFirst({
      where: eq(templates.id, id),
      columns: { name: true },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await db.delete(templates).where(eq(templates.id, id));

    await logAdminActivity({
      req,
      action: 'template.delete',
      entityType: 'template',
      entityId: id,
      details: { name: template.name },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[ADMIN] Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
```

#### Template Management Page

```tsx
// client/src/pages/admin/TemplateManagement.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, GripVertical, Eye, Edit, Copy, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
}

function SortableTemplate({
  template,
  onToggle,
  onClone,
  onDelete,
}: {
  template: Template;
  onToggle: () => void;
  onClone: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: template.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 bg-white border rounded-lg hover:shadow-sm"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900">{template.name}</h3>
          {!template.isActive && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
              Inactive
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">{template.description}</p>
        <p className="text-xs text-gray-400 mt-1">{template.category}</p>
      </div>

      <div className="flex items-center gap-2">
        <Link
          to={`/admin/templates/${template.id}/preview`}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          title="Preview"
        >
          <Eye className="h-4 w-4" />
        </Link>
        <Link
          to={`/admin/templates/${template.id}/edit`}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          title="Edit"
        >
          <Edit className="h-4 w-4" />
        </Link>
        <button
          onClick={onClone}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          title="Clone"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          onClick={onToggle}
          className={`p-2 rounded ${
            template.isActive
              ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
          title={template.isActive ? 'Deactivate' : 'Activate'}
        >
          {template.isActive ? (
            <ToggleRight className="h-5 w-5" />
          ) : (
            <ToggleLeft className="h-5 w-5" />
          )}
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function TemplateManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/templates', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = templates.findIndex((t) => t.id === active.id);
    const newIndex = templates.findIndex((t) => t.id === over.id);

    const newOrder = [...templates];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);

    // Update sort order
    const order = newOrder.map((t, i) => ({ id: t.id, sortOrder: i }));

    setTemplates(newOrder);

    await fetch('/api/admin/templates/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ order }),
    });
  };

  const handleToggle = async (id: string) => {
    const response = await fetch(`/api/admin/templates/${id}/toggle`, {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isActive: data.isActive } : t))
      );
    }
  };

  const handleClone = async (id: string) => {
    const response = await fetch(`/api/admin/templates/${id}/clone`, {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      fetchTemplates();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    const response = await fetch(`/api/admin/templates/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (response.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-gray-500">
            {templates.filter((t) => t.isActive).length} active templates
          </p>
        </div>
        <Link
          to="/admin/templates/new"
          className="flex items-center gap-2 px-4 py-2 bg-burgundy text-white rounded-lg hover:bg-burgundy-dark"
        >
          <Plus className="h-4 w-4" />
          New Template
        </Link>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500 mb-4">No templates yet</p>
          <Link
            to="/admin/templates/new"
            className="text-burgundy hover:underline"
          >
            Create your first template
          </Link>
        </div>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={templates.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {templates.map((template) => (
                <SortableTemplate
                  key={template.id}
                  template={template}
                  onToggle={() => handleToggle(template.id)}
                  onClone={() => handleClone(template.id)}
                  onDelete={() => handleDelete(template.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
```

#### Template Editor Page

```tsx
// client/src/pages/admin/TemplateEditor.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Eye, ArrowLeft } from 'lucide-react';
import { FieldEditor } from '../../components/admin/FieldEditor';
import { TemplatePreview } from '../../components/admin/TemplatePreview';

interface Field {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface Template {
  id?: string;
  name: string;
  description: string;
  category: string;
  content: string;
  fields: Field[];
  optionalClauses: { id: string; title: string; content: string }[];
}

export function TemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [template, setTemplate] = useState<Template>({
    name: '',
    description: '',
    category: '',
    content: '',
    fields: [],
    optionalClauses: [],
  });
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    const response = await fetch(`/api/admin/templates/${id}`, {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      setTemplate(data.template);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const url = isNew ? '/api/admin/templates' : `/api/admin/templates/${id}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(template),
      });

      if (response.ok) {
        navigate('/admin/templates');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/admin/templates')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-burgundy text-white rounded-lg hover:bg-burgundy-dark disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Basic Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold mb-4">Template Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={template.name}
                  onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Artist Recording Agreement"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={template.description}
                  onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="Brief description of this template"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={template.category}
                  onChange={(e) => setTemplate({ ...template, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select category</option>
                  <option value="Recording">Recording</option>
                  <option value="Licensing">Licensing</option>
                  <option value="Performance">Performance</option>
                  <option value="Publishing">Publishing</option>
                  <option value="Management">Management</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold mb-4">Template Fields</h2>
            <FieldEditor
              fields={template.fields}
              onChange={(fields) => setTemplate({ ...template, fields })}
            />
          </div>
        </div>

        {/* Right: Content */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-semibold mb-4">Template Content</h2>
          <p className="text-sm text-gray-500 mb-4">
            Use {'{{fieldKey}}'} to insert field values. Example: {'{{artistName}}'}
          </p>
          <textarea
            value={template.content}
            onChange={(e) => setTemplate({ ...template, content: e.target.value })}
            className="w-full h-[500px] px-3 py-2 border rounded-lg font-mono text-sm"
            placeholder="Enter your template content here..."
          />
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <TemplatePreview
          template={template}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
```

## Definition of Done

- [ ] Template list with drag-and-drop reorder
- [ ] Create new template works
- [ ] Edit existing template works
- [ ] Field editor adds/removes fields
- [ ] Content editor with placeholder syntax
- [ ] Preview shows rendered template
- [ ] Toggle active/inactive works
- [ ] Clone creates duplicate
- [ ] Delete with confirmation
- [ ] All changes logged

## Testing Checklist

### Integration Tests

- [ ] CRUD operations
- [ ] Reorder saves correctly
- [ ] Clone creates proper copy
- [ ] Toggle persists state

### E2E Tests

- [ ] Create template end-to-end
- [ ] Edit and save template
- [ ] Drag to reorder
- [ ] Preview template

## Related Documents

- [Epic 6 Tech Spec](./tech-spec-epic-6.md)
- [Epic 3: Contract Templates](./tech-spec-epic-3.md)
