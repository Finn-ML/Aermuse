/**
 * PDF Generation Service
 * Converts contract content to PDF using jsPDF
 */

import { jsPDF } from 'jspdf';

interface Section {
  heading: string;
  content: string;
}

/**
 * Strip HTML tags and decode entities from content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Parse HTML contract content into sections
 */
function parseHtmlContent(html: string): { title: string; sections: Section[] } {
  // Extract title
  const titleMatch = html.match(/<div class="contract-title">([\s\S]*?)<\/div>/);
  const title = titleMatch ? stripHtml(titleMatch[1]) : 'Contract';

  // Extract sections
  const sections: Section[] = [];
  const sectionRegex = /<div class="section">\s*<div class="section-heading">([\s\S]*?)<\/div>\s*<div class="section-content">([\s\S]*?)<\/div>\s*<\/div>/g;

  let match;
  while ((match = sectionRegex.exec(html)) !== null) {
    sections.push({
      heading: stripHtml(match[1]),
      content: stripHtml(match[2])
    });
  }

  return { title, sections };
}

/**
 * Generate a PDF from HTML content
 */
export async function generatePDF(html: string): Promise<Buffer> {
  const { title, sections } = parseHtmlContent(html);
  return generateContractPDF(title, sections);
}

/**
 * Generate PDF from contract title and sections
 */
export async function generateContractPDF(
  title: string,
  sections: Section[]
): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Helper to add new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // Helper to wrap and add text
  const addWrappedText = (
    text: string,
    fontSize: number,
    fontStyle: 'normal' | 'bold' = 'normal',
    lineHeight: number = 1.4
  ) => {
    doc.setFontSize(fontSize);
    doc.setFont('times', fontStyle);

    const lines = doc.splitTextToSize(text, contentWidth);
    const lineHeightMm = (fontSize * lineHeight) / 2.83; // Convert pt to mm with line height

    for (const line of lines) {
      checkNewPage(lineHeightMm);
      doc.text(line, margin, yPosition);
      yPosition += lineHeightMm;
    }
  };

  // Title
  doc.setFontSize(18);
  doc.setFont('times', 'bold');
  const titleLines = doc.splitTextToSize(title.toUpperCase(), contentWidth);
  const titleHeight = titleLines.length * 8;

  // Center title
  for (const line of titleLines) {
    const textWidth = doc.getTextWidth(line);
    const xPosition = (pageWidth - textWidth) / 2;
    doc.text(line, xPosition, yPosition);
    yPosition += 8;
  }

  yPosition += 10; // Space after title

  // Sections
  for (const section of sections) {
    checkNewPage(20);

    // Section heading
    addWrappedText(section.heading.toUpperCase(), 11, 'bold');
    yPosition += 3;

    // Section content - split by double newlines for paragraphs
    const paragraphs = section.content.split(/\n\n+/);
    for (const paragraph of paragraphs) {
      if (paragraph.trim()) {
        addWrappedText(paragraph.trim(), 11, 'normal');
        yPosition += 4; // Space between paragraphs
      }
    }

    yPosition += 6; // Space between sections
  }

  // Return as Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

/**
 * Generate PDF from a Contract record
 * Used by signature request API to create signable documents
 */
export async function generateContractPDFFromRecord(
  contract: {
    name: string;
    renderedContent?: string | null;
    extractedText?: string | null;
  }
): Promise<Buffer> {
  const content = contract.renderedContent || contract.extractedText || '';

  // If content appears to be HTML (from template rendering), use generatePDF
  if (content.includes('<div') || content.includes('<p>')) {
    return generatePDF(content);
  }

  // Otherwise, create a simple PDF from plain text
  const sections: Section[] = [];

  // Split content into paragraphs and create sections
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());

  if (paragraphs.length > 0) {
    // Group paragraphs into logical sections
    let currentContent = '';
    for (const para of paragraphs) {
      // Check if paragraph looks like a section header (all caps or ends with :)
      if (para === para.toUpperCase() && para.length < 100) {
        if (currentContent) {
          sections.push({ heading: 'TERMS', content: currentContent.trim() });
          currentContent = '';
        }
        sections.push({ heading: para, content: '' });
      } else if (sections.length > 0 && !sections[sections.length - 1].content) {
        // Add to the last section's content
        sections[sections.length - 1].content = para;
      } else {
        currentContent += para + '\n\n';
      }
    }

    // Add remaining content
    if (currentContent.trim()) {
      sections.push({ heading: 'AGREEMENT TERMS', content: currentContent.trim() });
    }
  }

  // If no sections were created, create a single section with all content
  if (sections.length === 0 && content.trim()) {
    sections.push({ heading: 'CONTRACT TERMS', content: content.trim() });
  }

  return generateContractPDF(contract.name || 'Contract Agreement', sections);
}
