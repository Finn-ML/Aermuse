import { Client } from '@replit/object-storage';

// Lazy initialization to avoid startup errors when Object Storage is not configured
let storage: Client | null = null;

function getStorage(): Client {
  if (!storage) {
    try {
      // Use explicit bucket name if env var not set
      const bucketName = process.env.REPLIT_OBJECT_STORAGE_BUCKET || 'CrushingTragicVolume';
      storage = new Client({ bucketId: bucketName });
      console.log(`[STORAGE] Initialized with bucket: ${bucketName}`);
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
