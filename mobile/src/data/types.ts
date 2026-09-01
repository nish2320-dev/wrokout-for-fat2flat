export type SetEntry = { reps: number; weight: number; done: boolean };

export type LoggedExercise = { exerciseId: string; sets: SetEntry[] };

export type Workout = {
  id: string;
  name: string;
  startedAt: number;
  finishedAt?: number;
  exercises: LoggedExercise[];
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

export type AppState = {
  workouts: Workout[];
  activeWorkoutId: string | null;
  meals: Meal[];
  weighIns: WeighIn[];
  profile: Profile;
};

export const initialState: AppState = {
  workouts: [],
  activeWorkoutId: null,
  meals: [],
  weighIns: [],
  profile: { name: '', calorieGoal: 2000, proteinGoal: 160, units: 'lb' },
};
