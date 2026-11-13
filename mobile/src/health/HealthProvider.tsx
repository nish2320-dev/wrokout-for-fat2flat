import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { KEEP_DAYS } from '@/data/health';
import { useStore } from '@/data/store';

import { healthAppName, healthAvailable, openHealthSettings, pullHealth, requestHealth, writeMeal, writeWorkout } from './native';

/**
 * Keeps Fat2Flat in step with Apple Health / Health Connect once the user
 * connects it: reads the last few weeks when the app opens or comes back to
 * the front, and saves each finished workout and logged meal to the health app.
 */

type Health = {
  /** "Apple Health" / "Health Connect", or null where there is none (web). */
  appName: string | null;
  available: boolean;
  connected: boolean;
  syncing: boolean;
  /** Shows the permission sheet, then reads. Resolves false if it couldn't connect. */
  connect: () => Promise<boolean>;
  disconnect: () => void;
  sync: () => Promise<void>;
  openSettings: () => void;
};

const Ctx = createContext<Health | null>(null);
const DAY = 86400000;

export function HealthProvider({ children }: { children: ReactNode }) {
  const { state, ready, applyHealth, updateHealth } = useStore();
  const [available, setAvailable] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const connected = !!state.health?.enabled;
  const busy = useRef(false);

  useEffect(() => {
    healthAvailable().then(setAvailable).catch(() => setAvailable(false));
  }, []);

  const sync = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setSyncing(true);
    try {
      // the first read goes back the full window; later ones overlap a few days to catch late watch syncs
      const last = state.health?.lastSyncAt;
      const since = last ? Math.max(last - 3 * DAY, Date.now() - KEEP_DAYS * DAY) : Date.now() - KEEP_DAYS * DAY;
      applyHealth(await pullHealth(since));
    } catch {
      // permissions withdrawn or the health app unavailable: keep what we have
    } finally {
      busy.current = false;
      setSyncing(false);
    }
  }, [state.health?.lastSyncAt, applyHealth]);

  // read when the app opens and whenever it comes back to the front
  useEffect(() => {
    if (!ready || !connected) return;
    sync();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') sync();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, connected]);

  // save new workouts and meals to the health app; anything already there when we start is left alone
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!ready) return;
    const ids = [...state.workouts.filter((w) => w.finishedAt !== undefined).map((w) => `w:${w.id}`), ...state.meals.map((m) => `m:${m.id}`)];
    if (!connected || seen.current === null) {
      seen.current = new Set(ids);
      return;
    }
    for (const w of state.workouts) {
      if (w.finishedAt === undefined || seen.current.has(`w:${w.id}`)) continue;
      seen.current.add(`w:${w.id}`);
      writeWorkout({ start: w.startedAt, end: w.finishedAt, name: w.name }).catch(() => {});
    }
    for (const m of state.meals) {
      if (seen.current.has(`m:${m.id}`)) continue;
      seen.current.add(`m:${m.id}`);
      writeMeal({ at: m.at, calories: m.calories, protein: m.protein, name: m.name }).catch(() => {});
    }
  }, [ready, connected, state.workouts, state.meals]);

  const value = useMemo<Health>(
    () => ({
      appName: healthAppName,
      available,
      connected,
      syncing,
      async connect() {
        if (!(await requestHealth())) return false;
        const pull = await pullHealth(Date.now() - KEEP_DAYS * DAY);
        applyHealth(pull);
        updateHealth({ enabled: true });
        return true;
      },
      disconnect() {
        updateHealth(null);
      },
      sync,
      openSettings: openHealthSettings,
    }),
    [available, connected, syncing, sync, applyHealth, updateHealth],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHealth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useHealth must be used inside <HealthProvider>');
  return v;
}
