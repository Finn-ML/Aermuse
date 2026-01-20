// Design Tab - Theme, Colors, Fonts, Buttons, Background, Avatar
// Story 9.10: Landing Page Editor Redesign
// Story 9.12: Avatar Image Upload

import { useState, useRef } from 'react';
import { User, UserCircle, EyeOff } from 'lucide-react';
import { ThemeSelector } from '@/components/landing/ThemeSelector';
import { ColorPicker } from '@/components/landing/ColorPicker';
import { FontSelector } from '@/components/landing/FontSelector';
import { ButtonStylePicker } from '@/components/landing/ButtonStylePicker';
import { BackgroundEditor } from '@/components/landing/BackgroundEditor';
import { ImageCropModal } from '@/components/ImageCropModal';
import type { ThemePreset, ButtonStyle, BackgroundType, BackgroundOverlay } from '@shared/themes';

// Avatar position options
const AVATAR_POSITIONS = [
  { id: 'top', name: 'Above Name', icon: UserCircle },
  { id: 'left', name: 'Beside Name', icon: User },
  { id: 'hidden', name: 'Hidden', icon: EyeOff },
] as const;

type AvatarPosition = typeof AVATAR_POSITIONS[number]['id'];

// Avatar Upload Component
interface AvatarUploadProps {
  avatarUrl: string | null;
  onUpload: (file: File) => Promise<string>;
  onRemove: () => void;
}

function AvatarUpload({ avatarUrl, onUpload, onRemove }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a JPG, PNG, or WebP image.');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('File too large. Maximum size is 2MB.');
      return;
    }

    setError(null);
    setOriginalFileName(file.name);

    // Read file and open crop modal
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImageToCrop(dataUrl);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setShowCropModal(false);
    setImageToCrop(null);

    // Show preview immediately
    const previewDataUrl = URL.createObjectURL(croppedBlob);
    setPreviewUrl(previewDataUrl);

    // Create a File from the Blob for upload
    const croppedFile = new File([croppedBlob], originalFileName || 'avatar.jpg', {
      type: 'image/jpeg',
    });

    // Upload
    setIsUploading(true);
    try {
      await onUpload(croppedFile);
      setPreviewUrl(null); // Clear preview on success (URL now comes from avatarUrl prop)
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setError('Failed to upload avatar. Please try again.');
      setPreviewUrl(null);
    }
    setIsUploading(false);

    // Clean up the object URL
    URL.revokeObjectURL(previewDataUrl);
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setImageToCrop(null);
  };

  const displayUrl = previewUrl || avatarUrl;

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)]">
        Avatar
      </label>

      <div className="flex items-center gap-4">
        {/* Circular preview */}
        <div className="w-20 h-20 rounded-full overflow-hidden bg-[rgba(102,0,51,0.1)] flex items-center justify-center border-2 border-[rgba(102,0,51,0.2)]">
          {displayUrl ? (
            <img src={displayUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User size={32} className="text-[rgba(102,0,51,0.3)]" />
          )}
        </div>

        {/* Upload/Remove buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#660033] rounded-lg hover:bg-[#8B0045] disabled:opacity-50 transition-colors"
          >
            {isUploading ? 'Uploading...' : avatarUrl ? 'Change Avatar' : 'Upload Avatar'}
          </button>

          {avatarUrl && (
            <button
              onClick={onRemove}
              disabled={isUploading}
              className="px-3 py-1.5 text-xs font-semibold text-[#dc3545] bg-[rgba(220,53,69,0.1)] rounded-lg hover:bg-[rgba(220,53,69,0.2)] disabled:opacity-50 transition-colors"
            >
              Remove Avatar
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      <p className="text-xs text-[rgba(102,0,51,0.4)]">
        Accepted: JPG, PNG, WebP. Max 2MB.
      </p>

      {/* Image Crop Modal */}
      {imageToCrop && (
        <ImageCropModal
          isOpen={showCropModal}
          imageSrc={imageToCrop}
          onClose={handleCropCancel}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
          cropShape="round"
          title="Crop Avatar"
        />
      )}
    </div>
  );
}

// WCAG contrast ratio calculation
function getLuminance(hex: string): number {
  const rgb = hex.replace('#', '').match(/.{2}/g)?.map(c => {
    const val = parseInt(c, 16) / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  }) || [0, 0, 0];
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

interface DesignTabProps {
  landingPageData: {
    themeId?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    textColor?: string | null;
    headingFont?: string | null;
    bodyFont?: string | null;
    buttonStyle?: string | null;
    backgroundType?: string | null;
    backgroundValue?: string | null;
    backgroundOverlay?: string | null;
    backgroundPosition?: string | null;
    avatarUrl?: string | null;
    avatarPosition?: string | null;
  };
  onUpdate: (updates: Record<string, unknown>) => void;
  onImageUpload: (file: File) => Promise<string>;
  onAvatarUpload: (file: File) => Promise<string>;
  onAvatarRemove: () => void;
  onBackgroundRemove?: () => void;
  onVideoUpload?: (file: File) => Promise<{ webmUrl: string; mp4Url?: string; duration: number }>;
  onVideoRemove?: () => void;
}

export function DesignTab({ landingPageData, onUpdate, onImageUpload, onAvatarUpload, onAvatarRemove, onBackgroundRemove, onVideoUpload, onVideoRemove }: DesignTabProps) {
  return (
    <div className="space-y-6">
      {/* Avatar Upload & Position */}
      <div className="p-4 rounded-xl bg-white/60 space-y-4">
        <AvatarUpload
          avatarUrl={landingPageData.avatarUrl || null}
          onUpload={onAvatarUpload}
          onRemove={onAvatarRemove}
        />

        {/* Avatar Position */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)]">
            Avatar Position
          </label>
          <div className="flex gap-2">
            {AVATAR_POSITIONS.map((position) => {
              const Icon = position.icon;
              const isSelected = (landingPageData.avatarPosition || 'top') === position.id;
              return (
                <button
                  key={position.id}
                  onClick={() => onUpdate({ avatarPosition: position.id })}
                  className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-[#660033] bg-[rgba(102,0,51,0.1)]'
                      : 'border-transparent bg-white hover:bg-[rgba(102,0,51,0.05)]'
                  }`}
                >
                  <Icon
                    size={18}
                    className={isSelected ? 'text-[#660033]' : 'text-[rgba(102,0,51,0.4)]'}
                  />
                  <span
                    className={`text-xs font-medium ${
                      isSelected ? 'text-[#660033]' : 'text-[rgba(102,0,51,0.5)]'
                    }`}
                  >
                    {position.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Theme Selector */}
      <div className="p-4 rounded-xl bg-white/60">
        <h4 className="text-sm font-bold text-[#660033] mb-4">Theme Presets</h4>
        <ThemeSelector
          selectedThemeId={landingPageData.themeId}
          onThemeSelect={(theme: ThemePreset) => {
            onUpdate({
              themeId: theme.id,
              primaryColor: theme.primaryColor,
              secondaryColor: theme.secondaryColor,
              accentColor: theme.accentColor,
              textColor: theme.textColor,
              headingFont: theme.headingFont,
              bodyFont: theme.bodyFont,
              buttonStyle: theme.buttonStyle,
              backgroundType: theme.backgroundType,
              backgroundValue: theme.backgroundValue,
              backgroundOverlay: theme.backgroundOverlay,
            });
          }}
        />
      </div>

      {/* Custom Colors */}
      <div className="p-4 rounded-xl bg-white/60">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-bold text-[#660033]">Custom Colors</h4>
          {landingPageData.themeId && (
            <span className="text-xs text-[rgba(102,0,51,0.5)]">
              Theme: {landingPageData.themeId}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ColorPicker
            label="Primary"
            value={landingPageData.primaryColor || '#660033'}
            onChange={(color) => onUpdate({ primaryColor: color, themeId: null })}
          />
          <ColorPicker
            label="Secondary"
            value={landingPageData.secondaryColor || '#F7E6CA'}
            onChange={(color) => onUpdate({ secondaryColor: color, themeId: null })}
          />
          <ColorPicker
            label="Accent"
            value={landingPageData.accentColor || '#FFD700'}
            onChange={(color) => onUpdate({ accentColor: color, themeId: null })}
          />
          <ColorPicker
            label="Text"
            value={landingPageData.textColor || '#FFFFFF'}
            onChange={(color) => onUpdate({ textColor: color, themeId: null })}
          />
        </div>

        {/* WCAG Contrast Warning */}
        {(() => {
          const textColor = landingPageData.textColor || '#FFFFFF';
          const bgColor = landingPageData.primaryColor || '#660033';
          const ratio = getContrastRatio(textColor, bgColor);
          if (ratio < 4.5) {
            return (
              <div className="mt-3 p-2 rounded-lg bg-[rgba(255,193,7,0.15)] border border-[rgba(255,193,7,0.3)]">
                <p className="text-xs text-[#B8860B] font-medium">
                  Low contrast: {ratio.toFixed(1)}:1 (WCAG AA: 4.5:1)
                </p>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Fonts */}
      <div className="p-4 rounded-xl bg-white/60">
        <h4 className="text-sm font-bold text-[#660033] mb-4">Fonts</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FontSelector
            label="Heading"
            value={landingPageData.headingFont || 'Inter'}
            onChange={(font) => onUpdate({ headingFont: font })}
          />
          <FontSelector
            label="Body"
            value={landingPageData.bodyFont || 'Inter'}
            onChange={(font) => onUpdate({ bodyFont: font })}
          />
        </div>
        {/* Font preview */}
        <div className="mt-3 p-3 rounded-lg bg-white border border-[rgba(102,0,51,0.1)]">
          <p className="text-xs text-[rgba(102,0,51,0.5)] mb-1">Preview</p>
          <h5
            className="text-lg font-bold"
            style={{ fontFamily: `"${landingPageData.headingFont || 'Inter'}", system-ui, sans-serif` }}
          >
            Heading
          </h5>
          <p
            className="text-sm"
            style={{ fontFamily: `"${landingPageData.bodyFont || 'Inter'}", system-ui, sans-serif` }}
          >
            Body text preview
          </p>
        </div>
      </div>

      {/* Button Style */}
      <div className="p-4 rounded-xl bg-white/60">
        <ButtonStylePicker
          value={(landingPageData.buttonStyle as ButtonStyle) || 'rounded'}
          onChange={(style) => onUpdate({ buttonStyle: style })}
          primaryColor={landingPageData.primaryColor || '#660033'}
          secondaryColor={landingPageData.secondaryColor || '#F7E6CA'}
        />
      </div>

      {/* Background */}
      <div className="p-4 rounded-xl bg-white/60">
        <h4 className="text-sm font-bold text-[#660033] mb-4">Background</h4>
        <BackgroundEditor
          backgroundType={(landingPageData.backgroundType as BackgroundType) || 'solid'}
          backgroundValue={landingPageData.backgroundValue || '#660033'}
          backgroundOverlay={(landingPageData.backgroundOverlay as BackgroundOverlay) || 'none'}
          backgroundPosition={(landingPageData.backgroundPosition as 'cover' | 'contain') || 'cover'}
          onBackgroundTypeChange={(type) => onUpdate({ backgroundType: type })}
          onBackgroundValueChange={(value) => onUpdate({ backgroundValue: value })}
          onBackgroundOverlayChange={(overlay) => onUpdate({ backgroundOverlay: overlay })}
          onBackgroundPositionChange={(position) => onUpdate({ backgroundPosition: position })}
          onImageUpload={onImageUpload}
          onImageRemove={onBackgroundRemove}
          onVideoUpload={onVideoUpload}
          onVideoRemove={onVideoRemove}
        />
      </div>
    </div>
  );
}
