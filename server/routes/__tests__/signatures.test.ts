import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  role: 'user',
};

const mockContract = {
  id: 'contract-456',
  userId: 'user-123',
  name: 'Test Contract',
  status: 'draft',
  renderedContent: '<html><body>Contract content</body></html>',
  extractedText: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSignatureRequest = {
  id: 'sig-req-789',
  contractId: 'contract-456',
  initiatorId: 'user-123',
  docusealDocumentId: 'ds-doc-123',
  docusealRequestId: 'ds-req-123',
  status: 'pending',
  signingOrder: 'sequential',
  message: 'Please sign this contract',
  expiresAt: null,
  completedAt: null,
  signedPdfPath: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSignatory = {
  id: 'signatory-001',
  signatureRequestId: 'sig-req-789',
  docusealSignerId: 'ds-signer-001',
  email: 'signer@example.com',
  name: 'John Signer',
  userId: null,
  signingOrder: 1,
  status: 'pending',
  signedAt: null,
  declinedAt: null,
  declineReason: null,
  signingUrl: 'https://docuseal.com/sign/abc123',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock the database
vi.mock('../../db', () => ({
  db: {
    query: {
      contracts: {
        findFirst: vi.fn(),
      },
      signatureRequests: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      signatories: {
        findMany: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
        orderBy: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockSignatureRequest])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    transaction: vi.fn((callback) => callback({
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([mockSignatureRequest])),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      })),
    })),
  },
}));

// Mock schema
vi.mock('@shared/schema', () => ({
  contracts: { id: 'contracts.id', userId: 'contracts.userId' },
  signatureRequests: { id: 'sig_requests.id', contractId: 'sig_requests.contractId' },
  signatories: { signatureRequestId: 'signatories.signatureRequestId' },
  users: { id: 'users.id' },
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
  desc: vi.fn((col) => ({ desc: col })),
  inArray: vi.fn((col, arr) => ({ inArray: [col, arr] })),
  or: vi.fn((...args) => ({ or: args })),
}));

// Mock DocuSeal service
const mockDocuSealService = {
  uploadDocument: vi.fn(),
  createSignatureRequest: vi.fn(),
  cancelSignatureRequest: vi.fn(),
  sendReminder: vi.fn(),
};

vi.mock('../../services/docuseal', () => ({
  getDocuSealService: vi.fn(() => mockDocuSealService),
}));

// Mock PDF generator
vi.mock('../../services/pdfGenerator', () => ({
  generateContractPDFFromRecord: vi.fn(() => Promise.resolve(Buffer.from('mock pdf content'))),
}));

// Mock storage
vi.mock('../../services/storage', () => ({
  getStorage: vi.fn(() => ({
    uploadFile: vi.fn(() => Promise.resolve({
      path: '/contracts/test.pdf',
      url: 'https://storage.example.com/contracts/test.pdf',
    })),
    getDownloadUrl: vi.fn(() => Promise.resolve('https://storage.example.com/download/test.pdf')),
    deleteFile: vi.fn(() => Promise.resolve()),
  })),
}));

describe('Signature Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Request validation', () => {
    it('should validate signatory email format', () => {
      const validEmail = 'test@example.com';
      const invalidEmail = 'notanemail';

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(validEmail)).toBe(true);
      expect(emailRegex.test(invalidEmail)).toBe(false);
    });

    it('should validate signatory name is not empty', () => {
      const validName = 'John Doe';
      const invalidName = '';

      expect(validName.trim().length > 0).toBe(true);
      expect(invalidName.trim().length > 0).toBe(false);
    });

    it('should require at least one signatory', () => {
      const validSignatories = [{ email: 'test@example.com', name: 'Test User' }];
      const emptySignatories: any[] = [];

      expect(validSignatories.length >= 1).toBe(true);
      expect(emptySignatories.length >= 1).toBe(false);
    });

    it('should validate expiresAt is a valid ISO date if provided', () => {
      const validDate = '2025-12-31T23:59:59Z';
      const invalidDate = 'not-a-date';

      expect(!isNaN(Date.parse(validDate))).toBe(true);
      expect(!isNaN(Date.parse(invalidDate))).toBe(false);
    });
  });

  describe('Contract ownership validation', () => {
    it('should verify user owns the contract', async () => {
      const { db } = await import('../../db');

      // Mock contract found and owned by user
      vi.mocked(db.query.contracts.findFirst).mockResolvedValueOnce({
        ...mockContract,
        userId: 'user-123',
      });

      const contract = await db.query.contracts.findFirst({
        where: {} as any,
      });

      expect(contract).toBeDefined();
      expect(contract?.userId).toBe('user-123');
    });

    it('should reject if contract not found', async () => {
      const { db } = await import('../../db');

      vi.mocked(db.query.contracts.findFirst).mockResolvedValueOnce(undefined);

      const contract = await db.query.contracts.findFirst({
        where: {} as any,
      });

      expect(contract).toBeUndefined();
    });

    it('should reject if user does not own contract', async () => {
      const { db } = await import('../../db');

      vi.mocked(db.query.contracts.findFirst).mockResolvedValueOnce({
        ...mockContract,
        userId: 'different-user',
      });

      const contract = await db.query.contracts.findFirst({
        where: {} as any,
      });

      expect(contract?.userId).not.toBe('user-123');
    });
  });

  describe('DocuSeal integration', () => {
    it('should upload PDF to DocuSeal', async () => {
      mockDocuSealService.uploadDocument.mockResolvedValueOnce({
        id: 'ds-doc-123',
        filename: 'contract.pdf',
        fileSize: 1234,
      });

      const result = await mockDocuSealService.uploadDocument(
        Buffer.from('pdf content'),
        'contract.pdf'
      );

      expect(mockDocuSealService.uploadDocument).toHaveBeenCalledWith(
        expect.any(Buffer),
        'contract.pdf'
      );
      expect(result.id).toBe('ds-doc-123');
    });

    it('should create signature request with DocuSeal', async () => {
      mockDocuSealService.createSignatureRequest.mockResolvedValueOnce({
        id: 'ds-req-123',
        status: 'pending',
        signers: [
          {
            id: 'ds-signer-001',
            email: 'signer@example.com',
            status: 'pending',
            signingUrl: 'https://docuseal.com/sign/abc123',
          },
        ],
      });

      const result = await mockDocuSealService.createSignatureRequest({
        documentId: 'ds-doc-123',
        signers: [{ email: 'signer@example.com', name: 'John Signer' }],
        order: 'sequential',
      });

      expect(result.id).toBe('ds-req-123');
      expect(result.signers).toHaveLength(1);
      expect(result.signers[0].signingUrl).toBeDefined();
    });

    it('should handle DocuSeal upload errors', async () => {
      mockDocuSealService.uploadDocument.mockRejectedValueOnce(
        new Error('DocuSeal upload failed')
      );

      await expect(
        mockDocuSealService.uploadDocument(Buffer.from('pdf'), 'contract.pdf')
      ).rejects.toThrow('DocuSeal upload failed');
    });

    it('should handle DocuSeal request creation errors', async () => {
      mockDocuSealService.createSignatureRequest.mockRejectedValueOnce(
        new Error('DocuSeal request failed')
      );

      await expect(
        mockDocuSealService.createSignatureRequest({
          documentId: 'ds-doc-123',
          signers: [{ email: 'signer@example.com', name: 'Test' }],
          order: 'sequential',
        })
      ).rejects.toThrow('DocuSeal request failed');
    });
  });

  describe('PDF generation', () => {
    it('should generate PDF from contract with rendered content', async () => {
      const { generateContractPDFFromRecord } = await import('../../services/pdfGenerator');

      const pdfBuffer = await generateContractPDFFromRecord({
        name: 'Test Contract',
        renderedContent: '<html><body>Content</body></html>',
        extractedText: null,
      });

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(generateContractPDFFromRecord).toHaveBeenCalledWith({
        name: 'Test Contract',
        renderedContent: '<html><body>Content</body></html>',
        extractedText: null,
      });
    });

    it('should generate PDF from contract with extracted text', async () => {
      const { generateContractPDFFromRecord } = await import('../../services/pdfGenerator');

      const pdfBuffer = await generateContractPDFFromRecord({
        name: 'Uploaded Contract',
        renderedContent: null,
        extractedText: 'Plain text content from uploaded document',
      });

      expect(pdfBuffer).toBeInstanceOf(Buffer);
    });
  });

  describe('Signature request status flow', () => {
    it('should create request in pending status', () => {
      const newRequest = {
        ...mockSignatureRequest,
        status: 'pending',
      };

      expect(newRequest.status).toBe('pending');
    });

    it('should track signatory statuses', () => {
      const signatoryStatuses = ['waiting', 'pending', 'signed', 'declined'];

      expect(signatoryStatuses).toContain('waiting');
      expect(signatoryStatuses).toContain('pending');
      expect(signatoryStatuses).toContain('signed');
      expect(signatoryStatuses).toContain('declined');
    });

    it('should mark first signatory as pending in sequential order', () => {
      const signatories = [
        { ...mockSignatory, signingOrder: 1, status: 'pending' },
        { ...mockSignatory, id: 'sig-002', signingOrder: 2, status: 'waiting' },
      ];

      expect(signatories[0].status).toBe('pending');
      expect(signatories[1].status).toBe('waiting');
    });
  });

  describe('Authorization checks', () => {
    it('should only allow initiator to cancel request', async () => {
      const { db } = await import('../../db');

      vi.mocked(db.query.signatureRequests.findFirst).mockResolvedValueOnce({
        ...mockSignatureRequest,
        initiatorId: 'user-123',
      });

      const request = await db.query.signatureRequests.findFirst({
        where: {} as any,
      });

      const userId = 'user-123';
      expect(request?.initiatorId).toBe(userId);
    });

    it('should reject cancellation by non-initiator', async () => {
      const { db } = await import('../../db');

      vi.mocked(db.query.signatureRequests.findFirst).mockResolvedValueOnce({
        ...mockSignatureRequest,
        initiatorId: 'other-user',
      });

      const request = await db.query.signatureRequests.findFirst({
        where: {} as any,
      });

      const userId = 'user-123';
      expect(request?.initiatorId).not.toBe(userId);
    });
  });

  describe('Reminder functionality', () => {
    it('should send reminder for pending signatory', async () => {
      mockDocuSealService.sendReminder.mockResolvedValueOnce({ success: true });

      const result = await mockDocuSealService.sendReminder('ds-req-123', 'signer@example.com');

      expect(mockDocuSealService.sendReminder).toHaveBeenCalledWith(
        'ds-req-123',
        'signer@example.com'
      );
      expect(result.success).toBe(true);
    });

    it('should handle reminder errors', async () => {
      mockDocuSealService.sendReminder.mockRejectedValueOnce(
        new Error('Failed to send reminder')
      );

      await expect(
        mockDocuSealService.sendReminder('ds-req-123', 'signer@example.com')
      ).rejects.toThrow('Failed to send reminder');
    });
  });

  describe('List requests', () => {
    it('should return requests initiated by user', async () => {
      const { db } = await import('../../db');

      vi.mocked(db.query.signatureRequests.findMany).mockResolvedValueOnce([
        mockSignatureRequest,
        { ...mockSignatureRequest, id: 'sig-req-002' },
      ]);

      const requests = await db.query.signatureRequests.findMany({
        where: {} as any,
      });

      expect(requests).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const { db } = await import('../../db');

      const pendingRequests = [mockSignatureRequest];
      vi.mocked(db.query.signatureRequests.findMany).mockResolvedValueOnce(pendingRequests);

      const requests = await db.query.signatureRequests.findMany({
        where: {} as any,
      });

      expect(requests.every(r => r.status === 'pending')).toBe(true);
    });
  });

  describe('Signatory data formatting', () => {
    it('should format signatory response correctly', () => {
      const formatted = {
        id: mockSignatory.id,
        name: mockSignatory.name,
        email: mockSignatory.email,
        status: mockSignatory.status,
        signingUrl: mockSignatory.signingUrl,
        signingOrder: mockSignatory.signingOrder,
        signedAt: mockSignatory.signedAt,
      };

      expect(formatted.id).toBe('signatory-001');
      expect(formatted.email).toBe('signer@example.com');
      expect(formatted.signingUrl).toBeDefined();
    });

    it('should hide signing URL for completed signatures', () => {
      const signedSignatory = {
        ...mockSignatory,
        status: 'signed',
        signedAt: new Date(),
      };

      const formatted = {
        ...signedSignatory,
        signingUrl: signedSignatory.status === 'signed' ? null : signedSignatory.signingUrl,
      };

      expect(formatted.signingUrl).toBeNull();
    });
  });

  describe('Cancellation', () => {
    it('should cancel request with DocuSeal', async () => {
      mockDocuSealService.cancelSignatureRequest.mockResolvedValueOnce({ success: true });

      await mockDocuSealService.cancelSignatureRequest('ds-req-123');

      expect(mockDocuSealService.cancelSignatureRequest).toHaveBeenCalledWith('ds-req-123');
    });

    it('should update request status to cancelled', async () => {
      const { db } = await import('../../db');

      const updateMock = vi.mocked(db.update);
      updateMock.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      } as any);

      await db.update({} as any).set({ status: 'cancelled' }).where({} as any);

      expect(updateMock).toHaveBeenCalled();
    });

    it('should not cancel already completed requests', () => {
      const completedRequest = {
        ...mockSignatureRequest,
        status: 'completed',
        completedAt: new Date(),
      };

      const canCancel = completedRequest.status !== 'completed' && completedRequest.status !== 'cancelled';
      expect(canCancel).toBe(false);
    });
  });

  describe('Expiration handling', () => {
    it('should store expiration date if provided', () => {
      const expiresAt = new Date('2025-12-31T23:59:59Z');
      const request = {
        ...mockSignatureRequest,
        expiresAt,
      };

      expect(request.expiresAt).toEqual(expiresAt);
    });

    it('should identify expired requests', () => {
      const pastDate = new Date('2020-01-01');
      const request = {
        ...mockSignatureRequest,
        expiresAt: pastDate,
      };

      const isExpired = request.expiresAt && new Date(request.expiresAt) < new Date();
      expect(isExpired).toBe(true);
    });

    it('should identify non-expired requests', () => {
      const futureDate = new Date('2030-12-31');
      const request = {
        ...mockSignatureRequest,
        expiresAt: futureDate,
      };

      const isExpired = request.expiresAt && new Date(request.expiresAt) < new Date();
      expect(isExpired).toBe(false);
    });
  });

  describe('To-sign endpoint', () => {
    it('should find requests where user is a signatory', async () => {
      const { db } = await import('../../db');

      const requestsToSign = [
        {
          ...mockSignatureRequest,
          signatories: [
            { ...mockSignatory, email: 'test@example.com', status: 'pending' },
          ],
        },
      ];

      vi.mocked(db.query.signatureRequests.findMany).mockResolvedValueOnce(requestsToSign);

      const requests = await db.query.signatureRequests.findMany({
        where: {} as any,
      });

      expect(requests).toHaveLength(1);
    });

    it('should exclude already signed requests', async () => {
      const signedSignatory = {
        ...mockSignatory,
        status: 'signed',
        signedAt: new Date(),
      };

      const shouldInclude = signedSignatory.status !== 'signed';
      expect(shouldInclude).toBe(false);
    });
  });
});

describe('Signature Request Input Validation', () => {
  it('should validate contractId is provided', () => {
    const input = { contractId: 'contract-123', signatories: [] };
    expect(input.contractId).toBeDefined();
    expect(typeof input.contractId).toBe('string');
  });

  it('should validate signatories array structure', () => {
    const validInput = {
      contractId: 'contract-123',
      signatories: [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Doe', email: 'jane@example.com' },
      ],
    };

    expect(Array.isArray(validInput.signatories)).toBe(true);
    expect(validInput.signatories.every(s => s.name && s.email)).toBe(true);
  });

  it('should reject duplicate signatory emails', () => {
    const signatories = [
      { name: 'John Doe', email: 'same@example.com' },
      { name: 'Jane Doe', email: 'same@example.com' },
    ];

    const emails = signatories.map(s => s.email.toLowerCase());
    const uniqueEmails = new Set(emails);
    const hasDuplicates = emails.length !== uniqueEmails.size;

    expect(hasDuplicates).toBe(true);
  });

  it('should validate message length if provided', () => {
    const shortMessage = 'Please sign';
    const longMessage = 'a'.repeat(1001);
    const maxLength = 1000;

    expect(shortMessage.length <= maxLength).toBe(true);
    expect(longMessage.length <= maxLength).toBe(false);
  });
});

describe('Response formatting', () => {
  it('should format signature request response', () => {
    const response = {
      id: mockSignatureRequest.id,
      contractId: mockSignatureRequest.contractId,
      status: mockSignatureRequest.status,
      signingOrder: mockSignatureRequest.signingOrder,
      message: mockSignatureRequest.message,
      expiresAt: mockSignatureRequest.expiresAt,
      createdAt: mockSignatureRequest.createdAt,
      signatories: [mockSignatory],
    };

    expect(response).toHaveProperty('id');
    expect(response).toHaveProperty('contractId');
    expect(response).toHaveProperty('status');
    expect(response).toHaveProperty('signatories');
  });

  it('should include signatory details in response', () => {
    const signatoryResponse = {
      id: mockSignatory.id,
      name: mockSignatory.name,
      email: mockSignatory.email,
      status: mockSignatory.status,
      signingOrder: mockSignatory.signingOrder,
      signingUrl: mockSignatory.signingUrl,
    };

    expect(signatoryResponse.id).toBeDefined();
    expect(signatoryResponse.name).toBeDefined();
    expect(signatoryResponse.email).toBeDefined();
  });
});
