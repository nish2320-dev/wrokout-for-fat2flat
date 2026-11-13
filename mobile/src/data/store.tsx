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

import { deleteAllPhotos, deletePhotos } from '@/photos';

import { emptyHealth, HealthPull, mergeHealth } from './health';
import { addGlasses, applyTargets } from './extras';
import { AppState, CheckIn, CoachTargets, HealthState, LoggedExercise, Meal, Profile, Program, SetEntry, WeighIn, Workout, initialState } from './types';
import { sampleState } from './sample';
import { convertUnits } from './units';

const KEY = 'fat2flat.state.v1';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

type Store = {
  state: AppState;
  /** False until the persisted state has been read back from disk. */
  ready: boolean;
  /** `sessionKey` ties the workout to a Transformation session. */
  startWorkout: (name: string, exercises: LoggedExercise[], sessionKey?: string) => string;
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
  /** Starts (or restarts) the Transformation and sets the daily targets it computed. */
  startProgram: (program: Program, targets: { calories: number; protein: number }, weight: number) => void;
  /** Changes the plan's settings without restarting week 1. */
  updateProgram: (patch: Partial<Program>, targets: { calories: number; protein: number }) => void;
  endProgram: () => void;
  /** Accepts the coach's suggested calorie target. */
  applyCoach: (to: number, reason: string) => void;
  addCheckIn: (checkIn: Omit<CheckIn, 'id' | 'at'>) => void;
  removeCheckIn: (id: string) => void;
  /** Replaces everything with demo history, for App Store screenshots. */
  loadSample: () => void;
  /** Folds a read from Apple Health / Health Connect into the data (connecting if needed). */
  applyHealth: (pull: HealthPull) => void;
  /** Changes health settings; null disconnects and forgets the imported data (typed-in weigh-ins stay). */
  updateHealth: (patch: Partial<HealthState> | null) => void;
  /** Adds (or with a negative number removes) glasses of water today. */
  addWater: (glasses: number) => void;
  /** Applies targets the coach set; the Home screen then tells the user. */
  applyCoachTargets: (t: CoachTargets) => void;
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

    startWorkout(name, exercises, sessionKey) {
      const id = uid();
      setState((s) => ({
        ...s,
        activeWorkoutId: id,
        workouts: [{ id, name, startedAt: Date.now(), exercises, ...(sessionKey ? { sessionKey } : {}) }, ...s.workouts],
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
      setState((s) => {
        // a unit change rewrites stored weights too, so 100 lb doesn't become 100 kg
        const converted = patch.units ? convertUnits(s, patch.units) : s;
        return { ...converted, profile: { ...converted.profile, ...patch } };
      });
    },

    startProgram(program, targets, weight) {
      setState((s) => ({
        ...s,
        program,
        profile: { ...s.profile, calorieGoal: targets.calories, proteinGoal: targets.protein },
        // the starting weight is the first point on the coach's trend
        weighIns: [...s.weighIns, { at: Date.now(), weight }],
      }));
    },

    updateProgram(patch, targets) {
      setState((s) =>
        s.program
          ? {
              ...s,
              program: { ...s.program, ...patch },
              profile: { ...s.profile, calorieGoal: targets.calories, proteinGoal: targets.protein },
            }
          : s,
      );
    },

    endProgram() {
      setState((s) => ({ ...s, program: null }));
    },

    applyCoach(to, reason) {
      setState((s) =>
        s.program
          ? {
              ...s,
              profile: { ...s.profile, calorieGoal: to },
              program: {
                ...s.program,
                adjustments: [...s.program.adjustments, { at: Date.now(), from: s.profile.calorieGoal, to, reason }],
              },
            }
          : s,
      );
    },

    addCheckIn(checkIn) {
      setState((s) => ({ ...s, checkIns: [...s.checkIns, { ...checkIn, id: uid(), at: Date.now() }] }));
    },

    removeCheckIn(id) {
      setState((s) => {
        const gone = s.checkIns.find((c) => c.id === id);
        if (gone) deletePhotos([gone.photos.front, gone.photos.side]);
        return { ...s, checkIns: s.checkIns.filter((c) => c.id !== id) };
      });
    },

    resetAll() {
      deleteAllPhotos();
      setState(initialState);
    },

    loadSample() {
      deleteAllPhotos();
      setState(sampleState(Date.now()));
    },

    applyHealth(pull) {
      setState((s) => mergeHealth(s, pull, Date.now()));
    },

    addWater(glasses) {
      setState((s) => ({ ...s, water: addGlasses(s.water ?? [], glasses, Date.now()) }));
    },

    applyCoachTargets(targets) {
      setState((s) => applyTargets(s, targets, Date.now()));
    },

    updateHealth(patch) {
      setState((s) => {
        if (patch === null) {
          const { health: _gone, ...rest } = s;
          return { ...rest, weighIns: s.weighIns.filter((w) => !w.hid) };
        }
        return { ...s, health: { ...(s.health ?? emptyHealth()), ...patch } };
      });
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

export type { CheckIn, LoggedExercise, Meal, Profile, Program, SetEntry, WeighIn, Workout };
