import { minimumCalories, PACES } from './targets';
import { AppState, Program, WeighIn } from './types';
import { fmtWeight, Units } from './units';

/**
 * The weekly smart coach. It fits a straight line through the last three
 * weeks of weigh-ins, compares the slope with the pace the user picked, and
 * suggests nudging the calorie target by 100 at most once a week. The user
 * always taps to accept; nothing changes on its own.
 */

const DAY = 86400000;
const WINDOW = 21 * DAY;
const STEP = 100;

/** Weight change per week (negative = losing), or null without enough data. */
export function weeklyTrend(weighIns: WeighIn[], now: number): number | null {
  const pts = weighIns.filter((w) => w.at <= now && now - w.at <= WINDOW);
  if (pts.length < 4) return null;
  const span = pts[pts.length - 1].at - pts[0].at;
  if (span < 10 * DAY) return null;
  // least-squares slope, with x in weeks to keep the numbers readable
  const xs = pts.map((p) => (p.at - pts[0].at) / (7 * DAY));
  const ys = pts.map((p) => p.weight);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const num = xs.reduce((sum, x, i) => sum + (x - mx) * (ys[i] - my), 0);
  const den = xs.reduce((sum, x) => sum + (x - mx) ** 2, 0);
  return den === 0 ? null : num / den;
}

export type Advice =
  | { kind: 'wait'; title: string; detail: string }
  | { kind: 'hold'; title: string; detail: string }
  | { kind: 'lower' | 'raise'; title: string; detail: string; to: number };

const per = (n: number, units: Units) => `${fmtWeight(Math.abs(n))} ${units} a week`;

export function coachAdvice(state: AppState, now: number): Advice | null {
  const program: Program | null = state.program;
  if (!program) return null;
  const units = state.profile.units;
  const goal = state.profile.calorieGoal;

  if (now - program.startedAt < 14 * DAY) {
    return {
      kind: 'wait',
      title: 'Getting to know you',
      detail: 'Weigh in a few times a week. After two weeks the coach can see your trend and fine-tune your calories.',
    };
  }
  const last = program.adjustments[program.adjustments.length - 1];
  if (last && now - last.at < 7 * DAY) {
    return {
      kind: 'wait',
      title: `New target: ${last.to.toLocaleString()} cal`,
      detail: 'Give it a week. The coach checks in again once your weight has had time to respond.',
    };
  }

  const trend = weeklyTrend(state.weighIns, now);
  if (trend === null) {
    return {
      kind: 'wait',
      title: 'Need a few more weigh-ins',
      detail: 'Log your weight at least 4 times over the next couple of weeks, same time of day, so the coach can read your trend.',
    };
  }

  const losing = program.body.goalWeight < program.body.startWeight && program.body.age >= 18;
  const floor = minimumCalories(program.body.sex);

  if (!losing) {
    // maintenance: only react to a clear drift either way
    if (trend > 0.5 * (units === 'lb' ? 1 : 0.45)) {
      return { kind: 'lower', title: 'Weight is creeping up', detail: `You're gaining about ${per(trend, units)}. Try ${STEP} fewer calories a day.`, to: Math.max(floor, goal - STEP) };
    }
    if (trend < -0.5 * (units === 'lb' ? 1 : 0.45)) {
      return { kind: 'raise', title: 'Weight is drifting down', detail: `You're losing about ${per(trend, units)}. Eat ${STEP} more calories a day to hold steady.`, to: goal + STEP };
    }
    return { kind: 'hold', title: 'Holding steady', detail: 'Your weight is stable. Keep your current target.' };
  }

  const target = PACES.find((p) => p.key === program.pace)?.perWeek[units] ?? 1;
  const loss = -trend;

  if (loss < target * 0.5) {
    if (goal - STEP < floor) {
      return {
        kind: 'hold',
        title: 'Slower than planned',
        detail: `You're ${trend > 0 ? 'gaining' : 'losing'} about ${per(trend, units)}, but your target is already at the safe minimum. Add a daily walk or an extra session instead of eating less.`,
      };
    }
    return {
      kind: 'lower',
      title: 'Slower than planned',
      detail: `You're ${trend > 0 ? 'gaining' : 'losing'} about ${per(trend, units)}; the plan is ${per(target, units)}. Lowering your target by ${STEP} calories should get you back on pace.`,
      to: goal - STEP,
    };
  }
  if (loss > target * 1.5 + (units === 'lb' ? 0.25 : 0.1)) {
    return {
      kind: 'raise',
      title: 'Faster than planned',
      detail: `You're losing about ${per(trend, units)}; the plan is ${per(target, units)}. Losing this fast can cost muscle, so eat ${STEP} more calories a day.`,
      to: goal + STEP,
    };
  }
  return {
    kind: 'hold',
    title: 'Right on track',
    detail: `You're losing about ${per(trend, units)}, right on plan. Keep doing what you're doing.`,
  };
}
