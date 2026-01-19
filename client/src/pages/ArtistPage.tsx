import { useEffect, useRef, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearch, useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { SendProposalButton } from '@/components/landing/SendProposalButton';
import { getPlatformIcon, type SocialIcon } from '@/components/landing/SocialIconsEditor';
import { parseVideoUrl } from '@/lib/video-parser';
import { trackPageView, trackPageEnd, trackLinkClick } from '@/lib/analytics';
import { PlaylistSection } from '@/components/music/PlaylistSection';
import { PurchaseSuccessModal } from '@/components/music/PurchaseSuccessModal';
import type { LandingPage, LandingPageLink, Track } from '@shared/schema';
import type { ButtonStyle, BackgroundType, BackgroundOverlay } from '@shared/themes';

interface ArtistPageData extends LandingPage {
  links: LandingPageLink[];
}

// Button style CSS classes
function getButtonClasses(buttonStyle: ButtonStyle | string | null | undefined): string {
  const style = buttonStyle || 'rounded';
  const baseClasses = 'block w-full py-4 px-6 text-center font-semibold transition-all duration-200 hover:scale-105';

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
  fallbackColor: string,
  backgroundPosition?: 'cover' | 'contain' | string | null // Story 9.13
): React.CSSProperties {
  const type = backgroundType || 'solid';
  const bgSize = backgroundPosition || 'cover'; // Story 9.13

  switch (type) {
    case 'gradient':
      return backgroundValue
        ? { background: backgroundValue }
        : { backgroundColor: fallbackColor };
    case 'image':
      return backgroundValue
        ? {
            backgroundImage: `url(${backgroundValue})`,
            backgroundSize: bgSize,
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
  const [, setLocation] = useLocation();
  const pageViewIdRef = useRef<string | null>(null);

  // Purchase success state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseData, setPurchaseData] = useState<{
    downloadToken: string | null;
    trackId: string | null;
    trackTitle?: string;
    artistName?: string;
  }>({ downloadToken: null, trackId: null });
  const purchaseVerifiedRef = useRef(false);

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

  // Track page view on mount (AC-2)
  useEffect(() => {
    if (!page?.id) return;

    trackPageView(page.id).then((id) => {
      pageViewIdRef.current = id;
    });
  }, [page?.id]);

  // Handle purchase success - verify payment and show modal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const purchaseStatus = urlParams.get('purchase');
    const sessionId = urlParams.get('session_id');
    const trackId = urlParams.get('track');

    // Only process if purchase=success and we have a session ID
    if (purchaseStatus !== 'success' || !sessionId || purchaseVerifiedRef.current) {
      return;
    }

    // Mark as processing to prevent duplicate calls
    purchaseVerifiedRef.current = true;

    // Verify the purchase with the server
    const verifyPurchase = async () => {
      try {
        const response = await fetch(`/api/tracks/purchase/verify?session_id=${encodeURIComponent(sessionId)}`);
        if (!response.ok) {
          console.error('Purchase verification failed');
          return;
        }

        const data = await response.json();
        if (data.success && data.downloadToken) {
          // Fetch track details for the modal
          let trackTitle = 'Your Track';
          let artistName = page?.artistName;

          if (data.trackId) {
            try {
              const trackResponse = await fetch(`/api/tracks/${data.trackId}`);
              if (trackResponse.ok) {
                const trackData = await trackResponse.json();
                trackTitle = trackData.title || trackTitle;
                artistName = trackData.artistName || artistName;
              }
            } catch (err) {
              console.warn('Failed to fetch track details:', err);
            }
          }

          setPurchaseData({
            downloadToken: data.downloadToken,
            trackId: data.trackId,
            trackTitle,
            artistName,
          });
          setShowPurchaseModal(true);

          // Clean up URL params without reloading
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }
      } catch (err) {
        console.error('Error verifying purchase:', err);
      }
    };

    verifyPurchase();
  }, [page?.artistName]);

  // Track page end on unload/visibility change (AC-5)
  useEffect(() => {
    const handleUnload = () => {
      if (pageViewIdRef.current) {
        trackPageEnd(pageViewIdRef.current);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && pageViewIdRef.current) {
        trackPageEnd(pageViewIdRef.current);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Track end on component unmount too
      if (pageViewIdRef.current) {
        trackPageEnd(pageViewIdRef.current);
      }
    };
  }, []);

  // Handle link click tracking (AC-3)
  const handleLinkClick = useCallback((linkId: string) => {
    if (page?.id) {
      trackLinkClick(linkId, page.id, pageViewIdRef.current);
    }
  }, [page?.id]);

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
  const bgPosition = (page.backgroundPosition as 'cover' | 'contain') || 'cover'; // Story 9.13
  const socialLinks = page.socialLinks as Record<string, string> | null;
  const socialIcons = (page.socialIcons as SocialIcon[]) || [];
  const showSocialBar = page.showSocialBar !== false;
  // Layout options (Story 9.8)
  const layout = (page.layout as 'centered' | 'left' | 'right') || 'centered';
  const avatarPosition = (page.avatarPosition as 'top' | 'left' | 'hidden') || 'top';
  const linkWidth = (page.linkWidth as 'full' | 'medium' | 'compact') || 'full';

  // Determine button colors based on style
  const isOutlineButton = buttonStyle === 'outline';
  const buttonBgColor = isOutlineButton ? 'transparent' : secondaryColor;
  const buttonTextColor = isOutlineButton ? secondaryColor : primaryColor;
  const buttonBorderColor = isOutlineButton ? secondaryColor : 'transparent';

  const backgroundStyle = getBackgroundStyle(backgroundType, backgroundValue, primaryColor, bgPosition);
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
      <section className="relative pt-8 md:pt-12 lg:pt-16 pb-4 md:pb-8 px-4">
        {/* Cover Image (if no custom background set) */}
        {page.coverImageUrl && backgroundType === 'solid' && !backgroundValue && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${page.coverImageUrl})` }}
          />
        )}

        <div
          className={`max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto relative z-10 ${
            layout === 'centered' ? 'text-center' : layout === 'right' ? 'text-right' : 'text-left'
          } ${
            avatarPosition === 'left' ? 'flex flex-col sm:flex-row items-center sm:items-start gap-6 md:gap-8' : ''
          }`}
        >
          {/* Avatar */}
          {avatarPosition !== 'hidden' && (
            page.avatarUrl ? (
              <img
                src={page.avatarUrl}
                alt={page.artistName}
                className={`w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 rounded-full border-4 shadow-xl object-cover transition-transform hover:scale-105 ${
                  avatarPosition === 'top' ? 'mx-auto mb-6' : 'flex-shrink-0'
                } ${layout === 'left' && avatarPosition === 'top' ? 'mx-0' : ''} ${layout === 'right' && avatarPosition === 'top' ? 'ml-auto mr-0' : ''}`}
                style={{ borderColor: accentColor }}
                onError={(e) => {
                  // Hide broken image, show fallback
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div
                className={`w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 rounded-full border-4 shadow-xl flex items-center justify-center text-4xl md:text-5xl lg:text-6xl font-bold ${
                  avatarPosition === 'top' ? 'mx-auto mb-6' : 'flex-shrink-0'
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
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4"
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
                className="text-lg md:text-xl lg:text-2xl mb-4 md:mb-6"
                style={{ color: `${textColor}99` }}
              >
                {page.tagline}
              </p>
            )}

            {/* Bio */}
            {page.bio && (
              <p
                className={`text-sm md:text-base lg:text-lg mb-6 leading-relaxed ${layout === 'centered' ? 'max-w-2xl mx-auto' : layout === 'right' ? 'max-w-2xl ml-auto' : 'max-w-2xl'}`}
                style={{ color: `${textColor}cc` }}
              >
                {page.bio}
              </p>
            )}

            {/* Social Icons - right after bio */}
            {showSocialBar && socialIcons.length > 0 && (
              <div className={`flex flex-wrap gap-3 md:gap-4 mb-6 ${layout === 'centered' ? 'justify-center' : layout === 'right' ? 'justify-end' : ''}`}>
                {socialIcons
                  .sort((a, b) => a.order - b.order)
                  .map((icon) => (
                    <a
                      key={icon.id}
                      href={icon.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 md:p-3 lg:p-4 rounded-full transition-all hover:scale-110 hover:opacity-80"
                      style={{
                        color: secondaryColor,
                        backgroundColor: `${secondaryColor}20`,
                      }}
                      title={icon.platform}
                    >
                      {getPlatformIcon(icon.platform, "w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7")}
                    </a>
                  ))}
              </div>
            )}

            {/* Send Proposal Button - under profile and bio */}
            <div className={`mt-6 ${layout === 'centered' ? 'flex justify-center' : layout === 'right' ? 'flex justify-end' : ''}`}>
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
        <section className="py-4 md:py-8 px-4">
          <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
            {/* Video embeds in a grid on desktop */}
            {(() => {
              const videoLinks = page.links.filter(l => l.type === 'video_embed' && l.enabled && l.videoUrl);
              const regularLinks = page.links.filter(l => l.type !== 'video_embed' && l.enabled);
              const headers = page.links.filter(l => l.type === 'header' && l.title?.trim());

              return (
                <>
                  {/* Video Embeds Grid */}
                  {videoLinks.length > 0 && (
                    <div className="mb-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {videoLinks
                          .sort((a, b) => parseInt(a.order || '0') - parseInt(b.order || '0'))
                          .map((link) => {
                            const embed = parseVideoUrl(link.videoUrl!);
                            if (!embed) return null;

                            return (
                              <div
                                key={link.id}
                                className="rounded-xl overflow-hidden"
                              >
                                {link.title && (
                                  <p
                                    className="text-sm md:text-base font-medium mb-2"
                                    style={{ color: textColor }}
                                  >
                                    {link.title}
                                  </p>
                                )}
                                <div
                                  className="relative w-full overflow-hidden rounded-xl shadow-lg"
                                  style={{
                                    aspectRatio: embed.aspectRatio === '16:9' ? '16 / 9' : '1 / 1',
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
                          })}
                      </div>
                    </div>
                  )}

                  {/* Regular Links */}
                  {regularLinks.length > 0 && (
                    <div
                      className={`mx-auto space-y-3 md:space-y-4 ${layout === 'left' ? 'ml-0 mr-auto' : ''} ${layout === 'right' ? 'mr-0 ml-auto' : ''}`}
                      style={{
                        maxWidth: linkWidth === 'full' ? '32rem' :
                          linkWidth === 'medium' ? '26rem' :
                          '20rem',
                      }}
                    >
                      {[...headers, ...regularLinks]
                        .sort((a, b) => parseInt(a.order || '0') - parseInt(b.order || '0'))
                        .map((link) => {
                          if (link.type === 'header') {
                            return (
                              <h3
                                key={link.id}
                                className="text-base md:text-lg font-semibold mt-6 mb-2 first:mt-0"
                                style={{
                                  color: textColor,
                                  fontFamily: `"${headingFont}", system-ui, sans-serif`,
                                }}
                              >
                                {link.title}
                              </h3>
                            );
                          }

                          return (
                            <a
                              key={link.id}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleLinkClick(link.id)}
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
                  )}
                </>
              );
            })()}
          </div>
        </section>
      )}

      {/* Music Section - Playlist Style */}
      {slug && (
        <PlaylistSection
          artistSlug={slug}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          textColor={textColor}
          className="py-8 px-4"
        />
      )}

      {/* Legacy Social Links (for backwards compatibility) */}
      {(!socialIcons || socialIcons.length === 0) && socialLinks && Object.keys(socialLinks).length > 0 && (
        <section className="py-4 px-4">
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

      {/* Footer */}
      <footer className="py-6 px-4 text-center relative z-10">
        <p
          className="text-sm"
          style={{ color: `${textColor}60` }}
        >
          Powered by <a href="/" className="hover:underline">AERMUSE</a>
          <span className="mx-2">·</span>
          <a href="/privacy" className="hover:underline">Privacy</a>
        </p>
      </footer>

      {/* Purchase Success Modal */}
      <PurchaseSuccessModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        downloadToken={purchaseData.downloadToken}
        trackTitle={purchaseData.trackTitle}
        artistName={purchaseData.artistName}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />
    </div>
  );
}
