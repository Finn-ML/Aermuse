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
