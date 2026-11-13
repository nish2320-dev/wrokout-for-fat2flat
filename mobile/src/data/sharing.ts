import { waterToday } from './extras';
import { sharedHealth, weekAverages } from './health';
import type { Diet } from './mealplan';
import { completedKeys, nextSession, WEEKS, weekOf } from './program';
import { startOfDay } from './stats';
import { AppState, AssistantMessage, CheckIn, HealthDay, HealthWorkout, initialState, Meal, Program, WeighIn, Workout } from './types';

/**
 * What a client shares with their coach, and the coach-side logic that reads
 * it: a compact weekly summary for the client list, "needs attention" flags,
 * a suggested note, and the local reminders the client's phone schedules.
 * Pure functions only, so they are covered by `npm run check`.
 */

const DAY = 86400000;

/** The slice of a client's data uploaded for their coach. */
export type SharedSnapshot = {
  v: 1;
  profile: { calorieGoal: number; proteinGoal: number; units: 'lb' | 'kg'; diet?: Diet };
  program: Program | null;
  workouts: Workout[];
  meals: Meal[];
  weighIns: WeighIn[];
  checkIns: CheckIn[];
  /** Two weeks of health-app data, only if the client chose to share it. */
  health?: { days: HealthDay[]; workouts: HealthWorkout[]; bodyFat?: { at: number; percent: number } };
  /** Recent AI assistant conversation, only if the client chose to share it. */
  assistant?: AssistantMessage[];
};

export function snapshot(state: AppState, now: number, sharePhotos: boolean): SharedSnapshot {
  const since = (days: number) => now - days * DAY;
  const { calorieGoal, proteinGoal, units, diet } = state.profile;
  const health = sharedHealth(state, now);
  return {
    v: 1,
    profile: { calorieGoal, proteinGoal, units, ...(diet ? { diet } : {}) },
    program: state.program,
    workouts: state.workouts
      .filter((w) => w.finishedAt !== undefined && w.finishedAt >= since(120))
      .map((w) => ({
        id: w.id,
        name: w.name,
        startedAt: w.startedAt,
        finishedAt: w.finishedAt,
        ...(w.sessionKey ? { sessionKey: w.sessionKey } : {}),
        exercises: w.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.filter((x) => x.done) })),
      })),
    meals: state.meals.filter((m) => m.at >= since(30)),
    weighIns: state.weighIns.filter((x) => x.at >= since(365)),
    checkIns: state.checkIns.map((c) => ({ ...c, photos: sharePhotos ? c.photos : {} })),
    ...(health ? { health } : {}),
    ...(state.profile.shareAssistant && state.assistant?.length ? { assistant: state.assistant.slice(-30) } : {}),
  };
}

/** Rebuilds an AppState from a snapshot so the coach can reuse the app's own stats. */
export function snapshotToState(s: SharedSnapshot | null | undefined): AppState {
  if (!s || s.v !== 1) return initialState;
  return {
    ...initialState,
    workouts: s.workouts ?? [],
    meals: s.meals ?? [],
    weighIns: s.weighIns ?? [],
    checkIns: s.checkIns ?? [],
    program: s.program ?? null,
    profile: { ...initialState.profile, ...s.profile },
    ...(s.health ? { health: { enabled: true, shareWithCoach: true, ...s.health } } : {}),
    ...(s.assistant ? { assistant: s.assistant } : {}),
  };
}

/** Photo file names a client has chosen to share (and so should upload). */
export const sharedPhotoNames = (s: SharedSnapshot) =>
  s.checkIns.flatMap((c) => [c.photos.front, c.photos.side]).filter((n): n is string => !!n);

export type ClientSummary = {
  v: 1;
  /** When the client's phone computed this. */
  at: number;
  units: 'lb' | 'kg';
  diet: Diet | null;
  /** Program week 1–12, 13 once finished, null without a program. */
  week: number | null;
  /** Midnight the current program week began (or 7 days ago without a program). */
  weekStartAt: number;
  workoutsThisWeek: number;
  plannedThisWeek: number | null;
  nextWorkout: string | null;
  lastWorkoutAt: number | null;
  weightNow: number | null;
  weightStart: number | null;
  weightGoal: number | null;
  /** Latest weigh-in minus the latest one at least 6 days older. */
  weightChange7d: number | null;
  calorieGoal: number;
  proteinGoal: number;
  caloriesToday: number;
  proteinToday: number;
  /** Averages over the last 7 days that have any meal logged. */
  avgCalories7d: number | null;
  avgProtein7d: number | null;
  daysLogged7d: number;
  lastCheckInAt: number | null;
  /** Waist in cm. */
  waistNow: number | null;
  waistStart: number | null;
  /** Glasses of water logged today. */
  waterToday?: number;
  /** From the client's health app, only when they share it. */
  health?: {
    stepsToday: number | null;
    avgSteps7d: number | null;
    avgSleep7d: number | null;
    restingHr: number | null;
    activeCaloriesToday: number | null;
    watchWorkouts7d: number;
    bodyFat: number | null;
  };
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function summarize(state: AppState, now: number): ClientSummary {
  const today = startOfDay(now);
  const program = state.program;
  const week = program ? weekOf(program, now) : null;
  const finishedWorkouts = state.workouts.filter((w) => w.finishedAt !== undefined);

  let workoutsThisWeek: number;
  let plannedThisWeek: number | null = null;
  let weekStartAt: number;
  if (program && week !== null && week <= WEEKS) {
    weekStartAt = program.startedAt + (week - 1) * 7 * DAY;
    const prefix = `w${week}-`;
    workoutsThisWeek = [...completedKeys(program, state.workouts)].filter((k) => k.startsWith(prefix)).length;
    plannedThisWeek = program.daysPerWeek;
  } else {
    weekStartAt = today - 6 * DAY;
    workoutsThisWeek = finishedWorkouts.filter((w) => w.finishedAt! >= weekStartAt).length;
  }

  const weighIns = [...state.weighIns].sort((a, b) => a.at - b.at);
  const latest = weighIns[weighIns.length - 1];
  const weekAgo = latest ? [...weighIns].reverse().find((x) => x.at <= latest.at - 6 * DAY) : undefined;

  // meal totals per day for the last 7 days, today included
  const byDay = new Map<number, { calories: number; protein: number }>();
  for (const m of state.meals) {
    const d = startOfDay(m.at);
    if (d < today - 6 * DAY || d > today) continue;
    const cur = byDay.get(d) ?? { calories: 0, protein: 0 };
    byDay.set(d, { calories: cur.calories + m.calories, protein: cur.protein + m.protein });
  }
  const days = [...byDay.values()];
  const todays = byDay.get(today) ?? { calories: 0, protein: 0 };

  const checkIns = [...state.checkIns].sort((a, b) => a.at - b.at);
  const waists = checkIns.filter((c) => c.waist !== undefined);

  // a run or class on the watch counts as being active, but only if the client shares it
  const shared = sharedHealth(state, now);
  const watchTimes = (shared?.workouts ?? []).map((w) => w.end);
  const lastTimes = [...finishedWorkouts.map((w) => w.finishedAt!), ...watchTimes];
  const healthSummary = shared
    ? (() => {
        const avg = weekAverages(state, now);
        const todayRow = shared.days.find((d) => d.date === today);
        return {
          stepsToday: todayRow?.steps ?? null,
          avgSteps7d: avg.steps,
          avgSleep7d: avg.sleepMinutes,
          restingHr: avg.restingHr,
          activeCaloriesToday: todayRow?.activeCalories ?? null,
          watchWorkouts7d: shared.workouts.filter((w) => w.start >= today - 6 * DAY).length,
          bodyFat: shared.bodyFat?.percent ?? null,
        };
      })()
    : null;

  return {
    v: 1,
    at: now,
    units: state.profile.units,
    diet: state.profile.diet ?? null,
    week,
    weekStartAt,
    workoutsThisWeek,
    plannedThisWeek,
    nextWorkout: nextSession(state, now)?.plan.name ?? null,
    lastWorkoutAt: lastTimes.length ? Math.max(...lastTimes) : null,
    weightNow: latest?.weight ?? null,
    weightStart: program?.body.startWeight ?? weighIns[0]?.weight ?? null,
    weightGoal: program?.body.goalWeight ?? null,
    weightChange7d: latest && weekAgo ? round1(latest.weight - weekAgo.weight) : null,
    calorieGoal: state.profile.calorieGoal,
    proteinGoal: state.profile.proteinGoal,
    caloriesToday: Math.round(todays.calories),
    proteinToday: Math.round(todays.protein),
    avgCalories7d: days.length ? Math.round(days.reduce((a, d) => a + d.calories, 0) / days.length) : null,
    avgProtein7d: days.length ? Math.round(days.reduce((a, d) => a + d.protein, 0) / days.length) : null,
    daysLogged7d: days.length,
    lastCheckInAt: checkIns[checkIns.length - 1]?.at ?? null,
    waistNow: waists[waists.length - 1]?.waist ?? null,
    waistStart: waists[0]?.waist ?? null,
    ...(state.water?.length ? { waterToday: waterToday(state, now) } : {}),
    ...(healthSummary ? { health: healthSummary } : {}),
  };
}

export type Flag = {
  key: 'inactive' | 'behind' | 'checkin' | 'calories' | 'protein' | 'nolog' | 'ontrack';
  label: string;
  tone: 'red' | 'amber' | 'green';
};

const daysSince = (t: number, now: number) => Math.floor((startOfDay(now) - startOfDay(t)) / DAY);

/** Why a client may need a nudge, most urgent first. Empty means nothing to flag yet. */
export function flags(s: ClientSummary, now: number): Flag[] {
  const out: Flag[] = [];
  const idle = s.lastWorkoutAt === null ? null : daysSince(s.lastWorkoutAt, now);
  if (idle === null) out.push({ key: 'inactive', label: 'No workouts yet', tone: 'red' });
  else if (idle >= 5) out.push({ key: 'inactive', label: `No workout in ${idle} days`, tone: 'red' });

  // the summary describes the week it was computed in; once that week is over it no longer applies
  const sameWeek = now < s.weekStartAt + 7 * DAY;
  if (s.plannedThisWeek !== null && sameWeek && !out.some((f) => f.key === 'inactive')) {
    const left = s.plannedThisWeek - s.workoutsThisWeek;
    const daysLeft = Math.max(0, 7 - daysSince(s.weekStartAt, now));
    if (left > daysLeft) out.push({ key: 'behind', label: `${s.workoutsThisWeek} of ${s.plannedThisWeek} workouts`, tone: 'amber' });
  }
  if (s.week !== null && s.week <= WEEKS && (s.lastCheckInAt === null || now - s.lastCheckInAt >= 7 * DAY)) {
    out.push({ key: 'checkin', label: 'Check-in due', tone: 'amber' });
  }
  if (s.daysLogged7d === 0) out.push({ key: 'nolog', label: 'Not logging meals', tone: 'amber' });
  else if (s.daysLogged7d >= 3 && s.avgCalories7d !== null && s.avgCalories7d > s.calorieGoal * 1.1) {
    out.push({ key: 'calories', label: `Calories ~${(s.avgCalories7d - s.calorieGoal).toLocaleString()} over`, tone: 'amber' });
  } else if (s.daysLogged7d >= 3 && s.avgProtein7d !== null && s.avgProtein7d < s.proteinGoal * 0.8) {
    out.push({ key: 'protein', label: 'Low protein', tone: 'amber' });
  }
  if (out.length === 0) out.push({ key: 'ontrack', label: 'On track', tone: 'green' });
  return out;
}

/** Sorts the coach's list: red first, then amber, then on track; ties by least recently active. */
export function attentionScore(s: ClientSummary, now: number) {
  const f = flags(s, now);
  return f.reduce((n, x) => n + (x.tone === 'red' ? 100 : x.tone === 'amber' ? 10 : 0), 0);
}

const proteinIdeas: Record<Diet, string> = {
  nonveg: 'eggs, chicken, fish or a protein shake',
  veg: 'eggs, paneer, Greek yogurt or a protein shake',
  hinduveg: 'paneer, dal, curd or a protein shake',
};

/** A friendly note the coach can edit and send, based on the client's top flag. */
export function suggestNote(name: string, s: ClientSummary, now: number): string {
  const first = name.trim().split(/\s+/)[0] || 'there';
  const top = flags(s, now)[0];
  const lost = s.weightStart !== null && s.weightNow !== null ? round1(s.weightStart - s.weightNow) : 0;
  const praise = lost >= 1 ? ` You're already down ${lost} ${s.units}, so keep it going!` : '';
  const next = s.nextWorkout;

  switch (top.key) {
    case 'inactive': {
      const idle = s.lastWorkoutAt === null ? null : daysSince(s.lastWorkoutAt, now);
      return idle === null
        ? `Hey ${first}, welcome aboard! Let's get your first workout in${next ? `: ${next} is ready for you` : ''}. Even 20 minutes counts 💪`
        : `Hey ${first}, I haven't seen a workout from you in ${idle} days. Everything OK? ${next ? `${next} is ready when you are.` : 'Get one in today.'} Even 20 minutes counts 💪`;
    }
    case 'behind':
      return `Hey ${first}, you're at ${s.workoutsThisWeek} of ${s.plannedThisWeek} workouts this week. Let's get ${next ?? 'the next one'} done tomorrow. You've got this!${praise}`;
    case 'checkin':
      return `Hey ${first}, your weekly check-in is due. Hop on the scale and measure your waist so we can see your progress.${praise}`;
    case 'calories':
      return `Hey ${first}, your calories have averaged ${s.avgCalories7d!.toLocaleString()} this week, about ${(s.avgCalories7d! - s.calorieGoal).toLocaleString()} over your ${s.calorieGoal.toLocaleString()} target. Try following the meal plan on the Meals tab for the next few days.`;
    case 'protein':
      return `Hey ${first}, your protein has averaged ${s.avgProtein7d} g against your ${s.proteinGoal} g goal. Try adding ${proteinIdeas[s.diet ?? 'nonveg']} to a couple of meals.${praise}`;
    case 'nolog':
      return `Hey ${first}, don't forget to log your meals. It's the best way to stay on track, and the meal plan makes it one tap.${praise}`;
    default:
      return lost >= 1
        ? `Great work ${first}! You're down ${lost} ${s.units} and right on track this week. Keep it going 🔥`
        : `Great work this week ${first}! You're right on track. Keep it going 🔥`;
  }
}

export type Reminder = { id: string; at: number; title: string; body: string };

/** The next time of day h:m that is still in the future. */
const nextAt = (now: number, h: number, m: number) => {
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= now + 60000) d.setDate(d.getDate() + 1);
  return d.getTime();
};

/**
 * Local reminders for someone on the Transformation: the next workout, the
 * weekly check-in and a weigh-in when one is overdue. Rescheduled whenever the
 * data changes, so doing the thing cancels its reminder.
 */
export function planReminders(state: AppState, now: number): Reminder[] {
  const program = state.program;
  if (!program || weekOf(program, now) > WEEKS) return [];
  const out: Reminder[] = [];
  const today = startOfDay(now);

  const next = nextSession(state, now);
  const trainedToday = state.workouts.some((w) => w.finishedAt !== undefined && startOfDay(w.finishedAt) === today);
  if (next && !trainedToday && state.activeWorkoutId === null) {
    const done = [...completedKeys(program, state.workouts)].filter((k) => k.startsWith(`w${next.week}-`)).length;
    out.push({
      id: 'workout',
      at: nextAt(now, 18, 0),
      title: `${next.plan.name} is up next`,
      body: `You've done ${done} of ${program.daysPerWeek} workouts this week. Let's go 💪`,
    });
  }

  const lastCheckIn = state.checkIns.reduce((t, c) => Math.max(t, c.at), 0);
  const due = lastCheckIn ? lastCheckIn + 7 * DAY : now;
  const nineAm = (t: number) => {
    const d = new Date(t);
    d.setHours(9, 0, 0, 0);
    return d.getTime() > now + 60000 ? d.getTime() : nextAt(now, 9, 0);
  };
  out.push({
    id: 'checkin',
    at: nineAm(Math.max(due, now)),
    title: 'Weekly check-in',
    body: 'Weigh in and measure your waist. It takes a minute and shows your progress.',
  });

  const lastWeigh = state.weighIns.reduce((t, x) => Math.max(t, x.at), 0);
  if (now - lastWeigh >= 3 * DAY) {
    out.push({ id: 'weigh', at: nextAt(now, 7, 30), title: 'Quick weigh-in?', body: 'A few weigh-ins a week help your coach fine-tune your calories.' });
  }
  return out;
}

/** "3 min ago", "5h ago", "2 days ago". */
export function timeAgo(when: string | number, now: number) {
  const t = typeof when === 'number' ? when : new Date(when).getTime();
  const min = Math.max(0, Math.round((now - t) / 60000));
  if (min < 2) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}
