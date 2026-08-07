import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const LEARNING_COURSE_LIMIT = 25;

export type LearningCourseBasketItem = {
  courseSlug: string;
};

type LearningCourseBasketContextValue = {
  items: LearningCourseBasketItem[];
  itemCount: number;
  addItem: (courseSlug: string) => void;
  removeItem: (courseSlug: string) => void;
  clearBasket: () => void;
  contains: (courseSlug: string) => boolean;
};

const STORAGE_KEY = 'sousa-murray-learning-course-basket-v2';
const LearningCourseBasketContext = createContext<LearningCourseBasketContextValue | null>(null);

function loadBasket(): LearningCourseBasketItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return [];
    const slugs = new Set<string>();
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const slug = String((item as LearningCourseBasketItem).courseSlug || '').trim();
      if (!slug || slugs.size >= LEARNING_COURSE_LIMIT) continue;
      slugs.add(slug);
    }
    return [...slugs].map((courseSlug) => ({ courseSlug }));
  } catch {
    return [];
  }
}

export function LearningCourseBasketProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<LearningCourseBasketItem[]>(loadBasket);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((courseSlug: string) => {
    const slug = courseSlug.trim();
    if (!slug) return;
    setItems((current) => {
      if (current.some((item) => item.courseSlug === slug) || current.length >= LEARNING_COURSE_LIMIT) return current;
      return [...current, { courseSlug: slug }];
    });
  }, []);

  const removeItem = useCallback((courseSlug: string) => {
    setItems((current) => current.filter((item) => item.courseSlug !== courseSlug));
  }, []);

  const clearBasket = useCallback(() => setItems([]), []);
  const contains = useCallback((courseSlug: string) => items.some((item) => item.courseSlug === courseSlug), [items]);

  const value = useMemo(() => ({ items, itemCount: items.length, addItem, removeItem, clearBasket, contains }), [items, addItem, removeItem, clearBasket, contains]);

  return <LearningCourseBasketContext.Provider value={value}>{children}</LearningCourseBasketContext.Provider>;
}

export function useLearningCourseBasket() {
  const context = useContext(LearningCourseBasketContext);
  if (!context) throw new Error('useLearningCourseBasket must be used inside LearningCourseBasketProvider.');
  return context;
}
