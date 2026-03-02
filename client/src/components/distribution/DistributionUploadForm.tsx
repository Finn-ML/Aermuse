import { useState, useRef } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Music, Loader2, X } from 'lucide-react';

interface DistributionUploadFormProps {
  onBack: () => void;
  onComplete: () => void;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export function DistributionUploadForm({ onBack, onComplete }: DistributionUploadFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const ext = selected.name.split('.').pop()?.toLowerCase();
    if (!['mp3', 'wav'].includes(ext || '')) {
      toast({ title: 'Invalid file type', description: 'Only MP3 and WAV files are accepted.', variant: 'destructive' });
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Maximum file size is 200MB.', variant: 'destructive' });
      return;
    }

    setFile(selected);
    if (!title) {
      // Auto-fill title from filename
      const nameWithoutExt = selected.name.replace(/\.[^.]+$/, '');
      setTitle(nameWithoutExt);
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) return;

    setUploading(true);
    setProgress(0);
    setProgressLabel('Initializing upload...');

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      // Step 1: Initialize upload
      const initRes = await apiRequest('POST', '/api/distribution/tracks/init-upload', {
        totalChunks,
        fileName: file.name,
        fileFormat: ext,
        title: title.trim(),
        artistName: artistName.trim() || undefined,
      });
      const { uploadId } = await initRes.json();

      // Step 2: Upload chunks
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = new Uint8Array(arrayBuffer);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = fileBuffer.slice(start, end);

        setProgressLabel(`Uploading chunk ${i + 1}/${totalChunks}...`);
        setProgress(Math.round(((i + 1) / (totalChunks + 1)) * 100));

        const chunkRes = await fetch('/api/distribution/tracks/chunk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-Upload-Id': uploadId,
            'X-Chunk-Index': String(i),
          },
          body: chunk,
          credentials: 'include',
        });

        if (!chunkRes.ok) {
          const err = await chunkRes.json();
          throw new Error(err.error || 'Failed to upload chunk');
        }
      }

      // Step 3: Complete upload
      setProgressLabel('Processing audio...');
      setProgress(95);

      const completeRes = await apiRequest('POST', '/api/distribution/tracks/complete-upload', { uploadId });
      if (!completeRes.ok) {
        const err = await completeRes.json();
        throw new Error(err.error || 'Failed to complete upload');
      }

      setProgress(100);
      setProgressLabel('Upload complete!');

      queryClient.invalidateQueries({ queryKey: ['/api/distribution/tracks'] });
      toast({ title: 'Track uploaded successfully' });

      setTimeout(() => onComplete(), 500);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      setUploading(false);
      setProgress(0);
      setProgressLabel('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          disabled={uploading}
          className="p-2 rounded-lg hover:bg-[rgba(102,0,51,0.06)] transition-colors disabled:opacity-50"
        >
          <ArrowLeft size={20} className="text-[#660033]" />
        </button>
        <h2 className="text-lg font-bold text-[#660033]">Upload Track for Distribution</h2>
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        {/* Audio File Picker */}
        <div className="bg-white rounded-2xl p-6 border border-[rgba(102,0,51,0.08)]">
          <h3 className="text-sm font-semibold text-[#660033] mb-4 uppercase tracking-wider">Audio File</h3>

          {file ? (
            <div className="flex items-center gap-3 p-3 bg-[rgba(102,0,51,0.04)] rounded-xl">
              <Music size={20} className="text-[#660033]" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#660033] truncate">{file.name}</p>
                <p className="text-xs text-[rgba(102,0,51,0.5)]">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
              </div>
              {!uploading && (
                <button
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="p-1 hover:bg-[rgba(102,0,51,0.1)] rounded"
                >
                  <X size={16} className="text-[rgba(102,0,51,0.5)]" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-8 border-2 border-dashed border-[rgba(102,0,51,0.2)] rounded-xl hover:border-[#660033] hover:bg-[rgba(102,0,51,0.02)] transition-all text-center"
            >
              <Upload size={32} className="mx-auto mb-2 text-[rgba(102,0,51,0.4)]" />
              <p className="text-sm font-medium text-[#660033]">Click to select audio file</p>
              <p className="text-xs text-[rgba(102,0,51,0.5)] mt-1">MP3 or WAV, up to 200MB</p>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,audio/mpeg,audio/wav"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Track Details */}
        <div className="bg-white rounded-2xl p-6 border border-[rgba(102,0,51,0.08)]">
          <h3 className="text-sm font-semibold text-[#660033] mb-4 uppercase tracking-wider">Track Details</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#660033] mb-1 block">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Track title"
                disabled={uploading}
                className="w-full px-3 py-2 border border-[rgba(102,0,51,0.2)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#660033]/20 focus:border-[#660033] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#660033] mb-1 block">Artist Name</label>
              <input
                type="text"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="Artist name (optional)"
                disabled={uploading}
                className="w-full px-3 py-2 border border-[rgba(102,0,51,0.2)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#660033]/20 focus:border-[#660033] disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {uploading && (
          <div className="bg-white rounded-2xl p-6 border border-[rgba(102,0,51,0.08)]">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 size={16} className="animate-spin text-[#660033]" />
              <span className="text-sm text-[#660033]">{progressLabel}</span>
            </div>
            <div className="w-full bg-[rgba(102,0,51,0.1)] rounded-full h-2">
              <div
                className="bg-[#660033] h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-[rgba(102,0,51,0.5)] mt-2 text-right">{progress}%</p>
          </div>
        )}

        {/* Upload Button */}
        {!uploading && (
          <button
            onClick={handleUpload}
            disabled={!file || !title.trim()}
            className="w-full py-3 bg-[#660033] text-[#F7E6CA] rounded-xl hover:bg-[#4a0024] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Upload size={18} />
            Upload Track
          </button>
        )}
      </div>
    </div>
  );
}
