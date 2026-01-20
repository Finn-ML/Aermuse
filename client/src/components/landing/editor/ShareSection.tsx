import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Download, Share2 } from 'lucide-react';

interface ShareSectionProps {
  slug: string;
}

export function ShareSection({ slug }: ShareSectionProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const pageUrl = `${window.location.origin}/artist/${slug}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    canvas.width = 256;
    canvas.height = 256;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 256, 256);
      const link = document.createElement('a');
      link.download = `${slug}-qr-code.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)));
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent('Check out my artist page!');
    const url = encodeURIComponent(pageUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(pageUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const handleShareLinkedIn = () => {
    const url = encodeURIComponent(pageUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  return (
    <div className="p-4 rounded-xl bg-white/60">
      <h4 className="text-sm font-bold text-[#660033] mb-4 flex items-center gap-2">
        <Share2 size={16} />
        Share Your Page
      </h4>

      {/* QR Code */}
      <div className="flex flex-col items-center mb-4">
        <div ref={qrRef} className="bg-white p-3 rounded-lg shadow-sm">
          <QRCodeSVG
            value={pageUrl}
            size={140}
            level="M"
            includeMargin={false}
          />
        </div>
        <button
          onClick={handleDownloadQR}
          className="mt-2 flex items-center gap-1.5 text-xs text-[#660033] hover:text-[#8B0045] transition-colors"
        >
          <Download size={14} />
          Download QR Code
        </button>
      </div>

      {/* URL Copy Section */}
      <div className="mb-4">
        <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-1">
          Page URL
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={pageUrl}
            readOnly
            className="flex-1 px-3 py-2 rounded-lg bg-white border border-[rgba(102,0,51,0.1)] text-sm text-[#660033] truncate"
          />
          <button
            onClick={handleCopyLink}
            className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-1.5 ${
              copied
                ? 'bg-green-100 text-green-700'
                : 'bg-[#660033] text-white hover:bg-[#8B0045]'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Social Share Buttons */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2">
          Share on Social
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleShareTwitter}
            className="flex-1 px-3 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            X / Twitter
          </button>
          <button
            onClick={handleShareFacebook}
            className="flex-1 px-3 py-2 rounded-lg bg-[#1877F2] text-white text-sm font-medium hover:bg-[#166FE5] transition-colors"
          >
            Facebook
          </button>
          <button
            onClick={handleShareLinkedIn}
            className="flex-1 px-3 py-2 rounded-lg bg-[#0A66C2] text-white text-sm font-medium hover:bg-[#004182] transition-colors"
          >
            LinkedIn
          </button>
        </div>
      </div>
    </div>
  );
}
