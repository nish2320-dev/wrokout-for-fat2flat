import type { Equipment } from './exercises';
import type { Diet } from './mealplan';

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

/** `hid` marks a weigh-in imported from Apple Health / Health Connect (its record id). */
export type WeighIn = { at: number; weight: number; hid?: string };

/** One day of data from Apple Health / Health Connect; `date` is local midnight. */
export type HealthDay = {
  date: number;
  steps?: number;
  activeCalories?: number;
  sleepMinutes?: number;
  restingHr?: number;
};

/** A workout recorded by a watch or another app (not one logged in Fat2Flat). */
export type HealthWorkout = { id: string; start: number; end: number; kind: string; calories?: number };

export type HealthState = {
  /** The user connected Apple Health / Health Connect. */
  enabled: boolean;
  /** Include health data in what's shared with the coach. */
  shareWithCoach: boolean;
  lastSyncAt?: number;
  days: HealthDay[];
  workouts: HealthWorkout[];
  bodyFat?: { at: number; percent: number };
};

export type Profile = {
  name: string;
  calorieGoal: number;
  proteinGoal: number;
  units: 'lb' | 'kg';
  /** For the meal plan; unset until the user picks one. */
  diet?: Diet;
  /** Transformation reminders (next workout, check-in, weigh-in). On unless turned off. */
  reminders?: boolean;
  /** Daily water goal in glasses (250 ml / 8 oz). */
  waterGoal?: number;
  /** The welcome tour has been shown. */
  seenWelcome?: boolean;
  /** When the coach's latest targets were applied, and when the user acknowledged them. */
  coachTargetsAt?: number;
  coachTargetsSeenAt?: number;
  /** The coach's note with their latest targets. */
  coachTargetsNote?: string;
};

/** Targets a coach set from their phone. */
export type CoachTargets = { calorieGoal: number; proteinGoal: number; daysPerWeek: 3 | 4 | 5 | null; note: string; at: number };

/** Glasses of water on a day; `date` is local midnight. */
export type WaterDay = { date: number; glasses: number };

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
  /** Absent until the user connects a health app. */
  health?: HealthState;
  water?: WaterDay[];
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
