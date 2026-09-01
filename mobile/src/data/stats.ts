import { AppState, Workout } from './types';

const DAY = 86400000;

export const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Total weight moved in a workout, counting only completed sets. */
export const volume = (w: Workout) =>
  w.exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s, x) => s + (x.done ? x.reps * x.weight : 0), 0),
    0,
  );

export const setCount = (w: Workout) =>
  w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

export const totalSetCount = (w: Workout) =>
  w.exercises.reduce((n, e) => n + e.sets.length, 0);

export const durationMin = (w: Workout) =>
  w.finishedAt ? Math.max(1, Math.round((w.finishedAt - w.startedAt) / 60000)) : 0;

export const finished = (s: AppState) =>
  s.workouts.filter((w) => w.finishedAt !== undefined);

/** Consecutive days ending today (or yesterday) that have a finished workout. */
export function streak(s: AppState): number {
  const days = new Set(finished(s).map((w) => startOfDay(w.finishedAt!)));
  if (days.size === 0) return 0;

  const today = startOfDay(Date.now());
  // a streak stays alive until the end of the following day
  let cursor = days.has(today) ? today : today - DAY;
  if (!days.has(cursor)) return 0;

  let n = 0;
  while (days.has(cursor)) {
    n += 1;
    cursor -= DAY;
  }
  return n;
}

/** Volume per week for the last `weeks` weeks, oldest first. */
export function weeklyVolume(s: AppState, weeks = 8): number[] {
  const out = new Array(weeks).fill(0);
  const now = Date.now();
  for (const w of finished(s)) {
    const weeksAgo = Math.floor((now - w.finishedAt!) / (7 * DAY));
    if (weeksAgo >= 0 && weeksAgo < weeks) out[weeks - 1 - weeksAgo] += volume(w);
  }
  return out;
}

export type PR = { exerciseId: string; weight: number; reps: number; at: number };

/** Heaviest completed set per exercise, heaviest first. */
export function personalRecords(s: AppState): PR[] {
  const best = new Map<string, PR>();
  for (const w of finished(s)) {
    for (const e of w.exercises) {
      for (const set of e.sets) {
        if (!set.done || set.weight <= 0) continue;
        const cur = best.get(e.exerciseId);
        if (!cur || set.weight > cur.weight) {
          best.set(e.exerciseId, {
            exerciseId: e.exerciseId,
            weight: set.weight,
            reps: set.reps,
            at: w.finishedAt!,
          });
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => b.weight - a.weight);
}

/** The heaviest completed set for one exercise before a given time. */
export function previousBest(s: AppState, exerciseId: string, before: number) {
  let best: { weight: number; reps: number } | null = null;
  for (const w of finished(s)) {
    if (w.finishedAt! >= before) continue;
    for (const e of w.exercises) {
      if (e.exerciseId !== exerciseId) continue;
      for (const set of e.sets) {
        if (set.done && (!best || set.weight > best.weight)) {
          best = { weight: set.weight, reps: set.reps };
        }
      }
    }
  }
  return best;
}

export function todayMacros(s: AppState) {
  const today = startOfDay(Date.now());
  return s.meals
    .filter((m) => startOfDay(m.at) === today)
    .reduce((acc, m) => ({ calories: acc.calories + m.calories, protein: acc.protein + m.protein }), {
      calories: 0,
      protein: 0,
    });
}

/** Mon-first array of the current week, flagged with whether a workout landed. */
export function thisWeek(s: AppState) {
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // Mon = 0
  const monday = startOfDay(today.getTime() - dow * DAY);
  const done = new Set(finished(s).map((w) => startOfDay(w.finishedAt!)));
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return labels.map((label, i) => {
    const day = monday + i * DAY;
    return { label, done: done.has(day), today: day === startOfDay(Date.now()) };
  });
}

export const fmtVolume = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${Math.round(n)}`;

export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
