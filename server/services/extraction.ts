import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
// Lazy imports for pdf libraries to avoid DOMMatrix error at startup
// These libraries use pdfjs-dist which requires browser APIs like DOMMatrix

export interface ExtractionResult {
  success: boolean;
  text: string | null;
  charCount: number;
  pageCount?: number;
  warning?: string;
  error?: string;
}

const MIN_TEXT_LENGTH = 100; // Minimum chars to consider extraction successful
const OCR_MAX_PAGES = 10; // Limit OCR to first N pages for performance

/**
 * Extract text from a scanned PDF using OCR
 */
async function extractWithOCR(buffer: Buffer, maxPages: number = OCR_MAX_PAGES): Promise<ExtractionResult> {
  try {
    console.log('[OCR] Starting OCR extraction...');

    // Dynamic import to avoid DOMMatrix error at server startup
    const { pdf } = await import('pdf-to-img');

    // Convert PDF pages to images using pdf-to-img
    const pdfDocument = await pdf(buffer, { scale: 2.0 });

    const pageTexts: string[] = [];
    let pageNum = 0;
    let totalPages = 0;

    // Create a single Tesseract worker for efficiency
    const worker = await Tesseract.createWorker('eng');

    try {
      for await (const image of pdfDocument) {
        totalPages++;
        pageNum++;

        if (pageNum > maxPages) {
          // Continue counting total pages but skip OCR
          continue;
        }

        console.log(`[OCR] Processing page ${pageNum}...`);

        // Run OCR on the image (image is a Buffer)
        const { data: { text } } = await worker.recognize(image);

        if (text.trim()) {
          pageTexts.push(`page ${pageNum}\n\n${text.trim()}`);
        }
      }
    } finally {
      await worker.terminate();
    }

    // Update page references now that we know total
    const updatedTexts = pageTexts.map(t => {
      const match = t.match(/^page (\d+)\n\n/);
      if (match) {
        return t.replace(/^page \d+\n\n/, `page ${match[1]} of ${totalPages}\n\n`);
      }
      return t;
    });

    const fullText = updatedTexts.join('\n\n');

    if (!fullText || fullText.length < MIN_TEXT_LENGTH) {
      return {
        success: false,
        text: null,
        charCount: 0,
        pageCount: totalPages,
        warning: 'OCR could not extract readable text from this document. The image quality may be too low.'
      };
    }

    const processedPages = Math.min(pageNum, maxPages);
    console.log(`[OCR] Extraction complete: ${fullText.length} chars from ${processedPages} pages`);

    return {
      success: true,
      text: cleanText(fullText),
      charCount: fullText.length,
      pageCount: totalPages,
      warning: processedPages < totalPages
        ? `OCR processed first ${processedPages} of ${totalPages} pages for performance.`
        : undefined
    };
  } catch (error) {
    console.error('[OCR] OCR extraction failed:', error);
    return {
      success: false,
      text: null,
      charCount: 0,
      error: 'OCR processing failed. The document may be corrupted or in an unsupported format.'
    };
  }
}

/**
 * Extract text from a PDF file
 * Falls back to OCR for scanned documents
 */
export async function extractFromPDF(buffer: Buffer): Promise<ExtractionResult> {
  let parser: any = null;
  try {
    // Dynamic import to avoid DOMMatrix error at server startup
    const { PDFParse } = await import('pdf-parse');

    // First try standard text extraction using pdf-parse v2.x API
    parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText({
      // Limit pages for very large documents
      last: 100
    });

    const text = textResult.text.trim();
    const pageCount = textResult.pages.length;

    if (!text || text.length < MIN_TEXT_LENGTH) {
      // No text found - this is likely a scanned document, try OCR
      console.log('[EXTRACT] No text found in PDF, attempting OCR...');
      await parser.destroy();
      return await extractWithOCR(buffer);
    }

    await parser.destroy();
    return {
      success: true,
      text: cleanText(text),
      charCount: text.length,
      pageCount
    };
  } catch (error) {
    console.error('[EXTRACT] PDF extraction failed:', error);
    if (parser) {
      await parser.destroy().catch(() => {});
    }

    // Try OCR as fallback even if pdf-parse fails
    console.log('[EXTRACT] pdf-parse failed, attempting OCR fallback...');
    const ocrResult = await extractWithOCR(buffer);

    if (ocrResult.success) {
      return ocrResult;
    }

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
