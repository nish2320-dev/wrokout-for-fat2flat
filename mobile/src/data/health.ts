import { startOfDay } from './stats';
import { AppState, HealthDay, HealthState, HealthWorkout, WeighIn } from './types';

/**
 * Data from Apple Health (iPhone) or Health Connect (Android): steps, active
 * calories, sleep, resting heart rate, smart-scale weigh-ins and workouts
 * recorded by a watch. The native side (src/health/) reads it; everything here
 * is pure so `npm run check` covers it.
 */

const DAY = 86400000;
const KG_TO_LB = 2.20462;

/** How much history is kept on the phone (and shared with a coach). */
export const KEEP_DAYS = 35;

export type HealthPull = {
  days: HealthDay[];
  workouts: HealthWorkout[];
  weights: { id: string; at: number; kg: number }[];
  bodyFat?: { at: number; percent: number };
};

// sharing with a coach is the client's choice, so it starts off
export const emptyHealth = (): HealthState => ({ enabled: true, shareWithCoach: false, days: [], workouts: [] });

/**
 * Folds a fresh read into the saved state. Days and workouts are replaced by
 * id; smart-scale weights become weigh-ins (in the user's units) unless the
 * user already typed in about the same weight around the same time.
 */
export function mergeHealth(state: AppState, pull: HealthPull, now: number): AppState {
  const base = state.health ?? emptyHealth();
  const cutoff = startOfDay(now) - KEEP_DAYS * DAY;

  const days = new Map(base.days.map((d) => [d.date, d]));
  for (const d of pull.days) days.set(d.date, { ...days.get(d.date), ...d });

  const workouts = new Map(base.workouts.map((w) => [w.id, w]));
  for (const w of pull.workouts) workouts.set(w.id, w);

  const toUnits = (kg: number) => Math.round((state.profile.units === 'lb' ? kg * KG_TO_LB : kg) * 10) / 10;
  const close = state.profile.units === 'lb' ? 1 : 0.5;
  const weighIns: WeighIn[] = [...state.weighIns];
  const known = new Set(weighIns.map((w) => w.hid).filter(Boolean));
  for (const w of pull.weights) {
    if (known.has(w.id) || w.kg < 20 || w.kg > 400) continue;
    const weight = toUnits(w.kg);
    const typedIn = weighIns.some((x) => !x.hid && Math.abs(x.at - w.at) < 3 * 3600000 && Math.abs(x.weight - weight) <= close);
    if (typedIn) continue;
    weighIns.push({ at: w.at, weight, hid: w.id });
    known.add(w.id);
  }
  weighIns.sort((a, b) => a.at - b.at);

  const bodyFat = pull.bodyFat && (!base.bodyFat || pull.bodyFat.at >= base.bodyFat.at) ? pull.bodyFat : base.bodyFat;

  return {
    ...state,
    weighIns,
    health: {
      ...base,
      lastSyncAt: now,
      days: [...days.values()].filter((d) => d.date >= cutoff).sort((a, b) => a.date - b.date),
      workouts: [...workouts.values()].filter((w) => w.start >= cutoff).sort((a, b) => b.start - a.start),
      ...(bodyFat ? { bodyFat } : {}),
    },
  };
}

export const healthDay = (s: AppState, t: number) => s.health?.days.find((d) => d.date === startOfDay(t));

/** Averages over the last 7 days (today included) of the days that have a value. */
export function weekAverages(s: AppState, now: number) {
  const from = startOfDay(now) - 6 * DAY;
  const days = (s.health?.days ?? []).filter((d) => d.date >= from);
  const avg = (pick: (d: HealthDay) => number | undefined) => {
    const v = days.map(pick).filter((n): n is number => typeof n === 'number' && n > 0);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  return {
    steps: avg((d) => d.steps),
    activeCalories: avg((d) => d.activeCalories),
    sleepMinutes: avg((d) => d.sleepMinutes),
    restingHr: avg((d) => d.restingHr),
  };
}

export const fmtSleep = (min: number) => `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}m`;

export const fmtSteps = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString());

/** "traditionalStrengthTraining" / "STRENGTH_TRAINING" → "Strength training". */
export function prettyKind(name: string): string {
  const special: Record<string, string> = {
    traditionalStrengthTraining: 'Strength training',
    functionalStrengthTraining: 'Strength training',
    highIntensityIntervalTraining: 'HIIT',
    HIGH_INTENSITY_INTERVAL_TRAINING: 'HIIT',
    mixedCardio: 'Cardio',
    other: 'Workout',
    OTHER_WORKOUT: 'Workout',
  };
  if (special[name]) return special[name];
  const words = name.includes('_') ? name.toLowerCase().split('_') : name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(' ');
  const s = words.join(' ').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : 'Workout';
}

/**
 * Minutes asleep per night, credited to the day the person woke up. Watch and
 * phone often both record the same night, so each night takes the source with
 * the most sleep rather than adding them up.
 */
export function sleepByDay(segments: { start: number; end: number; source: string }[]): Map<number, number> {
  const perSource = new Map<string, number>(); // `${day}|${source}` → minutes
  for (const s of segments) {
    if (s.end <= s.start) continue;
    const key = `${startOfDay(s.end)}|${s.source}`;
    perSource.set(key, (perSource.get(key) ?? 0) + (s.end - s.start) / 60000);
  }
  const out = new Map<number, number>();
  for (const [key, min] of perSource) {
    const day = Number(key.split('|')[0]);
    out.set(day, Math.max(out.get(day) ?? 0, Math.round(min)));
  }
  return out;
}

/** Health data for the coach, if the client chose to include it. */
export function sharedHealth(s: AppState, now: number) {
  const h = s.health;
  if (!h?.enabled || !h.shareWithCoach) return null;
  const from = startOfDay(now) - 13 * DAY;
  return {
    days: h.days.filter((d) => d.date >= from),
    workouts: h.workouts.filter((w) => w.start >= from),
    ...(h.bodyFat ? { bodyFat: h.bodyFat } : {}),
  };
}
