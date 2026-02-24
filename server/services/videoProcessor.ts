import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobePath from '@ffprobe-installer/ffprobe';
import { PassThrough } from 'stream';
import { writeFile, unlink, mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Set FFmpeg and FFprobe paths
ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

export interface VideoMetadata {
  duration: number; // seconds
  width: number;
  height: number;
  format: string;
  bitrate?: number;
}

export interface VideoProcessResult {
  buffer: Buffer;
  format: 'webm' | 'mp4';
  duration: number;
}

/**
 * Write buffer to a temp file and return its path.
 * FFmpeg needs seekable input for MP4/MOV files (moov atom may be at end).
 */
async function writeToTempFile(buffer: Buffer, extension: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'video-'));
  const filePath = join(dir, `input.${extension}`);
  await writeFile(filePath, buffer);
  return filePath;
}

/**
 * Clean up a temp file (best-effort, don't throw on failure).
 */
async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
    // Also remove the temp directory
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    const { rmdir } = await import('fs/promises');
    await rmdir(dir);
  } catch {
    // Best-effort cleanup
  }
}

/**
 * Get video metadata (duration, dimensions, format)
 */
export async function getVideoMetadata(inputPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .ffprobe((err, metadata) => {
        if (err) {
          console.error('[VIDEO] Failed to probe video file:', err);
          return reject(new Error('Failed to read video metadata'));
        }

        const format = metadata.format;
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');

        const duration = Math.round(format.duration || 0);
        const width = videoStream?.width || 0;
        const height = videoStream?.height || 0;
        const formatName = format.format_name || 'unknown';
        const bitrate = format.bit_rate ? Math.round(format.bit_rate / 1000) : undefined;

        resolve({
          duration,
          width,
          height,
          format: formatName,
          bitrate
        });
      });
  });
}

/**
 * Convert video to WebM format optimized for web playback.
 * Uses VP9 codec for excellent compression and quality.
 *
 * For Spotify Canvas-style backgrounds:
 * - Loops seamlessly
 * - Muted by default (no audio track needed)
 * - Optimized for mobile and desktop
 */
export async function convertToWebM(
  inputPath: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    maxDuration?: number; // Limit video duration for canvas-style loops
    quality?: 'low' | 'medium' | 'high';
  } = {}
): Promise<VideoProcessResult> {
  const {
    maxWidth = 1080,
    maxHeight = 1920,
    maxDuration = 30, // 30 second max for canvas videos
    quality = 'medium'
  } = options;

  // Get metadata first
  let metadata: VideoMetadata;
  try {
    metadata = await getVideoMetadata(inputPath);
  } catch {
    metadata = { duration: 30, width: 1080, height: 1920, format: 'unknown' };
  }

  const actualDuration = Math.min(metadata.duration, maxDuration);

  console.log(`[VIDEO] Converting to WebM: ${metadata.width}x${metadata.height}, ${metadata.duration}s -> ${actualDuration}s`);

  // Quality presets (CRF values - lower = better quality, larger file)
  // Tuned for background videos that sit behind page content
  const qualitySettings = {
    low: { crf: 40, bitrate: '300k' },
    medium: { crf: 35, bitrate: '600k' },
    high: { crf: 28, bitrate: '1200k' }
  };

  const settings = qualitySettings[quality];

  return new Promise((resolve, reject) => {
    const outputStream = new PassThrough();
    const chunks: Buffer[] = [];

    outputStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    outputStream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      console.log(`[VIDEO] WebM conversion complete: ${buffer.length} bytes`);
      if (buffer.length < 1024) {
        return reject(new Error(`WebM conversion produced suspiciously small output (${buffer.length} bytes)`));
      }
      resolve({
        buffer,
        format: 'webm',
        duration: actualDuration
      });
    });
    outputStream.on('error', (err) => {
      console.error('[VIDEO] WebM conversion failed:', err);
      reject(err);
    });

    // Build FFmpeg command using file path (seekable input)
    const command = ffmpeg(inputPath);

    // Limit duration
    if (actualDuration < metadata.duration) {
      command.setDuration(actualDuration);
    }

    // Video filters for scaling
    const filters: string[] = [];

    // Scale to fit within max dimensions while maintaining aspect ratio
    filters.push(`scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease`);

    // Ensure dimensions are divisible by 2 (required for some codecs)
    filters.push('pad=ceil(iw/2)*2:ceil(ih/2)*2');

    command.videoFilters(filters);

    // WebM output settings with VP9 codec
    command
      .videoCodec('libvpx-vp9')
      .addOutputOption('-crf', settings.crf.toString())
      .addOutputOption('-b:v', settings.bitrate)
      .addOutputOption('-deadline', 'good') // Balance between speed and quality
      .addOutputOption('-cpu-used', '4') // Speed preset (0-5, higher = faster)
      .noAudio() // No audio for background videos
      .format('webm')
      .on('error', (err) => {
        console.error('[VIDEO] FFmpeg error:', err);
        reject(new Error(`FFmpeg processing failed: ${err.message}`));
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`[VIDEO] WebM processing: ${Math.round(progress.percent)}%`);
        }
      })
      .pipe(outputStream);
  });
}

/**
 * Convert video to MP4 format as fallback for browsers that don't support WebM.
 * Uses H.264 codec for maximum compatibility.
 */
export async function convertToMp4(
  inputPath: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    maxDuration?: number;
    quality?: 'low' | 'medium' | 'high';
  } = {}
): Promise<VideoProcessResult> {
  const {
    maxWidth = 1080,
    maxHeight = 1920,
    maxDuration = 30,
    quality = 'medium'
  } = options;

  let metadata: VideoMetadata;
  try {
    metadata = await getVideoMetadata(inputPath);
  } catch {
    metadata = { duration: 30, width: 1080, height: 1920, format: 'unknown' };
  }

  const actualDuration = Math.min(metadata.duration, maxDuration);

  console.log(`[VIDEO] Converting to MP4: ${metadata.width}x${metadata.height}, ${metadata.duration}s -> ${actualDuration}s`);

  // Tuned for background videos that sit behind page content
  const qualitySettings = {
    low: { crf: 32, preset: 'fast' },
    medium: { crf: 28, preset: 'fast' },
    high: { crf: 23, preset: 'medium' }
  };

  const settings = qualitySettings[quality];

  return new Promise((resolve, reject) => {
    const outputStream = new PassThrough();
    const chunks: Buffer[] = [];

    outputStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    outputStream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      console.log(`[VIDEO] MP4 conversion complete: ${buffer.length} bytes`);
      if (buffer.length < 1024) {
        return reject(new Error(`MP4 conversion produced suspiciously small output (${buffer.length} bytes)`));
      }
      resolve({
        buffer,
        format: 'mp4',
        duration: actualDuration
      });
    });
    outputStream.on('error', (err) => {
      console.error('[VIDEO] MP4 conversion failed:', err);
      reject(err);
    });

    // Build FFmpeg command using file path (seekable input)
    const command = ffmpeg(inputPath);

    // Limit duration
    if (actualDuration < metadata.duration) {
      command.setDuration(actualDuration);
    }

    // Video filters
    const filters: string[] = [];
    filters.push(`scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease`);
    filters.push('pad=ceil(iw/2)*2:ceil(ih/2)*2');
    command.videoFilters(filters);

    // MP4 output settings with H.264 codec
    command
      .videoCodec('libx264')
      .addOutputOption('-crf', settings.crf.toString())
      .addOutputOption('-preset', settings.preset)
      .addOutputOption('-profile:v', 'main') // Better compatibility
      .addOutputOption('-movflags', '+faststart') // Enable progressive download
      .noAudio()
      .format('mp4')
      .on('error', (err) => {
        console.error('[VIDEO] FFmpeg error:', err);
        reject(new Error(`FFmpeg processing failed: ${err.message}`));
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`[VIDEO] MP4 processing: ${Math.round(progress.percent)}%`);
        }
      })
      .pipe(outputStream);
  });
}

/**
 * Process video for canvas-style background.
 * Writes input to temp file for seekable FFmpeg access, then converts
 * to WebM (primary) and optionally generates MP4 fallback + poster.
 */
export async function processCanvasVideo(
  inputBuffer: Buffer,
  inputFormat: 'mp4' | 'mov' | 'webm',
  options: {
    generateFallback?: boolean;
    quality?: 'low' | 'medium' | 'high';
  } = {}
): Promise<{
  webm: VideoProcessResult;
  mp4?: VideoProcessResult;
  poster?: Buffer;
}> {
  const { generateFallback = true, quality = 'medium' } = options;
  const sizeMB = (inputBuffer.length / (1024 * 1024)).toFixed(1);

  console.log(`[VIDEO] Processing canvas video (format: ${inputFormat}, size: ${sizeMB}MB, fallback: ${generateFallback})`);

  // Write to temp file so FFmpeg can seek (critical for MP4/MOV moov atom)
  const tempPath = await writeToTempFile(inputBuffer, inputFormat);
  console.log(`[VIDEO] Written to temp file: ${tempPath}`);

  try {
    const canvasOptions = {
      quality,
      maxWidth: 720,
      maxHeight: 1280,
    };

    // Convert to WebM (primary format)
    const webm = await convertToWebM(tempPath, canvasOptions);

    // Generate MP4 fallback if requested
    let mp4: VideoProcessResult | undefined;
    if (generateFallback) {
      mp4 = await convertToMp4(tempPath, canvasOptions);
    }

    // Generate poster frame for instant visual feedback
    let poster: Buffer | undefined;
    try {
      poster = await generatePosterFrame(tempPath, {
        maxWidth: 720,
        maxHeight: 1280,
      });
    } catch (err) {
      console.warn('[VIDEO] Poster generation failed, continuing without poster:', err);
    }

    return { webm, mp4, poster };
  } finally {
    // Always clean up temp file
    await cleanupTempFile(tempPath);
    console.log(`[VIDEO] Temp file cleaned up: ${tempPath}`);
  }
}

/**
 * Generate a poster frame (JPEG) from the first frame of a video.
 * Used for instant visual feedback while the video loads.
 */
export async function generatePosterFrame(
  inputPath: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // JPEG quality 1-31 (lower = better)
  } = {}
): Promise<Buffer> {
  const {
    maxWidth = 720,
    maxHeight = 1280,
    quality = 5
  } = options;

  console.log(`[VIDEO] Generating poster frame`);

  return new Promise((resolve, reject) => {
    const outputStream = new PassThrough();
    const chunks: Buffer[] = [];

    outputStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    outputStream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      console.log(`[VIDEO] Poster frame generated: ${buffer.length} bytes`);
      resolve(buffer);
    });
    outputStream.on('error', (err) => {
      console.error('[VIDEO] Poster frame generation failed:', err);
      reject(err);
    });

    const command = ffmpeg(inputPath);

    command
      .frames(1)
      .videoFilters([
        `scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease`,
        'pad=ceil(iw/2)*2:ceil(ih/2)*2'
      ])
      .addOutputOption('-q:v', quality.toString())
      .format('mjpeg')
      .on('error', (err) => {
        console.error('[VIDEO] FFmpeg poster error:', err);
        reject(new Error(`Poster generation failed: ${err.message}`));
      })
      .pipe(outputStream);
  });
}

/**
 * Validate that FFmpeg can process video files
 */
export async function validateFfmpegVideo(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.getAvailableCodecs((err, codecs) => {
      if (err) {
        console.error('[VIDEO] FFmpeg not available:', err);
        resolve(false);
        return;
      }

      const hasVp9 = codecs['libvpx-vp9'] !== undefined;
      const hasH264 = codecs['libx264'] !== undefined;

      if (!hasVp9) {
        console.warn('[VIDEO] VP9 codec not available');
      }
      if (!hasH264) {
        console.warn('[VIDEO] H.264 codec not available');
      }

      console.log(`[VIDEO] FFmpeg available (VP9: ${hasVp9}, H.264: ${hasH264})`);
      resolve(hasVp9 || hasH264);
    });
  });
}
