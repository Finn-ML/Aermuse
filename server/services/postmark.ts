import * as postmark from 'postmark';

const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
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
  userName: string
): Promise<EmailResult> {
  const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`;

  if (!client) {
    // Development mode - log email instead of sending
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
      HtmlBody: `
        <h2>Password Reset Request</h2>
        <p>Hi ${userName},</p>
        <p>We received a request to reset your password. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #660033; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>- The Aermuse Team</p>
      `,
      TextBody: `
Hi ${userName},

We received a request to reset your password. Visit this link to set a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

- The Aermuse Team
      `,
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
    // Development mode - log email instead of sending
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
      Subject: 'Verify Your Aermuse Account',
      HtmlBody: `
        <h2>Welcome to Aermuse!</h2>
        <p>Hi ${userName},</p>
        <p>Thanks for signing up. Please verify your email address by clicking the link below:</p>
        <p><a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #660033; color: white; text-decoration: none; border-radius: 4px;">Verify Email</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>- The Aermuse Team</p>
      `,
      TextBody: `
Hi ${userName},

Thanks for signing up. Please verify your email address by visiting this link:

${verifyUrl}

This link will expire in 24 hours.

- The Aermuse Team
      `,
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
    const result = await client.sendEmail({
      From: FROM_EMAIL,
      To: signatoryEmail,
      Subject: `${initiatorName} has requested your signature on "${contractTitle}"`,
      HtmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #660033 0%, #8B0045 100%); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0;">Signature Request</h1>
          </div>
          <div style="padding: 32px; background: #f7e6ca;">
            <p style="font-size: 16px; color: #333;">Hi ${signatoryName},</p>
            <p style="font-size: 16px; color: #333;"><strong>${initiatorName}</strong> has requested your signature on the following contract:</p>
            <div style="background: white; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <h2 style="color: #660033; margin: 0 0 8px 0;">${contractTitle}</h2>
              ${message ? `<p style="color: #666; margin: 0;">"${message}"</p>` : ''}
            </div>
            <p style="text-align: center;">
              <a href="${signingUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #660033 0%, #8B0045 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Sign Now</a>
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 24px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="font-size: 12px; color: #999; word-break: break-all;">${signingUrl}</p>
          </div>
          <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
            <p>Powered by Aermuse - Music Industry Contract Management</p>
          </div>
        </div>
      `,
      TextBody: `
Hi ${signatoryName},

${initiatorName} has requested your signature on the following contract:

Contract: ${contractTitle}
${message ? `Message: "${message}"` : ''}

Sign here: ${signingUrl}

- The Aermuse Team
      `,
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
      HtmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0;">✓ Signature Confirmed</h1>
          </div>
          <div style="padding: 32px; background: #f7e6ca;">
            <p style="font-size: 16px; color: #333;">Hi ${signatoryName},</p>
            <p style="font-size: 16px; color: #333;">Your signature on <strong>"${contractTitle}"</strong> has been recorded.</p>
            <p style="font-size: 14px; color: #666;">You'll receive the final signed copy once all parties have signed.</p>
          </div>
          <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
            <p>Powered by Aermuse - Music Industry Contract Management</p>
          </div>
        </div>
      `,
      TextBody: `
Hi ${signatoryName},

Your signature on "${contractTitle}" has been recorded.

You'll receive the final signed copy once all parties have signed.

- The Aermuse Team
      `,
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
      HtmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0;">✓ Contract Complete</h1>
          </div>
          <div style="padding: 32px; background: #f7e6ca;">
            <p style="font-size: 16px; color: #333;">Hi ${recipientName},</p>
            <p style="font-size: 16px; color: #333;">All parties have signed <strong>"${contractTitle}"</strong>.</p>
            <p style="text-align: center; margin: 24px 0;">
              <a href="${downloadUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #660033 0%, #8B0045 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Download Signed Contract</a>
            </p>
            <p style="font-size: 14px; color: #666;">A copy has also been saved to your Aermuse account.</p>
          </div>
          <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
            <p>Powered by Aermuse - Music Industry Contract Management</p>
          </div>
        </div>
      `,
      TextBody: `
Hi ${recipientName},

All parties have signed "${contractTitle}".

Download your signed copy here: ${downloadUrl}

A copy has also been saved to your Aermuse account.

- The Aermuse Team
      `,
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
      HtmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #6c757d; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0;">Request Cancelled</h1>
          </div>
          <div style="padding: 32px; background: #f7e6ca;">
            <p style="font-size: 16px; color: #333;">Hi ${recipientName},</p>
            <p style="font-size: 16px; color: #333;">The signature request for <strong>"${contractTitle}"</strong> has been cancelled by ${initiatorName}.</p>
            <p style="font-size: 14px; color: #666;">No action is required from you.</p>
          </div>
          <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
            <p>Powered by Aermuse - Music Industry Contract Management</p>
          </div>
        </div>
      `,
      TextBody: `
Hi ${recipientName},

The signature request for "${contractTitle}" has been cancelled by ${initiatorName}.

No action is required from you.

- The Aermuse Team
      `,
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
      HtmlBody: `
        <h2>Account Deleted</h2>
        <p>Hi ${userName},</p>
        <p>Your Aermuse account has been successfully deleted. Your data will be permanently removed after 30 days.</p>
        <p>If you didn't request this deletion, please contact support immediately.</p>
        <p>We're sorry to see you go. If you ever want to return, you can create a new account at any time.</p>
        <p>- The Aermuse Team</p>
      `,
      TextBody: `
Hi ${userName},

Your Aermuse account has been successfully deleted. Your data will be permanently removed after 30 days.

If you didn't request this deletion, please contact support immediately.

We're sorry to see you go. If you ever want to return, you can create a new account at any time.

- The Aermuse Team
      `,
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
    const result = await client.sendEmail({
      From: FROM_EMAIL,
      To: artistEmail,
      Subject: `New ${typeLabel} Proposal for ${landingPageTitle}`,
      HtmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #722F37 0%, #8B3A42 100%); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0;">New Proposal Received</h1>
          </div>
          <div style="padding: 32px; background: #f7e6ca;">
            <p style="font-size: 16px; color: #333;">Hi ${artistName || 'there'},</p>
            <p style="font-size: 16px; color: #333;">
              You've received a new <strong>${typeLabel}</strong> proposal through your Aermuse page "<strong>${landingPageTitle}</strong>"!
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">From:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${senderName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Email:</td>
                  <td style="padding: 8px 0;"><a href="mailto:${senderEmail}" style="color: #722F37; font-size: 14px;">${senderEmail}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Company:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;">${senderCompany || 'Not specified'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Type:</td>
                  <td style="padding: 8px 0;">
                    <span style="display: inline-block; background-color: #722F37; color: #fff; font-size: 12px; padding: 4px 12px; border-radius: 12px;">${typeLabel}</span>
                  </td>
                </tr>
              </table>
            </div>

            <div style="margin-bottom: 24px;">
              <p style="margin: 0 0 8px; color: #666; font-size: 14px; font-weight: 600;">Message:</p>
              <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.6; background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #722F37;">
                ${messagePreview}
              </p>
            </div>

            <p style="text-align: center;">
              <a href="${viewProposalUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #722F37 0%, #8B3A42 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">View Full Proposal</a>
            </p>

            <p style="margin: 24px 0 0; color: #666; font-size: 14px; text-align: center;">
              You can reply directly to <a href="mailto:${senderEmail}" style="color: #722F37;">${senderEmail}</a>
            </p>
          </div>
          <div style="padding: 16px; text-align: center; color: #999; font-size: 12px; background: #f5f5f5;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Aermuse. All rights reserved.</p>
            <p style="margin: 8px 0 0;">You received this because someone submitted a proposal through your Aermuse page.</p>
          </div>
        </div>
      `,
      TextBody: `
Hi ${artistName || 'there'},

You've received a new ${typeLabel} proposal through your Aermuse page "${landingPageTitle}"!

From: ${senderName}
Email: ${senderEmail}
Company: ${senderCompany || 'Not specified'}
Type: ${typeLabel}

Message:
${messagePreview}

View full proposal: ${viewProposalUrl}

You can reply directly to ${senderEmail}

- The Aermuse Team
      `,
      MessageStream: 'outbound'
    });

    console.log(`[EMAIL] Proposal notification email sent to ${artistEmail}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[EMAIL] Failed to send proposal notification email:', error);
    return { success: false, error: String(error) };
  }
}
