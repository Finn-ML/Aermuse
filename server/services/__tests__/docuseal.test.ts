import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { DocuSealService, DocuSealServiceError } from '../docuseal';

describe('DocuSealService', () => {
  let service: DocuSealService;
  const mockApiKey = 'test-api-key-12345';

  beforeEach(() => {
    service = new DocuSealService({ apiKey: mockApiKey });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('throws if API key is missing', () => {
      expect(() => new DocuSealService({ apiKey: '' }))
        .toThrow('DocuSeal API key is required');
    });

    it('throws if API key is undefined', () => {
      expect(() => new DocuSealService({ apiKey: undefined as unknown as string }))
        .toThrow('DocuSeal API key is required');
    });

    it('uses default base URL if not provided', () => {
      const s = new DocuSealService({ apiKey: 'key' });
      expect(s['baseUrl']).toBe('https://docu-seal-host--finn107.replit.app/api');
    });

    it('uses custom base URL when provided', () => {
      const customUrl = 'https://custom.docuseal.api/v1';
      const s = new DocuSealService({ apiKey: 'key', baseUrl: customUrl });
      expect(s['baseUrl']).toBe(customUrl);
    });

    it('uses default timeout if not provided', () => {
      const s = new DocuSealService({ apiKey: 'key' });
      expect(s['timeout']).toBe(30000);
    });

    it('uses custom timeout when provided', () => {
      const s = new DocuSealService({ apiKey: 'key', timeout: 60000 });
      expect(s['timeout']).toBe(60000);
    });

    it('uses default maxRetries if not provided', () => {
      const s = new DocuSealService({ apiKey: 'key' });
      expect(s['maxRetries']).toBe(3);
    });

    it('uses custom maxRetries when provided', () => {
      const s = new DocuSealService({ apiKey: 'key', maxRetries: 5 });
      expect(s['maxRetries']).toBe(5);
    });
  });

  describe('DocuSealServiceError', () => {
    it('creates error with message only', () => {
      const error = new DocuSealServiceError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBeUndefined();
      expect(error.details).toBeUndefined();
      expect(error.name).toBe('DocuSealServiceError');
    });

    it('creates error with message and status code', () => {
      const error = new DocuSealServiceError('Not found', 404);
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
    });

    it('creates error with message, status code, and details', () => {
      const details = { field: 'email', issue: 'invalid format' };
      const error = new DocuSealServiceError('Validation error', 400, details);
      expect(error.message).toBe('Validation error');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
    });

    it('is instanceof Error', () => {
      const error = new DocuSealServiceError('Test');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof DocuSealServiceError).toBe(true);
    });
  });

  describe('verifyWebhookSignature', () => {
    const secret = 'webhook-secret-key';
    const payload = '{"event":"signature.completed","data":{"id":"123"}}';

    it('returns true for valid signature', () => {
      const expectedSignature = 'sha256=' +
        crypto.createHmac('sha256', secret).update(payload).digest('hex');

      expect(DocuSealService.verifyWebhookSignature(payload, expectedSignature, secret))
        .toBe(true);
    });

    it('returns false for invalid signature', () => {
      expect(DocuSealService.verifyWebhookSignature(payload, 'sha256=invalid', secret))
        .toBe(false);
    });

    it('returns false for empty signature', () => {
      expect(DocuSealService.verifyWebhookSignature(payload, '', secret))
        .toBe(false);
    });

    it('returns false for signature without sha256 prefix', () => {
      const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      expect(DocuSealService.verifyWebhookSignature(payload, hash, secret))
        .toBe(false);
    });

    it('returns false for mismatched payload', () => {
      const signature = 'sha256=' +
        crypto.createHmac('sha256', secret).update('different payload').digest('hex');

      expect(DocuSealService.verifyWebhookSignature(payload, signature, secret))
        .toBe(false);
    });

    it('returns false for wrong secret', () => {
      const signature = 'sha256=' +
        crypto.createHmac('sha256', 'wrong-secret').update(payload).digest('hex');

      expect(DocuSealService.verifyWebhookSignature(payload, signature, secret))
        .toBe(false);
    });

    it('handles different payload contents', () => {
      const testPayloads = [
        '{}',
        '{"simple":"json"}',
        'plain text',
        '{"nested":{"data":{"deep":true}}}',
        'unicode: ñ é ü'
      ];

      for (const p of testPayloads) {
        const sig = 'sha256=' +
          crypto.createHmac('sha256', secret).update(p).digest('hex');
        expect(DocuSealService.verifyWebhookSignature(p, sig, secret)).toBe(true);
      }
    });
  });

  describe('API request methods (mock fetch)', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
    });

    describe('getDocument', () => {
      it('makes GET request with correct headers', async () => {
        const mockResponse = {
          id: 'doc-123',
          filename: 'contract.pdf',
          status: 'uploaded',
          signatureRequests: []
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        });

        const result = await service.getDocument('doc-123');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://docu-seal-host--finn107.replit.app/api/documents/doc-123',
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-API-Key': mockApiKey,
              'Content-Type': 'application/json',
            }),
          })
        );
        expect(result).toEqual(mockResponse);
      });

      it('throws DocuSealServiceError on 404', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: () => Promise.resolve({ message: 'Document not found' }),
        });

        await expect(service.getDocument('nonexistent'))
          .rejects.toThrow(DocuSealServiceError);
      });
    });

    describe('listDocuments', () => {
      it('returns array of documents', async () => {
        const mockDocs = [
          { id: 'doc-1', filename: 'a.pdf', status: 'uploaded', createdAt: '2024-01-01' },
          { id: 'doc-2', filename: 'b.pdf', status: 'signed', createdAt: '2024-01-02' },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(mockDocs)),
        });

        const result = await service.listDocuments();
        expect(result).toEqual(mockDocs);
        expect(result).toHaveLength(2);
      });
    });

    describe('createSignatureRequest', () => {
      it('makes POST request with correct body', async () => {
        const input = {
          documentId: 'doc-123',
          signerName: 'John Doe',
          signerEmail: 'john@example.com',
        };

        const mockResponse = {
          id: 'sig-456',
          documentId: 'doc-123',
          signerName: 'John Doe',
          signerEmail: 'john@example.com',
          signingToken: 'token-abc',
          signingUrl: 'https://docuseal.example/sign/token-abc',
          signingOrder: 1,
          status: 'pending',
          createdAt: '2024-01-01T00:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        });

        const result = await service.createSignatureRequest(input);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://docu-seal-host--finn107.replit.app/api/signature-requests',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(input),
          })
        );
        expect(result.id).toBe('sig-456');
        expect(result.signingUrl).toContain('token-abc');
      });
    });

    describe('createBatchSignatureRequests', () => {
      it('creates batch request with multiple signers', async () => {
        const input = {
          documentId: 'doc-123',
          signers: [
            { signerName: 'John', signerEmail: 'john@example.com', signingOrder: 1 },
            { signerName: 'Jane', signerEmail: 'jane@example.com', signingOrder: 2 },
          ],
        };

        const mockResponse = {
          documentId: 'doc-123',
          totalSigners: 2,
          signatureRequests: [
            { id: 'sig-1', signerName: 'John', signerEmail: 'john@example.com', status: 'pending', signingOrder: 1, documentId: 'doc-123', signingToken: 't1', signingUrl: 'url1', createdAt: '2024-01-01' },
            { id: 'sig-2', signerName: 'Jane', signerEmail: 'jane@example.com', status: 'waiting', signingOrder: 2, documentId: 'doc-123', signingToken: 't2', signingUrl: 'url2', createdAt: '2024-01-01' },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        });

        const result = await service.createBatchSignatureRequests(input);

        expect(result.totalSigners).toBe(2);
        expect(result.signatureRequests).toHaveLength(2);
        expect(result.signatureRequests[0].status).toBe('pending');
        expect(result.signatureRequests[1].status).toBe('waiting');
      });
    });

    describe('getSignatureRequest', () => {
      it('fetches single signature request by ID', async () => {
        const mockResponse = {
          id: 'sig-123',
          documentId: 'doc-456',
          signerName: 'John Doe',
          signerEmail: 'john@example.com',
          signingToken: 'token',
          signingUrl: 'https://sign.url',
          signingOrder: 1,
          status: 'signed',
          createdAt: '2024-01-01',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        });

        const result = await service.getSignatureRequest('sig-123');
        expect(result.id).toBe('sig-123');
        expect(result.status).toBe('signed');
      });
    });

    describe('listSignatureRequests', () => {
      it('returns array of signature requests', async () => {
        const mockRequests = [
          { id: 'sig-1', status: 'pending', documentId: 'd1', signerName: 'A', signerEmail: 'a@a.com', signingToken: 't1', signingUrl: 'u1', signingOrder: 1, createdAt: '2024-01-01' },
          { id: 'sig-2', status: 'signed', documentId: 'd2', signerName: 'B', signerEmail: 'b@b.com', signingToken: 't2', signingUrl: 'u2', signingOrder: 1, createdAt: '2024-01-02' },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(mockRequests)),
        });

        const result = await service.listSignatureRequests();
        expect(result).toHaveLength(2);
      });
    });

    describe('registerWebhook', () => {
      it('registers webhook and returns secret', async () => {
        const input = {
          url: 'https://my-app.com/webhooks/docuseal',
          events: ['signature.completed' as const, 'document.completed' as const],
        };

        const mockResponse = {
          id: 'wh-123',
          url: input.url,
          events: input.events,
          secret: 'webhook-secret-xyz',
          isActive: true,
          createdAt: '2024-01-01',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        });

        const result = await service.registerWebhook(input);
        expect(result.id).toBe('wh-123');
        expect(result.secret).toBe('webhook-secret-xyz');
        expect(result.events).toContain('signature.completed');
      });
    });

    describe('listWebhooks', () => {
      it('returns array of webhooks without secrets', async () => {
        const mockWebhooks = [
          { id: 'wh-1', url: 'https://a.com/hook', events: ['signature.completed'], isActive: true, createdAt: '2024-01-01' },
          { id: 'wh-2', url: 'https://b.com/hook', events: ['document.completed'], isActive: false, createdAt: '2024-01-02' },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(mockWebhooks)),
        });

        const result = await service.listWebhooks();
        expect(result).toHaveLength(2);
        expect(result[0]).not.toHaveProperty('secret');
      });
    });

    describe('deleteWebhook', () => {
      it('makes DELETE request', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(''),
        });

        await expect(service.deleteWebhook('wh-123')).resolves.not.toThrow();

        expect(mockFetch).toHaveBeenCalledWith(
          'https://docu-seal-host--finn107.replit.app/api/webhooks/wh-123',
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });

    describe('retry logic', () => {
      it('retries on 500 error', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: () => Promise.resolve({ message: 'Server error' }),
          })
          .mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(JSON.stringify({ id: 'doc-123' })),
          });

        const result = await service.getDocument('doc-123');
        expect(result.id).toBe('doc-123');
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('throws after max retries on persistent 500', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ message: 'Server error' }),
        });

        await expect(service.getDocument('doc-123'))
          .rejects.toThrow(DocuSealServiceError);

        // 1 initial + 3 retries = 4 total calls
        expect(mockFetch).toHaveBeenCalledTimes(4);
      }, 15000);

      it('does not retry on 400 client error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: () => Promise.resolve({ message: 'Invalid input' }),
        });

        await expect(service.createSignatureRequest({
          documentId: '',
          signerName: '',
          signerEmail: '',
        })).rejects.toThrow(DocuSealServiceError);

        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    describe('error handling', () => {
      it('throws with meaningful message on API error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: () => Promise.resolve({ message: 'Invalid API key' }),
        });

        try {
          await service.getDocument('doc-123');
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(DocuSealServiceError);
          expect((error as DocuSealServiceError).message).toBe('Invalid API key');
          expect((error as DocuSealServiceError).statusCode).toBe(403);
        }
      });

      it('handles non-JSON error responses', async () => {
        // Use 400 to avoid retry logic (5xx triggers retries)
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: () => Promise.reject(new Error('Not JSON')),
        });

        try {
          await service.getDocument('doc-123');
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(DocuSealServiceError);
          expect((error as DocuSealServiceError).message).toContain('400');
        }
      });
    });
  });

  describe('uploadDocument', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
    });

    it('uploads PDF with correct FormData', async () => {
      const pdfBuffer = Buffer.from('fake-pdf-content');
      const filename = 'test-contract.pdf';

      const mockResponse = {
        id: 'doc-new',
        filename: 'test-contract.pdf',
        status: 'uploaded',
        createdAt: '2024-01-01',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.uploadDocument(pdfBuffer, filename);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://docu-seal-host--finn107.replit.app/api/documents',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-Key': mockApiKey,
          }),
        })
      );
      expect(result.id).toBe('doc-new');
      expect(result.filename).toBe('test-contract.pdf');
    });

    it('throws on upload failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 413,
        json: () => Promise.resolve({ message: 'File too large' }),
      });

      await expect(service.uploadDocument(Buffer.from('x'), 'large.pdf'))
        .rejects.toThrow('File too large');
    });
  });

  describe('downloadSignedDocument', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
    });

    it('returns Buffer with PDF content', async () => {
      const pdfContent = Buffer.from('signed-pdf-bytes');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(pdfContent.buffer.slice(
          pdfContent.byteOffset,
          pdfContent.byteOffset + pdfContent.byteLength
        )),
      });

      const result = await service.downloadSignedDocument('doc-123');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://docu-seal-host--finn107.replit.app/api/documents/doc-123/download',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': mockApiKey,
          }),
        })
      );
    });

    it('throws on download failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(service.downloadSignedDocument('nonexistent'))
        .rejects.toThrow('Failed to download signed document');
    });
  });

  describe('healthCheck', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
    });

    it('returns status object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      });

      const result = await service.healthCheck();
      expect(result.status).toBe('ok');
    });

    it('throws on health check failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(service.healthCheck())
        .rejects.toThrow('Health check failed');
    });
  });
});
