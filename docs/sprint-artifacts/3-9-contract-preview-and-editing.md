# Story 3.9: Contract Preview & Editing

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 3.9 |
| **Epic** | Epic 3: Contract Templates |
| **Title** | Contract Preview & Editing |
| **Priority** | P1 - High |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** user
**I want** to preview the completed contract
**So that** I can review before sending

## Context

After filling in the template form, users see a professionally formatted preview of their contract with all variables substituted. They can edit to go back to the form, download as PDF, or proceed to send for signature.

**Dependencies:**
- Story 3.8 (Template Form) must be completed first

## Acceptance Criteria

- [ ] **AC-1:** Full contract preview with all fields filled
- [ ] **AC-2:** Professional formatting matching legal document style
- [ ] **AC-3:** "Edit" button returns to form with data preserved
- [ ] **AC-4:** "Download PDF" generates and downloads PDF
- [ ] **AC-5:** "Send for Signature" creates contract and proceeds to e-signing
- [ ] **AC-6:** Print-friendly layout
- [ ] **AC-7:** All optional sections correctly included/excluded

## Technical Requirements

### API Endpoints

```typescript
// POST /api/templates/:id/render
app.post('/api/templates/:id/render', requireAuth, async (req, res) => {
  const { formData } = req.body;

  const template = await db.query.contractTemplates.findFirst({
    where: eq(contractTemplates.id, req.params.id)
  });

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const { valid, errors } = validateFormData(template, formData);
  if (!valid) {
    return res.status(400).json({ error: 'Validation failed', errors });
  }

  const rendered = renderTemplate(template, formData);

  res.json({
    html: rendered.html,
    text: rendered.text,
    title: rendered.title
  });
});

// POST /api/contracts/from-template
app.post('/api/contracts/from-template', requireAuth, async (req, res) => {
  const { templateId, formData, title } = req.body;

  const template = await db.query.contractTemplates.findFirst({
    where: eq(contractTemplates.id, templateId)
  });

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const { valid, errors } = validateFormData(template, formData);
  if (!valid) {
    return res.status(400).json({ error: 'Validation failed', errors });
  }

  const rendered = renderTemplate(template, formData);

  // Create contract
  const [contract] = await db.insert(contracts)
    .values({
      userId: req.session.userId,
      title: title || rendered.title,
      templateId,
      templateData: formData,
      renderedContent: rendered.html,
      status: 'draft'
    })
    .returning();

  // Clear the draft from localStorage will be done client-side
  console.log(`[CONTRACT] Created from template ${templateId}: ${contract.id}`);

  res.json({ contract });
});
```

### Files to Create/Modify

| File | Changes |
|------|---------|
| `client/src/pages/TemplatePreview.tsx` | New: Preview page |
| `client/src/components/templates/ContractPreview.tsx` | New: Preview renderer |
| `client/src/components/templates/PreviewActions.tsx` | New: Action buttons |
| `server/services/templateRenderer.ts` | Add PDF generation |
| `server/routes/templates.ts` | Add render endpoint |
| `server/routes/contracts.ts` | Add from-template endpoint |

### Implementation Details

#### 1. Template Renderer (Full Implementation)

```typescript
// server/services/templateRenderer.ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface RenderResult {
  html: string;
  text: string;
  title: string;
}

export function renderTemplate(
  template: ContractTemplate,
  formData: TemplateFormData
): RenderResult {
  const { fields, enabledClauses } = formData;

  // Build title
  const title = substituteVariables(template.content.title, fields);

  // Filter and render sections
  const sections = template.content.sections
    .filter(section => {
      if (!section.isOptional) return true;
      return section.clauseId && enabledClauses.includes(section.clauseId);
    })
    .map(section => ({
      heading: substituteVariables(section.heading, fields),
      content: substituteVariables(section.content, fields)
    }));

  const html = generateHTML(title, sections);
  const text = generateText(title, sections);

  return { html, text, title };
}

function generateHTML(
  title: string,
  sections: { heading: string; content: string }[]
): string {
  const sectionsHTML = sections.map(s => `
    <section class="contract-section">
      <h2 class="section-heading">${escapeHtml(s.heading)}</h2>
      <div class="section-content">${formatContent(s.content)}</div>
    </section>
  `).join('\n');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        .contract {
          font-family: 'Times New Roman', Georgia, serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 60px 40px;
          line-height: 1.6;
          color: #1a1a1a;
        }
        .contract-title {
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 40px;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .contract-section {
          margin-bottom: 32px;
        }
        .section-heading {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 16px;
          text-transform: uppercase;
        }
        .section-content {
          font-size: 12px;
          text-align: justify;
        }
        .section-content p {
          margin-bottom: 12px;
        }
        .signature-line {
          margin-top: 40px;
          border-top: 1px solid #000;
          padding-top: 8px;
          width: 300px;
        }
        @media print {
          .contract { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="contract">
        <h1 class="contract-title">${escapeHtml(title)}</h1>
        ${sectionsHTML}
      </div>
    </body>
    </html>
  `;
}

function formatContent(content: string): string {
  // Escape HTML first
  let formatted = escapeHtml(content);

  // Convert double newlines to paragraphs
  formatted = formatted.split('\n\n').map(p => `<p>${p}</p>`).join('');

  // Convert single newlines to line breaks within paragraphs
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// PDF Generation
export async function generatePDF(html: string, title: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // Simple text-based PDF (for MVP - could use puppeteer for full HTML)
  let page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();

  // This is a simplified version - full implementation would parse HTML
  // For MVP, we'll generate a basic PDF from the text version

  const fontSize = 11;
  const margin = 50;
  let yPosition = height - margin;

  // Title
  page.drawText(title, {
    x: margin,
    y: yPosition,
    size: 16,
    font: boldFont,
  });

  yPosition -= 40;

  // Note: Full implementation would properly parse and render sections

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
```

#### 2. Contract Preview Component

```tsx
// client/src/components/templates/ContractPreview.tsx
import { useRef } from 'react';

interface Props {
  html: string;
  title: string;
}

export function ContractPreview({ html, title }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Inject HTML into iframe for isolation
  const srcDoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; background: white; }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Paper effect container */}
      <div className="bg-gray-100 p-8">
        <div className="bg-white shadow-md mx-auto max-w-[850px] min-h-[1100px]">
          <iframe
            ref={iframeRef}
            srcDoc={srcDoc}
            title={title}
            className="w-full h-[1100px] border-0"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
```

#### 3. Preview Page

```tsx
// client/src/pages/TemplatePreview.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ContractPreview } from '../components/templates/ContractPreview';
import { ArrowLeft, Edit, Download, Send, Loader2 } from 'lucide-react';
import { TemplateFormData } from '../types';

export default function TemplatePreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [html, setHtml] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // Load form data from localStorage
    const storageKey = `template-draft-${id}`;
    const saved = localStorage.getItem(storageKey);

    if (!saved) {
      navigate(`/templates/${id}/fill`);
      return;
    }

    const formData: TemplateFormData = JSON.parse(saved);

    // Render template
    fetch(`/api/templates/${id}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData })
    })
      .then(res => res.json())
      .then(data => {
        setHtml(data.html);
        setTitle(data.title);
        setLoading(false);
      })
      .catch(err => {
        console.error('Render failed:', err);
        navigate(`/templates/${id}/fill`);
      });
  }, [id, navigate]);

  const handleEdit = () => {
    navigate(`/templates/${id}/fill`);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const storageKey = `template-draft-${id}`;
      const formData = JSON.parse(localStorage.getItem(storageKey)!);

      const response = await fetch(`/api/templates/${id}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData })
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'contract'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const handleSendForSignature = async () => {
    setCreating(true);
    try {
      const storageKey = `template-draft-${id}`;
      const formData = JSON.parse(localStorage.getItem(storageKey)!);

      const response = await fetch('/api/contracts/from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: id,
          formData,
          title
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Clear draft
        localStorage.removeItem(storageKey);
        // Navigate to contract signing flow
        navigate(`/contracts/${data.contract.id}/sign`);
      } else {
        alert(data.error || 'Failed to create contract');
      }
    } catch (err) {
      alert('Failed to create contract');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-burgundy" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleEdit}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{title}</h1>
                <p className="text-sm text-gray-500">Review your contract</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>

              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download PDF
              </button>

              <button
                onClick={handleSendForSignature}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2 bg-burgundy text-white rounded-md hover:bg-burgundy-dark disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send for Signature
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <ContractPreview html={html} title={title} />
      </div>
    </div>
  );
}
```

## Definition of Done

- [ ] Render endpoint returns HTML
- [ ] Preview displays formatted contract
- [ ] Edit navigates back with data preserved
- [ ] PDF download working
- [ ] Create contract from template
- [ ] Navigate to signing flow
- [ ] Optional sections correctly filtered
- [ ] Print layout looks professional

## Testing Checklist

### Unit Tests

- [ ] Template rendering substitutes all variables
- [ ] Optional sections filtered correctly
- [ ] HTML escaping works

### Integration Tests

- [ ] Render endpoint returns valid HTML
- [ ] PDF endpoint returns valid PDF
- [ ] Contract creation from template

### E2E Tests

- [ ] Fill form → Preview → See rendered contract
- [ ] Edit → Return to form with data
- [ ] Download PDF → Valid file
- [ ] Send for Signature → Contract created

## Related Documents

- [Epic 3 Tech Spec](./tech-spec-epic-3.md)
- [Story 3.8: Template Form](./3-8-template-fill-in-form.md)
- [Epic 4: E-Signing](../epics/epic-4-e-signing.md)
