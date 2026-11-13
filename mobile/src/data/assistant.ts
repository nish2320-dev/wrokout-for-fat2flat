import { waterToday } from './extras';
import { healthDay } from './health';
import { DIETS } from './mealplan';
import { nextSession, phaseOf, WEEKS, weekOf } from './program';
import { summarize } from './sharing';
import { fmtDate } from './stats';
import { AppState, AssistantMessage } from './types';

/**
 * The AI assistant's view of the user: a short plain-text summary of their own
 * targets, plan and recent progress, sent with each question so answers are
 * personal. Pure, so `npm run check` covers it.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;
const signed = (n: number) => `${n > 0 ? '+' : ''}${round1(n)}`;

export function assistantContext(s: AppState, now: number, coachName?: string | null): string {
  const p = s.profile;
  const sum = summarize(s, now);
  const u = p.units;
  const lines: string[] = [];

  lines.push(`Today is ${new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}.`);
  const diet = p.diet ? DIETS.find((d) => d.key === p.diet)?.label : null;
  lines.push(`${p.name ? `Name: ${p.name}. ` : ''}Units: ${u}.${diet ? ` Diet: ${diet}${p.diet === 'veg' ? ' (eats eggs, no meat or fish)' : p.diet === 'hinduveg' ? ' (no meat, fish or eggs)' : ''}.` : ''}`);
  lines.push(`Daily targets: ${p.calorieGoal.toLocaleString()} calories, ${p.proteinGoal} g protein, ${p.waterGoal ?? 8} glasses of water.`);

  if (s.program) {
    const week = weekOf(s.program, now);
    const b = s.program.body;
    if (week <= WEEKS) {
      const next = nextSession(s, now);
      lines.push(
        `On the 12-week Transformation: week ${week} of ${WEEKS}, ${phaseOf(week).label} phase, ${s.program.daysPerWeek} workouts a week; ${sum.workoutsThisWeek} of ${s.program.daysPerWeek} done this week${next ? `; next workout: ${next.plan.name} (${next.plan.items.map((i) => i.exercise.name).join(', ')})` : ''}.`,
      );
    } else lines.push('Finished the 12-week Transformation.');
    lines.push(`Goal weight ${b.goalWeight} ${u}; ${b.sex}, age ${b.age}; activity: ${b.activity}; pace: ${s.program.pace}.`);
  } else {
    lines.push(`Not on the 12-week Transformation. ${sum.workoutsThisWeek} workouts in the last 7 days.`);
  }

  if (sum.weightNow !== null) {
    lines.push(
      `Weight: ${sum.weightNow} ${u} now${sum.weightStart !== null ? ` (started ${sum.weightStart}, ${signed(sum.weightNow - sum.weightStart)} ${u})` : ''}${sum.weightChange7d !== null ? `; last 7 days ${signed(sum.weightChange7d)} ${u}` : ''}.`,
    );
  }

  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  const meals = s.meals.filter((m) => m.at >= todayStart);
  lines.push(
    `Eaten today: ${sum.caloriesToday.toLocaleString()} cal, ${sum.proteinToday} g protein${meals.length ? ` (${meals.map((m) => m.name).slice(0, 6).join('; ')})` : ' (nothing logged yet)'}.`,
  );
  if (sum.avgCalories7d !== null) lines.push(`Last 7 days: ${sum.avgCalories7d.toLocaleString()} cal and ${sum.avgProtein7d} g protein a day on average (${sum.daysLogged7d} days logged).`);
  lines.push(`Water today: ${waterToday(s, now)} glasses.`);

  const recent = s.workouts.filter((w) => w.finishedAt !== undefined).slice(0, 4);
  if (recent.length) lines.push(`Recent workouts: ${recent.map((w) => `${w.name} (${fmtDate(w.finishedAt!)})`).join(', ')}.`);
  else lines.push('No workouts logged yet.');

  const h = healthDay(s, now);
  if (s.health?.enabled && h) {
    const bits = [h.steps !== undefined ? `${h.steps.toLocaleString()} steps` : '', h.sleepMinutes ? `slept ${Math.floor(h.sleepMinutes / 60)}h ${h.sleepMinutes % 60}m` : '', h.restingHr ? `resting heart rate ${h.restingHr}` : ''].filter(Boolean);
    if (bits.length) lines.push(`From their health app today: ${bits.join(', ')}.`);
  }
  lines.push(coachName ? `They work with a coach: ${coachName}. The "Ask my coach" button sends them a question.` : 'They are not working with a coach in the app.');
  return lines.join('\n');
}

/** The recent conversation to send: last 12 messages, starting with a question. */
export function recentTurns(messages: AssistantMessage[]) {
  const last = messages.slice(-12);
  const start = last.findIndex((m) => m.role === 'user');
  return (start < 0 ? [] : last.slice(start)).map((m) => ({ role: m.role, content: m.content }));
}
