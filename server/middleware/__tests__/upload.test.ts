import { describe, it, expect } from 'vitest';
import { verifyFileType, UPLOAD_CONSTANTS } from '../upload';

describe('Upload Middleware', () => {
  describe('UPLOAD_CONSTANTS', () => {
    it('should have correct allowed extensions', () => {
      expect(UPLOAD_CONSTANTS.ALLOWED_EXTENSIONS).toContain('.pdf');
      expect(UPLOAD_CONSTANTS.ALLOWED_EXTENSIONS).toContain('.doc');
      expect(UPLOAD_CONSTANTS.ALLOWED_EXTENSIONS).toContain('.docx');
      expect(UPLOAD_CONSTANTS.ALLOWED_EXTENSIONS).toHaveLength(3);
    });

    it('should have 10MB file size limit', () => {
      expect(UPLOAD_CONSTANTS.MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });
  });

  describe('verifyFileType', () => {
    it('should detect PDF files correctly', async () => {
      // PDF magic bytes: %PDF- followed by enough bytes for file-type to parse
      const pdfBuffer = Buffer.alloc(64);
      pdfBuffer.write('%PDF-1.4', 0, 'ascii');
      const result = await verifyFileType(pdfBuffer);

      expect(result.valid).toBe(true);
      expect(result.type).toBe('pdf');
    });

    it('should detect DOC files correctly using custom magic bytes fallback', async () => {
      // DOC magic bytes: D0 CF 11 E0 - file-type may not detect this, but our custom code does
      // We need at least 4 bytes for our custom DOC detection
      const docBuffer = Buffer.from([0xD0, 0xCF, 0x11, 0xE0]);
      const result = await verifyFileType(docBuffer);

      // Our custom code checks the first 4 bytes for DOC magic
      expect(result.valid).toBe(true);
      expect(result.type).toBe('doc');
    });

    it('should reject files with only valid magic bytes but insufficient data', async () => {
      // A 4-byte buffer that doesn't match PDF or DOC
      const unknownBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      const result = await verifyFileType(unknownBuffer);

      // Should be rejected - not a valid document format
      expect(result.valid).toBe(false);
    });

    it('should reject invalid file types', async () => {
      // Random bytes that don't match any known file type
      const randomBuffer = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
      const result = await verifyFileType(randomBuffer);

      expect(result.valid).toBe(false);
      expect(result.type).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should reject PNG files', async () => {
      // PNG magic bytes with enough bytes for file-type to parse
      const pngBuffer = Buffer.alloc(64);
      // PNG signature
      pngBuffer[0] = 0x89;
      pngBuffer[1] = 0x50; // P
      pngBuffer[2] = 0x4E; // N
      pngBuffer[3] = 0x47; // G
      pngBuffer[4] = 0x0D;
      pngBuffer[5] = 0x0A;
      pngBuffer[6] = 0x1A;
      pngBuffer[7] = 0x0A;
      // IHDR chunk header
      pngBuffer.writeUInt32BE(13, 8); // length
      pngBuffer.write('IHDR', 12, 'ascii');

      const result = await verifyFileType(pngBuffer);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject JPEG files', async () => {
      // JPEG magic bytes with enough bytes
      const jpegBuffer = Buffer.alloc(64);
      jpegBuffer[0] = 0xFF;
      jpegBuffer[1] = 0xD8;
      jpegBuffer[2] = 0xFF;
      jpegBuffer[3] = 0xE0;
      jpegBuffer.writeUInt16BE(16, 4); // segment length
      jpegBuffer.write('JFIF', 6, 'ascii');

      const result = await verifyFileType(jpegBuffer);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject empty buffers', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = await verifyFileType(emptyBuffer);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
