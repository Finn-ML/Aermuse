/**
 * Tier Rollback Script (Epic 12, Story 12-10)
 *
 * Reverts tier assignments from a migration log file.
 * Use this if the migration needs to be undone.
 *
 * Usage:
 *   npx tsx scripts/rollback-tiers.ts migration-log-TIMESTAMP.json
 *   npx tsx scripts/rollback-tiers.ts migration-log-TIMESTAMP.json --dry-run
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const logFile = args.find(arg => !arg.startsWith('--'));

if (!logFile) {
  console.error('Usage: npx tsx scripts/rollback-tiers.ts <migration-log-file.json> [--dry-run]');
  process.exit(1);
}

interface MigrationLogEntry {
  userId: string;
  email: string;
  previousTier: string | null;
  newTier: string;
  timestamp: string;
}

async function rollbackTiers() {
  console.log('[ROLLBACK] Starting tier rollback...');
  console.log(`[ROLLBACK] Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`[ROLLBACK] Using log file: ${logFile}`);

  try {
    const logPath = path.resolve(process.cwd(), logFile);

    if (!fs.existsSync(logPath)) {
      console.error(`[ROLLBACK] Log file not found: ${logPath}`);
      process.exit(1);
    }

    const migrationLog: MigrationLogEntry[] = JSON.parse(
      fs.readFileSync(logPath, 'utf-8')
    );

    console.log(`[ROLLBACK] Found ${migrationLog.length} entries to rollback`);

    let rolledBack = 0;

    for (const entry of migrationLog) {
      const revertTier = entry.previousTier === 'null' ? 'free' : (entry.previousTier || 'free');

      console.log(`[ROLLBACK] ${isDryRun ? 'Would revert' : 'Reverting'} user ${entry.userId} (${entry.email}) to ${revertTier}`);

      if (!isDryRun) {
        await db
          .update(users)
          .set({ subscriptionTier: revertTier as any })
          .where(eq(users.id, entry.userId));
      }

      rolledBack++;
    }

    console.log(`[ROLLBACK] ${isDryRun ? 'Would have rolled back' : 'Rolled back'} ${rolledBack} users.`);

    if (isDryRun) {
      console.log('[ROLLBACK] This was a dry run. No changes were made.');
    }

  } catch (error) {
    console.error('[ROLLBACK] Error:', error);
    process.exit(1);
  }
}

rollbackTiers()
  .then(() => {
    console.log('[ROLLBACK] Complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[ROLLBACK] Failed:', error);
    process.exit(1);
  });
