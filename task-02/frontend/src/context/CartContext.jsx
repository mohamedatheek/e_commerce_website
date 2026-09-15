import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'northline_cart_v1';
const CartContext = createContext(null);

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => loadCart());
  const safeItems = Array.isArray(items) ? items : [];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeItems));
  }, [safeItems]);

  const addItem = useCallback((product, quantity = 1) => {
    const available = Number(product.availableStock ?? 0);
    if (available <= 0) {
      throw new Error('This product is out of stock');
    }

    setItems((current) => {
      const list = Array.isArray(current) ? current : [];
      const existing = list.find((item) => item.productId === product.id);
      const nextQuantity = (existing?.quantity || 0) + quantity;
      if (nextQuantity > available) {
        throw new Error(`Only ${available} available`);
      }
      if (existing) {
        return list.map((item) =>
          item.productId === product.id ? { ...item, quantity: nextQuantity, availableStock: available } : item
        );
      }
      return [
        ...list,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          quantity,
          availableStock: available,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((productId, quantity, availableStock) => {
    setItems((current) =>
      (Array.isArray(current) ? current : []).map((item) => {
        if (item.productId !== productId) return item;
        const max = availableStock ?? item.availableStock ?? 99;
        const next = Math.min(Math.max(1, quantity), max);
        return { ...item, quantity: next };
      })
    );
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((current) => (Array.isArray(current) ? current : []).filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = safeItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = safeItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const value = useMemo(
    () => ({
      items: safeItems,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      itemCount,
      subtotal,
    }),
    [safeItems, addItem, setQuantity, removeItem, clearCart, itemCount, subtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
