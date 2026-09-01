import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { exerciseName } from '@/data/exercises';
import { useActiveWorkout, useStore } from '@/data/store';
import { durationMin, finished, fmtDate, fmtVolume, setCount, streak, thisWeek, todayMacros, volume } from '@/data/stats';
import { C, S } from '@/theme';
import { Card, CardTitle, Empty, Eyebrow, Label, Meta, Metric, Name, Ring, Row, Screen, Tag } from '@/ui/kit';

export default function HomeScreen() {
  const { state, startWorkout } = useStore();
  const active = useActiveWorkout();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const macros = todayMacros(state);
  const week = thisWeek(state);
  const done = finished(state);
  const recent = done.slice(0, 4);
  const days = streak(state);
  const greeting = state.profile.name ? `Hey ${state.profile.name}` : 'Welcome back';

  return (
    <Screen>
      <View style={{ height: insets.top }} />

      <Row style={s.head}>
        <View>
          <Text style={s.greet}>{greeting}</Text>
          <Label style={{ marginTop: 3 }}>
            {done.length === 0 ? "Let's log your first workout." : "Let's get after it."}
          </Label>
        </View>
        {days > 0 ? (
          <View style={s.streak}>
            <Ionicons name="flame" size={12} color={C.red} />
            <Text style={s.streakText}>
              {days} day{days === 1 ? '' : 's'}
            </Text>
          </View>
        ) : null}
      </Row>

      {active ? (
        <Pressable onPress={() => router.push('/workout/active')}>
          <Card style={s.resume}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text style={s.resumeTitle}>{active.name} in progress</Text>
                <Text style={s.resumeMeta}>
                  {setCount(active)} of {active.exercises.reduce((n, e) => n + e.sets.length, 0)} sets done
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </Row>
          </Card>
        </Pressable>
      ) : null}

      <View style={s.pair}>
        <Card style={s.half}>
          <Row>
            <View style={{ flex: 1 }}>
              <Label>Calories</Label>
              <View style={{ marginTop: 3 }}>
                <Metric small value={`${macros.calories}`} unit={`/ ${state.profile.calorieGoal}`} />
              </View>
            </View>
            <Ring
              pct={macros.calories / state.profile.calorieGoal}
              label={`${Math.round((macros.calories / state.profile.calorieGoal) * 100)}%`}
            />
          </Row>
        </Card>
        <Card style={s.half}>
          <Row>
            <View style={{ flex: 1 }}>
              <Label>Protein</Label>
              <View style={{ marginTop: 3 }}>
                <Metric small value={`${macros.protein}`} unit={`/ ${state.profile.proteinGoal}g`} />
              </View>
            </View>
            <Ring
              pct={macros.protein / state.profile.proteinGoal}
              label={`${Math.round((macros.protein / state.profile.proteinGoal) * 100)}%`}
            />
          </Row>
        </Card>
      </View>

      <Card>
        <Row style={{ marginBottom: 11 }}>
          <CardTitle>This week</CardTitle>
          <Label>{week.filter((d) => d.done).length} of 7 done</Label>
        </Row>
        <Row>
          {week.map((d, i) => (
            <View key={i} style={s.day}>
              <View style={[s.dayDot, d.done && s.dayDone, !d.done && d.today && s.dayToday]}>
                {d.done ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}
              </View>
              <Text style={s.dayLabel}>{d.label}</Text>
            </View>
          ))}
        </Row>
      </Card>

      <Eyebrow>Quick start</Eyebrow>
      <View style={s.quick}>
        <QuickItem icon="flash" label="Generate workout" primary onPress={() => router.push('/workouts')} />
        <QuickItem
          icon="add"
          label="Empty workout"
          onPress={() => {
            if (!active) startWorkout('Workout', []);
            router.push('/workout/active');
          }}
        />
        <QuickItem icon="restaurant" label="Log a meal" onPress={() => router.push('/meals')} />
        <QuickItem icon="library" label="Exercises" onPress={() => router.push('/workout/library')} />
      </View>

      <Card flush>
        <Row style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
          <CardTitle>Recent workouts</CardTitle>
          {done.length > 0 ? (
            <Link href="/progress" style={s.seeAll}>
              See all
            </Link>
          ) : null}
        </Row>
        <View style={s.hair} />
        {recent.length === 0 ? (
          <Empty
            icon="barbell-outline"
            title="No workouts yet"
            body="Generate a plan or start an empty workout — it'll show up here once you finish."
          />
        ) : (
          recent.map((w) => (
            <View key={w.id} style={s.listRow}>
              <View style={s.thumb}>
                <Ionicons name="barbell" size={20} color={C.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Name>{w.name}</Name>
                <Meta>
                  {fmtDate(w.finishedAt!)} · {setCount(w)} sets · {fmtVolume(volume(w))} {state.profile.units}
                </Meta>
              </View>
              <Tag tone="grey" label={`${durationMin(w)} min`} />
            </View>
          ))
        )}
      </Card>

      {recent.length > 0 && recent[0] ? (
        <Meta>Last exercise: {exerciseName(recent[0].exercises[0]?.exerciseId ?? '')}</Meta>
      ) : null}
    </Screen>
  );
}

function QuickItem({
  icon,
  label,
  primary,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [s.quickItem, primary && s.quickPrimary, pressed && { opacity: 0.75 }]}>
      <Ionicons name={icon} size={19} color={primary ? '#fff' : C.ink2} />
      <Text style={[s.quickLabel, primary && { color: '#fff' }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  head: { paddingHorizontal: 2 },
  greet: { fontSize: 25, fontWeight: '800', letterSpacing: -0.85, color: C.ink },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: C.redWash,
  },
  streakText: { fontSize: 12, fontWeight: '700', color: C.red },

  resume: { backgroundColor: C.ink, borderColor: C.ink },
  resumeTitle: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  resumeMeta: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  pair: { flexDirection: 'row', gap: S.gap },
  half: { flex: 1 },

  day: { alignItems: 'center', gap: 6 },
  dayDot: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: C.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDone: { backgroundColor: C.red },
  dayToday: { backgroundColor: '#fff', borderWidth: 2, borderColor: C.red },
  dayLabel: { fontSize: 10, fontWeight: '700', color: C.muted },

  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: S.gap },
  quickItem: {
    width: '48%',
    flexGrow: 1,
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.line,
  },
  quickPrimary: { backgroundColor: C.red, borderColor: C.red },
  quickLabel: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2, color: C.ink, flexShrink: 1 },

  seeAll: { fontSize: 12, fontWeight: '600', color: C.red },
  hair: { height: 1, backgroundColor: C.line },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.line2,
  },
  thumb: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
