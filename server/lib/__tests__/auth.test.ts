import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { createHash } from 'crypto';

// Mock the database module before importing auth module
vi.mock('../../db', () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

vi.mock('@shared/schema', () => ({
  users: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

import { hashPassword, comparePassword } from '../auth';

describe('Auth Utility Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('returns a bcrypt hash string', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      // bcrypt hashes start with $2b$ (or $2a$)
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('uses cost factor 12', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      // bcrypt hash format: $2b$12$... where 12 is the cost factor
      expect(hash).toMatch(/^\$2[ab]\$12\$/);
    });

    it('generates different hashes for the same password (salted)', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('generates a hash of the expected length', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      // bcrypt hashes are 60 characters
      expect(hash.length).toBe(60);
    });
  });

  describe('comparePassword', () => {
    describe('with bcrypt passwords', () => {
      it('returns true for valid bcrypt password', async () => {
        const password = 'testPassword123';
        const hash = await bcrypt.hash(password, 12);

        const result = await comparePassword(password, hash);
        expect(result).toBe(true);
      });

      it('returns false for invalid bcrypt password', async () => {
        const password = 'testPassword123';
        const wrongPassword = 'wrongPassword';
        const hash = await bcrypt.hash(password, 12);

        const result = await comparePassword(wrongPassword, hash);
        expect(result).toBe(false);
      });

      it('handles $2a$ prefix (older bcrypt format)', async () => {
        const password = 'testPassword123';
        // Manually create a $2a$ hash by replacing $2b$ with $2a$
        const hash = await bcrypt.hash(password, 12);
        const hash2a = hash.replace('$2b$', '$2a$');

        const result = await comparePassword(password, hash2a);
        expect(result).toBe(true);
      });
    });

    describe('with legacy SHA-256 passwords', () => {
      it('returns true for valid SHA-256 password', async () => {
        const password = 'testPassword123';
        const sha256Hash = createHash('sha256').update(password).digest('hex');

        const result = await comparePassword(password, sha256Hash);
        expect(result).toBe(true);
      });

      it('returns false for invalid SHA-256 password', async () => {
        const password = 'testPassword123';
        const wrongPassword = 'wrongPassword';
        const sha256Hash = createHash('sha256').update(password).digest('hex');

        const result = await comparePassword(wrongPassword, sha256Hash);
        expect(result).toBe(false);
      });

      it('SHA-256 hash is 64 characters (hex)', async () => {
        const password = 'testPassword123';
        const sha256Hash = createHash('sha256').update(password).digest('hex');

        expect(sha256Hash.length).toBe(64);
      });
    });

    describe('password migration', () => {
      it('triggers migration for valid SHA-256 password when userId is provided', async () => {
        const { db } = await import('../../db');
        const password = 'testPassword123';
        const sha256Hash = createHash('sha256').update(password).digest('hex');

        await comparePassword(password, sha256Hash, 'user-123');

        // Verify that db.update was called to migrate the password
        expect(db.update).toHaveBeenCalled();
      });

      it('does not trigger migration for bcrypt password', async () => {
        const { db } = await import('../../db');
        vi.clearAllMocks();

        const password = 'testPassword123';
        const bcryptHash = await bcrypt.hash(password, 12);

        await comparePassword(password, bcryptHash, 'user-123');

        // Verify that db.update was NOT called
        expect(db.update).not.toHaveBeenCalled();
      });

      it('does not trigger migration for failed SHA-256 login', async () => {
        const { db } = await import('../../db');
        vi.clearAllMocks();

        const password = 'testPassword123';
        const sha256Hash = createHash('sha256').update(password).digest('hex');

        await comparePassword('wrongPassword', sha256Hash, 'user-123');

        // Verify that db.update was NOT called
        expect(db.update).not.toHaveBeenCalled();
      });

      it('does not trigger migration when no userId is provided', async () => {
        const { db } = await import('../../db');
        vi.clearAllMocks();

        const password = 'testPassword123';
        const sha256Hash = createHash('sha256').update(password).digest('hex');

        await comparePassword(password, sha256Hash);

        // Verify that db.update was NOT called
        expect(db.update).not.toHaveBeenCalled();
      });
    });
  });
});
