import { useState, useRef } from "react";
import type { BackgroundType, BackgroundOverlay, GradientConfig, GradientDirection } from "@shared/themes";
import { GRADIENT_DIRECTIONS, generateGradientCSS, parseGradientCSS } from "@shared/themes";
import { ColorPicker } from "./ColorPicker";
import { ImageCropModal } from "@/components/ImageCropModal";

interface BackgroundEditorProps {
  backgroundType: BackgroundType;
  backgroundValue: string;
  backgroundOverlay: BackgroundOverlay;
  backgroundPosition?: 'cover' | 'contain';
  onBackgroundTypeChange: (type: BackgroundType) => void;
  onBackgroundValueChange: (value: string) => void;
  onBackgroundOverlayChange: (overlay: BackgroundOverlay) => void;
  onBackgroundPositionChange?: (position: 'cover' | 'contain') => void;
  onImageUpload?: (file: File) => Promise<string>;
  onImageRemove?: () => void;
}

const BACKGROUND_TYPES: { id: BackgroundType; name: string; description: string }[] = [
  { id: 'solid', name: 'Solid Color', description: 'Single color background' },
  { id: 'gradient', name: 'Gradient', description: 'Two-color gradient' },
  { id: 'image', name: 'Image', description: 'Custom background image' },
];

const OVERLAY_OPTIONS: { id: BackgroundOverlay; name: string; description: string }[] = [
  { id: 'none', name: 'None', description: 'No overlay' },
  { id: 'dark', name: 'Dark', description: 'Dark overlay for readability' },
  { id: 'light', name: 'Light', description: 'Light overlay for readability' },
];

const POSITION_OPTIONS: { id: 'cover' | 'contain'; name: string; description: string }[] = [
  { id: 'cover', name: 'Cover', description: 'Fill entire area' },
  { id: 'contain', name: 'Contain', description: 'Fit within area' },
];

export function BackgroundEditor({
  backgroundType,
  backgroundValue,
  backgroundOverlay,
  backgroundPosition = 'cover',
  onBackgroundTypeChange,
  onBackgroundValueChange,
  onBackgroundOverlayChange,
  onBackgroundPositionChange,
  onImageUpload,
  onImageRemove,
}: BackgroundEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse gradient from backgroundValue if it's a gradient type
  const gradientConfig = backgroundType === 'gradient'
    ? parseGradientCSS(backgroundValue) || { color1: '#660033', color2: '#8B0045', direction: 'to-bottom' as GradientDirection }
    : { color1: '#660033', color2: '#8B0045', direction: 'to-bottom' as GradientDirection };

  const handleGradientChange = (updates: Partial<GradientConfig>) => {
    const newConfig = { ...gradientConfig, ...updates };
    const css = generateGradientCSS(newConfig);
    onBackgroundValueChange(css);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Please upload a JPG, PNG, or WebP image.');
      return;
    }

    // Validate file size (5MB max - Story 9.13)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File too large. Maximum size is 5MB.');
      return;
    }

    setUploadError(null);
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
    const croppedFile = new File([croppedBlob], originalFileName || 'background.jpg', {
      type: 'image/jpeg',
    });

    setIsUploading(true);

    try {
      if (onImageUpload) {
        const url = await onImageUpload(croppedFile);
        onBackgroundValueChange(url);
        setPreviewUrl(null); // Clear preview, use uploaded URL
      }
    } catch {
      setUploadError('Failed to upload image. Please try again.');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Clean up the object URL
      URL.revokeObjectURL(previewDataUrl);
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setImageToCrop(null);
  };

  return (
    <div className="space-y-6">
      {/* Background Type Selector */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-3">
          Background Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {BACKGROUND_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => {
                onBackgroundTypeChange(type.id);
                // Set default value for new type
                if (type.id === 'solid' && backgroundType !== 'solid') {
                  onBackgroundValueChange('#660033');
                } else if (type.id === 'gradient' && backgroundType !== 'gradient') {
                  onBackgroundValueChange(generateGradientCSS({ color1: '#660033', color2: '#8B0045', direction: 'to-bottom' }));
                }
              }}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                backgroundType === type.id
                  ? 'border-[#660033] bg-[rgba(102,0,51,0.05)]'
                  : 'border-[rgba(102,0,51,0.1)] hover:border-[rgba(102,0,51,0.3)]'
              }`}
            >
              <p className="text-sm font-semibold">{type.name}</p>
              <p className="text-[10px] text-[rgba(102,0,51,0.5)]">{type.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Solid Color Picker */}
      {backgroundType === 'solid' && (
        <ColorPicker
          label="Background Color"
          value={backgroundValue.startsWith('#') ? backgroundValue : '#660033'}
          onChange={onBackgroundValueChange}
        />
      )}

      {/* Gradient Builder */}
      {backgroundType === 'gradient' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ColorPicker
              label="Start Color"
              value={gradientConfig.color1}
              onChange={(color) => handleGradientChange({ color1: color })}
            />
            <ColorPicker
              label="End Color"
              value={gradientConfig.color2}
              onChange={(color) => handleGradientChange({ color2: color })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2">
              Direction
            </label>
            <div className="grid grid-cols-4 gap-2">
              {GRADIENT_DIRECTIONS.map((dir) => (
                <button
                  key={dir.id}
                  type="button"
                  onClick={() => handleGradientChange({ direction: dir.id })}
                  className={`p-2 rounded-lg border-2 transition-all ${
                    gradientConfig.direction === dir.id
                      ? 'border-[#660033] bg-[rgba(102,0,51,0.05)]'
                      : 'border-[rgba(102,0,51,0.1)] hover:border-[rgba(102,0,51,0.3)]'
                  }`}
                >
                  <div
                    className="w-full h-8 rounded mb-1"
                    style={{
                      background: `linear-gradient(${dir.angle}, ${gradientConfig.color1} 0%, ${gradientConfig.color2} 100%)`,
                    }}
                  />
                  <p className="text-[10px] text-center">{dir.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Gradient Preview */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2">
              Preview
            </label>
            <div
              className="w-full h-24 rounded-lg"
              style={{
                background: generateGradientCSS(gradientConfig),
              }}
            />
          </div>
        </div>
      )}

      {/* Image Upload */}
      {backgroundType === 'image' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2">
              Background Image
            </label>

            {/* Image Preview - shows FileReader preview during upload OR uploaded image (Story 9.13) */}
            {(previewUrl || (backgroundValue && backgroundValue.startsWith('/api'))) && (
              <div className="mb-4">
                <div
                  className="w-full h-32 rounded-lg bg-center border border-[rgba(102,0,51,0.2)]"
                  style={{
                    backgroundImage: `url(${previewUrl || backgroundValue})`,
                    backgroundSize: backgroundPosition,
                    backgroundRepeat: 'no-repeat',
                  }}
                />
                {isUploading && (
                  <p className="text-xs text-[rgba(102,0,51,0.5)] mt-1">Uploading...</p>
                )}
              </div>
            )}

            {/* Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileSelect}
              className="hidden"
              id="background-image-upload"
            />
            <label
              htmlFor="background-image-upload"
              className={`flex items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isUploading
                  ? 'border-[rgba(102,0,51,0.3)] bg-[rgba(102,0,51,0.02)]'
                  : 'border-[rgba(102,0,51,0.2)] hover:border-[rgba(102,0,51,0.4)] hover:bg-[rgba(102,0,51,0.02)]'
              }`}
            >
              {isUploading ? (
                <span className="text-sm text-[rgba(102,0,51,0.6)]">Uploading...</span>
              ) : (
                <span className="text-sm text-[rgba(102,0,51,0.6)]">
                  Click to upload image (JPG, PNG, WebP • Max 5MB)
                </span>
              )}
            </label>

            {/* Error Message */}
            {uploadError && (
              <p className="mt-2 text-sm text-red-600">{uploadError}</p>
            )}

            {/* Remove Button (Story 9.13) */}
            {backgroundValue && backgroundValue.startsWith('/api') && onImageRemove && (
              <button
                type="button"
                onClick={() => {
                  onImageRemove();
                  onBackgroundTypeChange('solid');
                  onBackgroundValueChange('#660033');
                }}
                className="mt-2 px-3 py-1.5 text-xs font-semibold text-[#dc3545] bg-[rgba(220,53,69,0.1)] rounded-lg hover:bg-[rgba(220,53,69,0.2)] transition-colors"
              >
                Remove Background Image
              </button>
            )}
          </div>

          {/* Image Position Selector (Story 9.13) */}
          {onBackgroundPositionChange && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2">
                Image Position
              </label>
              <div className="grid grid-cols-2 gap-2">
                {POSITION_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onBackgroundPositionChange(option.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      backgroundPosition === option.id
                        ? 'border-[#660033] bg-[rgba(102,0,51,0.05)]'
                        : 'border-[rgba(102,0,51,0.1)] hover:border-[rgba(102,0,51,0.3)]'
                    }`}
                  >
                    <p className="text-sm font-semibold">{option.name}</p>
                    <p className="text-[10px] text-[rgba(102,0,51,0.5)]">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlay Selector */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-3">
          Background Overlay
        </label>
        <div className="grid grid-cols-3 gap-2">
          {OVERLAY_OPTIONS.map((overlay) => (
            <button
              key={overlay.id}
              type="button"
              onClick={() => onBackgroundOverlayChange(overlay.id)}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                backgroundOverlay === overlay.id
                  ? 'border-[#660033] bg-[rgba(102,0,51,0.05)]'
                  : 'border-[rgba(102,0,51,0.1)] hover:border-[rgba(102,0,51,0.3)]'
              }`}
            >
              {/* Visual preview */}
              <div className="w-full h-6 rounded mb-1 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#660033] to-[#8B0045]" />
                {overlay.id === 'dark' && <div className="absolute inset-0 bg-black/50" />}
                {overlay.id === 'light' && <div className="absolute inset-0 bg-white/30" />}
              </div>
              <p className="text-xs font-semibold">{overlay.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Image Crop Modal */}
      {imageToCrop && (
        <ImageCropModal
          isOpen={showCropModal}
          imageSrc={imageToCrop}
          onClose={handleCropCancel}
          onCropComplete={handleCropComplete}
          aspectRatio={16 / 9}
          cropShape="rect"
          title="Crop Background Image"
        />
      )}
    </div>
  );
}

export { BACKGROUND_TYPES, OVERLAY_OPTIONS };
