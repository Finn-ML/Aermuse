# Epic 13: PDF Contract Conversion & Proposal Contract Upload

## Epic Overview

| Field | Value |
|-------|-------|
| **Epic ID** | EPIC-013 |
| **Title** | PDF Contract Conversion & Proposal Contract Upload |
| **Priority** | P1 - High |
| **Estimated Effort** | 5-7 days |
| **Dependencies** | Epic 4 (E-Signing), Epic 7 (Proposals), Epic 2 (AI Attorney) |

## Description

Enable external parties to upload their own PDF contracts when sending proposals to artists through the landing page. The uploaded PDF is converted into an Aermuse-compatible, editable contract that can be reviewed, modified, and sent for e-signing through the existing DocuSeal integration.

This feature bridges the gap between external contract workflows and Aermuse's contract management system, allowing artists to receive, review, and execute contracts from labels, brands, and collaborators without leaving the platform.

## Business Value

- **Streamlined Workflow**: Artists receive contracts directly in their proposal inbox, eliminating email attachment management
- **Contract Intelligence**: Uploaded contracts benefit from Aermuse's AI analysis (risk assessment, key terms extraction)
- **E-Signing Integration**: Seamless path from uploaded PDF to signed contract via DocuSeal
- **Professional Experience**: External parties get a polished contract submission flow
- **Conversion Opportunity**: External users experience Aermuse value, potential conversion to paid users
- **Competitive Advantage**: Unique feature combining proposal management with contract processing

## User Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL PARTY FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Visit artist's landing page (e.g., aermuse.co/artist-name)              │
│  2. Click "Send Proposal" button                                             │
│  3. Fill proposal form (name, email, company, type, message)                 │
│  4. NEW: Toggle "Include Contract" → Upload PDF contract                     │
│  5. Submit proposal with attached contract                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ARTIST FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Receive notification: "New proposal with contract attached"              │
│  2. View proposal in dashboard                                               │
│  3. Preview attached contract (read-only PDF viewer)                         │
│  4. Click "Review & Edit Contract" to convert to Aermuse format              │
│  5. System extracts text, identifies key terms, creates editable version     │
│  6. Artist reviews AI analysis (risk score, red flags, recommendations)      │
│  7. Artist can edit contract content in rich text editor                     │
│  8. Click "Send for Signing" → Add signatories (self + proposal sender)      │
│  9. DocuSeal handles e-signing workflow                                      │
│  10. Signed PDF stored in artist's contract library                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technical Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Landing Page   │────▶│   Aermuse API   │────▶│ Object Storage  │
│  Proposal Form  │     │                 │     │  (PDF Storage)  │
│  + PDF Upload   │     │ POST /proposals │     │                 │
└─────────────────┘     │   + file        │     └─────────────────┘
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Text Extraction│
                        │  (pdf-parse +   │
                        │   tesseract.js) │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  AI Analysis    │────▶│    OpenAI API   │
                        │  (Risk, Terms)  │     │                 │
                        └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │ Contract Editor │────▶│   DocuSeal API  │
                        │ (Review/Edit)   │     │   (E-Signing)   │
                        └─────────────────┘     └─────────────────┘
```

## Acceptance Criteria

- [ ] External parties can upload PDF contracts (up to 10MB) with proposals
- [ ] Uploaded PDFs stored securely and linked to proposal record
- [ ] Artists can preview attached PDFs without conversion
- [ ] PDFs can be converted to editable Aermuse contracts
- [ ] Text extraction works for both text-based and scanned PDFs (OCR)
- [ ] AI analysis provides risk assessment and key terms extraction
- [ ] Converted contracts can be edited in rich text editor
- [ ] Edited contracts can be sent for e-signing via DocuSeal
- [ ] Email notifications include contract attachment indicator
- [ ] Mobile-responsive upload and preview experience

---

## User Stories

### Story 13.1: Database Schema Updates

**As a** developer
**I want** to extend the proposals table to support file attachments
**So that** uploaded contracts are properly stored and linked

**Acceptance Criteria:**
- [ ] Add contract file fields to proposals table
- [ ] Create migration for new columns
- [ ] Update Drizzle schema with proper types
- [ ] Add validation for file fields

**Technical Notes:**
```typescript
// Add to proposals table in shared/schema.ts
// New fields for contract attachment
contractFileName: text("contract_file_name"),
contractFilePath: text("contract_file_path"),  // Path in Object Storage
contractFileSize: integer("contract_file_size"), // Size in bytes
contractFileType: text("contract_file_type"),   // 'pdf' | 'doc' | 'docx'
contractExtractedText: text("contract_extracted_text"),
contractAiAnalysis: jsonb("contract_ai_analysis"),
contractAiRiskScore: text("contract_ai_risk_score"), // 'low' | 'medium' | 'high'
contractAnalyzedAt: timestamp("contract_analyzed_at", { withTimezone: true }),
hasContract: boolean("has_contract").default(false),
```

**Story Points:** 2

---

### Story 13.2: File Upload API Endpoint

**As an** external party
**I want** to upload a PDF when submitting a proposal
**So that** the artist receives my contract along with the proposal

**Acceptance Criteria:**
- [ ] Extend `POST /api/proposals` to accept multipart/form-data
- [ ] Support PDF, DOC, DOCX file types
- [ ] File size limit: 10MB
- [ ] Store file in Object Storage under `proposals/{proposalId}/`
- [ ] Return proposal with file metadata
- [ ] Handle upload errors gracefully
- [ ] Rate limiting still applies (5 proposals/hour)

**Technical Notes:**
```typescript
// server/routes.ts - Extend existing proposal endpoint
import multer from 'multer';

const proposalUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf',
                     'application/msword',
                     'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    cb(null, allowed.includes(file.mimetype));
  }
});

app.post('/api/proposals',
  proposalRateLimiter,
  proposalUpload.single('contractFile'),
  async (req, res) => {
    // Parse form data (proposal fields come as strings in multipart)
    const proposalData = JSON.parse(req.body.proposalData);

    // Handle file if present
    if (req.file) {
      const filePath = await uploadProposalContract(
        proposalId,
        req.file.buffer,
        req.file.originalname
      );
      // Store file metadata in proposal record
    }
  }
);
```

**Story Points:** 3

---

### Story 13.3: Proposal Form UI - Contract Upload Section

**As an** external party
**I want** an intuitive way to attach a contract to my proposal
**So that** I can easily include my agreement terms

**Acceptance Criteria:**
- [ ] "Include Contract" toggle/checkbox in proposal form
- [ ] File dropzone appears when toggled on
- [ ] Drag-and-drop support
- [ ] File type validation with clear error messages
- [ ] File size validation (10MB max)
- [ ] Upload progress indicator
- [ ] Preview filename after selection
- [ ] Remove file option before submit
- [ ] Mobile-friendly file picker
- [ ] Accessible (keyboard navigation, screen reader support)

**Technical Notes:**
```tsx
// client/src/components/landing/ProposalFormModal.tsx

// Add state for contract upload
const [includeContract, setIncludeContract] = useState(false);
const [contractFile, setContractFile] = useState<File | null>(null);
const [uploadProgress, setUploadProgress] = useState(0);

// File dropzone component
<div className="mt-4">
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={includeContract}
      onChange={(e) => setIncludeContract(e.target.checked)}
      className="rounded border-gray-300"
    />
    <span className="text-sm font-medium text-gray-700">
      Include a contract with this proposal
    </span>
  </label>

  {includeContract && (
    <div className="mt-3">
      <FileDropzone
        accept={{ 'application/pdf': ['.pdf'], ... }}
        maxSize={10 * 1024 * 1024}
        onDrop={handleFileDrop}
        file={contractFile}
        onRemove={() => setContractFile(null)}
      />
    </div>
  )}
</div>
```

**Story Points:** 3

---

### Story 13.4: Proposal Notification Enhancement

**As an** artist
**I want** to know when a proposal includes a contract
**So that** I can prioritize reviews accordingly

**Acceptance Criteria:**
- [ ] Email notification indicates contract attachment
- [ ] "Contract attached" badge on proposal cards
- [ ] Contract icon in proposal list view
- [ ] Notification includes contract filename
- [ ] Filter proposals by "has contract"

**Technical Notes:**
```typescript
// server/services/postmark.ts - Update proposal notification template
const emailBody = `
  New Proposal from ${senderName}

  ${hasContract ? '📎 Contract Attached: ' + contractFileName : ''}

  Type: ${proposalType}
  Message: ${message}

  [View Proposal]
`;

// client/src/components/proposals/ProposalCard.tsx
{proposal.hasContract && (
  <Badge variant="outline" className="gap-1">
    <FileText className="h-3 w-3" />
    Contract
  </Badge>
)}
```

**Story Points:** 2

---

### Story 13.5: Contract Preview Component

**As an** artist
**I want** to preview attached contracts without conversion
**So that** I can quickly assess if it's worth reviewing in detail

**Acceptance Criteria:**
- [ ] PDF viewer embedded in proposal detail page
- [ ] Responsive design (full-width on mobile)
- [ ] Zoom controls
- [ ] Page navigation
- [ ] Download original option
- [ ] Fullscreen view option
- [ ] Loading state while PDF loads
- [ ] Error handling for corrupt/invalid PDFs

**Technical Notes:**
```tsx
// client/src/components/proposals/ContractPreview.tsx
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface ContractPreviewProps {
  filePath: string;
  fileName: string;
  onConvert: () => void;
}

export function ContractPreview({ filePath, fileName, onConvert }: ContractPreviewProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
        <span className="font-medium truncate">{fileName}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button onClick={onConvert}>
            <FileEdit className="h-4 w-4 mr-1" />
            Review & Edit
          </Button>
        </div>
      </div>

      <div className="pdf-viewer">
        <Document file={pdfUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
          <Page pageNumber={currentPage} scale={scale} />
        </Document>
      </div>

      {/* Navigation controls */}
    </div>
  );
}
```

**Story Points:** 3

---

### Story 13.6: Contract Conversion API

**As a** developer
**I want** an API endpoint to convert uploaded PDFs to editable contracts
**So that** artists can review and modify contract content

**Acceptance Criteria:**
- [ ] `POST /api/proposals/:id/convert-contract` endpoint
- [ ] Extract text from PDF (with OCR fallback)
- [ ] Identify contract structure (sections, clauses)
- [ ] Create new contract record linked to proposal
- [ ] Run AI analysis on extracted content
- [ ] Return contract ID for redirect to editor
- [ ] Handle conversion failures gracefully
- [ ] Premium feature check (require subscription)

**Technical Notes:**
```typescript
// server/routes.ts
app.post('/api/proposals/:id/convert-contract',
  requireAuth,
  requirePremium,
  async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.id;

    // 1. Get proposal and verify ownership
    const proposal = await storage.getProposal(id);
    if (!proposal || proposal.userId !== userId) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    if (!proposal.hasContract || !proposal.contractFilePath) {
      return res.status(400).json({ error: 'No contract attached to proposal' });
    }

    // 2. Download file from storage
    const fileBuffer = await downloadContractFile(proposal.contractFilePath);

    // 3. Extract text (using existing extraction service)
    const extractedText = await extractTextFromDocument(
      fileBuffer,
      proposal.contractFileType || 'pdf'
    );

    // 4. Create contract record
    const contract = await storage.createContract({
      userId,
      name: proposal.contractFileName || `Contract from ${proposal.senderName}`,
      type: mapProposalTypeToContractType(proposal.proposalType),
      status: 'pending',
      partnerName: proposal.senderName,
      fileUrl: proposal.contractFilePath,
      fileName: proposal.contractFileName,
      filePath: proposal.contractFilePath,
      fileSize: proposal.contractFileSize,
      fileType: proposal.contractFileType,
      extractedText,
      // Store rendered HTML for editing
      renderedContent: formatTextToHtml(extractedText),
    });

    // 5. Link contract to proposal
    await storage.updateProposal(id, { contractId: contract.id });

    // 6. Trigger async AI analysis
    analyzeContractAsync(contract.id);

    return res.json({
      contractId: contract.id,
      message: 'Contract converted successfully'
    });
  }
);
```

**Story Points:** 5

---

### Story 13.7: Contract Editor Integration

**As an** artist
**I want** to edit the converted contract content
**So that** I can make changes before sending for signatures

**Acceptance Criteria:**
- [ ] Rich text editor for contract content
- [ ] Section-based editing view
- [ ] Track changes option (nice-to-have)
- [ ] Save draft functionality
- [ ] Preview rendered contract
- [ ] Maintain original PDF for reference
- [ ] Side-by-side view: original vs. edited

**Technical Notes:**
```tsx
// client/src/pages/ContractEdit.tsx
// Extend existing contract view/edit functionality

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export function ContractEditor({ contract }: { contract: Contract }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: contract.renderedContent,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
      setHasChanges(true);
    },
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Original PDF reference */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Original Contract</h3>
        <ContractPreview filePath={contract.filePath} />
      </div>

      {/* Editable content */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Editable Version</h3>
        <EditorContent editor={editor} className="prose max-w-none" />
      </div>
    </div>
  );
}
```

**Story Points:** 5

---

### Story 13.8: AI Analysis for Uploaded Contracts

**As an** artist
**I want** AI analysis of uploaded contracts
**So that** I can identify risks before signing

**Acceptance Criteria:**
- [ ] Automatic analysis after conversion
- [ ] Risk score display (low/medium/high)
- [ ] Key terms extraction
- [ ] Red flag identification
- [ ] Industry-standard comparison
- [ ] Missing clauses detection
- [ ] Analysis displayed alongside editor
- [ ] Re-analyze after edits option

**Technical Notes:**
```typescript
// Reuse existing AI analysis from server/services/openai.ts
// with enhanced prompts for uploaded contracts

const UPLOADED_CONTRACT_ANALYSIS_PROMPT = `
Analyze this contract that was submitted to a music artist.
Consider the following:

1. Is this a standard industry contract or custom?
2. What are the key financial terms (royalties, advances, fees)?
3. Identify any unusual or concerning clauses
4. What rights is the artist granting?
5. What are the termination conditions?
6. Are there any hidden obligations?
7. Compare to industry standards for ${contractType}

Provide analysis in the following JSON structure:
{
  "summary": "Brief overview of the contract",
  "contractType": "detected contract type",
  "keyTerms": [
    { "term": "...", "value": "...", "riskLevel": "low|medium|high" }
  ],
  "redFlags": ["..."],
  "missingClauses": ["..."],
  "recommendations": ["..."],
  "overallRiskScore": 0-100,
  "riskLevel": "low|medium|high"
}
`;
```

**Story Points:** 3

---

### Story 13.9: E-Signing Flow for Converted Contracts

**As an** artist
**I want** to send the edited contract for e-signing
**So that** both parties can execute the agreement

**Acceptance Criteria:**
- [ ] "Send for Signing" button on edited contract
- [ ] Pre-populate signer with proposal sender info
- [ ] Artist can add themselves as signatory
- [ ] Support multiple signatories
- [ ] Generate PDF from edited content
- [ ] Upload to DocuSeal for signing
- [ ] Status tracking (existing e-signing UI)
- [ ] Signed copy stored in contract library

**Technical Notes:**
```typescript
// Extends existing signature request flow
// server/routes.ts - POST /api/signatures/request

// When contract originates from proposal, pre-populate signer
if (contract.proposalId) {
  const proposal = await storage.getProposal(contract.proposalId);
  suggestedSignatories.push({
    name: proposal.senderName,
    email: proposal.senderEmail,
    source: 'proposal'
  });
}

// Generate PDF from edited renderedContent
const pdfBuffer = await generateContractPDFWithSignatureAreas(
  {
    ...contract,
    content: contract.renderedContent // Use edited content
  },
  signatories.length
);
```

**Story Points:** 3

---

### Story 13.10: Proposal-to-Contract Workflow Completion

**As an** artist
**I want** the full workflow from proposal to signed contract
**So that** I can manage the entire agreement lifecycle

**Acceptance Criteria:**
- [ ] Proposal status updates when contract converted
- [ ] Proposal status updates when contract signed
- [ ] Link from proposal to contract and vice versa
- [ ] Timeline view showing proposal → contract → signed
- [ ] Archive proposal option after signing
- [ ] Notifications at each stage

**Technical Notes:**
```typescript
// Proposal status flow with contract
type ProposalStatus =
  | 'new'           // Just received
  | 'viewed'        // Artist viewed
  | 'in_review'     // Contract being reviewed (NEW)
  | 'pending_signature' // Contract sent for signing (NEW)
  | 'responded'     // Artist replied or signed
  | 'archived';     // Completed/dismissed

// Add webhook handler for signature completion
// Update proposal status when linked contract is signed
async function handleSignatureCompleted(signatureRequest: SignatureRequest) {
  const contract = await storage.getContract(signatureRequest.contractId);

  // Find and update linked proposal
  const proposal = await storage.getProposalByContractId(contract.id);
  if (proposal) {
    await storage.updateProposal(proposal.id, {
      status: 'responded',
      respondedAt: new Date()
    });
  }
}
```

**Story Points:** 2

---

## Total Story Points: 31

## Definition of Done

- [ ] External parties can upload PDFs with proposals
- [ ] Artists receive notifications with contract indicator
- [ ] PDF preview works without conversion
- [ ] Contracts convert to editable format
- [ ] AI analysis provides risk assessment
- [ ] Contracts can be edited and saved
- [ ] E-signing workflow completes successfully
- [ ] Signed contracts stored properly
- [ ] Mobile experience is functional
- [ ] Error handling covers edge cases

---

## Technical Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| pdf-parse | Text extraction from PDFs | Installed |
| tesseract.js | OCR for scanned PDFs | Installed |
| DocuSeal API | E-signing service | Integrated |
| OpenAI API | Contract analysis | Integrated |
| Replit Object Storage | File storage | Integrated |
| multer | File upload handling | Needs install |
| react-pdf | PDF preview component | Needs install |
| @tiptap/react | Rich text editor | Needs install |

---

## Environment Variables

No new environment variables required - uses existing:
- `DOCUSEAL_API_KEY`
- `OPENAI_API_KEY`
- Object storage (auto-configured on Replit)

---

## API Reference

### New Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/proposals` | POST (multipart) | Submit proposal with optional contract |
| `/api/proposals/:id/contract-preview` | GET | Stream PDF for preview |
| `/api/proposals/:id/convert-contract` | POST | Convert PDF to editable contract |

### Modified Endpoints

| Endpoint | Change |
|----------|--------|
| `GET /api/proposals` | Include `hasContract` filter |
| `GET /api/proposals/:id` | Return contract file metadata |

---

## UI Components

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `FileDropzone` | `client/src/components/ui/FileDropzone.tsx` | Reusable file upload |
| `ContractPreview` | `client/src/components/proposals/ContractPreview.tsx` | PDF viewer |
| `ContractEditor` | `client/src/components/contracts/ContractEditor.tsx` | Rich text editor |

### Modified Components

| Component | Changes |
|-----------|---------|
| `ProposalFormModal` | Add contract upload section |
| `ProposalCard` | Add contract badge |
| `ProposalDetail` | Add preview and convert actions |

---

## Security Considerations

1. **File Validation**: Verify file type by magic bytes, not just extension
2. **Size Limits**: Enforce 10MB limit server-side
3. **Malware Scanning**: Consider integration with virus scanning service (future)
4. **Access Control**: Proposals/contracts only accessible by intended artist
5. **Rate Limiting**: Existing 5/hour limit prevents abuse
6. **Secure Storage**: Files stored with unique paths, not guessable URLs

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Scanned/image PDF | OCR fallback with tesseract.js |
| Password-protected PDF | Return error, request unprotected version |
| Corrupt PDF | Graceful error message |
| Very large PDF (>10MB) | Reject with clear size limit message |
| Non-English contract | Best-effort extraction, AI analysis may be limited |
| Multiple file uploads | Single file per proposal (v1) |

---

## Future Enhancements (Out of Scope)

- Multiple file attachments per proposal
- Contract comparison (diff view)
- Template suggestion based on uploaded content
- Contract clause library for common additions
- Batch signature requests
- Contract negotiation chat
- Version history for edits
