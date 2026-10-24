// Run with: npm run check
declare const process: { exit(code: number): never };

import { generate, planToExercises } from '../src/data/generator';
import { personalRecords, streak, thisWeek, todayMacros, volume, weeklyVolume } from '../src/data/stats';
import { AppState, initialState } from '../src/data/types';
import { convertUnits, fmtWeight } from '../src/data/units';

const DAY = 86400000;
const now = Date.now();
let pass = 0, fail = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
  ok ? pass++ : fail++;
};

// --- generator ---
const plan = generate({ focus: 'full', equipment: ['barbell', 'dumbbells'], goal: 'muscle', minutes: 45 });
eq('45 min builds 6 exercises', plan.items.length, 6);
eq('every pick honours the equipment filter',
  plan.items.every((i) => ['barbell', 'dumbbells'].includes(i.exercise.equipment)), true);
eq('no exercise is duplicated',
  new Set(plan.items.map((i) => i.exercise.id)).size, plan.items.length);
eq('compounds get 4x8 under the muscle goal',
  plan.items.filter((i) => i.exercise.compound).every((i) => i.sets === 4 && i.reps === 8), true);
eq('round-robin spreads across muscles',
  new Set(plan.items.map((i) => i.exercise.muscle)).size >= 4, true);

const narrow = generate({ focus: 'core', equipment: ['barbell'], goal: 'muscle', minutes: 45 });
eq('impossible filters yield an empty plan, not a crash', narrow.items.length, 0);

const sets = planToExercises(plan);
eq('plan converts to loggable sets', sets[0].sets.length, plan.items[0].sets);
eq('new sets start unlogged', sets.every((e) => e.sets.every((s) => !s.done)), true);

// --- stats ---
const w = (daysAgo: number, weight: number, reps: number, done = true) => ({
  id: `w${daysAgo}`,
  name: 'Test',
  startedAt: now - daysAgo * DAY - 3600000,
  finishedAt: now - daysAgo * DAY,
  exercises: [{ exerciseId: 'squat', sets: [{ reps, weight, done }] }],
});

const s: AppState = { ...initialState, workouts: [w(0, 100, 5), w(1, 90, 5), w(2, 80, 5), w(5, 70, 5)] };
eq('volume counts reps x weight', volume(s.workouts[0]), 500);
eq('streak counts back from today', streak(s), 3);
eq('a gap ends the streak', streak({ ...s, workouts: [w(5, 70, 5)] }), 0);
eq('no workouts means no streak', streak(initialState), 0);
eq('PR picks the heaviest set', personalRecords(s)[0].weight, 100);
eq('unfinished sets are excluded from volume', volume(w(0, 100, 5, false) as any), 0);
eq('weekly buckets span 8 weeks', weeklyVolume(s).length, 8);
eq('this week has 7 days', thisWeek(s).length, 7);
eq('exactly one day is today', thisWeek(s).filter((d) => d.today).length, 1);

const withMeals: AppState = {
  ...initialState,
  meals: [
    { id: 'a', name: 'Eggs', calories: 300, protein: 20, at: now },
    { id: 'b', name: 'Old', calories: 999, protein: 99, at: now - 3 * DAY },
  ],
};
eq('today macros ignore older meals', todayMacros(withMeals), { calories: 300, protein: 20 });

// --- units ---
const lb: AppState = { ...s, weighIns: [{ at: now, weight: 200 }] };
const kg = convertUnits(lb, 'kg');
eq('switching to kg sets the unit', kg.profile.units, 'kg');
eq('set weights convert to kg', fmtWeight(kg.workouts[0].exercises[0].sets[0].weight), '45.36');
eq('weigh-ins convert to kg', fmtWeight(kg.weighIns[0].weight), '90.72');
let back = kg;
for (let i = 0; i < 10; i++) back = convertUnits(convertUnits(back, 'lb'), 'kg');
back = convertUnits(back, 'lb');
const near = (n: number) => Math.round(n * 1e6) / 1e6;
eq('repeated switching never drifts sets', back.workouts.map((x) => near(x.exercises[0].sets[0].weight)), [100, 90, 80, 70]);
eq('repeated switching never drifts weigh-ins', near(back.weighIns[0].weight), 200);
eq('same unit is a no-op', convertUnits(lb, 'lb'), lb);
eq('zero weight stays zero', convertUnits({ ...s, workouts: [w(0, 0, 10)] }, 'kg').workouts[0].exercises[0].sets[0].weight, 0);
eq('fmtWeight trims to two decimals', [fmtWeight(45.359237), fmtWeight(100), fmtWeight(22.25), fmtWeight(99.999)], ['45.36', '100', '22.25', '100']);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
