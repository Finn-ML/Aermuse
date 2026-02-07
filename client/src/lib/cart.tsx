import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiRequest } from './queryClient';

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  price: number; // cents
  quantity: number;
  image?: string;
}

interface CartState {
  items: CartItem[];
  artistSlug: string;
}

interface CartContextType {
  items: CartItem[];
  artistSlug: string;
  addItem: (item: Omit<CartItem, 'quantity'>, artistSlug: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  checkout: () => Promise<void>;
  isCheckingOut: boolean;
}

const STORAGE_KEY = 'aermuse-cart';

const CartContext = createContext<CartContextType | null>(null);

function loadCart(): CartState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && Array.isArray(parsed.items) && typeof parsed.artistSlug === 'string') {
        return parsed;
      }
    }
  } catch {
    // ignore parse errors
  }
  return { items: [], artistSlug: '' };
}

function saveCart(state: CartState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart().items);
  const [artistSlug, setArtistSlug] = useState<string>(() => loadCart().artistSlug);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    saveCart({ items, artistSlug });
  }, [items, artistSlug]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, slug: string) => {
    setItems(prev => {
      // If different artist, clear cart first
      let current = prev;
      if (artistSlug && slug !== artistSlug) {
        current = [];
      }
      setArtistSlug(slug);

      const existing = current.find(
        i => i.productId === item.productId && i.variantId === item.variantId
      );
      if (existing) {
        return current.map(i =>
          i.productId === item.productId && i.variantId === item.variantId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...current, { ...item, quantity: 1 }];
    });
  }, [artistSlug]);

  const removeItem = useCallback((productId: string, variantId?: string) => {
    setItems(prev => prev.filter(
      i => !(i.productId === productId && i.variantId === variantId)
    ));
  }, []);

  const updateQuantity = useCallback((productId: string, variantId: string | undefined, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return;
    }
    setItems(prev => prev.map(i =>
      i.productId === productId && i.variantId === variantId
        ? { ...i, quantity }
        : i
    ));
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    setArtistSlug('');
  }, []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const checkout = useCallback(async () => {
    if (items.length === 0) return;
    setIsCheckingOut(true);
    try {
      const res = await apiRequest('POST', '/api/merch/checkout', {
        items: items.map(i => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        artistSlug,
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setIsCheckingOut(false);
    }
  }, [items, artistSlug]);

  return (
    <CartContext.Provider value={{
      items,
      artistSlug,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      total,
      itemCount,
      checkout,
      isCheckingOut,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
