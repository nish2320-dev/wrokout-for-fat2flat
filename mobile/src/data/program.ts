import { EXERCISES, Equipment, Exercise, Muscle } from './exercises';
import { Plan } from './generator';
import { startOfDay } from './stats';
import { AppState, Program, Workout } from './types';

/**
 * The default 12-week Fat2Flat Transformation: three 4-week phases that move
 * from higher reps to heavier, denser work. Each training day is a template
 * of slots ("a leg compound, prefer squat"), filled from the exercise library
 * with whatever equipment the user has, so every plan is doable at home or in
 * the gym. Trainers can retune it by editing the templates and PHASES below.
 */

export const WEEKS = 12;
const DAY = 86400000;

type Slot = { muscle: Muscle; prefer: string[] };
type DayTemplate = { name: string; slots: Slot[] };

const s = (muscle: Muscle, ...prefer: string[]): Slot => ({ muscle, prefer });

const FULL_A: DayTemplate = {
  name: 'Full Body A',
  slots: [
    s('legs', 'squat', 'goblet-squat', 'leg-press', 'bodyweight-squat'),
    s('chest', 'bench-press', 'incline-db-press', 'chest-press-machine', 'push-up'),
    s('back', 'barbell-row', 'db-row', 'seated-cable-row', 'pull-up'),
    s('shoulders', 'db-shoulder-press', 'overhead-press', 'pike-push-up'),
    s('core', 'plank', 'dead-bug'),
  ],
};
const FULL_B: DayTemplate = {
  name: 'Full Body B',
  slots: [
    s('legs', 'rdl', 'db-rdl', 'deadlift', 'walking-lunge', 'reverse-lunge'),
    s('back', 'lat-pulldown', 'pull-up', 'seated-cable-row', 'db-row'),
    s('chest', 'incline-db-press', 'push-up', 'chest-press-machine', 'cable-fly'),
    s('arms', 'db-curl', 'barbell-curl', 'hammer-curl'),
    s('core', 'dead-bug', 'hanging-leg-raise', 'cable-crunch'),
  ],
};
const FULL_C: DayTemplate = {
  name: 'Full Body C',
  slots: [
    s('legs', 'bulgarian-split-squat', 'goblet-squat', 'walking-lunge', 'reverse-lunge', 'leg-press', 'squat'),
    s('chest', 'push-up', 'bench-press', 'chest-press-machine'),
    s('back', 'db-row', 'seated-cable-row', 'barbell-row'),
    s('shoulders', 'lateral-raise', 'rear-delt-fly'),
    s('arms', 'triceps-pushdown', 'dip', 'skullcrusher'),
    s('core', 'hanging-leg-raise', 'plank'),
  ],
};
const UPPER_A: DayTemplate = {
  name: 'Upper A',
  slots: [
    s('chest', 'bench-press', 'chest-press-machine', 'push-up'),
    s('back', 'barbell-row', 'db-row', 'seated-cable-row'),
    s('shoulders', 'overhead-press', 'db-shoulder-press', 'pike-push-up'),
    s('back', 'lat-pulldown', 'pull-up'),
    s('arms', 'barbell-curl', 'db-curl'),
    s('arms', 'triceps-pushdown', 'skullcrusher', 'dip'),
  ],
};
const UPPER_B: DayTemplate = {
  name: 'Upper B',
  slots: [
    s('chest', 'incline-db-press', 'push-up', 'cable-fly'),
    s('back', 'pull-up', 'lat-pulldown', 'seated-cable-row'),
    s('shoulders', 'lateral-raise', 'db-shoulder-press'),
    s('back', 'face-pull', 'db-row'),
    s('arms', 'hammer-curl', 'db-curl'),
    s('arms', 'dip', 'skullcrusher', 'triceps-pushdown'),
  ],
};
const LOWER_A: DayTemplate = {
  name: 'Lower A',
  slots: [
    s('legs', 'squat', 'goblet-squat', 'leg-press', 'bodyweight-squat'),
    s('legs', 'rdl', 'db-rdl', 'deadlift', 'glute-bridge'),
    s('legs', 'walking-lunge', 'reverse-lunge', 'leg-press'),
    s('legs', 'calf-raise', 'single-leg-calf-raise'),
    s('core', 'plank', 'dead-bug'),
  ],
};
const LOWER_B: DayTemplate = {
  name: 'Lower B',
  slots: [
    s('legs', 'deadlift', 'rdl', 'db-rdl', 'glute-bridge'),
    s('legs', 'leg-press', 'bulgarian-split-squat', 'goblet-squat', 'squat', 'bodyweight-squat'),
    s('legs', 'leg-curl', 'step-up', 'walking-lunge', 'reverse-lunge'),
    s('legs', 'calf-raise', 'single-leg-calf-raise'),
    s('core', 'hanging-leg-raise', 'cable-crunch'),
  ],
};

const SPLITS: Record<Program['daysPerWeek'], DayTemplate[]> = {
  3: [FULL_A, FULL_B, FULL_C],
  4: [UPPER_A, LOWER_A, UPPER_B, LOWER_B],
  5: [UPPER_A, LOWER_A, FULL_C, UPPER_B, LOWER_B],
};

/** Every exercise id the templates name, so a typo shows up in the logic checks. */
export const preferredIds = () =>
  [...new Set(Object.values(SPLITS).flat().flatMap((d) => d.slots.flatMap((sl) => sl.prefer)))];

export type Phase = {
  key: 'foundation' | 'build' | 'shred';
  label: string;
  weeks: [number, number];
  blurb: string;
  main: { sets: number; reps: number };
  accessory: { sets: number; reps: number };
};

export const PHASES: Phase[] = [
  {
    key: 'foundation',
    label: 'Foundation',
    weeks: [1, 4],
    blurb: 'Learn the moves, build the habit. Lighter weights, more reps.',
    main: { sets: 3, reps: 12 },
    accessory: { sets: 2, reps: 15 },
  },
  {
    key: 'build',
    label: 'Build',
    weeks: [5, 8],
    blurb: 'More sets, heavier weights. Beat last week by a rep or a few pounds.',
    main: { sets: 4, reps: 10 },
    accessory: { sets: 3, reps: 12 },
  },
  {
    key: 'shred',
    label: 'Shred',
    weeks: [9, 12],
    blurb: 'Heaviest lifts and higher-rep finishers to keep strength while the fat comes off.',
    main: { sets: 4, reps: 8 },
    accessory: { sets: 3, reps: 15 },
  },
];

export const phaseOf = (week: number) =>
  PHASES.find((p) => week >= p.weeks[0] && week <= p.weeks[1]) ?? PHASES[PHASES.length - 1];

/** 1–12 while running; 13 once the 12 weeks are over. */
export function weekOf(program: Program, now: number) {
  const days = Math.floor((startOfDay(now) - program.startedAt) / DAY);
  return Math.min(WEEKS + 1, Math.max(1, Math.floor(days / 7) + 1));
}

const pick = (slot: Slot, equipment: Equipment[], used: Set<string>): Exercise | undefined => {
  const pool = EXERCISES.filter(
    (e) => e.muscle === slot.muscle && equipment.includes(e.equipment) && !used.has(e.id),
  );
  const rank = (e: Exercise) => {
    const i = slot.prefer.indexOf(e.id);
    // preferred picks in order, then any compound, then the rest
    return i >= 0 ? i : slot.prefer.length + (e.compound ? 0 : 1);
  };
  return pool.sort((a, b) => rank(a) - rank(b))[0];
};

export type ProgramSession = {
  key: string;
  week: number;
  day: number;
  plan: Plan;
};

export const sessionKey = (week: number, day: number) => `w${week}-d${day}`;

export function buildSession(program: Program, week: number, day: number): ProgramSession {
  const template = SPLITS[program.daysPerWeek][day];
  const phase = phaseOf(week);
  const used = new Set<string>();
  const items: Plan['items'] = [];
  for (const slot of template.slots) {
    const exercise = pick(slot, program.equipment, used);
    if (!exercise) continue;
    used.add(exercise.id);
    const scheme = exercise.compound ? phase.main : phase.accessory;
    items.push({ exercise, sets: scheme.sets, reps: scheme.reps });
  }
  return {
    key: sessionKey(week, day),
    week,
    day,
    plan: { name: template.name, items, minutes: Math.max(20, Math.round((items.length * 7.5) / 5) * 5) },
  };
}

export const weekSessions = (program: Program, week: number) =>
  SPLITS[program.daysPerWeek].map((_, day) => buildSession(program, week, day));

/** Session keys of finished workouts that were started from the program. */
export const completedKeys = (workouts: Workout[]) =>
  new Set(workouts.filter((w) => w.finishedAt !== undefined && w.sessionKey).map((w) => w.sessionKey!));

/** The first session of the current week not yet done, or null when the week is complete or the program is over. */
export function nextSession(state: AppState, now: number): ProgramSession | null {
  const program = state.program;
  if (!program) return null;
  const week = weekOf(program, now);
  if (week > WEEKS) return null;
  const done = completedKeys(state.workouts);
  return weekSessions(program, week).find((sess) => !done.has(sess.key)) ?? null;
}

export function programProgress(state: AppState) {
  const program = state.program;
  if (!program) return { done: 0, total: 0 };
  const total = WEEKS * program.daysPerWeek;
  const done = [...completedKeys(state.workouts)].filter((k) => {
    const m = /^w(\d+)-d(\d+)$/.exec(k);
    return m !== null && Number(m[1]) <= WEEKS && Number(m[2]) < program.daysPerWeek;
  }).length;
  return { done, total };
}

/** A check-in is due when there's none in the last 7 days. */
export function checkInDue(state: AppState, now: number) {
  const last = state.checkIns[state.checkIns.length - 1];
  return !last || now - last.at >= 7 * DAY;
}
