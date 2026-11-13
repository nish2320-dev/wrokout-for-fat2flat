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
import { DIETS, MEALS, dayTarget, planDay, Diet } from '../src/data/mealplan';
import { attentionScore, flags, planReminders, snapshot, snapshotToState, suggestNote, summarize } from '../src/data/sharing';
import { emptyHealth, fmtSleep, mergeHealth, prettyKind, sharedHealth, sleepByDay, weekAverages } from '../src/data/health';
import { activeDays } from '../src/data/stats';
import { addGlasses, applyTargets, shouldAskForReview, unseenTargets, waterToday } from '../src/data/extras';
import { assistantContext, recentTurns } from '../src/data/assistant';
import { badges, bestStreak, newBadges } from '../src/data/badges';
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
eq('workouts from an earlier plan do not count toward a restarted one', programProgress({ ...withDone, workouts: [{ ...withDone.workouts[0], startedAt: prog.startedAt - 86400000, finishedAt: prog.startedAt - 82800000 }] }), { done: 0, total: 48 });
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

// --- meal plans ---
const EGG = /\begg|omelette|shakshuka/i;
const MEAT = /chicken|turkey|fish|salmon|tuna|mutton|beef|pork|prawn|shrimp/i;
eq('meal ids are unique', new Set(MEALS.map((m) => m.id)).size, MEALS.length);
eq('Hindu Veg-tagged meals have no eggs, meat or fish', MEALS.filter((m) => m.diet === 'hinduveg' && (EGG.test(m.name) || MEAT.test(m.name) || EGG.test(m.serving) || MEAT.test(m.serving))).map((m) => m.id), []);
eq('Veg-tagged meals have no meat or fish', MEALS.filter((m) => m.diet === 'veg' && (MEAT.test(m.name) || MEAT.test(m.serving))).map((m) => m.id), []);
const days = Array.from({ length: 30 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);
const plansFor = (diet: Diet, calories: number, workoutDay: boolean) => days.map((dateKey) => planDay({ dateKey, diet, calories, workoutDay }));
eq('Hindu Veg plans never include eggs, meat or fish', plansFor('hinduveg', 2000, true).every((p) => p.meals.every((m) => m.meal.diet === 'hinduveg')), true);
eq('Veg plans never include meat or fish', plansFor('veg', 2000, false).every((p) => p.meals.every((m) => m.meal.diet !== 'nonveg')), true);
eq('every diet has options in every slot', DIETS.every((d) => (['breakfast', 'lunch', 'snack', 'dinner'] as const).every((slot) => MEALS.filter((m) => m.slot === slot && (d.key === 'nonveg' || m.diet === 'hinduveg' || (d.key === 'veg' && m.diet === 'veg'))).length >= 3)), true);
const within = (diet: Diet, calories: number) => plansFor(diet, calories, false).every((p) => Math.abs(p.kcal - calories) <= calories * 0.12);
eq('plans land within 12% of 1,200 cal', DIETS.every((d) => within(d.key, 1200)), true);
eq('plans land within 12% of 2,000 cal', DIETS.every((d) => within(d.key, 2000)), true);
eq('plans land within 12% of 3,200 cal', DIETS.every((d) => within(d.key, 3200)), true);
eq('the same day always gets the same plan', JSON.stringify(planDay({ dateKey: '2026-11-10', diet: 'veg', calories: 2000, workoutDay: true })) === JSON.stringify(planDay({ dateKey: '2026-11-10', diet: 'veg', calories: 2000, workoutDay: true })), true);
eq('swapping changes that meal only', (() => { const a = planDay({ dateKey: '2026-11-10', diet: 'nonveg', calories: 2000, workoutDay: false }); const b = planDay({ dateKey: '2026-11-10', diet: 'nonveg', calories: 2000, workoutDay: false, swaps: { lunch: 1 } }); return a.meals[1].meal.id !== b.meals[1].meal.id && a.meals[0].meal.id === b.meals[0].meal.id; })(), true);
eq('lunch and dinner are never the same meal', plansFor('hinduveg', 2000, false).every((p) => p.meals[1].meal.id !== p.meals[p.meals.length - 1].meal.id), true);
eq('workout days have a post-workout snack with protein', plansFor('hinduveg', 2000, true).every((p) => p.meals.some((m) => m.label === 'Post-workout' && m.meal.protein >= 12)), true);
eq('workout and rest days average back to the target over a week', [3, 4, 5].map((d) => Math.abs(dayTarget(2000, d, true) * d + dayTarget(2000, d, false) * (7 - d) - 2000 * 7) <= 40), [true, true, true]);
eq('no main ingredient appears more than twice in a day', DIETS.every((d) => plansFor(d.key, 2000, false).every((p) => { const c = new Map<string, number>(); for (const m of p.meals) { const k = ['paneer', 'chicken', 'egg'].find((x) => m.meal.name.toLowerCase().includes(x)); if (k) c.set(k, (c.get(k) ?? 0) + 1); } return [...c.values()].every((n) => n <= 2); })), true);
eq('high-protein plans for non-veg reach decent protein', plansFor('nonveg', 2200, true).every((p) => p.protein >= 90), true);

// --- coach sharing ---
const sam = sampleState(now);
const sum = summarize(sam, now);
eq('summary: sample is in program week 6', sum.week, 6);
eq('summary: planned workouts follow the plan', sum.plannedThisWeek, 4);
eq('summary: weight is tracked', sum.weightNow !== null && sum.weightStart === 196, true);
eq('summary: weight change over a week is negative for the sample', (sum.weightChange7d ?? 0) < 0, true);
eq('summary: meals today are counted', sum.caloriesToday > 0 && sum.daysLogged7d >= 1, true);
eq('summary: waist in cm from check-ins', sum.waistStart, 97);
const snapNo = snapshot(sam, now, false);
eq('snapshot without photo sharing strips photo names', snapNo.checkIns.every((c) => Object.keys(c.photos).length === 0), true);
const withPhoto = { ...sam, checkIns: [{ id: 'c', at: now, photos: { front: 'a.jpg' } }] };
eq('snapshot with photo sharing keeps photo names', snapshot(withPhoto, now, true).checkIns[0].photos.front, 'a.jpg');
eq('snapshot drops unfinished workouts', snapshot({ ...sam, workouts: [{ id: 'x', name: 'x', startedAt: now, exercises: [] }] }, now, false).workouts.length, 0);
eq('snapshot drops meals older than 30 days', snapshot({ ...sam, meals: [{ id: 'm', name: 'm', calories: 1, protein: 1, at: now - 40 * DAY }] }, now, false).meals.length, 0);
eq('snapshot round-trips into the same summary', JSON.stringify(summarize(snapshotToState(snapshot(sam, now, true)), now)), JSON.stringify(sum));
eq('snapshotToState tolerates junk', snapshotToState(null).workouts.length, 0);

const fresh = summarize({ ...initialState, program: { ...sam.program!, startedAt: startOfDayAt(now) } }, now);
eq('a brand-new client is flagged with no workouts', flags(fresh, now)[0].key, 'inactive');
eq('a brand-new client gets a welcome note', suggestNote('Priya Shah', fresh, now).startsWith('Hey Priya, welcome aboard'), true);
const idle = { ...sum, lastWorkoutAt: now - 8 * DAY };
eq('8 days idle is flagged red', flags(idle, now)[0], { key: 'inactive', label: 'No workout in 8 days', tone: 'red' });
eq('idle note mentions the days', suggestNote('Sam', idle, now).includes('8 days'), true);
const onTrack = { ...sum, lastWorkoutAt: now, workoutsThisWeek: 4, lastCheckInAt: now, daysLogged7d: 5, avgCalories7d: sum.calorieGoal, avgProtein7d: sum.proteinGoal };
eq('a client doing everything is on track', flags(onTrack, now).map((f) => f.key), ['ontrack']);
eq('on-track note praises weight lost', suggestNote('Alex', onTrack, now).startsWith('Great work Alex! You\'re down'), true);
const behind = { ...onTrack, workoutsThisWeek: 0, weekStartAt: startOfDayAt(now) - 5 * DAY };
eq('0 of 4 with 2 days left is behind', flags(behind, now)[0].key, 'behind');
eq('0 of 4 on day 1 is not behind yet', flags({ ...behind, weekStartAt: startOfDayAt(now) }, now)[0].key, 'ontrack');
eq('a summary from last week is not flagged behind', flags({ ...behind, weekStartAt: startOfDayAt(now) - 9 * DAY }, now)[0].key, 'ontrack');
eq('overeating is flagged', flags({ ...onTrack, avgCalories7d: Math.round(sum.calorieGoal * 1.3) }, now)[0].key, 'calories');
eq('low protein tip follows the diet', suggestNote('A', { ...onTrack, avgProtein7d: 50, diet: 'hinduveg' }, now).includes('paneer, dal'), true);
eq('no meal logs is flagged', flags({ ...onTrack, daysLogged7d: 0, avgCalories7d: null }, now)[0].key, 'nolog');
eq('red clients sort above amber above on track', attentionScore(idle, now) > attentionScore(behind, now) && attentionScore(behind, now) > attentionScore(onTrack, now), true);

const rem = planReminders(sam, now);
eq('reminders: none without a program', planReminders(initialState, now).length, 0);
eq('reminders: all in the future', rem.every((r) => r.at > now), true);
eq('reminders: check-in is always scheduled', rem.some((r) => r.id === 'checkin'), true);
eq('reminders: no workout nudge after training today', rem.some((r) => r.id === 'workout'), false);
const restDay = { ...initialState, program: { ...sam.program!, startedAt: startOfDayAt(now) } };
eq('reminders: workout nudge names the next session', planReminders(restDay, now).find((r) => r.id === 'workout')?.title.endsWith('is up next'), true);
eq('reminders: weigh-in nudge only when overdue', planReminders({ ...sam, weighIns: [{ at: now - 4 * DAY, weight: 190 }] }, now).some((r) => r.id === 'weigh'), true);
eq('reminders: no weigh-in nudge after a recent weigh-in', planReminders({ ...sam, weighIns: [{ at: now - DAY, weight: 190 }] }, now).some((r) => r.id === 'weigh'), false);

// --- health apps ---
const today0 = startOfDayAt(now);
const lbState: AppState = { ...initialState, weighIns: [{ at: now - 3600000, weight: 190 }] };
const pull = {
  days: [{ date: today0, steps: 8000, activeCalories: 420, sleepMinutes: 430, restingHr: 61 }, { date: today0 - 50 * DAY, steps: 1 }],
  workouts: [{ id: 'run1', start: now - 2 * DAY, end: now - 2 * DAY + 1800000, kind: 'Running', calories: 300 }],
  weights: [
    { id: 'scale-a', at: now - 3600000 + 600000, kg: 86.2 },  // ~190.0 lb, same time as the typed-in one
    { id: 'scale-b', at: now - 2 * DAY, kg: 87 },
  ],
  bodyFat: { at: now - DAY, percent: 24.5 },
};
const merged = mergeHealth(lbState, pull, now);
eq('health: today is stored', merged.health?.days.find((d) => d.date === today0)?.steps, 8000);
eq('health: days older than the window are dropped', merged.health?.days.length, 1);
eq('health: scale weights convert to lb', merged.weighIns.find((w) => w.hid === 'scale-b')?.weight, 191.8);
eq('health: a scale weight matching a typed-in one is skipped', merged.weighIns.some((w) => w.hid === 'scale-a'), false);
eq('health: merging twice adds nothing new', mergeHealth(merged, pull, now).weighIns.length, merged.weighIns.length);
eq('health: kg users get kg', mergeHealth({ ...initialState, profile: { ...initialState.profile, units: 'kg' } }, pull, now).weighIns.find((w) => w.hid === 'scale-b')?.weight, 87);
eq('health: new connections do not share with a coach until asked', emptyHealth().shareWithCoach, false);
eq('health: watch workouts count as active days', activeDays(merged).has(startOfDayAt(now - 2 * DAY)), true);
eq('health: week averages', weekAverages(merged, now).steps, 8000);
eq('health: sleep format', fmtSleep(430), '7h 10m');
eq('health: workout names read nicely', [prettyKind('traditionalStrengthTraining'), prettyKind('running'), prettyKind('STRENGTH_TRAINING'), prettyKind('highIntensityIntervalTraining')], ['Strength training', 'Running', 'Strength training', 'HIIT']);
const night = today0 + 7 * 3600000;
eq('health: sleep takes the best source, not the sum', sleepByDay([
  { start: night - 7 * 3600000, end: night, source: 'watch' },
  { start: night - 6 * 3600000, end: night, source: 'phone' },
]).get(today0), 420);
eq('health: not shared with the coach unless the client says so', sharedHealth(merged, now), null);
const sharing = { ...merged, health: { ...merged.health!, shareWithCoach: true } };
eq('health: coach summary has steps when shared', summarize(sharing, now).health?.stepsToday, 8000);
eq('health: coach summary has no health when not shared', summarize(merged, now).health, undefined);
eq('health: a shared watch run counts as the last workout', summarize({ ...sharing, workouts: [] }, now).lastWorkoutAt, now - 2 * DAY + 1800000);
eq('health: snapshot round-trips health for the coach', JSON.stringify(summarize(snapshotToState(snapshot(sharing, now, false)), now).health), JSON.stringify(summarize(sharing, now).health));
eq('health: snapshot leaves health out when not shared', snapshot(merged, now, false).health, undefined);

// --- water & coach targets ---
const w1 = addGlasses([], 1, now);
eq('water: a glass is added today', waterToday({ ...initialState, water: addGlasses(w1, 2, now) }, now), 3);
eq('water: never below zero', waterToday({ ...initialState, water: addGlasses(w1, -5, now) }, now), 0);
eq('water: old days are dropped', addGlasses([{ date: today0 - 40 * DAY, glasses: 3 }], 1, now).length, 1);
const tgt = { calorieGoal: 1900, proteinGoal: 140, daysPerWeek: 5 as const, note: 'Cut a little', at: now };
const applied = applyTargets(sam, tgt, now);
eq('targets: calories and protein applied', [applied.profile.calorieGoal, applied.profile.proteinGoal], [1900, 140]);
eq('targets: workouts per week applied to the plan', applied.program?.daysPerWeek, 5);
eq('targets: logged as a coach adjustment', applied.program?.adjustments.slice(-1)[0].reason, 'Set by your coach');
eq('targets: shown until acknowledged', unseenTargets(applied), true);
eq('targets: applying the same targets again changes nothing', applyTargets(applied, tgt, now) === applied, true);
eq('targets: no plan, still sets goals', applyTargets(initialState, { ...tgt, daysPerWeek: null }, now).profile.calorieGoal, 1900);

eq('review: not before 5 workouts', shouldAskForReview(4, undefined, now), false);
eq('review: asked at the 5th workout', shouldAskForReview(5, undefined, now), true);
eq('review: not again within 4 months', shouldAskForReview(20, now - 30 * DAY, now), false);
eq('review: again after 4 months', shouldAskForReview(20, now - 130 * DAY, now), true);

// --- AI assistant ---
const ctx = assistantContext(sam, now, 'Coach Nish');
eq('assistant: context names the targets', ctx.includes('2,250 calories, 145 g protein'), true);
eq('assistant: context has the Transformation week', ctx.includes('week 6 of 12'), true);
eq('assistant: context mentions the coach', ctx.includes('Coach Nish'), true);
eq('assistant: context is short enough to send', ctx.length < 6000, true);
eq('assistant: works for a brand-new user', assistantContext(initialState, now, null).includes('No workouts logged yet'), true);
const convo = Array.from({ length: 15 }, (_, i) => ({ id: String(i), role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: 'm' + i, at: i }));
eq('assistant: sends at most 12 turns, starting with a question', [recentTurns(convo).length <= 12, recentTurns(convo)[0].role], [true, 'user']);

eq('assistant: chats not shared unless the client allows it', snapshot({ ...sam, assistant: convo }, now, false).assistant, undefined);
eq('assistant: chats shared when allowed', snapshot({ ...sam, assistant: convo, profile: { ...sam.profile, shareAssistant: true } }, now, false).assistant?.length, 15);

// --- badges ---
const got = (st: AppState) => badges(st, now).filter((b) => b.earned).map((b) => b.id);
eq('badges: none for a new user', got(initialState), []);
eq('badges: sample earns workout and weight badges', ['workout-1', 'workout-10', 'lost-5lb', 'lost-10lb', 'checkin-4', 'phase-build'].every((id) => got(sam).includes(id)), true);
eq('badges: sample has a 4-day best streak', bestStreak(sam), 4);
eq('badges: kg users get kg milestones', badges({ ...initialState, profile: { ...initialState.profile, units: 'kg' } }, now).some((b) => b.id === 'lost-2kg'), true);
eq('badges: seen badges are not new again', newBadges({ ...sam, profile: { ...sam.profile, seenBadges: got(sam) } }, now).length, 0);
eq('badges: ids are unique', new Set(badges(sam, now).map((b) => b.id)).size, badges(sam, now).length);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
