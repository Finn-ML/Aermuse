import { Client } from '@replit/object-storage';

// Lazy initialization to avoid startup errors when Object Storage is not configured
let storage: Client | null = null;

function getStorage(): Client {
  if (!storage) {
    try {
      // Use default Replit Object Storage - it auto-configures the bucket
      storage = new Client();
      console.log('[STORAGE] Initialized with default Replit Object Storage');
    } catch (error) {
      console.error('[STORAGE] Failed to initialize Object Storage:', error);
      throw new Error('Object Storage is not configured.');
    }
  }
  return storage;
}

export interface UploadResult {
  path: string;
  size: number;
}

export async function uploadContractFile(
  userId: string,
  contractId: string,
  buffer: Buffer,
  extension: string,
  versionSuffix?: string
): Promise<UploadResult> {
  const filename = versionSuffix ? `${versionSuffix}.${extension}` : `original.${extension}`;
  const path = `contracts/${userId}/${contractId}/${filename}`;

  await getStorage().uploadFromBytes(path, buffer);

  return {
    path,
    size: buffer.length
  };
}

export async function downloadContractFile(path: string): Promise<Buffer> {
  const result = await getStorage().downloadAsBytes(path);

  if (result.error) {
    throw new Error(`Failed to download file: ${result.error.message}`);
  }

  // result.value is [Buffer] tuple
  return result.value![0];
}

export async function deleteContractFile(path: string): Promise<void> {
  const result = await getStorage().delete(path);

  if (result.error) {
    throw new Error(`Failed to delete file: ${result.error.message}`);
  }
}

export function getContentType(extension: string): string {
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  return types[extension] || 'application/octet-stream';
}

export async function uploadSignedPdf(
  contractId: string,
  buffer: Buffer,
  filename: string
): Promise<UploadResult> {
  const path = `signed/${contractId}/${filename}`;

  await getStorage().uploadFromBytes(path, buffer);

  return {
    path,
    size: buffer.length
  };
}

export async function getSignedPdfUrl(path: string): Promise<string> {
  // For Replit Object Storage, we need to serve through our API
  return `/api/files/signed/${encodeURIComponent(path)}`;
}

export async function uploadBackgroundImage(
  userId: string,
  landingPageId: string,
  buffer: Buffer,
  extension: string
): Promise<UploadResult> {
  const timestamp = Date.now();
  const path = `landing-pages/${userId}/${landingPageId}/background-${timestamp}.${extension}`;

  await getStorage().uploadFromBytes(path, buffer);

  return {
    path,
    size: buffer.length
  };
}

export async function downloadBackgroundImage(path: string): Promise<Buffer> {
  const result = await getStorage().downloadAsBytes(path);

  if (result.error) {
    throw new Error(`Failed to download background image: ${result.error.message}`);
  }

  return result.value![0];
}

export function getImageContentType(extension: string): string {
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
  };
  return types[extension.toLowerCase()] || 'image/jpeg';
}

// Avatar image upload/download functions (Story 9.12)
export async function uploadAvatarImage(
  userId: string,
  landingPageId: string,
  buffer: Buffer,
  extension: string
): Promise<UploadResult> {
  const timestamp = Date.now();
  const path = `avatars/${userId}/${landingPageId}-${timestamp}.${extension}`;

  await getStorage().uploadFromBytes(path, buffer);

  return {
    path,
    size: buffer.length
  };
}

export async function downloadAvatarImage(path: string): Promise<Buffer> {
  const result = await getStorage().downloadAsBytes(path);

  if (result.error) {
    throw new Error(`Failed to download avatar: ${result.error.message}`);
  }

  return result.value![0];
}
