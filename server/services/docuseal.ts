// DocuSeal Integration Service
// Story 4.1: DocuSeal Integration Service

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

// ============================================
// ERROR CLASS
// ============================================

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

// ============================================
// SERVICE CONFIGURATION
// ============================================

interface DocuSealConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

// ============================================
// DOCUSEAL SERVICE CLASS
// ============================================

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

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/documents`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: 'Failed to upload document',
        }));
        throw new DocuSealServiceError(error.message, response.status);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DocuSealServiceError) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        throw new DocuSealServiceError('Upload timeout', 408);
      }

      throw new DocuSealServiceError(
        `Upload error: ${(error as Error).message}`,
        0
      );
    }
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(
        `${this.baseUrl}/documents/${documentId}/download`,
        {
          headers: {
            'X-API-Key': this.apiKey,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new DocuSealServiceError(
          'Failed to download signed document',
          response.status
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DocuSealServiceError) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        throw new DocuSealServiceError('Download timeout', 408);
      }

      throw new DocuSealServiceError(
        `Download error: ${(error as Error).message}`,
        0
      );
    }
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
   * Verify webhook signature using HMAC-SHA256
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw new DocuSealServiceError(
        `Health check failed: ${(error as Error).message}`,
        0
      );
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

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
