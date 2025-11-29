import PDFDocument from 'pdfkit';

/**
 * Contract PDF Generator Service (Story 8.4)
 * Generates professional PDF summaries for contracts using PDFKit
 */

interface ContractPdfData {
  id: string;
  name: string;
  type: string;
  status: string;
  partnerName?: string | null;
  value?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  signedAt?: Date | string | null;
  aiRiskScore?: string | null;
  aiAnalysis?: {
    summary?: string;
    keyTerms?: Array<{ term: string; value: string; risk: string }>;
    recommendations?: string[];
    overallScore?: number;
  } | null;
}

// Brand colors
const BRAND_BURGUNDY = '#660033';
const BRAND_CREAM = '#F7E6CA';
const GRAY_TEXT = '#666666';
const GRAY_LIGHT = '#E5E5E5';

/**
 * Formats a date string for display
 */
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formats contract type for display
 */
function formatType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats status for display
 */
function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Gets status color for badge
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return '#28a745'; // Green
    case 'pending':
      return '#B8860B'; // Gold
    case 'completed':
      return '#1e40af'; // Blue
    case 'expired':
      return '#dc3545'; // Red
    default:
      return GRAY_TEXT;
  }
}

/**
 * Generates a PDF document for a contract
 * Returns a Buffer containing the PDF data
 */
export async function generateContractPdf(data: ContractPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      info: {
        Title: data.name,
        Author: 'Aermuse',
        Subject: 'Contract Summary',
        Creator: 'Aermuse Contract Management',
      },
    });

    // Collect data chunks
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ============================================
    // HEADER
    // ============================================

    // Brand name
    doc
      .fillColor(BRAND_BURGUNDY)
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('Aermuse', { align: 'center' });

    doc.moveDown(0.3);

    // Tagline
    doc
      .fillColor(GRAY_TEXT)
      .fontSize(10)
      .font('Helvetica')
      .text('Contract Management Platform', { align: 'center' });

    doc.moveDown(1);

    // Separator line
    doc
      .strokeColor(BRAND_BURGUNDY)
      .lineWidth(2)
      .moveTo(60, doc.y)
      .lineTo(doc.page.width - 60, doc.y)
      .stroke();

    doc.moveDown(1.5);

    // ============================================
    // CONTRACT TITLE
    // ============================================

    doc
      .fillColor(BRAND_BURGUNDY)
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(data.name, { align: 'center' });

    doc.moveDown(0.5);

    // Status badge
    const statusColor = getStatusColor(data.status);
    doc
      .fillColor(statusColor)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(formatStatus(data.status).toUpperCase(), { align: 'center' });

    doc.moveDown(1.5);

    // ============================================
    // CONTRACT DETAILS BOX
    // ============================================

    // Background box
    const boxY = doc.y;
    const boxHeight = 100;
    doc
      .rect(60, boxY, doc.page.width - 120, boxHeight)
      .fillColor('#F9F9F9')
      .fill();

    doc.y = boxY + 15;

    // Section title
    doc
      .fillColor(BRAND_BURGUNDY)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Contract Details', 80);

    doc.moveDown(0.5);

    // Details grid
    const leftCol = 80;
    const rightCol = 300;
    let detailY = doc.y;

    // Type
    doc
      .fillColor(GRAY_TEXT)
      .fontSize(10)
      .font('Helvetica')
      .text('Type:', leftCol, detailY);
    doc
      .fillColor('#333333')
      .font('Helvetica-Bold')
      .text(formatType(data.type), leftCol + 80, detailY);

    // Created
    doc
      .fillColor(GRAY_TEXT)
      .font('Helvetica')
      .text('Created:', rightCol, detailY);
    doc
      .fillColor('#333333')
      .font('Helvetica-Bold')
      .text(formatDate(data.createdAt), rightCol + 60, detailY);

    detailY += 18;

    // Partner
    doc
      .fillColor(GRAY_TEXT)
      .font('Helvetica')
      .text('Partner:', leftCol, detailY);
    doc
      .fillColor('#333333')
      .font('Helvetica-Bold')
      .text(data.partnerName || 'Not specified', leftCol + 80, detailY);

    // Last Updated
    doc
      .fillColor(GRAY_TEXT)
      .font('Helvetica')
      .text('Updated:', rightCol, detailY);
    doc
      .fillColor('#333333')
      .font('Helvetica-Bold')
      .text(formatDate(data.updatedAt), rightCol + 60, detailY);

    detailY += 18;

    // Value
    if (data.value) {
      doc
        .fillColor(GRAY_TEXT)
        .font('Helvetica')
        .text('Value:', leftCol, detailY);
      doc
        .fillColor('#333333')
        .font('Helvetica-Bold')
        .text(data.value, leftCol + 80, detailY);
    }

    // Signed
    if (data.signedAt) {
      doc
        .fillColor(GRAY_TEXT)
        .font('Helvetica')
        .text('Signed:', rightCol, detailY);
      doc
        .fillColor('#28a745')
        .font('Helvetica-Bold')
        .text(formatDate(data.signedAt), rightCol + 60, detailY);
    }

    doc.y = boxY + boxHeight + 20;

    // ============================================
    // AI ANALYSIS (if present)
    // ============================================

    if (data.aiAnalysis) {
      doc
        .fillColor(BRAND_BURGUNDY)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('AI Analysis');

      doc.moveDown(0.5);

      // Risk score badge
      if (data.aiRiskScore) {
        const riskColor = data.aiRiskScore === 'low' ? '#28a745' :
                          data.aiRiskScore === 'medium' ? '#B8860B' : '#dc3545';
        doc
          .fillColor(riskColor)
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(`Risk Level: ${data.aiRiskScore.toUpperCase()}`);

        doc.moveDown(0.3);
      }

      // Overall score
      if (data.aiAnalysis.overallScore) {
        doc
          .fillColor('#333333')
          .fontSize(10)
          .font('Helvetica')
          .text(`Overall Score: ${data.aiAnalysis.overallScore}/100`);

        doc.moveDown(0.5);
      }

      // Summary
      if (data.aiAnalysis.summary) {
        doc
          .fillColor('#333333')
          .fontSize(10)
          .font('Helvetica')
          .text(data.aiAnalysis.summary, {
            width: doc.page.width - 120,
            align: 'justify',
          });

        doc.moveDown(0.8);
      }

      // Key Terms
      if (data.aiAnalysis.keyTerms && data.aiAnalysis.keyTerms.length > 0) {
        doc
          .fillColor(BRAND_BURGUNDY)
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Key Terms');

        doc.moveDown(0.3);

        for (const term of data.aiAnalysis.keyTerms) {
          const riskColor = term.risk === 'low' ? '#28a745' :
                            term.risk === 'medium' ? '#B8860B' : '#dc3545';
          doc
            .fillColor('#333333')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(`${term.term}: `, { continued: true })
            .font('Helvetica')
            .text(term.value, { continued: true })
            .fillColor(riskColor)
            .text(` (${term.risk} risk)`);
        }

        doc.moveDown(0.8);
      }

      // Recommendations
      if (data.aiAnalysis.recommendations && data.aiAnalysis.recommendations.length > 0) {
        doc
          .fillColor(BRAND_BURGUNDY)
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Recommendations');

        doc.moveDown(0.3);

        for (const rec of data.aiAnalysis.recommendations) {
          doc
            .fillColor('#333333')
            .fontSize(10)
            .font('Helvetica')
            .text(`• ${rec}`, {
              width: doc.page.width - 120,
            });
        }

        doc.moveDown(1);
      }
    }

    // ============================================
    // FOOTER
    // ============================================

    // Move to bottom of page
    const footerY = doc.page.height - 60;

    // Separator line
    doc
      .strokeColor(GRAY_LIGHT)
      .lineWidth(1)
      .moveTo(60, footerY - 20)
      .lineTo(doc.page.width - 60, footerY - 20)
      .stroke();

    // Footer text
    doc
      .fillColor(GRAY_TEXT)
      .fontSize(8)
      .font('Helvetica')
      .text(
        `Generated by Aermuse on ${formatDate(new Date())} | Contract ID: ${data.id}`,
        60,
        footerY - 10,
        { align: 'center', width: doc.page.width - 120 }
      );

    // Finalize PDF
    doc.end();
  });
}

/**
 * Sanitizes a filename for safe download
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}
