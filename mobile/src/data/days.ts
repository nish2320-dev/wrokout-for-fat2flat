/** Day helpers for logging meals on earlier days; pure, so `npm run check` covers them. */

const DAY = 86400000;
const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export function dayLabel(day: number, today: number) {
  if (day === today) return 'Today';
  if (day === startOfDay(today - DAY / 2)) return 'Yesterday';
  return new Date(day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** When a meal logged now for `day` is stamped: now for today, else the same clock time on that day. */
export function stampFor(day: number, now: number) {
  if (day === startOfDay(now)) return now;
  const d = new Date(now);
  const t = new Date(day);
  t.setHours(d.getHours(), d.getMinutes(), 0, 0);
  return t.getTime();
}
