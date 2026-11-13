import {
  CategoryValueSleepAnalysis,
  isHealthDataAvailableAsync,
  queryCategorySamples,
  queryQuantitySamples,
  queryStatisticsCollectionForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
  saveCorrelationSample,
  saveWorkoutSample,
  WorkoutActivityType,
} from '@kingstinct/react-native-healthkit';
import { Linking } from 'react-native';

import { HealthPull, prettyKind, sleepByDay } from '@/data/health';
import { startOfDay } from '@/data/stats';
import type { HealthDay } from '@/data/types';

import type { MealWrite, WorkoutWrite } from './native';

/** Apple Health on iPhone: everything an Apple Watch, iPhone or smart scale records lands here. */

export const healthAppName = 'Apple Health';

const OWN_BUNDLE = 'com.fat2flat.fitness';

const READ = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierBodyFatPercentage',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKWorkoutTypeIdentifier',
] as const;

const WRITE = [
  'HKWorkoutTypeIdentifier',
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKQuantityTypeIdentifierDietaryProtein',
] as const;

const ASLEEP = new Set<number>([
  CategoryValueSleepAnalysis.asleepUnspecified,
  CategoryValueSleepAnalysis.asleepCore,
  CategoryValueSleepAnalysis.asleepDeep,
  CategoryValueSleepAnalysis.asleepREM,
]);

export async function healthAvailable(): Promise<boolean> {
  try {
    return await isHealthDataAvailableAsync();
  } catch {
    return false;
  }
}

/** Shows Apple's permission sheet. Apple never says what was refused, so "true" only means it was shown. */
export async function requestHealth(): Promise<boolean> {
  if (!(await healthAvailable())) return false;
  return requestAuthorization({ toRead: [...READ], toShare: [...WRITE] });
}

export async function pullHealth(since: number): Promise<HealthPull> {
  const startDate = new Date(startOfDay(since));
  const endDate = new Date();
  const range = { filter: { date: { startDate, endDate } } };
  const days = new Map<number, HealthDay>();
  const day = (t: number) => {
    const d = startOfDay(t);
    if (!days.has(d)) days.set(d, { date: d });
    return days.get(d)!;
  };

  // each read on its own, so one refused permission doesn't hide the rest
  const steps = await queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], startDate, { day: 1 }, { ...range, unit: 'count' }).catch(() => []);
  for (const r of steps) if (r.startDate && r.sumQuantity) day(r.startDate.getTime()).steps = Math.round(r.sumQuantity.quantity);

  const energy = await queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], startDate, { day: 1 }, { ...range, unit: 'kcal' }).catch(() => []);
  for (const r of energy) if (r.startDate && r.sumQuantity) day(r.startDate.getTime()).activeCalories = Math.round(r.sumQuantity.quantity);

  const hr = await queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierRestingHeartRate', ['discreteAverage'], startDate, { day: 1 }, { ...range, unit: 'count/min' }).catch(() => []);
  for (const r of hr) if (r.startDate && r.averageQuantity) day(r.startDate.getTime()).restingHr = Math.round(r.averageQuantity.quantity);

  // sleep that ended inside the window, including the night before it started
  const sleep = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
    limit: 0,
    filter: { date: { startDate: new Date(startDate.getTime() - 12 * 3600000), endDate } },
  }).catch(() => []);
  const segments = sleep
    .filter((s) => ASLEEP.has(Number(s.value)))
    .map((s) => ({ start: s.startDate.getTime(), end: s.endDate.getTime(), source: s.sourceRevision?.source?.bundleIdentifier ?? 'unknown' }));
  for (const [d, min] of sleepByDay(segments)) if (d >= startDate.getTime()) day(d).sleepMinutes = min;

  const weights = await queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', { limit: 0, unit: 'kg', ...range }).catch(() => []);
  const fat = await queryQuantitySamples('HKQuantityTypeIdentifierBodyFatPercentage', { limit: 1, ascending: false, unit: '%', ...range }).catch(() => []);

  const workouts: HealthPull['workouts'] = [];
  const proxies = await queryWorkoutSamples({ limit: 0, filter: { date: { startDate, endDate } } }).catch(() => []);
  for (const w of proxies) {
    try {
      if (w.sourceRevision?.source?.bundleIdentifier !== OWN_BUNDLE) {
        const kcal = w.totalEnergyBurned && /cal/i.test(w.totalEnergyBurned.unit) ? Math.round(w.totalEnergyBurned.quantity) : undefined;
        workouts.push({
          id: w.uuid,
          start: w.startDate.getTime(),
          end: w.endDate.getTime(),
          kind: prettyKind(WorkoutActivityType[w.workoutActivityType] ?? 'other'),
          ...(kcal ? { calories: kcal } : {}),
        });
      }
    } finally {
      w.dispose();
    }
  }

  const latestFat = fat[0];
  return {
    days: [...days.values()],
    workouts,
    weights: weights.map((w) => ({ id: w.uuid, at: w.startDate.getTime(), kg: w.quantity })),
    // HealthKit's percent unit is a fraction (0.245)
    ...(latestFat ? { bodyFat: { at: latestFat.startDate.getTime(), percent: Math.round((latestFat.quantity <= 1 ? latestFat.quantity * 100 : latestFat.quantity) * 10) / 10 } } : {}),
  };
}

export async function writeWorkout(w: WorkoutWrite): Promise<void> {
  await saveWorkoutSample(WorkoutActivityType.traditionalStrengthTraining, [], new Date(w.start), new Date(w.end));
}

export async function writeMeal(m: MealWrite): Promise<void> {
  const at = new Date(m.at);
  await saveCorrelationSample(
    'HKCorrelationTypeIdentifierFood',
    [
      { quantityType: 'HKQuantityTypeIdentifierDietaryEnergyConsumed', quantity: m.calories, unit: 'kcal', startDate: at, endDate: at },
      { quantityType: 'HKQuantityTypeIdentifierDietaryProtein', quantity: m.protein, unit: 'g', startDate: at, endDate: at },
    ],
    at,
    at,
    { HKFoodType: m.name },
  );
}

/** Apple doesn't allow opening the Health permissions page directly; the app's Settings page links to it. */
export function openHealthSettings(): void {
  Linking.openSettings().catch(() => {});
}
