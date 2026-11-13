import type { HealthPull } from '@/data/health';

/**
 * Health-app access. Metro picks native.ios.ts (Apple Health) or
 * native.android.ts (Health Connect); this file is the fallback for the web
 * preview, where there is no health app.
 */

export type MealWrite = { at: number; calories: number; protein: number; name: string };
export type WorkoutWrite = { start: number; end: number; name: string };

export const healthAppName: string | null = null;

export async function healthAvailable(): Promise<boolean> {
  return false;
}

export async function requestHealth(): Promise<boolean> {
  return false;
}

export async function pullHealth(_since: number): Promise<HealthPull> {
  return { days: [], workouts: [], weights: [] };
}

export async function writeWorkout(_w: WorkoutWrite): Promise<void> {}

export async function writeMeal(_m: MealWrite): Promise<void> {}

/** Opens the place where the user can change what the app may read or write. */
export function openHealthSettings(): void {}
