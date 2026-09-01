import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { AppState, LoggedExercise, Meal, Profile, SetEntry, WeighIn, Workout, initialState } from './types';

const KEY = 'fat2flat.state.v1';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

type Store = {
  state: AppState;
  /** False until the persisted state has been read back from disk. */
  ready: boolean;
  startWorkout: (name: string, exercises: LoggedExercise[]) => string;
  finishWorkout: () => void;
  discardWorkout: () => void;
  addExercise: (exerciseId: string) => void;
  removeExercise: (index: number) => void;
  addSet: (exerciseIndex: number) => void;
  updateSet: (exerciseIndex: number, setIndex: number, patch: Partial<SetEntry>) => void;
  toggleSetDone: (exerciseIndex: number, setIndex: number) => void;
  addMeal: (meal: Omit<Meal, 'id' | 'at'>) => void;
  removeMeal: (id: string) => void;
  addWeighIn: (weight: number) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  resetAll: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  // load once
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setState({ ...initialState, ...JSON.parse(raw) });
      } catch {
        // corrupt or unreadable storage falls back to a clean slate
      } finally {
        hydrated.current = true;
        setReady(true);
      }
    })();
  }, []);

  // persist on every change, but never before the first read completes,
  // or we would overwrite real data with the empty initial state
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const patchActive = useCallback(
    (fn: (w: Workout) => Workout) =>
      setState((s) => {
        if (!s.activeWorkoutId) return s;
        return {
          ...s,
          workouts: s.workouts.map((w) => (w.id === s.activeWorkoutId ? fn(w) : w)),
        };
      }),
    [],
  );

  const value = useMemo<Store>(() => ({
    state,
    ready,

    startWorkout(name, exercises) {
      const id = uid();
      setState((s) => ({
        ...s,
        activeWorkoutId: id,
        workouts: [{ id, name, startedAt: Date.now(), exercises }, ...s.workouts],
      }));
      return id;
    },

    finishWorkout() {
      setState((s) => ({
        ...s,
        activeWorkoutId: null,
        workouts: s.workouts.map((w) =>
          w.id === s.activeWorkoutId
            ? // drop unfinished sets so history reflects work actually done
              { ...w, finishedAt: Date.now(), exercises: w.exercises.map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) })) }
            : w,
        ).filter((w) => w.finishedAt === undefined || w.exercises.some((e) => e.sets.length > 0)),
      }));
    },

    discardWorkout() {
      setState((s) => ({
        ...s,
        activeWorkoutId: null,
        workouts: s.workouts.filter((w) => w.id !== s.activeWorkoutId),
      }));
    },

    addExercise(exerciseId) {
      patchActive((w) => ({
        ...w,
        exercises: [...w.exercises, { exerciseId, sets: [{ reps: 10, weight: 0, done: false }] }],
      }));
    },

    removeExercise(index) {
      patchActive((w) => ({ ...w, exercises: w.exercises.filter((_, i) => i !== index) }));
    },

    addSet(exerciseIndex) {
      patchActive((w) => ({
        ...w,
        exercises: w.exercises.map((e, i) => {
          if (i !== exerciseIndex) return e;
          const last = e.sets[e.sets.length - 1];
          return { ...e, sets: [...e.sets, { reps: last?.reps ?? 10, weight: last?.weight ?? 0, done: false }] };
        }),
      }));
    },

    updateSet(exerciseIndex, setIndex, patch) {
      patchActive((w) => ({
        ...w,
        exercises: w.exercises.map((e, i) =>
          i !== exerciseIndex
            ? e
            : { ...e, sets: e.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) },
        ),
      }));
    },

    toggleSetDone(exerciseIndex, setIndex) {
      patchActive((w) => ({
        ...w,
        exercises: w.exercises.map((e, i) =>
          i !== exerciseIndex
            ? e
            : { ...e, sets: e.sets.map((s, j) => (j === setIndex ? { ...s, done: !s.done } : s)) },
        ),
      }));
    },

    addMeal(meal) {
      setState((s) => ({ ...s, meals: [{ ...meal, id: uid(), at: Date.now() }, ...s.meals] }));
    },

    removeMeal(id) {
      setState((s) => ({ ...s, meals: s.meals.filter((m) => m.id !== id) }));
    },

    addWeighIn(weight) {
      setState((s) => ({ ...s, weighIns: [...s.weighIns, { at: Date.now(), weight }] }));
    },

    updateProfile(patch) {
      setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
    },

    resetAll() {
      setState(initialState);
    },
  }), [state, ready, patchActive]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside <StoreProvider>');
  return v;
}

export function useActiveWorkout(): Workout | null {
  const { state } = useStore();
  return state.workouts.find((w) => w.id === state.activeWorkoutId) ?? null;
}

export type { LoggedExercise, Meal, Profile, SetEntry, WeighIn, Workout };
