import { describe, it, expect } from 'vitest';
import {
  signatureRequests,
  signatories,
  insertSignatureRequestSchema,
  insertSignatorySchema,
  type SignatureRequest,
  type Signatory,
  type InsertSignatureRequest,
  type InsertSignatory,
  type SignatureRequestStatus,
  type SignatoryStatus,
  type SigningOrder,
} from '../schema';

describe('Signature Schema Types', () => {
  describe('SignatureRequest table', () => {
    it('exports signatureRequests table with correct columns', () => {
      expect(signatureRequests).toBeDefined();

      // Check required columns exist
      const columns = Object.keys(signatureRequests);
      expect(columns).toContain('id');
      expect(columns).toContain('contractId');
      expect(columns).toContain('initiatorId');
      expect(columns).toContain('docusealDocumentId');
      expect(columns).toContain('status');
      expect(columns).toContain('signingOrder');
      expect(columns).toContain('message');
      expect(columns).toContain('expiresAt');
      expect(columns).toContain('completedAt');
      expect(columns).toContain('signedPdfPath');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });

    it('exports insert schema that validates required fields', () => {
      expect(insertSignatureRequestSchema).toBeDefined();

      // Valid input
      const validInput = {
        contractId: 'contract-123',
        initiatorId: 'user-456',
        status: 'pending',
      };

      const result = insertSignatureRequestSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('insert schema rejects missing required fields', () => {
      const invalidInput = {
        // Missing contractId and initiatorId
        status: 'pending',
      };

      const result = insertSignatureRequestSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Signatories table', () => {
    it('exports signatories table with correct columns', () => {
      expect(signatories).toBeDefined();

      const columns = Object.keys(signatories);
      expect(columns).toContain('id');
      expect(columns).toContain('signatureRequestId');
      expect(columns).toContain('docusealRequestId');
      expect(columns).toContain('signingToken');
      expect(columns).toContain('signingUrl');
      expect(columns).toContain('email');
      expect(columns).toContain('name');
      expect(columns).toContain('userId');
      expect(columns).toContain('signingOrder');
      expect(columns).toContain('status');
      expect(columns).toContain('signedAt');
      expect(columns).toContain('createdAt');
    });

    it('exports insert schema that validates required fields', () => {
      expect(insertSignatorySchema).toBeDefined();

      const validInput = {
        signatureRequestId: 'request-123',
        email: 'signer@example.com',
        name: 'John Signer',
      };

      const result = insertSignatorySchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('insert schema rejects missing required fields', () => {
      const invalidInput = {
        signatureRequestId: 'request-123',
        // Missing email and name
      };

      const result = insertSignatorySchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('insert schema accepts optional userId', () => {
      const validInput = {
        signatureRequestId: 'request-123',
        email: 'signer@example.com',
        name: 'John Signer',
        userId: 'user-789', // Optional field
      };

      const result = insertSignatorySchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });

  describe('Type exports', () => {
    it('SignatureRequest type is exported and usable', () => {
      // This test validates the type export at compile time
      const mockRequest: SignatureRequest = {
        id: 'test-id',
        contractId: 'contract-123',
        initiatorId: 'user-456',
        docusealDocumentId: null,
        status: 'pending',
        signingOrder: 'sequential',
        message: null,
        expiresAt: null,
        completedAt: null,
        signedPdfPath: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(mockRequest.id).toBe('test-id');
      expect(mockRequest.status).toBe('pending');
    });

    it('Signatory type is exported and usable', () => {
      const mockSignatory: Signatory = {
        id: 'sig-id',
        signatureRequestId: 'request-123',
        docusealRequestId: null,
        signingToken: null,
        signingUrl: null,
        email: 'signer@example.com',
        name: 'Test Signer',
        userId: null,
        signingOrder: 1,
        status: 'pending',
        signedAt: null,
        createdAt: new Date(),
      };

      expect(mockSignatory.email).toBe('signer@example.com');
      expect(mockSignatory.signingOrder).toBe(1);
    });

    it('status type unions include all expected values', () => {
      // These compile-time checks validate the type unions
      const requestStatuses: SignatureRequestStatus[] = [
        'pending',
        'in_progress',
        'completed',
        'expired',
        'cancelled',
      ];
      expect(requestStatuses).toHaveLength(5);

      const signatoryStatuses: SignatoryStatus[] = [
        'waiting',
        'pending',
        'signed',
      ];
      expect(signatoryStatuses).toHaveLength(3);

      const signingOrders: SigningOrder[] = [
        'sequential',
        'parallel',
      ];
      expect(signingOrders).toHaveLength(2);
    });
  });

  describe('InsertSignatureRequest type', () => {
    it('allows optional fields', () => {
      const minimalRequest: InsertSignatureRequest = {
        contractId: 'contract-123',
        initiatorId: 'user-456',
      };

      expect(minimalRequest.contractId).toBe('contract-123');
      expect(minimalRequest.initiatorId).toBe('user-456');
    });

    it('accepts all optional fields', () => {
      const fullRequest: InsertSignatureRequest = {
        contractId: 'contract-123',
        initiatorId: 'user-456',
        docusealDocumentId: 'docuseal-789',
        status: 'in_progress',
        signingOrder: 'parallel',
        message: 'Please sign this contract',
        expiresAt: new Date(),
        completedAt: null,
        signedPdfPath: '/path/to/signed.pdf',
      };

      expect(fullRequest.message).toBe('Please sign this contract');
      expect(fullRequest.signingOrder).toBe('parallel');
    });
  });

  describe('InsertSignatory type', () => {
    it('allows optional fields', () => {
      const minimalSignatory: InsertSignatory = {
        signatureRequestId: 'request-123',
        email: 'signer@example.com',
        name: 'John Signer',
      };

      expect(minimalSignatory.email).toBe('signer@example.com');
    });

    it('accepts all optional fields', () => {
      const fullSignatory: InsertSignatory = {
        signatureRequestId: 'request-123',
        docusealRequestId: 'docuseal-sig-456',
        signingToken: 'token-xyz',
        signingUrl: 'https://docuseal.example/sign/token-xyz',
        email: 'signer@example.com',
        name: 'John Signer',
        userId: 'user-789',
        signingOrder: 2,
        status: 'waiting',
        signedAt: null,
      };

      expect(fullSignatory.signingUrl).toContain('docuseal');
      expect(fullSignatory.signingOrder).toBe(2);
    });
  });
});
