// Supabase Edge Function: the AI coaching agent.
//
// Runs every hour (see supabase/agent-cron.sql). For each coaching client who
// allowed AI check-ins, whose coach has the agent on and hasn't paused it for
// them, it sends:
//   • a daily check-in around 7 pm in the client's time zone, and
//   • on Sunday around 6 pm, a weekly summary instead, which may also adjust
//     their calories, protein, carbs and fat within safe limits, and
//   • around 2 pm, a short reminder only if they haven't logged any food yet
//     or are far behind on water (no AI needed for that one).
// Separately, every coach who wants it gets an evening summary around 8 pm in
// their own time zone (all their clients, AI check-ins or not; no AI used).
// The evening check-in leads with whatever daily goal was missed: workouts
// behind schedule, no meals logged, water, calories, protein, carbs or fat.
// Messages go into the client's chat with their coach (marked from_agent, so
// the coach sees every one) and to the client's phone as a notification.
// On Sundays it also drafts next week's workouts and a meal plan for each of
// those clients; drafts wait in agent_drafts until the coach approves them.
//
// Deploy: Edge Functions → Deploy a new function → Via editor, name
// "coach-agent", paste this file, Deploy, then Settings → turn OFF "Verify JWT
// with legacy secret" (this code checks its own key). Secrets: ANTHROPIC_API_KEY
// (already set) and AGENT_KEY (any long random text; the same text goes in
// agent-cron.sql).
//
// Testing: send a POST with header x-agent-key and body
// {"force": "daily" | "weekly", "dryRun": true} to see the messages it would
// send right now without sending anything or changing targets.

import Anthropic from 'npm:@anthropic-ai/sdk@^1.8.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const DAILY_HOUR = 19;
const NUDGE_HOURS = [14, 17]; // from 2 pm, before 5 pm
const WEEKLY_HOUR = 18;
/** Never message after this local hour, so a late run can't buzz someone at night. */
const LAST_HOUR = 22;
const DEFAULT_TZ = 'America/Los_Angeles';
const MAX_CLIENTS_PER_RUN = 60;
const DAY = 86400000;

// ── pure helpers (exported for tests) ─────────────────────────────────────

type Meal = { name: string; calories: number; protein: number; carbs?: number; fat?: number; at: number };
type Workout = { name: string; finishedAt?: number; exercises: { exerciseId: string; sets: { reps: number; weight: number }[] }[]; sessionKey?: string };
type Snapshot = {
  v?: number;
  profile?: { calorieGoal: number; proteinGoal: number; carbGoal?: number; fatGoal?: number; units: 'lb' | 'kg'; diet?: string };
  program?: { startedAt: number; daysPerWeek: number; goal?: 'lose' | 'gain' | 'maintain'; style?: string; equipment?: string[]; body?: { sex?: string; goalWeight?: number; startWeight?: number } } | null;
  workouts?: Workout[];
  meals?: Meal[];
  weighIns?: { at: number; weight: number }[];
  checkIns?: { at: number }[];
  health?: { days?: { date: number; steps?: number; sleepMinutes?: number }[] };
};
export type Targets = { calorieGoal: number; proteinGoal: number; carbGoal: number; fatGoal: number };

/** The client's local date ("2026-11-22"), hour (0–23) and weekday (0 = Sunday). */
export function localParts(now: number, tz: string | null) {
  const zone = tz || DEFAULT_TZ;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(new Date(now));
  } catch {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: DEFAULT_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(new Date(now));
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24, weekday };
}

export type Kind = 'daily' | 'weekly' | 'nudge';

/** What, if anything, is due for this client now. */
export function due(
  c: { tz: string | null; agent_daily_on: string | null; agent_weekly_on: string | null; agent_nudge_on?: string | null; updated_at: string },
  now: number,
): Kind | null {
  const { date, hour, weekday } = localParts(now, c.tz);
  if (hour > LAST_HOUR) return null;
  // someone who hasn't opened the app in 3 days gets only the Sunday summary, not daily pings
  const quiet = now - new Date(c.updated_at).getTime() > 3 * DAY;
  if (weekday === 0 && hour >= WEEKLY_HOUR) return c.agent_weekly_on !== date ? 'weekly' : null;
  if (weekday !== 0 && hour >= DAILY_HOUR) return c.agent_daily_on !== date && !quiet ? 'daily' : null;
  if (hour >= NUDGE_HOURS[0] && hour < NUDGE_HOURS[1]) return c.agent_nudge_on !== date && !quiet ? 'nudge' : null;
  return null;
}

type Summary = {
  at?: number;
  calorieGoal?: number;
  proteinGoal?: number;
  plannedThisWeek?: number | null;
  workoutsThisWeek?: number;
  weekStartAt?: number;
  waterToday?: number;
  waterGoal?: number;
};

export type Alert = { key: string; text: string };

/**
 * The day's goals the client is missing, most important first, for the
 * evening check-in (and, with `afternoon`, the 2 pm reminder). Food is judged
 * against their own targets; gaining clients are flagged for eating too
 * little rather than too much; protein is a floor, never "too much".
 */
export function goalAlerts(snap: Snapshot, summary: Summary | null, tz: string | null, now: number, afternoon = false): Alert[] {
  const out: Alert[] = [];
  const today = localDate(now, tz);
  const meals = (snap.meals ?? []).filter((m) => localDate(m.at, tz) === today);
  const t = currentTargets(snap);
  const goal = goalOfSnap(snap);

  if (meals.length === 0) out.push({ key: 'nomeals', text: 'No meals logged today.' });
  else if (t && !afternoon) {
    const cal = meals.reduce((n, m) => n + m.calories, 0);
    const p = meals.reduce((n, m) => n + m.protein, 0);
    const c = meals.reduce((n, m) => n + (m.carbs ?? 0), 0);
    const f = meals.reduce((n, m) => n + (m.fat ?? 0), 0);
    if (goal === 'gain' && cal < t.calorieGoal * 0.85) out.push({ key: 'calories-under', text: `Calories: ${cal} of ${t.calorieGoal}, ${t.calorieGoal - cal} short of their gaining target.` });
    if (goal !== 'gain' && cal > t.calorieGoal * 1.1) out.push({ key: 'calories-over', text: `Calories: ${cal} of ${t.calorieGoal}, ${cal - t.calorieGoal} over target.` });
    if (p < t.proteinGoal * 0.7) out.push({ key: 'protein', text: `Protein: ${p} of ${t.proteinGoal} g, ${t.proteinGoal - p} g short.` });
    const tracked = meals.some((m) => m.carbs !== undefined);
    if (tracked && c > t.carbGoal * 1.15) out.push({ key: 'carbs', text: `Carbs: ${c} of ${t.carbGoal} g, ${c - t.carbGoal} g over.` });
    if (tracked && f > t.fatGoal * 1.15) out.push({ key: 'fat', text: `Fat: ${f} of ${t.fatGoal} g, ${f - t.fatGoal} g over.` });
  }

  // water, when they track it and the reading is from today
  if (summary?.waterGoal && summary.at && localDate(summary.at, tz) === today) {
    const w = summary.waterToday ?? 0;
    if (w < summary.waterGoal * (afternoon ? 0.3 : 0.6)) out.push({ key: 'water', text: `Water: ${w} of ${summary.waterGoal} glasses.` });
  }

  // workouts behind this week's plan (by tonight, not just "none today")
  if (!afternoon && summary?.plannedThisWeek && summary.weekStartAt && now < summary.weekStartAt + 7 * DAY) {
    const finished = (snap.workouts ?? []).filter((w) => w.finishedAt && w.finishedAt >= summary.weekStartAt!).length;
    const done = Math.max(summary.workoutsThisWeek ?? 0, finished);
    const daysAfterToday = 6 - Math.floor((now - summary.weekStartAt) / DAY);
    const left = summary.plannedThisWeek - done;
    if (left > 0 && left > daysAfterToday) {
      out.push({ key: 'workouts', text: `Workouts: ${done} of ${summary.plannedThisWeek} this week with ${Math.max(0, daysAfterToday)} day${daysAfterToday === 1 ? '' : 's'} left, so they're behind.` });
    }
  }
  return out;
}

const SUMMARY_HOURS = [20, 22]; // 8 pm to 10 pm in the coach's time zone

/** The coach's evening summary is due (once a day, 8–10 pm their time). */
export function summaryDue(co: { tz: string | null; summary_on: string | null; notify: Record<string, unknown> | null; push_token: string | null }, now: number) {
  if (!co.push_token || co.notify?.summary === false) return false;
  const { date, hour } = localParts(now, co.tz);
  return hour >= SUMMARY_HOURS[0] && hour <= SUMMARY_HOURS[1] && co.summary_on !== date;
}

/** "Today: 3 of 5 clients worked out · 1 check-in · 2 weigh-ins. Behind on workouts: Priya, Raj. No meals logged: Sam." */
export function coachSummaryText(clients: { name: string; snapshot: Snapshot; summary: Summary | null; tz: string | null }[], now: number): string | null {
  if (clients.length === 0) return null;
  const first = (n: string) => n.trim().split(/\s+/)[0] || n;
  const list = (names: string[]) => (names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', '));
  const on = (t: number, tz: string | null) => localDate(t, tz) === localDate(now, tz);
  let workedOut = 0;
  let checkIns = 0;
  let weighIns = 0;
  const behind: string[] = [];
  const noMeals: string[] = [];
  for (const c of clients) {
    const snap = c.snapshot ?? {};
    if ((snap.workouts ?? []).some((w) => w.finishedAt && on(w.finishedAt, c.tz))) workedOut++;
    checkIns += (snap.checkIns ?? []).filter((x) => on(x.at, c.tz)).length;
    weighIns += (snap.weighIns ?? []).filter((x) => on(x.at, c.tz)).length;
    const alerts = goalAlerts(snap, c.summary, c.tz, now);
    if (alerts.some((a) => a.key === 'workouts')) behind.push(first(c.name));
    if (alerts.some((a) => a.key === 'nomeals')) noMeals.push(first(c.name));
  }
  const n = clients.length;
  const parts = [`${workedOut} of ${n} client${n === 1 ? '' : 's'} worked out`];
  if (checkIns) parts.push(`${checkIns} check-in${checkIns === 1 ? '' : 's'}`);
  if (weighIns) parts.push(`${weighIns} weigh-in${weighIns === 1 ? '' : 's'}`);
  let text = `Today: ${parts.join(' · ')}.`;
  if (behind.length) text += ` Behind on workouts: ${list(behind)}.`;
  if (noMeals.length) text += ` No meals logged: ${list(noMeals)}.`;
  if (!behind.length && !noMeals.length) text += ' Everyone’s on track 🔥';
  return text;
}

/** The 2 pm reminder: a short friendly line, or null when nothing needs it. */
export function nudgeText(name: string, alerts: Alert[]): string | null {
  const first = name.trim().split(/\s+/)[0] || 'there';
  const noMeals = alerts.some((a) => a.key === 'nomeals');
  const water = alerts.find((a) => a.key === 'water');
  if (noMeals && water) return `Hey ${first}, quick check-in: nothing logged yet today, and you’re at ${water.text.replace('Water: ', '').replace('.', '')} of water. Log your meals so far and grab a glass 💧`;
  if (noMeals) return `Hey ${first}, quick check-in: nothing logged yet today. Take a minute to log your meals so far, it keeps the rest of the day on track 🍽️`;
  if (water) return `Hey ${first}, you’re at ${water.text.replace('Water: ', '').replace('.', '')} of water so far today. Grab a glass now 💧`;
  return null;
}

/** Same rule as the app: fat 30% of calories, carbs the rest (at least 50 g). */
export function autoCarbsFat(calories: number, protein: number) {
  const fat = Math.round((calories * 0.3) / 9);
  return { carbs: Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4)), fat };
}

export function currentTargets(snap: Snapshot): Targets | null {
  const p = snap.profile;
  if (!p || !p.calorieGoal || !p.proteinGoal) return null;
  const auto = autoCarbsFat(p.calorieGoal, p.proteinGoal);
  return { calorieGoal: p.calorieGoal, proteinGoal: p.proteinGoal, carbGoal: p.carbGoal ?? auto.carbs, fatGoal: p.fatGoal ?? auto.fat };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));
const step = (from: number, to: number, max: number) => from + clamp(to - from, -max, max);

/**
 * Keeps an automatic change small and safe: at most ±150 calories, ±20 g
 * protein, ±40 g carbs and ±15 g fat a week, never under 1,200 calories
 * (women) or 1,500 (men), and inside the same ranges a coach may set.
 * Returns null when nothing meaningful changes.
 */
export function safeTargets(cur: Targets, want: Targets, sex: string | undefined): Targets | null {
  const floor = sex === 'female' ? 1200 : sex === 'male' ? 1500 : 1400;
  const next: Targets = {
    calorieGoal: clamp(step(cur.calorieGoal, want.calorieGoal, 150), floor, 6000),
    proteinGoal: clamp(step(cur.proteinGoal, want.proteinGoal, 20), 30, 400),
    carbGoal: clamp(step(cur.carbGoal, want.carbGoal, 40), 20, 800),
    fatGoal: clamp(step(cur.fatGoal, want.fatGoal, 15), 20, 300),
  };
  const moved =
    Math.abs(next.calorieGoal - cur.calorieGoal) >= 25 ||
    Math.abs(next.proteinGoal - cur.proteinGoal) >= 5 ||
    Math.abs(next.carbGoal - cur.carbGoal) >= 10 ||
    Math.abs(next.fatGoal - cur.fatGoal) >= 5;
  return moved ? next : null;
}

const localDate = (t: number, tz: string | null) => localParts(t, tz).date;

/** The client's plan goal (older plans: lose if the goal weight is below the start). */
export function goalOfSnap(snap: Snapshot): 'lose' | 'gain' | 'maintain' | null {
  const p = snap.program;
  if (!p) return null;
  if (p.goal) return p.goal;
  const b = p.body;
  return b?.goalWeight !== undefined && b?.startWeight !== undefined && b.goalWeight < b.startWeight ? 'lose' : 'maintain';
}

/** A plain-text picture of the client's day and week, for the model. */
export function clientContext(name: string, snap: Snapshot, tz: string | null, now: number, kind: 'daily' | 'weekly') {
  const units = snap.profile?.units ?? 'lb';
  const today = localDate(now, tz);
  const t = currentTargets(snap);
  const lines: string[] = [];
  const first = name.trim().split(/\s+/)[0] || 'there';
  lines.push(`Client: ${first}. Units: ${units}.${snap.profile?.diet ? ` Diet: ${snap.profile.diet}.` : ''}`);
  if (t) lines.push(`Daily targets: ${t.calorieGoal} cal, ${t.proteinGoal} g protein, ${t.carbGoal} g carbs, ${t.fatGoal} g fat.`);

  const meals = snap.meals ?? [];
  const sumFor = (date: string) => {
    const ms = meals.filter((m) => localDate(m.at, tz) === date);
    return {
      n: ms.length,
      names: ms.map((m) => m.name).slice(0, 8),
      cal: ms.reduce((a, m) => a + m.calories, 0),
      p: ms.reduce((a, m) => a + m.protein, 0),
      c: ms.reduce((a, m) => a + (m.carbs ?? 0), 0),
      f: ms.reduce((a, m) => a + (m.fat ?? 0), 0),
    };
  };
  const d = sumFor(today);
  lines.push(
    d.n
      ? `Eaten today: ${d.cal} cal, ${d.p} g protein, ${d.c} g carbs, ${d.f} g fat (${d.names.join('; ')}).`
      : 'Eaten today: nothing logged yet.',
  );

  const days = Array.from({ length: 7 }, (_, i) => localDate(now - i * DAY, tz));
  if (kind === 'weekly') {
    for (const date of days.slice().reverse()) {
      const s = sumFor(date);
      lines.push(`  ${date}: ${s.n ? `${s.cal} cal, ${s.p} P, ${s.c} C, ${s.f} F` : 'no meals logged'}`);
    }
  }

  const weekWorkouts = (snap.workouts ?? []).filter((w) => w.finishedAt && days.includes(localDate(w.finishedAt, tz)));
  const todayWorkouts = weekWorkouts.filter((w) => localDate(w.finishedAt!, tz) === today);
  lines.push(`Workouts today: ${todayWorkouts.length ? todayWorkouts.map((w) => w.name).join(', ') : 'none'}.`);
  lines.push(`Workouts in the last 7 days: ${weekWorkouts.length}${snap.program ? ` (plan: ${snap.program.daysPerWeek} a week)` : ''}${weekWorkouts.length ? ` - ${weekWorkouts.map((w) => w.name).join(', ')}` : ''}.`);
  if (snap.program) {
    const week = Math.floor((now - snap.program.startedAt) / (7 * DAY)) + 1;
    if (week >= 1 && week <= 12) lines.push(`12-week Transformation: week ${week} of 12.`);
  }

  const weights = (snap.weighIns ?? []).filter((w) => w.at >= now - 35 * DAY).sort((a, b) => a.at - b.at);
  if (weights.length) {
    const last = weights[weights.length - 1];
    const weekAgo = [...weights].reverse().find((w) => w.at <= last.at - 6 * DAY);
    lines.push(
      `Latest weigh-in: ${last.weight} ${units} on ${localDate(last.at, tz)}${weekAgo ? ` (${Math.round((last.weight - weekAgo.weight) * 10) / 10 >= 0 ? '+' : ''}${Math.round((last.weight - weekAgo.weight) * 10) / 10} ${units} vs a week earlier)` : ''}.`,
    );
    if (kind === 'weekly') lines.push(`Weigh-ins, last 5 weeks: ${weights.map((w) => `${localDate(w.at, tz).slice(5)} ${w.weight}`).join(', ')}.`);
  } else lines.push('No weigh-ins in the last 5 weeks.');
  const goal = goalOfSnap(snap);
  if (goal) lines.push(`Goal: ${goal === 'gain' ? 'GAIN weight (build muscle) in a calorie surplus' : goal === 'lose' ? 'lose fat' : 'maintain weight'}${snap.program?.body?.goalWeight && goal !== 'maintain' ? `, target ${snap.program.body.goalWeight} ${units}` : ''}.`);
  if (snap.program?.style && snap.program.style !== 'strength') lines.push(`Plan style: ${snap.program.style === 'yogapilates' ? 'yoga & Pilates' : snap.program.style}.`);

  const health = (snap.health?.days ?? []).filter((h) => h.date >= now - 8 * DAY);
  const steps = health.map((h) => h.steps).filter((n): n is number => typeof n === 'number');
  if (steps.length) lines.push(`Steps (last ${steps.length} days, from their health app): ${steps.join(', ')}.`);
  return lines.join('\n');
}

// ── the model ───────────────────────────────────────────────────────────────

const SYSTEM = (coach: string) => `You are the AI assistant working for ${coach}, a personal trainer, inside the Fat2Flat Fitness app. You write short check-in messages to ${coach}'s clients. Most are trying to lose fat; some are gaining weight to build muscle, or maintaining. Always coach toward the client's own goal shown below. ${coach} reads every message you send.

How to write:
- Warm, encouraging and direct, like a good personal trainer texting a client. Use their first name. Plain text, no headings or lists, no hashtags, at most one emoji.
- Be specific: use the numbers you're given (workouts, protein, carbs, fat, calories, weight trend, steps). Never invent numbers or events.
- Give one clear, practical next step. Many clients eat Indian food; Indian suggestions are as welcome as Western ones. Respect their diet ("hinduveg" means no meat, fish or eggs; "veg" means no meat or fish).
- Don't repeat what recent messages already said; vary the wording.
- If they logged nothing, gently encourage logging rather than guessing.
- You give general fitness and nutrition guidance, not medical advice. If anything suggests pain, injury, illness or an unhealthy relationship with food, keep it kind and suggest they talk to ${coach} or a doctor.
- Never suggest eating under 1,200 calories (women) or 1,500 (men), fasting, or supplements beyond protein powder or creatine.
- For someone gaining, eating enough is the challenge: praise hitting calories and protein, and suggest easy extra calories rather than cutting back.`;

const DAILY_SCHEMA = {
  type: 'object',
  properties: { message: { type: 'string', description: 'The daily check-in: 2 to 4 sentences, under 450 characters.' } },
  required: ['message'],
  additionalProperties: false,
};

const WEEKLY_SCHEMA = {
  type: 'object',
  properties: {
    message: { type: 'string', description: 'The weekly summary: 4 to 7 sentences, under 900 characters. If targets change, say what changed and why in one sentence.' },
    change: { type: 'boolean', description: 'True only if the week clearly shows the targets should change.' },
    calorieGoal: { type: 'integer' },
    proteinGoal: { type: 'integer' },
    carbGoal: { type: 'integer' },
    fatGoal: { type: 'integer' },
    reason: { type: 'string', description: 'One short sentence explaining the change, shown to the client and coach. Empty if no change.' },
  },
  required: ['message', 'change', 'calorieGoal', 'proteinGoal', 'carbGoal', 'fatGoal', 'reason'],
  additionalProperties: false,
};

const WEEKLY_RULES = `For the weekly summary, also review the targets. Change them only with a clear reason. If the goal is to LOSE fat: weight flat for 2+ weeks while they logged most days (lower calories by 100–150), or losing faster than about 1% of body weight a week (raise calories by 100–150). If the goal is to GAIN: weight flat or down for 2+ weeks while eating near target (raise calories by 100–150), or gaining faster than about 0.5% of body weight a week (lower calories by 100). If MAINTAINING: only correct a clear drift. Any goal: protein regularly far below target (keep the target, coach them on it), or carbs or fat regularly over while calories are on target (rebalance carbs and fat). If unsure, don't change anything (change: false, and repeat the current numbers). Changes are capped automatically at ±150 calories, ±20 g protein, ±40 g carbs and ±15 g fat.`;

type Out = { message: string; change?: boolean; calorieGoal?: number; proteinGoal?: number; carbGoal?: number; fatGoal?: number; reason?: string };

async function write(client: Anthropic, coach: string, context: string, recent: string[], kind: 'daily' | 'weekly', alerts: Alert[] = []): Promise<Out | null> {
  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: kind === 'daily' ? DAILY_SCHEMA : WEEKLY_SCHEMA } },
    system: SYSTEM(coach),
    messages: [
      {
        role: 'user',
        content: `${kind === 'daily' ? "Write tonight's daily check-in." : "Write this Sunday's weekly summary of the past 7 days."}${kind === 'weekly' ? `\n\n${WEEKLY_RULES}` : ''}

${
  alerts.length
    ? `Today's goal check: these were missed, most important first. Lead with the top one or two, kindly and specifically, each with one easy fix for tonight or tomorrow:\n${alerts.map((a) => `- ${a.text}`).join('\n')}`
    : 'Today\'s goal check: nothing missed. Praise something specific.'
}

About the client (from their app):
${context}

Recent messages in their chat, newest last (don't repeat these):
${recent.length ? recent.join('\n') : '(none)'}`,
      },
    ],
  });
  if (response.stop_reason === 'refusal') return null;
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') return null;
  const out = JSON.parse(text.text) as Out;
  return out.message?.trim() ? { ...out, message: out.message.trim().slice(0, 1000) } : null;
}

// ── weekly drafts: workouts and a meal plan for the coach to approve ───────

/** The app's exercise library: id|name|category|equipment|kind (kept in step with mobile/src/data/exercises.ts by npm run check). */
const CATALOG = `bench-press|Barbell Bench Press|chest|barbell|reps
incline-db-press|Incline Dumbbell Press|chest|dumbbells|reps
cable-fly|Cable Fly|chest|cables|reps
push-up|Push-Up|chest|bodyweight|reps
chest-press-machine|Chest Press Machine|chest|machine|reps
pull-up|Pull-Up|back|bodyweight|reps
barbell-row|Barbell Row|back|barbell|reps
lat-pulldown|Lat Pulldown|back|machine|reps
seated-cable-row|Seated Cable Row|back|cables|reps
db-row|One-Arm Dumbbell Row|back|dumbbells|reps
face-pull|Face Pull|back|cables|reps
squat|Barbell Squat|legs|barbell|reps
rdl|Romanian Deadlift|legs|barbell|reps
deadlift|Deadlift|legs|barbell|reps
leg-press|Leg Press|legs|machine|reps
walking-lunge|Walking Lunge|legs|dumbbells|reps
leg-curl|Leg Curl|legs|machine|reps
goblet-squat|Goblet Squat|legs|dumbbells|reps
calf-raise|Standing Calf Raise|legs|machine|reps
db-rdl|Dumbbell Romanian Deadlift|legs|dumbbells|reps
bulgarian-split-squat|Bulgarian Split Squat|legs|dumbbells|reps
step-up|Dumbbell Step-Up|legs|dumbbells|reps
bodyweight-squat|Bodyweight Squat|legs|bodyweight|reps
reverse-lunge|Reverse Lunge|legs|bodyweight|reps
glute-bridge|Glute Bridge|legs|bodyweight|reps
single-leg-calf-raise|Single-Leg Calf Raise|legs|bodyweight|reps
overhead-press|Overhead Press|shoulders|barbell|reps
db-shoulder-press|Dumbbell Shoulder Press|shoulders|dumbbells|reps
lateral-raise|Lateral Raise|shoulders|dumbbells|reps
rear-delt-fly|Rear Delt Fly|shoulders|dumbbells|reps
pike-push-up|Pike Push-Up|shoulders|bodyweight|reps
barbell-curl|Barbell Curl|arms|barbell|reps
db-curl|Dumbbell Curl|arms|dumbbells|reps
hammer-curl|Hammer Curl|arms|dumbbells|reps
triceps-pushdown|Triceps Pushdown|arms|cables|reps
skullcrusher|Skullcrusher|arms|barbell|reps
dip|Dip|arms|bodyweight|reps
plank|Plank|core|bodyweight|reps
hanging-leg-raise|Hanging Leg Raise|core|bodyweight|reps
cable-crunch|Cable Crunch|core|cables|reps
dead-bug|Dead Bug|core|bodyweight|reps
sun-salutation|Sun Salutation|yoga|bodyweight|reps
downward-dog|Downward Dog|yoga|bodyweight|hold
warrior-1|Warrior I|yoga|bodyweight|hold
warrior-2|Warrior II|yoga|bodyweight|hold
triangle|Triangle Pose|yoga|bodyweight|hold
chair-pose|Chair Pose|yoga|bodyweight|hold
tree-pose|Tree Pose|yoga|bodyweight|hold
low-lunge|Low Lunge|yoga|bodyweight|hold
cobra|Cobra|yoga|bodyweight|hold
bridge-pose|Bridge Pose|yoga|bodyweight|hold
boat-pose|Boat Pose|yoga|bodyweight|hold
pigeon|Pigeon Pose|yoga|bodyweight|hold
cat-cow|Cat-Cow|yoga|bodyweight|reps
childs-pose|Child’s Pose|yoga|bodyweight|hold
seated-forward-fold|Seated Forward Fold|yoga|bodyweight|hold
pilates-hundred|The Hundred|pilates|bodyweight|reps
roll-up|Roll-Up|pilates|bodyweight|reps
single-leg-stretch|Single-Leg Stretch|pilates|bodyweight|reps
double-leg-stretch|Double-Leg Stretch|pilates|bodyweight|reps
criss-cross|Criss-Cross|pilates|bodyweight|reps
leg-circles|Single-Leg Circles|pilates|bodyweight|reps
side-leg-lift|Side-Lying Leg Lift|pilates|bodyweight|reps
pilates-swimming|Swimming|pilates|bodyweight|hold
teaser|Teaser|pilates|bodyweight|reps
shoulder-bridge|Shoulder Bridge|pilates|bodyweight|reps
spine-twist|Spine Twist|pilates|bodyweight|reps
brisk-walk|Brisk Walk|cardio|bodyweight|cardio
run|Run (outdoors)|cardio|bodyweight|cardio
treadmill|Treadmill Run|cardio|machine|cardio
incline-walk|Incline Walk|cardio|machine|cardio
stationary-bike|Stationary Bike|cardio|machine|cardio
rower|Rowing Machine|cardio|machine|cardio
elliptical|Elliptical|cardio|machine|cardio
stair-climber|Stair Climber|cardio|machine|cardio
jump-rope|Jump Rope|cardio|bodyweight|cardio
swim|Swimming|cardio|bodyweight|cardio
dance-cardio|Dance Cardio|cardio|bodyweight|cardio
burpee|Burpee|hiit|bodyweight|reps
mountain-climber|Mountain Climbers|hiit|bodyweight|hold
jumping-jack|Jumping Jacks|hiit|bodyweight|hold
high-knees|High Knees|hiit|bodyweight|hold
squat-jump|Squat Jump|hiit|bodyweight|reps
skater|Skaters|hiit|bodyweight|reps
plank-jack|Plank Jacks|hiit|bodyweight|hold
kettlebell-swing|Kettlebell / Dumbbell Swing|hiit|dumbbells|reps
hamstring-stretch|Hamstring Stretch|mobility|bodyweight|hold
hip-flexor-stretch|Hip Flexor Stretch|mobility|bodyweight|hold
figure-four|Figure-Four Stretch|mobility|bodyweight|hold
worlds-greatest|World’s Greatest Stretch|mobility|bodyweight|reps
thoracic-rotation|Open Book Rotation|mobility|bodyweight|reps
chest-doorway-stretch|Doorway Chest Stretch|mobility|bodyweight|hold
calf-stretch|Calf Stretch|mobility|bodyweight|hold
foam-roll|Foam Rolling|mobility|bodyweight|cardio`;
const LIBRARY = CATALOG.split('\n').map((l) => {
  const [id, name, category, equipment, kind] = l.split('|');
  return { id, name, category, equipment, kind };
});
export const EXERCISE_IDS = LIBRARY.map((e) => e.id);
const SLOTS = ['breakfast', 'lunch', 'snack', 'dinner', 'snack2'] as const;

export type DraftWorkout = { name: string; note: string; items: { exerciseId: string; sets: number; reps: number; restSec: number; note?: string }[] };
export type DraftMealPlan = { name: string; note: string; meals: { slot: (typeof SLOTS)[number]; items: { name: string; calories: number; protein: number; carbs: number; fat: number }[] }[] };

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    reason: { type: 'string', description: 'One or two sentences for the coach: why these workouts and meals suit this client this week.' },
    workouts: {
      type: 'array',
      description: 'Next week\'s workouts, in order.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Short name, e.g. "Upper body A" or "Yoga flow".' },
          note: { type: 'string', description: 'One short coaching tip for the client, or empty.' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                exerciseId: { type: 'string', enum: EXERCISE_IDS },
                sets: { type: 'integer' },
                reps: { type: 'integer', description: 'Reps; for hold exercises seconds per set; for cardio minutes.' },
                restSec: { type: 'integer' },
                note: { type: 'string', description: 'Optional form tip, or empty.' },
              },
              required: ['exerciseId', 'sets', 'reps', 'restSec', 'note'],
              additionalProperties: false,
            },
          },
        },
        required: ['name', 'note', 'items'],
        additionalProperties: false,
      },
    },
    mealPlan: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        note: { type: 'string', description: 'One short tip for the client, or empty.' },
        meals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slot: { type: 'string', enum: [...SLOTS] },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Food with its portion, e.g. "2 rotis" or "150 g grilled chicken".' },
                    calories: { type: 'integer' },
                    protein: { type: 'integer' },
                    carbs: { type: 'integer' },
                    fat: { type: 'integer' },
                  },
                  required: ['name', 'calories', 'protein', 'carbs', 'fat'],
                  additionalProperties: false,
                },
              },
            },
            required: ['slot', 'items'],
            additionalProperties: false,
          },
        },
      },
      required: ['name', 'note', 'meals'],
      additionalProperties: false,
    },
  },
  required: ['reason', 'workouts', 'mealPlan'],
  additionalProperties: false,
};

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v: unknown, lo: number, hi: number) => clamp(typeof v === 'number' && Number.isFinite(v) ? v : lo, lo, hi);

/** Keeps a drafted workout inside what the app and the send function accept. */
export function cleanDraftWorkout(w: unknown): DraftWorkout | null {
  const o = (w ?? {}) as Record<string, unknown>;
  const raw = Array.isArray(o.items) ? o.items : [];
  const items = raw
    .map((i) => (i ?? {}) as Record<string, unknown>)
    .filter((i) => typeof i.exerciseId === 'string' && EXERCISE_IDS.includes(i.exerciseId))
    .slice(0, 12)
    .map((i) => {
      const note = text(i.note, 200);
      return { exerciseId: i.exerciseId as string, sets: int(i.sets, 1, 6), reps: int(i.reps, 1, 600), restSec: int(i.restSec, 0, 300), ...(note ? { note } : {}) };
    });
  const name = text(o.name, 60);
  return items.length && name ? { name, note: text(o.note, 500), items } : null;
}

/** Keeps a drafted meal plan inside what the app and the send function accept. */
export function cleanDraftMealPlan(p: unknown): DraftMealPlan | null {
  const o = (p ?? {}) as Record<string, unknown>;
  const seen = new Set<string>();
  const meals = (Array.isArray(o.meals) ? o.meals : [])
    .map((m) => (m ?? {}) as Record<string, unknown>)
    .filter((m) => typeof m.slot === 'string' && (SLOTS as readonly string[]).includes(m.slot) && !seen.has(m.slot) && seen.add(m.slot))
    .map((m) => ({
      slot: m.slot as DraftMealPlan['meals'][number]['slot'],
      items: (Array.isArray(m.items) ? m.items : [])
        .map((i) => (i ?? {}) as Record<string, unknown>)
        .filter((i) => text(i.name, 120))
        .slice(0, 15)
        .map((i) => ({ name: text(i.name, 120), calories: int(i.calories, 0, 5000), protein: int(i.protein, 0, 500), carbs: int(i.carbs, 0, 800), fat: int(i.fat, 0, 400) })),
    }))
    .filter((m) => m.items.length > 0);
  return meals.length ? { name: text(o.name, 80) || 'Meal plan', note: text(o.note, 500), meals } : null;
}

const PLAN_SYSTEM = (coach: string) => `You are the AI assistant of ${coach}, a personal trainer using the Fat2Flat Fitness app. Each Sunday you draft next week's workouts and a one-day meal plan for one of ${coach}'s clients. ${coach} reviews and edits everything before the client sees it.

Workouts:
- Use ONLY exercises from this library (id|name|category|equipment|kind). For kind "hold", reps means seconds per set; for "cardio", reps means minutes and sets should be 1.
${CATALOG}
- Use only the client's equipment; "bodyweight" exercises are always fine.
- Match their goal and plan style: fat loss favours full-body strength plus some HIIT or cardio; gaining favours progressive strength (compound lifts, 6–10 reps, 2–3 min rest); yoga & Pilates style uses yoga, pilates and mobility; cardio style mixes steady cardio and HIIT with a little strength.
- If last week's workouts were missed, keep things shorter and easier to restart; if they were all done, progress slightly.
- 4–8 exercises per strength or yoga workout. Sensible rest: 60–120 s for strength, 15–45 s for holds and HIIT, 0 for cardio.

Meal plan:
- One day: breakfast, lunch, snack and dinner (add "snack2" only for high calorie targets). Calories within about 5% of their daily target, protein close to target, carbs and fat close to their targets.
- Respect their diet: "hinduveg" = no meat, fish or eggs; "veg" = no meat or fish. Indian and Western foods are both welcome; keep it simple, home-cooked and realistic.
- Give each food a clear portion in its name and numbers consistent with calories ≈ 4 × protein + 4 × carbs + 9 × fat.
- Never go under 1,200 calories (women) or 1,500 (men).`;

async function draftPlan(client: Anthropic, coach: string, context: string, snap: Snapshot) {
  const workoutsWanted = Math.min(3, Math.max(2, snap.program?.daysPerWeek ?? 3));
  const equipment = snap.program?.equipment?.length ? snap.program.equipment.join(', ') : 'bodyweight, dumbbells';
  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 12000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: PLAN_SCHEMA } },
    system: PLAN_SYSTEM(coach),
    messages: [
      {
        role: 'user',
        content: `Draft ${workoutsWanted} workouts for next week and a one-day meal plan.\nEquipment: ${equipment}.\n\nAbout the client (from their app):\n${context}`,
      },
    ],
  });
  if (response.stop_reason === 'refusal') return null;
  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') return null;
  const out = JSON.parse(block.text) as { reason?: string; workouts?: unknown[]; mealPlan?: unknown };
  return {
    reason: text(out.reason, 500),
    workouts: (out.workouts ?? []).map(cleanDraftWorkout).filter((w): w is DraftWorkout => w !== null).slice(0, 3),
    mealPlan: cleanDraftMealPlan(out.mealPlan),
  };
}

async function push(token: string | null, title: string, body: string) {
  if (!token) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ to: token, title, body: body.length > 180 ? `${body.slice(0, 177)}…` : body, sound: 'default', channelId: 'default' }),
  }).catch(() => {});
}

// ── the run ─────────────────────────────────────────────────────────────────

type Row = {
  user_id: string;
  coach_id: string;
  name: string;
  push_token: string | null;
  snapshot: Snapshot;
  coach_targets: Record<string, unknown> | null;
  tz: string | null;
  agent_daily_on: string | null;
  agent_weekly_on: string | null;
  agent_nudge_on: string | null;
  summary: Summary | null;
  updated_at: string;
  coaches: { name: string; agent_on: boolean } | null;
};

if (typeof Deno !== 'undefined' && Deno.serve) Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const key = Deno.env.get('AGENT_KEY');
  if (!key || req.headers.get('x-agent-key') !== key) return new Response('Unauthorized', { status: 401 });

  let opts: { force?: Kind | 'summary'; dryRun?: boolean; clientId?: string } = {};
  try {
    opts = await req.json();
  } catch {
    // an empty body is the normal scheduled run
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let q = admin
    .from('clients')
    .select('user_id, coach_id, name, push_token, snapshot, summary, coach_targets, tz, agent_daily_on, agent_weekly_on, agent_nudge_on, updated_at, coaches!inner(name, agent_on)')
    .eq('ai_checkins', true)
    .eq('agent_paused', false)
    .eq('coaches.agent_on', true)
    .limit(500);
  if (opts.clientId) q = q.eq('user_id', opts.clientId);
  const { data, error } = await q;
  if (error) {
    console.error(error);
    return Response.json({ error: 'Could not read clients' }, { status: 500 });
  }

  const now = Date.now();
  const todo = (data as unknown as Row[])
    .map((c) => ({ c, kind: opts.force === 'summary' ? null : (opts.force ?? due(c, now)) }))
    .filter((x): x is { c: Row; kind: Kind } => x.kind !== null)
    .slice(0, MAX_CLIENTS_PER_RUN);

  const anthropic = new Anthropic();
  const results: { client: string; kind: string; message?: string; targets?: Targets | null; drafts?: unknown; error?: string }[] = [];
  const drafted = new Map<string, number>(); // coach id → clients with new drafts

  for (const { c, kind } of todo) {
    const coach = c.coaches?.name ?? 'your coach';
    try {
      // the 2 pm reminder is a fixed friendly line, only when food or water needs it
      if (kind === 'nudge') {
        const line = nudgeText(c.name, goalAlerts(c.snapshot ?? {}, c.summary, c.tz, now, true));
        if (line && !opts.dryRun) {
          const { error: nudgeError } = await admin.from('messages').insert({ coach_id: c.coach_id, client_id: c.user_id, body: line, from_agent: true });
          if (nudgeError) throw nudgeError;
          await admin.from('clients').update({ agent_nudge_on: localParts(now, c.tz).date }).eq('user_id', c.user_id);
          await push(c.push_token, `${coach} · reminder`, line);
        }
        if (line) results.push({ client: c.name, kind, message: line });
        continue;
      }

      const { data: msgs } = await admin
        .from('messages')
        .select('body, from_client, from_agent, created_at')
        .eq('client_id', c.user_id)
        .order('created_at', { ascending: false })
        .limit(6);
      const recent = (msgs ?? []).reverse().map((m) => `${m.from_client ? c.name : m.from_agent ? 'AI check-in' : coach}: ${String(m.body).slice(0, 300)}`);
      const alerts = kind === 'daily' ? goalAlerts(c.snapshot ?? {}, c.summary, c.tz, now) : [];
      const out = await write(anthropic, coach, clientContext(c.name, c.snapshot ?? {}, c.tz, now, kind), recent, kind, alerts);
      if (!out) {
        results.push({ client: c.name, kind, error: 'no message' });
        continue;
      }

      // weekly: apply a safe change to the targets automatically
      let targets: Targets | null = null;
      const cur = currentTargets(c.snapshot ?? {});
      const lastSetAt = typeof c.coach_targets?.at === 'number' ? (c.coach_targets.at as number) : 0;
      if (kind === 'weekly' && out.change && cur && now - lastSetAt > 6 * DAY) {
        targets = safeTargets(cur, { calorieGoal: out.calorieGoal!, proteinGoal: out.proteinGoal!, carbGoal: out.carbGoal!, fatGoal: out.fatGoal! }, c.snapshot?.program?.body?.sex);
      }

      if (!opts.dryRun) {
        const { date } = localParts(now, c.tz);
        const { error: insertError } = await admin.from('messages').insert({ coach_id: c.coach_id, client_id: c.user_id, body: out.message, from_agent: true });
        if (insertError) throw insertError;
        await admin
          .from('clients')
          .update(kind === 'weekly' ? { agent_weekly_on: date, agent_daily_on: date } : { agent_daily_on: date })
          .eq('user_id', c.user_id);
        if (targets) {
          await admin
            .from('clients')
            .update({
              coach_targets: {
                ...targets,
                daysPerWeek: (c.coach_targets?.daysPerWeek as number | null | undefined) ?? null,
                note: `Weekly AI review: ${(out.reason || 'adjusted from your week').slice(0, 250)}`,
                at: now,
                by: 'ai',
              },
            })
            .eq('user_id', c.user_id);
        }
        await push(c.push_token, `${coach} · AI check-in`, out.message);
      }

      // weekly: draft next week's workouts and meal plan for the coach to approve
      let drafts: Awaited<ReturnType<typeof draftPlan>> = null;
      if (kind === 'weekly') {
        try {
          drafts = await draftPlan(anthropic, coach, clientContext(c.name, c.snapshot ?? {}, c.tz, now, 'weekly'), c.snapshot ?? {});
        } catch (e) {
          console.error('drafting failed for a client', e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
        }
        if (drafts && !opts.dryRun && (drafts.workouts.length || drafts.mealPlan)) {
          // last week's unreviewed drafts are replaced by this week's
          await admin.from('agent_drafts').update({ status: 'dismissed' }).eq('client_id', c.user_id).eq('status', 'pending');
          const rows = [
            ...drafts.workouts.map((w) => ({ coach_id: c.coach_id, client_id: c.user_id, kind: 'workout', payload: w, reason: drafts!.reason })),
            ...(drafts.mealPlan ? [{ coach_id: c.coach_id, client_id: c.user_id, kind: 'mealplan', payload: drafts.mealPlan, reason: drafts.reason }] : []),
          ];
          const { error: draftError } = await admin.from('agent_drafts').insert(rows);
          if (draftError) console.error('could not save drafts', draftError);
          else drafted.set(c.coach_id, (drafted.get(c.coach_id) ?? 0) + 1);
        }
      }
      results.push({ client: c.name, kind, message: out.message, targets, ...(drafts ? { drafts } : {}) });
    } catch (e) {
      console.error('agent failed for a client', e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
      results.push({ client: c.name, kind, error: 'failed' });
    }
  }

  // evening summary for each coach who wants one (8–10 pm their time; no AI involved)
  if (!opts.clientId) {
    const { data: coachRows } = await admin.from('coaches').select('user_id, push_token, notify, tz, summary_on').not('push_token', 'is', null);
    for (const co of (coachRows ?? []) as { user_id: string; push_token: string | null; notify: Record<string, unknown> | null; tz: string | null; summary_on: string | null }[]) {
      if (!summaryDue(co, now) && opts.force !== 'summary') continue;
      const { data: theirs } = await admin.from('clients').select('name, snapshot, summary, tz').eq('coach_id', co.user_id);
      const text = coachSummaryText((theirs ?? []) as { name: string; snapshot: Snapshot; summary: Summary | null; tz: string | null }[], now);
      if (!text) continue;
      if (!opts.dryRun) {
        await push(co.push_token, 'Your clients today', text);
        await admin.from('coaches').update({ summary_on: localParts(now, co.tz).date }).eq('user_id', co.user_id);
      }
      results.push({ client: '(coach summary)', kind: 'summary', message: text });
    }
  }

  // tell each coach their drafts are ready to review
  if (drafted.size) {
    const { data: coaches } = await admin.from('coaches').select('user_id, push_token').in('user_id', [...drafted.keys()]);
    for (const co of coaches ?? []) {
      const n = drafted.get(co.user_id) ?? 0;
      await push(co.push_token, 'AI drafts ready', `Next week's workouts and meal plan${n === 1 ? ' for 1 client are' : `s for ${n} clients are`} ready for you to review in My clients.`);
    }
  }

  return Response.json({ checked: (data ?? []).length, sent: results.filter((r) => r.message).length, dryRun: !!opts.dryRun, results });
});
