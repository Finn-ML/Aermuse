# Story 2.3: OpenAI GPT-4 Integration

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 2.3 |
| **Epic** | Epic 2: AI Attorney - Real AI |
| **Title** | OpenAI GPT-4 Integration |
| **Priority** | P0 - Critical |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** developer
**I want** to integrate OpenAI GPT-4 API
**So that** contracts can be analyzed intelligently

## Context

This story establishes the core AI infrastructure for contract analysis. It sets up the OpenAI client, implements retry logic for transient failures, configures rate limiting to manage costs, and creates the foundation for structured analysis output.

**Dependencies:**
- Story 2.2 (Text Extraction) should be completed first
- OpenAI API key required in environment

## Acceptance Criteria

- [ ] **AC-1:** OpenAI API client configured and working
- [ ] **AC-2:** API key stored securely in environment variable
- [ ] **AC-3:** Rate limiting: 10 analyses per hour per user
- [ ] **AC-4:** Error handling for API failures with user-friendly messages
- [ ] **AC-5:** Retry logic for transient errors (3 retries, exponential backoff)
- [ ] **AC-6:** Response timeout handling (45s max)
- [ ] **AC-7:** Token usage tracked and logged
- [ ] **AC-8:** JSON response format enforced

## Technical Requirements

### Dependencies to Install

```bash
npm install openai
```

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/services/openai.ts` | New: OpenAI API service |
| `server/middleware/rateLimit.ts` | Add AI rate limiter |
| `server/routes/contracts.ts` | Add analyze endpoint (foundation) |

### Implementation Details

#### 1. OpenAI Service

```typescript
// server/services/openai.ts
import OpenAI from 'openai';

// Initialize client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configuration
const CONFIG = {
  model: 'gpt-4-turbo-preview',
  maxTokens: 4000,
  temperature: 0.3,  // Lower for consistent analysis
  timeout: 45000,    // 45 second timeout
  maxRetries: 3,
  retryBaseDelay: 1000  // 1 second base delay
};

// Error types for handling
export class OpenAIError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}

// System prompt for music contract analysis
export const MUSIC_CONTRACT_SYSTEM_PROMPT = `
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
You must respond with valid JSON matching this exact schema:
{
  "summary": {
    "overview": "2-3 sentence plain-language summary",
    "contractType": "Type of contract",
    "parties": [{ "role": "Role", "name": "Name", "identified": true/false }],
    "keyDates": [{ "description": "Description", "date": "Date or null", "isDeadline": true/false }],
    "duration": "Contract term or null"
  },
  "keyTerms": [{
    "term": "Term name",
    "value": "Term value",
    "explanation": "Plain-language explanation",
    "risk": "low|medium|high",
    "section": "Section reference or null"
  }],
  "redFlags": [{
    "issue": "Short issue title",
    "clause": "Quoted clause text (truncated if long)",
    "explanation": "Why this is concerning",
    "severity": "warning|critical",
    "category": "Category (Rights, Revenue, Termination, etc.)",
    "recommendation": "Suggested action or alternative"
  }],
  "missingClauses": [{
    "clause": "What's missing",
    "importance": "recommended|important|essential",
    "explanation": "Why it should be included"
  }],
  "riskAssessment": {
    "overallScore": 0-100,
    "overallRisk": "low|medium|high",
    "summary": "1-2 sentence risk summary",
    "breakdown": [{ "category": "Category", "score": 0-100, "notes": "Notes" }]
  }
}

Be thorough but concise. Focus on what matters most to an independent artist.
`;

interface AnalysisResult {
  analysis: any;  // Parsed JSON analysis
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  processingTime: number;
}

/**
 * Sleep for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
function getRetryDelay(attempt: number): number {
  const baseDelay = CONFIG.retryBaseDelay;
  const delay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(delay + jitter, 30000); // Cap at 30 seconds
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Rate limit errors
  if (error.status === 429) return true;

  // Server errors
  if (error.status >= 500 && error.status < 600) return true;

  // Timeout errors
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') return true;

  // OpenAI specific retryable errors
  if (error.error?.type === 'server_error') return true;

  return false;
}

/**
 * Analyze contract text using GPT-4
 */
export async function analyzeContract(contractText: string): Promise<AnalysisResult> {
  const startTime = Date.now();
  let lastError: any;

  for (let attempt = 0; attempt < CONFIG.maxRetries; attempt++) {
    try {
      console.log(`[AI] Analysis attempt ${attempt + 1}/${CONFIG.maxRetries}`);

      const response = await openai.chat.completions.create({
        model: CONFIG.model,
        messages: [
          { role: 'system', content: MUSIC_CONTRACT_SYSTEM_PROMPT },
          { role: 'user', content: `Analyze this music industry contract:\n\n${contractText}` }
        ],
        temperature: CONFIG.temperature,
        max_tokens: CONFIG.maxTokens,
        response_format: { type: 'json_object' }
      }, {
        timeout: CONFIG.timeout
      });

      const processingTime = Date.now() - startTime;
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new OpenAIError('Empty response from AI', 'EMPTY_RESPONSE', true);
      }

      // Parse JSON response
      let analysis;
      try {
        analysis = JSON.parse(content);
      } catch (parseError) {
        console.error('[AI] JSON parse error:', parseError);
        throw new OpenAIError(
          'Invalid JSON response from AI',
          'PARSE_ERROR',
          true
        );
      }

      console.log(`[AI] Analysis complete: ${response.usage?.total_tokens} tokens, ${processingTime}ms`);

      return {
        analysis,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        },
        model: response.model,
        processingTime
      };
    } catch (error: any) {
      lastError = error;
      console.error(`[AI] Attempt ${attempt + 1} failed:`, error.message);

      // Don't retry non-retryable errors
      if (!isRetryableError(error) && !(error instanceof OpenAIError && error.retryable)) {
        break;
      }

      // Don't retry on last attempt
      if (attempt < CONFIG.maxRetries - 1) {
        const delay = getRetryDelay(attempt);
        console.log(`[AI] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted or non-retryable error
  const processingTime = Date.now() - startTime;
  console.error(`[AI] Analysis failed after ${CONFIG.maxRetries} attempts (${processingTime}ms)`);

  // Convert to user-friendly error
  if (lastError.status === 429) {
    throw new OpenAIError(
      'AI service is currently busy. Please try again in a few minutes.',
      'RATE_LIMITED'
    );
  }

  if (lastError.status === 401) {
    throw new OpenAIError(
      'AI service configuration error. Please contact support.',
      'AUTH_ERROR'
    );
  }

  if (lastError.code === 'ETIMEDOUT' || lastError.code === 'ECONNRESET') {
    throw new OpenAIError(
      'AI analysis timed out. Please try again.',
      'TIMEOUT'
    );
  }

  throw new OpenAIError(
    'AI analysis failed. Please try again later.',
    'UNKNOWN_ERROR'
  );
}

/**
 * Estimate token count for a text string
 * Rough estimate: ~4 chars per token for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if text is within token limits
 */
export function isWithinTokenLimit(text: string, maxTokens: number = 100000): boolean {
  return estimateTokens(text) <= maxTokens;
}
```

#### 2. Rate Limiting Middleware

```typescript
// server/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth endpoints rate limit
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// AI analysis rate limit - more restrictive due to cost
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'AI analysis limit reached. You can analyze up to 10 contracts per hour.',
    code: 'AI_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by user ID, not IP
    return req.session?.userId || req.ip;
  },
  handler: (req, res) => {
    console.log(`[AI] Rate limit hit for user ${req.session?.userId}`);
    res.status(429).json({
      error: 'AI analysis limit reached. You can analyze up to 10 contracts per hour.',
      code: 'AI_RATE_LIMIT',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});
```

#### 3. Analysis Endpoint (Foundation)

```typescript
// server/routes/contracts.ts
import { analyzeContract, OpenAIError } from '../services/openai';
import { truncateForAI } from '../services/extraction';
import { aiLimiter } from '../middleware/rateLimit';

// POST /api/contracts/:id/analyze
app.post('/api/contracts/:id/analyze',
  requireAuth,
  aiLimiter,
  async (req, res) => {
    const contract = await db.query.contracts.findFirst({
      where: and(
        eq(contracts.id, req.params.id),
        eq(contracts.userId, req.session.userId)
      )
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (!contract.extractedText) {
      return res.status(400).json({
        error: 'No text available for analysis. Please upload a text-based document.'
      });
    }

    try {
      // Update status to analyzing
      await db.update(contracts)
        .set({ status: 'analyzing' })
        .where(eq(contracts.id, contract.id));

      // Truncate if needed
      const { text, truncated, originalLength } = truncateForAI(contract.extractedText);

      if (truncated) {
        console.log(`[AI] Contract ${contract.id} truncated: ${originalLength} → ${text.length} chars`);
      }

      // Perform analysis
      const result = await analyzeContract(text);

      // Add metadata
      const analysis = {
        ...result.analysis,
        metadata: {
          modelVersion: result.model,
          analyzedAt: new Date().toISOString(),
          processingTime: result.processingTime,
          tokenCount: result.usage.totalTokens,
          truncated
        }
      };

      // Save analysis to contract
      const [updated] = await db.update(contracts)
        .set({
          aiAnalysis: analysis,
          analyzedAt: new Date(),
          analysisVersion: sql`COALESCE(${contracts.analysisVersion}, 0) + 1`,
          status: 'analyzed'
        })
        .where(eq(contracts.id, contract.id))
        .returning();

      console.log(`[AI] Contract ${contract.id} analyzed: ${result.usage.totalTokens} tokens`);

      res.json({
        contract: updated,
        analysis,
        usage: result.usage
      });
    } catch (error) {
      console.error(`[AI] Analysis failed for ${contract.id}:`, error);

      // Reset status
      await db.update(contracts)
        .set({ status: 'uploaded' })
        .where(eq(contracts.id, contract.id));

      if (error instanceof OpenAIError) {
        return res.status(500).json({
          error: error.message,
          code: error.code
        });
      }

      res.status(500).json({
        error: 'AI analysis failed. Please try again.',
        code: 'ANALYSIS_FAILED'
      });
    }
  }
);
```

#### 4. Environment Configuration

```bash
# .env
OPENAI_API_KEY=sk-...

# Optional overrides
AI_RATE_LIMIT_WINDOW=3600000    # 1 hour in ms
AI_RATE_LIMIT_MAX=10            # Max requests per window
AI_TIMEOUT=45000                # Timeout in ms
```

## Definition of Done

- [ ] OpenAI package installed
- [ ] OpenAI client initialized with env API key
- [ ] System prompt crafted for music contracts
- [ ] Rate limiting: 10 per hour per user
- [ ] Retry logic with exponential backoff
- [ ] 45-second timeout configured
- [ ] JSON response format enforced
- [ ] Token usage logged
- [ ] User-friendly error messages
- [ ] Analyze endpoint returning structured data

## Testing Checklist

### Unit Tests

- [ ] Token estimation function
- [ ] Retry delay calculation
- [ ] Error classification (retryable vs not)
- [ ] JSON parsing of analysis response

### Integration Tests

- [ ] Successful analysis with mock
- [ ] Rate limit enforcement
- [ ] Retry on 429 error
- [ ] Retry on 500 error
- [ ] Timeout handling
- [ ] Analysis saved to database

### Manual Testing

- [ ] Real API call with test contract
- [ ] Verify JSON structure matches schema
- [ ] Check token usage logging
- [ ] Verify rate limit counter

## Error Scenarios

| Scenario | Response | Retryable |
|----------|----------|-----------|
| 401 Unauthorized | "AI service configuration error" | No |
| 429 Rate Limited | "AI service is currently busy" | Yes |
| 500 Server Error | "AI analysis failed" | Yes |
| Timeout | "AI analysis timed out" | Yes |
| Invalid JSON | "AI analysis failed" | Yes |
| Empty Response | "AI analysis failed" | Yes |

## Related Documents

- [Epic 2 Tech Spec](./tech-spec-epic-2.md)
- [Story 2.2: Text Extraction](./2-2-text-extraction-from-documents.md)
- [Architecture: OpenAI Integration](../architecture.md#openai-integration-epic-2)

---

## Tasks/Subtasks

- [ ] **Task 1: Install dependencies**
  - [ ] Run `npm install openai`
  - [ ] Add OPENAI_API_KEY to environment
  - [ ] Verify API key works

- [ ] **Task 2: Create OpenAI service**
  - [ ] Create `server/services/openai.ts`
  - [ ] Initialize OpenAI client
  - [ ] Create MUSIC_CONTRACT_SYSTEM_PROMPT
  - [ ] Implement OpenAIError class
  - [ ] Implement analyzeContract function
  - [ ] Implement retry logic with exponential backoff
  - [ ] Add timeout handling (45s)
  - [ ] Implement token estimation helpers

- [ ] **Task 3: Create AI rate limiter**
  - [ ] Update `server/middleware/rateLimit.ts`
  - [ ] Add aiLimiter (10 per hour per user)
  - [ ] Configure keyGenerator for user-based limiting
  - [ ] Add appropriate error messages

- [ ] **Task 4: Create analyze endpoint**
  - [ ] Add POST /api/contracts/:id/analyze route
  - [ ] Apply requireAuth and aiLimiter
  - [ ] Validate extracted text exists
  - [ ] Truncate text if needed
  - [ ] Call analyzeContract
  - [ ] Save analysis to contract record
  - [ ] Handle and log errors

- [ ] **Task 5: Update database schema**
  - [ ] Add aiAnalysis JSON field to contracts
  - [ ] Add analyzedAt timestamp field
  - [ ] Add analysisVersion integer field
  - [ ] Run migration

- [ ] **Task 6: Write tests**
  - [ ] Unit tests for token estimation
  - [ ] Unit tests for retry delay calculation
  - [ ] Unit tests for error classification
  - [ ] Integration tests with mocked OpenAI
  - [ ] Integration tests for rate limiting
  - [ ] Manual test with real API call

---

## Dev Agent Record

### Debug Log
<!-- Automatically updated by dev agent during implementation -->

### Completion Notes
<!-- Summary of implementation, decisions made, any follow-ups needed -->

---

## File List

| Action | File Path |
|--------|-----------|
| | |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| | | |
