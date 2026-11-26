import { useSyncExternalStore } from 'react';

import type { MealItem } from '@/data/types';

/**
 * Foods being collected on a builder screen: Create a meal (key "meal") or a
 * coach's meal plan (one key per meal, e.g. "breakfast"). The food search,
 * barcode scanner and portion screens add to the active key when opened from
 * a builder (with ?for=meal), then return to it.
 */

let drafts: Record<string, MealItem[]> = {};
let active = 'meal';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const EMPTY: MealItem[] = [];

export const mealDraft = {
  /** Where the next food from search/scan goes. */
  target(key: string) {
    active = key;
  },
  set(key: string, items: MealItem[]) {
    drafts = { ...drafts, [key]: items };
    emit();
  },
  add(item: MealItem, key = active) {
    drafts = { ...drafts, [key]: [...(drafts[key] ?? []), item] };
    emit();
  },
  remove(key: string, index: number) {
    drafts = { ...drafts, [key]: (drafts[key] ?? []).filter((_, i) => i !== index) };
    emit();
  },
  clear() {
    drafts = {};
    active = 'meal';
    emit();
  },
};

export function useMealDraft(key = 'meal') {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => drafts[key] ?? EMPTY,
    () => drafts[key] ?? EMPTY,
  );
}
