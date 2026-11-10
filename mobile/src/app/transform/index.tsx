import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { coachAdvice } from '@/data/coach';
import { planToExercises } from '@/data/generator';
import {
  checkInDue,
  completedKeys,
  nextSession,
  phaseOf,
  PHASES,
  programProgress,
  ProgramSession,
  weekOf,
  weekSessions,
  WEEKS,
} from '@/data/program';
import { useActiveWorkout, useStore } from '@/data/store';
import { fmtLength, fmtWeight, lengthUnit } from '@/data/units';
import { C, S } from '@/theme';
import { Btn, Card, CardTitle, Empty, Eyebrow, Label, Meta, Metric, Name, Row, Screen, Tag } from '@/ui/kit';

const DAY = 86400000;

export default function TransformScreen() {
  const router = useRouter();
  const { state, startWorkout, applyCoach, endProgram } = useStore();
  const active = useActiveWorkout();
  const program = state.program;
  const now = Date.now();

  if (!program) {
    return (
      <Screen>
        <Empty
          icon="flame-outline"
          title="No Transformation yet"
          body="Set up your 12-week plan: daily targets, weekly workouts and a coach that adjusts as you go."
        />
        <Btn label="Set up my plan" icon="flame" onPress={() => router.replace('/transform/setup')} />
      </Screen>
    );
  }

  const units = state.profile.units;
  const week = weekOf(program, now);
  const finished = week > WEEKS;
  const phase = phaseOf(Math.min(week, WEEKS));
  const progress = programProgress(state);
  const done = completedKeys(state.workouts);
  const sessions = finished ? [] : weekSessions(program, week);
  const next = nextSession(state, now);
  const advice = coachAdvice(state, now);
  const due = checkInDue(state, now);
  const lastCheckIn = state.checkIns[state.checkIns.length - 1];
  const photoCheckIns = state.checkIns.filter((c) => c.photos.front || c.photos.side);

  const latestWeight = state.weighIns[state.weighIns.length - 1]?.weight ?? program.body.startWeight;
  const lost = program.body.startWeight - latestWeight;
  const toGo = latestWeight - program.body.goalWeight;
  const waists = state.checkIns.filter((c) => c.waist !== undefined).map((c) => c.waist!);
  const waistChange = waists.length >= 2 ? waists[0] - waists[waists.length - 1] : null;

  const start = (sess: ProgramSession) => {
    if (active) {
      router.push('/workout/active');
      return;
    }
    startWorkout(`Week ${sess.week} · ${sess.plan.name}`, planToExercises(sess.plan), sess.key);
    router.push('/workout/active');
  };

  const confirmEnd = () =>
    Alert.alert('End your Transformation?', 'Your workouts, meals, weigh-ins and check-ins stay. Only the 12-week plan is removed.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'End plan',
        style: 'destructive',
        onPress: () => {
          endProgram();
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <View style={s.hero}>
        <Text style={s.heroEyebrow}>{finished ? 'COMPLETE' : `${phase.label.toUpperCase()} PHASE`}</Text>
        <Text style={s.heroTitle}>{finished ? 'You did it! 🎉' : `Week ${week} of ${WEEKS}`}</Text>
        <Text style={s.heroBody}>
          {finished ? '12 weeks of work, done. Look how far you’ve come.' : phase.blurb}
        </Text>
        <View style={s.track}>
          <View style={[s.fill, { width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }]} />
        </View>
        <Text style={s.heroMeta}>
          {progress.done} of {progress.total} workouts · {lost > 0 ? `${fmtWeight(Math.round(lost * 10) / 10)} ${units} down` : 'just getting started'}
          {waistChange !== null && waistChange > 0 ? ` · ${fmtLength(waistChange, units)} ${lengthUnit(units)} off the waist` : ''}
        </Text>
        <View style={s.phases}>
          {PHASES.map((p) => (
            <View key={p.key} style={[s.phaseChip, (finished || week > p.weeks[1]) && s.phaseDone, !finished && p.key === phase.key && s.phaseNow]}>
              <Text style={[s.phaseText, (finished || week >= p.weeks[0]) && { color: '#fff' }]}>
                {p.label} · wk {p.weeks[0]}–{p.weeks[1]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {finished ? (
        <Card>
          <CardTitle>Your results</CardTitle>
          <Row style={{ marginTop: 10 }}>
            <Stat label="Weight" value={lost > 0 ? `−${fmtWeight(Math.round(lost * 10) / 10)}` : fmtWeight(Math.round(-lost * 10) / 10)} unit={units} />
            <Stat label="Waist" value={waistChange !== null ? `−${fmtLength(Math.max(0, waistChange), units)}` : '—'} unit={lengthUnit(units)} />
            <Stat label="Workouts" value={`${progress.done}`} />
          </Row>
          {photoCheckIns.length >= 2 ? (
            <Btn label="See your before & after" icon="images-outline" onPress={() => router.push('/photos')} style={{ marginTop: 12 }} />
          ) : null}
          <Btn label="Start another 12 weeks" icon="refresh" ghost onPress={() => { endProgram(); router.replace('/transform/setup'); }} style={{ marginTop: 9 }} />
        </Card>
      ) : (
        <Card flush>
          <Row style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <CardTitle>This week’s workouts</CardTitle>
              <Meta>
                {sessions.filter((x) => done.has(x.key)).length} of {sessions.length} done
              </Meta>
            </View>
            {next ? <Tag label="Up next" /> : <Tag tone="green" label="Week done" />}
          </Row>
          <View style={s.hair} />
          {sessions.map((sess) => {
            const isDone = done.has(sess.key);
            const isNext = next?.key === sess.key;
            return (
              <Pressable
                key={sess.key}
                onPress={() => !isDone && start(sess)}
                disabled={isDone}
                accessibilityRole="button"
                style={({ pressed }) => [s.sessRow, pressed && { backgroundColor: C.line2 }]}>
                <View style={[s.check, isDone && s.checkDone]}>
                  {isDone ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Name>{sess.plan.name}</Name>
                  <Meta numberOfLines={1}>
                    {sess.plan.items.map((i) => i.exercise.name).join(' · ')}
                  </Meta>
                </View>
                {isDone ? null : isNext ? (
                  <View style={s.go}>
                    <Text style={s.goText}>{active ? 'Resume' : 'Start'}</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={15} color={C.faint} />
                )}
              </Pressable>
            );
          })}
        </Card>
      )}

      {advice ? (
        <Card>
          <Row style={{ alignItems: 'flex-start' }}>
            <View style={s.coachIcon}>
              <Ionicons name="sparkles" size={16} color={C.red} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Label>Your coach</Label>
              <Name>{advice.title}</Name>
              <Meta>{advice.detail}</Meta>
            </View>
          </Row>
          {advice.kind === 'lower' || advice.kind === 'raise' ? (
            <Btn
              label={`Set my target to ${advice.to.toLocaleString()} cal`}
              icon={advice.kind === 'lower' ? 'trending-down' : 'trending-up'}
              onPress={() => applyCoach(advice.to, advice.title)}
              style={{ marginTop: 12 }}
            />
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <CardTitle>Weekly check-in</CardTitle>
            <Meta>
              {due
                ? 'Weight, waist and progress photos. Takes a minute.'
                : (() => {
                    const n = Math.max(1, Math.ceil((lastCheckIn!.at + 7 * DAY - now) / DAY));
                    return `Next one in ${n} day${n === 1 ? '' : 's'}.`;
                  })()}
            </Meta>
          </View>
          {due ? <Tag label="Due" /> : <Tag tone="green" label="Done" />}
        </Row>
        <View style={s.btnRow}>
          <Btn label={due ? 'Check in' : 'Check in again'} icon="camera-outline" ghost={!due} onPress={() => router.push('/checkin')} style={{ flex: 1 }} />
          {photoCheckIns.length >= 2 ? (
            <Btn label="Compare" icon="images-outline" ghost onPress={() => router.push('/photos')} style={{ flex: 1 }} />
          ) : null}
        </View>
      </Card>

      <Card>
        <CardTitle>Your plan</CardTitle>
        <Row style={{ marginTop: 10 }}>
          <Stat label="Calories" value={state.profile.calorieGoal.toLocaleString()} />
          <Stat label="Protein" value={`${state.profile.proteinGoal}`} unit="g" />
          <Stat label="To goal" value={toGo > 0 ? fmtWeight(Math.round(toGo * 10) / 10) : '0'} unit={units} />
        </Row>
        <Meta style={{ marginTop: 8 }}>
          {program.daysPerWeek} workouts a week · started {new Date(program.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          {program.adjustments.length > 0 ? ` · coach adjusted calories ${program.adjustments.length}×` : ''}
        </Meta>
        <View style={s.btnRow}>
          <Btn label="Edit plan" icon="create-outline" ghost onPress={() => router.push('/transform/setup')} style={{ flex: 1 }} />
          <Btn label="End plan" icon="close" ghost onPress={confirmEnd} style={{ flex: 1 }} />
        </View>
      </Card>

      <Eyebrow>Fat2Flat Transformation</Eyebrow>
    </Screen>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Label>{label}</Label>
      <Metric small value={value} unit={unit} />
    </View>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: C.ink, borderRadius: S.radius, padding: 16, gap: 6 },
  heroEyebrow: { color: C.redLight, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.9 },
  heroBody: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500', lineHeight: 18 },
  heroMeta: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  track: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginTop: 6 },
  fill: { height: '100%', borderRadius: 4, backgroundColor: C.red },
  phases: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  phaseChip: { paddingHorizontal: 9, height: 24, borderRadius: 12, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  phaseNow: { backgroundColor: C.red },
  phaseDone: { backgroundColor: 'rgba(255,255,255,0.22)' },
  phaseText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.45)' },
  hair: { height: 1, backgroundColor: C.line },
  sessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.line2,
  },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: C.green, borderColor: C.green },
  go: { height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.red, justifyContent: 'center' },
  goText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  coachIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.redWash, alignItems: 'center', justifyContent: 'center' },
  btnRow: { flexDirection: 'row', gap: S.gap, marginTop: 12 },
});
