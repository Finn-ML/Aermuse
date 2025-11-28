# Story 2.1: Contract File Upload

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 2.1 |
| **Epic** | Epic 2: AI Attorney - Real AI |
| **Title** | Contract File Upload |
| **Priority** | P0 - Critical |
| **Story Points** | 5 |
| **Status** | Drafted |

## User Story

**As an** artist
**I want** to upload a contract file (PDF or DOC)
**So that** it can be analyzed by the AI Attorney

## Context

This story establishes the file upload infrastructure for the AI Attorney feature. Users need to be able to upload their contracts in common formats so the AI can analyze them. Files are stored in Replit Object Storage with proper organization by user and contract.

**Dependencies:**
- None (first story in Epic 2)

## Acceptance Criteria

- [ ] **AC-1:** File upload button visible on contracts page
- [ ] **AC-2:** Drag-and-drop upload supported
- [ ] **AC-3:** PDF, DOC, DOCX formats accepted
- [ ] **AC-4:** File size limit enforced (10MB)
- [ ] **AC-5:** Upload progress indicator displayed
- [ ] **AC-6:** Files stored in Replit Object Storage
- [ ] **AC-7:** File metadata saved to contract record
- [ ] **AC-8:** Invalid file types rejected with clear error message

## Technical Requirements

### Dependencies to Install

```bash
npm install multer @types/multer file-type
```

### Database Schema Changes

```typescript
// shared/schema.ts - Add to contracts table
export const contracts = pgTable("contracts", {
  // ... existing fields
  filePath: text("file_path"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  fileType: text("file_type"), // 'pdf' | 'doc' | 'docx'
});
```

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/middleware/upload.ts` | New: Multer configuration |
| `server/services/storage.ts` | New: Replit Object Storage service |
| `server/routes/contracts.ts` | Add upload endpoint |
| `client/src/components/contracts/ContractUpload.tsx` | New: Upload component |
| `client/src/pages/Contracts.tsx` | Add upload button/component |

### Implementation Details

#### 1. Upload Middleware

```typescript
// server/middleware/upload.ts
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Memory storage for processing before uploading to Object Storage
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: async (req, file, cb) => {
    // Check extension
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`Invalid file type. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }

    // MIME type will be verified after upload using magic bytes
    cb(null, true);
  }
});

// Verify file content after upload
export async function verifyFileType(buffer: Buffer): Promise<{
  valid: boolean;
  type: string | null;
  error?: string;
}> {
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) {
    // DOC files may not be detected, check for DOC magic bytes
    const docMagic = buffer.slice(0, 4).toString('hex');
    if (docMagic === 'd0cf11e0') {
      return { valid: true, type: 'doc' };
    }
    return { valid: false, type: null, error: 'Could not determine file type' };
  }

  if (detected.mime === 'application/pdf') {
    return { valid: true, type: 'pdf' };
  }

  if (detected.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return { valid: true, type: 'docx' };
  }

  return {
    valid: false,
    type: null,
    error: `Invalid file type: ${detected.mime}. Accepted: PDF, DOC, DOCX`
  };
}
```

#### 2. Storage Service

```typescript
// server/services/storage.ts
import { Client } from '@replit/object-storage';

const storage = new Client();

interface UploadResult {
  path: string;
  size: number;
}

export async function uploadContractFile(
  userId: string,
  contractId: string,
  buffer: Buffer,
  extension: string
): Promise<UploadResult> {
  const path = `contracts/${userId}/${contractId}/original.${extension}`;

  await storage.uploadFromBuffer(path, buffer, {
    contentType: getContentType(extension)
  });

  return {
    path,
    size: buffer.length
  };
}

export async function downloadContractFile(path: string): Promise<Buffer> {
  const { data } = await storage.downloadAsBuffer(path);
  return data;
}

export async function deleteContractFile(path: string): Promise<void> {
  await storage.delete(path);
}

function getContentType(extension: string): string {
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  return types[extension] || 'application/octet-stream';
}
```

#### 3. Upload Endpoint

```typescript
// server/routes/contracts.ts
import { upload, verifyFileType } from '../middleware/upload';
import { uploadContractFile } from '../services/storage';

// POST /api/contracts/upload
app.post('/api/contracts/upload',
  requireAuth,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Verify file type using magic bytes
      const verification = await verifyFileType(req.file.buffer);
      if (!verification.valid) {
        return res.status(400).json({ error: verification.error });
      }

      // Create contract record
      const [contract] = await db.insert(contracts)
        .values({
          userId: req.session.userId,
          title: req.body.title || req.file.originalname.replace(/\.[^/.]+$/, ''),
          status: 'uploaded'
        })
        .returning();

      // Upload to Object Storage
      const uploaded = await uploadContractFile(
        req.session.userId!,
        contract.id,
        req.file.buffer,
        verification.type!
      );

      // Update contract with file info
      const [updated] = await db.update(contracts)
        .set({
          filePath: uploaded.path,
          fileName: req.file.originalname,
          fileSize: uploaded.size,
          fileType: verification.type
        })
        .where(eq(contracts.id, contract.id))
        .returning();

      console.log(`[UPLOAD] File uploaded: ${contract.id} (${verification.type}, ${uploaded.size} bytes)`);

      res.json({ contract: updated });
    } catch (error) {
      console.error('[UPLOAD] Failed:', error);
      res.status(500).json({ error: 'File upload failed' });
    }
  }
);

// Error handler for multer errors
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size: 10MB' });
    }
  }
  if (err.message?.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});
```

#### 4. Frontend Upload Component

```tsx
// client/src/components/contracts/ContractUpload.tsx
import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
  onUploadComplete: (contract: Contract) => void;
  onCancel?: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function ContractUpload({ onUploadComplete, onCancel }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_TYPES = '.pdf,.doc,.docx';
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: File): string | null => {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!['.pdf', '.doc', '.docx'].includes(ext)) {
      return 'Invalid file type. Accepted: PDF, DOC, DOCX';
    }
    if (file.size > MAX_SIZE) {
      return 'File too large. Maximum size: 10MB';
    }
    return null;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setFile(file);
      setError('');
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setState('uploading');
    setProgress(0);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      const response = await new Promise<Contract>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            resolve(data.contract);
          } else {
            const data = JSON.parse(xhr.responseText);
            reject(new Error(data.error || 'Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));

        xhr.open('POST', '/api/contracts/upload');
        xhr.send(formData);
      });

      setState('success');
      setTimeout(() => onUploadComplete(response), 500);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleReset = () => {
    setFile(null);
    setState('idle');
    setProgress(0);
    setError('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center
          transition-colors cursor-pointer
          ${dragActive
            ? 'border-burgundy bg-burgundy/5'
            : 'border-gray-300 hover:border-gray-400'
          }
          ${state === 'uploading' ? 'pointer-events-none opacity-75' : ''}
        `}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleChange}
          className="hidden"
        />

        {!file ? (
          <>
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700">
              Drop your contract here
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-2">
              PDF, DOC, or DOCX up to 10MB
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-burgundy" />
            <div className="text-left">
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {state === 'idle' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {state === 'uploading' && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-burgundy transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success Message */}
      {state === 'success' && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-800">Upload complete!</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Actions */}
      {file && state === 'idle' && (
        <div className="mt-4 flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleUpload}
            className="flex-1 px-4 py-2 bg-burgundy text-white rounded-md hover:bg-burgundy-dark"
          >
            Upload Contract
          </button>
        </div>
      )}
    </div>
  );
}
```

#### 5. Download Endpoint

```typescript
// GET /api/contracts/:id/download
app.get('/api/contracts/:id/download', requireAuth, async (req, res) => {
  const contract = await db.query.contracts.findFirst({
    where: and(
      eq(contracts.id, req.params.id),
      eq(contracts.userId, req.session.userId)
    )
  });

  if (!contract || !contract.filePath) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const buffer = await downloadContractFile(contract.filePath);

    res.setHeader('Content-Type', getContentType(contract.fileType!));
    res.setHeader('Content-Disposition', `attachment; filename="${contract.fileName}"`);
    res.send(buffer);
  } catch (error) {
    console.error('[DOWNLOAD] Failed:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});
```

## Definition of Done

- [ ] Multer middleware configured with file limits
- [ ] Replit Object Storage service working
- [ ] Upload endpoint creates contract and stores file
- [ ] File type validation with magic bytes
- [ ] ContractUpload component with drag-and-drop
- [ ] Progress indicator during upload
- [ ] Error messages for invalid files
- [ ] Download endpoint for retrieving files
- [ ] Files organized by user/contract in storage

## Testing Checklist

### Unit Tests

- [ ] File extension validation
- [ ] File size validation
- [ ] Magic byte verification for PDF
- [ ] Magic byte verification for DOCX
- [ ] Storage path generation

### Integration Tests

- [ ] Upload PDF file successfully
- [ ] Upload DOCX file successfully
- [ ] Reject file over 10MB
- [ ] Reject invalid file type
- [ ] Download uploaded file
- [ ] Contract record created with file metadata

### E2E Tests

- [ ] Drag-and-drop upload works
- [ ] Click to browse works
- [ ] Progress bar shows during upload
- [ ] Success message on completion
- [ ] Error message for invalid file
- [ ] Uploaded contract appears in list

## Related Documents

- [Epic 2 Tech Spec](./tech-spec-epic-2.md)
- [Architecture: Replit Object Storage](../architecture.md#replit-object-storage-epics-2-8)
