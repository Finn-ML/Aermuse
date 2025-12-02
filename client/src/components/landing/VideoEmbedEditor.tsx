import { useState } from "react";
import { Video, AlertCircle, Check, ExternalLink } from "lucide-react";
import { parseVideoUrl, type VideoEmbed } from "@/lib/video-parser";

interface VideoEmbedEditorProps {
  onVideoAdd: (title: string, videoUrl: string) => void;
  onClose: () => void;
}

export function VideoEmbedEditor({ onVideoAdd, onClose }: VideoEmbedEditorProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<VideoEmbed | null>(null);

  const handleUrlChange = (url: string) => {
    setVideoUrl(url);
    setError(null);

    if (url.trim()) {
      const parsed = parseVideoUrl(url);
      if (parsed) {
        setPreview(parsed);
        // Auto-generate title based on platform
        if (!title) {
          const platformNames: Record<string, string> = {
            youtube: "YouTube Video",
            vimeo: "Vimeo Video",
            spotify: "Spotify",
          };
          setTitle(platformNames[parsed.platform] || "Video");
        }
      } else {
        setPreview(null);
      }
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = () => {
    if (!videoUrl.trim()) {
      setError("Please enter a video URL");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    const parsed = parseVideoUrl(videoUrl);
    if (!parsed) {
      setError("Unsupported video URL. Please use YouTube, Vimeo, or Spotify links.");
      return;
    }

    onVideoAdd(title.trim(), videoUrl.trim());
    setVideoUrl("");
    setTitle("");
    setPreview(null);
    setError(null);
  };

  const getPlatformLabel = (platform: string): string => {
    switch (platform) {
      case "youtube":
        return "YouTube";
      case "vimeo":
        return "Vimeo";
      case "spotify":
        return "Spotify";
      default:
        return platform;
    }
  };

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2">
          Video URL
        </label>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://youtube.com/watch?v=... or spotify.com/track/..."
          className="w-full px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.2)] bg-white text-sm focus:outline-none focus:border-[#660033]"
        />
        <p className="mt-1 text-xs text-[rgba(102,0,51,0.4)]">
          Supported: YouTube, Vimeo, Spotify (tracks, albums, playlists)
        </p>
      </div>

      {/* Title Input */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My Latest Video"
          className="w-full px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.2)] bg-white text-sm focus:outline-none focus:border-[#660033]"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)]">
            Preview
          </label>
          <div className="rounded-lg border border-[rgba(102,0,51,0.2)] overflow-hidden bg-[rgba(102,0,51,0.02)]">
            {/* Platform Badge */}
            <div className="px-3 py-2 bg-[rgba(102,0,51,0.05)] border-b border-[rgba(102,0,51,0.1)] flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-[#660033]">
                {getPlatformLabel(preview.platform)} detected
              </span>
            </div>
            {/* Embed Preview */}
            <div
              className="relative w-full"
              style={{
                aspectRatio: preview.aspectRatio === "16:9" ? "16 / 9" : "1 / 1",
                maxWidth: preview.platform === "spotify" ? "300px" : "100%",
              }}
            >
              <iframe
                src={preview.embedUrl}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="Video preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-[rgba(102,0,51,0.2)] text-[#660033] rounded-lg hover:bg-[rgba(102,0,51,0.05)] transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!preview}
          className="flex-1 px-4 py-2 bg-[#660033] text-white rounded-lg hover:bg-[#8B0045] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Video className="w-4 h-4" />
          Add Video
        </button>
      </div>
    </div>
  );
}

interface VideoItemDisplayProps {
  title: string;
  videoUrl: string;
}

export function VideoItemDisplay({ title, videoUrl }: VideoItemDisplayProps) {
  const embed = parseVideoUrl(videoUrl);

  if (!embed) {
    return (
      <div className="flex items-center gap-2 text-[rgba(102,0,51,0.4)]">
        <Video className="w-4 h-4" />
        <span className="text-sm">Invalid video URL</span>
      </div>
    );
  }

  const getPlatformColor = (platform: string): string => {
    switch (platform) {
      case "youtube":
        return "#FF0000";
      case "vimeo":
        return "#1AB7EA";
      case "spotify":
        return "#1DB954";
      default:
        return "#660033";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Video className="w-4 h-4" style={{ color: getPlatformColor(embed.platform) }} />
      <span className="text-sm font-medium text-[#660033]">{title}</span>
      <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(102,0,51,0.1)] text-[rgba(102,0,51,0.6)]">
        {embed.platform}
      </span>
    </div>
  );
}
