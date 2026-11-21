import { EXERCISES, Equipment, Exercise, Muscle, STRENGTH_GROUPS } from './exercises';
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

/** `minutes` sets cardio length per phase (foundation, build, final). */
type Slot = { muscle: Muscle; prefer: string[]; minutes?: [number, number, number] };
type DayTemplate = { name: string; slots: Slot[] };

const s = (muscle: Muscle, ...prefer: string[]): Slot => ({ muscle, prefer });
const cardio = (minutes: [number, number, number], ...prefer: string[]): Slot => ({ muscle: 'cardio', prefer, minutes });

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

// ---- yoga & Pilates ----
const YOGA_FLOW: DayTemplate = {
  name: 'Yoga Flow',
  slots: [
    s('yoga', 'sun-salutation'), s('yoga', 'warrior-1'), s('yoga', 'warrior-2'), s('yoga', 'triangle'),
    s('yoga', 'tree-pose'), s('yoga', 'low-lunge'), s('yoga', 'pigeon'), s('yoga', 'childs-pose'),
  ],
};
const YOGA_STRENGTH: DayTemplate = {
  name: 'Power Yoga',
  slots: [
    s('yoga', 'sun-salutation'), s('yoga', 'chair-pose'), s('yoga', 'warrior-2'), s('yoga', 'downward-dog'),
    s('yoga', 'boat-pose'), s('yoga', 'bridge-pose'), s('yoga', 'cobra'), s('yoga', 'seated-forward-fold'),
  ],
};
const PILATES_CORE: DayTemplate = {
  name: 'Pilates Core',
  slots: [
    s('pilates', 'pilates-hundred'), s('pilates', 'roll-up'), s('pilates', 'single-leg-stretch'), s('pilates', 'double-leg-stretch'),
    s('pilates', 'criss-cross'), s('pilates', 'leg-circles'), s('pilates', 'teaser'), s('pilates', 'spine-twist'),
  ],
};
const PILATES_BODY: DayTemplate = {
  name: 'Pilates Full Body',
  slots: [
    s('pilates', 'shoulder-bridge'), s('pilates', 'side-leg-lift'), s('pilates', 'pilates-swimming'), s('pilates', 'roll-up'),
    s('core', 'plank', 'dead-bug'), s('legs', 'glute-bridge', 'bodyweight-squat'), s('pilates', 'criss-cross'),
  ],
};
const STRETCH_DAY: DayTemplate = {
  name: 'Stretch & Restore',
  slots: [
    s('yoga', 'cat-cow'), s('mobility', 'worlds-greatest'), s('mobility', 'hip-flexor-stretch'), s('mobility', 'hamstring-stretch'),
    s('mobility', 'figure-four'), s('mobility', 'thoracic-rotation'), s('yoga', 'childs-pose'),
  ],
};

// ---- cardio ----
const CARDIO_STEADY: DayTemplate = {
  name: 'Steady Cardio',
  slots: [cardio([25, 30, 35], 'incline-walk', 'elliptical', 'stationary-bike', 'brisk-walk'), s('mobility', 'calf-stretch')],
};
const CARDIO_STEADY_2: DayTemplate = {
  name: 'Cardio Mix',
  slots: [cardio([15, 20, 20], 'rower', 'stair-climber', 'jump-rope', 'brisk-walk'), cardio([15, 15, 20], 'stationary-bike', 'elliptical', 'run')],
};
const CARDIO_INTERVALS: DayTemplate = {
  name: 'HIIT Intervals',
  slots: [
    s('hiit', 'jumping-jack'), s('hiit', 'squat-jump'), s('hiit', 'mountain-climber'), s('hiit', 'burpee'),
    s('hiit', 'high-knees'), s('hiit', 'skater'), s('hiit', 'plank-jack'),
  ],
};
const CARDIO_LONG: DayTemplate = {
  name: 'Long Cardio',
  slots: [cardio([35, 45, 50], 'run', 'treadmill', 'stationary-bike', 'brisk-walk'), s('mobility', 'hamstring-stretch')],
};

export type PlanStyle = NonNullable<Program['style']>;

export const PLAN_STYLES: { key: PlanStyle; label: string; detail: string }[] = [
  { key: 'strength', label: 'Strength', detail: 'Weight training: the classic Fat2Flat plan.' },
  { key: 'yogapilates', label: 'Yoga & Pilates', detail: 'Yoga flows, Pilates and stretching: strength, balance and flexibility with no equipment.' },
  { key: 'cardio', label: 'Cardio', detail: 'Steady cardio, HIIT intervals and one long session a week, with some strength on 4–5 day plans.' },
  { key: 'mixed', label: 'Mixed', detail: 'Weights plus a cardio day and a yoga or Pilates day each week.' },
];

const SPLITS: Record<PlanStyle, Record<Program['daysPerWeek'], DayTemplate[]>> = {
  strength: {
    3: [FULL_A, FULL_B, FULL_C],
    4: [UPPER_A, LOWER_A, UPPER_B, LOWER_B],
    5: [UPPER_A, LOWER_A, FULL_C, UPPER_B, LOWER_B],
  },
  yogapilates: {
    3: [YOGA_FLOW, PILATES_CORE, YOGA_STRENGTH],
    4: [YOGA_FLOW, PILATES_CORE, YOGA_STRENGTH, PILATES_BODY],
    5: [YOGA_FLOW, PILATES_CORE, YOGA_STRENGTH, PILATES_BODY, STRETCH_DAY],
  },
  cardio: {
    3: [CARDIO_STEADY, CARDIO_INTERVALS, CARDIO_LONG],
    4: [CARDIO_STEADY, CARDIO_INTERVALS, FULL_A, CARDIO_LONG],
    5: [CARDIO_STEADY, CARDIO_INTERVALS, FULL_A, CARDIO_STEADY_2, CARDIO_LONG],
  },
  mixed: {
    3: [FULL_A, CARDIO_INTERVALS, YOGA_FLOW],
    4: [UPPER_A, LOWER_A, CARDIO_STEADY, YOGA_FLOW],
    5: [UPPER_A, LOWER_A, CARDIO_INTERVALS, FULL_C, PILATES_CORE],
  },
};

const splitFor = (program: Program) => SPLITS[program.style ?? 'strength'][program.daysPerWeek];

/** Every exercise id the templates name, so a typo shows up in the logic checks. */
export const preferredIds = () =>
  [...new Set(Object.values(SPLITS).flatMap((byDays) => Object.values(byDays).flat()).flatMap((d) => d.slots.flatMap((sl) => sl.prefer)))];

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

const STYLE_BLURBS: Partial<Record<PlanStyle, Record<Phase['key'], string>>> = {
  yogapilates: {
    foundation: 'Learn the poses and moves. Shorter holds, focus on breathing and form.',
    build: 'Longer holds and more reps. Your balance and core get noticeably stronger.',
    shred: 'Your strongest weeks: longest holds and toughest flows.',
  },
  cardio: {
    foundation: 'Build the habit with steady sessions you can keep up with.',
    build: 'Longer sessions and harder intervals.',
    shred: 'Your fittest weeks: the longest sessions and toughest intervals.',
  },
};

/** The phase as this plan shows it: gaining plans end with Strength instead of Shred, and blurbs fit the plan style. */
export function phaseFor(program: Program, week: number): Phase {
  const base = phaseOf(week);
  const gaining = (program.goal ?? (program.body.goalWeight < program.body.startWeight ? 'lose' : 'maintain')) === 'gain';
  const style = program.style ?? 'strength';
  const label = base.key === 'shred' && gaining ? 'Strength' : base.label;
  const blurb =
    STYLE_BLURBS[style]?.[base.key] ??
    (base.key === 'shred' && gaining ? 'The heaviest lifts of the plan. Eat your surplus and push for new bests to add muscle.' : base.blurb);
  return { ...base, label, blurb };
}

/** 1–12 while running; 13 once the 12 weeks are over. */
export function weekOf(program: Program, now: number) {
  const days = Math.floor((startOfDay(now) - program.startedAt) / DAY);
  return Math.min(WEEKS + 1, Math.max(1, Math.floor(days / 7) + 1));
}

const pick = (slot: Slot, equipment: Equipment[], used: Set<string>): Exercise | undefined => {
  // yoga, Pilates, HIIT, stretching and cardio can always fall back to no equipment
  const usable = (e: Exercise) => equipment.includes(e.equipment) || (!STRENGTH_GROUPS.includes(e.muscle) && e.equipment === 'bodyweight');
  const pool = EXERCISES.filter((e) => e.muscle === slot.muscle && usable(e) && !used.has(e.id));
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

/** Sets and amount for a non-weights move in a phase: holds get longer and moves get more reps as the weeks go on. */
function otherScheme(exercise: Exercise, slot: Slot, phaseIndex: 0 | 1 | 2) {
  if (exercise.kind === 'cardio') return { sets: 1, reps: (slot.minutes ?? [20, 25, 30])[phaseIndex] };
  if (exercise.kind === 'hold') return { sets: [2, 3, 3][phaseIndex], reps: exercise.muscle === 'hiit' ? [30, 40, 45][phaseIndex] : [30, 45, 60][phaseIndex] };
  if (exercise.id === 'pilates-hundred') return { sets: 1, reps: 100 };
  if (exercise.id === 'sun-salutation') return { sets: 1, reps: [3, 4, 5][phaseIndex] };
  return { sets: [2, 3, 3][phaseIndex], reps: [10, 12, 15][phaseIndex] };
}

export function buildSession(program: Program, week: number, day: number): ProgramSession {
  const template = splitFor(program)[day];
  const phase = phaseOf(week);
  const phaseIndex = PHASES.findIndex((p) => p.key === phase.key) as 0 | 1 | 2;
  const used = new Set<string>();
  const items: Plan['items'] = [];
  let minutes = 0;
  for (const slot of template.slots) {
    const exercise = pick(slot, program.equipment, used);
    if (!exercise) continue;
    used.add(exercise.id);
    if (STRENGTH_GROUPS.includes(exercise.muscle) && !exercise.kind) {
      const scheme = exercise.compound ? phase.main : phase.accessory;
      items.push({ exercise, sets: scheme.sets, reps: scheme.reps });
      minutes += 7.5;
    } else {
      const scheme = otherScheme(exercise, slot, phaseIndex);
      items.push({ exercise, ...scheme });
      minutes += exercise.kind === 'cardio' ? scheme.reps : exercise.kind === 'hold' ? (scheme.sets * (scheme.reps + 20)) / 60 : scheme.sets * 1;
    }
  }
  return {
    key: sessionKey(week, day),
    week,
    day,
    plan: { name: template.name, items, minutes: Math.max(15, Math.round(minutes / 5) * 5) },
  };
}

export const weekSessions = (program: Program, week: number) =>
  splitFor(program).map((_, day) => buildSession(program, week, day));

/**
 * Session keys of finished workouts started from this program. Workouts from
 * before it began belong to an earlier plan, whose "w1-d0" must not tick off
 * the new plan's week 1.
 */
export const completedKeys = (program: Program, workouts: Workout[]) =>
  new Set(
    workouts
      .filter((w) => w.finishedAt !== undefined && w.sessionKey && w.startedAt >= program.startedAt)
      .map((w) => w.sessionKey!),
  );

/** The first session of the current week not yet done, or null when the week is complete or the program is over. */
export function nextSession(state: AppState, now: number): ProgramSession | null {
  const program = state.program;
  if (!program) return null;
  const week = weekOf(program, now);
  if (week > WEEKS) return null;
  const done = completedKeys(program, state.workouts);
  return weekSessions(program, week).find((sess) => !done.has(sess.key)) ?? null;
}

export function programProgress(state: AppState) {
  const program = state.program;
  if (!program) return { done: 0, total: 0 };
  const total = WEEKS * program.daysPerWeek;
  const done = [...completedKeys(program, state.workouts)].filter((k) => {
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
