import { DEFAULT_WATER_GOAL } from './extras';
import { WEEKS, weekOf } from './program';
import { activeDays, finished, startOfDay } from './stats';
import { AppState } from './types';

/**
 * Milestones to celebrate. Pure, so `npm run check` covers it. A badge is
 * shown once (Profile keeps the ids already shown) and stays on the shelf.
 */

export type Badge = {
  id: string;
  title: string;
  detail: string;
  /** An Ionicons name. */
  icon: string;
  earned: boolean;
};

const DAY = 86400000;

/** The longest run of consecutive days with a workout. */
export function bestStreak(s: AppState): number {
  const days = [...activeDays(s)].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = -Infinity;
  for (const d of days) {
    // a calendar day can be 23 or 25 hours long around daylight-saving changes
    run = Math.abs(d - prev - DAY) < 2 * 3600000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function badges(s: AppState, now: number): Badge[] {
  const workouts = finished(s).length;
  const streak = bestStreak(s);
  const kg = s.profile.units === 'kg';
  const weighIns = [...s.weighIns].sort((a, b) => a.at - b.at);
  const start = s.program?.body.startWeight ?? weighIns[0]?.weight;
  const latest = weighIns[weighIns.length - 1]?.weight;
  const lost = start !== undefined && latest !== undefined ? start - latest : 0;
  const waists = [...s.checkIns].sort((a, b) => a.at - b.at).filter((c) => c.waist !== undefined);
  const waistDown = waists.length > 1 ? waists[0].waist! - waists[waists.length - 1].waist! : 0;
  const week = s.program ? weekOf(s.program, now) : 0;
  const mealDays = new Set(s.meals.map((m) => startOfDay(m.at))).size;
  const goal = s.profile.waterGoal ?? DEFAULT_WATER_GOAL;
  const waterDays = (s.water ?? []).filter((d) => d.glasses >= goal).length;
  const unit = kg ? 'kg' : 'lb';
  const steps = kg ? [2, 5, 10] : [5, 10, 20];

  const list: Badge[] = [
    { id: 'workout-1', title: 'First workout', detail: 'You logged your first workout. The hardest one is done.', icon: 'barbell', earned: workouts >= 1 },
    ...[10, 25, 50, 100].map((n) => ({ id: `workout-${n}`, title: `${n} workouts`, detail: `${n} workouts logged. Consistency is everything.`, icon: 'trophy', earned: workouts >= n })),
    ...[3, 7, 14].map((n) => ({ id: `streak-${n}`, title: `${n}-day streak`, detail: `You trained ${n} days in a row.`, icon: 'flame', earned: streak >= n })),
    ...steps.map((n) => ({ id: `lost-${n}${unit}`, title: `${n} ${unit} down`, detail: `You’ve lost ${n} ${unit} since you started. Keep going!`, icon: 'trending-down', earned: lost >= n })),
    { id: 'waist-5cm', title: kg ? 'Waist down 5 cm' : 'Waist down 2 in', detail: `Your waist is down ${kg ? '5 cm' : '2 inches'} since your first check-in.`, icon: 'resize', earned: waistDown >= 5 },
    { id: 'checkin-1', title: 'First check-in', detail: 'Your first weekly check-in is in the books.', icon: 'camera', earned: s.checkIns.length >= 1 },
    { id: 'checkin-4', title: '4 check-ins', detail: 'A month of weekly check-ins. That’s how real change is tracked.', icon: 'calendar', earned: s.checkIns.length >= 4 },
    { id: 'meals-7', title: 'Meal tracker', detail: 'You logged meals on 7 different days.', icon: 'restaurant', earned: mealDays >= 7 },
    { id: 'water-7', title: 'Hydrated', detail: 'You hit your water goal on 7 days.', icon: 'water', earned: waterDays >= 7 },
    { id: 'phase-build', title: 'Build phase', detail: 'Foundation complete: you’ve reached the Build phase.', icon: 'construct', earned: week >= 5 },
    { id: 'phase-shred', title: 'Shred phase', detail: 'Into the final phase of your Transformation.', icon: 'flash', earned: week >= 9 },
    { id: 'transformation', title: '12 weeks done', detail: 'You finished the 12-week Transformation. Incredible work.', icon: 'ribbon', earned: week > WEEKS },
  ];
  return list;
}

/** Earned badges the user hasn't been shown yet. */
export const newBadges = (s: AppState, now: number) => {
  const seen = new Set(s.profile.seenBadges ?? []);
  return badges(s, now).filter((b) => b.earned && !seen.has(b.id));
};
