import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { dayLabel } from '@/data/days';

export { dayLabel, stampFor } from '@/data/days';

/**
 * The day meals are being logged for on the Meals tab: today unless the user
 * stepped back to an earlier day. Shared by the Meals tab and the search,
 * scan, portion and photo screens it opens. Goes back to today whenever the
 * app is put away, so nobody logs tomorrow's breakfast into last Tuesday.
 */

const DAY = 86400000;
const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Midnight of the chosen day, or null for today. */
let chosen: number | null = null;
const listeners = new Set<() => void>();
const set = (next: number | null) => {
  chosen = next !== null && next >= startOfDay(Date.now()) ? null : next;
  listeners.forEach((l) => l());
};

AppState.addEventListener('change', (s) => {
  if (s === 'background' && chosen !== null) set(null);
});

export const MAX_DAYS_BACK = 60;

export function useLogDay() {
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => chosen,
    () => null, // the web build renders pages ahead of time
  );
  const today = startOfDay(Date.now());
  const day = value ?? today;
  return {
    /** Midnight of the day being logged. */
    day,
    isToday: value === null,
    /** "Today", "Yesterday" or "Wed, Nov 18". */
    label: dayLabel(day, today),
    back: () => {
      const prev = startOfDay(day - DAY / 2);
      if (today - prev <= MAX_DAYS_BACK * DAY) set(prev);
    },
    forward: () => set(startOfDay(day + DAY * 1.5)),
    toToday: () => set(null),
  };
}
