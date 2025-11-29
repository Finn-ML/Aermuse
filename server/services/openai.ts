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
