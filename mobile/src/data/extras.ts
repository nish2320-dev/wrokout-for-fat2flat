import { startOfDay } from './stats';
import { AppState, CoachTargets, WaterDay } from './types';

/** Water tracking and coach-set targets: small pure helpers, covered by `npm run check`. */

const DAY = 86400000;

export const DEFAULT_WATER_GOAL = 8;

export function addGlasses(days: WaterDay[], glasses: number, now: number): WaterDay[] {
  const today = startOfDay(now);
  const cur = days.find((d) => d.date === today)?.glasses ?? 0;
  const next = Math.max(0, Math.min(30, cur + glasses));
  return [...days.filter((d) => d.date !== today && d.date >= today - 35 * DAY), { date: today, glasses: next }].sort((a, b) => a.date - b.date);
}

export const waterToday = (s: AppState, now: number) => s.water?.find((d) => d.date === startOfDay(now))?.glasses ?? 0;

/**
 * Applies the coach's targets once (later calls with the same timestamp do
 * nothing): daily calories and protein, and workouts per week if the client is
 * on the Transformation. The calorie change is recorded like a coach adjustment.
 */
export function applyTargets(s: AppState, t: CoachTargets, now: number): AppState {
  if (!t || typeof t.at !== 'number' || t.at <= (s.profile.coachTargetsAt ?? 0)) return s;
  const program = s.program
    ? {
        ...s.program,
        ...(t.daysPerWeek ? { daysPerWeek: t.daysPerWeek } : {}),
        adjustments:
          t.calorieGoal !== s.profile.calorieGoal
            ? [...s.program.adjustments, { at: now, from: s.profile.calorieGoal, to: t.calorieGoal, reason: 'Set by your coach' }]
            : s.program.adjustments,
      }
    : s.program;
  return {
    ...s,
    program,
    profile: { ...s.profile, calorieGoal: t.calorieGoal, proteinGoal: t.proteinGoal, coachTargetsAt: t.at, coachTargetsNote: t.note || undefined },
  };
}

/** The coach changed the plan and the user hasn't tapped "Got it" yet. */
export const unseenTargets = (s: AppState) => (s.profile.coachTargetsAt ?? 0) > (s.profile.coachTargetsSeenAt ?? 0);
