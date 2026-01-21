import OpenAI from 'openai';

// Lazy-initialize client (avoid error when API key not set during tests)
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new OpenAIError(
        'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.',
        'CONFIG_ERROR'
      );
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openaiClient;
}

// Configuration
const CONFIG = {
  model: 'gpt-4o-mini',
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

export interface AnalysisResult {
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
export function getRetryDelay(attempt: number): number {
  const baseDelay = CONFIG.retryBaseDelay;
  const delay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(delay + jitter, 30000); // Cap at 30 seconds
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
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

      const response = await getOpenAIClient().chat.completions.create({
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
        console.log(`[AI] Retrying in ${Math.round(delay)}ms...`);
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
 * Text-to-Speech configuration
 */
const TTS_CONFIG = {
  model: 'tts-1' as const,        // or 'tts-1-hd' for higher quality
  voice: 'alloy' as const,        // alloy, echo, fable, onyx, nova, shimmer
  speed: 1.0,                     // 0.25 to 4.0
  responseFormat: 'mp3' as const  // mp3, opus, aac, flac
};

/**
 * Generate speech audio from text using OpenAI TTS
 * Returns a Buffer containing the audio data
 */
export async function generateSpeech(text: string): Promise<Buffer> {
  const startTime = Date.now();

  // Limit text length to avoid excessive API costs (TTS has a 4096 char limit per request)
  const maxLength = 4096;
  const truncatedText = text.length > maxLength
    ? text.substring(0, maxLength - 3) + '...'
    : text;

  console.log(`[TTS] Generating speech for ${truncatedText.length} characters`);

  try {
    const response = await getOpenAIClient().audio.speech.create({
      model: TTS_CONFIG.model,
      voice: TTS_CONFIG.voice,
      input: truncatedText,
      speed: TTS_CONFIG.speed,
      response_format: TTS_CONFIG.responseFormat
    });

    // Convert the response to a Buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const processingTime = Date.now() - startTime;
    console.log(`[TTS] Speech generated: ${buffer.length} bytes in ${processingTime}ms`);

    return buffer;
  } catch (error: any) {
    console.error('[TTS] Speech generation failed:', error.message);

    if (error.status === 429) {
      throw new OpenAIError(
        'Text-to-speech service is currently busy. Please try again in a few minutes.',
        'RATE_LIMITED'
      );
    }

    if (error.status === 401) {
      throw new OpenAIError(
        'Text-to-speech service configuration error. Please contact support.',
        'AUTH_ERROR'
      );
    }

    throw new OpenAIError(
      'Failed to generate speech. Please try again later.',
      'TTS_ERROR'
    );
  }
}

// ============================================
// CONTRACT FIELD EXTRACTION (PDF Conversion Redesign)
// ============================================

/**
 * Structured data types for parsed contract fields
 */
export interface ParsedContractParty {
  name: string;
  role: 'artist' | 'label' | 'producer' | 'brand' | 'manager' | 'publisher' | 'other';
  email?: string;
  address?: string;
  company?: string;
}

export interface ParsedContractDates {
  effectiveDate?: string;
  endDate?: string;
  deliveryDate?: string;
  milestones?: Array<{ description: string; date: string }>;
}

export interface ParsedRoyaltySplit {
  party: string;
  percentage: number;
  type?: string;
}

export interface ParsedFee {
  description: string;
  amount: number;
  currency?: string;
}

export interface ParsedFinancialTerms {
  advanceAmount?: number;
  currency?: string;
  royaltySplits?: ParsedRoyaltySplit[];
  fees?: ParsedFee[];
  paymentSchedule?: string;
}

export interface ParsedExclusivity {
  isExclusive: boolean;
  period?: string;
  scope?: string;
}

export interface ParsedTermination {
  noticePeriod?: string;
  conditions?: string[];
}

export interface ParsedAdditionalClause {
  title: string;
  content: string;
}

export interface ParsedContractFields {
  contractType: 'collaboration' | 'licensing' | 'touring' | 'production' | 'business' | 'management' | 'publishing' | 'other';
  title: string;
  parties: ParsedContractParty[];
  projectDetails: {
    title?: string;
    description?: string;
    deliverables?: string[];
  };
  dates: ParsedContractDates;
  financialTerms: ParsedFinancialTerms;
  territory?: string;
  exclusivity?: ParsedExclusivity;
  termination?: ParsedTermination;
  additionalClauses?: ParsedAdditionalClause[];
  confidence: number; // 0-100 indicating how confident the extraction is
}

/**
 * System prompt for extracting structured fields from contract text
 */
const CONTRACT_FIELD_EXTRACTION_PROMPT = `
You are parsing a music industry contract to extract ALL information into structured fields.
Your goal is to extract every detail from the contract text into a clean, structured format.

Extract the following information:

1. CONTRACT TYPE: Determine the contract type (collaboration, licensing, touring, production, business, management, publishing, or other)

2. PARTIES: Extract all parties mentioned with:
   - Name (person or company name)
   - Role (artist, label, producer, brand, manager, publisher, or other)
   - Email (if mentioned)
   - Address (if mentioned)
   - Company (if the party represents a company)

3. PROJECT DETAILS:
   - Title (project/album/song name)
   - Description (what the contract is about)
   - Deliverables (list of what must be delivered)

4. DATES:
   - Effective date (when contract starts) - use YYYY-MM-DD format
   - End date (when contract ends) - use YYYY-MM-DD format
   - Delivery date (when deliverables are due) - use YYYY-MM-DD format
   - Milestones (key dates with descriptions)

5. FINANCIAL TERMS:
   - Advance amount (upfront payment)
   - Currency (USD, GBP, EUR, etc.)
   - Royalty splits (who gets what percentage)
   - Fees (any other fees with descriptions and amounts)
   - Payment schedule (when payments are made)

6. TERRITORY & RIGHTS:
   - Territory (geographic scope: worldwide, specific countries, etc.)

7. EXCLUSIVITY:
   - Is it exclusive?
   - Exclusivity period
   - Scope of exclusivity

8. TERMINATION:
   - Notice period required
   - Termination conditions

9. ADDITIONAL CLAUSES:
   - Any special terms, NDAs, non-competes, or unique provisions

Return your response as valid JSON matching this exact schema:
{
  "contractType": "collaboration|licensing|touring|production|business|management|publishing|other",
  "title": "Contract title (generate from context if not explicit)",
  "parties": [
    {
      "name": "Party name",
      "role": "artist|label|producer|brand|manager|publisher|other",
      "email": "email@example.com or null",
      "address": "Address or null",
      "company": "Company name or null"
    }
  ],
  "projectDetails": {
    "title": "Project title or null",
    "description": "Brief description of the project",
    "deliverables": ["List", "of", "deliverables"]
  },
  "dates": {
    "effectiveDate": "YYYY-MM-DD or null",
    "endDate": "YYYY-MM-DD or null",
    "deliveryDate": "YYYY-MM-DD or null",
    "milestones": [{ "description": "...", "date": "YYYY-MM-DD" }]
  },
  "financialTerms": {
    "advanceAmount": 0,
    "currency": "USD",
    "royaltySplits": [{ "party": "...", "percentage": 50, "type": "net/gross" }],
    "fees": [{ "description": "...", "amount": 0, "currency": "USD" }],
    "paymentSchedule": "Description of payment schedule"
  },
  "territory": "Worldwide or specific regions",
  "exclusivity": {
    "isExclusive": true,
    "period": "Duration of exclusivity",
    "scope": "What the exclusivity covers"
  },
  "termination": {
    "noticePeriod": "30 days, etc.",
    "conditions": ["List of termination conditions"]
  },
  "additionalClauses": [
    {
      "title": "Clause title",
      "content": "Summary of the clause"
    }
  ],
  "confidence": 85
}

Important notes:
- Extract actual values from the text, don't make up information
- Use null for fields that aren't mentioned in the contract
- Set confidence (0-100) based on how complete the extraction is
- For dates, always use YYYY-MM-DD format
- For monetary values, extract just the number (no currency symbols)
- If a party role isn't clear, use "other"
- Generate a reasonable title from parties/project if not explicitly stated
`;

/**
 * Parse contract text to extract structured fields using AI
 */
export async function parseContractFields(contractText: string): Promise<ParsedContractFields> {
  const startTime = Date.now();
  let lastError: any;

  for (let attempt = 0; attempt < CONFIG.maxRetries; attempt++) {
    try {
      console.log(`[AI] Field extraction attempt ${attempt + 1}/${CONFIG.maxRetries}`);

      const response = await getOpenAIClient().chat.completions.create({
        model: CONFIG.model,
        messages: [
          { role: 'system', content: CONTRACT_FIELD_EXTRACTION_PROMPT },
          { role: 'user', content: `Extract all contract information from the following text:\n\n${contractText}` }
        ],
        temperature: 0.2, // Lower temperature for more consistent extraction
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
      let parsedFields: ParsedContractFields;
      try {
        parsedFields = JSON.parse(content);
      } catch (parseError) {
        console.error('[AI] JSON parse error:', parseError);
        throw new OpenAIError(
          'Invalid JSON response from AI',
          'PARSE_ERROR',
          true
        );
      }

      // Validate and normalize the response
      parsedFields = normalizeContractFields(parsedFields);

      console.log(`[AI] Field extraction complete: ${response.usage?.total_tokens} tokens, ${processingTime}ms`);

      return parsedFields;
    } catch (error: any) {
      lastError = error;
      console.error(`[AI] Field extraction attempt ${attempt + 1} failed:`, error.message);

      if (!isRetryableError(error) && !(error instanceof OpenAIError && error.retryable)) {
        break;
      }

      if (attempt < CONFIG.maxRetries - 1) {
        const delay = getRetryDelay(attempt);
        console.log(`[AI] Retrying in ${Math.round(delay)}ms...`);
        await sleep(delay);
      }
    }
  }

  const processingTime = Date.now() - startTime;
  console.error(`[AI] Field extraction failed after ${CONFIG.maxRetries} attempts (${processingTime}ms)`);

  if (lastError.status === 429) {
    throw new OpenAIError(
      'AI service is currently busy. Please try again in a few minutes.',
      'RATE_LIMITED'
    );
  }

  throw new OpenAIError(
    'Failed to extract contract fields. Please try again later.',
    'EXTRACTION_ERROR'
  );
}

/**
 * Normalize and validate extracted contract fields
 */
function normalizeContractFields(fields: any): ParsedContractFields {
  // Ensure required fields have defaults
  const normalized: ParsedContractFields = {
    contractType: validateContractType(fields.contractType) || 'other',
    title: fields.title || 'Untitled Contract',
    parties: normalizeParties(fields.parties),
    projectDetails: {
      title: fields.projectDetails?.title || null,
      description: fields.projectDetails?.description || null,
      deliverables: Array.isArray(fields.projectDetails?.deliverables)
        ? fields.projectDetails.deliverables
        : [],
    },
    dates: normalizeDates(fields.dates),
    financialTerms: normalizeFinancialTerms(fields.financialTerms),
    territory: fields.territory || null,
    exclusivity: fields.exclusivity ? {
      isExclusive: Boolean(fields.exclusivity.isExclusive),
      period: fields.exclusivity.period || null,
      scope: fields.exclusivity.scope || null,
    } : undefined,
    termination: fields.termination ? {
      noticePeriod: fields.termination.noticePeriod || null,
      conditions: Array.isArray(fields.termination.conditions)
        ? fields.termination.conditions
        : [],
    } : undefined,
    additionalClauses: normalizeAdditionalClauses(fields.additionalClauses),
    confidence: typeof fields.confidence === 'number'
      ? Math.min(100, Math.max(0, fields.confidence))
      : 50,
  };

  return normalized;
}

function validateContractType(type: string): ParsedContractFields['contractType'] | null {
  const validTypes = ['collaboration', 'licensing', 'touring', 'production', 'business', 'management', 'publishing', 'other'];
  return validTypes.includes(type) ? type as ParsedContractFields['contractType'] : null;
}

function normalizeParties(parties: any[]): ParsedContractParty[] {
  if (!Array.isArray(parties)) return [];

  return parties.map(p => ({
    name: p.name || 'Unknown Party',
    role: validatePartyRole(p.role) || 'other',
    email: p.email || undefined,
    address: p.address || undefined,
    company: p.company || undefined,
  })).filter(p => p.name !== 'Unknown Party' || p.email || p.company);
}

function validatePartyRole(role: string): ParsedContractParty['role'] | null {
  const validRoles = ['artist', 'label', 'producer', 'brand', 'manager', 'publisher', 'other'];
  return validRoles.includes(role) ? role as ParsedContractParty['role'] : null;
}

function normalizeDates(dates: any): ParsedContractDates {
  if (!dates) return {};

  return {
    effectiveDate: normalizeDate(dates.effectiveDate),
    endDate: normalizeDate(dates.endDate),
    deliveryDate: normalizeDate(dates.deliveryDate),
    milestones: Array.isArray(dates.milestones)
      ? dates.milestones.map((m: any) => ({
          description: m.description || '',
          date: normalizeDate(m.date) || '',
        })).filter((m: any) => m.description && m.date)
      : undefined,
  };
}

function normalizeDate(date: any): string | undefined {
  if (!date) return undefined;
  // Try to parse and reformat to YYYY-MM-DD
  try {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString().split('T')[0];
  } catch {
    return undefined;
  }
}

function normalizeFinancialTerms(terms: any): ParsedFinancialTerms {
  if (!terms) return {};

  return {
    advanceAmount: typeof terms.advanceAmount === 'number' ? terms.advanceAmount : undefined,
    currency: terms.currency || 'USD',
    royaltySplits: Array.isArray(terms.royaltySplits)
      ? terms.royaltySplits.map((s: any) => ({
          party: s.party || 'Unknown',
          percentage: typeof s.percentage === 'number' ? s.percentage : 0,
          type: s.type || undefined,
        }))
      : undefined,
    fees: Array.isArray(terms.fees)
      ? terms.fees.map((f: any) => ({
          description: f.description || 'Fee',
          amount: typeof f.amount === 'number' ? f.amount : 0,
          currency: f.currency || terms.currency || 'USD',
        }))
      : undefined,
    paymentSchedule: terms.paymentSchedule || undefined,
  };
}

function normalizeAdditionalClauses(clauses: any[]): ParsedAdditionalClause[] | undefined {
  if (!Array.isArray(clauses)) return undefined;

  const normalized = clauses
    .map(c => ({
      title: c.title || 'Additional Clause',
      content: c.content || '',
    }))
    .filter(c => c.content);

  return normalized.length > 0 ? normalized : undefined;
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
