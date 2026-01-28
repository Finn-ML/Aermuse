// Video Tab - Video Upload and Management for Landing Page Editor
// Provides video upload, paywall settings, and management interface

import { useState, useRef } from 'react';
import { Plus, Video, Trash2, Upload, Loader2, Play, ImagePlus, DollarSign, Eye, EyeOff, X, Lock, Unlock } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatPrice } from '@/hooks/useAudioPlayer';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type PricingType = 'fixed' | 'pwyw';

export interface VideoItem {
  id: string;
  title: string;
  description?: string | null;
  thumbnailPath?: string | null;
  durationSeconds?: number | null;
  fileFormat: string;
  fileSizeBytes: number;
  isPaywalled: boolean;
  priceInCents?: number | null;
  currency?: string | null;
  pricingType?: PricingType | null;
  minimumPriceInCents?: number | null;
  isPublished: boolean;
  viewCount?: number;
  purchaseCount?: number;
}

interface UploadVideoOptions {
  file: File;
  title: string;
  description?: string;
  thumbnailFile?: File;
  isPaywalled: boolean;
  priceInCents?: number;
  pricingType?: PricingType;
  minimumPriceInCents?: number;
}

interface VideoTabProps {
  videos: VideoItem[];
  isLoading: boolean;
  onUploadVideo: (options: UploadVideoOptions) => Promise<VideoItem | void>;
  onUpdateVideo: (id: string, updates: {
    title?: string;
    description?: string;
    isPaywalled?: boolean;
    priceInCents?: number;
    isPublished?: boolean;
  }) => Promise<void>;
  onDeleteVideo: (id: string) => Promise<void>;
  onUploadThumbnail: (videoId: string, file: File) => Promise<void>;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoTab({
  videos,
  isLoading,
  onUploadVideo,
  onUpdateVideo,
  onDeleteVideo,
  onUploadThumbnail,
}: VideoTabProps) {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState<string | null>(null);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoDescription, setNewVideoDescription] = useState('');
  const [newVideoPrice, setNewVideoPrice] = useState('4.99');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');

  // Paywall settings
  const [isPaywalled, setIsPaywalled] = useState(false);
  const [pricingType, setPricingType] = useState<PricingType>('fixed');
  const [minimumPrice, setMinimumPrice] = useState('0');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newThumbnailInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [thumbnailVideoId, setThumbnailVideoId] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Use filename (without extension) as default title
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      if (!newVideoTitle) {
        setNewVideoTitle(nameWithoutExt);
      }
    }
  };

  const handleNewThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedThumbnailFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearThumbnailSelection = () => {
    setSelectedThumbnailFile(null);
    setThumbnailPreview(null);
    if (newThumbnailInputRef.current) newThumbnailInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile || !newVideoTitle.trim()) return;

    const priceInCents = Math.round(parseFloat(newVideoPrice) * 100);
    const minPriceCents = Math.round(parseFloat(minimumPrice || '0') * 100);

    // Validate pricing if paywalled
    if (isPaywalled) {
      if (pricingType === 'fixed') {
        if (isNaN(priceInCents) || priceInCents < 50) {
          alert('Minimum price is $0.50');
          return;
        }
      } else {
        // PWYW validation
        if (minPriceCents > 0 && minPriceCents < 50) {
          alert('If setting a minimum price, it must be at least $0.50');
          return;
        }
      }
    }

    setUploadingVideo(true);
    try {
      await onUploadVideo({
        file: selectedFile,
        title: newVideoTitle.trim(),
        description: newVideoDescription.trim() || undefined,
        thumbnailFile: selectedThumbnailFile || undefined,
        isPaywalled,
        priceInCents: isPaywalled ? (pricingType === 'fixed' ? priceInCents : minPriceCents) : undefined,
        pricingType: isPaywalled ? pricingType : undefined,
        minimumPriceInCents: isPaywalled && pricingType === 'pwyw' ? minPriceCents : undefined,
      });

      // Reset form
      setShowUploadForm(false);
      setSelectedFile(null);
      setSelectedThumbnailFile(null);
      setThumbnailPreview(null);
      setNewVideoTitle('');
      setNewVideoDescription('');
      setNewVideoPrice('4.99');
      setIsPaywalled(false);
      setPricingType('fixed');
      setMinimumPrice('0');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (newThumbnailInputRef.current) newThumbnailInputRef.current.value = '';
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleThumbnailSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && thumbnailVideoId) {
      setUploadingThumbnail(thumbnailVideoId);
      try {
        await onUploadThumbnail(thumbnailVideoId, file);
      } finally {
        setUploadingThumbnail(null);
        setThumbnailVideoId(null);
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
      }
    }
  };

  const startEditing = (video: VideoItem) => {
    setEditingVideo(video.id);
    setEditTitle(video.title);
    setEditDescription(video.description || '');
    setEditPrice(video.priceInCents ? (video.priceInCents / 100).toFixed(2) : '4.99');
  };

  const saveEdit = async (videoId: string) => {
    const priceInCents = Math.round(parseFloat(editPrice) * 100);
    if (isNaN(priceInCents) || priceInCents < 50) {
      alert('Minimum price is $0.50');
      return;
    }

    await onUpdateVideo(videoId, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      priceInCents,
    });
    setEditingVideo(null);
  };

  const cancelEdit = () => {
    setEditingVideo(null);
    setEditTitle('');
    setEditDescription('');
    setEditPrice('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-[#660033]">Your Videos</h4>
          <p className="text-xs text-[rgba(102,0,51,0.5)]">
            Upload videos with optional paywall protection
          </p>
        </div>
        {!showUploadForm && (
          <button
            onClick={() => setShowUploadForm(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-[#660033] rounded-lg hover:bg-[#8B0045] transition-colors"
          >
            <Plus size={16} />
            Add Video
          </button>
        )}
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border-2 border-[rgba(102,0,51,0.2)] bg-white/80"
        >
          <h4 className="text-sm font-bold text-[#660033] mb-4">Upload New Video</h4>

          {/* File Input */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[rgba(102,0,51,0.7)] mb-2">
              Video File (MP4, WebM, or MOV)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 border-2 border-dashed border-[rgba(102,0,51,0.2)] rounded-lg hover:border-[#660033] transition-colors flex flex-col items-center gap-2"
            >
              {selectedFile ? (
                <>
                  <Video size={24} className="text-[#660033]" />
                  <span className="text-sm font-medium text-[#660033]">{selectedFile.name}</span>
                  <span className="text-xs text-[rgba(102,0,51,0.5)]">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </>
              ) : (
                <>
                  <Upload size={24} className="text-[rgba(102,0,51,0.4)]" />
                  <span className="text-sm text-[rgba(102,0,51,0.6)]">Click to select video file</span>
                  <span className="text-xs text-[rgba(102,0,51,0.4)]">Max 500MB</span>
                </>
              )}
            </button>
          </div>

          {/* Title Input */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[rgba(102,0,51,0.7)] mb-2">
              Video Title
            </label>
            <input
              type="text"
              value={newVideoTitle}
              onChange={(e) => setNewVideoTitle(e.target.value)}
              placeholder="Enter video title"
              className="w-full px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.2)] focus:border-[#660033] outline-none text-sm"
            />
          </div>

          {/* Description Input */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[rgba(102,0,51,0.7)] mb-2">
              Description (Optional)
            </label>
            <textarea
              value={newVideoDescription}
              onChange={(e) => setNewVideoDescription(e.target.value)}
              placeholder="Brief description of the video..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.2)] focus:border-[#660033] outline-none text-sm resize-none"
            />
          </div>

          {/* Thumbnail Input */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[rgba(102,0,51,0.7)] mb-2">
              Thumbnail (Optional)
            </label>
            <input
              ref={newThumbnailInputRef}
              type="file"
              accept="image/*"
              onChange={handleNewThumbnailSelect}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => newThumbnailInputRef.current?.click()}
                className="w-24 h-14 rounded-lg border-2 border-dashed border-[rgba(102,0,51,0.2)] hover:border-[#660033] transition-colors flex items-center justify-center overflow-hidden flex-shrink-0"
              >
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus size={20} className="text-[rgba(102,0,51,0.4)]" />
                )}
              </button>
              <div className="flex-1">
                {thumbnailPreview ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#660033] font-medium truncate flex-1">
                      {selectedThumbnailFile?.name}
                    </span>
                    <button
                      type="button"
                      onClick={clearThumbnailSelection}
                      className="p-1 rounded hover:bg-[rgba(102,0,51,0.1)] text-[rgba(102,0,51,0.5)] hover:text-[#dc3545] transition-colors"
                      title="Remove thumbnail"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-[rgba(102,0,51,0.5)]">
                    Click to add a custom thumbnail (auto-generated if not provided)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Paywall Toggle */}
          <div className="mb-4 p-3 rounded-lg bg-[rgba(102,0,51,0.03)] border border-[rgba(102,0,51,0.1)]">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isPaywalled}
                  onChange={(e) => setIsPaywalled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-[rgba(102,0,51,0.15)] rounded-full peer-checked:bg-[#660033] transition-colors"></div>
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></div>
              </div>
              <div>
                <span className="text-sm font-medium text-[#660033] flex items-center gap-2">
                  {isPaywalled ? <Lock size={14} /> : <Unlock size={14} />}
                  Paywall this video
                </span>
                <p className="text-xs text-[rgba(102,0,51,0.5)]">
                  {isPaywalled ? 'Viewers must purchase to watch beyond 10-second preview' : 'Free to watch for all visitors'}
                </p>
              </div>
            </label>

            {/* Pricing Options (shown when paywalled) */}
            {isPaywalled && (
              <div className="mt-4 pt-4 border-t border-[rgba(102,0,51,0.1)] space-y-4">
                {/* Pricing Type Selector */}
                <div>
                  <label className="block text-xs font-semibold text-[rgba(102,0,51,0.7)] mb-2">
                    Pricing Model
                  </label>
                  <div className="flex rounded-lg border border-[rgba(102,0,51,0.2)] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setPricingType('fixed')}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        pricingType === 'fixed'
                          ? 'bg-[#660033] text-white'
                          : 'bg-white text-[rgba(102,0,51,0.6)] hover:bg-[rgba(102,0,51,0.05)]'
                      }`}
                    >
                      Fixed Price
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingType('pwyw')}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        pricingType === 'pwyw'
                          ? 'bg-[#660033] text-white'
                          : 'bg-white text-[rgba(102,0,51,0.6)] hover:bg-[rgba(102,0,51,0.05)]'
                      }`}
                    >
                      Pay What You Want
                    </button>
                  </div>
                </div>

                {/* Fixed Price Input */}
                {pricingType === 'fixed' && (
                  <div>
                    <label className="block text-xs font-semibold text-[rgba(102,0,51,0.7)] mb-2">
                      Price (USD)
                    </label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(102,0,51,0.4)]" />
                      <input
                        type="number"
                        min="0.50"
                        step="0.01"
                        value={newVideoPrice}
                        onChange={(e) => setNewVideoPrice(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-[rgba(102,0,51,0.2)] focus:border-[#660033] outline-none text-sm"
                      />
                    </div>
                    <p className="text-xs text-[rgba(102,0,51,0.4)] mt-1">Minimum $0.50</p>
                  </div>
                )}

                {/* PWYW Pricing Options */}
                {pricingType === 'pwyw' && (
                  <div>
                    <label className="block text-xs font-semibold text-[rgba(102,0,51,0.7)] mb-2">
                      Minimum Price
                    </label>
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[rgba(102,0,51,0.4)]" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={minimumPrice}
                        onChange={(e) => setMinimumPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-2 py-2 rounded-lg border border-[rgba(102,0,51,0.2)] focus:border-[#660033] outline-none text-sm"
                      />
                    </div>
                    <p className="text-xs text-[rgba(102,0,51,0.4)] mt-1">
                      {parseFloat(minimumPrice) === 0
                        ? 'Fans can access for free or leave a tip'
                        : `Fans can pay ${parseFloat(minimumPrice).toFixed(2)} or more`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || !newVideoTitle.trim() || uploadingVideo}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#660033] rounded-lg hover:bg-[#8B0045] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingVideo ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload Video
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowUploadForm(false);
                setSelectedFile(null);
                setSelectedThumbnailFile(null);
                setThumbnailPreview(null);
                setNewVideoTitle('');
                setNewVideoDescription('');
                setNewVideoPrice('4.99');
                setIsPaywalled(false);
                setPricingType('fixed');
                setMinimumPrice('0');
              }}
              className="px-4 py-2 text-sm font-semibold text-[#660033] bg-white/60 rounded-lg hover:bg-white/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Hidden thumbnail input */}
      <input
        ref={thumbnailInputRef}
        type="file"
        accept="image/*"
        onChange={handleThumbnailSelect}
        className="hidden"
      />

      {/* Videos List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-[#660033]" />
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-8">
          <Video size={48} className="mx-auto mb-4 text-[rgba(102,0,51,0.2)]" />
          <p className="text-sm text-[rgba(102,0,51,0.5)]">
            No videos yet. Upload your first video!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video) => (
            <div
              key={video.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/60 hover:bg-white/80 transition-colors"
            >
              {/* Thumbnail */}
              <div
                className="relative w-20 h-12 rounded-lg bg-[rgba(102,0,51,0.1)] flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer group"
                onClick={() => {
                  setThumbnailVideoId(video.id);
                  thumbnailInputRef.current?.click();
                }}
              >
                {uploadingThumbnail === video.id ? (
                  <Loader2 size={16} className="animate-spin text-[#660033]" />
                ) : video.thumbnailPath ? (
                  <>
                    <img
                      src={`/api/videos/${video.id}/thumbnail/${encodeURIComponent(video.thumbnailPath)}`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImagePlus size={14} className="text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <Video size={16} className="text-[rgba(102,0,51,0.3)]" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImagePlus size={14} className="text-white" />
                    </div>
                  </>
                )}

                {/* Paywall indicator */}
                {video.isPaywalled && (
                  <div className="absolute top-1 right-1 p-0.5 rounded-full bg-[#660033]">
                    <Lock size={8} className="text-white" />
                  </div>
                )}
              </div>

              {/* Video Info */}
              <div className="flex-1 min-w-0">
                {editingVideo === video.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-2 py-1 rounded border border-[rgba(102,0,51,0.2)] focus:border-[#660033] outline-none text-sm font-semibold"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      {video.isPaywalled && (
                        <div className="relative flex-1">
                          <DollarSign size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[rgba(102,0,51,0.4)]" />
                          <input
                            type="number"
                            min="0.50"
                            step="0.01"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-full pl-6 pr-2 py-1 rounded border border-[rgba(102,0,51,0.2)] focus:border-[#660033] outline-none text-xs"
                          />
                        </div>
                      )}
                      <button
                        onClick={() => saveEdit(video.id)}
                        className="px-2 py-1 text-xs font-semibold text-white bg-[#660033] rounded hover:bg-[#8B0045]"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-2 py-1 text-xs font-semibold text-[#660033] bg-white/60 rounded hover:bg-white/80"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h5
                      className="font-semibold text-sm text-[#660033] truncate cursor-pointer hover:underline"
                      onClick={() => startEditing(video)}
                      title="Click to edit"
                    >
                      {video.title}
                    </h5>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-[rgba(102,0,51,0.5)]">
                      {video.isPaywalled && (
                        <span className="font-medium text-[#660033]">
                          {video.pricingType === 'pwyw'
                            ? (video.minimumPriceInCents || 0) === 0
                              ? 'Name Your Price'
                              : `From ${formatPrice(video.minimumPriceInCents || 0, video.currency || 'gbp')}`
                            : formatPrice(video.priceInCents || 0, video.currency || 'gbp')}
                        </span>
                      )}
                      {!video.isPaywalled && (
                        <span className="px-1.5 py-0.5 rounded bg-[rgba(40,167,69,0.1)] text-[#28a745] text-[10px] font-medium">
                          Free
                        </span>
                      )}
                      {video.isPaywalled && video.pricingType === 'pwyw' && (
                        <span className="px-1.5 py-0.5 rounded bg-[rgba(102,0,51,0.08)] text-[#660033] text-[10px] font-medium">
                          PWYW
                        </span>
                      )}
                      <span>{video.fileFormat.toUpperCase()}</span>
                      {video.durationSeconds && (
                        <span>{formatDuration(video.durationSeconds)}</span>
                      )}
                      <span>{video.viewCount || 0} views</span>
                      {video.isPaywalled && (
                        <span>{video.purchaseCount || 0} sales</span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              {editingVideo !== video.id && (
                <div className="flex items-center gap-2">
                  {/* Paywall Toggle */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onUpdateVideo(video.id, { isPaywalled: !video.isPaywalled })}
                          className={`p-2 rounded-lg transition-colors ${
                            video.isPaywalled
                              ? 'text-[#660033] bg-[rgba(102,0,51,0.1)] hover:bg-[rgba(102,0,51,0.2)]'
                              : 'text-[rgba(102,0,51,0.4)] bg-[rgba(102,0,51,0.05)] hover:bg-[rgba(102,0,51,0.1)]'
                          }`}
                        >
                          {video.isPaywalled ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {video.isPaywalled ? 'Remove paywall' : 'Add paywall'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Publish Toggle */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onUpdateVideo(video.id, { isPublished: !video.isPublished })}
                          className={`p-2 rounded-lg transition-colors ${
                            video.isPublished
                              ? 'text-[#28a745] bg-[rgba(40,167,69,0.1)] hover:bg-[rgba(40,167,69,0.2)]'
                              : 'text-[rgba(102,0,51,0.4)] bg-[rgba(102,0,51,0.05)] hover:bg-[rgba(102,0,51,0.1)]'
                          }`}
                        >
                          {video.isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {video.isPublished ? 'Click to unpublish' : 'Click to publish'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${video.title}"? This cannot be undone.`)) {
                        onDeleteVideo(video.id);
                      }
                    }}
                    className="p-2 rounded-lg text-[rgba(102,0,51,0.4)] hover:text-[#dc3545] hover:bg-[rgba(220,53,69,0.1)] transition-colors"
                    title="Delete video"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="p-3 rounded-lg bg-[rgba(102,0,51,0.05)] text-xs text-[rgba(102,0,51,0.6)]">
        <p className="font-semibold mb-1">How it works:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Upload MP4, WebM, or MOV files (max 500MB)</li>
          <li>A 10-second preview is shown to non-purchasers</li>
          <li>Toggle paywall to require purchase for full access</li>
          <li>Click on thumbnail to add custom preview image</li>
        </ul>
        <p className="font-semibold mt-3 mb-1">Paywall options:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li><strong>Fixed Price</strong> - Set a specific price for access</li>
          <li><strong>Pay What You Want</strong> - Let fans choose their price</li>
          <li><strong>Free</strong> - No paywall, anyone can watch</li>
        </ul>
      </div>
    </div>
  );
}
