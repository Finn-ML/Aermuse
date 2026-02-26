import { useState, useRef } from "react";
import { Link } from "wouter";
import type { BackgroundType, BackgroundOverlay, GradientConfig, GradientDirection } from "@shared/themes";
import { GRADIENT_DIRECTIONS, generateGradientCSS, parseGradientCSS } from "@shared/themes";
import { ColorPicker } from "./ColorPicker";
import { ImageCropModal } from "@/components/ImageCropModal";
import { Play, Film, Loader2, Lock, Sparkles } from "lucide-react";
import { VideoTrimModal } from "@/components/VideoTrimModal";

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
  onVideoUpload?: (file: File, onProgress?: (percent: number, message: string) => void, startTime?: number) => Promise<{ webmUrl: string; mp4Url?: string; duration: number }>;
  onVideoRemove?: () => void;
  canAccessVideo?: boolean;
}

// Parse video background value JSON
function parseVideoBackground(value: string): { webm?: string; mp4?: string; duration?: number } | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

const BACKGROUND_TYPES: { id: BackgroundType; name: string; description: string }[] = [
  { id: 'solid', name: 'Solid Color', description: 'Single color background' },
  { id: 'gradient', name: 'Gradient', description: 'Two-color gradient' },
  { id: 'image', name: 'Image', description: 'Custom background image' },
  { id: 'video', name: 'Video', description: 'Looping video background' },
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
  onVideoUpload,
  onVideoRemove,
  canAccessVideo = false,
}: BackgroundEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<string>('');
  const [videoUploadPercent, setVideoUploadPercent] = useState<number>(0);
  const [showTrimModal, setShowTrimModal] = useState(false);
  const [videoFileToTrim, setVideoFileToTrim] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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

  // Upload the video file with the selected start time
  const proceedWithUpload = async (file: File, startTime: number) => {
    setIsVideoUploading(true);
    setVideoUploadProgress('Preparing video...');
    setVideoUploadPercent(0);

    const previewDataUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(previewDataUrl);

    try {
      if (onVideoUpload) {
        setVideoUploadProgress('Converting to web format...');
        const result = await onVideoUpload(file, (percent, message) => {
          setVideoUploadPercent(percent);
          setVideoUploadProgress(message);
        }, startTime);
        setVideoPreviewUrl(null);
        setVideoUploadProgress('');
        setVideoUploadPercent(0);
      }
    } catch {
      setVideoUploadError('Failed to upload video. Please try again.');
      setVideoPreviewUrl(null);
    } finally {
      setIsVideoUploading(false);
      URL.revokeObjectURL(previewDataUrl);
    }
  };

  // Video upload handler - validates then shows trim modal or uploads directly
  const handleVideoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Prevent concurrent uploads
    if (isVideoUploading) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      setVideoUploadError('Invalid file type. Please upload an MP4, MOV, or WebM video.');
      return;
    }

    // Validate file size (250MB max)
    const maxSize = 250 * 1024 * 1024;
    if (file.size > maxSize) {
      setVideoUploadError('File too large. Maximum size is 250MB.');
      return;
    }

    setVideoUploadError(null);

    // Reset file input
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }

    // Check video duration to decide whether to show trim modal
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    const tempUrl = URL.createObjectURL(file);

    tempVideo.onloadedmetadata = () => {
      URL.revokeObjectURL(tempUrl);
      const videoDuration = tempVideo.duration;

      if (videoDuration <= 8) {
        // Short video: upload directly
        proceedWithUpload(file, 0);
      } else {
        // Longer video: show trim modal to select 8s clip
        setVideoFileToTrim(file);
        setShowTrimModal(true);
      }
    };
    tempVideo.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      // Fallback: upload without trimming, server will handle it
      proceedWithUpload(file, 0);
    };
    tempVideo.src = tempUrl;
  };

  const handleTrimConfirm = (startTime: number) => {
    setShowTrimModal(false);
    if (videoFileToTrim) {
      proceedWithUpload(videoFileToTrim, startTime);
      setVideoFileToTrim(null);
    }
  };

  const handleTrimCancel = () => {
    setShowTrimModal(false);
    setVideoFileToTrim(null);
  };

  // Parse video background data if type is video
  const videoData = backgroundType === 'video' && backgroundValue
    ? parseVideoBackground(backgroundValue)
    : null;

  return (
    <div className="space-y-6">
      {/* Background Type Selector */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-3">
          Background Type
        </label>
        <div className="grid gap-2 grid-cols-4">
          {BACKGROUND_TYPES.map((type) => {
            const isVideo = type.id === 'video';
            const isLocked = isVideo && !canAccessVideo;

            return (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  if (isLocked) return; // Don't allow selection for locked options
                  onBackgroundTypeChange(type.id);
                  // Set default value for new type
                  if (type.id === 'solid' && backgroundType !== 'solid') {
                    onBackgroundValueChange('#660033');
                  } else if (type.id === 'gradient' && backgroundType !== 'gradient') {
                    onBackgroundValueChange(generateGradientCSS({ color1: '#660033', color2: '#8B0045', direction: 'to-bottom' }));
                  }
                }}
                className={`p-3 rounded-lg border-2 transition-all text-center relative ${
                  isLocked
                    ? 'border-[#D4AF37]/30 bg-gradient-to-br from-[#1a1a2e]/5 to-[#16213e]/10 cursor-not-allowed'
                    : backgroundType === type.id
                      ? 'border-[#660033] bg-[rgba(102,0,51,0.05)]'
                      : 'border-[rgba(102,0,51,0.1)] hover:border-[rgba(102,0,51,0.3)]'
                }`}
              >
                {isLocked && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F0D060] flex items-center justify-center">
                    <Lock size={10} className="text-[#1a1a2e]" />
                  </div>
                )}
                <p className={`text-sm font-semibold ${isLocked ? 'text-[#D4AF37]' : ''}`}>{type.name}</p>
                <p className={`text-[10px] ${isLocked ? 'text-[#D4AF37]/60' : 'text-[rgba(102,0,51,0.5)]'}`}>
                  {isLocked ? 'Theta tier' : type.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Video Background Upgrade CTA */}
        {!canAccessVideo && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-[#1a1a2e]/5 to-[#16213e]/10 border border-[#D4AF37]/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F0D060] flex items-center justify-center flex-shrink-0">
                <Film size={18} className="text-[#1a1a2e]" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-[#660033] mb-1">Video Background</h4>
                <p className="text-xs text-[rgba(102,0,51,0.6)] mb-3">
                  Add eye-catching looping video backgrounds to your artist page. Perfect for music videos, visualizers, or artistic loops.
                </p>
                <Link href="/pricing">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1a1a2e] bg-gradient-to-r from-[#D4AF37] to-[#F0D060] rounded-lg hover:shadow-md transition-shadow">
                    <Sparkles size={12} />
                    Upgrade to Theta
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
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

      {/* Video Upload */}
      {backgroundType === 'video' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2">
              Background Video
            </label>
            <p className="text-xs text-[rgba(102,0,51,0.5)] mb-3">
              Upload a short looping video (max 8 seconds, 250MB). Spotify Canvas style!
            </p>

            {/* Video Preview */}
            {(videoPreviewUrl || videoData?.webm) && (
              <div className="mb-4">
                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-[rgba(102,0,51,0.2)] bg-black">
                  <video
                    src={videoPreviewUrl || videoData?.webm}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                  {isVideoUploading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center px-6">
                      <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                      <p className="text-xs text-white mb-2">{videoUploadProgress}</p>
                      {videoUploadPercent > 0 && (
                        <div className="w-full max-w-[200px]">
                          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${videoUploadPercent}%` }}
                            />
                          </div>
                          <p className="text-xs text-white/70 text-center mt-1">{videoUploadPercent}%</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {videoData?.duration && (
                  <p className="text-xs text-[rgba(102,0,51,0.5)] mt-1">
                    Duration: {videoData.duration}s
                  </p>
                )}
              </div>
            )}

            {/* Upload Button */}
            <input
              ref={videoInputRef}
              type="file"
              accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
              onChange={handleVideoSelect}
              className="hidden"
              id="background-video-upload"
              disabled={isVideoUploading}
            />
            <label
              htmlFor="background-video-upload"
              className={`flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed rounded-lg transition-colors ${
                isVideoUploading
                  ? 'border-[rgba(102,0,51,0.3)] bg-[rgba(102,0,51,0.02)] pointer-events-none'
                  : 'border-[rgba(102,0,51,0.2)] hover:border-[rgba(102,0,51,0.4)] hover:bg-[rgba(102,0,51,0.02)] cursor-pointer'
              }`}
            >
              {isVideoUploading ? (
                <>
                  <Loader2 className="w-5 h-5 text-[rgba(102,0,51,0.6)] animate-spin" />
                  <span className="text-sm text-[rgba(102,0,51,0.6)]">Processing video...</span>
                </>
              ) : (
                <>
                  <Film className="w-5 h-5 text-[rgba(102,0,51,0.6)]" />
                  <span className="text-sm text-[rgba(102,0,51,0.6)]">
                    Click to upload video (MP4, MOV, WebM)
                  </span>
                </>
              )}
            </label>

            {/* Error Message */}
            {videoUploadError && (
              <p className="mt-2 text-sm text-red-600">{videoUploadError}</p>
            )}

            {/* Remove Button */}
            {videoData && onVideoRemove && (
              <button
                type="button"
                onClick={() => {
                  onVideoRemove();
                  onBackgroundTypeChange('solid');
                  onBackgroundValueChange('#660033');
                }}
                className="mt-2 px-3 py-1.5 text-xs font-semibold text-[#dc3545] bg-[rgba(220,53,69,0.1)] rounded-lg hover:bg-[rgba(220,53,69,0.2)] transition-colors"
              >
                Remove Background Video
              </button>
            )}
          </div>

          {/* Video Tips */}
          <div className="p-3 bg-[rgba(102,0,51,0.05)] rounded-lg">
            <p className="text-xs font-semibold text-[rgba(102,0,51,0.7)] mb-1">
              Tips for great video backgrounds:
            </p>
            <ul className="text-xs text-[rgba(102,0,51,0.5)] space-y-0.5">
              <li>- Use portrait (9:16) or square (1:1) videos</li>
              <li>- Keep movement subtle for a smooth loop</li>
              <li>- Avoid text or important details at edges</li>
              <li>- Videos are automatically muted</li>
            </ul>
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

      {/* Video Trim Modal */}
      {videoFileToTrim && (
        <VideoTrimModal
          isOpen={showTrimModal}
          videoFile={videoFileToTrim}
          onClose={handleTrimCancel}
          onTrimConfirm={handleTrimConfirm}
        />
      )}
    </div>
  );
}

export { BACKGROUND_TYPES, OVERLAY_OPTIONS };
