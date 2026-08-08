import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { legacyProgrammeAliases } from './legacyProgrammeAliases';

export const LEARNING_COURSE_LIMIT = 25;
export const LEARNING_COURSE_BASKET_SYNC_EVENT = 'sousa-murray-learning-course-basket-sync';

export type LearningCourseBasketItem = { courseSlug: string };

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

function canonicalSlug(value: string) {
  const slug = value.trim();
  return legacyProgrammeAliases.get(slug) ?? slug;
}

function normaliseStoredItems(value: unknown): LearningCourseBasketItem[] {
  if (!Array.isArray(value)) return [];
  const slugs = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const rawSlug = String((item as LearningCourseBasketItem).courseSlug || '').trim();
    if (!rawSlug || slugs.size >= LEARNING_COURSE_LIMIT) continue;
    slugs.add(canonicalSlug(rawSlug));
  }
  return [...slugs].map((courseSlug) => ({ courseSlug }));
}

function loadBasket(): LearningCourseBasketItem[] {
  try { return normaliseStoredItems(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return []; }
}

export function addLearningCourseToStoredBasket(courseSlug: string) {
  const slug = canonicalSlug(courseSlug);
  if (!slug) return false;
  const current = loadBasket();
  if (current.some((item) => item.courseSlug === slug)) return true;
  if (current.length >= LEARNING_COURSE_LIMIT) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, { courseSlug: slug }]));
  window.dispatchEvent(new Event(LEARNING_COURSE_BASKET_SYNC_EVENT));
  return true;
}

export function LearningCourseBasketProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<LearningCourseBasketItem[]>(loadBasket);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }, [items]);
  useEffect(() => {
    const synchronise = () => setItems(loadBasket());
    window.addEventListener(LEARNING_COURSE_BASKET_SYNC_EVENT, synchronise);
    return () => window.removeEventListener(LEARNING_COURSE_BASKET_SYNC_EVENT, synchronise);
  }, []);

  const addItem = useCallback((courseSlug: string) => {
    const slug = canonicalSlug(courseSlug);
    if (!slug) return;
    setItems((current) => {
      if (current.some((item) => item.courseSlug === slug) || current.length >= LEARNING_COURSE_LIMIT) return current;
      return [...current, { courseSlug: slug }];
    });
  }, []);

  const removeItem = useCallback((courseSlug: string) => {
    const slug = canonicalSlug(courseSlug);
    setItems((current) => current.filter((item) => item.courseSlug !== slug));
  }, []);
  const clearBasket = useCallback(() => setItems([]), []);
  const contains = useCallback((courseSlug: string) => {
    const slug = canonicalSlug(courseSlug);
    return items.some((item) => item.courseSlug === slug);
  }, [items]);

  const value = useMemo(() => ({ items, itemCount: items.length, addItem, removeItem, clearBasket, contains }), [items, addItem, removeItem, clearBasket, contains]);
  return <LearningCourseBasketContext.Provider value={value}>{children}</LearningCourseBasketContext.Provider>;
}

export function useLearningCourseBasket() {
  const context = useContext(LearningCourseBasketContext);
  if (!context) throw new Error('useLearningCourseBasket must be used inside LearningCourseBasketProvider.');
  return context;
}
