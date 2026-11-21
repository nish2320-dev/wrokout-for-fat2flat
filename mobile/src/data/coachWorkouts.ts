import { byId, schemeText } from './exercises';
import type { LoggedExercise, Workout } from './types';

/** One exercise in a workout a coach built: what to do and how. */
export type CoachWorkoutItem = {
  exerciseId: string;
  sets: number;
  reps: number;
  /** Rest between sets, in seconds. */
  restSec?: number;
  note?: string;
};

/** A workout a coach sent to a client (a row of coach_workouts). */
export type CoachWorkout = {
  id: string;
  name: string;
  note: string;
  items: CoachWorkoutItem[];
  created_at: string;
  done_at: string | null;
};

export const MAX_ITEMS = 20;
export const REST_CHOICES = [45, 60, 90, 120, 180];
export const DEFAULT_REST = 90;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

/** Cleans up a coach's items: known exercises only, numbers in range, short notes. Same limits as the server. */
export function cleanItems(items: CoachWorkoutItem[]): CoachWorkoutItem[] {
  return items
    .filter((i) => byId(i.exerciseId))
    .slice(0, MAX_ITEMS)
    .map((i) => {
      const note = (i.note ?? '').trim().slice(0, 200);
      return {
        exerciseId: i.exerciseId,
        sets: clamp(i.sets || 1, 1, 10),
        // reps, seconds for holds or minutes for cardio
        reps: clamp(i.reps || 1, 1, 600),
        restSec: clamp(i.restSec ?? DEFAULT_REST, 0, 600),
        ...(note ? { note } : {}),
      };
    });
}

/** The exercises to log when the client starts the workout. */
export const toExercises = (items: CoachWorkoutItem[]): LoggedExercise[] =>
  cleanItems(items).map((i) => ({
    exerciseId: i.exerciseId,
    sets: Array.from({ length: i.sets }, () => ({ reps: i.reps, weight: 0, done: false })),
    restSec: i.restSec,
    ...(i.note ? { note: i.note } : {}),
  }));

export const totalSets = (items: CoachWorkoutItem[]) => items.reduce((n, i) => n + i.sets, 0);

/** "5 exercises · 15 sets · ~40 min" */
export function describe(items: CoachWorkoutItem[]) {
  const sets = totalSets(items);
  // a set takes about 45 s (or its hold time, or its cardio minutes) plus its rest
  const seconds = items.reduce((t, i) => {
    const kind = byId(i.exerciseId)?.kind;
    const work = kind === 'cardio' ? i.reps * 60 : kind === 'hold' ? i.reps : 45;
    return t + i.sets * (work + (kind === 'cardio' ? 0 : (i.restSec ?? DEFAULT_REST)));
  }, 0);
  const minutes = Math.max(5, Math.round(seconds / 60 / 5) * 5);
  return `${items.length} exercise${items.length === 1 ? '' : 's'} · ${sets} set${sets === 1 ? '' : 's'} · ~${minutes} min`;
}

/** The client's finished workout for this coach workout, if any (newest first). */
export const resultFor = (coachWorkoutId: string, workouts: Workout[]) =>
  workouts.find((w) => w.coachWorkoutId === coachWorkoutId && w.finishedAt !== undefined);

/** Workouts from the coach the client still has to do, oldest first. */
export const pendingFromCoach = (list: CoachWorkout[], workouts: Workout[]) =>
  list
    .filter((c) => !c.done_at && !resultFor(c.id, workouts))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

/** What the coach sees for a finished workout: the heaviest set of each exercise. */
export function resultLines(w: Workout, units: string) {
  return w.exercises
    .filter((e) => e.sets.length > 0)
    .map((e) => {
      const top = e.sets.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a));
      const name = byId(e.exerciseId)?.name ?? 'Exercise';
      const kind = byId(e.exerciseId)?.kind ?? 'reps';
      if (kind === 'cardio') {
        const mins = e.sets.reduce((n, x) => n + x.reps, 0);
        const dist = e.sets.reduce((n, x) => n + (x.dist ?? 0), 0);
        return `${name}: ${mins} min${dist > 0 ? `, ${Math.round(dist * 10) / 10} ${units === 'lb' ? 'mi' : 'km'}` : ''}`;
      }
      if (kind === 'hold') return `${name}: ${schemeText('hold', e.sets.length, top.reps)}`;
      return `${name}: ${e.sets.length} × ${top.reps}${top.weight > 0 ? ` @ ${top.weight} ${units}` : ''}`;
    });
}
