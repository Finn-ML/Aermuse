// DocuSeal API TypeScript Interfaces
// Story 4.1: DocuSeal Integration Service

// ============================================
// DOCUMENT TYPES
// ============================================

export interface DocuSealDocument {
  id: string;
  filename: string;
  status: string;
  pageCount?: number;
  createdAt: string;
  // Optional fields that may be present when document is completed
  result_url?: string;
  resultUrl?: string;
  download_url?: string;
  downloadUrl?: string;
}

export interface DocumentWithRequests extends DocuSealDocument {
  signatureRequests: SignatureRequestResponse[];
}

// ============================================
// SIGNATURE POSITION
// ============================================

export interface SignaturePosition {
  page: number;    // 1-indexed page number
  x: number;       // X position from left (pixels)
  y: number;       // Y position from top (pixels)
  width: number;   // Signature width
  height: number;  // Signature height
}

// ============================================
// SIGNATURE REQUEST TYPES
// ============================================

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

// ============================================
// BATCH SIGNATURE REQUEST TYPES
// ============================================

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

// ============================================
// WEBHOOK TYPES
// ============================================

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

// ============================================
// ERROR TYPES
// ============================================

export interface DocuSealError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}
