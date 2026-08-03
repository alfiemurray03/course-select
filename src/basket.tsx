import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const ONLINE_LICENCE_LIMIT = 25;

type BasketItem = {
  courseId: string;
  quantity: number;
};

type BasketContextValue = {
  items: BasketItem[];
  itemCount: number;
  licenceCount: number;
  remainingLicenceCapacity: number;
  addItem: (courseId: string, quantity: number) => void;
  setItemQuantity: (courseId: string, quantity: number) => void;
  removeItem: (courseId: string) => void;
  clearBasket: () => void;
};

const STORAGE_KEY = 'aptenvo-basket-v1';
const BasketContext = createContext<BasketContextValue | null>(null);

function normaliseQuantity(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(ONLINE_LICENCE_LIMIT, Math.max(1, Math.floor(value)));
}

function capBasket(items: BasketItem[]) {
  const combined = new Map<string, number>();
  for (const item of items) {
    combined.set(item.courseId, (combined.get(item.courseId) ?? 0) + normaliseQuantity(item.quantity));
  }

  let remaining = ONLINE_LICENCE_LIMIT;
  const capped: BasketItem[] = [];
  for (const [courseId, requested] of combined) {
    if (remaining < 1) break;
    const quantity = Math.min(requested, remaining);
    capped.push({ courseId, quantity });
    remaining -= quantity;
  }
  return capped;
}

function loadBasket(): BasketItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return [];

    const valid = parsed
      .filter((item): item is BasketItem => Boolean(
        item
        && typeof item === 'object'
        && typeof (item as BasketItem).courseId === 'string'
        && Number.isFinite((item as BasketItem).quantity),
      ))
      .map((item) => ({ courseId: item.courseId, quantity: normaliseQuantity(item.quantity) }));

    return capBasket(valid);
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
    const requested = normaliseQuantity(quantity);
    setItems((current) => {
      const currentTotal = current.reduce((total, item) => total + item.quantity, 0);
      const remaining = ONLINE_LICENCE_LIMIT - currentTotal;
      if (remaining < 1) return current;

      const quantityToAdd = Math.min(requested, remaining);
      const existing = current.find((item) => item.courseId === courseId);
      if (existing) {
        return current.map((item) => item.courseId === courseId
          ? { ...item, quantity: item.quantity + quantityToAdd }
          : item);
      }
      return [...current, { courseId, quantity: quantityToAdd }];
    });
  }, []);

  const setItemQuantity = useCallback((courseId: string, quantity: number) => {
    const requested = normaliseQuantity(quantity);
    setItems((current) => {
      const otherTotal = current
        .filter((item) => item.courseId !== courseId)
        .reduce((total, item) => total + item.quantity, 0);
      const maximumForItem = Math.max(1, ONLINE_LICENCE_LIMIT - otherTotal);
      return current.map((item) => item.courseId === courseId
        ? { ...item, quantity: Math.min(requested, maximumForItem) }
        : item);
    });
  }, []);

  const removeItem = useCallback((courseId: string) => {
    setItems((current) => current.filter((item) => item.courseId !== courseId));
  }, []);

  const clearBasket = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const licenceCount = items.reduce((total, item) => total + item.quantity, 0);
    return {
      items,
      itemCount: items.length,
      licenceCount,
      remainingLicenceCapacity: Math.max(0, ONLINE_LICENCE_LIMIT - licenceCount),
      addItem,
      setItemQuantity,
      removeItem,
      clearBasket,
    };
  }, [items, addItem, setItemQuantity, removeItem, clearBasket]);

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket() {
  const context = useContext(BasketContext);
  if (!context) throw new Error('useBasket must be used inside BasketProvider.');
  return context;
}
