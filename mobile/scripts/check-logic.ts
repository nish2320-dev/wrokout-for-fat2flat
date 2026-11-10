// Run with: npm run check
declare const process: { exit(code: number): never };

import { generate, planToExercises } from '../src/data/generator';
import { personalRecords, streak, thisWeek, todayMacros, volume, weeklyVolume } from '../src/data/stats';
import { AppState, initialState } from '../src/data/types';
import { convertUnits, fmtWeight } from '../src/data/units';
import { sampleState } from '../src/data/sample';
import { computeTargets, validateBody } from '../src/data/targets';
import { WEEKS, buildSession, preferredIds, checkInDue, nextSession, phaseOf, programProgress, weekOf, weekSessions } from '../src/data/program';
import { coachAdvice, weeklyTrend } from '../src/data/coach';
import { Body, Program } from '../src/data/types';
import { EXERCISES } from '../src/data/exercises';
import { COMMON_FOODS, macrosFor, parseProduct, searchCommon } from '../src/data/food';

const DAY = 86400000;
const startOfDayAt = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
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

// --- food ---
const pb = parseProduct({
  code: '123',
  product_name: 'Crunchy Peanut Butter',
  brands: 'Acme, Acme Foods',
  serving_size: '2 tbsp (32 g)',
  serving_quantity: '32',
  nutriments: { 'energy-kcal_100g': 588, proteins_100g: 25 },
});
eq('product parses name, first brand and serving', [pb?.name, pb?.brand, pb?.serving], ['Crunchy Peanut Butter', 'Acme', { grams: 32, label: '2 tbsp (32 g)' }]);
eq('a serving of peanut butter is 188 cal, 8 g protein', pb && macrosFor(pb, 32), { calories: 188, protein: 8 });
eq('kJ-only products convert to kcal', parseProduct({ product_name: 'Oat drink', nutriments: { energy_100g: 200 } })?.kcal100, 47.8);
eq('products without calories are dropped', parseProduct({ product_name: 'Mystery', nutriments: {} }), null);
eq('products without a name are dropped', parseProduct({ nutriments: { 'energy-kcal_100g': 100 } }), null);
eq('missing protein counts as zero', parseProduct({ product_name: 'Cola', nutriments: { 'energy-kcal_100g': 42 } })?.protein100, 0);
eq('no serving size means grams only', parseProduct({ product_name: 'Rice', serving_quantity: 0, nutriments: { 'energy-kcal_100g': 360 } })?.serving, undefined);
const names = (q: string) => searchCommon(q).map((f) => f.name);
eq('coffee finds black coffee first', names('coffee')[0], 'Coffee, black');
eq('a typo still finds coffee', names('cofee')[0], 'Coffee, black');
eq('a swapped-letter typo still finds protein', names('protien shake').length > 0, true);
eq('protein shake finds shakes', names('protein shake').slice(0, 3).every((n) => n.toLowerCase().includes('shake')), true);
eq('aliases work (soda finds cola)', names('soda').includes('Cola'), true);
eq('beef does not turn up beer', names('beef').some((n) => n.startsWith('Beer')), false);
eq('chicken does not turn up chickpeas', names('chicken').includes('Chickpeas, cooked'), false);
eq('nonsense finds nothing', names('xyzzy').length, 0);
eq('common search matches words in any order', searchCommon('yogurt greek').map((f) => f.name), ['Greek yogurt, plain nonfat']);
eq('common search ignores case and empty input', [searchCommon('BANANA').length, searchCommon('  ').length], [1, 0]);
eq('common foods have unique ids', new Set(COMMON_FOODS.map((f) => f.id)).size, COMMON_FOODS.length);
eq('common foods have sane values', COMMON_FOODS.every((f) => f.kcal100 >= 0 && f.kcal100 <= 900 && f.protein100 <= 100 && (f.serving?.grams ?? 1) > 0), true);

// --- sample data ---
const demo = sampleState(now);
eq('sample has a 4-day streak', streak(demo), 4);
eq('sample volume shows in all 6 recent weeks', weeklyVolume(demo, 6).every((v) => v > 0), true);
eq('sample volume grows over time', weeklyVolume(demo, 6)[5] > weeklyVolume(demo, 6)[0], true);
eq('sample has PRs for every lift', personalRecords(demo).length, 15);
eq('sample meals land today', todayMacros(demo).calories > 0, true);
eq('sample has nothing in the future', [...demo.workouts.map((w) => w.finishedAt!), ...demo.meals.map((m) => m.at), ...demo.weighIns.map((x) => x.at)].every((t) => t <= now), true);
const dawn = new Date(now); dawn.setHours(5, 0, 0, 0);
const early = sampleState(dawn.getTime());
eq('sample loaded at 5am has nothing in the future', [...early.workouts.map((w) => w.finishedAt!), ...early.meals.map((m) => m.at), ...early.weighIns.map((x) => x.at)].every((t) => t <= dawn.getTime()), true);
eq('sample ids are unique', new Set(demo.workouts.map((w) => w.id)).size, demo.workouts.length);

// --- transformation targets ---
const man: Body = { sex: 'male', age: 30, heightCm: 180, startWeight: 90, goalWeight: 80, activity: 'moderate' };
// Mifflin: 10*90 + 6.25*180 - 5*30 + 5 = 1880; x1.55 = 2914 -> 2910; steady -500
eq('maintenance from Mifflin-St Jeor', computeTargets(man, 'steady', 'kg').maintenance, 2910);
eq('steady pace is a 500 cal deficit', computeTargets(man, 'steady', 'kg').calories, 2410);
eq('protein is 1.8 g/kg of goal weight', computeTargets(man, 'steady', 'kg').protein, 145);
const smallWoman: Body = { sex: 'female', age: 40, heightCm: 155, startWeight: 130, goalWeight: 115, activity: 'sedentary' };
const sw = computeTargets(smallWoman, 'fast', 'lb');
eq('deficit never drops below the safe minimum', sw.calories >= 1200, true);
eq('deficit never exceeds 25% of maintenance', sw.calories >= sw.maintenance * 0.75 - 5, true);
eq('a capped target explains itself', sw.note !== undefined, true);
eq('under-18s get maintenance', computeTargets({ ...man, age: 16 }, 'fast', 'kg').maintaining, true);
eq('goal above current weight means maintenance', computeTargets({ ...man, goalWeight: 95 }, 'steady', 'kg').calories, 2910);
eq('lb and kg give the same calories', Math.abs(computeTargets({ ...man, startWeight: 198.4, goalWeight: 176.4 }, 'steady', 'lb').calories - 2410) <= 10, true);
eq('a healthy setup validates', validateBody(man, 'kg'), null);
eq('an underweight goal is refused', validateBody({ ...man, goalWeight: 55 }, 'kg') !== null, true);

// --- transformation program ---
const prog: Program = { startedAt: startOfDayAt(now - 20 * DAY), daysPerWeek: 4, equipment: ['dumbbells', 'bodyweight'], body: man, pace: 'steady', adjustments: [] };
eq('day 21 of the program is week 3', weekOf(prog, now), 3);
eq('after 12 weeks the program is over', weekOf({ ...prog, startedAt: startOfDayAt(now - 90 * DAY) }, now), WEEKS + 1);
eq('phases change every 4 weeks', [1, 4, 5, 8, 9, 12].map((w) => phaseOf(w).key), ['foundation', 'foundation', 'build', 'build', 'shred', 'shred']);
const sessions = weekSessions(prog, 3);
eq('a 4-day plan has 4 sessions a week', sessions.length, 4);
eq('sessions use only the chosen equipment', sessions.every((x) => x.plan.items.every((i) => ['dumbbells', 'bodyweight'].includes(i.exercise.equipment))), true);
eq('no exercise repeats within a session', sessions.every((x) => new Set(x.plan.items.map((i) => i.exercise.id)).size === x.plan.items.length), true);
eq('every session has at least 4 exercises', sessions.every((x) => x.plan.items.length >= 4), true);
const bodyweightOnly = weekSessions({ ...prog, daysPerWeek: 3, equipment: ['bodyweight'] }, 1);
eq('bodyweight-only plans still train legs', bodyweightOnly.every((x) => x.plan.items.some((i) => i.exercise.muscle === 'legs')), true);
eq('bodyweight-only sessions have at least 4 exercises', bodyweightOnly.every((x) => x.plan.items.length >= 4), true);
eq('every program preference names a real exercise', preferredIds().filter((id) => !EXERCISES.some((e) => e.id === id)), []);
eq('sets and reps follow the phase', [buildSession(prog, 2, 0).plan.items[0].reps, buildSession(prog, 10, 0).plan.items[0].reps], [12, 8]);
const withDone = { ...initialState, program: prog, workouts: [{ id: 'x', name: 'Upper A', startedAt: now - 3600000, finishedAt: now, exercises: [], sessionKey: 'w3-d0' }] };
eq('next session skips completed ones', nextSession(withDone, now)?.key, 'w3-d1');
eq('program progress counts completed sessions', programProgress(withDone), { done: 1, total: 48 });
eq('a check-in is due with none logged', checkInDue(withDone, now), true);
eq('a check-in is not due right after one', checkInDue({ ...withDone, checkIns: [{ id: 'c', at: now - DAY, photos: {} }] }, now), false);

// --- smart coach ---
const weighs = (perWeek: number) => Array.from({ length: 8 }, (_, i) => ({ at: now - (20 - i * 2.5) * DAY, weight: 200 + (perWeek * (i * 2.5)) / 7 }));
eq('trend reads a steady loss', Math.round((weeklyTrend(weighs(-1), now) ?? 0) * 100) / 100, -1);
eq('too few weigh-ins means no trend', weeklyTrend(weighs(-1).slice(-3), now), null);
const coachState = (perWeek: number, calories = 2400) => ({
  ...initialState,
  profile: { ...initialState.profile, calorieGoal: calories },
  program: { ...prog, startedAt: now - 30 * DAY, body: { ...man, startWeight: 200, goalWeight: 180 } },
  weighIns: weighs(perWeek),
});
eq('losing too slowly lowers calories by 100', coachAdvice(coachState(-0.2), now), { kind: 'lower', title: 'Slower than planned', detail: coachAdvice(coachState(-0.2), now)!.detail, to: 2300 });
eq('on pace holds', coachAdvice(coachState(-1), now)?.kind, 'hold');
eq('losing too fast raises calories', coachAdvice(coachState(-2.5), now)?.kind, 'raise');
eq('the coach never goes below the safe minimum', coachAdvice(coachState(-0.2, 1550), now)?.kind, 'hold');
eq('the coach waits two weeks after starting', coachAdvice({ ...coachState(-0.2), program: { ...coachState(-0.2).program, startedAt: now - 5 * DAY } }, now)?.kind, 'wait');
eq('the coach waits a week after a change', coachAdvice({ ...coachState(-0.2), program: { ...coachState(-0.2).program, adjustments: [{ at: now - 2 * DAY, from: 2500, to: 2400, reason: 'x' }] } }, now)?.kind, 'wait');
eq('sample data has a program in week 6', weekOf(sampleState(now).program!, now), 6);
eq('sample workouts count toward the program', programProgress(sampleState(now)).done > 0, true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
