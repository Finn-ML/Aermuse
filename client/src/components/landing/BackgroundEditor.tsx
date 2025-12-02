import { useState, useRef } from "react";
import type { BackgroundType, BackgroundOverlay, GradientConfig, GradientDirection } from "@shared/themes";
import { GRADIENT_DIRECTIONS, generateGradientCSS, parseGradientCSS } from "@shared/themes";
import { ColorPicker } from "./ColorPicker";

interface BackgroundEditorProps {
  backgroundType: BackgroundType;
  backgroundValue: string;
  backgroundOverlay: BackgroundOverlay;
  onBackgroundTypeChange: (type: BackgroundType) => void;
  onBackgroundValueChange: (value: string) => void;
  onBackgroundOverlayChange: (overlay: BackgroundOverlay) => void;
  onImageUpload?: (file: File) => Promise<string>;
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

export function BackgroundEditor({
  backgroundType,
  backgroundValue,
  backgroundOverlay,
  onBackgroundTypeChange,
  onBackgroundValueChange,
  onBackgroundOverlayChange,
  onImageUpload,
}: BackgroundEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File too large. Maximum size is 2MB.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      if (onImageUpload) {
        const url = await onImageUpload(file);
        onBackgroundValueChange(url);
      }
    } catch {
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
              style={{ background: generateGradientCSS(gradientConfig) }}
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

            {/* Current Image Preview */}
            {backgroundValue && backgroundValue.startsWith('/api') && (
              <div className="mb-4">
                <div
                  className="w-full h-32 rounded-lg bg-cover bg-center border border-[rgba(102,0,51,0.2)]"
                  style={{ backgroundImage: `url(${backgroundValue})` }}
                />
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
                  Click to upload image (JPG, PNG, WebP • Max 2MB)
                </span>
              )}
            </label>

            {/* Error Message */}
            {uploadError && (
              <p className="mt-2 text-sm text-red-600">{uploadError}</p>
            )}
          </div>
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
    </div>
  );
}

export { BACKGROUND_TYPES, OVERLAY_OPTIONS };
