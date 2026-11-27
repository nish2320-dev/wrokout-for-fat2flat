import { setCount } from './stats';
import type { AppState } from './types';
import { fmtLength, fmtWeight, lengthUnit } from './units';

/**
 * Notifications to the coach about a client's activity: a finished workout, a
 * weekly check-in or a weigh-in. Pure, so `npm run check` covers it; the app
 * sends them (see CloudProvider) according to the coach's switches.
 */

export type PingKind = 'workouts' | 'checkins' | 'weighins';
export type Ping = { kind: PingKind; text: string };
export type Seen = { workouts: Set<string>; checkIns: Set<string>; weighIns: Set<number> };

const DAY = 86400000;

export const seenFrom = (s: AppState): Seen => ({
  workouts: new Set(s.workouts.filter((w) => w.finishedAt !== undefined).map((w) => w.id)),
  checkIns: new Set(s.checkIns.map((c) => c.id)),
  weighIns: new Set(s.weighIns.map((w) => w.at)),
});

/**
 * What's new since `seen`. Workouts the coach sent are left out (the app
 * already tells the coach when one is done), a weigh-in made as part of a
 * check-in is folded into the check-in, and old entries (a health app
 * catching up) don't ping.
 */
export function newPings(seen: Seen, s: AppState, firstName: string, now: number): Ping[] {
  const u = s.profile.units;
  const out: Ping[] = [];
  for (const w of s.workouts) {
    if (w.finishedAt === undefined || seen.workouts.has(w.id) || w.coachWorkoutId || now - w.finishedAt > DAY) continue;
    out.push({ kind: 'workouts', text: `${firstName} finished ${w.name.replace(/^Week \d+ · /, '')} (${setCount(w)} sets) 💪` });
  }
  const newCheckIns = s.checkIns.filter((c) => !seen.checkIns.has(c.id) && now - c.at <= DAY);
  const latestWeight = [...s.weighIns].sort((a, b) => b.at - a.at)[0];
  for (const c of newCheckIns) {
    const waists = s.checkIns.filter((x) => x.waist !== undefined && x.at < c.at).sort((a, b) => b.at - a.at);
    const waistChange = c.waist !== undefined && waists[0]?.waist !== undefined ? c.waist - waists[0].waist : null;
    const parts = [
      latestWeight && Math.abs(latestWeight.at - c.at) < DAY ? `${fmtWeight(latestWeight.weight)} ${u}` : null,
      waistChange !== null && Math.abs(waistChange) >= 0.5 ? `waist ${waistChange < 0 ? '−' : '+'}${fmtLength(Math.abs(waistChange), u)} ${lengthUnit(u)}` : null,
      c.photos.front || c.photos.side ? 'new photos' : null,
    ].filter(Boolean);
    out.push({ kind: 'checkins', text: `${firstName} did their weekly check-in${parts.length ? `: ${parts.join(', ')}` : ''} 📋` });
  }
  const sorted = [...s.weighIns].sort((a, b) => a.at - b.at);
  for (const w of sorted) {
    if (seen.weighIns.has(w.at) || now - w.at > DAY) continue;
    // part of a check-in made at the same time
    if (newCheckIns.some((c) => Math.abs(c.at - w.at) < 10 * 60000)) continue;
    const weekAgo = [...sorted].reverse().find((x) => x.at <= w.at - 6 * DAY);
    const change = weekAgo ? Math.round((w.weight - weekAgo.weight) * 10) / 10 : null;
    out.push({ kind: 'weighins', text: `${firstName} weighed in: ${fmtWeight(w.weight)} ${u}${change !== null ? ` (${change > 0 ? '+' : change < 0 ? '−' : '±'}${fmtWeight(Math.abs(change))} this week)` : ''}` });
  }
  // a burst (say, a health app syncing a week of weigh-ins) sends one of each kind at most
  return (['workouts', 'checkins', 'weighins'] as const).map((k) => out.filter((p) => p.kind === k).pop()).filter((p): p is Ping => !!p);
}
