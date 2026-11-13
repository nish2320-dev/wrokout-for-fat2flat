import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { fmtSleep, fmtSteps, healthDay } from '@/data/health';
import { fmtDate, startOfDay } from '@/data/stats';
import { useStore } from '@/data/store';
import { useHealth } from '@/health/HealthProvider';
import { C } from '@/theme';
import { Bars, Card, CardTitle, Label, Meta, Row } from '@/ui/kit';

const DAY = 86400000;

function Tile({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={s.tile}>
      <Ionicons name={icon} size={14} color={C.red} />
      <Text style={s.value}>{value}</Text>
      <Label>{label}</Label>
    </View>
  );
}

/** Today's numbers from the connected health app (Home). */
export function TodayActivity() {
  const { state } = useStore();
  const health = useHealth();
  if (!health.connected) return null;
  const now = Date.now();
  const today = healthDay(state, now);
  if (!today) return null;

  return (
    <Card>
      <Row style={{ marginBottom: 10 }}>
        <CardTitle>Today’s activity</CardTitle>
        <Label>{health.appName}</Label>
      </Row>
      <Row style={{ gap: 6 }}>
        <Tile icon="footsteps" label="Steps" value={today.steps !== undefined ? fmtSteps(today.steps) : '—'} />
        <Tile icon="flame" label="Active cal" value={today.activeCalories !== undefined ? `${today.activeCalories}` : '—'} />
        <Tile icon="moon" label="Sleep" value={today.sleepMinutes ? fmtSleep(today.sleepMinutes) : '—'} />
        <Tile icon="heart" label="Resting HR" value={today.restingHr ? `${today.restingHr}` : '—'} />
      </Row>
    </Card>
  );
}

/** The last 7 days of steps and watch workouts (Progress). */
export function WeekActivity() {
  const { state } = useStore();
  const health = useHealth();
  if (!health.connected || !state.health) return null;
  const today = startOfDay(Date.now());
  const days = Array.from({ length: 7 }, (_, i) => today - (6 - i) * DAY);
  const steps = days.map((d) => state.health!.days.find((x) => x.date === d)?.steps ?? 0);
  const labels = days.map((d) => 'SMTWTFS'[new Date(d).getDay()]);
  const workouts = state.health.workouts.filter((w) => w.start >= today - 6 * DAY);
  const withSteps = steps.filter((n) => n > 0);
  const avg = withSteps.length ? Math.round(withSteps.reduce((a, b) => a + b, 0) / withSteps.length) : 0;

  return (
    <Card>
      <Row>
        <View>
          <CardTitle>Steps</CardTitle>
          <Meta>{avg ? `${avg.toLocaleString()} a day on average this week` : `From ${health.appName}`}</Meta>
        </View>
      </Row>
      <View style={{ marginTop: 10 }}>
        <Bars values={steps} labels={labels} />
      </View>
      {workouts.length > 0 ? (
        <View style={{ marginTop: 12, gap: 6 }}>
          <Label>From your watch and other apps</Label>
          {workouts.map((w) => (
            <Row key={w.id}>
              <Text style={s.line}>{w.kind}</Text>
              <Meta>
                {fmtDate(w.start)} · {Math.max(1, Math.round((w.end - w.start) / 60000))} min
                {w.calories ? ` · ${w.calories} cal` : ''}
              </Meta>
            </Row>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const s = StyleSheet.create({
  tile: { flex: 1, backgroundColor: C.wash, borderRadius: 12, paddingVertical: 10, alignItems: 'center', gap: 3 },
  value: { fontSize: 16, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  line: { fontSize: 13, fontWeight: '700', color: C.ink },
});
