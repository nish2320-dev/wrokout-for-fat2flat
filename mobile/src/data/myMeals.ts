import type { Meal, MealItem } from './types';

/** Saved meals and recently eaten foods; pure, so `npm run check` covers them. */

const DAY = 86400000;

/** A saved meal's totals. Carbs and fat count only when every food has them (else they're left out, as for older meals). */
export function mealTotals(items: MealItem[]): Omit<MealItem, 'name'> {
  const sum = (k: 'calories' | 'protein' | 'carbs' | 'fat') => Math.round(items.reduce((n, i) => n + (i[k] ?? 0), 0));
  const known = items.length > 0 && items.every((i) => i.carbs !== undefined && i.fat !== undefined);
  return { calories: sum('calories'), protein: sum('protein'), ...(known ? { carbs: sum('carbs'), fat: sum('fat') } : {}) };
}

const key = (name: string) => name.trim().toLowerCase();

/**
 * What the user ate recently, one entry per food (by name), most recent
 * first, from the last 60 days: for logging again without searching.
 */
export function recentMeals(meals: Meal[], now: number, limit = 15): Meal[] {
  const seen = new Set<string>();
  const out: Meal[] = [];
  for (const m of [...meals].sort((a, b) => b.at - a.at)) {
    if (m.at > now || now - m.at > 60 * DAY) continue;
    const k = key(m.name);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(m);
    if (out.length >= limit) break;
  }
  return out;
}

/** A logged meal as a saved-meal ingredient. */
export const itemFromMeal = (m: Meal): MealItem => ({
  name: m.name,
  calories: m.calories,
  protein: m.protein,
  ...(m.carbs !== undefined ? { carbs: m.carbs, fat: m.fat ?? 0 } : {}),
});

/** "540 cal · 32 g protein · 60 C · 18 F" */
export const macroLine = (t: Omit<MealItem, 'name'>) =>
  `${t.calories.toLocaleString()} cal · ${t.protein} g protein${t.carbs !== undefined ? ` · ${t.carbs} C · ${t.fat ?? 0} F` : ''}`;
