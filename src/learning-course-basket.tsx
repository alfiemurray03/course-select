import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const LEARNING_COURSE_LICENCE_LIMIT = 25;

export type LearningCourseBasketItem = {
  courseSlug: string;
  quantity: number;
};

type LearningCourseBasketContextValue = {
  items: LearningCourseBasketItem[];
  itemCount: number;
  licenceCount: number;
  remainingLicenceCapacity: number;
  addItem: (courseSlug: string, quantity?: number) => void;
  setItemQuantity: (courseSlug: string, quantity: number) => void;
  removeItem: (courseSlug: string) => void;
  clearBasket: () => void;
};

const STORAGE_KEY = 'sousa-murray-learning-course-basket-v1';
const LearningCourseBasketContext = createContext<LearningCourseBasketContextValue | null>(null);

function normaliseQuantity(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(LEARNING_COURSE_LICENCE_LIMIT, Math.max(1, Math.floor(value)));
}

function capBasket(items: LearningCourseBasketItem[]) {
  const combined = new Map<string, number>();
  for (const item of items) {
    if (!item.courseSlug) continue;
    combined.set(item.courseSlug, (combined.get(item.courseSlug) ?? 0) + normaliseQuantity(item.quantity));
  }

  let remaining = LEARNING_COURSE_LICENCE_LIMIT;
  const capped: LearningCourseBasketItem[] = [];
  for (const [courseSlug, requested] of combined) {
    if (remaining < 1) break;
    const quantity = Math.min(requested, remaining);
    capped.push({ courseSlug, quantity });
    remaining -= quantity;
  }
  return capped;
}

function loadBasket(): LearningCourseBasketItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return [];
    return capBasket(parsed.filter((item): item is LearningCourseBasketItem => Boolean(
      item
      && typeof item === 'object'
      && typeof (item as LearningCourseBasketItem).courseSlug === 'string'
      && Number.isFinite((item as LearningCourseBasketItem).quantity),
    )));
  } catch {
    return [];
  }
}

export function LearningCourseBasketProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<LearningCourseBasketItem[]>(loadBasket);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((courseSlug: string, quantity = 1) => {
    const requested = normaliseQuantity(quantity);
    setItems((current) => {
      const currentTotal = current.reduce((total, item) => total + item.quantity, 0);
      const remaining = LEARNING_COURSE_LICENCE_LIMIT - currentTotal;
      if (remaining < 1) return current;
      const quantityToAdd = Math.min(requested, remaining);
      const existing = current.find((item) => item.courseSlug === courseSlug);
      if (existing) {
        return current.map((item) => item.courseSlug === courseSlug
          ? { ...item, quantity: Math.min(LEARNING_COURSE_LICENCE_LIMIT, item.quantity + quantityToAdd) }
          : item);
      }
      return [...current, { courseSlug, quantity: quantityToAdd }];
    });
  }, []);

  const setItemQuantity = useCallback((courseSlug: string, quantity: number) => {
    const requested = normaliseQuantity(quantity);
    setItems((current) => {
      const otherTotal = current.filter((item) => item.courseSlug !== courseSlug).reduce((total, item) => total + item.quantity, 0);
      const maximumForItem = Math.max(1, LEARNING_COURSE_LICENCE_LIMIT - otherTotal);
      return current.map((item) => item.courseSlug === courseSlug
        ? { ...item, quantity: Math.min(requested, maximumForItem) }
        : item);
    });
  }, []);

  const removeItem = useCallback((courseSlug: string) => {
    setItems((current) => current.filter((item) => item.courseSlug !== courseSlug));
  }, []);

  const clearBasket = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const licenceCount = items.reduce((total, item) => total + item.quantity, 0);
    return {
      items,
      itemCount: items.length,
      licenceCount,
      remainingLicenceCapacity: Math.max(0, LEARNING_COURSE_LICENCE_LIMIT - licenceCount),
      addItem,
      setItemQuantity,
      removeItem,
      clearBasket,
    };
  }, [items, addItem, setItemQuantity, removeItem, clearBasket]);

  return <LearningCourseBasketContext.Provider value={value}>{children}</LearningCourseBasketContext.Provider>;
}

export function useLearningCourseBasket() {
  const context = useContext(LearningCourseBasketContext);
  if (!context) throw new Error('useLearningCourseBasket must be used inside LearningCourseBasketProvider.');
  return context;
}
