import { useState, useEffect } from 'react';
import { X, Download, CheckCircle2, Mail, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PurchaseSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  downloadToken: string | null;
  trackTitle?: string;
  artistName?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export function PurchaseSuccessModal({
  isOpen,
  onClose,
  downloadToken,
  trackTitle = 'your track',
  artistName,
  primaryColor = '#660033',
  secondaryColor = '#F7E6CA',
}: PurchaseSuccessModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);

  const downloadUrl = downloadToken ? `/api/downloads/${downloadToken}` : null;

  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!downloadUrl) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(errorData.error || `Download failed (${response.status})`);
      }

      // Extract filename from Content-Disposition header
      const disposition = response.headers.get('Content-Disposition');
      let filename = `${trackTitle}.mp3`;
      if (disposition) {
        const match = disposition.match(/filename="?([^";\n]+)"?/);
        if (match) filename = match[1];
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadCount(prev => prev + 1);
    } catch (err: any) {
      console.error('Download error:', err);
      setDownloadError(err.message || 'Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
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

              {/* Success header */}
              <div
                className="px-6 py-8 text-center"
                style={{ backgroundColor: primaryColor }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1, damping: 15 }}
                >
                  <CheckCircle2
                    className="w-16 h-16 mx-auto mb-4"
                    style={{ color: secondaryColor }}
                  />
                </motion.div>
                <h2
                  className="text-2xl font-bold mb-2"
                  style={{ color: secondaryColor }}
                >
                  Purchase Complete!
                </h2>
                <p
                  className="opacity-90"
                  style={{ color: secondaryColor }}
                >
                  Thank you for your purchase
                </p>
              </div>

              {/* Content */}
              <div className="px-6 py-6 space-y-6">
                {/* Track info */}
                <div className="text-center">
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: primaryColor }}
                  >
                    {trackTitle}
                  </h3>
                  {artistName && (
                    <p className="text-sm opacity-70" style={{ color: primaryColor }}>
                      by {artistName}
                    </p>
                  )}
                </div>

                {/* Download button */}
                {downloadToken && (
                  <>
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="w-full py-4 px-6 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                      style={{
                        backgroundColor: primaryColor,
                        color: secondaryColor
                      }}
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-6 h-6" />
                          Download Your Track
                        </>
                      )}
                    </button>
                    {downloadError && (
                      <p className="text-sm text-center text-red-600">
                        {downloadError}
                      </p>
                    )}
                  </>
                )}

                {/* Info cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="p-4 rounded-xl text-center"
                    style={{ backgroundColor: `${primaryColor}10` }}
                  >
                    <Mail
                      className="w-6 h-6 mx-auto mb-2 opacity-70"
                      style={{ color: primaryColor }}
                    />
                    <p
                      className="text-xs font-medium opacity-70"
                      style={{ color: primaryColor }}
                    >
                      Receipt Sent
                    </p>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: primaryColor }}
                    >
                      Check Email
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-xl text-center"
                    style={{ backgroundColor: `${primaryColor}10` }}
                  >
                    <Clock
                      className="w-6 h-6 mx-auto mb-2 opacity-70"
                      style={{ color: primaryColor }}
                    />
                    <p
                      className="text-xs font-medium opacity-70"
                      style={{ color: primaryColor }}
                    >
                      Link Expires
                    </p>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: primaryColor }}
                    >
                      30 Days
                    </p>
                  </div>
                </div>

                {/* Download info */}
                <div
                  className="p-4 rounded-xl text-sm"
                  style={{
                    backgroundColor: `${primaryColor}08`,
                    color: primaryColor
                  }}
                >
                  <p className="font-medium mb-2">Download Information:</p>
                  <ul className="space-y-1 opacity-80">
                    <li>• You can download this track up to 5 times</li>
                    <li>• Download link expires in 30 days</li>
                    <li>• A copy has been sent to your email</li>
                  </ul>
                </div>

                {/* Consumer rights notice */}
                <p
                  className="text-xs text-center opacity-60 leading-relaxed"
                  style={{ color: primaryColor }}
                >
                  By completing this purchase, you acknowledged waiving your 14-day
                  cancellation right for immediate access to digital content under
                  the Consumer Contracts Regulations 2013.
                </p>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="w-full py-3 px-6 rounded-xl font-medium text-sm transition-all hover:opacity-80 border-2"
                  style={{
                    borderColor: primaryColor,
                    color: primaryColor,
                    backgroundColor: 'transparent',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default PurchaseSuccessModal;
