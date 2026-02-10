import { useState, useMemo } from 'react';
import { Package, Minus, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useCart } from '@/lib/cart';
import { useToast } from '@/hooks/use-toast';
import type { MerchProduct, MerchVariant } from '@shared/schema';

interface ProductDetailProps {
  product: MerchProduct & { variants: MerchVariant[] };
  artistSlug: string;
  open: boolean;
  onClose: () => void;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  checkoutEnabled?: boolean;
}

export default function ProductDetail({
  product,
  artistSlug,
  open,
  onClose,
  primaryColor,
  secondaryColor,
  textColor,
  checkoutEnabled = true,
}: ProductDetailProps) {
  const { addItem } = useCart();
  const { toast } = useToast();

  const images = (product.images as string[]) || [];
  const firstImage = images[0];
  const variants = product.variants || [];

  const sizes = useMemo(
    () => Array.from(new Set(variants.map((v) => v.size).filter(Boolean))) as string[],
    [variants]
  );
  const colors = useMemo(
    () => Array.from(new Set(variants.map((v) => v.color).filter(Boolean))) as string[],
    [variants]
  );

  const [selectedSize, setSelectedSize] = useState<string | null>(sizes[0] || null);
  const [selectedColor, setSelectedColor] = useState<string | null>(colors[0] || null);
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = useMemo(() => {
    if (variants.length === 0) return null;
    return variants.find((v) => {
      const sizeMatch = !sizes.length || v.size === selectedSize;
      const colorMatch = !colors.length || v.color === selectedColor;
      return sizeMatch && colorMatch && v.isActive;
    }) || null;
  }, [variants, selectedSize, selectedColor, sizes.length, colors.length]);

  const price = selectedVariant?.priceOverride ?? product.basePrice;
  const maxQuantity = selectedVariant ? Math.min(selectedVariant.inventory, 10) : 10;

  const handleAddToCart = () => {
    addItem(
      {
        productId: product.id,
        variantId: selectedVariant?.id,
        name: product.name,
        variantName: selectedVariant?.name,
        price,
        image: firstImage,
      },
      artistSlug
    );
    toast({
      title: 'Added to cart',
      description: `${product.name}${selectedVariant ? ` - ${selectedVariant.name}` : ''} added to your cart.`,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="max-w-lg"
        style={{
          backgroundColor: secondaryColor,
          color: textColor,
          border: `1px solid ${textColor}20`,
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: textColor }}>{product.name}</DialogTitle>
          <DialogDescription style={{ color: `${textColor}80` }}>
            {product.description || 'Merchandise item'}
          </DialogDescription>
        </DialogHeader>

        {/* Product Image */}
        <div
          className="aspect-square rounded-lg overflow-hidden mb-4"
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
              <Package className="w-16 h-16 opacity-30" style={{ color: textColor }} />
            </div>
          )}
        </div>

        {/* Size Selector */}
        {sizes.length > 0 && (
          <div className="mb-3">
            <label className="text-sm font-medium mb-1.5 block" style={{ color: `${textColor}90` }}>
              Size
            </label>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: selectedSize === size ? primaryColor : `${textColor}10`,
                    color: selectedSize === size ? secondaryColor : textColor,
                    border: `1px solid ${selectedSize === size ? primaryColor : `${textColor}20`}`,
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color Selector */}
        {colors.length > 0 && (
          <div className="mb-3">
            <label className="text-sm font-medium mb-1.5 block" style={{ color: `${textColor}90` }}>
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: selectedColor === color ? primaryColor : `${textColor}10`,
                    color: selectedColor === color ? secondaryColor : textColor,
                    border: `1px solid ${selectedColor === color ? primaryColor : `${textColor}20`}`,
                  }}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity Selector */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-1.5 block" style={{ color: `${textColor}90` }}>
            Quantity
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{
                backgroundColor: `${textColor}10`,
                color: textColor,
                border: `1px solid ${textColor}20`,
              }}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-lg font-semibold w-8 text-center" style={{ color: textColor }}>
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{
                backgroundColor: `${textColor}10`,
                color: textColor,
                border: `1px solid ${textColor}20`,
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Price + Add to Cart */}
        <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${textColor}15` }}>
          <span className="text-xl font-bold" style={{ color: primaryColor }}>
            {`\u00A3${(price / 100).toFixed(2)}`}
          </span>
          {checkoutEnabled ? (
            <button
              onClick={handleAddToCart}
              className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: primaryColor, color: secondaryColor }}
            >
              Add to Cart
            </button>
          ) : (
            <span className="text-xs font-medium opacity-60" style={{ color: textColor }}>
              Coming soon
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
