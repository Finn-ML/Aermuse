import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Loader2 } from 'lucide-react';
import { SendProposalButton } from '@/components/landing/SendProposalButton';
import { getPlatformIcon, type SocialIcon } from '@/components/landing/SocialIconsEditor';
import { parseVideoUrl } from '@/lib/video-parser';
import type { LandingPage, LandingPageLink } from '@shared/schema';
import type { ButtonStyle, BackgroundType, BackgroundOverlay } from '@shared/themes';

interface ArtistPageData extends LandingPage {
  links: LandingPageLink[];
}

// Button style CSS classes
function getButtonClasses(buttonStyle: ButtonStyle | string | null | undefined): string {
  const style = buttonStyle || 'rounded';
  const baseClasses = 'block w-full py-4 px-6 text-center font-semibold transition-all hover:scale-105';

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
      return `${baseClasses} rounded-lg shadow-[0_4px_14px_rgba(0,0,0,0.25)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)]`;
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

export default function ArtistPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading, error } = useQuery<ArtistPageData>({
    queryKey: ['/api/artist', slug],
    queryFn: async () => {
      const res = await fetch(`/api/artist/${slug}`);
      if (!res.ok) {
        throw new Error('Artist page not found');
      }
      return res.json();
    },
    enabled: !!slug,
  });

  // Dynamic Google Fonts loading
  useEffect(() => {
    if (!page) return;

    const headingFont = page.headingFont || 'Inter';
    const bodyFont = page.bodyFont || 'Inter';
    const fonts = [headingFont, bodyFont].filter(Boolean);
    const uniqueFonts = Array.from(new Set(fonts));

    if (uniqueFonts.length === 0) return;

    const fontQuery = uniqueFonts
      .map(f => `family=${f.replace(/ /g, '+')}:wght@400;600;700`)
      .join('&');

    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, [page?.headingFont, page?.bodyFont]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7E6CA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#660033]" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7E6CA]">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#660033] mb-4">Page Not Found</h1>
          <p className="text-[#660033]/70">This artist page doesn't exist or isn't published yet.</p>
        </div>
      </div>
    );
  }

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
  const socialLinks = page.socialLinks as Record<string, string> | null;
  const socialIcons = (page.socialIcons as SocialIcon[]) || [];
  const showSocialBar = page.showSocialBar !== false;
  // Layout options (Story 9.8)
  const layout = (page.layout as 'centered' | 'left' | 'grid') || 'centered';
  const avatarPosition = (page.avatarPosition as 'top' | 'left' | 'hidden') || 'top';
  const linkWidth = (page.linkWidth as 'full' | 'medium' | 'compact') || 'full';

  // Determine button colors based on style
  const isOutlineButton = buttonStyle === 'outline';
  const buttonBgColor = isOutlineButton ? 'transparent' : secondaryColor;
  const buttonTextColor = isOutlineButton ? secondaryColor : primaryColor;
  const buttonBorderColor = isOutlineButton ? secondaryColor : 'transparent';

  const backgroundStyle = getBackgroundStyle(backgroundType, backgroundValue, primaryColor);
  const overlayClass = getOverlayClass(backgroundOverlay);

  return (
    <div
      className={`min-h-screen relative ${overlayClass}`}
      style={{
        ...backgroundStyle,
        fontFamily: `"${bodyFont}", system-ui, sans-serif`,
      }}
    >
      {/* Hero Section (Story 9.8: Layout options) */}
      <section className="relative py-20 px-4">
        {/* Cover Image (if no custom background set) */}
        {page.coverImageUrl && backgroundType === 'solid' && !backgroundValue && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${page.coverImageUrl})` }}
          />
        )}

        <div
          className={`max-w-4xl mx-auto relative z-10 ${
            layout === 'centered' ? 'text-center' : 'text-left'
          } ${
            avatarPosition === 'left' ? 'flex flex-col sm:flex-row items-center sm:items-start gap-6' : ''
          }`}
        >
          {/* Avatar */}
          {avatarPosition !== 'hidden' && page.avatarUrl && (
            <img
              src={page.avatarUrl}
              alt={page.artistName}
              className={`w-32 h-32 rounded-full border-4 shadow-lg ${
                avatarPosition === 'top' ? 'mx-auto mb-6' : 'flex-shrink-0'
              } ${layout === 'left' && avatarPosition === 'top' ? 'mx-0' : ''}`}
              style={{ borderColor: accentColor }}
            />
          )}

          <div className={avatarPosition === 'left' ? 'flex-1' : ''}>
            {/* Artist Name */}
            <h1
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{
                color: textColor,
                fontFamily: `"${headingFont}", system-ui, sans-serif`,
              }}
            >
              {page.artistName}
            </h1>

            {/* Tagline */}
            {page.tagline && (
              <p
                className="text-xl mb-6"
                style={{ color: `${textColor}99` }}
              >
                {page.tagline}
              </p>
            )}

            {/* Bio */}
            {page.bio && (
              <p
                className={`mb-8 leading-relaxed ${layout === 'centered' ? 'max-w-2xl mx-auto' : 'max-w-2xl'}`}
                style={{ color: `${textColor}cc` }}
              >
                {page.bio}
              </p>
            )}

            {/* Send Proposal Button - prominently placed */}
            <div className="mt-8">
              <SendProposalButton
                landingPageId={page.id}
                artistName={page.artistName}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Links Section (Story 9.7: Headers support, Story 9.8: Layout options) */}
      {page.links && page.links.length > 0 && (
        <section className="py-12 px-4">
          <div
            className={`mx-auto ${
              layout === 'grid'
                ? 'max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4'
                : 'max-w-md space-y-4'
            } ${layout === 'left' ? 'ml-0 mr-auto' : ''}`}
            style={{
              maxWidth: layout !== 'grid' ? (
                linkWidth === 'full' ? '28rem' :
                linkWidth === 'medium' ? '22rem' :
                '18rem'
              ) : undefined,
            }}
          >
            {page.links
              .filter(link => {
                // Headers: show if title is not empty
                if (link.type === 'header') {
                  return link.title && link.title.trim() !== '';
                }
                // Links: show if enabled
                return link.enabled;
              })
              .sort((a, b) => parseInt(a.order || '0') - parseInt(b.order || '0'))
              .map((link) => {
                // Render section headers differently (Story 9.7)
                // In grid layout, headers span both columns
                if (link.type === 'header') {
                  return (
                    <h3
                      key={link.id}
                      className={`text-lg font-semibold mt-6 mb-2 first:mt-0 ${
                        layout === 'grid' ? 'col-span-1 sm:col-span-2' : ''
                      }`}
                      style={{
                        color: textColor,
                        fontFamily: `"${headingFont}", system-ui, sans-serif`,
                      }}
                    >
                      {link.title}
                    </h3>
                  );
                }

                // Render video embeds (Story 9.9)
                if (link.type === 'video_embed' && link.videoUrl) {
                  const embed = parseVideoUrl(link.videoUrl);
                  if (!embed) return null;

                  return (
                    <div
                      key={link.id}
                      className={`rounded-lg overflow-hidden ${
                        layout === 'grid' ? 'col-span-1 sm:col-span-2' : ''
                      }`}
                    >
                      {link.title && (
                        <p
                          className="text-sm font-medium mb-2"
                          style={{ color: textColor }}
                        >
                          {link.title}
                        </p>
                      )}
                      <div
                        className="relative w-full overflow-hidden rounded-lg"
                        style={{
                          aspectRatio: embed.aspectRatio === '16:9' ? '16 / 9' : '1 / 1',
                          maxWidth: embed.platform === 'spotify' ? '300px' : '100%',
                        }}
                      >
                        <iframe
                          src={embed.embedUrl}
                          className="absolute inset-0 w-full h-full"
                          frameBorder="0"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                          title={link.title}
                        />
                      </div>
                    </div>
                  );
                }

                // Regular links
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={getButtonClasses(buttonStyle)}
                    style={{
                      backgroundColor: buttonBgColor,
                      color: buttonTextColor,
                      borderColor: buttonBorderColor,
                      fontFamily: `"${bodyFont}", system-ui, sans-serif`,
                    }}
                  >
                    {link.title}
                  </a>
                );
              })}
          </div>
        </section>
      )}

      {/* Social Icons Bar (Story 9.6) */}
      {showSocialBar && socialIcons.length > 0 && (
        <section className="py-8 px-4">
          <div className="max-w-md mx-auto flex justify-center gap-4">
            {socialIcons
              .sort((a, b) => a.order - b.order)
              .map((icon) => (
                <a
                  key={icon.id}
                  href={icon.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-full transition-all hover:scale-110 hover:opacity-80"
                  style={{
                    color: secondaryColor,
                    backgroundColor: `${secondaryColor}20`,
                  }}
                  title={icon.platform}
                >
                  {getPlatformIcon(icon.platform, "w-6 h-6")}
                </a>
              ))}
          </div>
        </section>
      )}

      {/* Legacy Social Links (for backwards compatibility) */}
      {(!socialIcons || socialIcons.length === 0) && socialLinks && Object.keys(socialLinks).length > 0 && (
        <section className="py-8 px-4">
          <div className="max-w-md mx-auto flex justify-center gap-6">
            {Object.entries(socialLinks).map(([platform, url]) => (
              url && (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline"
                  style={{ color: textColor }}
                >
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </a>
              )
            ))}
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section
        className="py-16 px-4 relative z-10"
        style={{ backgroundColor: `${textColor}10` }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="text-2xl font-bold mb-4"
            style={{
              color: textColor,
              fontFamily: `"${headingFont}", system-ui, sans-serif`,
            }}
          >
            Interested in working together?
          </h2>
          <p
            className="mb-6"
            style={{ color: `${textColor}99` }}
          >
            Send a proposal to discuss collaboration, licensing, booking, and more.
          </p>
          <SendProposalButton
            landingPageId={page.id}
            artistName={page.artistName}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 text-center relative z-10">
        <p
          className="text-sm"
          style={{ color: `${textColor}60` }}
        >
          Powered by <a href="/" className="hover:underline">Aermuse</a>
        </p>
      </footer>
    </div>
  );
}
