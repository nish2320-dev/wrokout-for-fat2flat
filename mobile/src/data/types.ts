import type { Equipment } from './exercises';
import type { Diet } from './mealplan';

/** For holds `reps` is seconds and for cardio it's minutes; `dist` is a cardio distance in miles (lb users) or km. */
export type SetEntry = { reps: number; weight: number; done: boolean; dist?: number };

/** `restSec` and `note` come from a coach-built workout. */
export type LoggedExercise = { exerciseId: string; sets: SetEntry[]; restSec?: number; note?: string };

export type Workout = {
  id: string;
  name: string;
  startedAt: number;
  finishedAt?: number;
  exercises: LoggedExercise[];
  /** Set when the workout was started from the Transformation program ("w3-d1"). */
  sessionKey?: string;
  /** Set when the workout was sent by the client's coach (a coach_workouts id). */
  coachWorkoutId?: string;
};

export type Meal = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  /** Grams; absent on meals logged before carbs and fat were tracked. */
  carbs?: number;
  fat?: number;
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
  /** Daily carbs and fat in grams. Unset means worked out from calories and protein. */
  carbGoal?: number;
  fatGoal?: number;
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
  /** When the App Store / Play rating prompt was last requested. */
  reviewAskedAt?: number;
  /** Let the coach read conversations with the AI assistant. */
  shareAssistant?: boolean;
  /** Badges the user has already been shown. */
  seenBadges?: string[];
  /** When the user agreed to send their questions and progress summary to the AI. */
  aiConsentAt?: number;
  /** When the client answered "Not now" to AI check-ins from their coach. */
  aiCheckinsAskedAt?: number;
};

/** Targets a coach set from their phone. */
export type CoachTargets = {
  calorieGoal: number;
  proteinGoal: number;
  /** Optional: when unset the client's app works them out from calories and protein. */
  carbGoal?: number | null;
  fatGoal?: number | null;
  daysPerWeek: 3 | 4 | 5 | null;
  note: string;
  at: number;
};

/** A message in the conversation with the in-app AI assistant. */
export type AssistantMessage = { id: string; role: 'user' | 'assistant'; content: string; at: number };

/** A workout someone built and saved to reuse (same shape as a coach's workout). */
export type MyWorkout = {
  id: string;
  name: string;
  note?: string;
  items: { exerciseId: string; sets: number; reps: number; restSec?: number; note?: string }[];
  updatedAt: number;
};

/** One food inside a saved meal, as it will be counted. */
export type MealItem = { name: string; calories: number; protein: number; carbs?: number; fat?: number };

/** A meal the user built from several foods and saved to log again in one tap. */
export type MyMeal = { id: string; name: string; items: MealItem[]; updatedAt: number };

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
  /** Lose fat, gain weight or maintain. Unset (plans made before 2.2.1): lose if the goal is below the start, else maintain. */
  goal?: 'lose' | 'gain' | 'maintain';
  /** What the 12 weeks are made of; strength (weights) when unset. */
  style?: 'strength' | 'yogapilates' | 'cardio' | 'mixed';
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
  /** Meals the user built and saved, newest first. */
  myMeals?: MyMeal[];
  /** Workouts the user built and saved, newest first. */
  myWorkouts?: MyWorkout[];
  /** Conversation with the AI assistant (newest last), kept on the phone. */
  assistant?: AssistantMessage[];
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
