import type { Meal, Profile } from './types';

const DAY = 86400000;

export type Macro = 'calories' | 'protein' | 'carbs' | 'fat';
export type Totals = Record<Macro, number>;
export type Goals = Totals;

export const MACROS: { key: Macro; label: string; unit: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'cal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
];

/** Fat's share of calories when the user hasn't set a fat goal. */
export const FAT_SHARE = 0.3;

/**
 * Carbs and fat from calories and protein: fat is 30% of calories (9 cal/g),
 * carbs get what's left (4 cal/g), never below 50 g.
 */
export function autoCarbsFat(calories: number, protein: number) {
  const fat = Math.round((calories * FAT_SHARE) / 9);
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { carbs, fat };
}

export function goalsFor(profile: Pick<Profile, 'calorieGoal' | 'proteinGoal' | 'carbGoal' | 'fatGoal'>): Goals {
  const auto = autoCarbsFat(profile.calorieGoal, profile.proteinGoal);
  return {
    calories: profile.calorieGoal,
    protein: profile.proteinGoal,
    carbs: profile.carbGoal ?? auto.carbs,
    fat: profile.fatGoal ?? auto.fat,
  };
}

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Totals for the day containing `now`. Meals from before carbs and fat were tracked count as 0 for those. */
export function dayTotals(meals: Meal[], now: number): Totals {
  const from = startOfDay(now);
  const to = from + DAY;
  return meals
    .filter((m) => m.at >= from && m.at < to)
    .reduce<Totals>(
      (t, m) => ({ calories: t.calories + m.calories, protein: t.protein + m.protein, carbs: t.carbs + (m.carbs ?? 0), fat: t.fat + (m.fat ?? 0) }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
}

/** True when some of today's meals have no carbs/fat (logged before the update). */
export const missingMacros = (meals: Meal[], now: number) => {
  const from = startOfDay(now);
  return meals.some((m) => m.at >= from && m.at < from + DAY && (m.carbs === undefined || m.fat === undefined));
};

/**
 * How far over the goal a macro is, or 0. Protein is a target to reach, not a
 * limit, so it is never "over" (more protein helps keep muscle while cutting).
 */
export function overBy(key: Macro, totals: Totals, goals: Goals) {
  if (key === 'protein') return 0;
  return Math.max(0, Math.round(totals[key] - goals[key]));
}

export type Status = 'under' | 'near' | 'hit' | 'over';

/** For the bar colour: protein turns green once hit; the others amber near the goal and red over it. */
export function statusOf(key: Macro, totals: Totals, goals: Goals): Status {
  const v = totals[key];
  const g = goals[key];
  if (key === 'protein') return v >= g ? 'hit' : 'under';
  if (v > g) return 'over';
  return v >= g * 0.9 ? 'near' : 'under';
}

const fmt = (key: Macro, n: number) => (key === 'calories' ? `${n.toLocaleString()} cal` : `${n} g`);

/**
 * The warning to show after logging a meal: only for limits this meal pushed
 * over (or further over), so it doesn't nag on every snack once you're past one.
 */
export function crossingWarning(before: Totals, after: Totals, goals: Goals, day = 'today’s'): string | null {
  const crossed = MACROS.filter(({ key }) => key !== 'protein' && after[key] > goals[key] && after[key] > before[key]);
  if (crossed.length === 0) return null;
  const parts = crossed.map(({ key, label }) => `${label.toLowerCase()} by ${fmt(key, overBy(key, after, goals))}`);
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `That puts you over ${day} ${list}.`;
}
