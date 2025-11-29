import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * bcrypt cost factor for password hashing.
 * Cost 12 provides ~200ms hash time, sufficient security against GPU attacks.
 */
const BCRYPT_COST = 12;

/**
 * Hash a password using bcrypt with the configured cost factor.
 * @param password - The plain text password to hash
 * @returns The bcrypt hash string
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Compare a plain password against a stored hash.
 * Supports both bcrypt and legacy SHA-256 hashes.
 * If a legacy SHA-256 hash is matched, it will be automatically migrated to bcrypt.
 *
 * @param plainPassword - The plain text password to verify
 * @param hashedPassword - The stored hash to compare against
 * @param userId - Optional user ID for migration logging and database update
 * @returns True if the password matches, false otherwise
 */
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string,
  userId?: string
): Promise<boolean> {
  // Detect hash type by format
  // bcrypt hashes start with $2a$ or $2b$ followed by cost factor
  const isBcrypt = hashedPassword.startsWith('$2b$') || hashedPassword.startsWith('$2a$');

  if (isBcrypt) {
    // Modern bcrypt comparison
    return bcrypt.compare(plainPassword, hashedPassword);
  } else {
    // Legacy SHA-256 comparison (64 character hex string)
    const sha256Hash = createHash('sha256').update(plainPassword).digest('hex');
    const matches = sha256Hash === hashedPassword;

    // Migrate to bcrypt on successful login
    if (matches && userId) {
      try {
        const newHash = await hashPassword(plainPassword);
        await db.update(users)
          .set({ password: newHash })
          .where(eq(users.id, userId));
        console.log(`[AUTH] Password migrated to bcrypt for user ${userId}`);
      } catch (error) {
        // Log migration failure but don't break login
        console.error(`[AUTH] Failed to migrate password for user ${userId}:`, error);
      }
    }

    return matches;
  }
}

/**
 * Generate a cryptographically secure random token.
 * Uses 32 bytes (256 bits) of entropy, returned as 64-character hex string.
 * @returns A secure random token string
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}
