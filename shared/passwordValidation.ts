/**
 * Password strength validation utility
 * Shared between client and server for consistent validation
 */

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-5 (0 = very weak, 5 = very strong)
  errors: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
} as const;

/**
 * Validates password strength and returns detailed results
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  const requirements = {
    minLength: password.length >= PASSWORD_REQUIREMENTS.minLength,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
  };

  // Build error messages
  if (!requirements.minLength) {
    errors.push(`At least ${PASSWORD_REQUIREMENTS.minLength} characters`);
  }
  if (!requirements.hasUppercase) {
    errors.push('At least one uppercase letter');
  }
  if (!requirements.hasLowercase) {
    errors.push('At least one lowercase letter');
  }
  if (!requirements.hasNumber) {
    errors.push('At least one number');
  }
  if (!requirements.hasSpecialChar) {
    errors.push('At least one special character (!@#$%^&*...)');
  }

  // Calculate score (0-5)
  const score = Object.values(requirements).filter(Boolean).length;

  const isValid = errors.length === 0;

  return {
    isValid,
    score,
    errors,
    requirements,
  };
}

/**
 * Returns a user-friendly strength label
 */
export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return 'Very Weak';
    case 2:
      return 'Weak';
    case 3:
      return 'Fair';
    case 4:
      return 'Strong';
    case 5:
      return 'Very Strong';
    default:
      return 'Unknown';
  }
}

/**
 * Returns the color for the strength indicator
 */
export function getPasswordStrengthColor(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return '#dc3545'; // Red
    case 2:
      return '#fd7e14'; // Orange
    case 3:
      return '#ffc107'; // Yellow
    case 4:
      return '#28a745'; // Green
    case 5:
      return '#20c997'; // Teal
    default:
      return '#6c757d'; // Gray
  }
}
