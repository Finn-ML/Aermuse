// @ts-ignore - pdf-parse types don't properly export default
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export interface ExtractionResult {
  success: boolean;
  text: string | null;
  charCount: number;
  pageCount?: number;
  warning?: string;
  error?: string;
}

const MIN_TEXT_LENGTH = 100; // Minimum chars to consider extraction successful

/**
 * Extract text from a PDF file
 */
export async function extractFromPDF(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const data = await pdfParse(buffer, {
      // Limit pages for very large documents
      max: 100
    });

    const text = data.text.trim();

    if (!text || text.length < MIN_TEXT_LENGTH) {
      return {
        success: false,
        text: null,
        charCount: 0,
        pageCount: data.numpages,
        warning: 'This appears to be a scanned document. Text extraction is not available for image-based PDFs. Please upload a text-based PDF or type the contract content manually.'
      };
    }

    return {
      success: true,
      text: cleanText(text),
      charCount: text.length,
      pageCount: data.numpages
    };
  } catch (error) {
    console.error('[EXTRACT] PDF extraction failed:', error);
    return {
      success: false,
      text: null,
      charCount: 0,
      error: 'Failed to read PDF file. The file may be corrupted or password-protected.'
    };
  }
}

/**
 * Extract text from a DOCX file
 */
export async function extractFromDOCX(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value.trim();

    if (!text || text.length < MIN_TEXT_LENGTH) {
      return {
        success: false,
        text: null,
        charCount: 0,
        warning: 'No text could be extracted from this document. It may be empty or contain only images.'
      };
    }

    // Log any conversion warnings
    if (result.messages.length > 0) {
      console.log('[EXTRACT] DOCX warnings:', result.messages);
    }

    return {
      success: true,
      text: cleanText(text),
      charCount: text.length
    };
  } catch (error) {
    console.error('[EXTRACT] DOCX extraction failed:', error);
    return {
      success: false,
      text: null,
      charCount: 0,
      error: 'Failed to read DOCX file. The file may be corrupted.'
    };
  }
}

/**
 * Extract text from a DOC file (legacy format)
 * Note: Limited support - mammoth handles some DOC files
 */
export async function extractFromDOC(buffer: Buffer): Promise<ExtractionResult> {
  try {
    // Try mammoth first (works for some DOC files)
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value.trim();

    if (!text || text.length < MIN_TEXT_LENGTH) {
      return {
        success: false,
        text: null,
        charCount: 0,
        warning: 'Legacy DOC format has limited support. Please save the document as DOCX or PDF for best results.'
      };
    }

    return {
      success: true,
      text: cleanText(text),
      charCount: text.length
    };
  } catch (error) {
    console.error('[EXTRACT] DOC extraction failed:', error);
    return {
      success: false,
      text: null,
      charCount: 0,
      warning: 'Legacy DOC format has limited support. Please save the document as DOCX or PDF for best results.'
    };
  }
}

/**
 * Main extraction function - routes to appropriate extractor
 */
export async function extractText(
  buffer: Buffer,
  fileType: string
): Promise<ExtractionResult> {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return extractFromPDF(buffer);
    case 'docx':
      return extractFromDOCX(buffer);
    case 'doc':
      return extractFromDOC(buffer);
    default:
      return {
        success: false,
        text: null,
        charCount: 0,
        error: `Unsupported file type: ${fileType}`
      };
  }
}

/**
 * Clean extracted text
 * - Normalize whitespace
 * - Remove excessive line breaks
 * - Trim leading/trailing whitespace
 */
function cleanText(text: string): string {
  return text
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Reduce multiple blank lines to single
    .replace(/\n{3,}/g, '\n\n')
    // Reduce multiple spaces to single
    .replace(/[ \t]+/g, ' ')
    // Trim lines
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Final trim
    .trim();
}

/**
 * Truncate text if too long for AI processing
 * GPT-4 has ~128k token limit, but we want to keep costs reasonable
 */
export function truncateForAI(text: string, maxChars: number = 50000): {
  text: string;
  truncated: boolean;
  originalLength: number;
} {
  const originalLength = text.length;

  if (text.length <= maxChars) {
    return { text, truncated: false, originalLength };
  }

  // Truncate at a paragraph break if possible
  const truncated = text.slice(0, maxChars);
  const lastParagraph = truncated.lastIndexOf('\n\n');

  const finalText = lastParagraph > maxChars * 0.8
    ? truncated.slice(0, lastParagraph)
    : truncated;

  return {
    text: finalText + '\n\n[Document truncated for analysis. First ~50,000 characters analyzed.]',
    truncated: true,
    originalLength
  };
}
