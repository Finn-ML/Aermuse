// Settings Tab - Layout, Page Settings, Visibility
// Story 9.10: Landing Page Editor Redesign

import { ExternalLink } from 'lucide-react';
import { LayoutSelector, type Layout, type AvatarPosition, type LinkWidth } from '@/components/landing/LayoutSelector';

interface SettingsTabProps {
  landingPageData: {
    artistName?: string | null;
    tagline?: string | null;
    bio?: string | null;
    slug?: string | null;
    isPublished?: boolean | null;
    layout?: string | null;
    avatarPosition?: string | null;
    linkWidth?: string | null;
  };
  onUpdate: (updates: Record<string, unknown>) => void;
}

export function SettingsTab({ landingPageData, onUpdate }: SettingsTabProps) {
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
              value={landingPageData.artistName || ''}
              onChange={(e) => onUpdate({ artistName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-1">
              Tagline
            </label>
            <input
              type="text"
              value={landingPageData.tagline || ''}
              onChange={(e) => onUpdate({ tagline: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none text-sm"
              placeholder="Your tagline..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-1">
              Bio
            </label>
            <textarea
              value={landingPageData.bio || ''}
              onChange={(e) => onUpdate({ bio: e.target.value })}
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
          avatarPosition={(landingPageData.avatarPosition as AvatarPosition) || 'top'}
          linkWidth={(landingPageData.linkWidth as LinkWidth) || 'full'}
          onLayoutChange={(layout) => onUpdate({ layout })}
          onAvatarPositionChange={(avatarPosition) => onUpdate({ avatarPosition })}
          onLinkWidthChange={(linkWidth) => onUpdate({ linkWidth })}
        />
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
    </div>
  );
}
