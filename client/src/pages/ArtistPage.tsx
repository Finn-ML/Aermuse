import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Loader2 } from 'lucide-react';
import { SendProposalButton } from '@/components/landing/SendProposalButton';
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
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        {/* Cover Image (if no custom background set) */}
        {page.coverImageUrl && backgroundType === 'solid' && !backgroundValue && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${page.coverImageUrl})` }}
          />
        )}

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Avatar */}
          {page.avatarUrl && (
            <img
              src={page.avatarUrl}
              alt={page.artistName}
              className="w-32 h-32 rounded-full mx-auto mb-6 border-4 shadow-lg"
              style={{ borderColor: accentColor }}
            />
          )}

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
              className="max-w-2xl mx-auto mb-8 leading-relaxed"
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
      </section>

      {/* Links Section */}
      {page.links && page.links.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-md mx-auto space-y-4">
            {page.links
              .filter(link => link.enabled)
              .sort((a, b) => parseInt(a.order || '0') - parseInt(b.order || '0'))
              .map((link) => (
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
              ))}
          </div>
        </section>
      )}

      {/* Social Links */}
      {socialLinks && Object.keys(socialLinks).length > 0 && (
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
