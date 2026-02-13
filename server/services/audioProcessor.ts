import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobePath from '@ffprobe-installer/ffprobe';
import { PassThrough } from 'stream';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

// Set FFmpeg and FFprobe paths
ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

export interface AudioMetadata {
  duration: number; // seconds
  format: string;
  bitrate?: number;
}

export interface PreviewResult {
  buffer: Buffer;
  duration: number; // seconds
}

/**
 * Write buffer to a temp file and return the path.
 * Caller is responsible for cleanup via cleanupTempFile().
 */
async function writeToTempFile(buffer: Buffer, extension: string): Promise<string> {
  const tempPath = join(tmpdir(), `audio-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`);
  await writeFile(tempPath, buffer);
  return tempPath;
}

/**
 * Clean up a temp file (ignores errors if file doesn't exist)
 */
async function cleanupTempFile(tempPath: string): Promise<void> {
  try { await unlink(tempPath); } catch {}
}

/**
 * Get audio metadata (duration, format, bitrate).
 * Uses a temp file because ffprobe cannot determine WAV duration from piped stdin.
 */
export async function getAudioMetadata(buffer: Buffer): Promise<AudioMetadata> {
  const tempPath = await writeToTempFile(buffer, 'audio');
  try {
    return await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(tempPath, (err, metadata) => {
        if (err) {
          console.error('[AUDIO] Failed to probe audio file:', err);
          return reject(new Error('Failed to read audio metadata'));
        }

        const format = metadata.format;
        const rawDuration = Number(format.duration);
        const duration = isFinite(rawDuration) && rawDuration > 0 ? Math.round(rawDuration) : 0;
        const formatName = format.format_name || 'unknown';
        const rawBitrate = Number(format.bit_rate);
        const bitrate = isFinite(rawBitrate) && rawBitrate > 0 ? Math.round(rawBitrate / 1000) : undefined;

        resolve({
          duration,
          format: formatName.includes('mp3') ? 'mp3' : formatName.includes('wav') ? 'wav' : formatName,
          bitrate
        });
      });
    });
  } finally {
    await cleanupTempFile(tempPath);
  }
}

/**
 * Generate a 30-second preview from the original track.
 * - If track is longer than 45 seconds, starts 15 seconds in
 * - Otherwise starts from the beginning
 * - Includes 2-second fade in/out for smooth preview
 * Uses a temp file because ffmpeg/ffprobe cannot reliably seek in WAV streams.
 */
export async function generatePreview(
  inputBuffer: Buffer,
  format: 'mp3' | 'wav',
  previewDuration: number = 30,
  startSeconds?: number
): Promise<PreviewResult> {
  // Write to temp file for reliable ffprobe + ffmpeg processing
  const tempPath = await writeToTempFile(inputBuffer, format);

  try {
    // Get the duration to determine start position
    let trackDuration: number;
    try {
      const metadata = await getAudioMetadata(inputBuffer);
      trackDuration = metadata.duration;
    } catch {
      // If we can't get metadata, assume it's long enough
      trackDuration = 120;
    }

    // Determine start position and actual preview duration
    let startTime = 0;
    let actualDuration = previewDuration;

    if (trackDuration <= previewDuration) {
      // Track is shorter than preview length, use entire track
      actualDuration = trackDuration;
      startTime = 0;
    } else if (startSeconds !== undefined) {
      // User-specified start position
      const maxStart = Math.max(0, trackDuration - previewDuration);
      startTime = Math.max(0, Math.min(startSeconds, maxStart));
    } else if (trackDuration > 45) {
      // Auto-select: start 15 seconds in for longer tracks
      startTime = 15;
      // Make sure we don't go past the end
      if (startTime + previewDuration > trackDuration) {
        startTime = Math.max(0, trackDuration - previewDuration);
      }
    }

    // Ensure we have a valid duration for the preview
    if (actualDuration <= 0) {
      actualDuration = Math.min(previewDuration, trackDuration > 0 ? trackDuration : previewDuration);
    }

    console.log(`[AUDIO] Generating ${actualDuration}s preview starting at ${startTime}s (track is ${trackDuration}s)`);

    return await new Promise((resolve, reject) => {
      const outputStream = new PassThrough();
      const chunks: Buffer[] = [];

      outputStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      outputStream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`[AUDIO] Preview generated: ${buffer.length} bytes`);
        resolve({
          buffer,
          duration: actualDuration
        });
      });
      outputStream.on('error', (err) => {
        console.error('[AUDIO] Preview generation failed:', err);
        reject(err);
      });

      // Build the FFmpeg command using the temp file (not a stream)
      const command = ffmpeg(tempPath);

      // Set start time if needed
      if (startTime > 0) {
        command.setStartTime(startTime);
      }

      // Set duration
      command.setDuration(actualDuration);

      // Apply fade in/out if preview is long enough
      if (actualDuration >= 6) {
        const fadeOutStart = actualDuration - 2;
        command.audioFilters([
          'afade=t=in:st=0:d=2',      // 2-second fade in
          `afade=t=out:st=${fadeOutStart}:d=2`  // 2-second fade out
        ]);
      }

      // Output settings
      if (format === 'mp3') {
        command
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .format('mp3');
      } else {
        command
          .audioCodec('pcm_s16le')
          .format('wav');
      }

      command
        .on('error', (err) => {
          console.error('[AUDIO] FFmpeg error:', err);
          reject(new Error(`FFmpeg processing failed: ${err.message}`));
        })
        .pipe(outputStream);
    });
  } finally {
    await cleanupTempFile(tempPath);
  }
}

/**
 * Convert audio format (e.g., WAV to MP3)
 * Useful if we want to always serve MP3 previews regardless of original format
 */
export async function convertToMp3(
  inputBuffer: Buffer,
  inputFormat: 'mp3' | 'wav'
): Promise<Buffer> {
  if (inputFormat === 'mp3') {
    return inputBuffer; // Already MP3
  }

  const tempPath = await writeToTempFile(inputBuffer, 'wav');
  try {
    return await new Promise((resolve, reject) => {
      const outputStream = new PassThrough();
      const chunks: Buffer[] = [];

      outputStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      outputStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      outputStream.on('error', reject);

      ffmpeg(tempPath)
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .format('mp3')
        .on('error', (err) => {
          console.error('[AUDIO] Conversion failed:', err);
          reject(new Error(`Audio conversion failed: ${err.message}`));
        })
        .pipe(outputStream);
    });
  } finally {
    await cleanupTempFile(tempPath);
  }
}

/**
 * Validate that FFmpeg is available and working
 */
export async function validateFfmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err, formats) => {
      if (err) {
        console.error('[AUDIO] FFmpeg not available:', err);
        resolve(false);
      } else {
        console.log('[AUDIO] FFmpeg available with', Object.keys(formats).length, 'formats');
        resolve(true);
      }
    });
  });
}
