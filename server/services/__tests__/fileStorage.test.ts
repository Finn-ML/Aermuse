import { describe, it, expect, vi } from 'vitest';

// Mock @replit/object-storage before importing fileStorage
vi.mock('@replit/object-storage', () => {
  const MockClient = function() {
    return {
      uploadFromBytes: vi.fn().mockResolvedValue({}),
      downloadAsBytes: vi.fn().mockResolvedValue({ value: [Buffer.from('test')] }),
      delete: vi.fn().mockResolvedValue({}),
    };
  };
  return { Client: MockClient };
});

import { getContentType } from '../fileStorage';

describe('FileStorage Service', () => {
  describe('getContentType', () => {
    it('should return correct MIME type for PDF', () => {
      expect(getContentType('pdf')).toBe('application/pdf');
    });

    it('should return correct MIME type for DOC', () => {
      expect(getContentType('doc')).toBe('application/msword');
    });

    it('should return correct MIME type for DOCX', () => {
      expect(getContentType('docx')).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
    });

    it('should return octet-stream for unknown extensions', () => {
      expect(getContentType('xyz')).toBe('application/octet-stream');
      expect(getContentType('')).toBe('application/octet-stream');
      expect(getContentType('txt')).toBe('application/octet-stream');
    });
  });
});
