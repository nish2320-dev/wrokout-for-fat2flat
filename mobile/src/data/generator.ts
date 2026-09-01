import { EXERCISES, Equipment, Exercise, Muscle } from './exercises';
import { LoggedExercise } from './types';

export type Focus = 'full' | 'upper' | 'legs' | 'core';
export type Goal = 'muscle' | 'fat' | 'endurance';

export const FOCUS: { key: Focus; label: string }[] = [
  { key: 'full', label: 'Full Body' },
  { key: 'upper', label: 'Upper Body' },
  { key: 'legs', label: 'Legs' },
  { key: 'core', label: 'Core' },
];

export const GOALS: { key: Goal; label: string }[] = [
  { key: 'muscle', label: 'Build Muscle' },
  { key: 'fat', label: 'Lose Fat' },
  { key: 'endurance', label: 'Endurance' },
];

export const LENGTHS = [30, 45, 60, 75];

const FOCUS_MUSCLES: Record<Focus, Muscle[]> = {
  full: ['chest', 'back', 'legs', 'shoulders', 'arms'],
  upper: ['chest', 'back', 'shoulders', 'arms'],
  legs: ['legs', 'core'],
  core: ['core'],
};

/** Roughly 7 minutes per exercise including rest. */
const exerciseCount = (minutes: number) => Math.max(3, Math.round(minutes / 7.5));

const scheme = (goal: Goal, compound: boolean) => {
  if (goal === 'muscle') return compound ? { sets: 4, reps: 8 } : { sets: 3, reps: 12 };
  if (goal === 'fat') return compound ? { sets: 3, reps: 12 } : { sets: 3, reps: 15 };
  return compound ? { sets: 3, reps: 15 } : { sets: 2, reps: 20 };
};

export type Plan = {
  name: string;
  items: { exercise: Exercise; sets: number; reps: number }[];
  minutes: number;
};

export function generate(opts: {
  focus: Focus;
  equipment: Equipment[];
  goal: Goal;
  minutes: number;
}): Plan {
  const muscles = FOCUS_MUSCLES[opts.focus];
  const pool = EXERCISES.filter(
    (e) => muscles.includes(e.muscle) && opts.equipment.includes(e.equipment),
  );

  const want = exerciseCount(opts.minutes);
  const picked: Exercise[] = [];

  // Round-robin across the target muscles so nothing gets three exercises
  // while another gets none. Compounds first — they earn the most per minute.
  const byMuscle = new Map<Muscle, Exercise[]>();
  for (const m of muscles) {
    byMuscle.set(
      m,
      pool
        .filter((e) => e.muscle === m)
        .sort((a, b) => Number(b.compound) - Number(a.compound)),
    );
  }

  let exhausted = false;
  while (picked.length < want && !exhausted) {
    exhausted = true;
    for (const m of muscles) {
      if (picked.length >= want) break;
      const next = byMuscle.get(m)?.shift();
      if (next) {
        picked.push(next);
        exhausted = false;
      }
    }
  }

  const items = picked.map((exercise) => {
    const s = scheme(opts.goal, exercise.compound);
    return { exercise, sets: s.sets, reps: s.reps };
  });

  const label = FOCUS.find((f) => f.key === opts.focus)?.label ?? 'Workout';

  return { name: label, items, minutes: opts.minutes };
}

export const planToExercises = (plan: Plan): LoggedExercise[] =>
  plan.items.map((i) => ({
    exerciseId: i.exercise.id,
    sets: Array.from({ length: i.sets }, () => ({ reps: i.reps, weight: 0, done: false })),
  }));
