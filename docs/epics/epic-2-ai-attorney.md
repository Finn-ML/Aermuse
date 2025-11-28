# Epic 2: AI Attorney - Real AI Integration

## Epic Overview

| Field | Value |
|-------|-------|
| **Epic ID** | EPIC-002 |
| **Title** | AI Attorney - Real AI Integration |
| **Priority** | P0 - Critical |
| **Estimated Effort** | 4-5 days |
| **Dependencies** | File upload infrastructure |

## Description

Transform the simulated AI contract analysis into a real AI-powered feature using OpenAI GPT-4. This is the core value proposition of Aermuse - helping artists understand complex contracts in plain language.

## Business Value

- Core product differentiator
- Enables users to understand contracts without legal expertise
- Identifies unfair terms before signing
- Validates product-market fit for MVP

## Acceptance Criteria

- [ ] Users can upload PDF/DOC contract files
- [ ] AI extracts and analyzes contract text
- [ ] Plain-language summary generated automatically
- [ ] Unfair clauses flagged with explanations
- [ ] Risk level assigned to each contract
- [ ] Legal disclaimer displayed

---

## User Stories

### Story 2.1: Contract File Upload

**As an** artist
**I want** to upload a contract file (PDF or DOC)
**So that** it can be analyzed by the AI Attorney

**Acceptance Criteria:**
- [ ] File upload button on contracts page
- [ ] Drag-and-drop support
- [ ] Accept PDF, DOC, DOCX formats
- [ ] File size limit (10MB)
- [ ] Upload progress indicator
- [ ] File stored securely (S3 or equivalent)
- [ ] File URL saved to contract record

**Technical Notes:**
- Use `multer` for file handling
- Integrate with AWS S3 or Cloudinary
- Add `fileUrl`, `fileName` fields to contracts (already exist)

**Story Points:** 5

---

### Story 2.2: Text Extraction from Documents

**As the** system
**I want** to extract text from uploaded documents
**So that** the AI can analyze the contract content

**Acceptance Criteria:**
- [ ] PDF text extraction working
- [ ] DOC/DOCX text extraction working
- [ ] Extracted text stored for AI processing
- [ ] Handle scanned PDFs gracefully (show warning)
- [ ] Multi-page documents supported
- [ ] Error handling for corrupted files

**Technical Notes:**
- Use `pdf-parse` for PDFs
- Use `mammoth` for DOCX
- Consider OCR fallback (future enhancement)

**Story Points:** 3

---

### Story 2.3: OpenAI GPT-4 Integration

**As a** developer
**I want** to integrate OpenAI GPT-4 API
**So that** contracts can be analyzed intelligently

**Acceptance Criteria:**
- [ ] OpenAI API client configured
- [ ] API key stored securely (environment variable)
- [ ] Rate limiting implemented
- [ ] Error handling for API failures
- [ ] Retry logic for transient errors
- [ ] Response timeout handling (30s max)

**Technical Notes:**
- Install `openai` package
- Use GPT-4 or GPT-4-turbo model
- Implement token counting for cost management

**Story Points:** 3

---

### Story 2.4: AI Contract Summary Generation

**As an** artist
**I want** to see a plain-language summary of my contract
**So that** I can understand what I'm agreeing to

**Acceptance Criteria:**
- [ ] Summary generated automatically on upload
- [ ] Summary in simple, non-legal language
- [ ] Key terms highlighted and explained
- [ ] Important dates/deadlines extracted
- [ ] Parties involved clearly identified
- [ ] Summary displayed on contract detail page
- [ ] "Analyzing..." loading state during processing

**Technical Notes:**
- Prompt engineering for music industry context
- Structure output as JSON for consistent display
- Cache results in `aiAnalysis` field

**Story Points:** 5

---

### Story 2.5: Fairness Analysis & Clause Flagging

**As an** artist
**I want** unfair clauses to be flagged and explained
**So that** I can negotiate better terms

**Acceptance Criteria:**
- [ ] AI identifies potentially unfair clauses
- [ ] Each flag includes:
  - Clause text (quoted)
  - Plain-language explanation of concern
  - Risk level (low/medium/high)
  - Suggested alternative language
- [ ] Flags displayed prominently on contract view
- [ ] Overall contract risk score (0-100)
- [ ] Common music industry red flags detected:
  - Excessive exclusivity periods
  - Unfavorable revenue splits
  - Perpetual rights assignments
  - One-sided termination clauses

**Technical Notes:**
- Use structured output from GPT-4
- Store in `aiAnalysis` JSONB field
- Risk score algorithm based on flag count/severity

**Story Points:** 5

---

### Story 2.6: Legal Disclaimer

**As a** platform operator
**I want** to display a legal disclaimer
**So that** users understand AI suggestions are not legal advice

**Acceptance Criteria:**
- [ ] Disclaimer shown on all AI analysis results
- [ ] Banner at top of analysis: "AI suggestions do not constitute legal advice"
- [ ] Link to full terms of service
- [ ] Acknowledgment checkbox before first use (optional)
- [ ] Disclaimer in footer of any exported/shared analysis

**Technical Notes:**
- Consistent disclaimer component
- Consider legal review of disclaimer text

**Story Points:** 1

---

### Story 2.7: Analysis History & Re-analysis

**As an** artist
**I want** to see previous analyses and request re-analysis
**So that** I can track changes or get updated insights

**Acceptance Criteria:**
- [ ] Analysis timestamp displayed
- [ ] "Re-analyze" button available
- [ ] Confirmation before re-analysis (uses API credits)
- [ ] Previous analysis preserved in history
- [ ] Compare analyses (stretch goal)

**Technical Notes:**
- Add `analyzedAt` timestamp (exists)
- Consider analysis version history table

**Story Points:** 2

---

## Total Story Points: 24

## Definition of Done

- [ ] All acceptance criteria met
- [ ] AI analysis completes within 30 seconds
- [ ] Error states handled gracefully
- [ ] Cost monitoring in place
- [ ] User feedback mechanism for AI quality
- [ ] Documentation updated
