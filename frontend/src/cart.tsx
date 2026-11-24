import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type CartResponse } from './api';
import { useAuth } from './auth';

interface CartState {
  cart: CartResponse | null;
  count: number;
  refresh: () => Promise<void>;
  setQuantity: (bookId: number, quantity: number) => Promise<void>;
  remove: (bookId: number) => Promise<void>;
  addOne: (bookId: number) => Promise<void>;
}

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartResponse | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setCart(null);
      return;
    }
    try {
      setCart(await api<CartResponse>('/cart'));
    } catch {
      setCart(null);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<CartState>(
    () => ({
      cart,
      count: cart?.items.length ?? 0,
      refresh,
      async setQuantity(bookId, quantity) {
        setCart(await api<CartResponse>(`/cart/items/${bookId}`, { method: 'PUT', body: { quantity } }));
      },
      async remove(bookId) {
        setCart(await api<CartResponse>(`/cart/items/${bookId}`, { method: 'DELETE' }));
      },
      async addOne(bookId) {
        const existing = cart?.items.find((i) => i.book.id === bookId)?.quantity ?? 0;
        setCart(await api<CartResponse>(`/cart/items/${bookId}`, { method: 'PUT', body: { quantity: existing + 1 } }));
      },
    }),
    [cart, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
