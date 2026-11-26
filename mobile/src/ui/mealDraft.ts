import { useSyncExternalStore } from 'react';

import type { MealItem } from '@/data/types';

/**
 * The foods of the meal being built on the Create a meal screen. The food
 * search, barcode scanner and portion screens add to it when opened from
 * there (with ?for=meal), then return to the builder.
 */

let items: MealItem[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const mealDraft = {
  set(next: MealItem[]) {
    items = next;
    emit();
  },
  add(item: MealItem) {
    items = [...items, item];
    emit();
  },
  remove(index: number) {
    items = items.filter((_, i) => i !== index);
    emit();
  },
};

export function useMealDraft() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => items,
    () => items,
  );
}
