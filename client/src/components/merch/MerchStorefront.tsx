import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import type { MerchProduct, MerchVariant } from '@shared/schema';
import ProductDetail from './ProductDetail';

interface MerchStorefrontProps {
  products: Array<MerchProduct & { variants: MerchVariant[] }>;
  artistSlug: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  checkoutEnabled?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', damping: 25, stiffness: 120 },
  },
};

function ProductCard({
  product,
  primaryColor,
  textColor,
  onClick,
}: {
  product: MerchProduct & { variants: MerchVariant[] };
  primaryColor: string;
  textColor: string;
  onClick: () => void;
}) {
  const images = (product.images as string[]) || [];
  const firstImage = images[0];
  const previewVideo = product.previewVideo as string | null;
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isHovered) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isHovered]);

  return (
    <motion.div
      variants={cardVariants}
      className="rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02]"
      style={{
        backgroundColor: `${primaryColor}15`,
        border: `1px solid ${textColor}15`,
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image / Video */}
      <div
        className="aspect-square relative overflow-hidden"
        style={{ backgroundColor: `${textColor}08` }}
      >
        {firstImage ? (
          <img
            src={firstImage}
            alt={product.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isHovered && previewVideo ? 'opacity-0' : 'opacity-100'
            }`}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center transition-opacity duration-300 ${
            isHovered && previewVideo ? 'opacity-0' : 'opacity-100'
          }`}>
            <Package
              className="w-12 h-12 opacity-30"
              style={{ color: textColor }}
            />
          </div>
        )}

        {previewVideo && (
          <video
            ref={videoRef}
            src={previewVideo}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
            muted
            loop
            playsInline
            preload="auto"
          />
        )}

        {/* Category Badge */}
        {product.category && (
          <span
            className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium z-10"
            style={{
              backgroundColor: `${primaryColor}30`,
              color: textColor,
            }}
          >
            {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
          </span>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3">
        <h3
          className="font-semibold text-sm truncate"
          style={{ color: textColor }}
        >
          {product.name}
        </h3>
        <p
          className="text-sm mt-1 font-medium"
          style={{ color: primaryColor }}
        >
          {`\u00A3${(product.basePrice / 100).toFixed(2)}`}
        </p>
      </div>
    </motion.div>
  );
}

export default function MerchStorefront({
  products,
  artistSlug,
  primaryColor,
  secondaryColor,
  textColor,
  checkoutEnabled = true,
}: MerchStorefrontProps) {
  const [selectedProduct, setSelectedProduct] = useState<
    (MerchProduct & { variants: MerchVariant[] }) | null
  >(null);

  if (products.length === 0) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-2xl font-bold mb-6 text-center"
        style={{ color: textColor }}
      >
        Merchandise
      </motion.h2>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            primaryColor={primaryColor}
            textColor={textColor}
            onClick={() => setSelectedProduct(product)}
          />
        ))}
      </motion.div>

      {/* Product Detail Dialog */}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          artistSlug={artistSlug}
          open={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          textColor={textColor}
          checkoutEnabled={checkoutEnabled}
        />
      )}
    </div>
  );
}
