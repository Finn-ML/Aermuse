import { describe, it, expect, vi } from 'vitest';
import { extractText, extractFromPDF, extractFromDOCX, extractFromDOC, truncateForAI } from '../extraction';

// Mock pdf-parse
vi.mock('pdf-parse', () => ({
  default: vi.fn()
}));

// Mock mammoth
vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn()
  }
}));

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

const mockedPdfParse = vi.mocked(pdfParse);
const mockedMammoth = vi.mocked(mammoth.extractRawText);

describe('Extraction Service', () => {
  describe('extractFromPDF', () => {
    it('should extract text from a valid text-based PDF', async () => {
      const mockText = 'This is a sample contract with enough text to pass the minimum threshold. '.repeat(5);
      mockedPdfParse.mockResolvedValueOnce({
        text: mockText,
        numpages: 3,
        numrender: 3,
        info: {},
        metadata: null,
        version: '1.4'
      });

      const buffer = Buffer.from('fake pdf content');
      const result = await extractFromPDF(buffer);

      expect(result.success).toBe(true);
      expect(result.text).toBeTruthy();
      expect(result.charCount).toBeGreaterThan(100);
      expect(result.pageCount).toBe(3);
      expect(result.warning).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('should warn for scanned PDFs with no extractable text', async () => {
      mockedPdfParse.mockResolvedValueOnce({
        text: '   ',
        numpages: 5,
        numrender: 5,
        info: {},
        metadata: null,
        version: '1.4'
      });

      const buffer = Buffer.from('fake scanned pdf');
      const result = await extractFromPDF(buffer);

      expect(result.success).toBe(false);
      expect(result.text).toBeNull();
      expect(result.charCount).toBe(0);
      expect(result.pageCount).toBe(5);
      expect(result.warning).toContain('scanned document');
    });

    it('should warn for PDFs with minimal text below threshold', async () => {
      mockedPdfParse.mockResolvedValueOnce({
        text: 'Short text',
        numpages: 1,
        numrender: 1,
        info: {},
        metadata: null,
        version: '1.4'
      });

      const buffer = Buffer.from('fake pdf');
      const result = await extractFromPDF(buffer);

      expect(result.success).toBe(false);
      expect(result.warning).toBeTruthy();
    });

    it('should handle corrupted PDF files', async () => {
      mockedPdfParse.mockRejectedValueOnce(new Error('Invalid PDF structure'));

      const buffer = Buffer.from('corrupted content');
      const result = await extractFromPDF(buffer);

      expect(result.success).toBe(false);
      expect(result.text).toBeNull();
      expect(result.error).toContain('Failed to read PDF');
    });
  });

  describe('extractFromDOCX', () => {
    it('should extract text from a valid DOCX file', async () => {
      const mockText = 'This is a sample Word document with enough content for testing. '.repeat(5);
      mockedMammoth.mockResolvedValueOnce({
        value: mockText,
        messages: []
      });

      const buffer = Buffer.from('fake docx content');
      const result = await extractFromDOCX(buffer);

      expect(result.success).toBe(true);
      expect(result.text).toBeTruthy();
      expect(result.charCount).toBeGreaterThan(100);
      expect(result.warning).toBeUndefined();
    });

    it('should warn for empty DOCX files', async () => {
      mockedMammoth.mockResolvedValueOnce({
        value: '',
        messages: []
      });

      const buffer = Buffer.from('empty docx');
      const result = await extractFromDOCX(buffer);

      expect(result.success).toBe(false);
      expect(result.text).toBeNull();
      expect(result.warning).toContain('No text could be extracted');
    });

    it('should handle corrupted DOCX files', async () => {
      mockedMammoth.mockRejectedValueOnce(new Error('Invalid DOCX'));

      const buffer = Buffer.from('corrupted');
      const result = await extractFromDOCX(buffer);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to read DOCX');
    });
  });

  describe('extractFromDOC', () => {
    it('should attempt extraction from DOC files', async () => {
      const mockText = 'Legacy DOC file content that is long enough to be considered valid. '.repeat(5);
      mockedMammoth.mockResolvedValueOnce({
        value: mockText,
        messages: []
      });

      const buffer = Buffer.from('fake doc content');
      const result = await extractFromDOC(buffer);

      expect(result.success).toBe(true);
      expect(result.text).toBeTruthy();
    });

    it('should warn for unsupported DOC files', async () => {
      mockedMammoth.mockRejectedValueOnce(new Error('Unsupported format'));

      const buffer = Buffer.from('old doc');
      const result = await extractFromDOC(buffer);

      expect(result.success).toBe(false);
      expect(result.warning).toContain('Legacy DOC format');
    });
  });

  describe('extractText router', () => {
    it('should route PDF files to extractFromPDF', async () => {
      const mockText = 'PDF content here with enough text for the minimum. '.repeat(5);
      mockedPdfParse.mockResolvedValueOnce({
        text: mockText,
        numpages: 1,
        numrender: 1,
        info: {},
        metadata: null,
        version: '1.4'
      });

      const buffer = Buffer.from('pdf');
      const result = await extractText(buffer, 'pdf');

      expect(result.success).toBe(true);
      expect(mockedPdfParse).toHaveBeenCalled();
    });

    it('should route DOCX files to extractFromDOCX', async () => {
      const mockText = 'DOCX content here with enough text. '.repeat(5);
      mockedMammoth.mockResolvedValueOnce({
        value: mockText,
        messages: []
      });

      const buffer = Buffer.from('docx');
      const result = await extractText(buffer, 'docx');

      expect(result.success).toBe(true);
    });

    it('should route DOC files to extractFromDOC', async () => {
      const mockText = 'DOC content here with enough text. '.repeat(5);
      mockedMammoth.mockResolvedValueOnce({
        value: mockText,
        messages: []
      });

      const buffer = Buffer.from('doc');
      const result = await extractText(buffer, 'doc');

      expect(result.success).toBe(true);
    });

    it('should reject unsupported file types', async () => {
      const buffer = Buffer.from('txt');
      const result = await extractText(buffer, 'txt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file type');
    });

    it('should handle case-insensitive file types', async () => {
      const mockText = 'PDF content. '.repeat(20);
      mockedPdfParse.mockResolvedValueOnce({
        text: mockText,
        numpages: 1,
        numrender: 1,
        info: {},
        metadata: null,
        version: '1.4'
      });

      const buffer = Buffer.from('pdf');
      const result = await extractText(buffer, 'PDF');

      expect(result.success).toBe(true);
    });
  });

  describe('truncateForAI', () => {
    it('should not truncate text under the limit', () => {
      const shortText = 'Short text under limit';
      const result = truncateForAI(shortText);

      expect(result.truncated).toBe(false);
      expect(result.text).toBe(shortText);
      expect(result.originalLength).toBe(shortText.length);
    });

    it('should truncate text over the limit', () => {
      const longText = 'A'.repeat(60000);
      const result = truncateForAI(longText, 50000);

      expect(result.truncated).toBe(true);
      expect(result.text.length).toBeLessThan(longText.length);
      expect(result.originalLength).toBe(60000);
      expect(result.text).toContain('[Document truncated');
    });

    it('should preserve paragraph breaks when truncating', () => {
      // Create text with a paragraph break near the end of the truncation point
      const paragraph1 = 'A'.repeat(45000);
      const paragraph2 = 'B'.repeat(5000);
      const longText = paragraph1 + '\n\n' + paragraph2;

      const result = truncateForAI(longText, 50000);

      expect(result.truncated).toBe(true);
      // Should truncate at the paragraph break
      expect(result.text).toContain('A');
    });

    it('should use custom max chars', () => {
      const text = 'A'.repeat(1000);
      const result = truncateForAI(text, 500);

      expect(result.truncated).toBe(true);
      expect(result.text.length).toBeLessThanOrEqual(600); // 500 + truncation message
    });
  });
});
