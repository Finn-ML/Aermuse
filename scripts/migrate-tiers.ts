/**
 * Tier Migration Script (Epic 12, Story 12-10)
 *
 * Migrates existing active subscribers to the 'beta' tier.
 * This ensures backwards compatibility - all existing paying users
 * continue to have access to their current features.
 *
 * Usage:
 *   npx tsx scripts/migrate-tiers.ts           # Execute migration
 *   npx tsx scripts/migrate-tiers.ts --dry-run # Preview without changes
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq, and, or, isNull } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const isDryRun = process.argv.includes('--dry-run');

interface MigrationLogEntry {
  userId: string;
  email: string;
  previousTier: string | null;
  newTier: string;
  timestamp: string;
}

async function migrateTiers() {
  console.log('[MIGRATION] Starting tier migration...');
  console.log(`[MIGRATION] Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);

  try {
    // Find all active subscribers without a tier set (or set to 'free')
    const activeSubscribers = await db
      .select({
        id: users.id,
        email: users.email,
        subscriptionStatus: users.subscriptionStatus,
        subscriptionTier: users.subscriptionTier,
      })
      .from(users)
      .where(
        and(
          or(
            eq(users.subscriptionStatus, 'active'),
            eq(users.subscriptionStatus, 'trialing')
          ),
          or(
            isNull(users.subscriptionTier),
            eq(users.subscriptionTier, 'free')
          )
        )
      );

    console.log(`[MIGRATION] Found ${activeSubscribers.length} subscribers to migrate`);

    if (activeSubscribers.length === 0) {
      console.log('[MIGRATION] No users need migration. Exiting.');
      return;
    }

    // Migration log
    const migrationLog: MigrationLogEntry[] = [];

    for (const user of activeSubscribers) {
      console.log(`[MIGRATION] ${isDryRun ? 'Would migrate' : 'Migrating'} user ${user.id} (${user.email})`);

      if (!isDryRun) {
        await db
          .update(users)
          .set({ subscriptionTier: 'beta' })
          .where(eq(users.id, user.id));
      }

      migrationLog.push({
        userId: user.id,
        email: user.email,
        previousTier: user.subscriptionTier || 'null',
        newTier: 'beta',
        timestamp: new Date().toISOString(),
      });
    }

    // Save migration log
    const logFileName = `migration-log-${Date.now()}${isDryRun ? '-dryrun' : ''}.json`;
    const logPath = path.join(process.cwd(), logFileName);

    fs.writeFileSync(logPath, JSON.stringify(migrationLog, null, 2));
    console.log(`[MIGRATION] Log saved to: ${logPath}`);

    console.log(`[MIGRATION] ${isDryRun ? 'Would have migrated' : 'Migrated'} ${migrationLog.length} users to beta tier.`);

    if (isDryRun) {
      console.log('[MIGRATION] This was a dry run. No changes were made.');
      console.log('[MIGRATION] Run without --dry-run to execute the migration.');
    }

  } catch (error) {
    console.error('[MIGRATION] Error:', error);
    process.exit(1);
  }
}

migrateTiers()
  .then(() => {
    console.log('[MIGRATION] Complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[MIGRATION] Failed:', error);
    process.exit(1);
  });
