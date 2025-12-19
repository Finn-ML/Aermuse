# Handover: Signed PDF Download Fix

**Date:** 2025-12-19
**Branch:** `claude/fix-pdf-download-esign-rubBY`
**Status:** Aermuse-side fixes complete, DocuSeal API configuration may be needed

---

## Issue Summary

Users cannot download signed PDFs after e-signature completion. The download button appears but clicking it returns an error or empty response.

---

## Root Cause Analysis

### 1. Limited Field Name Detection in Webhook Handler
The `document.completed` webhook handler was only checking for `signedContent` and `signed_content` fields. The DocuSeal API may send the signed PDF using different field names.

### 2. Fragile Download Logic
The `downloadSignedDocument()` function assumed specific API response formats that may not match the custom DocuSeal API at `https://docu-seal-host--finn107.replit.app/api`.

### 3. Silent Failure Path
When PDF download failed in the webhook handler, the error was logged but execution continued. The signature request was marked "completed" with `signedPdfPath = null`, making the UI show a download button that doesn't work.

---

## Changes Made (Aermuse Side)

### File: `server/routes.ts`

**Webhook Handler Improvements (lines 3530-3543):**
```typescript
// Now checks multiple field names for signed PDF content
const signedContent = payload.signedContent || payload.signed_content ||
                     payload.signedPdf || payload.signed_pdf ||
                     payload.result || payload.pdfContent || payload.pdf_content;

// Also checks for direct URL to signed PDF
const signedPdfUrl = payload.resultUrl || payload.result_url ||
                    payload.downloadUrl || payload.download_url ||
                    payload.signedPdfUrl || payload.signed_pdf_url ||
                    payload.pdfUrl || payload.pdf_url;
```

**Added URL-based download path (lines 3567-3575):**
```typescript
} else if (signedPdfUrl) {
  // Download from the URL provided in the webhook
  const response = await fetch(signedPdfUrl);
  const arrayBuffer = await response.arrayBuffer();
  signedPdfBuffer = Buffer.from(arrayBuffer);
}
```

**Enhanced error logging (lines 3600-3605):**
- Full error message and payload now logged when download fails
- Helps debug what fields DocuSeal is actually sending

### File: `server/services/docuseal.ts`

**Multi-Strategy Download Function (lines 225-393):**

| Strategy | Description |
|----------|-------------|
| 1 | Get document details via `GET /documents/{id}`, extract `result_url`/`download_url` |
| 2 | Try direct download via `GET /documents/{id}/download` |
| 3 | Try alternative endpoints: `/documents/{id}/signed`, `/documents/{id}/result`, `/signed-documents/{id}`, `/submissions/{id}/download` |

Each strategy validates the response is a valid PDF (checks for `%PDF-` header).

### File: `server/services/__tests__/docuseal.test.ts`

Updated tests to match new multi-strategy implementation with proper mocking.

---

## Next Steps: DocuSeal API Configuration

The custom DocuSeal API needs to be configured to provide signed PDFs. Check and implement **at least one** of these options:

### Option A: Include Signed PDF in Webhook Payload (Recommended)

When sending the `document.completed` webhook, include the signed PDF as base64:

```json
{
  "event": "document.completed",
  "data": {
    "documentId": "abc123",
    "signedContent": "<base64-encoded-pdf>"
  }
}
```

**Supported field names:** `signedContent`, `signed_content`, `signedPdf`, `signed_pdf`, `result`, `pdfContent`, `pdf_content`

### Option B: Include Download URL in Webhook Payload

```json
{
  "event": "document.completed",
  "data": {
    "documentId": "abc123",
    "resultUrl": "https://docu-seal-host--finn107.replit.app/files/signed/abc123.pdf"
  }
}
```

**Supported field names:** `resultUrl`, `result_url`, `downloadUrl`, `download_url`, `signedPdfUrl`, `signed_pdf_url`, `pdfUrl`, `pdf_url`

### Option C: Implement Download Endpoint

Ensure one of these endpoints works on the DocuSeal API:

| Endpoint | Expected Response |
|----------|-------------------|
| `GET /api/documents/{id}/download` | PDF binary directly, OR JSON with `url`/`download_url` field |
| `GET /api/documents/{id}` | JSON with `result_url` or `download_url` field pointing to signed PDF |

---

## Debugging Guide

### Check Webhook Payload

After a signature completion, check Aermuse server logs for:

```
[WEBHOOK] Document completed - payload keys: ...
[WEBHOOK] Has signedContent: false, Has signedPdfUrl: false
[WEBHOOK] Full payload for debugging: {...}
```

This shows exactly what fields the DocuSeal API is sending.

### Check Download Attempts

Look for these log entries:

```
[DOCUSEAL] Document details for {id}: {...}
[DOCUSEAL] Trying direct download endpoint
[DOCUSEAL] Download response status: 404, content-type: application/json
[DOCUSEAL] Trying alternative endpoint: /documents/{id}/signed
```

### Verify PDF Stored Correctly

If download succeeds, you'll see:

```
[WEBHOOK] Signed PDF buffer size: 12345 bytes
[WEBHOOK] Signed PDF stored at: signed/{contractId}/signed_1734567890.pdf
```

---

## Testing Checklist

- [ ] Complete a full e-signature flow with test signatories
- [ ] Check server logs for webhook payload content
- [ ] Verify `signedPdfPath` is populated in `signature_requests` table
- [ ] Test download button in UI returns valid PDF
- [ ] Verify PDF opens correctly and contains signatures

---

## Files Modified

| File | Changes |
|------|---------|
| `server/routes.ts` | Webhook handler: expanded field checks, URL download path, better logging |
| `server/services/docuseal.ts` | Multi-strategy download with fallbacks and validation |
| `server/services/__tests__/docuseal.test.ts` | Updated tests for new implementation |

---

## Rollback Plan

If issues arise, revert to the previous commit:

```bash
git revert 62bb7df
```

---

## Contact

For questions about the DocuSeal API configuration, check:
- DocuSeal API docs at the hosted instance
- Epic 4 documentation: `docs/epics/epic-4-esigning-system.md`
- Tech spec: `docs/sprint-artifacts/tech-spec-epic-4.md`
