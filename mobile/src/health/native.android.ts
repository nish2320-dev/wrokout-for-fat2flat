import {
  aggregateGroupByDuration,
  ExerciseType,
  getSdkStatus,
  initialize,
  insertRecords,
  MealType,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
  SleepStageType,
} from 'react-native-health-connect';

import { HealthPull, prettyKind, sleepByDay } from '@/data/health';
import { startOfDay } from '@/data/stats';
import type { HealthDay } from '@/data/types';

import type { MealWrite, WorkoutWrite } from './native';

/** Health Connect on Android: Fitbit, Samsung Health, Pixel Watch, Garmin and smart scales feed it. */

export const healthAppName = 'Health Connect';

const OWN_PACKAGE = 'com.fat2flat.fitness';
const DAY = 86400000;

const READ = ['Steps', 'ActiveCaloriesBurned', 'Weight', 'BodyFat', 'RestingHeartRate', 'SleepSession', 'ExerciseSession'] as const;
const WRITE = ['ExerciseSession', 'Nutrition'] as const;

// exercise type number → readable name, from the library's own table
const EXERCISE_NAMES = new Map<number, string>(Object.entries(ExerciseType).map(([name, n]) => [n as number, name]));

let ready: Promise<boolean> | null = null;
const init = () => {
  ready ??= (async () => {
    try {
      if ((await getSdkStatus()) !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;
      return await initialize();
    } catch {
      return false;
    }
  })();
  return ready;
};

export async function healthAvailable(): Promise<boolean> {
  return init();
}

export async function requestHealth(): Promise<boolean> {
  if (!(await init())) return false;
  const granted = await requestPermission([
    ...READ.map((recordType) => ({ accessType: 'read' as const, recordType })),
    ...WRITE.map((recordType) => ({ accessType: 'write' as const, recordType })),
  ]);
  return granted.length > 0;
}

const iso = (t: number) => new Date(t).toISOString();

export async function pullHealth(since: number): Promise<HealthPull> {
  if (!(await init())) return { days: [], workouts: [], weights: [] };
  const start = startOfDay(since);
  const end = Date.now();
  const timeRangeFilter = { operator: 'between' as const, startTime: iso(start), endTime: iso(end) };
  const days = new Map<number, HealthDay>();
  const day = (t: number) => {
    const d = startOfDay(t);
    if (!days.has(d)) days.set(d, { date: d });
    return days.get(d)!;
  };
  const notOurs = (r: { metadata?: { dataOrigin?: string } }) => r.metadata?.dataOrigin !== OWN_PACKAGE;

  // 24-hour buckets from local midnight; each read on its own so one refused permission doesn't hide the rest
  const steps = await aggregateGroupByDuration({ recordType: 'Steps', timeRangeFilter, timeRangeSlicer: { duration: 'DAYS', length: 1 } }).catch(() => []);
  for (const g of steps) day(new Date(g.startTime).getTime() + DAY / 2).steps = Math.round(g.result.COUNT_TOTAL);

  const energy = await aggregateGroupByDuration({ recordType: 'ActiveCaloriesBurned', timeRangeFilter, timeRangeSlicer: { duration: 'DAYS', length: 1 } }).catch(() => []);
  for (const g of energy) {
    const kcal = Math.round(g.result.ACTIVE_CALORIES_TOTAL.inKilocalories);
    if (kcal > 0) day(new Date(g.startTime).getTime() + DAY / 2).activeCalories = kcal;
  }

  const hr = await readRecords('RestingHeartRate', { timeRangeFilter }).catch(() => ({ records: [] }));
  const hrByDay = new Map<number, number[]>();
  for (const r of hr.records) {
    const d = startOfDay(new Date(r.time).getTime());
    hrByDay.set(d, [...(hrByDay.get(d) ?? []), r.beatsPerMinute]);
  }
  for (const [d, v] of hrByDay) day(d).restingHr = Math.round(v.reduce((a, b) => a + b, 0) / v.length);

  // asleep time = the session minus stages marked awake / out of bed
  const sleep = await readRecords('SleepSession', { timeRangeFilter: { ...timeRangeFilter, startTime: iso(start - 12 * 3600000) } }).catch(() => ({ records: [] }));
  const segments: { start: number; end: number; source: string }[] = [];
  for (const s of sleep.records) {
    const source = s.metadata?.dataOrigin ?? 'unknown';
    const awake = new Set<number>([SleepStageType.AWAKE, SleepStageType.OUT_OF_BED]);
    if (s.stages?.length) {
      for (const st of s.stages) if (!awake.has(st.stage)) segments.push({ start: new Date(st.startTime).getTime(), end: new Date(st.endTime).getTime(), source });
    } else {
      segments.push({ start: new Date(s.startTime).getTime(), end: new Date(s.endTime).getTime(), source });
    }
  }
  for (const [d, min] of sleepByDay(segments)) if (d >= start) day(d).sleepMinutes = min;

  const weights = await readRecords('Weight', { timeRangeFilter }).catch(() => ({ records: [] }));
  const fat = await readRecords('BodyFat', { timeRangeFilter, ascendingOrder: false, pageSize: 1 }).catch(() => ({ records: [] }));
  const sessions = await readRecords('ExerciseSession', { timeRangeFilter }).catch(() => ({ records: [] }));

  const latestFat = fat.records[0];
  return {
    days: [...days.values()],
    workouts: sessions.records.filter(notOurs).map((w, i) => ({
      id: w.metadata?.id ?? `${w.startTime}-${i}`,
      start: new Date(w.startTime).getTime(),
      end: new Date(w.endTime).getTime(),
      kind: w.title || prettyKind(EXERCISE_NAMES.get(w.exerciseType) ?? 'OTHER_WORKOUT'),
    })),
    weights: weights.records.filter(notOurs).map((w, i) => ({
      id: w.metadata?.id ?? `${w.time}-${i}`,
      at: new Date(w.time).getTime(),
      kg: w.weight.inKilograms,
    })),
    ...(latestFat ? { bodyFat: { at: new Date(latestFat.time).getTime(), percent: Math.round(latestFat.percentage * 10) / 10 } } : {}),
  };
}

export async function writeWorkout(w: WorkoutWrite): Promise<void> {
  if (!(await init())) return;
  await insertRecords([
    { recordType: 'ExerciseSession', exerciseType: ExerciseType.STRENGTH_TRAINING, title: w.name, startTime: iso(w.start), endTime: iso(w.end) },
  ]);
}

export async function writeMeal(m: MealWrite): Promise<void> {
  if (!(await init())) return;
  await insertRecords([
    {
      recordType: 'Nutrition',
      startTime: iso(m.at),
      endTime: iso(m.at + 60000),
      name: m.name,
      mealType: MealType.UNKNOWN,
      energy: { value: m.calories, unit: 'kilocalories' },
      protein: { value: m.protein, unit: 'grams' },
    },
  ]);
}

export function openHealthSettings(): void {
  try {
    openHealthConnectSettings();
  } catch {
    // older phones without Health Connect
  }
}
