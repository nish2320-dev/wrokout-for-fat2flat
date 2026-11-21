import { Activity, Body, Pace, Program } from './types';
import { Units } from './units';

/**
 * Daily calorie and protein targets for the Transformation program.
 *
 * Energy use is the Mifflin-St Jeor resting rate times an activity factor.
 * The fat-loss deficit is capped twice for safety: never more than 25% of
 * daily energy use, and never below a minimum intake (1,500 cal for men,
 * 1,200 for women). Under-18s and anyone already at goal get maintenance.
 */

const LB_PER_KG = 2.20462262;

export const ACTIVITY: { key: Activity; label: string; detail: string; factor: number }[] = [
  { key: 'sedentary', label: 'Mostly sitting', detail: 'Desk job, little walking', factor: 1.2 },
  { key: 'light', label: 'Lightly active', detail: 'On your feet some of the day', factor: 1.375 },
  { key: 'moderate', label: 'Active', detail: 'On your feet most of the day', factor: 1.55 },
  { key: 'active', label: 'Very active', detail: 'Physical job or sports', factor: 1.725 },
];

/** Deficit per day; ~3,500 cal is a pound of fat, so 250/500/750 ≈ 0.5/1/1.5 lb a week. */
export const PACES: { key: Pace; label: string; deficit: number; perWeek: Record<Units, number> }[] = [
  { key: 'gentle', label: 'Gentle', deficit: 250, perWeek: { lb: 0.5, kg: 0.25 } },
  { key: 'steady', label: 'Steady', deficit: 500, perWeek: { lb: 1, kg: 0.5 } },
  { key: 'fast', label: 'Fast', deficit: 750, perWeek: { lb: 1.5, kg: 0.7 } },
];

export type Goal = NonNullable<Program['goal']>;

export const GOALS: { key: Goal; label: string; detail: string }[] = [
  { key: 'lose', label: 'Lose fat', detail: 'A steady calorie deficit with training to keep your muscle.' },
  { key: 'gain', label: 'Gain weight', detail: 'A small calorie surplus with strength training, so most of what you gain is muscle.' },
  { key: 'maintain', label: 'Maintain', detail: 'Stay at your weight while you get fitter and stronger.' },
];

/** Surplus per day for gaining; slower gain is leaner gain. */
export const GAIN_PACES: { key: Pace; label: string; surplus: number; perWeek: Record<Units, number> }[] = [
  { key: 'gentle', label: 'Lean', surplus: 250, perWeek: { lb: 0.5, kg: 0.25 } },
  { key: 'steady', label: 'Steady', surplus: 400, perWeek: { lb: 0.75, kg: 0.35 } },
  { key: 'fast', label: 'Faster', surplus: 500, perWeek: { lb: 1, kg: 0.45 } },
];

/** The plan's goal; older plans didn't store one. */
export const goalOf = (p: Pick<Program, 'goal' | 'body'>): Goal =>
  p.goal ?? (p.body.goalWeight < p.body.startWeight ? 'lose' : 'maintain');

/** Planned weight change per week for the pace: negative when losing. */
export function plannedRate(goal: Goal, pace: Pace, units: Units) {
  if (goal === 'gain') return GAIN_PACES.find((p) => p.key === pace)?.perWeek[units] ?? 0.5;
  if (goal === 'lose') return -(PACES.find((p) => p.key === pace)?.perWeek[units] ?? 1);
  return 0;
}

export const toKg = (w: number, units: Units) => (units === 'kg' ? w : w / LB_PER_KG);

/** Resting energy use (Mifflin-St Jeor), calories a day. */
export function bmr(sex: Body['sex'], kg: number, cm: number, age: number) {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161);
}

export const minimumCalories = (sex: Body['sex']) => (sex === 'male' ? 1500 : 1200);

export const bmi = (kg: number, cm: number) => kg / (cm / 100) ** 2;

export type Targets = {
  /** Estimated daily energy use (maintenance). */
  maintenance: number;
  calories: number;
  protein: number;
  /** True when no deficit or surplus applies: under 18, maintaining, or already at goal. */
  maintaining: boolean;
  /** True when eating in a surplus to gain. */
  gaining?: boolean;
  /** Plain-English note on any safety cap that changed the result. */
  note?: string;
};

const round10 = (n: number) => Math.round(n / 10) * 10;

export function computeTargets(
  body: Body,
  pace: Pace,
  units: Units,
  weight = body.startWeight,
  goal: Goal = body.goalWeight < body.startWeight ? 'lose' : 'maintain',
): Targets {
  const kg = toKg(weight, units);
  const goalKg = toKg(body.goalWeight, units);
  const factor = ACTIVITY.find((a) => a.key === body.activity)?.factor ?? 1.2;
  const maintenance = round10(bmr(body.sex, kg, body.heightCm, body.age) * factor);

  // protein scales with the body you're building toward, not the one you're losing
  const protein = Math.min(250, Math.round((goalKg * 1.8) / 5) * 5);

  if (body.age < 18) {
    return {
      maintenance,
      calories: maintenance,
      protein,
      maintaining: true,
      note: 'Under 18, the plan keeps calories at maintenance and focuses on training. Talk to a doctor before dieting.',
    };
  }
  if (goal === 'gain') {
    if (goalKg <= kg) return { maintenance, calories: maintenance, protein, maintaining: true };
    const surplus = GAIN_PACES.find((p) => p.key === pace)?.surplus ?? 250;
    return { maintenance, calories: round10(maintenance + surplus), protein, maintaining: false, gaining: true };
  }
  if (goal === 'maintain' || goalKg >= kg) {
    return { maintenance, calories: maintenance, protein, maintaining: true };
  }

  const deficit = PACES.find((p) => p.key === pace)?.deficit ?? 500;
  const floor = minimumCalories(body.sex);
  const planned = maintenance - deficit;
  const calories = round10(Math.max(planned, maintenance * 0.75, floor));
  const note =
    calories > round10(planned)
      ? `Capped at ${calories.toLocaleString()} cal a day so the deficit stays safe; progress may be a little slower than the pace you picked.`
      : undefined;
  return { maintenance, calories, protein, maintaining: false, note };
}

/** Why a setup can't start, or null when it's fine. */
export function validateBody(body: Body, units: Units, goal?: Goal): string | null {
  if (!(body.age >= 13 && body.age <= 100)) return 'Enter an age between 13 and 100.';
  if (!(body.heightCm >= 120 && body.heightCm <= 230)) return 'Enter your height.';
  const kg = toKg(body.startWeight, units);
  const goalKg = toKg(body.goalWeight, units);
  if (!(kg >= 30 && kg <= 300)) return 'Enter your current weight.';
  if (!(goalKg >= 30 && goalKg <= 300)) return 'Enter your goal weight.';
  if (goal === 'lose' && goalKg >= kg) return 'For fat loss, set a goal weight below your current weight.';
  if (goal === 'gain' && goalKg <= kg) return 'To gain weight, set a goal weight above your current weight.';
  if (bmi(goalKg, body.heightCm) < 18.5) {
    return 'That goal is below a healthy weight for your height. Pick a higher goal weight.';
  }
  if (goal === 'gain' && bmi(goalKg, body.heightCm) > 27) {
    return 'That goal is above a healthy weight for your height. Pick a lower goal weight.';
  }
  return null;
}
