import type { Equipment } from './exercises';

export type SetEntry = { reps: number; weight: number; done: boolean };

export type LoggedExercise = { exerciseId: string; sets: SetEntry[] };

export type Workout = {
  id: string;
  name: string;
  startedAt: number;
  finishedAt?: number;
  exercises: LoggedExercise[];
  /** Set when the workout was started from the Transformation program ("w3-d1"). */
  sessionKey?: string;
};

export type Meal = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  at: number;
};

export type WeighIn = { at: number; weight: number };

export type Profile = {
  name: string;
  calorieGoal: number;
  proteinGoal: number;
  units: 'lb' | 'kg';
};

export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active';
export type Pace = 'gentle' | 'steady' | 'fast';

/** What the Transformation setup asks for. Weights use profile units; height is always cm. */
export type Body = {
  sex: Sex;
  age: number;
  heightCm: number;
  startWeight: number;
  goalWeight: number;
  activity: Activity;
};

/** One calorie-target change suggested by the coach and accepted by the user. */
export type Adjustment = { at: number; from: number; to: number; reason: string };

export type Program = {
  /** Midnight of the day week 1 began. */
  startedAt: number;
  daysPerWeek: 3 | 4 | 5;
  equipment: Equipment[];
  body: Body;
  pace: Pace;
  adjustments: Adjustment[];
};

/**
 * A weekly check-in. Measurements are always stored in cm and shown in the
 * user's units; photos are file names inside the app's documents folder (iOS
 * moves that folder between app versions, so full paths would go stale).
 */
export type CheckIn = {
  id: string;
  at: number;
  waist?: number;
  hips?: number;
  chest?: number;
  photos: { front?: string; side?: string };
};

export type AppState = {
  workouts: Workout[];
  activeWorkoutId: string | null;
  meals: Meal[];
  weighIns: WeighIn[];
  profile: Profile;
  program: Program | null;
  checkIns: CheckIn[];
};

export const initialState: AppState = {
  workouts: [],
  activeWorkoutId: null,
  meals: [],
  weighIns: [],
  profile: { name: '', calorieGoal: 2000, proteinGoal: 160, units: 'lb' },
  program: null,
  checkIns: [],
};
