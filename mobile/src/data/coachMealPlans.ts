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
