// Editor Preview - Live preview with mobile/desktop toggle
// Story 9.10: Landing Page Editor Redesign

import { useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { parseVideoUrl } from '@/lib/video-parser';
import { getPlatformIcon, type SocialIcon } from '@/components/landing/SocialIconsEditor';
import type { ButtonStyle, BackgroundType, BackgroundOverlay } from '@shared/themes';

interface Link {
  id: string;
  title: string;
  url: string;
  enabled: boolean | null;
  order?: string | null;
  type?: string | null;
  videoUrl?: string | null;
}

interface EditorPreviewProps {
  page: {
    artistName?: string | null;
    tagline?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    textColor?: string | null;
    headingFont?: string | null;
    bodyFont?: string | null;
    buttonStyle?: string | null;
    backgroundType?: string | null;
    backgroundValue?: string | null;
    backgroundOverlay?: string | null;
    socialIcons?: SocialIcon[] | null;
    showSocialBar?: boolean | null;
    layout?: string | null;
    avatarPosition?: string | null;
    linkWidth?: string | null;
  };
  links: Link[];
}

// Button style CSS classes
function getButtonClasses(buttonStyle: ButtonStyle | string | null | undefined): string {
  const style = buttonStyle || 'rounded';
  const baseClasses = 'block w-full py-2 px-4 text-center font-semibold text-sm transition-all duration-200 hover:scale-105';

  switch (style) {
    case 'pill':
      return `${baseClasses} rounded-full`;
    case 'square':
      return `${baseClasses} rounded-none`;
    case 'outline':
      return `${baseClasses} rounded-lg bg-transparent border-2`;
    case 'filled':
      return `${baseClasses} rounded-lg`;
    case 'shadow':
      return `${baseClasses} rounded-lg shadow-md`;
    case 'rounded':
    default:
      return `${baseClasses} rounded-lg`;
  }
}

// Generate background style
function getBackgroundStyle(
  backgroundType: BackgroundType | string | null | undefined,
  backgroundValue: string | null | undefined,
  fallbackColor: string
): React.CSSProperties {
  const type = backgroundType || 'solid';

  switch (type) {
    case 'gradient':
      return backgroundValue
        ? { background: backgroundValue }
        : { backgroundColor: fallbackColor };
    case 'image':
      return backgroundValue
        ? {
            backgroundImage: `url(${backgroundValue})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }
        : { backgroundColor: fallbackColor };
    case 'solid':
    default:
      return { backgroundColor: backgroundValue || fallbackColor };
  }
}

// Overlay CSS
function getOverlayClass(overlay: BackgroundOverlay | string | null | undefined): string {
  switch (overlay) {
    case 'dark':
      return 'before:absolute before:inset-0 before:bg-black/50 before:pointer-events-none';
    case 'light':
      return 'before:absolute before:inset-0 before:bg-white/30 before:pointer-events-none';
    default:
      return '';
  }
}

export function EditorPreview({ page, links }: EditorPreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Theme values with fallbacks
  const primaryColor = page.primaryColor || '#660033';
  const secondaryColor = page.secondaryColor || '#F7E6CA';
  const accentColor = page.accentColor || '#FFD700';
  const textColor = page.textColor || '#FFFFFF';
  const headingFont = page.headingFont || 'Inter';
  const bodyFont = page.bodyFont || 'Inter';
  const buttonStyle = (page.buttonStyle as ButtonStyle) || 'rounded';
  const backgroundType = (page.backgroundType as BackgroundType) || 'solid';
  const backgroundValue = page.backgroundValue;
  const backgroundOverlay = (page.backgroundOverlay as BackgroundOverlay) || 'none';
  const socialIcons = page.socialIcons || [];
  const showSocialBar = page.showSocialBar !== false;
  const layout = (page.layout as 'centered' | 'left' | 'right') || 'centered';
  const avatarPosition = (page.avatarPosition as 'top' | 'left' | 'hidden') || 'top';
  const linkWidth = (page.linkWidth as 'full' | 'medium' | 'compact') || 'full';

  // Button colors
  const isOutlineButton = buttonStyle === 'outline';
  const buttonBgColor = isOutlineButton ? 'transparent' : secondaryColor;
  const buttonTextColor = isOutlineButton ? secondaryColor : primaryColor;
  const buttonBorderColor = isOutlineButton ? secondaryColor : 'transparent';

  const backgroundStyle = getBackgroundStyle(backgroundType, backgroundValue, primaryColor);
  const overlayClass = getOverlayClass(backgroundOverlay);

  // Filter and sort links
  const visibleLinks = links
    .filter(link => {
      if (link.type === 'header') {
        return link.title && link.title.trim() !== '';
      }
      return link.enabled;
    })
    .sort((a, b) => parseInt(a.order || '0') - parseInt(b.order || '0'));

  return (
    <div className="h-full flex flex-col bg-[rgba(102,0,51,0.02)]">
      {/* Preview Controls */}
      <div className="flex items-center justify-between p-3 border-b border-[rgba(102,0,51,0.1)] bg-white/80">
        <span className="text-xs font-medium text-[rgba(102,0,51,0.6)]">Preview</span>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('desktop')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'desktop'
                ? 'bg-[#660033] text-white'
                : 'text-[rgba(102,0,51,0.4)] hover:bg-[rgba(102,0,51,0.1)]'
            }`}
            title="Desktop view"
          >
            <Monitor size={14} />
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'mobile'
                ? 'bg-[#660033] text-white'
                : 'text-[rgba(102,0,51,0.4)] hover:bg-[rgba(102,0,51,0.1)]'
            }`}
            title="Mobile view"
          >
            <Smartphone size={14} />
          </button>
        </div>
      </div>

      {/* Preview Frame */}
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <div
          className={`bg-white rounded-lg shadow-lg overflow-hidden transition-all ${
            viewMode === 'mobile' ? 'w-[320px]' : 'w-full max-w-[600px]'
          }`}
          style={{ minHeight: '400px' }}
        >
          {/* Preview Content */}
          <div
            className={`min-h-full relative ${overlayClass}`}
            style={{
              ...backgroundStyle,
              fontFamily: `"${bodyFont}", system-ui, sans-serif`,
            }}
          >
            {/* Hero Section */}
            <div className="p-6 relative z-10">
              <div
                className={`${
                  layout === 'centered' ? 'text-center' : layout === 'right' ? 'text-right' : 'text-left'
                } ${
                  avatarPosition === 'left' ? 'flex items-center gap-4' : ''
                }`}
              >
                {/* Avatar */}
                {avatarPosition !== 'hidden' && (
                  page.avatarUrl ? (
                    <img
                      src={page.avatarUrl}
                      alt={page.artistName || 'Artist'}
                      className={`w-16 h-16 rounded-full border-2 object-cover ${
                        avatarPosition === 'top' ? 'mx-auto mb-3' : ''
                      } ${layout === 'left' && avatarPosition === 'top' ? 'mx-0' : ''} ${layout === 'right' && avatarPosition === 'top' ? 'ml-auto mr-0' : ''}`}
                      style={{ borderColor: accentColor }}
                      onError={(e) => {
                        console.error('Avatar failed to load:', page.avatarUrl);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-xl font-bold ${
                        avatarPosition === 'top' ? 'mx-auto mb-3' : ''
                      } ${layout === 'left' && avatarPosition === 'top' ? 'mx-0' : ''} ${layout === 'right' && avatarPosition === 'top' ? 'ml-auto mr-0' : ''}`}
                      style={{
                        borderColor: accentColor,
                        backgroundColor: `${accentColor}30`,
                        color: textColor
                      }}
                    >
                      {(page.artistName || 'A').charAt(0).toUpperCase()}
                    </div>
                  )
                )}

                <div className={avatarPosition === 'left' ? 'flex-1' : ''}>
                  {/* Artist Name */}
                  <h1
                    className="text-xl font-bold mb-1"
                    style={{
                      color: textColor,
                      fontFamily: `"${headingFont}", system-ui, sans-serif`,
                    }}
                  >
                    {page.artistName || 'Your Name'}
                  </h1>

                  {/* Tagline */}
                  {page.tagline && (
                    <p
                      className="text-sm mb-2"
                      style={{ color: `${textColor}99` }}
                    >
                      {page.tagline}
                    </p>
                  )}

                  {/* Bio */}
                  {page.bio && (
                    <p
                      className="text-xs mb-4"
                      style={{ color: `${textColor}cc` }}
                    >
                      {page.bio}
                    </p>
                  )}

                  {/* Social Icons */}
                  {showSocialBar && socialIcons.length > 0 && (
                    <div className={`flex gap-3 ${layout === 'centered' ? 'justify-center' : layout === 'right' ? 'justify-end' : ''}`}>
                      {socialIcons
                        .sort((a, b) => a.order - b.order)
                        .map((icon) => (
                          <div
                            key={icon.id}
                            className="p-2 rounded-full"
                            style={{
                              color: secondaryColor,
                              backgroundColor: `${secondaryColor}20`,
                            }}
                          >
                            {getPlatformIcon(icon.platform, "w-4 h-4")}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Links Section */}
            {visibleLinks.length > 0 && (
              <div className="px-6 pb-6 relative z-10">
                <div
                  className={`mx-auto space-y-2 ${layout === 'right' ? 'ml-auto mr-0' : ''}`}
                  style={{
                    maxWidth: linkWidth === 'full' ? '100%' :
                      linkWidth === 'medium' ? '80%' :
                      '60%',
                  }}
                >
                  {visibleLinks.map((link) => {
                    // Headers
                    if (link.type === 'header') {
                      return (
                        <h3
                          key={link.id}
                          className="text-xs font-semibold mt-3 mb-1"
                          style={{
                            color: textColor,
                            fontFamily: `"${headingFont}", system-ui, sans-serif`,
                          }}
                        >
                          {link.title}
                        </h3>
                      );
                    }

                    // Video embeds
                    if (link.type === 'video_embed' && link.videoUrl) {
                      const embed = parseVideoUrl(link.videoUrl);
                      if (!embed) return null;

                      return (
                        <div
                          key={link.id}
                          className="rounded overflow-hidden"
                        >
                          {link.title && (
                            <p
                              className="text-xs font-medium mb-1"
                              style={{ color: textColor }}
                            >
                              {link.title}
                            </p>
                          )}
                          <div
                            className="relative w-full overflow-hidden rounded"
                            style={{
                              aspectRatio: embed.aspectRatio === '16:9' ? '16 / 9' : '1 / 1',
                              maxWidth: embed.platform === 'spotify' ? '200px' : '100%',
                              backgroundColor: '#000',
                            }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs">
                              {embed.platform} embed
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Regular links
                    return (
                      <div
                        key={link.id}
                        className={getButtonClasses(buttonStyle)}
                        style={{
                          backgroundColor: buttonBgColor,
                          color: buttonTextColor,
                          borderColor: buttonBorderColor,
                        }}
                      >
                        {link.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
