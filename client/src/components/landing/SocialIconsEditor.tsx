import { useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import {
  SiSpotify,
  SiApplemusic,
  SiSoundcloud,
  SiYoutube,
  SiInstagram,
  SiTiktok,
  SiX,
  SiFacebook,
  SiBandcamp,
} from "react-icons/si";
import { Globe, GripVertical, Trash2, Plus } from "lucide-react";

export interface SocialIcon {
  id: string;
  platform: string;
  url: string;
  order: number;
}

interface SocialPlatform {
  id: string;
  name: string;
  placeholder: string;
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { id: "spotify", name: "Spotify", placeholder: "https://open.spotify.com/artist/..." },
  { id: "apple-music", name: "Apple Music", placeholder: "https://music.apple.com/artist/..." },
  { id: "soundcloud", name: "SoundCloud", placeholder: "https://soundcloud.com/..." },
  { id: "youtube", name: "YouTube", placeholder: "https://youtube.com/@..." },
  { id: "instagram", name: "Instagram", placeholder: "https://instagram.com/..." },
  { id: "tiktok", name: "TikTok", placeholder: "https://tiktok.com/@..." },
  { id: "twitter", name: "X / Twitter", placeholder: "https://x.com/..." },
  { id: "facebook", name: "Facebook", placeholder: "https://facebook.com/..." },
  { id: "bandcamp", name: "Bandcamp", placeholder: "https://....bandcamp.com" },
  { id: "website", name: "Website", placeholder: "https://..." },
];

export function getPlatformIcon(platformId: string, className?: string) {
  const iconProps = { className: className || "w-5 h-5" };

  switch (platformId) {
    case "spotify":
      return <SiSpotify {...iconProps} />;
    case "apple-music":
      return <SiApplemusic {...iconProps} />;
    case "soundcloud":
      return <SiSoundcloud {...iconProps} />;
    case "youtube":
      return <SiYoutube {...iconProps} />;
    case "instagram":
      return <SiInstagram {...iconProps} />;
    case "tiktok":
      return <SiTiktok {...iconProps} />;
    case "twitter":
      return <SiX {...iconProps} />;
    case "facebook":
      return <SiFacebook {...iconProps} />;
    case "bandcamp":
      return <SiBandcamp {...iconProps} />;
    case "website":
    default:
      return <Globe {...iconProps} />;
  }
}

interface SocialIconsEditorProps {
  icons: SocialIcon[];
  showSocialBar: boolean;
  onIconsChange: (icons: SocialIcon[]) => void;
  onShowSocialBarChange: (show: boolean) => void;
}

export function SocialIconsEditor({
  icons,
  showSocialBar,
  onIconsChange,
  onShowSocialBarChange,
}: SocialIconsEditorProps) {
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAddIcon = () => {
    if (!selectedPlatform) {
      setError("Please select a platform");
      return;
    }

    if (!newUrl.trim()) {
      setError("Please enter a URL");
      return;
    }

    // Simple URL validation
    try {
      new URL(newUrl);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    // Check for duplicate platform
    if (icons.some((icon) => icon.platform === selectedPlatform)) {
      setError("This platform is already added");
      return;
    }

    const newIcon: SocialIcon = {
      id: `${selectedPlatform}-${Date.now()}`,
      platform: selectedPlatform,
      url: newUrl.trim(),
      order: icons.length,
    };

    onIconsChange([...icons, newIcon]);
    setSelectedPlatform("");
    setNewUrl("");
    setError(null);
  };

  const handleRemoveIcon = (id: string) => {
    const updated = icons
      .filter((icon) => icon.id !== id)
      .map((icon, index) => ({ ...icon, order: index }));
    onIconsChange(updated);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(icons);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    // Update order values
    const updated = items.map((item, index) => ({ ...item, order: index }));
    onIconsChange(updated);
  };

  // Get available platforms (not already added)
  const availablePlatforms = SOCIAL_PLATFORMS.filter(
    (platform) => !icons.some((icon) => icon.platform === platform.id)
  );

  const selectedPlatformData = SOCIAL_PLATFORMS.find((p) => p.id === selectedPlatform);

  return (
    <div className="space-y-6">
      {/* Show/Hide Toggle */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)]">
          Social Icons Bar
        </label>
        <button
          type="button"
          onClick={() => onShowSocialBarChange(!showSocialBar)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            showSocialBar ? "bg-[#660033]" : "bg-[rgba(102,0,51,0.2)]"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              showSocialBar ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Add New Icon */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)]">
          Add Social Link
        </label>

        <div className="flex gap-2">
          <select
            value={selectedPlatform}
            onChange={(e) => {
              setSelectedPlatform(e.target.value);
              setError(null);
            }}
            className="flex-1 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.2)] bg-white text-sm focus:outline-none focus:border-[#660033]"
          >
            <option value="">Select platform...</option>
            {availablePlatforms.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.name}
              </option>
            ))}
          </select>
        </div>

        {selectedPlatform && (
          <div className="flex gap-2">
            <input
              type="url"
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value);
                setError(null);
              }}
              placeholder={selectedPlatformData?.placeholder || "https://..."}
              className="flex-1 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.2)] bg-white text-sm focus:outline-none focus:border-[#660033]"
            />
            <button
              type="button"
              onClick={handleAddIcon}
              className="px-4 py-2 bg-[#660033] text-white rounded-lg hover:bg-[#8B0045] transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Current Icons List */}
      {icons.length > 0 && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)]">
            Your Social Links ({icons.length})
          </label>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="social-icons">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {icons
                    .sort((a, b) => a.order - b.order)
                    .map((icon, index) => {
                      const platform = SOCIAL_PLATFORMS.find(
                        (p) => p.id === icon.platform
                      );
                      return (
                        <Draggable key={icon.id} draggableId={icon.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                snapshot.isDragging
                                  ? "border-[#660033] bg-[rgba(102,0,51,0.05)] shadow-lg"
                                  : "border-[rgba(102,0,51,0.1)] bg-white"
                              }`}
                            >
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab text-[rgba(102,0,51,0.3)] hover:text-[rgba(102,0,51,0.6)]"
                              >
                                <GripVertical className="w-5 h-5" />
                              </div>

                              <div className="text-[#660033]">
                                {getPlatformIcon(icon.platform)}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#660033]">
                                  {platform?.name || icon.platform}
                                </p>
                                <p className="text-xs text-[rgba(102,0,51,0.5)] truncate">
                                  {icon.url}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveIcon(icon.id)}
                                className="p-1 text-[rgba(102,0,51,0.4)] hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

      {/* Empty State */}
      {icons.length === 0 && (
        <div className="text-center py-6 text-[rgba(102,0,51,0.4)]">
          <p className="text-sm">No social links added yet</p>
          <p className="text-xs mt-1">Add links to display icons on your page</p>
        </div>
      )}
    </div>
  );
}
