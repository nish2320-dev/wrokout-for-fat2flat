import { EXERCISES, Equipment, Exercise, Muscle } from './exercises';
import { LoggedExercise } from './types';

export type Focus = 'full' | 'upper' | 'legs' | 'core' | 'yoga' | 'pilates' | 'cardio' | 'hiit' | 'mobility';
export type Goal = 'muscle' | 'fat' | 'endurance';

export const FOCUS: { key: Focus; label: string }[] = [
  { key: 'full', label: 'Full Body' },
  { key: 'upper', label: 'Upper Body' },
  { key: 'legs', label: 'Legs' },
  { key: 'core', label: 'Core' },
  { key: 'yoga', label: 'Yoga' },
  { key: 'pilates', label: 'Pilates' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'hiit', label: 'HIIT' },
  { key: 'mobility', label: 'Stretch' },
];

/** Sessions that aren't weight training: equipment and goal mostly don't apply. */
export const isOtherFocus = (f: Focus) => f === 'yoga' || f === 'pilates' || f === 'cardio' || f === 'hiit' || f === 'mobility';

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
  yoga: ['yoga'],
  pilates: ['pilates'],
  cardio: ['cardio'],
  hiit: ['hiit'],
  mobility: ['mobility'],
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

/**
 * Yoga, Pilates, HIIT and stretch sessions: a sequence of moves sized to the
 * session length (poses held 30–60 s, Pilates moves for reps, HIIT in rounds).
 * Cardio: one or two machines or activities splitting the minutes.
 */
function generateOther(focus: Focus, equipment: Equipment[], goal: Goal, minutes: number): Plan {
  const label = FOCUS.find((f) => f.key === focus)?.label ?? 'Workout';
  const pool = EXERCISES.filter((e) => e.muscle === focus);
  if (focus === 'cardio') {
    // machines the user has, else what needs no equipment
    const usable = pool.filter((e) => equipment.includes(e.equipment));
    const choices = usable.length ? usable : pool.filter((e) => e.equipment === 'bodyweight');
    // endurance: one long piece; otherwise two pieces to keep it interesting
    const picks = goal === 'endurance' || minutes <= 20 ? choices.slice(0, 1) : choices.slice(0, 2);
    const each = Math.round(minutes / picks.length / 5) * 5 || minutes;
    return { name: label, items: picks.map((exercise) => ({ exercise, sets: 1, reps: each })), minutes };
  }
  const hold = goal === 'endurance' ? 60 : focus === 'hiit' ? 40 : goal === 'muscle' ? 45 : 30;
  const perMove = focus === 'hiit' ? 4.5 : focus === 'pilates' ? 3 : 2.5; // minutes, rests included
  const count = Math.max(4, Math.min(pool.length, Math.round(minutes / perMove)));
  const items = pool.slice(0, count).map((exercise) => {
    const sets = focus === 'hiit' ? 3 : 2;
    if (exercise.kind === 'hold') return { exercise, sets, reps: hold };
    const reps = focus === 'hiit' ? 12 : exercise.id === 'pilates-hundred' ? 100 : exercise.id === 'sun-salutation' ? 5 : 10;
    return { exercise, sets: exercise.id === 'pilates-hundred' ? 1 : sets, reps };
  });
  return { name: label, items, minutes };
}

export function generate(opts: {
  focus: Focus;
  equipment: Equipment[];
  goal: Goal;
  minutes: number;
}): Plan {
  if (isOtherFocus(opts.focus)) return generateOther(opts.focus, opts.equipment, opts.goal, opts.minutes);
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
