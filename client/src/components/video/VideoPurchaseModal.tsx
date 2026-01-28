// VideoPurchaseModal - Purchase flow modal similar to music purchase
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, CreditCard, Loader2, CheckCircle2, Video } from 'lucide-react';
import { formatPrice } from '@/hooks/useAudioPlayer';
import type { Video as VideoType } from './VideoCard';

interface VideoPurchaseModalProps {
  isOpen: boolean;
  video: VideoType;
  onClose: () => void;
  onSuccess: (accessToken?: string) => void;
  primaryColor?: string;
  secondaryColor?: string;
}

export function VideoPurchaseModal({
  isOpen,
  video,
  onClose,
  onSuccess,
  primaryColor = '#660033',
  secondaryColor = '#F7E6CA',
}: VideoPurchaseModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PWYW state
  const isPWYW = video.pricingType === 'pwyw';
  const minPrice = video.minimumPriceInCents || 0;
  const defaultPrice = video.priceInCents || 499;
  const [customAmount, setCustomAmount] = useState<number>(defaultPrice);

  // Reset custom amount when video changes
  useEffect(() => {
    setCustomAmount(video.priceInCents || 499);
    setError(null);
  }, [video.id, video.priceInCents]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handlePurchase = async () => {
    // Validate PWYW amount
    if (isPWYW && customAmount < minPrice) {
      setError(`Minimum price is ${formatPrice(minPrice, video.currency || 'gbp')}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/videos/${video.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customAmount: isPWYW ? customAmount : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create checkout session');
      }

      const data = await response.json();

      // Handle free PWYW (amount = 0)
      if (data.free && data.accessToken) {
        onSuccess(data.accessToken);
        return;
      }

      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      console.error('Purchase error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const thumbnailUrl = video.thumbnailPath
    ? `/api/videos/${video.id}/thumbnail/${encodeURIComponent(video.thumbnailPath)}`
    : undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
              style={{ backgroundColor: secondaryColor }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10 transition-colors z-10"
                style={{ color: primaryColor }}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header with thumbnail */}
              <div
                className="relative h-40 flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: primaryColor }}
              >
                {thumbnailUrl ? (
                  <>
                    <img
                      src={thumbnailUrl}
                      alt={video.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </>
                ) : null}
                <div className="relative z-10 text-center">
                  <div
                    className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{ backgroundColor: `${secondaryColor}20` }}
                  >
                    <Lock className="w-8 h-8" style={{ color: secondaryColor }} />
                  </div>
                  <h2
                    className="text-xl font-bold"
                    style={{ color: secondaryColor }}
                  >
                    Unlock Video
                  </h2>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5">
                {/* Video info */}
                <div className="flex items-start gap-4">
                  <div
                    className="w-20 h-12 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Video className="w-6 h-6" style={{ color: primaryColor }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-semibold truncate"
                      style={{ color: primaryColor }}
                    >
                      {video.title}
                    </h3>
                    {video.description && (
                      <p
                        className="text-sm truncate opacity-70"
                        style={{ color: primaryColor }}
                      >
                        {video.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* PWYW Price Input */}
                {isPWYW && (
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium block"
                      style={{ color: primaryColor }}
                    >
                      {minPrice === 0 ? 'Name Your Price' : 'Pay What You Want'}
                    </label>
                    <div className="relative">
                      <span
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold"
                        style={{ color: primaryColor }}
                      >
                        {video.currency === 'gbp' ? '£' : '$'}
                      </span>
                      <input
                        type="number"
                        min={minPrice / 100}
                        step="0.50"
                        value={(customAmount / 100).toFixed(2)}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) * 100;
                          setCustomAmount(Math.max(0, Math.round(value) || 0));
                          setError(null);
                        }}
                        className="w-full pl-10 pr-4 py-3 text-lg font-semibold rounded-xl border-2 focus:outline-none focus:ring-2"
                        style={{
                          borderColor: `${primaryColor}40`,
                          color: primaryColor,
                          backgroundColor: 'white',
                        }}
                      />
                    </div>
                    {minPrice > 0 && (
                      <p
                        className="text-xs opacity-60"
                        style={{ color: primaryColor }}
                      >
                        Minimum: {formatPrice(minPrice, video.currency || 'gbp')}
                      </p>
                    )}
                  </div>
                )}

                {/* Fixed Price Display */}
                {!isPWYW && (
                  <div
                    className="p-4 rounded-xl text-center"
                    style={{ backgroundColor: `${primaryColor}10` }}
                  >
                    <span
                      className="text-3xl font-bold"
                      style={{ color: primaryColor }}
                    >
                      {formatPrice(video.priceInCents!, video.currency || 'gbp')}
                    </span>
                    <p
                      className="text-xs opacity-60 mt-1"
                      style={{ color: primaryColor }}
                    >
                      + VAT where applicable
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {/* Purchase Button */}
                <button
                  onClick={handlePurchase}
                  disabled={isLoading}
                  className="w-full py-4 px-6 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: primaryColor,
                    color: secondaryColor,
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      {isPWYW
                        ? customAmount === 0
                          ? 'Get Free Access'
                          : `Pay ${formatPrice(customAmount, video.currency || 'gbp')}`
                        : `Pay ${formatPrice(video.priceInCents!, video.currency || 'gbp')}`}
                    </>
                  )}
                </button>

                {/* Security note */}
                <p
                  className="text-xs text-center opacity-50"
                  style={{ color: primaryColor }}
                >
                  Secure payment powered by Stripe
                </p>

                {/* What you get */}
                <div
                  className="p-4 rounded-xl text-sm"
                  style={{ backgroundColor: `${primaryColor}08`, color: primaryColor }}
                >
                  <p className="font-medium mb-2">What you get:</p>
                  <ul className="space-y-1 opacity-80">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      Instant access to the full video
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      Unlimited streaming for 30 days
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      Support the artist directly
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default VideoPurchaseModal;
