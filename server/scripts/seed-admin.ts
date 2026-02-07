import { storage } from '../storage';
import { hashPassword } from '../lib/auth';

/**
 * Seed a Theta-tier test account for development.
 * Idempotent - will not create duplicates. Only runs in dev.
 */
export async function seedThetaTestAccount(): Promise<void> {
  if (process.env.NODE_ENV === 'production') return;

  const email = 'dev-theta@aermuse.com';
  const password = 'Theta123!';
  const name = 'Theta Tester';

  try {
    const existing = await storage.getUserByEmail(email);
    if (existing) {
      // Ensure it's theta tier
      if (existing.subscriptionTier !== 'theta' || existing.subscriptionStatus !== 'active') {
        await storage.updateUser(existing.id, {
          subscriptionTier: 'theta',
          subscriptionStatus: 'active',
          emailVerified: true,
        } as any);
        console.log('[SEED] Updated theta test account to active theta tier');
      }
      return;
    }

    const hashedPassword = await hashPassword(password);
    await storage.createUser({
      email,
      password: hashedPassword,
      name,
      artistName: 'Theta Artist',
      role: 'user',
      emailVerified: true,
      subscriptionTier: 'theta',
      subscriptionStatus: 'active',
      avatarInitials: 'TT',
    } as any);

    console.log(`[SEED] Created theta test account: ${email} / ${password}`);
  } catch (error) {
    console.error('[SEED] Failed to seed theta test account:', error);
  }
}

/**
 * Seed an admin user from environment variables.
 * This function is idempotent - it will not create duplicates.
 *
 * Environment variables:
 * - ADMIN_EMAIL: Required. The admin user's email address.
 * - ADMIN_PASSWORD: Required if ADMIN_EMAIL is set. The admin's password.
 * - ADMIN_NAME: Optional. Defaults to 'Admin'.
 */
export async function seedAdmin(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Admin';

  if (!adminEmail) {
    console.log('[SEED] No ADMIN_EMAIL set, skipping admin seeding');
    return;
  }

  if (!adminPassword) {
    console.error('[SEED] ADMIN_EMAIL set but ADMIN_PASSWORD missing, skipping admin seeding');
    return;
  }

  try {
    // Check if user already exists
    const existing = await storage.getUserByEmail(adminEmail);

    if (existing) {
      if (existing.role === 'admin') {
        console.log('[SEED] Admin user already exists');
      } else {
        // Upgrade existing user to admin
        await storage.updateUser(existing.id, { role: 'admin' } as any);
        console.log(`[SEED] Upgraded existing user ${adminEmail} to admin`);
      }
      return;
    }

    // Create new admin user
    const hashedPassword = await hashPassword(adminPassword);

    await storage.createUser({
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
      role: 'admin',
      emailVerified: true, // Admin is auto-verified
      avatarInitials: adminName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
    } as any);

    console.log(`[SEED] Created admin user: ${adminEmail}`);
  } catch (error) {
    console.error('[SEED] Failed to seed admin user:', error);
  }
}
