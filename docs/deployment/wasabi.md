# Wasabi storage deployment

Aermuse now uses Wasabi for all file uploads, reads, streams, listings and deletions. Configure these **server-side** environment variables in the destination host's secret manager:

| Variable | Value |
| --- | --- |
| `WASABI_ACCESS_KEY` | Access key supplied separately |
| `WASABI_SECRET_KEY` | Secret key supplied separately |
| `WASABI_BUCKET` | `JayvonBarnes1764093414703x355994667706976300` |
| `WASABI_ENDPOINT` | `https://s3.eu-west-1.wasabisys.com` |
| `WASABI_REGION` | `eu-west-1` |
| `WASABI_PREFIX` | `ws-514/app/` |

Do not commit credentials or expose them as `VITE_*` variables. Bucket capitalization is intentional; the client uses path-style requests. All six variables are required when storage is first used. There is no fallback to Replit storage.

## Paths and access

Database paths such as `tracks/user/track/original.mp3` stay unchanged. The adapter stores this example as `ws-514/app/tracks/user/track/original.mp3`. Existing file API URLs and authorization remain unchanged; the bucket does not need to be public. Prefixes returned by S3 listings are stripped before application code uses them.

## Before switching traffic

1. Install with `npm ci`, run `npm test` and `npm run check`, then `npm run build`. Investigate any baseline failures recorded in the PR.
2. Configure the variables above alongside the existing database, session, payment, email, and other app settings. This change migrates file storage only.
3. Run `node --import tsx scripts/verify-wasabi.ts` in the target environment. It reads an existing object and creates, verifies, and deletes a uniquely named test object beneath `_storage-check/`.
4. Freeze uploads/deletions on the old app before the final sync. The 15 September 2026 migration copied 194 objects totaling 783,011,253 bytes; later uploads or overwrites are not included in that snapshot. Compare the complete Replit source inventory with Wasabi, copy missing/changed objects, and verify their bytes/hashes. Review source deletions separately rather than automatically purging the destination.
5. Check existing images, signed documents, audio playback/downloads, video processing, and one new upload on the target app, then switch traffic. Keep the old files until the new deployment is confirmed.

The code change does not automatically synchronize later Replit writes, change DNS, or deploy the new host. If rolling back after Wasabi has received new uploads, account for those writes before restoring the old app.
