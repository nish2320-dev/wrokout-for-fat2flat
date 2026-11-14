import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { exerciseName } from '@/data/exercises';
import { checkInDue, nextSession, phaseOf, programProgress, weekOf, WEEKS } from '@/data/program';
import { useActiveWorkout, useStore } from '@/data/store';
import { durationMin, finished, fmtDate, fmtVolume, setCount, streak, thisWeek, todayMacros, volume } from '@/data/stats';
import { C, S } from '@/theme';
import { TodayActivity } from '@/ui/ActivityCard';
import { AskCard } from '@/ui/AskCard';
import { WaterCard } from '@/ui/WaterCard';
import { WelcomeTour } from '@/ui/WelcomeTour';
import { BadgeCelebration } from '@/ui/Badges';
import { CoachNoteCard, CoachTargetsCard } from '@/ui/CoachNoteCard';
import { CoachWorkoutsCard } from '@/ui/CoachWorkouts';
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
      <WelcomeTour />
      <BadgeCelebration />
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

      <CoachNoteCard />
      <CoachTargetsCard />
      <CoachWorkoutsCard compact />

      {active ? (
        <Pressable onPress={() => router.push('/workout/active')}>
          <Card style={s.resume}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text style={s.resumeEyebrow}>WORKOUT IN PROGRESS</Text>
                <Text style={s.resumeTitle}>{active.name}</Text>
                <Text style={s.resumeMeta}>
                  {setCount(active)} of {active.exercises.reduce((n, e) => n + e.sets.length, 0)} sets done · tap to continue
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </Row>
          </Card>
        </Pressable>
      ) : null}

      <TransformCard />

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

      <AskCard />

      <WaterCard />

      <TodayActivity />

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

/** The Transformation's front door: an invitation before it starts, today's session after. */
function TransformCard() {
  const router = useRouter();
  const { state } = useStore();
  const program = state.program;
  const now = Date.now();

  if (!program) {
    return (
      <Pressable onPress={() => router.push('/transform/setup')} accessibilityRole="button">
        <View style={s.tf}>
          <Text style={s.tfEyebrow}>NEW · 12-WEEK PROGRAM</Text>
          <Text style={s.tfTitle}>Start your Fat2Flat Transformation</Text>
          <Text style={s.tfBody}>
            Personal calorie and protein targets, a workout plan for every week, and a coach that adjusts as you go.
          </Text>
          <View style={s.tfBtn}>
            <Ionicons name="flame" size={15} color="#fff" />
            <Text style={s.tfBtnText}>Build my plan</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  const week = weekOf(program, now);
  const progress = programProgress(state);
  const next = nextSession(state, now);
  const due = checkInDue(state, now);
  return (
    <Pressable onPress={() => router.push('/transform')} accessibilityRole="button">
      <View style={s.tf}>
        <Row>
          <Text style={s.tfEyebrow}>
            {week > WEEKS ? 'TRANSFORMATION COMPLETE' : `YOUR TRANSFORMATION · WEEK ${week} OF ${WEEKS}`}
          </Text>
          {due ? (
            <View style={s.tfDue}>
              <Text style={s.tfDueText}>Check-in due</Text>
            </View>
          ) : null}
        </Row>
        <Text style={s.tfTitle}>
          {week > WEEKS ? 'See your results' : next ? `Up next: ${next.plan.name}` : 'This week is done 💪'}
        </Text>
        {week <= WEEKS ? <Text style={s.tfBody}>{phaseOf(week).label} phase · tap for your plan, coach and check-ins</Text> : null}
        <View style={s.tfTrack}>
          <View style={[s.tfFill, { width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }]} />
        </View>
        <Row>
          <Text style={s.tfMeta}>
            {progress.done} of {progress.total} workouts
          </Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
        </Row>
      </View>
    </Pressable>
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

  // red, so it never reads as the (dark) Transformation card below it
  resume: { backgroundColor: C.red, borderColor: C.red },
  resumeEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  resumeTitle: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  resumeMeta: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  tf: { backgroundColor: C.ink, borderRadius: S.radius, padding: 15, gap: 7 },
  tfEyebrow: { color: C.redLight, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.9 },
  tfTitle: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  tfBody: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 18 },
  tfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: C.red,
    marginTop: 4,
  },
  tfBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  tfDue: { height: 20, paddingHorizontal: 8, borderRadius: 10, backgroundColor: C.red, justifyContent: 'center' },
  tfDueText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  tfTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  tfFill: { height: '100%', borderRadius: 3, backgroundColor: C.red },
  tfMeta: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },

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
