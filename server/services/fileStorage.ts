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

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload contract file: ${result.error.message}`);
  }

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

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload signed PDF: ${result.error.message}`);
  }

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

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload background image: ${result.error.message}`);
  }

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

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload avatar image: ${result.error.message}`);
  }

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

// ============================================
// TRACK AUDIO STORAGE (Music Store Feature)
// ============================================

/**
 * Upload original track audio file
 */
export async function uploadTrackAudio(
  userId: string,
  trackId: string,
  buffer: Buffer,
  extension: string
): Promise<UploadResult> {
  const path = `tracks/${userId}/${trackId}/original.${extension}`;

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload track audio: ${result.error.message}`);
  }

  return {
    path,
    size: buffer.length
  };
}

/**
 * Upload generated preview (30-second clip)
 */
export async function uploadTrackPreview(
  userId: string,
  trackId: string,
  buffer: Buffer,
  extension: string
): Promise<UploadResult> {
  const path = `tracks/${userId}/${trackId}/preview.${extension}`;

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload track preview: ${result.error.message}`);
  }

  return {
    path,
    size: buffer.length
  };
}

/**
 * Upload track cover art
 */
export async function uploadTrackCover(
  userId: string,
  trackId: string,
  buffer: Buffer,
  extension: string
): Promise<UploadResult> {
  const timestamp = Date.now();
  const path = `tracks/${userId}/${trackId}/cover-${timestamp}.${extension}`;

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload track cover: ${result.error.message}`);
  }

  return {
    path,
    size: buffer.length
  };
}

/**
 * Download track file (original or preview)
 */
export async function downloadTrackFile(path: string): Promise<Buffer> {
  const result = await getStorage().downloadAsBytes(path);

  if (result.error) {
    throw new Error(`Failed to download track file: ${result.error.message}`);
  }

  return result.value![0];
}

/**
 * Stream track file for download (avoids loading entire file into memory)
 */
export function streamTrackFile(path: string): import('stream').Readable {
  return getStorage().downloadAsStream(path);
}

/**
 * Delete track files (original, preview, cover)
 */
export async function deleteTrackFiles(userId: string, trackId: string): Promise<void> {
  const basePath = `tracks/${userId}/${trackId}`;

  // Try to delete all possible track files
  const filesToDelete = [
    `${basePath}/original.mp3`,
    `${basePath}/original.wav`,
    `${basePath}/preview.mp3`,
    `${basePath}/preview.wav`
  ];

  for (const filePath of filesToDelete) {
    try {
      await getStorage().delete(filePath);
    } catch {
      // Ignore errors for files that don't exist
    }
  }

  // List and delete any cover images
  try {
    const listResult = await getStorage().list({ prefix: `${basePath}/cover-` });
    if (!listResult.error && listResult.value) {
      for (const item of listResult.value) {
        await getStorage().delete(item.name);
      }
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Get audio content type from format
 */
export function getAudioContentType(format: string): string {
  const types: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav'
  };
  return types[format.toLowerCase()] || 'audio/mpeg';
}

// ============================================
// DISTRIBUTION TRACK STORAGE (Independent Entity)
// ============================================

export async function uploadDistributionAudio(
  userId: string,
  trackId: string,
  buffer: Buffer,
  extension: string
): Promise<UploadResult> {
  const path = `distribution/${userId}/${trackId}/original.${extension}`;

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload distribution audio: ${result.error.message}`);
  }

  return { path, size: buffer.length };
}

export async function uploadDistributionPreview(
  userId: string,
  trackId: string,
  buffer: Buffer,
  extension: string
): Promise<UploadResult> {
  const path = `distribution/${userId}/${trackId}/preview.${extension}`;

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload distribution preview: ${result.error.message}`);
  }

  return { path, size: buffer.length };
}

export async function uploadDistributionCover(
  userId: string,
  trackId: string,
  buffer: Buffer,
  extension: string
): Promise<UploadResult> {
  const timestamp = Date.now();
  const path = `distribution/${userId}/${trackId}/cover-${timestamp}.${extension}`;

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload distribution cover: ${result.error.message}`);
  }

  return { path, size: buffer.length };
}

export async function deleteDistributionFiles(userId: string, trackId: string): Promise<void> {
  const basePath = `distribution/${userId}/${trackId}`;

  try {
    const listResult = await getStorage().list({ prefix: basePath });
    if (!listResult.error && listResult.value) {
      for (const item of listResult.value) {
        await getStorage().delete(item.name);
      }
    }
  } catch {
    // Ignore errors
  }
}

// ============================================
// MERCH PRODUCT IMAGE STORAGE
// ============================================

/**
 * Upload a merch product image
 */
export async function uploadMerchImage(
  userId: string,
  productId: string,
  buffer: Buffer,
  extension: string
): Promise<UploadResult> {
  const timestamp = Date.now();
  const path = `merch/${userId}/${productId}/${timestamp}.${extension}`;

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload merch image: ${result.error.message}`);
  }

  return {
    path,
    size: buffer.length
  };
}

/**
 * Download a merch product image
 */
export async function downloadMerchImage(path: string): Promise<Buffer> {
  const result = await getStorage().downloadAsBytes(path);

  if (result.error) {
    throw new Error(`Failed to download merch image: ${result.error.message}`);
  }

  return result.value![0];
}

/**
 * Delete a merch product image
 */
export async function deleteMerchImage(path: string): Promise<void> {
  try {
    await getStorage().delete(path);
  } catch {
    // Ignore errors for files that don't exist
  }
}

// ============================================
// PROPOSAL CONTRACT STORAGE (Epic 13)
// ============================================

/**
 * Upload contract file attached to a proposal
 */
export async function uploadProposalContract(
  proposalId: string,
  buffer: Buffer,
  originalFilename: string
): Promise<UploadResult> {
  const extension = originalFilename.split('.').pop()?.toLowerCase() || 'pdf';
  const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `proposals/${proposalId}/${sanitizedFilename}`;

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload proposal contract: ${result.error.message}`);
  }

  return {
    path,
    size: buffer.length
  };
}

/**
 * Download contract file from a proposal
 */
export async function downloadProposalContract(path: string): Promise<Buffer> {
  const result = await getStorage().downloadAsBytes(path);

  if (result.error) {
    throw new Error(`Failed to download proposal contract: ${result.error.message}`);
  }

  return result.value![0];
}

/**
 * Delete contract file from a proposal
 */
export async function deleteProposalContract(path: string): Promise<void> {
  const result = await getStorage().delete(path);

  if (result.error) {
    throw new Error(`Failed to delete proposal contract: ${result.error.message}`);
  }
}

// ============================================
// VIDEO BACKGROUND STORAGE (Spotify Canvas Style)
// ============================================

/**
 * Upload video background (WebM format - primary)
 */
export async function uploadBackgroundVideo(
  userId: string,
  landingPageId: string,
  buffer: Buffer,
  format: 'webm' | 'mp4'
): Promise<UploadResult> {
  const timestamp = Date.now();
  const path = `landing-pages/${userId}/${landingPageId}/background-video-${timestamp}.${format}`;

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload background video: ${result.error.message}`);
  }

  return {
    path,
    size: buffer.length
  };
}

/**
 * Upload video fallback (MP4 format for browser compatibility)
 */
export async function uploadBackgroundVideoFallback(
  userId: string,
  landingPageId: string,
  buffer: Buffer
): Promise<UploadResult> {
  const timestamp = Date.now();
  const path = `landing-pages/${userId}/${landingPageId}/background-video-fallback-${timestamp}.mp4`;

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload video fallback: ${result.error.message}`);
  }

  return {
    path,
    size: buffer.length
  };
}

/**
 * Upload video background poster frame (JPEG)
 */
export async function uploadBackgroundVideoPoster(
  userId: string,
  landingPageId: string,
  buffer: Buffer
): Promise<UploadResult> {
  const timestamp = Date.now();
  const path = `landing-pages/${userId}/${landingPageId}/background-video-poster-${timestamp}.jpg`;

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload video poster: ${result.error.message}`);
  }

  return {
    path,
    size: buffer.length
  };
}

/**
 * Custom error class for storage operations to distinguish error types
 */
export class StorageError extends Error {
  public code: 'NOT_FOUND' | 'SERVICE_UNAVAILABLE' | 'UNKNOWN';
  public retryable: boolean;

  constructor(message: string, code: 'NOT_FOUND' | 'SERVICE_UNAVAILABLE' | 'UNKNOWN', retryable: boolean = false) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.retryable = retryable;
  }
}

/**
 * Helper to determine if a storage error is retryable
 */
function isRetryableStorageError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';

  // Connection/network errors are retryable
  if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT' || error?.code === 'ENOTFOUND') {
    return true;
  }

  // Service unavailable errors
  if (errorMessage.includes('service unavailable') || errorMessage.includes('503')) {
    return true;
  }

  // Rate limiting
  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return true;
  }

  // Temporary failures
  if (errorMessage.includes('temporary') || errorMessage.includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Helper to determine if error indicates file not found
 */
function isNotFoundError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  return errorMessage.includes('not found') ||
         errorMessage.includes('no such') ||
         errorMessage.includes('does not exist') ||
         errorMessage.includes('404');
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Download video background file with retry logic for transient failures
 */
export async function downloadBackgroundVideo(path: string): Promise<Buffer> {
  const maxRetries = 3;
  const baseDelay = 500; // Start with 500ms delay
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await getStorage().downloadAsBytes(path);

      if (result.error) {
        // Check if it's a not-found error (don't retry)
        if (isNotFoundError(result.error)) {
          throw new StorageError(
            `Video not found: ${path}`,
            'NOT_FOUND',
            false
          );
        }

        // Check if it's a retryable error
        if (isRetryableStorageError(result.error)) {
          lastError = result.error;
          if (attempt < maxRetries - 1) {
            const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
            console.log(`[STORAGE] Retry ${attempt + 1}/${maxRetries} for video download after ${delay}ms: ${path}`);
            await sleep(delay);
            continue;
          }
        }

        // Non-retryable error
        throw new StorageError(
          `Failed to download video background: ${result.error.message}`,
          'SERVICE_UNAVAILABLE',
          false
        );
      }

      // Success
      if (attempt > 0) {
        console.log(`[STORAGE] Video download succeeded on retry ${attempt + 1}: ${path}`);
      }
      return result.value![0];

    } catch (error: any) {
      // If it's already a StorageError and not retryable, throw immediately
      if (error instanceof StorageError && !error.retryable) {
        throw error;
      }

      lastError = error;

      // Check if the caught error is retryable
      if (isRetryableStorageError(error) && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[STORAGE] Retry ${attempt + 1}/${maxRetries} for video download after ${delay}ms: ${path}`);
        await sleep(delay);
        continue;
      }

      // Not retryable or last attempt
      if (isNotFoundError(error)) {
        throw new StorageError(`Video not found: ${path}`, 'NOT_FOUND', false);
      }

      break;
    }
  }

  // All retries exhausted
  console.error(`[STORAGE] Video download failed after ${maxRetries} attempts: ${path}`, lastError);
  throw new StorageError(
    'Video storage service temporarily unavailable. Please try again.',
    'SERVICE_UNAVAILABLE',
    true
  );
}

/**
 * Delete video background files (both WebM and MP4 fallback)
 */
export async function deleteBackgroundVideoFiles(userId: string, landingPageId: string): Promise<void> {
  const basePath = `landing-pages/${userId}/${landingPageId}`;

  // List and delete any video files
  try {
    const listResult = await getStorage().list({ prefix: `${basePath}/background-video` });
    if (!listResult.error && listResult.value) {
      for (const item of listResult.value) {
        await getStorage().delete(item.name);
      }
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Get video content type from format
 */
export function getVideoContentType(format: string): string {
  const types: Record<string, string> = {
    webm: 'video/webm',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg'
  };
  return types[format.toLowerCase()] || 'video/mp4';
}

// ============================================
// ARTIST VIDEO STORAGE (Video Store Feature)
// ============================================

/**
 * Upload artist video file
 */
export async function uploadArtistVideo(
  userId: string,
  videoId: string,
  buffer: Buffer,
  format: string
): Promise<UploadResult> {
  const path = `videos/${userId}/${videoId}/original.${format}`;

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload artist video: ${result.error.message}`);
  }

  return {
    path,
    size: buffer.length
  };
}

/**
 * Upload artist video preview (10-second clip)
 */
export async function uploadArtistVideoPreview(
  userId: string,
  videoId: string,
  buffer: Buffer,
  format: string
): Promise<UploadResult> {
  const path = `videos/${userId}/${videoId}/preview.${format}`;

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload artist video preview: ${result.error.message}`);
  }

  return {
    path,
    size: buffer.length
  };
}

/**
 * Upload artist video thumbnail
 */
export async function uploadArtistVideoThumbnail(
  userId: string,
  videoId: string,
  buffer: Buffer,
  extension: string
): Promise<UploadResult> {
  const path = `videos/${userId}/${videoId}/thumbnail.${extension}`;

  const result = await getStorage().uploadFromBytes(path, buffer);
  if (result.error) {
    throw new Error(`Failed to upload artist video thumbnail: ${result.error.message}`);
  }

  return {
    path,
    size: buffer.length
  };
}

/**
 * Download artist video file
 */
export async function downloadArtistVideoFile(path: string): Promise<Buffer> {
  const result = await getStorage().downloadAsBytes(path);

  if (result.error) {
    throw new Error(`Failed to download video file: ${result.error.message}`);
  }

  return result.value![0];
}

/**
 * Download artist video file to a temporary file on disk
 * Returns the temp file path - caller must clean up
 */
export async function downloadArtistVideoToFile(storagePath: string): Promise<string> {
  const os = await import('os');
  const path = await import('path');
  const fs = await import('fs');

  const tmpDir = os.default.tmpdir();
  const ext = storagePath.split('.').pop() || 'mp4';
  const tmpFile = path.default.join(tmpDir, `video-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);

  const result = await getStorage().downloadToFilename(storagePath, tmpFile);

  if (result.error) {
    // Clean up if file was partially created
    try { fs.default.unlinkSync(tmpFile); } catch {}
    throw new Error(`Failed to download video file: ${result.error.message}`);
  }

  return tmpFile;
}

/**
 * Delete all files for an artist video
 */
export async function deleteArtistVideoFiles(userId: string, videoId: string): Promise<void> {
  const basePath = `videos/${userId}/${videoId}`;

  try {
    const listResult = await getStorage().list({ prefix: basePath });
    if (!listResult.error && listResult.value) {
      for (const item of listResult.value) {
        await getStorage().delete(item.name);
      }
    }
  } catch {
    // Ignore errors
  }
}
