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
    // DocuSeal requires a 'name' field for the document
    formData.append('name', filename.replace(/\.pdf$/i, ''));

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
   * Tries multiple strategies to retrieve the signed PDF
   */
  async downloadSignedDocument(documentId: string): Promise<Buffer> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const errors: string[] = [];

    try {
      // Strategy 1: Try to get document details to find the result URL
      try {
        const docDetails = await this.getDocument(documentId);
        console.log(`[DOCUSEAL] Document details for ${documentId}:`, JSON.stringify(docDetails, null, 2));

        // Check multiple possible field names for the signed PDF URL
        const resultUrl = (docDetails as any).result_url || (docDetails as any).resultUrl ||
                          (docDetails as any).download_url || (docDetails as any).downloadUrl ||
                          (docDetails as any).signed_pdf_url || (docDetails as any).signedPdfUrl ||
                          (docDetails as any).pdf_url || (docDetails as any).pdfUrl ||
                          (docDetails as any).file_url || (docDetails as any).fileUrl;

        if (resultUrl) {
          console.log(`[DOCUSEAL] Using result_url for download: ${resultUrl}`);
          const pdfResponse = await fetch(resultUrl, { signal: controller.signal });

          if (pdfResponse.ok) {
            const arrayBuffer = await pdfResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            // Verify it's a PDF
            if (buffer.slice(0, 5).toString() === '%PDF-') {
              clearTimeout(timeoutId);
              return buffer;
            }
            console.log(`[DOCUSEAL] Response from result_url is not a PDF`);
          } else {
            errors.push(`result_url returned ${pdfResponse.status}`);
          }
        }
      } catch (docError) {
        errors.push(`getDocument failed: ${(docError as Error).message}`);
        console.log(`[DOCUSEAL] Failed to get document details: ${(docError as Error).message}`);
      }

      // Strategy 2: Try the direct download endpoint
      console.log(`[DOCUSEAL] Trying direct download endpoint`);
      try {
        const response = await fetch(
          `${this.baseUrl}/documents/${documentId}/download`,
          {
            headers: {
              'X-API-Key': this.apiKey,
              'Accept': 'application/pdf',
            },
            signal: controller.signal,
          }
        );

        const contentType = response.headers.get('content-type') || '';
        console.log(`[DOCUSEAL] Download response status: ${response.status}, content-type: ${contentType}`);

        if (response.ok) {
          // If response is JSON, it might contain a URL to the actual PDF
          if (contentType.includes('application/json')) {
            const jsonResponse = await response.json();
            console.log(`[DOCUSEAL] Download returned JSON:`, JSON.stringify(jsonResponse, null, 2));

            // Try to find a download URL in the JSON response
            const pdfUrl = jsonResponse.url || jsonResponse.download_url || jsonResponse.result_url ||
                           jsonResponse.downloadUrl || jsonResponse.resultUrl || jsonResponse.file_url ||
                           jsonResponse.signed_pdf_url || jsonResponse.signedPdfUrl;

            if (pdfUrl) {
              console.log(`[DOCUSEAL] Following PDF URL from JSON response: ${pdfUrl}`);
              const pdfResponse = await fetch(pdfUrl, { signal: controller.signal });
              if (pdfResponse.ok) {
                const arrayBuffer = await pdfResponse.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                if (buffer.slice(0, 5).toString() === '%PDF-') {
                  clearTimeout(timeoutId);
                  return buffer;
                }
              }
              errors.push(`PDF URL from JSON returned ${pdfResponse.status}`);
            }

            // Check if the JSON contains base64 PDF content
            const base64Content = jsonResponse.content || jsonResponse.pdf || jsonResponse.data ||
                                  jsonResponse.signedContent || jsonResponse.signed_content;
            if (base64Content && typeof base64Content === 'string') {
              console.log(`[DOCUSEAL] Found base64 content in JSON response`);
              const buffer = Buffer.from(base64Content, 'base64');
              if (buffer.slice(0, 5).toString() === '%PDF-') {
                clearTimeout(timeoutId);
                return buffer;
              }
            }

            errors.push('JSON response did not contain valid PDF URL or content');
          } else {
            // Assume it's the PDF directly
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            if (buffer.slice(0, 5).toString() === '%PDF-') {
              clearTimeout(timeoutId);
              return buffer;
            }
            errors.push('Download response was not a valid PDF');
          }
        } else {
          errors.push(`Download endpoint returned ${response.status}`);
        }
      } catch (downloadError) {
        errors.push(`Download endpoint failed: ${(downloadError as Error).message}`);
      }

      // Strategy 3: Try alternative endpoint patterns
      const alternativeEndpoints = [
        `/documents/${documentId}/signed`,
        `/documents/${documentId}/result`,
        `/signed-documents/${documentId}`,
        `/submissions/${documentId}/download`,
      ];

      for (const endpoint of alternativeEndpoints) {
        try {
          console.log(`[DOCUSEAL] Trying alternative endpoint: ${endpoint}`);
          const response = await fetch(`${this.baseUrl}${endpoint}`, {
            headers: {
              'X-API-Key': this.apiKey,
              'Accept': 'application/pdf',
            },
            signal: controller.signal,
          });

          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            if (buffer.slice(0, 5).toString() === '%PDF-') {
              clearTimeout(timeoutId);
              return buffer;
            }
          }
        } catch (e) {
          // Continue to next endpoint
        }
      }

      clearTimeout(timeoutId);

      // All strategies failed
      throw new DocuSealServiceError(
        `Failed to download signed document. Tried multiple strategies. Errors: ${errors.join('; ')}`,
        500
      );
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
      baseUrl: process.env.DOCUSEAL_API_URL || process.env.DOCUSEAL_BASE_URL,
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
