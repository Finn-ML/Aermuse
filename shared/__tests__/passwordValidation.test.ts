import { describe, it, expect } from 'vitest';
import {
  validatePassword,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  PASSWORD_REQUIREMENTS,
} from '../passwordValidation';

describe('Password Validation', () => {
  describe('PASSWORD_REQUIREMENTS constant', () => {
    it('should have correct default requirements', () => {
      expect(PASSWORD_REQUIREMENTS.minLength).toBe(8);
      expect(PASSWORD_REQUIREMENTS.requireUppercase).toBe(true);
      expect(PASSWORD_REQUIREMENTS.requireLowercase).toBe(true);
      expect(PASSWORD_REQUIREMENTS.requireNumber).toBe(true);
      expect(PASSWORD_REQUIREMENTS.requireSpecialChar).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('should reject empty password', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.errors.length).toBe(5);
    });

    it('should reject password with only lowercase letters', () => {
      const result = validatePassword('abcdefgh');
      expect(result.isValid).toBe(false);
      expect(result.requirements.minLength).toBe(true);
      expect(result.requirements.hasLowercase).toBe(true);
      expect(result.requirements.hasUppercase).toBe(false);
      expect(result.requirements.hasNumber).toBe(false);
      expect(result.requirements.hasSpecialChar).toBe(false);
    });

    it('should reject password too short', () => {
      const result = validatePassword('Ab1!');
      expect(result.isValid).toBe(false);
      expect(result.requirements.minLength).toBe(false);
      expect(result.errors).toContain('At least 8 characters');
    });

    it('should reject password without uppercase', () => {
      const result = validatePassword('abcd1234!');
      expect(result.isValid).toBe(false);
      expect(result.requirements.hasUppercase).toBe(false);
      expect(result.errors).toContain('At least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = validatePassword('ABCD1234!');
      expect(result.isValid).toBe(false);
      expect(result.requirements.hasLowercase).toBe(false);
      expect(result.errors).toContain('At least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePassword('AbcdEfgh!');
      expect(result.isValid).toBe(false);
      expect(result.requirements.hasNumber).toBe(false);
      expect(result.errors).toContain('At least one number');
    });

    it('should reject password without special character', () => {
      const result = validatePassword('Abcd1234');
      expect(result.isValid).toBe(false);
      expect(result.requirements.hasSpecialChar).toBe(false);
      expect(result.errors).toContain('At least one special character (!@#$%^&*...)');
    });

    it('should accept valid password with all requirements', () => {
      const result = validatePassword('Abcd1234!');
      expect(result.isValid).toBe(true);
      expect(result.score).toBe(5);
      expect(result.errors.length).toBe(0);
      expect(result.requirements.minLength).toBe(true);
      expect(result.requirements.hasUppercase).toBe(true);
      expect(result.requirements.hasLowercase).toBe(true);
      expect(result.requirements.hasNumber).toBe(true);
      expect(result.requirements.hasSpecialChar).toBe(true);
    });

    it('should accept various special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '='];
      for (const char of specialChars) {
        const result = validatePassword(`Abcd1234${char}`);
        expect(result.requirements.hasSpecialChar).toBe(true);
      }
    });

    it('should calculate correct score based on met requirements', () => {
      // Score 1: only length met
      expect(validatePassword('abcdefgh').score).toBe(2); // length + lowercase

      // Score 2: length + uppercase
      expect(validatePassword('ABCDEFGH').score).toBe(2); // length + uppercase

      // Score 3: length + uppercase + lowercase
      expect(validatePassword('Abcdefgh').score).toBe(3);

      // Score 4: length + uppercase + lowercase + number
      expect(validatePassword('Abcdefg1').score).toBe(4);

      // Score 5: all requirements met
      expect(validatePassword('Abcdef1!').score).toBe(5);
    });
  });

  describe('getPasswordStrengthLabel', () => {
    it('should return correct labels for each score', () => {
      expect(getPasswordStrengthLabel(0)).toBe('Very Weak');
      expect(getPasswordStrengthLabel(1)).toBe('Very Weak');
      expect(getPasswordStrengthLabel(2)).toBe('Weak');
      expect(getPasswordStrengthLabel(3)).toBe('Fair');
      expect(getPasswordStrengthLabel(4)).toBe('Strong');
      expect(getPasswordStrengthLabel(5)).toBe('Very Strong');
    });

    it('should return Unknown for invalid scores', () => {
      expect(getPasswordStrengthLabel(-1)).toBe('Unknown');
      expect(getPasswordStrengthLabel(6)).toBe('Unknown');
    });
  });

  describe('getPasswordStrengthColor', () => {
    it('should return red for very weak passwords', () => {
      expect(getPasswordStrengthColor(0)).toBe('#dc3545');
      expect(getPasswordStrengthColor(1)).toBe('#dc3545');
    });

    it('should return orange for weak passwords', () => {
      expect(getPasswordStrengthColor(2)).toBe('#fd7e14');
    });

    it('should return yellow for fair passwords', () => {
      expect(getPasswordStrengthColor(3)).toBe('#ffc107');
    });

    it('should return green for strong passwords', () => {
      expect(getPasswordStrengthColor(4)).toBe('#28a745');
    });

    it('should return teal for very strong passwords', () => {
      expect(getPasswordStrengthColor(5)).toBe('#20c997');
    });

    it('should return gray for invalid scores', () => {
      expect(getPasswordStrengthColor(-1)).toBe('#6c757d');
      expect(getPasswordStrengthColor(6)).toBe('#6c757d');
    });
  });
});
