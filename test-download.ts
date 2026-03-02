import crypto from 'crypto';
import { db } from './server/db';
import { trackPurchases, tracks } from './shared/schema';
import { eq } from 'drizzle-orm';

const TRACK_ID = '02f5e0c3-3b1a-48eb-a6fd-5155973a41eb';
const action = process.argv[2]; // 'create' or 'cleanup'

async function create() {
  const [track] = await db.select().from(tracks).where(eq(tracks.id, TRACK_ID));
  if (!track) { console.error('Track not found'); process.exit(1); }
  console.log(`Track: ${track.title} (${track.fileFormat}, ${(track.fileSizeBytes! / 1024 / 1024).toFixed(1)}MB)\n`);

  const downloadToken = 'test_' + crypto.randomBytes(16).toString('hex');
  const downloadExpires = new Date();
  downloadExpires.setDate(downloadExpires.getDate() + 1);

  const [purchase] = await db.insert(trackPurchases).values({
    trackId: TRACK_ID,
    buyerEmail: 'test@download-test.local',
    buyerName: 'Download Test',
    stripePaymentIntentId: null,
    stripeCheckoutSessionId: null,
    amountPaidCents: 0,
    currency: 'gbp',
    downloadToken,
    downloadCount: 0,
    maxDownloads: 10,
    downloadExpiresAt: downloadExpires,
    status: 'completed',
  }).returning();

  console.log(`Purchase ID: ${purchase.id}`);
  console.log(`Download token: ${downloadToken}`);
  console.log(`\nTest URL: /api/downloads/${downloadToken}`);
  console.log(`\nTo clean up: DATABASE_URL="..." npx tsx test-download.ts cleanup ${purchase.id}`);
}

async function cleanup() {
  const id = process.argv[3];
  if (!id) { console.error('Usage: test-download.ts cleanup <purchaseId>'); process.exit(1); }
  await db.delete(trackPurchases).where(eq(trackPurchases.id, id));
  console.log(`Deleted test purchase ${id}`);
}

(action === 'cleanup' ? cleanup() : create())
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
