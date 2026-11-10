import { startOfDay } from './stats';
import { AppState, CheckIn, LoggedExercise, Meal, Program, WeighIn, Workout } from './types';

/**
 * Six weeks of believable history for App Store screenshots: a push/pull/legs
 * split with steady strength gains, a slow body-weight trend down, and a day
 * of meals. Deterministic (no randomness) so every load looks the same.
 * Reached from a hidden long-press on Profile; "Erase all data" removes it.
 */

const DAY = 86400000;
const HOUR = 3600000;

type Lift = { id: string; start: number; step: number; sets: number; reps: number };

const SPLIT: { name: string; lifts: Lift[] }[] = [
  {
    name: 'Push Day',
    lifts: [
      { id: 'bench-press', start: 155, step: 5, sets: 4, reps: 8 },
      { id: 'incline-db-press', start: 50, step: 2.5, sets: 3, reps: 10 },
      { id: 'overhead-press', start: 95, step: 2.5, sets: 3, reps: 8 },
      { id: 'lateral-raise', start: 20, step: 0, sets: 3, reps: 15 },
      { id: 'triceps-pushdown', start: 50, step: 2.5, sets: 3, reps: 12 },
    ],
  },
  {
    name: 'Pull Day',
    lifts: [
      { id: 'deadlift', start: 225, step: 10, sets: 3, reps: 5 },
      { id: 'barbell-row', start: 135, step: 5, sets: 4, reps: 8 },
      { id: 'lat-pulldown', start: 120, step: 5, sets: 3, reps: 10 },
      { id: 'face-pull', start: 40, step: 2.5, sets: 3, reps: 15 },
      { id: 'barbell-curl', start: 60, step: 2.5, sets: 3, reps: 10 },
    ],
  },
  {
    name: 'Leg Day',
    lifts: [
      { id: 'squat', start: 185, step: 10, sets: 4, reps: 6 },
      { id: 'rdl', start: 155, step: 5, sets: 3, reps: 8 },
      { id: 'leg-press', start: 270, step: 10, sets: 3, reps: 10 },
      { id: 'leg-curl', start: 80, step: 5, sets: 3, reps: 12 },
      { id: 'calf-raise', start: 135, step: 5, sets: 3, reps: 15 },
    ],
  },
];

/** Days ago that have a workout: a 4-day streak, then every other day for six weeks. */
const WORKOUT_DAYS = [0, 1, 2, 3, ...Array.from({ length: 19 }, (_, i) => 5 + i * 2)];

export function sampleState(now: number): AppState {
  const today = startOfDay(now);
  const oldest = Math.max(...WORKOUT_DAYS);

  const workouts: Workout[] = WORKOUT_DAYS.map((daysAgo, i) => {
    const day = SPLIT[(WORKOUT_DAYS.length - 1 - i) % SPLIT.length];
    // weeks of training so far, so the oldest sessions are the lightest
    const weeks = Math.floor((oldest - daysAgo) / 7);
    const finishedAt = daysAgo === 0 ? now - 45 * 60000 : today - daysAgo * DAY + 18 * HOUR;
    const exercises: LoggedExercise[] = day.lifts.map((l) => ({
      exerciseId: l.id,
      sets: Array.from({ length: l.sets }, (_, s) => ({
        // last set drops a rep or two, as real sets do
        reps: s === l.sets - 1 ? Math.max(1, l.reps - 1 - (i % 2)) : l.reps,
        weight: l.start + l.step * weeks,
        done: true,
      })),
    }));
    return { id: `sample-w${daysAgo}`, name: day.name, startedAt: finishedAt - 58 * 60000, finishedAt, exercises };
  });

  // every three days, trending from 196 down to about 186 with a little wobble
  const weighIns: WeighIn[] = Array.from({ length: 15 }, (_, i) => {
    const daysAgo = 42 - i * 3;
    const wobble = [0, 0.6, -0.4, 0.8, -0.2][i % 5];
    return { at: Math.min(today - daysAgo * DAY + 7 * HOUR, now - 60000), weight: Math.round((196 - i * 0.72 + wobble) * 10) / 10 };
  });

  const meal = (id: string, name: string, calories: number, protein: number, at: number): Meal => ({
    id: `sample-m${id}`,
    name,
    calories,
    protein,
    at,
  });
  // today's meals stay in the past even early in the morning, spaced out
  // rather than all stamped with the same minute
  const todayAt = (h: number, back: number) => Math.min(today + h * HOUR, now - back * 50 * 60000);
  const meals: Meal[] = [
    meal('1', 'Greek yogurt with berries', 100, 17, todayAt(15.5, 1)),
    meal('2', 'Chicken & rice bowl', 404, 41, todayAt(12.5, 2)),
    meal('3', 'Protein shake', 241, 32, todayAt(10, 3)),
    meal('4', 'Oats, banana & peanut butter', 445, 18, todayAt(7.5, 4)),
    meal('5', 'Salmon & potatoes', 570, 30, today - DAY + 19 * HOUR),
    meal('6', 'Turkey sandwich', 437, 25, today - DAY + 13 * HOUR),
  ];

  // a 4-day Transformation that began with the oldest workout, now in week 6
  const programStart = today - oldest * DAY;
  const program: Program = {
    startedAt: programStart,
    daysPerWeek: 4,
    equipment: ['barbell', 'dumbbells', 'cables', 'machine'],
    body: { sex: 'male', age: 34, heightCm: 178, startWeight: 196, goalWeight: 180, activity: 'moderate' },
    pace: 'steady',
    adjustments: [
      { at: programStart + 21 * DAY, from: 2350, to: 2250, reason: 'Slower than planned' },
    ],
  };

  // tag workouts with program sessions in date order, at most four a week
  const perWeek = new Map<number, number>();
  for (const w of [...workouts].reverse()) {
    const week = Math.floor((startOfDay(w.finishedAt!) - programStart) / (7 * DAY)) + 1;
    const n = perWeek.get(week) ?? 0;
    if (n < program.daysPerWeek) {
      w.sessionKey = `w${week}-d${n}`;
      perWeek.set(week, n + 1);
    }
  }

  // weekly check-ins with the waist coming down about 1 cm a week
  const checkIns: CheckIn[] = Array.from({ length: 7 }, (_, i) => ({
    id: `sample-c${i}`,
    at: Math.min(programStart + i * 7 * DAY + 8 * HOUR, now - 60000),
    waist: Math.round((97 - i * 0.95) * 10) / 10,
    hips: Math.round((104 - i * 0.5) * 10) / 10,
    chest: Math.round((108 - i * 0.3) * 10) / 10,
    photos: {},
  }));

  return {
    workouts,
    activeWorkoutId: null,
    meals,
    weighIns,
    profile: { name: 'Alex', calorieGoal: 2250, proteinGoal: 145, units: 'lb' },
    program,
    checkIns,
  };
}
