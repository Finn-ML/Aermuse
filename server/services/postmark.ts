import * as postmark from 'postmark';

const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;
const BASE_URL = process.env.APP_URL || process.env.BASE_URL || 'http://localhost:5000';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@aermuse.com';

// Only create client if API key is configured
const client = POSTMARK_API_KEY ? new postmark.ServerClient(POSTMARK_API_KEY) : null;

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Design System Colors
const COLORS = {
  burgundy: '#660033',
  burgundyLight: '#8B0045',
  burgundyDark: '#4A0026',
  champagne: '#F7E6CA',
  champagneLight: '#FDF8F0',
  cream: '#FFFAF3',
  text: '#2D2D2D',
  textMuted: '#666666',
  textLight: '#999999',
  success: '#28a745',
  successLight: '#d4edda',
  warning: '#f0ad4e',
  gray: '#6c757d',
};

// Base email template with champagne/burgundy design system
function emailTemplate({
  title,
  preheader,
  greeting,
  content,
  buttonText,
  buttonUrl,
  footerNote,
  accentColor = COLORS.burgundy,
}: {
  title: string;
  preheader?: string;
  greeting: string;
  content: string;
  buttonText?: string;
  buttonUrl?: string;
  footerNote?: string;
  accentColor?: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${preheader ? `<!--[if !mso]><!-- --><span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span><!--<![endif]-->` : ''}
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: ${COLORS.champagne};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.champagne};">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto;">
          
          <!-- Logo Header -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background: linear-gradient(135deg, ${COLORS.burgundy} 0%, ${COLORS.burgundyLight} 100%); padding: 16px 32px; border-radius: 50px;">
                    <span style="font-size: 24px; font-weight: 700; color: ${COLORS.champagne}; letter-spacing: 2px; text-transform: lowercase;">aermuse</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.cream}; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 24px rgba(102, 0, 51, 0.08);">
                
                <!-- Accent Bar -->
                <tr>
                  <td style="height: 6px; background: linear-gradient(90deg, ${accentColor} 0%, ${COLORS.burgundyLight} 100%);"></td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 48px 40px;">
                    <!-- Title -->
                    <h1 style="margin: 0 0 24px 0; font-size: 28px; font-weight: 700; color: ${COLORS.burgundy}; text-align: center;">
                      ${title}
                    </h1>
                    
                    <!-- Greeting -->
                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${COLORS.text};">
                      ${greeting}
                    </p>
                    
                    <!-- Main Content -->
                    <div style="margin: 0 0 28px 0; font-size: 16px; line-height: 1.7; color: ${COLORS.text};">
                      ${content}
                    </div>
                    
                    ${buttonText && buttonUrl ? `
                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 32px 0;">
                      <tr>
                        <td style="text-align: center;">
                          <a href="${buttonUrl}" style="display: inline-block; padding: 18px 48px; background: linear-gradient(135deg, ${COLORS.burgundy} 0%, ${COLORS.burgundyLight} 100%); color: ${COLORS.champagne}; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 4px 16px rgba(102, 0, 51, 0.25);">
                            ${buttonText}
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Fallback Link -->
                    <p style="margin: 24px 0 0 0; font-size: 13px; color: ${COLORS.textLight}; text-align: center;">
                      Or copy this link: <br>
                      <a href="${buttonUrl}" style="color: ${COLORS.burgundy}; word-break: break-all;">${buttonUrl}</a>
                    </p>
                    ` : ''}
                    
                    ${footerNote ? `
                    <!-- Footer Note -->
                    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(102, 0, 51, 0.1);">
                      <p style="margin: 0; font-size: 14px; color: ${COLORS.textMuted}; line-height: 1.6;">
                        ${footerNote}
                      </p>
                    </div>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 20px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: ${COLORS.burgundy}; font-weight: 600;">
                The Aermuse Team
              </p>
              <p style="margin: 0; font-size: 12px; color: ${COLORS.textMuted};">
                Empowering artists to own their careers
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Info box component for highlighting important information
function infoBox(content: string, title?: string): string {
  return `
    <div style="background-color: ${COLORS.champagneLight}; border-left: 4px solid ${COLORS.burgundy}; border-radius: 12px; padding: 20px 24px; margin: 20px 0;">
      ${title ? `<p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: ${COLORS.burgundy}; text-transform: uppercase; letter-spacing: 0.5px;">${title}</p>` : ''}
      <p style="margin: 0; font-size: 15px; color: ${COLORS.text}; line-height: 1.5;">${content}</p>
    </div>
  `;
}

// Success box for confirmations
function successBox(content: string): string {
  return `
    <div style="background-color: ${COLORS.successLight}; border-radius: 12px; padding: 20px 24px; margin: 20px 0; text-align: center;">
      <span style="font-size: 32px; display: block; margin-bottom: 12px;">✓</span>
      <p style="margin: 0; font-size: 15px; color: ${COLORS.success}; font-weight: 600;">${content}</p>
    </div>
  `;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  userName: string
): Promise<EmailResult> {
  const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`;

  if (!client) {
    console.log('[EMAIL] Password reset email (dev mode):');
    console.log(`  To: ${email}`);
    console.log(`  Name: ${userName}`);
    console.log(`  Reset URL: ${resetUrl}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmail({
      From: FROM_EMAIL,
      To: email,
      Subject: 'Reset Your Aermuse Password',
      HtmlBody: emailTemplate({
        title: 'Password Reset',
        preheader: 'Reset your Aermuse account password',
        greeting: `Hi ${userName},`,
        content: `We received a request to reset your password. Click the button below to create a new password for your account.`,
        buttonText: 'Reset Password',
        buttonUrl: resetUrl,
        footerNote: 'This link will expire in 1 hour. If you didn\'t request this reset, you can safely ignore this email.',
      }),
      TextBody: `Hi ${userName},\n\nWe received a request to reset your password. Visit this link to set a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.\n\n- The Aermuse Team`,
      MessageStream: 'outbound'
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
  userName: string
): Promise<EmailResult> {
  const verifyUrl = `${BASE_URL}/verify-email?token=${verificationToken}`;

  if (!client) {
    console.log('[EMAIL] Verification email (dev mode):');
    console.log(`  To: ${email}`);
    console.log(`  Name: ${userName}`);
    console.log(`  Verify URL: ${verifyUrl}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const result = await client.sendEmail({
      From: FROM_EMAIL,
      To: email,
      Subject: 'Welcome to Aermuse - Verify Your Email',
      HtmlBody: emailTemplate({
        title: 'Welcome to Aermuse!',
        preheader: 'Verify your email to get started',
        greeting: `Hi ${userName},`,
        content: `Thanks for joining Aermuse! We're excited to help you take control of your music career. Please verify your email address to unlock all features.`,
        buttonText: 'Verify Email',
        buttonUrl: verifyUrl,
        footerNote: 'This link will expire in 24 hours. If you didn\'t create this account, please ignore this email.',
      }),
      TextBody: `Hi ${userName},\n\nThanks for signing up. Please verify your email address by visiting this link:\n\n${verifyUrl}\n\nThis link will expire in 24 hours.\n\n- The Aermuse Team`,
      MessageStream: 'outbound'
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
  message?: string | null
): Promise<EmailResult> {
  if (!client) {
    console.log('[EMAIL] Signature request email (dev mode):');
    console.log(`  To: ${signatoryEmail}`);
    console.log(`  Signatory: ${signatoryName}`);
    console.log(`  From: ${initiatorName}`);
    console.log(`  Contract: ${contractTitle}`);
    console.log(`  Signing URL: ${signingUrl}`);
    console.log(`  Message: ${message || '(none)'}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const messageBox = message ? infoBox(`"${message}"`, 'Personal Message') : '';
    
    const result = await client.sendEmail({
      From: FROM_EMAIL,
      To: signatoryEmail,
      Subject: `${initiatorName} has requested your signature on "${contractTitle}"`,
      HtmlBody: emailTemplate({
        title: 'Signature Request',
        preheader: `${initiatorName} needs your signature on a contract`,
        greeting: `Hi ${signatoryName},`,
        content: `<strong>${initiatorName}</strong> has requested your signature on the following contract:
          ${infoBox(contractTitle, 'Contract')}
          ${messageBox}
          Please review and sign the document at your earliest convenience.`,
        buttonText: 'Review & Sign',
        buttonUrl: signingUrl,
        footerNote: 'This signature request was sent via Aermuse. If you weren\'t expecting this, please contact the sender directly.',
      }),
      TextBody: `Hi ${signatoryName},\n\n${initiatorName} has requested your signature on the following contract:\n\nContract: ${contractTitle}${message ? `\nMessage: "${message}"` : ''}\n\nSign here: ${signingUrl}\n\n- The Aermuse Team`,
      MessageStream: 'outbound'
    });

    console.log(`[EMAIL] Signature request email sent to ${signatoryEmail}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send signature request email:', error);
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
    const result = await client.sendEmail({
      From: FROM_EMAIL,
      To: signatoryEmail,
      Subject: `You've signed "${contractTitle}"`,
      HtmlBody: emailTemplate({
        title: 'Signature Confirmed',
        preheader: 'Your signature has been recorded',
        greeting: `Hi ${signatoryName},`,
        content: `${successBox('Your signature has been recorded!')}
          ${infoBox(contractTitle, 'Contract')}
          You'll receive the final signed copy once all parties have completed signing.`,
        footerNote: 'Keep this email for your records. A copy of the fully executed document will be sent when all signatures are collected.',
        accentColor: COLORS.success,
      }),
      TextBody: `Hi ${signatoryName},\n\nYour signature on "${contractTitle}" has been recorded.\n\nYou'll receive the final signed copy once all parties have signed.\n\n- The Aermuse Team`,
      MessageStream: 'outbound'
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
    const result = await client.sendEmail({
      From: FROM_EMAIL,
      To: email,
      Subject: `"${contractTitle}" has been fully signed`,
      HtmlBody: emailTemplate({
        title: 'Contract Complete!',
        preheader: 'All parties have signed - download your copy',
        greeting: `Hi ${recipientName},`,
        content: `${successBox('All signatures collected!')}
          ${infoBox(contractTitle, 'Contract')}
          Great news! All parties have signed this contract. Your fully executed document is ready for download.`,
        buttonText: 'Download Signed Contract',
        buttonUrl: downloadUrl,
        footerNote: 'A copy has also been saved to your Aermuse account for safekeeping. We recommend storing this document in a secure location.',
        accentColor: COLORS.success,
      }),
      TextBody: `Hi ${recipientName},\n\nAll parties have signed "${contractTitle}".\n\nDownload your signed copy here: ${downloadUrl}\n\nA copy has also been saved to your Aermuse account.\n\n- The Aermuse Team`,
      MessageStream: 'outbound'
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
    const result = await client.sendEmail({
      From: FROM_EMAIL,
      To: email,
      Subject: `Signature request cancelled for "${contractTitle}"`,
      HtmlBody: emailTemplate({
        title: 'Request Cancelled',
        preheader: 'A signature request has been cancelled',
        greeting: `Hi ${recipientName},`,
        content: `${infoBox(contractTitle, 'Contract')}
          The signature request for this contract has been cancelled by <strong>${initiatorName}</strong>.
          <p style="margin-top: 16px; padding: 12px 16px; background-color: ${COLORS.champagneLight}; border-radius: 8px; font-size: 14px; color: ${COLORS.textMuted};">
            No action is required from you.
          </p>`,
        footerNote: 'If you have questions about this cancellation, please contact the sender directly.',
        accentColor: COLORS.gray,
      }),
      TextBody: `Hi ${recipientName},\n\nThe signature request for "${contractTitle}" has been cancelled by ${initiatorName}.\n\nNo action is required from you.\n\n- The Aermuse Team`,
      MessageStream: 'outbound'
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
    const result = await client.sendEmail({
      From: FROM_EMAIL,
      To: email,
      Subject: 'Your Aermuse Account Has Been Deleted',
      HtmlBody: emailTemplate({
        title: 'Account Deleted',
        preheader: 'Your Aermuse account has been deleted',
        greeting: `Hi ${userName},`,
        content: `Your Aermuse account has been successfully deleted. Your data will be permanently removed after 30 days.
          <p style="margin-top: 20px;">We're sorry to see you go. If you ever want to return, you're always welcome to create a new account.</p>`,
        footerNote: 'If you didn\'t request this deletion, please contact support immediately at support@aermuse.com',
        accentColor: COLORS.gray,
      }),
      TextBody: `Hi ${userName},\n\nYour Aermuse account has been successfully deleted. Your data will be permanently removed after 30 days.\n\nIf you didn't request this deletion, please contact support immediately.\n\nWe're sorry to see you go. If you ever want to return, you can create a new account at any time.\n\n- The Aermuse Team`,
      MessageStream: 'outbound'
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
  const viewProposalUrl = `${BASE_URL}/dashboard?tab=proposals&id=${proposalId}`;

  if (!client) {
    console.log('[EMAIL] Proposal notification email (dev mode):');
    console.log(`  To: ${artistEmail}`);
    console.log(`  Artist: ${artistName}`);
    console.log(`  Landing Page: ${landingPageTitle}`);
    console.log(`  From: ${senderName} <${senderEmail}>`);
    console.log(`  Company: ${senderCompany || '(none)'}`);
    console.log(`  Type: ${typeLabel}`);
    console.log(`  Message: ${messagePreview}`);
    console.log(`  View URL: ${viewProposalUrl}`);
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const proposalDetails = `
      <div style="background-color: ${COLORS.cream}; border-radius: 16px; padding: 24px; margin: 20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 10px 0; color: ${COLORS.textMuted}; font-size: 14px; width: 100px;">From:</td>
            <td style="padding: 10px 0; color: ${COLORS.text}; font-size: 14px; font-weight: 600;">${senderName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: ${COLORS.textMuted}; font-size: 14px;">Email:</td>
            <td style="padding: 10px 0;"><a href="mailto:${senderEmail}" style="color: ${COLORS.burgundy}; font-size: 14px;">${senderEmail}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: ${COLORS.textMuted}; font-size: 14px;">Company:</td>
            <td style="padding: 10px 0; color: ${COLORS.text}; font-size: 14px;">${senderCompany || 'Not specified'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: ${COLORS.textMuted}; font-size: 14px;">Type:</td>
            <td style="padding: 10px 0;">
              <span style="display: inline-block; background: linear-gradient(135deg, ${COLORS.burgundy} 0%, ${COLORS.burgundyLight} 100%); color: ${COLORS.champagne}; font-size: 12px; padding: 6px 16px; border-radius: 50px; font-weight: 600;">${typeLabel}</span>
            </td>
          </tr>
        </table>
      </div>
    `;

    const result = await client.sendEmail({
      From: FROM_EMAIL,
      To: artistEmail,
      Subject: `New ${typeLabel} Proposal for ${landingPageTitle}`,
      HtmlBody: emailTemplate({
        title: 'New Proposal Received!',
        preheader: `${senderName} sent you a ${typeLabel} proposal`,
        greeting: `Hi ${artistName || 'there'},`,
        content: `You've received a new <strong>${typeLabel}</strong> proposal through your Aermuse page "<strong>${landingPageTitle}</strong>"!
          ${proposalDetails}
          ${infoBox(messagePreview, 'Message')}
          <p style="margin-top: 16px; font-size: 14px; color: ${COLORS.textMuted}; text-align: center;">
            You can also reply directly to <a href="mailto:${senderEmail}" style="color: ${COLORS.burgundy};">${senderEmail}</a>
          </p>`,
        buttonText: 'View Full Proposal',
        buttonUrl: viewProposalUrl,
        footerNote: 'You received this because someone submitted a proposal through your Aermuse landing page.',
      }),
      TextBody: `Hi ${artistName || 'there'},\n\nYou've received a new ${typeLabel} proposal through your Aermuse page "${landingPageTitle}"!\n\nFrom: ${senderName}\nEmail: ${senderEmail}\nCompany: ${senderCompany || 'Not specified'}\nType: ${typeLabel}\n\nMessage:\n${messagePreview}\n\nView full proposal: ${viewProposalUrl}\n\nYou can reply directly to ${senderEmail}\n\n- The Aermuse Team`,
      MessageStream: 'outbound'
    });

    console.log(`[EMAIL] Proposal notification email sent to ${artistEmail}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send proposal notification email:', error);
    return { success: false, error: String(error) };
  }
}
