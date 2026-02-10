// Settings Tab - Layout, Page Settings, Visibility
// Story 9.10: Landing Page Editor Redesign

import { useState, useRef, useCallback } from 'react';
import { ExternalLink, ShoppingBag } from 'lucide-react';
import { LayoutSelector, type Layout, type LinkWidth } from '@/components/landing/LayoutSelector';
import { ShareSection } from './ShareSection';

interface SettingsTabProps {
  landingPageData: {
    artistName?: string | null;
    tagline?: string | null;
    bio?: string | null;
    slug?: string | null;
    isPublished?: boolean | null;
    showMerch?: boolean | null;
    layout?: string | null;
    linkWidth?: string | null;
  };
  onUpdate: (updates: Record<string, unknown>) => void;
}

export function SettingsTab({ landingPageData, onUpdate }: SettingsTabProps) {
  // Local state for text inputs - initialized from props once
  const [artistName, setArtistName] = useState(landingPageData.artistName || '');
  const [tagline, setTagline] = useState(landingPageData.tagline || '');
  const [bio, setBio] = useState(landingPageData.bio || '');

  // Track debounce timer
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Handle text input changes with debouncing
  const handleTextChange = useCallback((field: string, value: string) => {
    // Update local state immediately for smooth typing
    if (field === 'artistName') setArtistName(value);
    if (field === 'tagline') setTagline(value);
    if (field === 'bio') setBio(value);

    // Debounce API call
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      onUpdate({ [field]: value });
    }, 500);
  }, [onUpdate]);

  return (
    <div className="space-y-4">
      {/* Page Info */}
      <div className="p-4 rounded-xl bg-white/60">
        <h4 className="text-sm font-bold text-[#660033] mb-4">Page Info</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-1">
              Artist Name
            </label>
            <input
              type="text"
              value={artistName}
              onChange={(e) => handleTextChange('artistName', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-1">
              Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => handleTextChange('tagline', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none text-sm"
              placeholder="Your tagline..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => handleTextChange('bio', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none text-sm min-h-[80px] resize-none"
              placeholder="Tell your story..."
            />
          </div>
        </div>
      </div>

      {/* Layout Options */}
      <div className="p-4 rounded-xl bg-white/60">
        <h4 className="text-sm font-bold text-[#660033] mb-4">Layout Options</h4>
        <LayoutSelector
          layout={(landingPageData.layout as Layout) || 'centered'}
          linkWidth={(landingPageData.linkWidth as LinkWidth) || 'full'}
          onLayoutChange={(layout) => onUpdate({ layout })}
          onLinkWidthChange={(linkWidth) => onUpdate({ linkWidth })}
        />
      </div>

      {/* Merch Store Visibility */}
      <div className="p-4 rounded-xl bg-white/60">
        <h4 className="text-sm font-bold text-[#660033] mb-4">Merch Store</h4>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={14} className="text-[rgba(102,0,51,0.5)]" />
            <label className="text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)]">
              Show on page
            </label>
          </div>
          <button
            type="button"
            onClick={() => onUpdate({ showMerch: !(landingPageData.showMerch !== false) })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              landingPageData.showMerch !== false ? 'bg-[#660033]' : 'bg-[rgba(102,0,51,0.2)]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                landingPageData.showMerch !== false ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-[rgba(102,0,51,0.5)] mt-2">
          {landingPageData.showMerch !== false
            ? 'Merch section is visible to visitors'
            : 'Merch section is hidden from visitors'}
        </p>
      </div>

      {/* Publish Status */}
      <div className="p-4 rounded-xl bg-white/60">
        <h4 className="text-sm font-bold text-[#660033] mb-4">Page Status</h4>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#660033]">
              {landingPageData.isPublished ? 'Published' : 'Draft'}
            </p>
            <p className="text-xs text-[rgba(102,0,51,0.5)]">
              {landingPageData.isPublished
                ? 'Your page is live and visible to visitors'
                : 'Your page is not visible to visitors'}
            </p>
          </div>
          <button
            onClick={() => onUpdate({ isPublished: !landingPageData.isPublished })}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              landingPageData.isPublished
                ? 'bg-[rgba(220,53,69,0.1)] text-[#dc3545] hover:bg-[rgba(220,53,69,0.2)]'
                : 'bg-[#660033] text-white hover:bg-[#8B0045]'
            }`}
          >
            {landingPageData.isPublished ? 'Unpublish' : 'Publish'}
          </button>
        </div>
        {landingPageData.isPublished && landingPageData.slug && (
          <a
            href={`/artist/${landingPageData.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 text-sm text-[#660033] hover:underline"
          >
            <ExternalLink size={14} />
            View live page
          </a>
        )}
      </div>

      {/* Share Section */}
      {landingPageData.slug && (
        <ShareSection slug={landingPageData.slug} />
      )}
    </div>
  );
}
