import { useState } from 'react';
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

export default function MerchStorefront({
  products,
  artistSlug,
  primaryColor,
  secondaryColor,
  textColor,
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
        {products.map((product) => {
          const images = (product.images as string[]) || [];
          const firstImage = images[0];

          return (
            <motion.div
              key={product.id}
              variants={cardVariants}
              className="rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02]"
              style={{
                backgroundColor: `${primaryColor}15`,
                border: `1px solid ${textColor}15`,
              }}
              onClick={() => setSelectedProduct(product)}
            >
              {/* Product Image */}
              <div
                className="aspect-square relative overflow-hidden"
                style={{ backgroundColor: `${textColor}08` }}
              >
                {firstImage ? (
                  <img
                    src={firstImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package
                      className="w-12 h-12 opacity-30"
                      style={{ color: textColor }}
                    />
                  </div>
                )}
                {/* Category Badge */}
                {product.category && (
                  <span
                    className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium"
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
        })}
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
        />
      )}
    </div>
  );
}
