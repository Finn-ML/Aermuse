# Story 4.1: DocuSeal Integration Service

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 4.1 |
| **Epic** | Epic 4: E-Signing System |
| **Title** | DocuSeal Integration Service |
| **Priority** | P0 - Critical |
| **Story Points** | 5 |
| **Status** | Drafted |

## User Story

**As a** developer
**I want** a service layer for DocuSeal API communication
**So that** all signing operations go through a consistent interface

## Context

This foundational story creates the TypeScript service that wraps all DocuSeal API calls. All other e-signing stories depend on this service for document upload, signature request creation, and signed PDF retrieval.

**DocuSeal API Base URL:** `https://docu-seal-host--finn107.replit.app/api`

**Dependencies:**
- DocuSeal API key (environment variable)
- No other Aermuse stories required first

## Acceptance Criteria

- [ ] **AC-1:** DocuSeal client service class created
- [ ] **AC-2:** API key configuration via environment variable
- [ ] **AC-3:** Document upload (PDF buffer → DocuSeal)
- [ ] **AC-4:** Get document with signature requests
- [ ] **AC-5:** Download signed document as Buffer
- [ ] **AC-6:** Create single signature request
- [ ] **AC-7:** Create batch signature requests (multi-signer)
- [ ] **AC-8:** Get signature request status
- [ ] **AC-9:** Register/list/delete webhooks
- [ ] **AC-10:** TypeScript types for all API requests/responses
- [ ] **AC-11:** Error handling with meaningful messages
- [ ] **AC-12:** Request timeout and retry logic

## Technical Requirements

### Files to Create

| File | Purpose |
|------|---------|
| `server/services/docuseal.ts` | Main service class |
| `server/services/docuseal.types.ts` | TypeScript interfaces |
| `server/services/docuseal.test.ts` | Unit tests |

### Implementation

#### TypeScript Types

```typescript
// server/services/docuseal.types.ts

// Document Types
export interface DocuSealDocument {
  id: string;
  filename: string;
  status: string;
  pageCount?: number;
  createdAt: string;
}

export interface DocumentWithRequests extends DocuSealDocument {
  signatureRequests: SignatureRequestResponse[];
}

// Signature Position
export interface SignaturePosition {
  page: number;    // 1-indexed page number
  x: number;       // X position from left (pixels)
  y: number;       // Y position from top (pixels)
  width: number;   // Signature width
  height: number;  // Signature height
}

// Single Signature Request
export interface CreateSignatureRequestInput {
  documentId: string;
  signerName: string;
  signerEmail: string;
  signaturePosition?: SignaturePosition;
  signingOrder?: number;
  expiresAt?: string;  // ISO datetime
}

export interface SignatureRequestResponse {
  id: string;
  documentId: string;
  signerName: string;
  signerEmail: string;
  signingToken: string;
  signingUrl: string;
  signingOrder: number;
  status: 'pending' | 'waiting' | 'signed' | 'expired';
  createdAt: string;
}

// Batch Signature Request
export interface BatchSigner {
  signerName: string;
  signerEmail: string;
  signingOrder: number;
  signaturePosition?: SignaturePosition;
}

export interface CreateBatchRequestInput {
  documentId: string;
  signers: BatchSigner[];
  expiresAt?: string;
}

export interface BatchSignatureResponse {
  documentId: string;
  totalSigners: number;
  signatureRequests: SignatureRequestResponse[];
}

// Webhook Types
export interface WebhookRegistrationInput {
  url: string;
  events: WebhookEvent[];
}

export type WebhookEvent =
  | 'document.uploaded'
  | 'signature.requested'
  | 'signature.batch_requested'
  | 'signature.completed'
  | 'signature.next_signer_ready'
  | 'document.completed';

export interface WebhookRegistration {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;  // Only returned on creation
  isActive: boolean;
  createdAt: string;
}

export interface WebhookListItem {
  id: string;
  url: string;
  events: WebhookEvent[];
  isActive: boolean;
  createdAt: string;
}

// Error Types
export interface DocuSealError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}
```

#### Service Implementation

```typescript
// server/services/docuseal.ts
import crypto from 'crypto';
import {
  DocuSealDocument,
  DocumentWithRequests,
  CreateSignatureRequestInput,
  SignatureRequestResponse,
  CreateBatchRequestInput,
  BatchSignatureResponse,
  WebhookRegistrationInput,
  WebhookRegistration,
  WebhookListItem,
  DocuSealError,
} from './docuseal.types';

const DEFAULT_BASE_URL = 'https://docu-seal-host--finn107.replit.app/api';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export class DocuSealServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DocuSealServiceError';
  }
}

interface DocuSealConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export class DocuSealService {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config: DocuSealConfig) {
    if (!config.apiKey) {
      throw new Error('DocuSeal API key is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries || MAX_RETRIES;
  }

  /**
   * Make an API request with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        })) as DocuSealError;

        // Retry on 5xx errors
        if (response.status >= 500 && retries < this.maxRetries) {
          await this.delay(RETRY_DELAY * (retries + 1));
          return this.request<T>(endpoint, options, retries + 1);
        }

        throw new DocuSealServiceError(
          error.message || 'DocuSeal API error',
          response.status,
          error.details
        );
      }

      // Handle empty responses (DELETE)
      const text = await response.text();
      if (!text) return {} as T;

      return JSON.parse(text);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DocuSealServiceError) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        throw new DocuSealServiceError('Request timeout', 408);
      }

      // Retry on network errors
      if (retries < this.maxRetries) {
        await this.delay(RETRY_DELAY * (retries + 1));
        return this.request<T>(endpoint, options, retries + 1);
      }

      throw new DocuSealServiceError(
        `Network error: ${(error as Error).message}`,
        0
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================
  // DOCUMENT OPERATIONS
  // ============================================

  /**
   * Upload a PDF document to DocuSeal
   */
  async uploadDocument(pdfBuffer: Buffer, filename: string): Promise<DocuSealDocument> {
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([pdfBuffer], { type: 'application/pdf' }),
      filename
    );

    const response = await fetch(`${this.baseUrl}/documents`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Failed to upload document',
      }));
      throw new DocuSealServiceError(error.message, response.status);
    }

    return response.json();
  }

  /**
   * Get document details with signature requests
   */
  async getDocument(documentId: string): Promise<DocumentWithRequests> {
    return this.request<DocumentWithRequests>(`/documents/${documentId}`);
  }

  /**
   * List all documents
   */
  async listDocuments(): Promise<DocuSealDocument[]> {
    return this.request<DocuSealDocument[]>('/documents');
  }

  /**
   * Download signed document as Buffer
   */
  async downloadSignedDocument(documentId: string): Promise<Buffer> {
    const response = await fetch(
      `${this.baseUrl}/documents/${documentId}/download`,
      {
        headers: {
          'X-API-Key': this.apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new DocuSealServiceError(
        'Failed to download signed document',
        response.status
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ============================================
  // SIGNATURE REQUEST OPERATIONS
  // ============================================

  /**
   * Create a single signature request
   */
  async createSignatureRequest(
    input: CreateSignatureRequestInput
  ): Promise<SignatureRequestResponse> {
    return this.request<SignatureRequestResponse>('/signature-requests', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Create batch signature requests (multi-signer with order)
   */
  async createBatchSignatureRequests(
    input: CreateBatchRequestInput
  ): Promise<BatchSignatureResponse> {
    return this.request<BatchSignatureResponse>('/signature-requests/batch', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Get signature request by ID
   */
  async getSignatureRequest(requestId: string): Promise<SignatureRequestResponse> {
    return this.request<SignatureRequestResponse>(
      `/signature-requests/${requestId}`
    );
  }

  /**
   * List all signature requests
   */
  async listSignatureRequests(): Promise<SignatureRequestResponse[]> {
    return this.request<SignatureRequestResponse[]>('/signature-requests');
  }

  // ============================================
  // WEBHOOK OPERATIONS
  // ============================================

  /**
   * Register a new webhook
   * Note: The secret is only returned once on creation
   */
  async registerWebhook(
    input: WebhookRegistrationInput
  ): Promise<WebhookRegistration> {
    return this.request<WebhookRegistration>('/webhooks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * List all registered webhooks
   */
  async listWebhooks(): Promise<WebhookListItem[]> {
    return this.request<WebhookListItem[]>('/webhooks');
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request<void>(`/webhooks/${webhookId}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature =
      'sha256=' +
      crypto.createHmac('sha256', secret).update(payload).digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

// Create singleton instance
let instance: DocuSealService | null = null;

export function getDocuSealService(): DocuSealService {
  if (!instance) {
    const apiKey = process.env.DOCUSEAL_API_KEY;
    if (!apiKey) {
      throw new Error('DOCUSEAL_API_KEY environment variable is not set');
    }
    instance = new DocuSealService({
      apiKey,
      baseUrl: process.env.DOCUSEAL_BASE_URL,
    });
  }
  return instance;
}

// Named export for convenience
export const docuseal = {
  get service() {
    return getDocuSealService();
  },
  verifyWebhookSignature: DocuSealService.verifyWebhookSignature,
};
```

### Environment Variables

```bash
# .env
DOCUSEAL_API_KEY=sk_live_your_api_key_here
DOCUSEAL_BASE_URL=https://docu-seal-host--finn107.replit.app/api
```

### Usage Examples

```typescript
import { docuseal } from './services/docuseal';

// Upload document
const doc = await docuseal.service.uploadDocument(pdfBuffer, 'contract.pdf');
console.log('Uploaded:', doc.id);

// Create batch signature request
const batch = await docuseal.service.createBatchSignatureRequests({
  documentId: doc.id,
  signers: [
    { signerName: 'John Doe', signerEmail: 'john@example.com', signingOrder: 1 },
    { signerName: 'Jane Smith', signerEmail: 'jane@example.com', signingOrder: 2 },
  ],
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
});

// Send signing URLs to signers
batch.signatureRequests.forEach(req => {
  console.log(`${req.signerName}: ${req.signingUrl}`);
});

// Download signed document (after completion)
const signedPdf = await docuseal.service.downloadSignedDocument(doc.id);
fs.writeFileSync('signed_contract.pdf', signedPdf);
```

## Definition of Done

- [ ] DocuSealService class fully implemented
- [ ] All TypeScript types defined and exported
- [ ] Environment variable configuration working
- [ ] Error handling with DocuSealServiceError class
- [ ] Timeout and retry logic implemented
- [ ] Webhook signature verification working
- [ ] Unit tests passing (mock API responses)
- [ ] Integration test with actual DocuSeal API
- [ ] Documentation with usage examples

## Testing Checklist

### Unit Tests

```typescript
// server/services/docuseal.test.ts
import { DocuSealService, DocuSealServiceError } from './docuseal';

describe('DocuSealService', () => {
  let service: DocuSealService;

  beforeEach(() => {
    service = new DocuSealService({ apiKey: 'test-key' });
  });

  describe('constructor', () => {
    it('throws if API key is missing', () => {
      expect(() => new DocuSealService({ apiKey: '' }))
        .toThrow('DocuSeal API key is required');
    });

    it('uses default base URL if not provided', () => {
      const s = new DocuSealService({ apiKey: 'key' });
      expect(s['baseUrl']).toBe('https://docu-seal-host--finn107.replit.app/api');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('returns true for valid signature', () => {
      const payload = '{"event":"test"}';
      const secret = 'test-secret';
      const signature = 'sha256=' +
        require('crypto').createHmac('sha256', secret).update(payload).digest('hex');

      expect(DocuSealService.verifyWebhookSignature(payload, signature, secret))
        .toBe(true);
    });

    it('returns false for invalid signature', () => {
      expect(DocuSealService.verifyWebhookSignature('payload', 'sha256=invalid', 'secret'))
        .toBe(false);
    });
  });

  // Mock fetch for API tests
  describe('uploadDocument', () => {
    it('uploads PDF and returns document', async () => {
      // Mock implementation
    });
  });

  describe('createBatchSignatureRequests', () => {
    it('creates batch request with multiple signers', async () => {
      // Mock implementation
    });
  });
});
```

### Integration Tests

- [ ] Upload real PDF document
- [ ] Create signature request
- [ ] Verify signing URL is accessible
- [ ] Download signed document (requires manual signing)

## Related Documents

- [Epic 4 Tech Spec](./tech-spec-epic-4.md)
- [Story 4.4: Signature Request API](./4-4-signature-request-api.md)
- [Story 4.5: Webhook Handler](./4-5-webhook-handler.md)
