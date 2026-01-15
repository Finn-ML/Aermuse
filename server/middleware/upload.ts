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

// Background image upload with larger size limit (Story 9.13)
const MAX_BACKGROUND_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export const backgroundImageUpload = multer({
  storage,
  limits: {
    fileSize: MAX_BACKGROUND_IMAGE_SIZE
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

export const BACKGROUND_IMAGE_CONSTANTS = {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIMES,
  MAX_SIZE: MAX_BACKGROUND_IMAGE_SIZE
};

// ============================================
// AUDIO UPLOAD (Music Store Feature)
// ============================================

const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.wav'];
const ALLOWED_AUDIO_MIMES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave'];
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB

export const audioUpload = multer({
  storage,
  limits: {
    fileSize: MAX_AUDIO_SIZE
  },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (!ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
      return cb(new Error(`Invalid file type. Accepted: ${ALLOWED_AUDIO_EXTENSIONS.join(', ')}`));
    }
    if (!ALLOWED_AUDIO_MIMES.includes(file.mimetype)) {
      return cb(new Error(`Invalid mime type. Accepted: mp3, wav`));
    }
    cb(null, true);
  }
});

// Verify audio file content using magic bytes
export async function verifyAudioType(buffer: Buffer): Promise<FileVerificationResult> {
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) {
    return { valid: false, type: null, error: 'Could not determine audio file type' };
  }

  if (detected.mime === 'audio/mpeg') {
    return { valid: true, type: 'mp3' };
  }

  if (detected.mime === 'audio/wav' || detected.mime === 'audio/x-wav' || detected.mime === 'audio/wave') {
    return { valid: true, type: 'wav' };
  }

  return {
    valid: false,
    type: null,
    error: `Invalid audio file type: ${detected.mime}. Accepted: MP3, WAV`
  };
}

export const AUDIO_UPLOAD_CONSTANTS = {
  ALLOWED_AUDIO_EXTENSIONS,
  ALLOWED_AUDIO_MIMES,
  MAX_AUDIO_SIZE
};

// Cover art upload for tracks (same as avatar size)
export const coverArtUpload = multer({
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
