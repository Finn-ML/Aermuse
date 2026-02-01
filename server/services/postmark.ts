import * as postmark from 'postmark';

const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@aermuse.com';

// Only create client if API key is configured
const client = POSTMARK_API_KEY ? new postmark.ServerClient(POSTMARK_API_KEY) : null;

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  userName: string,
  baseUrl: string
): Promise<EmailResult> {
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  if (!client) {
    console.log('[EMAIL] Password reset email (dev mode):');
    console.log(`  To: ${email}`);
    console.log(`  Name: ${userName}`);
    console.log(`  Reset URL: ${resetUrl}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: email,
      TemplateAlias: 'password-reset',
      TemplateModel: { userName, resetUrl },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] Password reset email sent to ${email}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send password reset email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string,
  userName: string,
  baseUrl: string
): Promise<EmailResult> {
  const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

  if (!client) {
    console.log('[EMAIL] Verification email (dev mode):');
    console.log(`  To: ${email}`);
    console.log(`  Name: ${userName}`);
    console.log(`  Verify URL: ${verifyUrl}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: email,
      TemplateAlias: 'email-verification',
      TemplateModel: { userName, verifyUrl },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] Verification email sent to ${email}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send verification email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send signature request email to signatory
 */
export async function sendSignatureRequestEmail(
  signatoryEmail: string,
  signatoryName: string,
  initiatorName: string,
  contractTitle: string,
  signingUrl: string,
  message?: string | null,
  contractDownloadUrl?: string | null
): Promise<EmailResult> {
  if (!client) {
    console.log('[EMAIL] Signature request email (dev mode):');
    console.log(`  To: ${signatoryEmail}`);
    console.log(`  Signatory: ${signatoryName}`);
    console.log(`  From: ${initiatorName}`);
    console.log(`  Contract: ${contractTitle}`);
    console.log(`  Signing URL: ${signingUrl}`);
    console.log(`  Download URL: ${contractDownloadUrl || '(none)'}`);
    console.log(`  Message: ${message || '(none)'}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    // Build download link HTML server-side to bypass Postmark Mustache conditional issues
    const downloadLinkHtml = contractDownloadUrl
      ? `<p style="margin: 16px 0 0 0; text-align: center;"><a href="${contractDownloadUrl}" style="color: #660033; text-decoration: underline;">Download Contract PDF</a></p>`
      : '';
    const downloadLinkText = contractDownloadUrl
      ? `Download contract: ${contractDownloadUrl}`
      : '';

    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: signatoryEmail,
      TemplateAlias: 'signature-request',
      TemplateModel: {
        signatoryName,
        initiatorName,
        contractTitle,
        signingUrl,
        ...(message ? { message } : {}),
        downloadLinkHtml,
        downloadLinkText,
      },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] Signature request email sent to ${signatoryEmail}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send signature request email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send signature reminder email to signatory
 */
export async function sendSignatureReminderEmail(
  signatoryEmail: string,
  signatoryName: string,
  initiatorName: string,
  contractTitle: string,
  signingUrl: string,
  message?: string | null
): Promise<EmailResult> {
  if (!client) {
    console.log('[EMAIL] Signature reminder email (dev mode):');
    console.log(`  To: ${signatoryEmail}`);
    console.log(`  Signatory: ${signatoryName}`);
    console.log(`  From: ${initiatorName}`);
    console.log(`  Contract: ${contractTitle}`);
    console.log(`  Signing URL: ${signingUrl}`);
    console.log(`  Message: ${message || '(none)'}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: signatoryEmail,
      TemplateAlias: 'signature-reminder',
      TemplateModel: {
        signatoryName,
        initiatorName,
        contractTitle,
        signingUrl,
        message: message || '',
      },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] Signature reminder email sent to ${signatoryEmail}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send signature reminder email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send signature completed confirmation to signatory
 */
export async function sendSignatureConfirmationEmail(
  signatoryEmail: string,
  signatoryName: string,
  contractTitle: string
): Promise<EmailResult> {
  if (!client) {
    console.log('[EMAIL] Signature confirmation email (dev mode):');
    console.log(`  To: ${signatoryEmail}`);
    console.log(`  Signatory: ${signatoryName}`);
    console.log(`  Contract: ${contractTitle}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: signatoryEmail,
      TemplateAlias: 'signature-confirmation',
      TemplateModel: { signatoryName, contractTitle },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] Signature confirmation email sent to ${signatoryEmail}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send signature confirmation email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send document completed email with signed copy
 */
export async function sendDocumentCompletedEmail(
  email: string,
  recipientName: string,
  contractTitle: string,
  downloadUrl: string
): Promise<EmailResult> {
  if (!client) {
    console.log('[EMAIL] Document completed email (dev mode):');
    console.log(`  To: ${email}`);
    console.log(`  Recipient: ${recipientName}`);
    console.log(`  Contract: ${contractTitle}`);
    console.log(`  Download URL: ${downloadUrl}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: email,
      TemplateAlias: 'document-completed',
      TemplateModel: { recipientName, contractTitle, downloadUrl },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] Document completed email sent to ${email}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send document completed email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send cancellation notification email
 */
export async function sendSignatureCancelledEmail(
  email: string,
  recipientName: string,
  contractTitle: string,
  initiatorName: string
): Promise<EmailResult> {
  if (!client) {
    console.log('[EMAIL] Signature cancelled email (dev mode):');
    console.log(`  To: ${email}`);
    console.log(`  Recipient: ${recipientName}`);
    console.log(`  Contract: ${contractTitle}`);
    console.log(`  Cancelled by: ${initiatorName}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: email,
      TemplateAlias: 'signature-cancelled',
      TemplateModel: { recipientName, contractTitle, initiatorName },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] Signature cancelled email sent to ${email}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send signature cancelled email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send account deletion confirmation email
 */
export async function sendAccountDeletionEmail(
  email: string,
  userName: string
): Promise<EmailResult> {
  if (!client) {
    console.log('[EMAIL] Account deletion email (dev mode):');
    console.log(`  To: ${email}`);
    console.log(`  Name: ${userName}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: email,
      TemplateAlias: 'account-deletion',
      TemplateModel: { userName },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] Account deletion email sent to ${email}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send account deletion email:', error);
    return { success: false, error: String(error) };
  }
}

interface ProposalNotificationParams {
  artistEmail: string;
  artistName: string;
  landingPageTitle: string;
  senderName: string;
  senderEmail: string;
  senderCompany?: string | null;
  proposalType: string;
  message: string;
  proposalId: string;
  baseUrl: string;
  // Epic 13: Contract attachment info
  hasContract?: boolean;
  contractFileName?: string;
}

/**
 * Send new proposal notification email to artist
 */
export async function sendProposalNotificationEmail(
  params: ProposalNotificationParams
): Promise<EmailResult> {
  const {
    artistEmail,
    artistName,
    landingPageTitle,
    senderName,
    senderEmail,
    senderCompany,
    proposalType,
    message,
    proposalId,
    baseUrl,
    hasContract,
    contractFileName,
  } = params;

  const proposalTypeLabels: Record<string, string> = {
    collaboration: 'Collaboration',
    licensing: 'Licensing',
    booking: 'Booking',
    recording: 'Recording',
    distribution: 'Distribution',
    other: 'Other',
  };

  const typeLabel = proposalTypeLabels[proposalType] || 'Other';
  const messagePreview = message.length > 200 ? message.substring(0, 200) + '...' : message;
  const viewProposalUrl = `${baseUrl}/dashboard?tab=proposals&id=${proposalId}`;
  const contractInfo = hasContract && contractFileName
    ? ` with contract attached (${contractFileName})`
    : '';

  if (!client) {
    console.log('[EMAIL] Proposal notification email (dev mode):');
    console.log(`  To: ${artistEmail}`);
    console.log(`  Artist: ${artistName}`);
    console.log(`  Landing Page: ${landingPageTitle}`);
    console.log(`  From: ${senderName} <${senderEmail}>`);
    console.log(`  Company: ${senderCompany || '(none)'}`);
    console.log(`  Type: ${typeLabel}`);
    console.log(`  Message: ${messagePreview}`);
    console.log(`  Contract: ${hasContract ? contractFileName : '(none)'}`);
    console.log(`  View URL: ${viewProposalUrl}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: artistEmail,
      TemplateAlias: 'proposal-notification',
      TemplateModel: {
        artistName: artistName || 'there',
        landingPageTitle,
        senderName,
        senderEmail,
        senderCompany: senderCompany || 'Not specified',
        typeLabel,
        messagePreview,
        viewProposalUrl,
        hasContract: !!hasContract,
        contractFileName: contractFileName || '',
        contractInfo,
      },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] Proposal notification email sent to ${artistEmail}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send proposal notification email:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// DIGITAL DOWNLOAD PURCHASE EMAILS
// ============================================

interface PurchaseReceiptParams {
  buyerEmail: string;
  buyerName: string;
  trackTitle: string;
  artistName: string;
  amountPaidCents: number;
  currency: string;
  downloadToken: string;
  downloadExpiresAt: Date;
  maxDownloads: number;
  baseUrl: string;
}

/**
 * Send purchase receipt email with download link
 * UK Consumer Rights compliant - includes required information
 */
export async function sendPurchaseReceiptEmail(
  params: PurchaseReceiptParams
): Promise<EmailResult> {
  const {
    buyerEmail,
    buyerName,
    trackTitle,
    artistName,
    amountPaidCents,
    currency,
    downloadToken,
    downloadExpiresAt,
    maxDownloads,
    baseUrl,
  } = params;

  const downloadUrl = `${baseUrl}/api/downloads/${downloadToken}`;
  const formattedAmount = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountPaidCents / 100);

  const expiryDate = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(downloadExpiresAt);

  const purchaseDate = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());

  if (!client) {
    console.log('[EMAIL] Purchase receipt email (dev mode):');
    console.log(`  To: ${buyerEmail}`);
    console.log(`  Buyer: ${buyerName}`);
    console.log(`  Track: ${trackTitle} by ${artistName}`);
    console.log(`  Amount: ${formattedAmount}`);
    console.log(`  Download URL: ${downloadUrl}`);
    console.log(`  Expires: ${expiryDate}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: buyerEmail,
      TemplateAlias: 'purchase-receipt',
      TemplateModel: {
        buyerName: buyerName || 'there',
        trackTitle,
        artistName,
        purchaseDate,
        formattedAmount,
        downloadUrl,
        maxDownloads,
        expiryDate,
      },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] Purchase receipt email sent to ${buyerEmail}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send purchase receipt email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send artist notification when a track is purchased
 */
export async function sendTrackSoldNotificationEmail(
  artistEmail: string,
  artistName: string,
  trackTitle: string,
  buyerName: string,
  amountEarnedCents: number,
  currency: string
): Promise<EmailResult> {
  const formattedAmount = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountEarnedCents / 100);

  if (!client) {
    console.log('[EMAIL] Track sold notification email (dev mode):');
    console.log(`  To: ${artistEmail}`);
    console.log(`  Artist: ${artistName}`);
    console.log(`  Track: ${trackTitle}`);
    console.log(`  Buyer: ${buyerName}`);
    console.log(`  Amount earned: ${formattedAmount}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: artistEmail,
      TemplateAlias: 'track-sold',
      TemplateModel: {
        artistName,
        trackTitle,
        buyerName: buyerName || 'A customer',
        formattedAmount,
      },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] Track sold notification email sent to ${artistEmail}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send track sold notification email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send purchase receipt email for video purchases
 */
interface VideoPurchaseReceiptParams {
  buyerEmail: string;
  buyerName: string;
  videoTitle: string;
  artistName: string;
  amountPaidCents: number;
  currency: string;
  accessToken: string;
  accessExpiresAt: Date;
  videoId: string;
  landingPageSlug: string;
  baseUrl: string;
}

export async function sendVideoPurchaseReceiptEmail(
  params: VideoPurchaseReceiptParams
): Promise<EmailResult> {
  const {
    buyerEmail,
    buyerName,
    videoTitle,
    artistName,
    amountPaidCents,
    currency,
    accessExpiresAt,
    landingPageSlug,
    baseUrl,
  } = params;

  const watchUrl = `${baseUrl}/artist/${landingPageSlug}`;
  const formattedAmount = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountPaidCents / 100);

  const expiryDate = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(accessExpiresAt);

  const purchaseDate = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());

  if (!client) {
    console.log('[EMAIL] Video purchase receipt email (dev mode):');
    console.log(`  To: ${buyerEmail}`);
    console.log(`  Buyer: ${buyerName}`);
    console.log(`  Video: ${videoTitle} by ${artistName}`);
    console.log(`  Amount: ${formattedAmount}`);
    console.log(`  Watch URL: ${watchUrl}`);
    console.log(`  Expires: ${expiryDate}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: buyerEmail,
      TemplateAlias: 'video-purchase-receipt',
      TemplateModel: {
        buyerName: buyerName || 'there',
        videoTitle,
        artistName,
        purchaseDate,
        formattedAmount,
        watchUrl,
        expiryDate,
      },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] Video purchase receipt email sent to ${buyerEmail}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send video purchase receipt email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send artist notification when a video is purchased
 */
export async function sendVideoSoldNotificationEmail(
  artistEmail: string,
  artistName: string,
  videoTitle: string,
  buyerName: string,
  amountEarnedCents: number,
  currency: string
): Promise<EmailResult> {
  const formattedAmount = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountEarnedCents / 100);

  if (!client) {
    console.log('[EMAIL] Video sold notification email (dev mode):');
    console.log(`  To: ${artistEmail}`);
    console.log(`  Artist: ${artistName}`);
    console.log(`  Video: ${videoTitle}`);
    console.log(`  Buyer: ${buyerName}`);
    console.log(`  Amount earned: ${formattedAmount}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: artistEmail,
      TemplateAlias: 'video-sold',
      TemplateModel: {
        artistName,
        videoTitle,
        buyerName: buyerName || 'A customer',
        formattedAmount,
      },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] Video sold notification email sent to ${artistEmail}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send video sold notification email:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// COLLABORATION SPLIT VERIFICATION EMAILS
// ============================================

interface SplitVerificationEmailParams {
  to: string;
  collaboratorName: string;
  artistName: string;
  trackTitle: string;
  splitPercentage: number;
  verificationToken: string;
  deadline: Date;
  isExistingUser: boolean;
  baseUrl: string;
}

/**
 * Send split verification email to collaborator
 */
export async function sendSplitVerificationEmail(
  params: SplitVerificationEmailParams
): Promise<EmailResult> {
  const {
    to,
    collaboratorName,
    artistName,
    trackTitle,
    splitPercentage,
    verificationToken,
    deadline,
    isExistingUser,
    baseUrl,
  } = params;
  const verifyUrl = `${baseUrl}/verify-split/${verificationToken}`;

  const formattedDeadline = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(deadline);

  if (!client) {
    console.log('[EMAIL] Split verification email (dev mode):');
    console.log(`  To: ${to}`);
    console.log(`  Collaborator: ${collaboratorName}`);
    console.log(`  Artist: ${artistName}`);
    console.log(`  Track: ${trackTitle}`);
    console.log(`  Split: ${splitPercentage}%`);
    console.log(`  Deadline: ${formattedDeadline}`);
    console.log(`  Verify URL: ${verifyUrl}`);
    console.log(`  Existing user: ${isExistingUser}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const accountAction = isExistingUser
      ? 'Log in to verify your split and start receiving royalties.'
      : 'You\'ll need to create a free Aermuse account to receive your royalties. It only takes a minute!';

    const accountActionText = isExistingUser
      ? 'Log in to verify and start receiving royalties.'
      : 'You\'ll need to create a free Aermuse account to receive your royalties.';

    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: to,
      TemplateAlias: 'split-verification',
      TemplateModel: {
        collaboratorName,
        artistName,
        trackTitle,
        splitPercentage,
        formattedDeadline,
        verifyUrl,
        accountAction,
        accountActionText,
      },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] Split verification email sent to ${to}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send split verification email:', error);
    return { success: false, error: String(error) };
  }
}

interface SplitVerifiedNotificationParams {
  to: string;
  artistName: string;
  trackTitle: string;
  collaboratorName: string;
}

/**
 * Send notification to artist when a collaborator verifies their split
 */
export async function sendSplitVerifiedNotificationEmail(
  params: SplitVerifiedNotificationParams
): Promise<EmailResult> {
  const { to, artistName, trackTitle, collaboratorName } = params;

  if (!client) {
    console.log('[EMAIL] Split verified notification email (dev mode):');
    console.log(`  To: ${to}`);
    console.log(`  Artist: ${artistName}`);
    console.log(`  Track: ${trackTitle}`);
    console.log(`  Collaborator: ${collaboratorName}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: to,
      TemplateAlias: 'split-verified',
      TemplateModel: { artistName, trackTitle, collaboratorName },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] Split verified notification email sent to ${to}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send split verified notification email:', error);
    return { success: false, error: String(error) };
  }
}

interface SplitRejectedNotificationParams {
  to: string;
  artistName: string;
  trackTitle: string;
  collaboratorName: string;
  reason: string;
}

/**
 * Send notification to artist when a collaborator rejects their split
 */
export async function sendSplitRejectedNotificationEmail(
  params: SplitRejectedNotificationParams
): Promise<EmailResult> {
  const { to, artistName, trackTitle, collaboratorName, reason } = params;

  if (!client) {
    console.log('[EMAIL] Split rejected notification email (dev mode):');
    console.log(`  To: ${to}`);
    console.log(`  Artist: ${artistName}`);
    console.log(`  Track: ${trackTitle}`);
    console.log(`  Collaborator: ${collaboratorName}`);
    console.log(`  Reason: ${reason}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: to,
      TemplateAlias: 'split-rejected',
      TemplateModel: { artistName, trackTitle, collaboratorName, reason },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] Split rejected notification email sent to ${to}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send split rejected notification email:', error);
    return { success: false, error: String(error) };
  }
}

interface AllSplitsVerifiedParams {
  to: string;
  artistName: string;
  trackTitle: string;
  baseUrl: string;
}

/**
 * Send notification to artist when all splits are verified
 */
export async function sendAllSplitsVerifiedEmail(
  params: AllSplitsVerifiedParams
): Promise<EmailResult> {
  const { to, artistName, trackTitle, baseUrl } = params;
  const dashboardUrl = `${baseUrl}/dashboard?tab=music`;

  if (!client) {
    console.log('[EMAIL] All splits verified email (dev mode):');
    console.log(`  To: ${to}`);
    console.log(`  Artist: ${artistName}`);
    console.log(`  Track: ${trackTitle}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: to,
      TemplateAlias: 'all-splits-verified',
      TemplateModel: { artistName, trackTitle, dashboardUrl },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] All splits verified email sent to ${to}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send all splits verified email:', error);
    return { success: false, error: String(error) };
  }
}

interface SplitExpiredParams {
  to: string;
  collaboratorName: string;
  trackTitle: string;
}

/**
 * Send notification to collaborator when their verification deadline passes
 */
export async function sendSplitExpiredEmail(
  params: SplitExpiredParams
): Promise<EmailResult> {
  const { to, collaboratorName, trackTitle } = params;

  if (!client) {
    console.log('[EMAIL] Split expired email (dev mode):');
    console.log(`  To: ${to}`);
    console.log(`  Collaborator: ${collaboratorName}`);
    console.log(`  Track: ${trackTitle}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: FROM_EMAIL,
      To: to,
      TemplateAlias: 'split-expired',
      TemplateModel: { collaboratorName, trackTitle },
      MessageStream: 'outbound',
    });

    console.log(`[EMAIL] Split expired email sent to ${to}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send split expired email:', error);
    return { success: false, error: String(error) };
  }
}
