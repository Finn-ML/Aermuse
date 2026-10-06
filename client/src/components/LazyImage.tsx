import { useState, type ImgHTMLAttributes, type ReactNode } from 'react';

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /**
   * Above-the-fold images: load immediately at high priority instead of
   * lazily, and skip the skeleton shimmer.
   */
  eager?: boolean;
  /** Rendered in place of the image if it fails to load. */
  fallback?: ReactNode;
  /** Skip the absolutely-positioned skeleton (parent isn't position:relative). */
  noSkeleton?: boolean;
}

/**
 * Image that stays cheap while the page scrolls: native lazy loading,
 * async decode (no main-thread jank when the image arrives), a skeleton
 * shimmer while loading, and a fade-in once decoded.
 *
 * The parent element is expected to be position:relative and to reserve the
 * image's box (aspect-ratio or fixed size), so nothing shifts while loading.
 */
export function LazyImage(props: LazyImageProps) {
  return <ImageState key={props.src} {...props} />;
}

function ImageState({
  src,
  alt,
  eager = false,
  fallback = null,
  noSkeleton = false,
  className = '',
  onLoad,
  onError,
  ...rest
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <>{fallback}</>;
  }

  return (
    <>
      {!loaded && !eager && !noSkeleton && <div aria-hidden="true" className="media-skeleton" />}
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        // @ts-expect-error -- fetchpriority is valid HTML but missing from React 18 types
        fetchpriority={eager ? 'high' : 'auto'}
        draggable={false}
        className={`${className} ${eager ? '' : `media-fade ${loaded ? 'is-loaded' : ''}`}`.trim()}
        onLoad={(event) => { setLoaded(true); onLoad?.(event); }}
        onError={(event) => { setFailed(true); onError?.(event); }}
        {...rest}
      />
    </>
  );
}

export default LazyImage;
