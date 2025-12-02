import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Memory storage for processing before uploading to Object Storage
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`Invalid file type. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
    cb(null, true);
  }
});

export interface FileVerificationResult {
  valid: boolean;
  type: string | null;
  error?: string;
}

// Verify file content after upload using magic bytes
export async function verifyFileType(buffer: Buffer): Promise<FileVerificationResult> {
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) {
    // DOC files may not be detected by file-type, check for DOC magic bytes
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

export const UPLOAD_CONSTANTS = {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE
};

// Image upload configuration for landing page backgrounds
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

export const imageUpload = multer({
  storage,
  limits: {
    fileSize: MAX_IMAGE_SIZE
  },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      return cb(new Error(`Invalid file type. Accepted: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`));
    }
    if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      return cb(new Error(`Invalid mime type. Accepted: jpg, png, webp`));
    }
    cb(null, true);
  }
});

export const IMAGE_UPLOAD_CONSTANTS = {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIMES,
  MAX_IMAGE_SIZE
};
