import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dayTotals, goalsFor, MACROS, missingMacros, overBy, statusOf, type Macro, type Status } from '@/data/macros';
import { useStore } from '@/data/store';
import { C } from '@/theme';
import { Card, CardTitle, Meta, Row } from '@/ui/kit';

const COLORS: Record<Status, { bar: string; text: string }> = {
  under: { bar: C.ink2, text: C.ink },
  near: { bar: C.amber, text: C.amber },
  hit: { bar: C.green, text: C.green },
  over: { bar: C.red, text: C.red },
};

const fmt = (key: Macro, n: number) => (key === 'calories' ? Math.round(n).toLocaleString() : `${Math.round(n)}`);

/**
 * Today's calories, protein, carbs and fat against the daily goals. Bars turn
 * red past a limit (calories, carbs, fat) and green once protein is reached.
 */
export function MacrosCard({ compact = false, day, dayLabel }: { compact?: boolean; day?: number; dayLabel?: string }) {
  const router = useRouter();
  const { state } = useStore();
  const now = day ?? Date.now();
  const isToday = day === undefined || dayLabel === 'Today';
  const totals = dayTotals(state.meals, now);
  const goals = goalsFor(state.profile);
  const over = MACROS.filter(({ key }) => overBy(key, totals, goals) > 0);
  const left = Math.max(0, goals.calories - totals.calories);

  const body = (
    <Card style={{ gap: 12 }}>
      <Row>
        <CardTitle>{isToday ? 'Today’s macros' : `Macros · ${dayLabel}`}</CardTitle>
        {compact ? <Ionicons name="chevron-forward" size={16} color={C.faint} /> : <Meta>{isToday && left > 0 ? `${left.toLocaleString()} cal left` : ''}</Meta>}
      </Row>

      {MACROS.map(({ key, label, unit }) => {
        const status = statusOf(key, totals, goals);
        const pct = goals[key] > 0 ? Math.min(1, totals[key] / goals[key]) : 0;
        return (
          <View key={key} style={{ gap: 5 }} accessible accessibilityLabel={`${label}: ${fmt(key, totals[key])} of ${fmt(key, goals[key])} ${unit === 'g' ? 'grams' : 'calories'}`}>
            <Row>
              <Text style={s.label}>{label}</Text>
              <Text style={[s.value, { color: COLORS[status].text }]}>
                {fmt(key, totals[key])}
                <Text style={s.goal}>
                  {' '}
                  / {fmt(key, goals[key])}
                  {unit === 'g' ? ' g' : ''}
                </Text>
                {status === 'hit' ? ' ✓' : ''}
              </Text>
            </Row>
            <View style={s.track}>
              <View style={[s.fill, { width: `${pct * 100}%`, backgroundColor: COLORS[status].bar }]} />
            </View>
          </View>
        );
      })}

      {over.length > 0 ? (
        <View style={s.alert}>
          <Ionicons name="alert-circle" size={17} color={C.red} />
          <Text style={s.alertText}>
            Over {isToday ? 'today' : dayLabel === 'Yesterday' ? 'yesterday' : 'that day'}:{' '}
            {over.map(({ key, label }) => `${label.toLowerCase()} by ${fmt(key, overBy(key, totals, goals))}${key === 'calories' ? ' cal' : ' g'}`).join(', ')}
          </Text>
        </View>
      ) : null}

      {!compact && missingMacros(state.meals, now) ? (
        <Meta>Some of {isToday ? 'today’s' : 'these'} meals were logged before carbs and fat were tracked, so those totals may be low.</Meta>
      ) : null}
    </Card>
  );

  return compact ? (
    <Pressable onPress={() => router.push('/meals')} accessibilityRole="button" accessibilityHint="Opens Meals">
      {body}
    </Pressable>
  ) : (
    body
  );
}

const s = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: C.ink2 },
  value: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  goal: { fontSize: 12, fontWeight: '600', color: C.muted },
  track: { height: 8, borderRadius: 4, backgroundColor: C.line2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  alert: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: C.redWash, borderRadius: 12, padding: 10 },
  alertText: { flex: 1, fontSize: 13, fontWeight: '700', color: C.red, lineHeight: 18 },
});
