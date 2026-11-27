import { type Diet, planDay, portionLabel } from './mealplan';
import { mealTotals } from './myMeals';
import type { Meal, MealItem } from './types';

/** Meal plans a coach writes for clients; pure, so `npm run check` covers them. */

export type PlanSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'snack2';

export const PLAN_SLOTS: { key: PlanSlot; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'snack', label: 'Snack' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack2', label: 'Evening snack' },
];

export type PlanMeal = { slot: PlanSlot; items: MealItem[] };

/** A row of coach_meal_plans. */
export type CoachMealPlan = { id: string; name: string; note: string; meals: PlanMeal[]; created_at: string };

export const slotLabel = (slot: PlanSlot) => PLAN_SLOTS.find((s) => s.key === slot)?.label ?? 'Meal';

/** The day's totals for the whole plan. */
export const planTotals = (meals: PlanMeal[]) => mealTotals(meals.flatMap((m) => m.items));

export const planRef = (planId: string, slot: PlanSlot) => `${planId}:${slot}`;

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Which of the plan's meals were logged on the day containing `day`. */
export function loggedSlots(meals: Meal[], planId: string, day: number): Set<PlanSlot> {
  const from = startOfDay(day);
  const prefix = `${planId}:`;
  return new Set(
    meals
      .filter((m) => m.planRef?.startsWith(prefix) && m.at >= from && m.at < from + 86400000)
      .map((m) => m.planRef!.slice(prefix.length) as PlanSlot),
  );
}

/** The plan in the order of the day, with empty meals left out. */
export const orderedMeals = (meals: PlanMeal[]) =>
  PLAN_SLOTS.map((s) => meals.find((m) => m.slot === s.key)).filter((m): m is PlanMeal => !!m && m.items.length > 0);

/** What gets logged when the client taps a meal of the plan. */
export const mealToLog = (plan: CoachMealPlan, m: PlanMeal) => ({
  name: m.items.length === 1 ? m.items[0].name : `${slotLabel(m.slot)}: ${m.items.map((i) => i.name).join(', ')}`.slice(0, 120),
  ...mealTotals(m.items),
  planRef: planRef(plan.id, m.slot),
});

/**
 * A sample day for the coach to edit and send: the app's meal-plan builder
 * sized to `calories` for the diet. Different seeds give different days.
 */
export function samplePlan(diet: Diet, calories: number, seed: number): PlanMeal[] {
  const day = planDay({ dateKey: `sample-${seed}`, diet, calories: Math.max(1200, Math.min(5000, Math.round(calories))), workoutDay: false });
  const out: PlanMeal[] = [];
  for (const m of day.meals) {
    const what = m.portion === 1 ? m.meal.serving : `${portionLabel(m.portion)} of: ${m.meal.serving}`;
    const item = { name: `${m.meal.name} (${what})`.slice(0, 120), calories: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat };
    // a second snack (big targets) becomes the evening snack
    const slot: PlanSlot = m.slot === 'snack' && out.some((x) => x.slot === 'snack') ? 'snack2' : m.slot;
    const existing = out.find((x) => x.slot === slot);
    if (existing) existing.items.push(item);
    else out.push({ slot, items: [item] });
  }
  return out;
}
