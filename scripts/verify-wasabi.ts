/** Run with the six WASABI_* variables: node --import tsx scripts/verify-wasabi.ts */
import { randomUUID, createHash } from 'node:crypto';
import { WasabiStorage } from '../server/services/wasabiStorage';

const storage = new WasabiStorage();
const key = `_storage-check/${randomUUID()}.bin`;
const payload = Buffer.from(`Aermuse Wasabi check ${randomUUID()}`);
let uploaded = false;
try {
  const inventory = await storage.list();
  if (inventory.error) throw inventory.error;
  console.log(`Existing objects visible: ${inventory.value.length}`);
  const existing = inventory.value.find(item => !item.name.startsWith('_storage-check/') && item.name !== '.keep');
  if (!existing) throw new Error('No migrated application files found at the configured Wasabi bucket/prefix. Do not deploy until the storage destination is reconciled.');
  const content = await storage.downloadAsBytes(existing.name);
  if (content.error) throw content.error;
  console.log(`Existing file readable: ${content.value[0].length} bytes`);
  const upload = await storage.uploadFromBytes(key, payload);
  if (upload.error) throw upload.error;
  uploaded = true;
  const downloaded = await storage.downloadAsBytes(key);
  if (downloaded.error) throw downloaded.error;
  if (!downloaded.value[0].equals(payload)) throw new Error('Round-trip content mismatch');
  const hash = createHash('sha256');
  for await (const chunk of storage.downloadAsStream(key)) hash.update(chunk);
  if (hash.digest('hex') !== createHash('sha256').update(payload).digest('hex')) throw new Error('Stream content mismatch');
  const listed = await storage.list({ prefix: key });
  if (listed.error) throw listed.error;
  if (!listed.value.some(item => item.name === key)) throw new Error('Uploaded object missing from listing');
  console.log('Upload, download, stream, and listing checks passed.');
} finally {
  if (uploaded) {
    const deleted = await storage.delete(key);
    if (deleted.error) throw new Error(`Test object cleanup failed (${key}): ${deleted.error.message}`);
    const remaining = await storage.list({ prefix: key });
    if (remaining.error) throw remaining.error;
    if (remaining.value.some(item => item.name === key)) throw new Error(`Test object still present: ${key}`);
    console.log('Temporary test object deleted and deletion verified.');
  }
}
