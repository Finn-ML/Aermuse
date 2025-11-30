// Shared TypeScript types for Signature API (Epic 4: E-Signing)
// These types are used by both client and server

// ============================================
// SIGNATURE REQUEST DTOs
// ============================================

export interface SignatureRequestDTO {
  id: string;
  contractId: string;
  initiatorId: string;
  docusealDocumentId: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'expired' | 'cancelled';
  signingOrder: 'sequential' | 'parallel';
  message: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  signedPdfPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignatoryDTO {
  id: string;
  signatureRequestId: string;
  docusealRequestId: string | null;
  signingToken: string | null;
  signingUrl: string | null;
  email: string;
  name: string;
  userId: string | null;
  signingOrder: number;
  status: 'waiting' | 'pending' | 'signed';
  signedAt: string | null;
  createdAt: string;
}

// ============================================
// COMPOSITE TYPES
// ============================================

export interface SignatureRequestWithSignatories extends SignatureRequestDTO {
  signatories: SignatoryDTO[];
}

export interface SignatureRequestWithContract extends SignatureRequestDTO {
  contract: {
    id: string;
    name: string;
    type: string;
  };
  signatories: SignatoryDTO[];
}

// ============================================
// INPUT TYPES (for API requests)
// ============================================

export interface CreateSignatureRequestInput {
  contractId: string;
  signatories: {
    name: string;
    email: string;
  }[];
  signingOrder?: 'sequential' | 'parallel';
  message?: string;
  expiresAt?: string;
}

export interface UpdateSignatoryStatusInput {
  signatoryId: string;
  status: 'waiting' | 'pending' | 'signed';
  signedAt?: string;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface SignatureRequestListResponse {
  requests: SignatureRequestWithSignatories[];
  total: number;
}

export interface PendingSignaturesResponse {
  toSign: (SignatoryDTO & {
    signatureRequest: SignatureRequestDTO;
    contract: {
      id: string;
      name: string;
      type: string;
    };
  })[];
  total: number;
}
