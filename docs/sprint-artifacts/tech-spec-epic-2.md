# Epic Technical Specification: AI Attorney - Real AI Integration

Date: 2025-11-28
Author: Claude
Epic ID: 2
Status: Draft

---

## Overview

Epic 2 transforms the simulated AI contract analysis into a real AI-powered feature using OpenAI GPT-4. This is the core value proposition of Aermuse - helping music industry professionals understand complex contracts in plain language and identify potentially unfair terms before signing.

The epic covers the complete pipeline from file upload through AI analysis to results display, including text extraction from PDF/DOC files, OpenAI integration, structured analysis output, and appropriate legal disclaimers.

This is a **P0 (Critical)** epic as it delivers the primary differentiating feature of the platform.

## Objectives and Scope

### In Scope

- File upload system for PDF, DOC, DOCX contracts (max 10MB)
- Text extraction from uploaded documents using pdf-parse and mammoth
- OpenAI GPT-4 integration with music industry-specific prompts
- Structured AI analysis including summary, key terms, and red flags
- Fairness analysis with clause flagging and risk scoring
- Legal disclaimer system
- Analysis history and re-analysis capability
- Rate limiting for AI endpoints (10 requests/hour)
- File storage using Replit Object Storage

### Out of Scope

- OCR for scanned PDFs (future enhancement)
- Multi-language contract support
- Batch/bulk contract analysis
- AI-powered contract generation
- Contract comparison features
- Fine-tuned/custom AI models

## System Architecture Alignment

This epic aligns with the following architectural decisions:

| ADR | Application |
|-----|-------------|
| ADR-002: PDF Text Extraction | pdf-parse for PDFs, mammoth for DOCX |
| ADR-007: Rate Limiting | 10 AI analyses per hour per user |
| ADR-008: Background Jobs | Inline async for analysis processing |

**External Integrations:**
- OpenAI GPT-4 for contract analysis
- Replit Object Storage for file storage

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Location |
|----------------|----------------|----------|
| `multer` (middleware) | File upload handling | `server/middleware/upload.ts` |
| `storage.ts` | Replit Object Storage operations | `server/services/storage.ts` |
| `extraction.ts` | Text extraction from PDF/DOC | `server/services/extraction.ts` |
| `openai.ts` | OpenAI API integration | `server/services/openai.ts` |
| `contracts.ts` (routes) | Contract CRUD + analysis endpoints | `server/routes/contracts.ts` |
| `ContractUpload` | Upload component | `client/src/components/contracts/ContractUpload.tsx` |
| `ContractAnalysis` | Analysis display | `client/src/components/contracts/ContractAnalysis.tsx` |

### Data Flow Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Frontend   │───▶│   Multer     │───▶│   Storage    │───▶│   Extract    │
│   Upload     │    │   Middleware │    │   Service    │    │   Service    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                    │
                                                                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Display    │◀───│   Database   │◀───│   Process    │◀───│   OpenAI     │
│   Results    │    │   Update     │    │   Response   │    │   GPT-4      │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Data Models and Contracts

#### Contracts Table Extensions

```sql
-- Extensions to existing contracts table
ALTER TABLE contracts ADD COLUMN file_path TEXT;
ALTER TABLE contracts ADD COLUMN file_name TEXT;
ALTER TABLE contracts ADD COLUMN file_size INTEGER;
ALTER TABLE contracts ADD COLUMN file_type TEXT;
ALTER TABLE contracts ADD COLUMN extracted_text TEXT;
ALTER TABLE contracts ADD COLUMN ai_analysis JSONB;
ALTER TABLE contracts ADD COLUMN analyzed_at TIMESTAMP;
ALTER TABLE contracts ADD COLUMN analysis_version INTEGER DEFAULT 1;
```

#### Updated Drizzle Schema

```typescript
// shared/schema.ts
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("draft"),
  // File storage fields
  filePath: text("file_path"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  fileType: text("file_type"), // 'pdf' | 'doc' | 'docx'
  // AI analysis fields
  extractedText: text("extracted_text"),
  aiAnalysis: jsonb("ai_analysis").$type<ContractAnalysis>(),
  analyzedAt: timestamp("analyzed_at"),
  analysisVersion: integer("analysis_version").default(1),
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### AI Analysis Response Structure

```typescript
// shared/types.ts
interface ContractAnalysis {
  summary: {
    overview: string;           // 2-3 sentence plain-language summary
    contractType: string;       // e.g., "Recording Agreement", "License"
    parties: {
      role: string;             // e.g., "Artist", "Label"
      name: string;
      identified: boolean;
    }[];
    keyDates: {
      description: string;
      date: string | null;
      isDeadline: boolean;
    }[];
    duration: string | null;    // Contract term length
  };

  keyTerms: {
    term: string;               // e.g., "Revenue Split"
    value: string;              // e.g., "70/30 in favor of label"
    explanation: string;        // Plain-language explanation
    risk: 'low' | 'medium' | 'high';
    section: string | null;     // Section reference if available
  }[];

  redFlags: {
    issue: string;              // Short issue title
    clause: string;             // Quoted clause text (truncated)
    explanation: string;        // Why this is concerning
    severity: 'warning' | 'critical';
    category: string;           // e.g., "Rights", "Revenue", "Termination"
    recommendation: string;     // Suggested action/alternative
  }[];

  missingClauses: {
    clause: string;             // What's missing
    importance: 'recommended' | 'important' | 'essential';
    explanation: string;        // Why it should be included
  }[];

  riskAssessment: {
    overallScore: number;       // 0-100, lower is riskier
    overallRisk: 'low' | 'medium' | 'high';
    summary: string;            // 1-2 sentence risk summary
    breakdown: {
      category: string;
      score: number;
      notes: string;
    }[];
  };

  metadata: {
    modelVersion: string;       // GPT model used
    analyzedAt: string;         // ISO timestamp
    processingTime: number;     // Milliseconds
    tokenCount: number;         // Tokens used
  };
}
```

### APIs and Interfaces

| Method | Path | Description | Auth | Request | Response |
|--------|------|-------------|------|---------|----------|
| POST | `/api/contracts/upload` | Upload contract file | Auth | `multipart/form-data` | `{contract}` |
| POST | `/api/contracts/:id/analyze` | Analyze contract | Auth | - | `{analysis}` |
| GET | `/api/contracts/:id/analysis` | Get analysis result | Auth | - | `{analysis}` |
| POST | `/api/contracts/:id/reanalyze` | Re-analyze contract | Auth | - | `{analysis}` |
| GET | `/api/contracts/:id/download` | Download original file | Auth | - | `file` |

**Error Responses:**
```typescript
// 400 Bad Request
{ error: "Invalid file type. Accepted: PDF, DOC, DOCX" }
{ error: "File too large. Maximum size: 10MB" }
{ error: "No text could be extracted from this document" }

// 402 Payment Required
{ error: "Analysis requires active subscription", code: "SUBSCRIPTION_REQUIRED" }

// 429 Too Many Requests
{ error: "AI analysis rate limit exceeded. Try again in X minutes." }

// 500 Internal Server Error
{ error: "AI analysis failed. Please try again." }
```

### OpenAI Prompt Engineering

```typescript
// server/services/openai.ts
const MUSIC_CONTRACT_SYSTEM_PROMPT = `
You are an expert music industry contract analyst. Your role is to help independent artists understand contracts in plain language.

IMPORTANT CONTEXT:
- You are analyzing contracts for music industry professionals (artists, producers, songwriters)
- Focus on music industry-specific concerns: royalties, rights ownership, exclusivity, advances
- Use simple, non-legal language that a musician would understand
- Be especially vigilant about common predatory practices in the music industry

ANALYSIS REQUIREMENTS:
1. Provide a clear, 2-3 sentence summary of what this contract does
2. Identify all parties and their roles
3. Extract key financial terms (royalty rates, advances, splits)
4. Flag potentially unfair or one-sided clauses
5. Note any missing protections the artist should consider
6. Assign risk levels based on industry standards

RED FLAGS TO WATCH FOR:
- Perpetual or excessively long rights assignments (10+ years)
- 360 deals without clear benefit to artist
- Advances structured as loans with high interest
- One-sided termination rights
- Non-compete clauses that are too broad
- Vague "controlled composition" clauses
- Poor mechanical royalty terms
- Rights to unreleased/future works
- Restrictions on artistic freedom

OUTPUT FORMAT:
Respond with valid JSON matching the ContractAnalysis schema. Be thorough but concise.
`;

const analyzeContract = async (contractText: string): Promise<ContractAnalysis> => {
  const startTime = Date.now();

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: MUSIC_CONTRACT_SYSTEM_PROMPT },
      { role: 'user', content: `Analyze this music industry contract:\n\n${contractText}` }
    ],
    temperature: 0.3,        // Lower for consistent analysis
    max_tokens: 4000,        // Sufficient for detailed analysis
    response_format: { type: 'json_object' }
  });

  const processingTime = Date.now() - startTime;
  const result = JSON.parse(response.choices[0].message.content);

  return {
    ...result,
    metadata: {
      modelVersion: 'gpt-4-turbo-preview',
      analyzedAt: new Date().toISOString(),
      processingTime,
      tokenCount: response.usage?.total_tokens || 0
    }
  };
};
```

### File Storage Structure

```
/contracts
  /{userId}
    /{contractId}
      /original.{ext}     # Original uploaded file
      /extracted.txt      # Extracted text (cached)
```

## Non-Functional Requirements

### Performance

| Metric | Target | Notes |
|--------|--------|-------|
| File upload | < 5s for 10MB | Depends on network |
| Text extraction | < 10s | PDF/DOCX parsing |
| AI analysis | < 45s | GPT-4 processing |
| Total flow | < 60s | Upload to results |

### Security

- **File Validation:** Check MIME type and magic bytes, not just extension
- **File Size Limit:** 10MB maximum
- **Storage Access:** Files scoped to user ID
- **Text Sanitization:** Sanitize extracted text before AI processing
- **API Key Security:** OpenAI key in environment variable only
- **Rate Limiting:** 10 analyses per hour per user

### Reliability/Availability

- **Retry Logic:** 3 retries with exponential backoff for OpenAI API
- **Timeout Handling:** 45-second timeout for AI analysis
- **Graceful Degradation:** Show extraction error if text extraction fails
- **Partial Results:** If AI fails, preserve uploaded file for retry

### Observability

| Signal | Type | Context |
|--------|------|---------|
| `[UPLOAD] File uploaded` | INFO | user_id, file_type, file_size |
| `[EXTRACT] Text extracted` | INFO | contract_id, char_count |
| `[EXTRACT] Failed` | ERROR | contract_id, error |
| `[AI] Analysis started` | INFO | contract_id, text_length |
| `[AI] Analysis complete` | INFO | contract_id, tokens, duration |
| `[AI] Analysis failed` | ERROR | contract_id, error, retry_count |
| `[AI] Rate limit hit` | WARN | user_id |

## Dependencies and Integrations

### New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `openai` | ^4.x | OpenAI API client |
| `pdf-parse` | ^1.1.1 | PDF text extraction |
| `mammoth` | ^1.6.0 | DOCX text extraction |
| `multer` | ^1.4.5 | File upload handling |
| `file-type` | ^18.x | MIME type detection |

### Existing Dependencies (Used)

| Package | Purpose |
|---------|---------|
| `@replit/object-storage` | File storage |
| `express-rate-limit` | Rate limiting |
| `drizzle-orm` | Database operations |

### Environment Variables

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Rate limiting (optional, defaults shown)
AI_RATE_LIMIT_WINDOW=3600000    # 1 hour in ms
AI_RATE_LIMIT_MAX=10            # Max requests per window
```

## Acceptance Criteria (Authoritative)

1. **AC-2.1.1:** File upload button visible on contracts page
2. **AC-2.1.2:** Drag-and-drop upload supported
3. **AC-2.1.3:** PDF, DOC, DOCX formats accepted
4. **AC-2.1.4:** File size limit enforced (10MB)
5. **AC-2.1.5:** Upload progress indicator displayed
6. **AC-2.1.6:** Files stored in Replit Object Storage
7. **AC-2.2.1:** PDF text extraction working
8. **AC-2.2.2:** DOCX text extraction working
9. **AC-2.2.3:** Extracted text stored for AI processing
10. **AC-2.2.4:** Warning shown for scanned PDFs with no extractable text
11. **AC-2.2.5:** Multi-page documents supported
12. **AC-2.3.1:** OpenAI API client configured
13. **AC-2.3.2:** Rate limiting: 10 analyses per hour
14. **AC-2.3.3:** Error handling for API failures with user-friendly messages
15. **AC-2.3.4:** 45-second timeout with retry logic
16. **AC-2.4.1:** Summary generated automatically after upload
17. **AC-2.4.2:** Summary in plain, non-legal language
18. **AC-2.4.3:** Key terms highlighted with explanations
19. **AC-2.4.4:** Important dates and deadlines extracted
20. **AC-2.4.5:** Parties involved clearly identified
21. **AC-2.4.6:** "Analyzing..." loading state during processing
22. **AC-2.5.1:** Unfair clauses flagged with severity levels
23. **AC-2.5.2:** Each flag includes explanation and recommendation
24. **AC-2.5.3:** Overall contract risk score (0-100) calculated
25. **AC-2.5.4:** Music industry-specific red flags detected
26. **AC-2.6.1:** Legal disclaimer banner on all AI analysis results
27. **AC-2.6.2:** Link to terms of service from disclaimer
28. **AC-2.6.3:** Disclaimer included in any exported analysis
29. **AC-2.7.1:** Analysis timestamp displayed
30. **AC-2.7.2:** "Re-analyze" button available
31. **AC-2.7.3:** Confirmation before re-analysis (uses credits)
32. **AC-2.7.4:** Analysis version tracked

## Traceability Mapping

| AC | Spec Section | Component | Test Idea |
|----|--------------|-----------|-----------|
| AC-2.1.1 | - | ContractUpload | E2E: button visible |
| AC-2.1.2 | - | ContractUpload | E2E: drag-drop works |
| AC-2.1.3 | Services | multer config | Unit: file filter test |
| AC-2.1.4 | Services | multer config | Unit: size limit test |
| AC-2.1.5 | - | ContractUpload | E2E: progress shown |
| AC-2.1.6 | Services | storage.ts | Integration: file persists |
| AC-2.2.1 | Services | extraction.ts | Unit: PDF extraction |
| AC-2.2.2 | Services | extraction.ts | Unit: DOCX extraction |
| AC-2.2.3 | Data Models | extractedText | Integration: text saved |
| AC-2.2.4 | Services | extraction.ts | Unit: scanned PDF warning |
| AC-2.2.5 | Services | extraction.ts | Unit: multi-page test |
| AC-2.3.1 | Services | openai.ts | Integration: API call |
| AC-2.3.2 | NFR | aiLimiter | Integration: rate limit |
| AC-2.3.3 | APIs | contracts.ts | Integration: error response |
| AC-2.3.4 | Services | openai.ts | Unit: timeout/retry |
| AC-2.4.1-6 | APIs, Data | analyze endpoint | Integration: full flow |
| AC-2.5.1-4 | Services | openai.ts prompt | Manual: review output |
| AC-2.6.1-3 | - | LegalDisclaimer | E2E: disclaimer visible |
| AC-2.7.1-4 | APIs | reanalyze endpoint | Integration: version bump |

## Risks, Assumptions, Open Questions

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OpenAI API costs | Medium | Medium | Rate limiting, token monitoring |
| Scanned PDFs fail extraction | Medium | Low | Clear user warning, future OCR |
| GPT-4 inconsistent output | Low | Medium | JSON mode, temperature 0.3, retry |
| Large contracts exceed token limit | Low | Medium | Truncate with warning |
| API rate limits from OpenAI | Low | High | Queue system if needed |

### Assumptions

- **A1:** GPT-4 API will remain available at current pricing
- **A2:** Most contracts will be text-based PDFs, not scanned images
- **A3:** 10 analyses per hour is sufficient for MVP user base
- **A4:** 10MB file limit covers 99% of contracts
- **A5:** Users accept AI analysis is not legal advice

### Open Questions

- **Q1:** Should analysis be subscription-gated or available to free users with limits?
  - Recommendation: Free users get 3 analyses total, subscribers unlimited (within rate limit)
- **Q2:** Should we store analysis history or just the latest?
  - Recommendation: Store latest only for MVP, add history in future
- **Q3:** What happens if contract is in a language other than English?
  - Recommendation: Attempt analysis but add disclaimer about English-only validation

## Test Strategy Summary

### Unit Tests

- `extraction.ts`: PDF extraction, DOCX extraction, error handling
- `openai.ts`: Prompt construction, response parsing, retry logic
- File validation: MIME type, size limit, extension check
- Risk score calculation algorithm

### Integration Tests

- Full upload → extract → analyze flow
- Rate limiting behavior
- File storage and retrieval
- Database persistence of analysis

### E2E Tests

- Complete user flow: upload → wait → view results
- Error states: invalid file, extraction failure, AI failure
- Re-analyze flow
- Disclaimer visibility

### Manual Testing

- Review AI output quality for various contract types
- Verify music industry-specific red flags
- Check plain-language summaries are understandable

---

*Generated: 2025-11-28*
*Methodology: BMad Method - Brownfield Track*
