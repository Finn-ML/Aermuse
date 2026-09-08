import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearch, useLocation } from 'wouter';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Loader2, Lock, Play } from 'lucide-react';
import { LazyImage } from '@/components/LazyImage';
import { SendProposalButton } from '@/components/landing/SendProposalButton';
import { SubscribeWidget } from '@/components/mailing-list/SubscribeWidget';
import { getPlatformIcon, type SocialIcon } from '@/components/landing/SocialIconsEditor';
import { parseVideoUrl } from '@/lib/video-parser';
import { trackPageView, trackPageEnd, trackLinkClick } from '@/lib/analytics';
import { PlaylistSection } from '@/components/music/PlaylistSection';
import MerchStorefront from '@/components/merch/MerchStorefront';
import CartDrawer from '@/components/merch/CartDrawer';
import { PurchaseSuccessModal } from '@/components/music/PurchaseSuccessModal';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { VideoPurchaseModal } from '@/components/video/VideoPurchaseModal';
import { VideoCard, type Video } from '@/components/video/VideoCard';
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

// Entrance animations stick to opacity/transform — animating CSS filters
// (blur) forces expensive repaints and blurry text on low-end devices.
const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 120 }
  }
};

const avatarVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', damping: 20, stiffness: 100, duration: 0.8 }
  }
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

// Parse video background value JSON
function parseVideoBackground(value: string | null | undefined): { webm?: string; mp4?: string; poster?: string; duration?: number } | null {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// Optimized video background component (Spotify Canvas style)
// - Poster renders immediately underneath; video crossfades in once decodable
//   (no black flash while the video buffers)
// - Autoplay rejection (iOS Low Power Mode, data saver) falls back to the
//   poster and retries on the first tap and on tab re-focus
// - If every source fails to load, the poster stays — never a black screen
// - Pauses offscreen via IntersectionObserver
// - Respects prefers-reduced-motion (poster only)
function VideoBackground({ videoData }: { videoData: { webm?: string; mp4?: string; poster?: string } }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [reducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const sources = [
    videoData.webm && { src: videoData.webm, type: 'video/webm' },
    videoData.mp4 && { src: videoData.mp4, type: 'video/mp4' },
  ].filter(Boolean) as { src: string; type: string }[];

  const showVideo = !reducedMotion && !videoFailed && sources.length > 0;

  // Play/pause lifecycle: pause offscreen, retry blocked autoplay on gesture
  useEffect(() => {
    if (!showVideo) return;
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    let gestureCleanup: (() => void) | null = null;

    const tryPlay = () => {
      const attempt = video.play();
      if (!attempt) return;
      attempt.catch(() => {
        if (gestureCleanup) return;
        // Autoplay blocked — wait for the first interaction, then start
        const onGesture = () => {
          video.play().catch(() => {});
          gestureCleanup?.();
          gestureCleanup = null;
        };
        window.addEventListener('pointerdown', onGesture, { passive: true });
        window.addEventListener('touchstart', onGesture, { passive: true });
        gestureCleanup = () => {
          window.removeEventListener('pointerdown', onGesture);
          window.removeEventListener('touchstart', onGesture);
        };
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          tryPlay();
        } else {
          video.pause();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    // Browsers pause muted background videos on tab switch; resume on return
    const onVisibilityChange = () => {
      if (!document.hidden) tryPlay();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      gestureCleanup?.();
    };
  }, [showVideo]);

  // When every <source> fails the error surfaces on the last one
  const handleSourceError = (index: number) => {
    if (index === sources.length - 1) {
      setVideoFailed(true);
    }
  };

  return (
    <div ref={containerRef} className="fixed inset-0 -z-10 overflow-hidden bg-black">
      {videoData.poster && (
        <img
          src={videoData.poster}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {showVideo && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          // @ts-expect-error -- fetchpriority is valid HTML but missing from React types
          fetchpriority="low"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            videoReady ? 'opacity-100' : 'opacity-0'
          }`}
          onLoadedData={() => setVideoReady(true)}
          onError={() => {
            // Errors after a source was selected (network/decode mid-stream)
            const media = videoRef.current;
            if (media?.error && media.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
              setVideoFailed(true);
            }
          }}
        >
          {sources.map((source, index) => (
            <source
              key={source.src}
              src={source.src}
              type={source.type}
              onError={() => handleSourceError(index)}
            />
          ))}
        </video>
      )}
    </div>
  );
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
    case 'video':
      // Video background uses a separate element, return transparent background
      return { backgroundColor: 'transparent' };
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
  // Skip entrance animations for users who prefer reduced motion — framer
  // inline animations aren't covered by the CSS media query.
  const reduceMotion = useReducedMotion();
  const entranceInitial = reduceMotion ? false : 'hidden';

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
    const downloadToken = urlParams.get('download_token'); // For free PWYW downloads

    // Only process if purchase=success
    if (purchaseStatus !== 'success' || purchaseVerifiedRef.current) {
      return;
    }

    // Mark as processing to prevent duplicate calls
    purchaseVerifiedRef.current = true;

    // Handle free downloads (PWYW with 0 amount) - direct download token
    if (downloadToken && trackId && !sessionId) {
      const handleFreeDownload = async () => {
        let trackTitle = 'Your Track';
        let artistName = page?.artistName;

        try {
          const trackResponse = await fetch(`/api/tracks/${trackId}`);
          if (trackResponse.ok) {
            const trackData = await trackResponse.json();
            trackTitle = trackData.title || trackTitle;
            artistName = trackData.artistName || artistName;
          }
        } catch (err) {
          console.warn('Failed to fetch track details:', err);
        }

        setPurchaseData({
          downloadToken,
          trackId,
          trackTitle,
          artistName,
        });
        setShowPurchaseModal(true);

        // Clean up URL params without reloading
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      };

      handleFreeDownload();
      return;
    }

    // Handle paid purchases - verify with Stripe session
    if (!sessionId) {
      return;
    }

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

  // Handle video purchase success
  const [purchasedVideoTokens, setPurchasedVideoTokens] = useState<Record<string, string>>({});
  const videoPurchaseVerifiedRef = useRef(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoPurchaseStatus = urlParams.get('video_purchase');
    const sessionId = urlParams.get('session_id');
    const videoId = urlParams.get('video');

    // Only process video_purchase=success
    if (videoPurchaseStatus !== 'success' || videoPurchaseVerifiedRef.current) {
      return;
    }

    videoPurchaseVerifiedRef.current = true;

    if (!sessionId) {
      return;
    }

    const verifyVideoPurchase = async () => {
      try {
        const response = await fetch(`/api/videos/purchase/verify?session_id=${encodeURIComponent(sessionId)}`);
        if (!response.ok) {
          console.error('Video purchase verification failed');
          return;
        }

        const data = await response.json();
        if (data.success && data.accessToken && data.videoId) {
          // Store the access token for this video
          setPurchasedVideoTokens(prev => ({
            ...prev,
            [data.videoId]: data.accessToken,
          }));

          // Show success message (optional toast)
          console.log('Video purchase successful!', data.videoId);

          // Clean up URL params without reloading
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }
      } catch (err) {
        console.error('Error verifying video purchase:', err);
      }
    };

    verifyVideoPurchase();
  }, []);

  // Fetch paywalled videos for this artist
  const { data: paywalledVideos = [] } = useQuery<Video[]>({
    queryKey: ['artist-videos', slug],
    queryFn: async () => {
      const response = await fetch(`/api/artist/${slug}/videos`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!slug,
  });

  // Fetch merch products for this artist
  const { data: merchData } = useQuery<{ products: Array<any>; checkoutEnabled: boolean }>({
    queryKey: [`/api/artist/${slug}/merch`],
    enabled: !!slug,
  });
  const merchProducts = merchData?.products ?? [];
  const merchCheckoutEnabled = merchData?.checkoutEnabled ?? false;

  // Video player state
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showVideoPurchaseModal, setShowVideoPurchaseModal] = useState(false);

  const hasVideoAccess = (video: Video) => {
    return !video.isPaywalled || video.id in purchasedVideoTokens;
  };

  const getVideoAccessToken = (video: Video) => {
    return purchasedVideoTokens[video.id];
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleVideoPurchaseClick = () => {
    setShowVideoPurchaseModal(true);
  };

  const handleVideoPurchaseSuccess = (accessToken?: string) => {
    if (accessToken && selectedVideo) {
      setPurchasedVideoTokens(prev => ({
        ...prev,
        [selectedVideo.id]: accessToken,
      }));
    }
    setShowVideoPurchaseModal(false);
  };

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

  // Parse video background data
  const videoData = backgroundType === 'video' ? parseVideoBackground(backgroundValue) : null;

  return (
    <div
      className={`min-h-screen relative ${overlayClass} grain-overlay${backgroundType === 'video' ? ' grain-overlay--video perf-video-bg' : ''}`}
      style={{
        ...backgroundStyle,
        fontFamily: `"${bodyFont}", system-ui, sans-serif`,
      }}
    >
      {/* Video Background (Spotify Canvas Style) */}
      {backgroundType === 'video' && videoData && (
        <VideoBackground videoData={videoData} />
      )}

      {/* Atmospheric Floating Orbs - pure CSS so they animate on the
          compositor; disabled when video background is active to free GPU */}
      {backgroundType !== 'video' && (
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div
            className="orb w-[500px] h-[500px] opacity-20"
            style={{
              background: `radial-gradient(circle, ${accentColor}40 0%, transparent 70%)`,
              top: '-10%',
              right: '-10%',
              filter: 'blur(60px)',
              '--orb-duration': '9s',
            } as React.CSSProperties}
          />
          <div
            className="orb w-[400px] h-[400px] opacity-15"
            style={{
              background: `radial-gradient(circle, ${secondaryColor}30 0%, transparent 70%)`,
              bottom: '10%',
              left: '-5%',
              filter: 'blur(50px)',
              '--orb-duration': '11s',
              '--orb-delay': '0.5s',
            } as React.CSSProperties}
          />
          <div
            className="orb w-[300px] h-[300px] opacity-10"
            style={{
              background: `radial-gradient(circle, ${primaryColor}50 0%, transparent 70%)`,
              top: '40%',
              right: '20%',
              filter: 'blur(40px)',
              '--orb-duration': '13s',
              '--orb-delay': '1s',
            } as React.CSSProperties}
          />
        </div>
      )}

      {/* Hero Section with Cinematic Entrance */}
      <motion.section
        className="relative pt-8 md:pt-12 lg:pt-16 pb-4 md:pb-8 px-4"
        variants={heroVariants}
        initial={entranceInitial}
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
              {/* Glow Ring Effect - CSS keyframes run on the compositor */}
              <div
                aria-hidden="true"
                className="absolute inset-[-12px] md:inset-[-16px] rounded-full z-0 pulse-glow"
                style={{
                  background: `radial-gradient(circle, ${accentColor}60 0%, transparent 70%)`,
                  filter: 'blur(20px)',
                }}
              />
              {page.avatarUrl ? (
                <img
                  src={page.avatarUrl}
                  alt={page.artistName}
                  width={176}
                  height={176}
                  decoding="async"
                  // @ts-expect-error -- fetchpriority is valid HTML but missing from React types
                  fetchpriority="high"
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
                      initial={entranceInitial}
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
            {/* Mailing List Subscribe Widget */}
            <motion.div
              variants={itemVariants}
              className={`mt-4 ${layout === 'centered' ? 'flex justify-center' : layout === 'right' ? 'flex justify-end' : ''}`}
            >
              <SubscribeWidget
                slug={page.slug}
                primaryColor={primaryColor}
                textColor={textColor}
              />
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Links Section with Cinematic Cards */}
      {(page.links?.length > 0 || paywalledVideos.length > 0) && (
        <section className="py-4 md:py-8 px-4 relative">
          <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
            {(() => {
              const videoLinks = (page.links || []).filter(l => l.type === 'video_embed' && l.enabled && l.videoUrl);
              const regularLinks = (page.links || []).filter(l => l.type !== 'video_embed' && l.type !== 'header' && l.enabled);
              const headers = (page.links || []).filter(l => l.type === 'header' && l.enabled && l.title?.trim());

              return (
                <>
                  {/* Combined Videos Section - Horizontal Scroll */}
                  {(videoLinks.length > 0 || paywalledVideos.length > 0) && (
                    <div className="mb-8">
                      {/* Section Header */}
                      <div className="text-center mb-4">
                        <h2
                          className="text-lg md:text-xl font-bold mb-2"
                          style={{ color: textColor }}
                        >
                          Videos
                        </h2>
                        <div
                          className="w-10 h-0.5 mx-auto rounded-full"
                          style={{ backgroundColor: secondaryColor }}
                        />
                      </div>

                      {/* Horizontally Scrollable Container */}
                      <div
                        className="flex gap-4 overflow-x-auto pb-4 px-2 -mx-2 scrollbar-hide"
                        style={{
                          scrollSnapType: 'x mandatory',
                          WebkitOverflowScrolling: 'touch',
                        }}
                      >
                        {/* Embedded Videos (YouTube, Vimeo, etc.) */}
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
                                initial={entranceInitial}
                                whileInView="visible"
                                viewport={{ once: true, margin: '-50px' }}
                                className="flex-shrink-0 w-72 md:w-80 rounded-2xl overflow-hidden glass-card p-3"
                                style={{
                                  scrollSnapAlign: 'start',
                                  boxShadow: `0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px ${secondaryColor}10`,
                                }}
                              >
                                {link.title && (
                                  <p
                                    className="text-sm font-medium mb-2 truncate flex items-center gap-2"
                                    style={{ color: textColor }}
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: accentColor }}
                                    />
                                    {link.title}
                                  </p>
                                )}
                                <div
                                  className="relative w-full overflow-hidden rounded-xl"
                                  style={{
                                    aspectRatio: '16 / 9',
                                    boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
                                  }}
                                >
                                  <iframe
                                    src={embed.embedUrl}
                                    className="absolute inset-0 w-full h-full"
                                    frameBorder="0"
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen
                                    loading="lazy"
                                    title={link.title}
                                  />
                                </div>
                              </motion.div>
                            );
                          })}

                        {/* Paywalled Videos - Same styling as embedded */}
                        {paywalledVideos.map((video, index) => {
                          const thumbnailUrl = video.thumbnailPath
                            ? `/api/videos/${video.id}/thumbnail/${encodeURIComponent(video.thumbnailPath)}`
                            : undefined;
                          const isPWYW = video.pricingType === 'pwyw';
                          const minPrice = video.minimumPriceInCents || 0;

                          return (
                            <motion.div
                              key={video.id}
                              custom={index + videoLinks.length}
                              variants={videoEmbedVariants}
                              initial={entranceInitial}
                              whileInView="visible"
                              viewport={{ once: true, margin: '-50px' }}
                              className="flex-shrink-0 w-72 md:w-80 rounded-2xl overflow-hidden glass-card p-3 cursor-pointer group"
                              style={{
                                scrollSnapAlign: 'start',
                                boxShadow: `0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px ${secondaryColor}10`,
                              }}
                              onClick={() => handleVideoSelect(video)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {/* Title with accent dot - same as embedded */}
                              <p
                                className="text-sm font-medium mb-2 truncate flex items-center gap-2"
                                style={{ color: textColor }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: accentColor }}
                                />
                                {video.title}
                                {/* Price badge inline */}
                                {video.isPaywalled && video.priceInCents !== null && (
                                  <span
                                    className="ml-auto px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0"
                                    style={{ backgroundColor: secondaryColor, color: primaryColor }}
                                  >
                                    {isPWYW
                                      ? minPrice === 0 ? 'Free+' : `From £${(minPrice / 100).toFixed(2)}`
                                      : `£${((video.priceInCents || 0) / 100).toFixed(2)}`}
                                  </span>
                                )}
                              </p>

                              {/* Video Thumbnail - same aspect ratio as embedded */}
                              <div
                                className="relative w-full overflow-hidden rounded-xl"
                                style={{
                                  aspectRatio: '16 / 9',
                                  boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
                                  backgroundColor: `${primaryColor}30`,
                                }}
                              >
                                {thumbnailUrl ? (
                                  <LazyImage
                                    src={thumbnailUrl}
                                    alt={video.title}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    fallback={
                                      <div className="w-full h-full flex items-center justify-center bg-black/20">
                                        <Play className="w-12 h-12 opacity-40" style={{ color: textColor }} />
                                      </div>
                                    }
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-black/20">
                                    <Play className="w-12 h-12 opacity-40" style={{ color: textColor }} />
                                  </div>
                                )}

                                {/* Lock Icon for Paywalled */}
                                {video.isPaywalled && (
                                  <div
                                    className="absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm"
                                    style={{ backgroundColor: `${primaryColor}90` }}
                                  >
                                    <Lock className="w-3.5 h-3.5" style={{ color: secondaryColor }} />
                                  </div>
                                )}

                                {/* Play Overlay on Hover */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/30">
                                  <div
                                    className="w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-sm"
                                    style={{ backgroundColor: `${secondaryColor}e0` }}
                                  >
                                    <Play className="w-7 h-7 ml-1" style={{ color: primaryColor }} />
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Scrollbar hide CSS */}
                      <style>{`
                        .scrollbar-hide {
                          -ms-overflow-style: none;
                          scrollbar-width: none;
                        }
                        .scrollbar-hide::-webkit-scrollbar {
                          display: none;
                        }
                      `}</style>
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
                                initial={reduceMotion ? false : { opacity: 0, x: -20 }}
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
                              initial={entranceInitial}
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

      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoPlayer
            video={selectedVideo}
            hasAccess={hasVideoAccess(selectedVideo)}
            accessToken={getVideoAccessToken(selectedVideo)}
            onClose={() => setSelectedVideo(null)}
            onPurchaseClick={handleVideoPurchaseClick}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
          />
        )}
      </AnimatePresence>

      {/* Video Purchase Modal */}
      {selectedVideo && (
        <VideoPurchaseModal
          isOpen={showVideoPurchaseModal}
          video={selectedVideo}
          onClose={() => setShowVideoPurchaseModal(false)}
          onSuccess={handleVideoPurchaseSuccess}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
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

      {/* Merch Section */}
      {merchProducts.length > 0 && slug && (
        <div className="relative py-8 px-4">
          <MerchStorefront
            products={merchProducts}
            artistSlug={slug}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            textColor={textColor}
            checkoutEnabled={merchCheckoutEnabled}
          />
        </div>
      )}

      {/* Cart Drawer - only show when merch exists and checkout is enabled */}
      {merchProducts.length > 0 && merchCheckoutEnabled && (
        <CartDrawer primaryColor={primaryColor} secondaryColor={secondaryColor} textColor={textColor} />
      )}

      {/* Legacy Social Links (for backwards compatibility) - Enhanced */}
      {(!socialIcons || socialIcons.length === 0) && socialLinks && Object.keys(socialLinks).length > 0 && (
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
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
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
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
