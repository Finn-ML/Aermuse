import { Client } from '@replit/object-storage';

const storage = new Client();

export interface UploadResult {
  path: string;
  size: number;
}

export async function uploadContractFile(
  userId: string,
  contractId: string,
  buffer: Buffer,
  extension: string
): Promise<UploadResult> {
  const path = `contracts/${userId}/${contractId}/original.${extension}`;

  await storage.uploadFromBytes(path, buffer);

  return {
    path,
    size: buffer.length
  };
}

export async function downloadContractFile(path: string): Promise<Buffer> {
  const result = await storage.downloadAsBytes(path);

  if (result.error) {
    throw new Error(`Failed to download file: ${result.error.message}`);
  }

  // result.value is [Buffer] tuple
  return result.value![0];
}

export async function deleteContractFile(path: string): Promise<void> {
  const result = await storage.delete(path);

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
