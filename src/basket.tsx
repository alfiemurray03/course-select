import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type BasketItem = {
  courseId: string;
  quantity: number;
};

type BasketContextValue = {
  items: BasketItem[];
  itemCount: number;
  licenceCount: number;
  addItem: (courseId: string, quantity: number) => void;
  setItemQuantity: (courseId: string, quantity: number) => void;
  removeItem: (courseId: string) => void;
  clearBasket: () => void;
};

const STORAGE_KEY = 'aptenvo-basket-v1';
const BasketContext = createContext<BasketContextValue | null>(null);

function normaliseQuantity(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(9999, Math.max(1, Math.floor(value)));
}

function loadBasket(): BasketItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is BasketItem => Boolean(
        item
        && typeof item === 'object'
        && typeof (item as BasketItem).courseId === 'string'
        && Number.isFinite((item as BasketItem).quantity),
      ))
      .map((item) => ({
        courseId: item.courseId,
        quantity: normaliseQuantity(item.quantity),
      }))
      .slice(0, 25);
  } catch {
    return [];
  }
}

export function BasketProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BasketItem[]>(loadBasket);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((courseId: string, quantity: number) => {
    const cleanQuantity = normaliseQuantity(quantity);
    setItems((current) => {
      const existing = current.find((item) => item.courseId === courseId);
      if (existing) {
        return current.map((item) => item.courseId === courseId
          ? { ...item, quantity: normaliseQuantity(item.quantity + cleanQuantity) }
          : item);
      }
      if (current.length >= 25) return current;
      return [...current, { courseId, quantity: cleanQuantity }];
    });
  }, []);

  const setItemQuantity = useCallback((courseId: string, quantity: number) => {
    const cleanQuantity = normaliseQuantity(quantity);
    setItems((current) => current.map((item) => item.courseId === courseId
      ? { ...item, quantity: cleanQuantity }
      : item));
  }, []);

  const removeItem = useCallback((courseId: string) => {
    setItems((current) => current.filter((item) => item.courseId !== courseId));
  }, []);

  const clearBasket = useCallback(() => setItems([]), []);

  const value = useMemo(() => ({
    items,
    itemCount: items.length,
    licenceCount: items.reduce((total, item) => total + item.quantity, 0),
    addItem,
    setItemQuantity,
    removeItem,
    clearBasket,
  }), [items, addItem, setItemQuantity, removeItem, clearBasket]);

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket() {
  const context = useContext(BasketContext);
  if (!context) throw new Error('useBasket must be used inside BasketProvider.');
  return context;
}
