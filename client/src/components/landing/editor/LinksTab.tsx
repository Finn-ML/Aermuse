// Links Tab - Links, Headers, Video Embeds
// Story 9.10: Landing Page Editor Redesign
// Story 9.11: Editable Links

import { useState, useRef, useEffect } from 'react';
import { Plus, Type, Video, Trash2, GripVertical, ChevronDown, Crown } from 'lucide-react';
import { VideoEmbedEditor, VideoItemDisplay } from '@/components/landing/VideoEmbedEditor';

// URL validation helper
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// InlineEdit component for click-to-edit functionality
interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  validate?: (value: string) => boolean;
  className?: string;
}

function InlineEdit({ value, onSave, placeholder, validate, className }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editValue with value prop when not editing
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  const handleSave = () => {
    const trimmedValue = editValue.trim();

    // Empty value validation
    if (!trimmedValue) {
      setError(true);
      return;
    }

    // Custom validation (e.g., URL validation)
    if (validate && !validate(trimmedValue)) {
      setError(true);
      return;
    }

    // Only save if value changed
    if (trimmedValue !== value) {
      onSave(trimmedValue);
    }
    setIsEditing(false);
    setError(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setError(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (!isEditing) {
    return (
      <span
        onClick={() => setIsEditing(true)}
        className={`cursor-pointer hover:bg-white/50 rounded px-1 -mx-1 ${className || ''}`}
        title="Click to edit"
      >
        {value || placeholder}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={editValue}
      onChange={(e) => {
        setEditValue(e.target.value);
        setError(false);
      }}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className={`px-1 -mx-1 rounded border outline-none w-full ${
        error ? 'border-red-500 bg-red-50' : 'border-[#660033]/20 focus:border-[#660033] bg-white'
      } ${className || ''}`}
    />
  );
}

interface Link {
  id: string;
  title: string;
  url: string;
  enabled: boolean | null;
  order?: string | null;
  type?: string | null;
  videoUrl?: string | null;
}

interface LinksTabProps {
  links: Link[];
  isPro: boolean;
  onCreateLink: (data: { title: string; url: string; type?: string; videoUrl?: string }) => void;
  onUpdateLink: (data: { id: string; enabled?: boolean; title?: string; url?: string; order?: string }) => void;
  onDeleteLink: (id: string) => void;
  onNavigateToUpgrade: () => void;
}

export function LinksTab({
  links,
  isPro,
  onCreateLink,
  onUpdateLink,
  onDeleteLink,
  onNavigateToUpgrade,
}: LinksTabProps) {
  const [showVideoModal, setShowVideoModal] = useState(false);

  const sortedLinks = [...links].sort((a, b) => parseInt(a.order || '0') - parseInt(b.order || '0'));

  const handleMoveUp = (link: Link, index: number) => {
    if (index > 0) {
      const prevLink = sortedLinks[index - 1];
      onUpdateLink({ id: link.id, order: prevLink.order || String(index - 1) });
      onUpdateLink({ id: prevLink.id, order: link.order || String(index) });
    }
  };

  const handleMoveDown = (link: Link, index: number) => {
    if (index < sortedLinks.length - 1) {
      const nextLink = sortedLinks[index + 1];
      onUpdateLink({ id: link.id, order: nextLink.order || String(index + 1) });
      onUpdateLink({ id: nextLink.id, order: link.order || String(index) });
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onCreateLink({ title: 'New Link', url: 'https://example.com', type: 'link' })}
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-[#660033] rounded-lg hover:bg-[#8B0045] transition-colors"
        >
          <Plus size={16} />
          Add Link
        </button>
        <button
          onClick={() => onCreateLink({ title: 'Section Header', url: '', type: 'header' })}
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#660033] bg-white/60 rounded-lg hover:bg-white/80 transition-colors"
        >
          <Type size={16} />
          Add Header
        </button>
        {isPro ? (
          <button
            onClick={() => setShowVideoModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#660033] bg-white/60 rounded-lg hover:bg-white/80 transition-colors"
          >
            <Video size={16} />
            Add Video
          </button>
        ) : (
          <button
            onClick={onNavigateToUpgrade}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[rgba(102,0,51,0.4)] bg-white/40 rounded-lg hover:bg-white/60 transition-colors"
            title="Upgrade to Pro to embed videos"
          >
            <Video size={16} />
            Add Video
            <Crown size={12} className="text-amber-500" />
          </button>
        )}
      </div>

      {/* Video Modal */}
      {showVideoModal && (
        <div className="p-4 rounded-xl border-2 border-[rgba(102,0,51,0.2)] bg-white/80">
          <h4 className="text-sm font-bold text-[#660033] mb-4">Add Video Embed</h4>
          <VideoEmbedEditor
            onVideoAdd={(title, videoUrl) => {
              onCreateLink({
                title,
                url: videoUrl,
                type: 'video_embed',
                videoUrl,
              });
              setShowVideoModal(false);
            }}
            onClose={() => setShowVideoModal(false)}
          />
        </div>
      )}

      {/* Links List */}
      {links.length === 0 ? (
        <p className="text-sm text-[rgba(102,0,51,0.5)] text-center py-8">
          No links yet. Add your first link or section header!
        </p>
      ) : (
        <div className="space-y-2">
          {sortedLinks.map((link, index) => {
            const isHeader = link.type === 'header';
            const isVideo = link.type === 'video_embed';
            return (
              <div
                key={link.id}
                className={`flex items-center p-3 rounded-lg ${
                  isHeader ? 'border-l-4 border-[#660033] bg-[rgba(102,0,51,0.05)]' :
                  isVideo ? 'border-l-4 border-red-500 bg-[rgba(255,0,0,0.03)]' :
                  'bg-white/60'
                }`}
              >
                {/* Drag handle */}
                <div className="mr-2 text-[rgba(102,0,51,0.3)]">
                  <GripVertical size={14} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {isHeader ? (
                    <div className="flex items-center gap-2">
                      <Type size={12} className="text-[#660033] flex-shrink-0" />
                      <InlineEdit
                        value={link.title}
                        onSave={(title) => onUpdateLink({ id: link.id, title })}
                        placeholder="Section Header"
                        className="font-semibold text-xs text-[#660033]"
                      />
                    </div>
                  ) : isVideo ? (
                    <div className="flex items-center gap-2">
                      <VideoItemDisplay title="" videoUrl={link.videoUrl || ''} />
                      <InlineEdit
                        value={link.title}
                        onSave={(title) => onUpdateLink({ id: link.id, title })}
                        placeholder="Video Title"
                        className="text-sm font-medium text-[#660033]"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="font-semibold text-xs mb-0.5">
                        <InlineEdit
                          value={link.title}
                          onSave={(title) => onUpdateLink({ id: link.id, title })}
                          placeholder="Link Title"
                        />
                      </div>
                      <div className="text-xs text-[rgba(102,0,51,0.5)]">
                        <InlineEdit
                          value={link.url}
                          onSave={(url) => onUpdateLink({ id: link.id, url })}
                          validate={isValidUrl}
                          placeholder="https://..."
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-2">
                  {/* Move buttons */}
                  <div className="flex flex-col gap-0.5">
                    {index > 0 && (
                      <button
                        onClick={() => handleMoveUp(link, index)}
                        className="p-0.5 text-[rgba(102,0,51,0.4)] hover:text-[#660033]"
                        title="Move up"
                      >
                        <ChevronDown size={12} className="rotate-180" />
                      </button>
                    )}
                    {index < sortedLinks.length - 1 && (
                      <button
                        onClick={() => handleMoveDown(link, index)}
                        className="p-0.5 text-[rgba(102,0,51,0.4)] hover:text-[#660033]"
                        title="Move down"
                      >
                        <ChevronDown size={12} />
                      </button>
                    )}
                  </div>

                  {/* Toggle (not for headers) */}
                  {!isHeader && (
                    <button
                      onClick={() => onUpdateLink({ id: link.id, enabled: !link.enabled })}
                      className={`w-10 h-5 rounded-full transition-all ${
                        link.enabled ? 'bg-[#660033]' : 'bg-[rgba(102,0,51,0.2)]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        link.enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => onDeleteLink(link.id)}
                    className="p-1 text-[rgba(102,0,51,0.4)] hover:text-[#dc3545]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
