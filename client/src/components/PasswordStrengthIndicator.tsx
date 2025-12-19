import { Check, X } from 'lucide-react';
import {
  validatePassword,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  PASSWORD_REQUIREMENTS,
} from '@shared/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
}: PasswordStrengthIndicatorProps) {
  const validation = validatePassword(password);
  const strengthLabel = getPasswordStrengthLabel(validation.score);
  const strengthColor = getPasswordStrengthColor(validation.score);

  if (!password) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      {/* Strength bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-[rgba(102,0,51,0.6)]">
            Password Strength
          </span>
          <span
            className="text-xs font-semibold"
            style={{ color: strengthColor }}
          >
            {strengthLabel}
          </span>
        </div>
        <div className="h-1.5 bg-[rgba(102,0,51,0.1)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${(validation.score / 5) * 100}%`,
              backgroundColor: strengthColor,
            }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <div className="space-y-1.5">
          <RequirementItem
            met={validation.requirements.minLength}
            label={`At least ${PASSWORD_REQUIREMENTS.minLength} characters`}
          />
          <RequirementItem
            met={validation.requirements.hasUppercase}
            label="One uppercase letter"
          />
          <RequirementItem
            met={validation.requirements.hasLowercase}
            label="One lowercase letter"
          />
          <RequirementItem
            met={validation.requirements.hasNumber}
            label="One number"
          />
          <RequirementItem
            met={validation.requirements.hasSpecialChar}
            label="One special character (!@#$%...)"
          />
        </div>
      )}
    </div>
  );
}

function RequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <Check size={14} className="text-[#28a745]" />
      ) : (
        <X size={14} className="text-[rgba(102,0,51,0.3)]" />
      )}
      <span
        className={`text-xs ${
          met ? 'text-[#28a745]' : 'text-[rgba(102,0,51,0.5)]'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
