import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearch, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { SendProposalButton } from '@/components/landing/SendProposalButton';
import { getPlatformIcon, type SocialIcon } from '@/components/landing/SocialIconsEditor';
import { parseVideoUrl } from '@/lib/video-parser';
import { trackPageView, trackPageEnd, trackLinkClick } from '@/lib/analytics';
import { PlaylistSection } from '@/components/music/PlaylistSection';
import { PurchaseSuccessModal } from '@/components/music/PurchaseSuccessModal';
import type { LandingPage, LandingPageLink, Track } from '@shared/schema';
import type { ButtonStyle, BackgroundType, BackgroundOverlay } from '@shared/themes';

// ============================================
// CINEMATIC STAGE ANIMATION VARIANTS
// ============================================

const heroVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', damping: 25, stiffness: 120 }
  }
};

const avatarVariants = {
  hidden: { opacity: 0, scale: 0.8, filter: 'blur(20px)' },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', damping: 20, stiffness: 100, duration: 0.8 }
  }
};

const floatingOrbVariants = {
  animate: (i: number) => ({
    y: [0, -20, 0],
    scale: [1, 1.05, 1],
    transition: {
      duration: 6 + i * 2,
      repeat: Infinity,
      ease: 'easeInOut',
      delay: i * 0.5
    }
  })
};

const linkCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 120,
      delay: i * 0.08
    }
  })
};

const socialIconVariants = {
  hidden: { opacity: 0, scale: 0, rotate: -180 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      damping: 15,
      stiffness: 200,
      delay: 0.4 + i * 0.1
    }
  })
};

const videoEmbedVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 100,
      delay: i * 0.15
    }
  })
};

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

  // JSON-LD structured data for SEO
  useEffect(() => {
    if (!page) return;

    const socialIcons = (page.socialIcons as { platform: string; url: string }[]) || [];
    const sameAs = socialIcons.map(icon => icon.url).filter(Boolean);

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "MusicGroup",
      "name": page.artistName,
      "description": page.bio || page.tagline || `Official page of ${page.artistName}`,
      "image": page.avatarUrl || page.coverImageUrl,
      "url": window.location.href,
      ...(sameAs.length > 0 && { "sameAs": sameAs }),
    };

    // Remove any existing JSON-LD script
    const existingScript = document.querySelector('script[data-jsonld="artist"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new JSON-LD script
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-jsonld', 'artist');
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      const scriptToRemove = document.querySelector('script[data-jsonld="artist"]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [page]);

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

  // Loading state with cinematic entrance
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a0a12] via-[#2d1420] to-[#1a0a12]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="absolute inset-0 rounded-full bg-[#660033]/30 blur-xl animate-glow-pulse" />
          <Loader2 className="h-10 w-10 animate-spin text-[#F7E6CA] relative z-10" />
        </motion.div>
      </div>
    );
  }

  // Error state with elegant styling
  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a0a12] via-[#2d1420] to-[#1a0a12]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center px-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-[#F7E6CA] mb-4 text-shadow-cinematic">
            Page Not Found
          </h1>
          <p className="text-[#F7E6CA]/60 text-lg">
            This artist page doesn't exist or isn't published yet.
          </p>
        </motion.div>
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
      className={`min-h-screen relative ${overlayClass} grain-overlay`}
      style={{
        ...backgroundStyle,
        fontFamily: `"${bodyFont}", system-ui, sans-serif`,
      }}
    >
      {/* Atmospheric Floating Orbs - Creates depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          custom={0}
          variants={floatingOrbVariants}
          animate="animate"
          className="absolute w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: `radial-gradient(circle, ${accentColor}40 0%, transparent 70%)`,
            top: '-10%',
            right: '-10%',
            filter: 'blur(60px)',
          }}
        />
        <motion.div
          custom={1}
          variants={floatingOrbVariants}
          animate="animate"
          className="absolute w-[400px] h-[400px] rounded-full opacity-15"
          style={{
            background: `radial-gradient(circle, ${secondaryColor}30 0%, transparent 70%)`,
            bottom: '10%',
            left: '-5%',
            filter: 'blur(50px)',
          }}
        />
        <motion.div
          custom={2}
          variants={floatingOrbVariants}
          animate="animate"
          className="absolute w-[300px] h-[300px] rounded-full opacity-10"
          style={{
            background: `radial-gradient(circle, ${primaryColor}50 0%, transparent 70%)`,
            top: '40%',
            right: '20%',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* Hero Section with Cinematic Entrance */}
      <motion.section
        className="relative pt-8 md:pt-12 lg:pt-16 pb-4 md:pb-8 px-4"
        variants={heroVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Cover Image (if no custom background set) */}
        {page.coverImageUrl && backgroundType === 'solid' && !backgroundValue && (
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.2, scale: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute inset-0 bg-cover bg-center"
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
          {/* Enhanced Avatar with Spotlight Glow */}
          {avatarPosition !== 'hidden' && (
            <div className={`${
              avatarPosition === 'top' ? `mb-6 ${layout === 'centered' ? 'flex justify-center' : layout === 'right' ? 'flex justify-end' : ''}` : ''
            }`}>
            <motion.div
              variants={avatarVariants}
              className={`relative ${avatarPosition === 'left' ? 'flex-shrink-0' : ''}`}
            >
              {/* Glow Ring Effect */}
              <motion.div
                className="absolute inset-[-12px] md:inset-[-16px] rounded-full z-0"
                style={{
                  background: `radial-gradient(circle, ${accentColor}60 0%, transparent 70%)`,
                  filter: 'blur(20px)',
                }}
                animate={{
                  opacity: [0.4, 0.7, 0.4],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              {page.avatarUrl ? (
                <img
                  src={page.avatarUrl}
                  alt={page.artistName}
                  className="w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 rounded-full border-4 shadow-2xl object-cover relative z-10 transition-all duration-300 hover:scale-105"
                  style={{
                    borderColor: accentColor,
                    boxShadow: `0 0 30px ${accentColor}40, 0 20px 40px rgba(0,0,0,0.3)`,
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div
                  className="w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 rounded-full border-4 shadow-2xl flex items-center justify-center text-4xl md:text-5xl lg:text-6xl font-bold relative z-10"
                  style={{
                    borderColor: accentColor,
                    backgroundColor: `${accentColor}30`,
                    color: textColor,
                    boxShadow: `0 0 30px ${accentColor}40, 0 20px 40px rgba(0,0,0,0.3)`,
                  }}
                >
                  {(page.artistName || 'A').charAt(0).toUpperCase()}
                </div>
              )}
            </motion.div>
            </div>
          )}

          <div className={avatarPosition === 'left' ? 'flex-1' : ''}>
            {/* Enhanced Artist Name with Text Shadow */}
            <motion.h1
              variants={itemVariants}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 text-shadow-cinematic"
              style={{
                color: textColor,
                fontFamily: `"${headingFont}", system-ui, sans-serif`,
              }}
            >
              {page.artistName}
            </motion.h1>

            {/* Tagline with Fade Animation */}
            {page.tagline && (
              <motion.p
                variants={itemVariants}
                className="text-lg md:text-xl lg:text-2xl mb-4 md:mb-6"
                style={{ color: `${textColor}99` }}
              >
                {page.tagline}
              </motion.p>
            )}

            {/* Bio with Staggered Reveal */}
            {page.bio && (
              <motion.p
                variants={itemVariants}
                className={`text-sm md:text-base lg:text-lg mb-6 leading-relaxed ${layout === 'centered' ? 'max-w-2xl mx-auto' : layout === 'right' ? 'max-w-2xl ml-auto' : 'max-w-2xl'}`}
                style={{ color: `${textColor}cc` }}
              >
                {page.bio}
              </motion.p>
            )}

            {/* Enhanced Social Icons with Staggered Pop-in */}
            {showSocialBar && socialIcons.length > 0 && (
              <motion.div
                variants={itemVariants}
                className={`flex flex-wrap gap-3 md:gap-4 mb-6 ${layout === 'centered' ? 'justify-center' : layout === 'right' ? 'justify-end' : ''}`}
              >
                {socialIcons
                  .sort((a, b) => a.order - b.order)
                  .map((icon, index) => (
                    <motion.a
                      key={icon.id}
                      custom={index}
                      variants={socialIconVariants}
                      initial="hidden"
                      animate="visible"
                      href={icon.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 md:p-3 lg:p-4 rounded-full transition-all duration-300 glass-card hover:scale-110"
                      style={{
                        color: secondaryColor,
                        '--tw-shadow-color': secondaryColor,
                      } as React.CSSProperties}
                      whileHover={{
                        boxShadow: `0 0 20px ${secondaryColor}50`,
                        backgroundColor: `${secondaryColor}20`,
                      }}
                      title={icon.platform}
                    >
                      {getPlatformIcon(icon.platform, "w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7")}
                    </motion.a>
                  ))}
              </motion.div>
            )}

            {/* Send Proposal Button with Animation */}
            <motion.div
              variants={itemVariants}
              className={`mt-6 ${layout === 'centered' ? 'flex justify-center' : layout === 'right' ? 'flex justify-end' : ''}`}
            >
              <SendProposalButton
                landingPageId={page.id}
                artistName={page.artistName}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
              />
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Links Section with Cinematic Cards */}
      {page.links && page.links.length > 0 && (
        <section className="py-4 md:py-8 px-4 relative">
          <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
            {(() => {
              const videoLinks = page.links.filter(l => l.type === 'video_embed' && l.enabled && l.videoUrl);
              const regularLinks = page.links.filter(l => l.type !== 'video_embed' && l.enabled);
              const headers = page.links.filter(l => l.type === 'header' && l.title?.trim());

              return (
                <>
                  {/* Enhanced Video Embeds Grid with Glass Cards */}
                  {videoLinks.length > 0 && (
                    <div className="mb-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {videoLinks
                          .sort((a, b) => parseInt(a.order || '0') - parseInt(b.order || '0'))
                          .map((link, index) => {
                            const embed = parseVideoUrl(link.videoUrl!);
                            if (!embed) return null;

                            return (
                              <motion.div
                                key={link.id}
                                custom={index}
                                variants={videoEmbedVariants}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: '-50px' }}
                                className="rounded-2xl overflow-hidden glass-card p-3 md:p-4"
                                style={{
                                  boxShadow: `0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px ${secondaryColor}10`,
                                }}
                              >
                                {link.title && (
                                  <p
                                    className="text-sm md:text-base font-medium mb-3 flex items-center gap-2"
                                    style={{ color: textColor }}
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{ backgroundColor: accentColor }}
                                    />
                                    {link.title}
                                  </p>
                                )}
                                <div
                                  className="relative w-full overflow-hidden rounded-xl"
                                  style={{
                                    aspectRatio: embed.aspectRatio === '16:9' ? '16 / 9' : '1 / 1',
                                    boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
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
                              </motion.div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Link Cards with Glass Morphism & Shine */}
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
                        .map((link, index) => {
                          if (link.type === 'header') {
                            return (
                              <motion.div
                                key={link.id}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1, duration: 0.4 }}
                                className="mt-8 mb-3 first:mt-0"
                              >
                                <h3
                                  className="text-sm md:text-base font-semibold uppercase tracking-wider flex items-center gap-3"
                                  style={{
                                    color: `${textColor}90`,
                                    fontFamily: `"${headingFont}", system-ui, sans-serif`,
                                  }}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: accentColor }}
                                  />
                                  {link.title}
                                  <span
                                    className="flex-1 h-px opacity-30"
                                    style={{ backgroundColor: textColor }}
                                  />
                                </h3>
                              </motion.div>
                            );
                          }

                          return (
                            <motion.a
                              key={link.id}
                              custom={index}
                              variants={linkCardVariants}
                              initial="hidden"
                              whileInView="visible"
                              viewport={{ once: true, margin: '-30px' }}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleLinkClick(link.id)}
                              className={`${getButtonClasses(buttonStyle)} shine-effect relative overflow-hidden`}
                              style={{
                                backgroundColor: buttonBgColor,
                                color: buttonTextColor,
                                borderColor: buttonBorderColor,
                                fontFamily: `"${bodyFont}", system-ui, sans-serif`,
                                boxShadow: isOutlineButton
                                  ? `0 0 0 2px ${buttonBorderColor}, 0 4px 20px rgba(0,0,0,0.15)`
                                  : `0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px ${secondaryColor}20`,
                              }}
                              whileHover={{
                                scale: 1.03,
                                y: -2,
                                boxShadow: isOutlineButton
                                  ? `0 0 0 2px ${buttonBorderColor}, 0 0 30px ${accentColor}30, 0 8px 30px rgba(0,0,0,0.2)`
                                  : `0 0 30px ${accentColor}30, 0 8px 30px rgba(0,0,0,0.2)`,
                              }}
                              whileTap={{ scale: 0.98 }}
                              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            >
                              {link.title}
                            </motion.a>
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
        <div className="relative">
          <PlaylistSection
            artistSlug={slug}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            textColor={textColor}
            className="py-8 px-4"
          />
        </div>
      )}

      {/* Legacy Social Links (for backwards compatibility) - Enhanced */}
      {(!socialIcons || socialIcons.length === 0) && socialLinks && Object.keys(socialLinks).length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="py-4 px-4 relative"
        >
          <div className="max-w-md mx-auto flex justify-center gap-6">
            {Object.entries(socialLinks).map(([platform, url]) => (
              url && (
                <motion.a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium transition-all duration-300"
                  style={{ color: textColor }}
                  whileHover={{ scale: 1.05, opacity: 0.8 }}
                >
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </motion.a>
              )
            ))}
          </div>
        </motion.section>
      )}

      {/* Enhanced Footer with Glass Pill */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="py-8 px-4 text-center relative"
      >
        <div
          className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full glass-card text-sm"
          style={{
            color: `${textColor}80`,
            boxShadow: `0 4px 20px rgba(0,0,0,0.1), 0 0 0 1px ${textColor}10`,
          }}
        >
          <span>Powered by</span>
          <a
            href="/"
            className="font-semibold transition-all duration-300 hover:opacity-80"
            style={{ color: textColor }}
          >
            AERMUSE
          </a>
          <span className="w-px h-4 opacity-30" style={{ backgroundColor: textColor }} />
          <a
            href="/privacy"
            className="transition-all duration-300 hover:opacity-80"
            style={{ color: `${textColor}80` }}
          >
            Privacy
          </a>
        </div>
      </motion.footer>

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
