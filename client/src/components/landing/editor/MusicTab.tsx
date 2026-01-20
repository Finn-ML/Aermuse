// Music Tab - Track Upload and Management
// Music selling feature with spinning disc player

import { useState, useRef } from 'react';
import { Plus, Music, Trash2, Upload, Loader2, Play, Pause, ImagePlus, DollarSign, Eye, EyeOff, X, Users, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatPrice } from '@/hooks/useAudioPlayer';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Track {
  id: string;
  title: string;
  priceInCents: number;
  fileFormat: string;
  coverArtPath?: string | null;
  previewFilePath?: string | null;
  isPublished: boolean;
  playCount: number;
  purchaseCount: number;
  // Split-related fields
  splitsConfigured?: boolean;
  splitsVerified?: boolean;
  ownerSplitPercentage?: number;
  autoPublishAt?: string | null;
}

interface MusicTabProps {
  tracks: Track[];
  isLoading: boolean;
  onUploadTrack: (file: File, title: string, priceInCents: number, coverFile?: File) => Promise<void>;
  onUpdateTrack: (id: string, updates: { title?: string; priceInCents?: number; isPublished?: boolean }) => Promise<void>;
  onDeleteTrack: (id: string) => Promise<void>;
  onUploadCover: (trackId: string, file: File) => Promise<void>;
  onOpenSplits?: (track: Track) => void;
}

export function MusicTab({
  tracks,
  isLoading,
  onUploadTrack,
  onUpdateTrack,
  onDeleteTrack,
  onUploadCover,
  onOpenSplits,
}: MusicTabProps) {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadingTrack, setUploadingTrack] = useState(false);
  const [uploadingCover, setUploadingCover] = useState<string | null>(null);
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackPrice, setNewTrackPrice] = useState('4.99');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [editingTrack, setEditingTrack] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newCoverInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverTrackId, setCoverTrackId] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Use filename (without extension) as default title
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      if (!newTrackTitle) {
        setNewTrackTitle(nameWithoutExt);
      }
    }
  };

  const handleNewCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedCoverFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearCoverSelection = () => {
    setSelectedCoverFile(null);
    setCoverPreview(null);
    if (newCoverInputRef.current) newCoverInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile || !newTrackTitle.trim()) return;

    const priceInCents = Math.round(parseFloat(newTrackPrice) * 100);
    if (isNaN(priceInCents) || priceInCents < 50) {
      alert('Minimum price is $0.50');
      return;
    }

    setUploadingTrack(true);
    try {
      await onUploadTrack(selectedFile, newTrackTitle.trim(), priceInCents, selectedCoverFile || undefined);
      setShowUploadForm(false);
      setSelectedFile(null);
      setSelectedCoverFile(null);
      setCoverPreview(null);
      setNewTrackTitle('');
      setNewTrackPrice('4.99');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (newCoverInputRef.current) newCoverInputRef.current.value = '';
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploadingTrack(false);
    }
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && coverTrackId) {
      setUploadingCover(coverTrackId);
      try {
        await onUploadCover(coverTrackId, file);
      } finally {
        setUploadingCover(null);
        setCoverTrackId(null);
        if (coverInputRef.current) coverInputRef.current.value = '';
      }
    }
  };

  const startEditing = (track: Track) => {
    setEditingTrack(track.id);
    setEditTitle(track.title);
    setEditPrice((track.priceInCents / 100).toFixed(2));
  };

  const saveEdit = async (trackId: string) => {
    const priceInCents = Math.round(parseFloat(editPrice) * 100);
    if (isNaN(priceInCents) || priceInCents < 50) {
      alert('Minimum price is $0.50');
      return;
    }

    await onUpdateTrack(trackId, {
      title: editTitle.trim(),
      priceInCents,
    });
    setEditingTrack(null);
  };

  const cancelEdit = () => {
    setEditingTrack(null);
    setEditTitle('');
    setEditPrice('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-[#660033]">Your Music</h4>
          <p className="text-xs text-[rgba(102,0,51,0.5)]">
            Upload tracks to sell on your artist page
          </p>
        </div>
        {!showUploadForm && (
          <button
            onClick={() => setShowUploadForm(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-[#660033] rounded-lg hover:bg-[#8B0045] transition-colors"
          >
            <Plus size={16} />
            Add Track
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
          <h4 className="text-sm font-bold text-[#660033] mb-4">Upload New Track</h4>

          {/* File Input */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[rgba(102,0,51,0.7)] mb-2">
              Audio File (MP3 or WAV)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 border-2 border-dashed border-[rgba(102,0,51,0.2)] rounded-lg hover:border-[#660033] transition-colors flex flex-col items-center gap-2"
            >
              {selectedFile ? (
                <>
                  <Music size={24} className="text-[#660033]" />
                  <span className="text-sm font-medium text-[#660033]">{selectedFile.name}</span>
                  <span className="text-xs text-[rgba(102,0,51,0.5)]">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </>
              ) : (
                <>
                  <Upload size={24} className="text-[rgba(102,0,51,0.4)]" />
                  <span className="text-sm text-[rgba(102,0,51,0.6)]">Click to select audio file</span>
                  <span className="text-xs text-[rgba(102,0,51,0.4)]">Max 50MB</span>
                </>
              )}
            </button>
          </div>

          {/* Title Input */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[rgba(102,0,51,0.7)] mb-2">
              Track Title
            </label>
            <input
              type="text"
              value={newTrackTitle}
              onChange={(e) => setNewTrackTitle(e.target.value)}
              placeholder="Enter track title"
              className="w-full px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.2)] focus:border-[#660033] outline-none text-sm"
            />
          </div>

          {/* Cover Art Input */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[rgba(102,0,51,0.7)] mb-2">
              Cover Art (Optional)
            </label>
            <input
              ref={newCoverInputRef}
              type="file"
              accept="image/*"
              onChange={handleNewCoverSelect}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => newCoverInputRef.current?.click()}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-[rgba(102,0,51,0.2)] hover:border-[#660033] transition-colors flex items-center justify-center overflow-hidden flex-shrink-0"
              >
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus size={24} className="text-[rgba(102,0,51,0.4)]" />
                )}
              </button>
              <div className="flex-1">
                {coverPreview ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#660033] font-medium truncate flex-1">
                      {selectedCoverFile?.name}
                    </span>
                    <button
                      type="button"
                      onClick={clearCoverSelection}
                      className="p-1 rounded hover:bg-[rgba(102,0,51,0.1)] text-[rgba(102,0,51,0.5)] hover:text-[#dc3545] transition-colors"
                      title="Remove cover"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-[rgba(102,0,51,0.5)]">
                    Click to add cover art that displays on the spinning disc player
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Price Input */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[rgba(102,0,51,0.7)] mb-2">
              Price (USD)
            </label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(102,0,51,0.4)]" />
              <input
                type="number"
                min="0.50"
                step="0.01"
                value={newTrackPrice}
                onChange={(e) => setNewTrackPrice(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-[rgba(102,0,51,0.2)] focus:border-[#660033] outline-none text-sm"
              />
            </div>
            <p className="text-xs text-[rgba(102,0,51,0.4)] mt-1">Minimum $0.50</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || !newTrackTitle.trim() || uploadingTrack}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#660033] rounded-lg hover:bg-[#8B0045] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingTrack ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload Track
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowUploadForm(false);
                setSelectedFile(null);
                setSelectedCoverFile(null);
                setCoverPreview(null);
                setNewTrackTitle('');
                setNewTrackPrice('4.99');
              }}
              className="px-4 py-2 text-sm font-semibold text-[#660033] bg-white/60 rounded-lg hover:bg-white/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Hidden cover input */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        onChange={handleCoverSelect}
        className="hidden"
      />

      {/* Tracks List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-[#660033]" />
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-8">
          <Music size={48} className="mx-auto mb-4 text-[rgba(102,0,51,0.2)]" />
          <p className="text-sm text-[rgba(102,0,51,0.5)]">
            No tracks yet. Upload your first track to start selling!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tracks.map((track) => (
            <div
              key={track.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/60 hover:bg-white/80 transition-colors"
            >
              {/* Cover Art */}
              <div
                className="relative w-14 h-14 rounded-lg bg-[rgba(102,0,51,0.1)] flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer group"
                onClick={() => {
                  setCoverTrackId(track.id);
                  coverInputRef.current?.click();
                }}
              >
                {uploadingCover === track.id ? (
                  <Loader2 size={20} className="animate-spin text-[#660033]" />
                ) : track.coverArtPath ? (
                  <>
                    <img
                      src={`/api/tracks/${track.id}/cover/${encodeURIComponent(track.coverArtPath)}`}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImagePlus size={16} className="text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <Music size={20} className="text-[rgba(102,0,51,0.3)]" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImagePlus size={16} className="text-white" />
                    </div>
                  </>
                )}
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                {editingTrack === track.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-2 py-1 rounded border border-[rgba(102,0,51,0.2)] focus:border-[#660033] outline-none text-sm font-semibold"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
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
                      <button
                        onClick={() => saveEdit(track.id)}
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
                      onClick={() => startEditing(track)}
                      title="Click to edit"
                    >
                      {track.title}
                    </h5>
                    <div className="flex items-center gap-3 text-xs text-[rgba(102,0,51,0.5)]">
                      <span className="font-medium text-[#660033]">
                        {formatPrice(track.priceInCents, 'usd')}
                      </span>
                      <span>{track.fileFormat.toUpperCase()}</span>
                      <span>{track.playCount} plays</span>
                      <span>{track.purchaseCount} sales</span>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              {editingTrack !== track.id && (
                <div className="flex items-center gap-2">
                  {/* Split Status Indicator */}
                  {track.splitsConfigured && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                            track.splitsVerified
                              ? 'bg-[rgba(40,167,69,0.1)] text-[#28a745]'
                              : 'bg-[rgba(255,193,7,0.15)] text-[#B8860B]'
                          }`}>
                            {track.splitsVerified ? (
                              <>
                                <CheckCircle2 size={12} />
                                <span>Verified</span>
                              </>
                            ) : (
                              <>
                                <Clock size={12} />
                                <span>Pending</span>
                              </>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {track.splitsVerified
                            ? 'All collaborators have verified their splits'
                            : 'Waiting for collaborators to verify their splits'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {/* Configure Splits Button */}
                  {onOpenSplits && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onOpenSplits(track)}
                            className="p-2 rounded-lg text-[rgba(102,0,51,0.6)] hover:text-[#660033] hover:bg-[rgba(102,0,51,0.1)] transition-colors"
                          >
                            <Users size={16} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {track.splitsConfigured ? 'Manage collaborator splits' : 'Add collaborators'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {/* Publish Toggle */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            // Block publishing if splits are configured but not verified
                            if (!track.isPublished && track.splitsConfigured && !track.splitsVerified) {
                              alert('Cannot publish until all collaborators verify their splits. Check back after the verification deadline.');
                              return;
                            }
                            onUpdateTrack(track.id, { isPublished: !track.isPublished });
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            track.isPublished
                              ? 'text-[#28a745] bg-[rgba(40,167,69,0.1)] hover:bg-[rgba(40,167,69,0.2)]'
                              : track.splitsConfigured && !track.splitsVerified
                                ? 'text-[rgba(102,0,51,0.25)] bg-[rgba(102,0,51,0.02)] cursor-not-allowed'
                                : 'text-[rgba(102,0,51,0.4)] bg-[rgba(102,0,51,0.05)] hover:bg-[rgba(102,0,51,0.1)]'
                          }`}
                          title={track.isPublished ? 'Click to unpublish' : 'Click to publish'}
                        >
                          {track.isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {track.isPublished
                          ? 'Click to unpublish'
                          : track.splitsConfigured && !track.splitsVerified
                            ? 'Waiting for collaborator verification'
                            : 'Click to publish'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${track.title}"? This cannot be undone.`)) {
                        onDeleteTrack(track.id);
                      }
                    }}
                    className="p-2 rounded-lg text-[rgba(102,0,51,0.4)] hover:text-[#dc3545] hover:bg-[rgba(220,53,69,0.1)] transition-colors"
                    title="Delete track"
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
          <li>Upload MP3 or WAV files (max 50MB)</li>
          <li>A 30-second preview is generated automatically</li>
          <li>Fans can preview and purchase tracks on your artist page</li>
          <li>Click on cover art to add album artwork</li>
          <li>Add collaborators with the <Users size={10} className="inline" /> icon to share royalty splits</li>
        </ul>
      </div>
    </div>
  );
}
