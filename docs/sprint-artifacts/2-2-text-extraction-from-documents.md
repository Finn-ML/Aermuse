# Story 2.2: Text Extraction from Documents

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 2.2 |
| **Epic** | Epic 2: AI Attorney - Real AI |
| **Title** | Text Extraction from Documents |
| **Priority** | P0 - Critical |
| **Story Points** | 3 |
| **Status** | Review |

## User Story

**As the** system
**I want** to extract text from uploaded documents
**So that** the AI can analyze the contract content

## Context

Text extraction is the bridge between file upload and AI analysis. The system must reliably extract text from PDF and DOCX files to send to the AI for analysis. This story focuses on building a robust extraction service that handles various document formats and edge cases.

**Dependencies:**
- Story 2.1 (File Upload) must be completed first

## Acceptance Criteria

- [x] **AC-1:** PDF text extraction working for text-based PDFs
- [x] **AC-2:** DOCX text extraction working
- [x] **AC-3:** DOC text extraction working (best effort)
- [x] **AC-4:** Extracted text stored in contract record
- [x] **AC-5:** Warning shown for scanned PDFs with no extractable text
- [x] **AC-6:** Multi-page documents fully extracted
- [x] **AC-7:** Error handling for corrupted files
- [x] **AC-8:** Extraction triggered automatically after upload

## Technical Requirements

### Dependencies to Install

```bash
npm install pdf-parse mammoth
npm install -D @types/pdf-parse
```

### Database Schema Changes

```typescript
// shared/schema.ts - Already in contracts table
extractedText: text("extracted_text"),
```

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/services/extraction.ts` | New: Text extraction service |
| `server/routes/contracts.ts` | Trigger extraction after upload |

### Implementation Details

#### 1. Extraction Service

```typescript
// server/services/extraction.ts
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

interface ExtractionResult {
  success: boolean;
  text: string | null;
  charCount: number;
  pageCount?: number;
  warning?: string;
  error?: string;
}

const MIN_TEXT_LENGTH = 100; // Minimum chars to consider extraction successful

/**
 * Extract text from a PDF file
 */
export async function extractFromPDF(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const data = await pdfParse(buffer, {
      // Limit pages for very large documents
      max: 100
    });

    const text = data.text.trim();

    if (!text || text.length < MIN_TEXT_LENGTH) {
      return {
        success: false,
        text: null,
        charCount: 0,
        pageCount: data.numpages,
        warning: 'This appears to be a scanned document. Text extraction is not available for image-based PDFs. Please upload a text-based PDF or type the contract content manually.'
      };
    }

    return {
      success: true,
      text: cleanText(text),
      charCount: text.length,
      pageCount: data.numpages
    };
  } catch (error) {
    console.error('[EXTRACT] PDF extraction failed:', error);
    return {
      success: false,
      text: null,
      charCount: 0,
      error: 'Failed to read PDF file. The file may be corrupted or password-protected.'
    };
  }
}

/**
 * Extract text from a DOCX file
 */
export async function extractFromDOCX(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value.trim();

    if (!text || text.length < MIN_TEXT_LENGTH) {
      return {
        success: false,
        text: null,
        charCount: 0,
        warning: 'No text could be extracted from this document. It may be empty or contain only images.'
      };
    }

    // Log any conversion warnings
    if (result.messages.length > 0) {
      console.log('[EXTRACT] DOCX warnings:', result.messages);
    }

    return {
      success: true,
      text: cleanText(text),
      charCount: text.length
    };
  } catch (error) {
    console.error('[EXTRACT] DOCX extraction failed:', error);
    return {
      success: false,
      text: null,
      charCount: 0,
      error: 'Failed to read DOCX file. The file may be corrupted.'
    };
  }
}

/**
 * Extract text from a DOC file (legacy format)
 * Note: Limited support - mammoth handles some DOC files
 */
export async function extractFromDOC(buffer: Buffer): Promise<ExtractionResult> {
  try {
    // Try mammoth first (works for some DOC files)
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value.trim();

    if (!text || text.length < MIN_TEXT_LENGTH) {
      return {
        success: false,
        text: null,
        charCount: 0,
        warning: 'Legacy DOC format has limited support. Please save the document as DOCX or PDF for best results.'
      };
    }

    return {
      success: true,
      text: cleanText(text),
      charCount: text.length
    };
  } catch (error) {
    console.error('[EXTRACT] DOC extraction failed:', error);
    return {
      success: false,
      text: null,
      charCount: 0,
      warning: 'Legacy DOC format has limited support. Please save the document as DOCX or PDF for best results.'
    };
  }
}

/**
 * Main extraction function - routes to appropriate extractor
 */
export async function extractText(
  buffer: Buffer,
  fileType: string
): Promise<ExtractionResult> {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return extractFromPDF(buffer);
    case 'docx':
      return extractFromDOCX(buffer);
    case 'doc':
      return extractFromDOC(buffer);
    default:
      return {
        success: false,
        text: null,
        charCount: 0,
        error: `Unsupported file type: ${fileType}`
      };
  }
}

/**
 * Clean extracted text
 * - Normalize whitespace
 * - Remove excessive line breaks
 * - Trim leading/trailing whitespace
 */
function cleanText(text: string): string {
  return text
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Reduce multiple blank lines to single
    .replace(/\n{3,}/g, '\n\n')
    // Reduce multiple spaces to single
    .replace(/[ \t]+/g, ' ')
    // Trim lines
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Final trim
    .trim();
}

/**
 * Truncate text if too long for AI processing
 * GPT-4 has ~128k token limit, but we want to keep costs reasonable
 */
export function truncateForAI(text: string, maxChars: number = 50000): {
  text: string;
  truncated: boolean;
  originalLength: number;
} {
  const originalLength = text.length;

  if (text.length <= maxChars) {
    return { text, truncated: false, originalLength };
  }

  // Truncate at a paragraph break if possible
  const truncated = text.slice(0, maxChars);
  const lastParagraph = truncated.lastIndexOf('\n\n');

  const finalText = lastParagraph > maxChars * 0.8
    ? truncated.slice(0, lastParagraph)
    : truncated;

  return {
    text: finalText + '\n\n[Document truncated for analysis. First ~50,000 characters analyzed.]',
    truncated: true,
    originalLength
  };
}
```

#### 2. Integration with Upload Endpoint

```typescript
// server/routes/contracts.ts - Update upload endpoint
import { extractText, truncateForAI } from '../services/extraction';
import { downloadContractFile } from '../services/storage';

// POST /api/contracts/upload (updated)
app.post('/api/contracts/upload',
  requireAuth,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Verify file type using magic bytes
      const verification = await verifyFileType(req.file.buffer);
      if (!verification.valid) {
        return res.status(400).json({ error: verification.error });
      }

      // Create contract record
      const [contract] = await db.insert(contracts)
        .values({
          userId: req.session.userId,
          title: req.body.title || req.file.originalname.replace(/\.[^/.]+$/, ''),
          status: 'processing'
        })
        .returning();

      // Upload to Object Storage
      const uploaded = await uploadContractFile(
        req.session.userId!,
        contract.id,
        req.file.buffer,
        verification.type!
      );

      // Extract text
      const extraction = await extractText(req.file.buffer, verification.type!);

      console.log(`[EXTRACT] Contract ${contract.id}: ${extraction.charCount} chars extracted`);

      // Update contract with file info and extracted text
      const [updated] = await db.update(contracts)
        .set({
          filePath: uploaded.path,
          fileName: req.file.originalname,
          fileSize: uploaded.size,
          fileType: verification.type,
          extractedText: extraction.text,
          status: extraction.success ? 'uploaded' : 'extraction_failed'
        })
        .where(eq(contracts.id, contract.id))
        .returning();

      console.log(`[UPLOAD] Complete: ${contract.id} (${verification.type}, ${uploaded.size} bytes)`);

      // Return contract with extraction status
      res.json({
        contract: updated,
        extraction: {
          success: extraction.success,
          charCount: extraction.charCount,
          pageCount: extraction.pageCount,
          warning: extraction.warning,
          error: extraction.error
        }
      });
    } catch (error) {
      console.error('[UPLOAD] Failed:', error);
      res.status(500).json({ error: 'File upload failed' });
    }
  }
);

// POST /api/contracts/:id/extract - Manual re-extraction
app.post('/api/contracts/:id/extract', requireAuth, async (req, res) => {
  const contract = await db.query.contracts.findFirst({
    where: and(
      eq(contracts.id, req.params.id),
      eq(contracts.userId, req.session.userId)
    )
  });

  if (!contract || !contract.filePath) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  try {
    // Download file from storage
    const buffer = await downloadContractFile(contract.filePath);

    // Extract text
    const extraction = await extractText(buffer, contract.fileType!);

    // Update contract
    await db.update(contracts)
      .set({
        extractedText: extraction.text,
        status: extraction.success ? 'uploaded' : 'extraction_failed'
      })
      .where(eq(contracts.id, contract.id));

    res.json({
      success: extraction.success,
      charCount: extraction.charCount,
      warning: extraction.warning,
      error: extraction.error
    });
  } catch (error) {
    console.error('[EXTRACT] Re-extraction failed:', error);
    res.status(500).json({ error: 'Text extraction failed' });
  }
});
```

#### 3. Frontend Extraction Status Display

```tsx
// client/src/components/contracts/ExtractionStatus.tsx
import { AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';

interface Props {
  extraction: {
    success: boolean;
    charCount: number;
    pageCount?: number;
    warning?: string;
    error?: string;
  };
  onRetry?: () => void;
}

export function ExtractionStatus({ extraction, onRetry }: Props) {
  if (extraction.success) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="font-medium text-green-800">
            Text extracted successfully
          </span>
        </div>
        <p className="text-sm text-green-700 mt-1">
          {extraction.charCount.toLocaleString()} characters
          {extraction.pageCount && ` from ${extraction.pageCount} pages`}
        </p>
      </div>
    );
  }

  if (extraction.warning) {
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span className="font-medium text-amber-800">
            Limited extraction
          </span>
        </div>
        <p className="text-sm text-amber-700 mt-1">{extraction.warning}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-sm text-amber-800 hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
      <div className="flex items-center gap-2">
        <XCircle className="h-5 w-5 text-red-600" />
        <span className="font-medium text-red-800">
          Extraction failed
        </span>
      </div>
      <p className="text-sm text-red-700 mt-1">
        {extraction.error || 'Unable to extract text from this document'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm text-red-800 hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
```

## Definition of Done

- [x] pdf-parse and mammoth packages installed
- [x] Extraction service handles PDF files
- [x] Extraction service handles DOCX files
- [x] Extraction service handles DOC files (best effort)
- [x] Extracted text saved to contract record
- [x] Extraction runs automatically after upload
- [x] Scanned PDF warning displayed
- [x] Corrupted file error handling
- [x] Text cleaning (whitespace normalization)
- [x] Truncation for very long documents

## Testing Checklist

### Unit Tests

- [x] PDF extraction with text content
- [x] PDF extraction with scanned/image content (warning)
- [x] DOCX extraction
- [x] DOC extraction
- [x] Empty document handling
- [x] Text cleaning function
- [x] Truncation function

### Integration Tests

- [ ] Upload triggers extraction
- [ ] Extracted text saved to database
- [ ] Re-extraction endpoint works
- [ ] Multi-page PDF extraction
- [ ] Large document handling (50k+ chars)

### E2E Tests

- [ ] Upload text-based PDF → extraction success
- [ ] Upload DOCX → extraction success
- [ ] Upload scanned PDF → warning displayed
- [ ] Extraction status shown in UI

## Test Documents

Create test fixtures:
- `test-text.pdf` - Simple text-based PDF
- `test-multi-page.pdf` - 10-page PDF
- `test-scanned.pdf` - Image-based PDF (for warning test)
- `test-contract.docx` - Standard Word document
- `test-empty.pdf` - PDF with minimal/no text
- `test-large.pdf` - 100+ page document

## Related Documents

- [Epic 2 Tech Spec](./tech-spec-epic-2.md)
- [Story 2.1: Contract File Upload](./2-1-contract-file-upload.md)
- [Architecture: PDF Text Extraction](../architecture.md#adr-002-pdf-text-extraction)

---

## Tasks/Subtasks

- [x] **Task 1: Install dependencies**
  - [x] Run `npm install pdf-parse mammoth`
  - [x] Run `npm install -D @types/pdf-parse`
  - [x] Verify packages installed

- [x] **Task 2: Update database schema**
  - [x] Add extractedText field to contracts table
  - [x] Update Drizzle schema
  - [x] Run migration

- [x] **Task 3: Create extraction service**
  - [x] Create `server/services/extraction.ts`
  - [x] Implement extractFromPDF function
  - [x] Implement extractFromDOCX function
  - [x] Implement extractFromDOC function (best effort)
  - [x] Create extractText router function
  - [x] Implement cleanText helper
  - [x] Implement truncateForAI function

- [x] **Task 4: Integrate extraction with upload**
  - [x] Update upload endpoint to trigger extraction
  - [x] Store extracted text in contract record
  - [x] Set appropriate status (uploaded/extraction_failed)
  - [x] Return extraction status in response

- [x] **Task 5: Create re-extraction endpoint**
  - [x] Add POST /api/contracts/:id/extract route
  - [x] Download file from storage
  - [x] Run extraction
  - [x] Update contract record

- [x] **Task 6: Create ExtractionStatus component**
  - [x] Create `client/src/components/contracts/ExtractionStatus.tsx`
  - [x] Show success state with char count
  - [x] Show warning state for limited extraction
  - [x] Show error state with retry option

- [x] **Task 7: Create test documents**
  - [x] Test fixtures created programmatically via mocks
  - [x] Test coverage for all document types

- [x] **Task 8: Write tests**
  - [x] Unit tests for PDF extraction
  - [x] Unit tests for DOCX extraction
  - [x] Unit tests for text cleaning
  - [x] Unit tests for truncation
  - [x] 18 unit tests passing

---

## Dev Agent Record

### Debug Log

- Installed pdf-parse and mammoth dependencies successfully
- Added extractedText field to shared/schema.ts
- Created extraction service with PDF, DOCX, DOC support
- Integrated extraction into upload endpoint - triggers automatically after file upload
- Added re-extraction endpoint POST /api/contracts/:id/extract
- Created ExtractionStatus React component for UI feedback
- Fixed TypeScript import issue with pdf-parse (required @ts-ignore for default export)
- All 18 unit tests passing, 45 total tests in suite passing

### Completion Notes

Implementation complete for Story 2.2 Text Extraction. Key decisions:
- Used pdf-parse for PDF extraction with 100-page limit for large documents
- Used mammoth for DOCX/DOC extraction (DOC support is best-effort)
- Minimum 100 characters required to consider extraction successful (filters scanned PDFs)
- cleanText() normalizes whitespace and line breaks
- truncateForAI() limits text to 50k characters for AI processing
- Extraction status returned in upload response for immediate UI feedback
- Re-extraction endpoint allows retry without re-uploading file

---

## File List

| Action | File Path |
|--------|-----------|
| Created | server/services/extraction.ts |
| Created | client/src/components/contracts/ExtractionStatus.tsx |
| Created | server/services/__tests__/extraction.test.ts |
| Modified | shared/schema.ts (added extractedText field) |
| Modified | server/routes.ts (extraction integration + re-extract endpoint) |
| Modified | package.json (pdf-parse, mammoth, @types/pdf-parse) |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-29 | Implemented text extraction service with PDF/DOCX/DOC support | Amelia (Dev Agent) |
| 2025-11-29 | Added extractedText field to contracts schema | Amelia (Dev Agent) |
| 2025-11-29 | Integrated extraction with upload endpoint | Amelia (Dev Agent) |
| 2025-11-29 | Added re-extraction endpoint and ExtractionStatus component | Amelia (Dev Agent) |
| 2025-11-29 | Added 18 unit tests for extraction service | Amelia (Dev Agent) |
