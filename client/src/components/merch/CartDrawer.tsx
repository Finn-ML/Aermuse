import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ShoppingCart, Plus, Minus, Trash2, Loader2, Package } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { AnimatePresence, motion } from 'framer-motion';

interface CartDrawerProps {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
}

export default function CartDrawer({ primaryColor, secondaryColor, textColor }: CartDrawerProps) {
  const [open, setOpen] = useState(false);
  const cart = useCart();

  if (cart.itemCount === 0 && !open) return null;

  return (
    <>
      {/* Floating Cart Button */}
      <AnimatePresence>
        {cart.itemCount > 0 && !open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            style={{ backgroundColor: primaryColor, color: secondaryColor }}
          >
            <ShoppingCart className="w-6 h-6" />
            <span
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
              style={{ backgroundColor: secondaryColor, color: primaryColor }}
            >
              {cart.itemCount}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Cart Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col"
          style={{
            backgroundColor: secondaryColor,
            color: textColor,
            border: `1px solid ${textColor}15`,
          }}
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2" style={{ color: textColor }}>
              <ShoppingCart className="w-5 h-5" />
              Your Cart ({cart.itemCount})
            </SheetTitle>
            <SheetDescription style={{ color: `${textColor}60` }}>
              Review your items before checkout
            </SheetDescription>
          </SheetHeader>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 opacity-50">
                <Package className="w-12 h-12 mb-3" style={{ color: textColor }} />
                <p className="text-sm" style={{ color: textColor }}>Your cart is empty</p>
              </div>
            ) : (
              cart.items.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId || 'default'}`}
                  className="flex gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: `${textColor}08`, border: `1px solid ${textColor}10` }}
                >
                  {/* Item Image */}
                  <div
                    className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
                    style={{ backgroundColor: `${textColor}10` }}
                  >
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 opacity-30" style={{ color: textColor }} />
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: textColor }}>
                      {item.name}
                    </p>
                    {item.variantName && (
                      <p className="text-xs mt-0.5" style={{ color: `${textColor}60` }}>
                        {item.variantName}
                      </p>
                    )}
                    <p className="text-sm font-semibold mt-1" style={{ color: primaryColor }}>
                      {`\u00A3${(item.price / 100).toFixed(2)}`}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={() => cart.updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                        className="w-6 h-6 rounded flex items-center justify-center transition-all"
                        style={{ backgroundColor: `${textColor}15`, color: textColor }}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-5 text-center" style={{ color: textColor }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => cart.updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                        className="w-6 h-6 rounded flex items-center justify-center transition-all"
                        style={{ backgroundColor: `${textColor}15`, color: textColor }}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Line Total + Remove */}
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => cart.removeItem(item.productId, item.variantId)}
                      className="p-1 rounded transition-all hover:opacity-70"
                      style={{ color: `${textColor}50` }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold" style={{ color: textColor }}>
                      {`\u00A3${((item.price * item.quantity) / 100).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer */}
          {cart.items.length > 0 && (
            <div
              className="pt-4 space-y-3"
              style={{ borderTop: `1px solid ${textColor}15` }}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium" style={{ color: textColor }}>Total</span>
                <span className="text-xl font-bold" style={{ color: primaryColor }}>
                  {`\u00A3${(cart.total / 100).toFixed(2)}`}
                </span>
              </div>
              <button
                onClick={cart.checkout}
                disabled={cart.isCheckingOut}
                className="w-full py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor, color: secondaryColor }}
              >
                {cart.isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Checkout'
                )}
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
