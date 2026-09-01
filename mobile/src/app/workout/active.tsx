import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { byId, exerciseName } from '@/data/exercises';
import { previousBest } from '@/data/stats';
import { useActiveWorkout, useStore } from '@/data/store';
import { C } from '@/theme';
import { Btn, Card, CardTitle, Empty, Meta, Row, Screen, Tag } from '@/ui/kit';

const REST_SECONDS = 90;

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const workout = useActiveWorkout();
  const { state, addSet, updateSet, toggleSetDone, finishWorkout, discardWorkout, removeExercise } = useStore();

  const [now, setNow] = useState(Date.now());
  const [rest, setRest] = useState<number | null>(null);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // one ticker drives both the elapsed clock and the rest countdown
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      setRest((r) => (r === null ? null : r <= 1 ? null : r - 1));
    }, 1000);
    restRef.current = id;
    return () => clearInterval(id);
  }, []);

  if (!workout) {
    return (
      <Screen>
        <Empty
          icon="barbell-outline"
          title="No workout in progress"
          body="Start one from the Workouts tab and it'll open here."
        />
        <Btn label="Go to Workouts" onPress={() => router.replace('/workouts')} />
      </Screen>
    );
  }

  const doneSets = workout.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
  const allSets = workout.exercises.reduce((n, e) => n + e.sets.length, 0);
  const movedVolume = workout.exercises.reduce(
    (sum, e) => sum + e.sets.reduce((x, set) => x + (set.done ? set.reps * set.weight : 0), 0),
    0,
  );
  const elapsed = Math.floor((now - workout.startedAt) / 1000);
  const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  const onToggle = (ei: number, si: number, wasDone: boolean) => {
    toggleSetDone(ei, si);
    setRest(wasDone ? null : REST_SECONDS);
  };

  const confirmFinish = () => {
    if (doneSets === 0) {
      Alert.alert('Nothing logged yet', 'Mark at least one set as done before finishing.');
      return;
    }
    Alert.alert('Finish workout?', `${doneSets} sets logged.`, [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Finish',
        onPress: () => {
          finishWorkout();
          router.replace('/');
        },
      },
    ]);
  };

  const confirmDiscard = () => {
    Alert.alert('Discard workout?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          discardWorkout();
          router.replace('/workouts');
        },
      },
    ]);
  };

  return (
    <Screen>
      <Row style={{ paddingHorizontal: 2 }}>
        <View>
          <Text style={s.h1}>{workout.name}</Text>
          <Meta>
            {doneSets} of {allSets} sets · {Math.round(movedVolume).toLocaleString()} {state.profile.units} moved
          </Meta>
        </View>
        <View style={s.clock}>
          <Text style={s.clockText}>{clock}</Text>
        </View>
      </Row>

      {rest !== null ? (
        <View style={s.rest}>
          <View>
            <Text style={s.restLabel}>Rest</Text>
            <Text style={s.restVal}>
              {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, '0')}
            </Text>
          </View>
          <View style={s.restTrack}>
            <View style={[s.restFill, { width: `${(rest / REST_SECONDS) * 100}%` }]} />
          </View>
          <Pressable onPress={() => setRest((r) => (r ?? 0) + 30)} style={s.restBtn}>
            <Text style={s.restBtnText}>+30s</Text>
          </Pressable>
          <Pressable onPress={() => setRest(null)} style={s.restBtn}>
            <Ionicons name="close" size={14} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      {workout.exercises.length === 0 ? (
        <Card>
          <Empty
            icon="add-circle-outline"
            title="No exercises yet"
            body="Add your first exercise to start logging sets."
          />
        </Card>
      ) : (
        workout.exercises.map((ex, ei) => {
          const meta = byId(ex.exerciseId);
          const best = previousBest(state, ex.exerciseId, workout.startedAt);
          const heaviest = Math.max(0, ...ex.sets.filter((x) => x.done).map((x) => x.weight));
          const isPR = best !== null && heaviest > best.weight;

          return (
            <Card key={`${ex.exerciseId}-${ei}`} flush>
              <Row style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <CardTitle>{exerciseName(ex.exerciseId)}</CardTitle>
                  <Meta>
                    {best
                      ? `Last time: ${best.reps} × ${best.weight} ${state.profile.units}`
                      : meta
                        ? `${meta.compound ? 'Compound' : 'Isolation'} · first time`
                        : ''}
                  </Meta>
                </View>
                {isPR ? <Tag label="New PR" /> : null}
                <Pressable
                  onPress={() => removeExercise(ei)}
                  hitSlop={10}
                  style={{ marginLeft: 8 }}
                  accessibilityLabel={`Remove ${exerciseName(ex.exerciseId)}`}>
                  <Ionicons name="close" size={17} color={C.faint} />
                </Pressable>
              </Row>

              <View style={s.headRow}>
                <Text style={[s.headCell, { width: 26 }]}>Set</Text>
                <Text style={[s.headCell, { flex: 1 }]}>Reps</Text>
                <Text style={[s.headCell, { flex: 1 }]}>Weight</Text>
                <View style={{ width: 76 }} />
              </View>

              {ex.sets.map((set, si) => (
                <View key={si} style={s.setRow}>
                  <Text style={s.setNum}>{si + 1}</Text>
                  <NumField
                    value={set.reps}
                    onChange={(reps) => updateSet(ei, si, { reps })}
                    accessibilityLabel={`Reps for set ${si + 1}`}
                  />
                  <NumField
                    value={set.weight}
                    onChange={(weight) => updateSet(ei, si, { weight })}
                    accessibilityLabel={`Weight for set ${si + 1}`}
                  />
                  <Pressable
                    onPress={() => onToggle(ei, si, set.done)}
                    style={[s.doneBtn, !set.done && s.doneBtnIdle]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: set.done }}>
                    {set.done ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                    <Text style={[s.doneText, !set.done && s.doneTextIdle]}>
                      {set.done ? 'Logged' : 'Log'}
                    </Text>
                  </Pressable>
                </View>
              ))}

              <Pressable onPress={() => addSet(ei)} style={s.addSet}>
                <Ionicons name="add" size={15} color={C.red} />
                <Text style={s.addSetText}>Add set</Text>
              </Pressable>
            </Card>
          );
        })
      )}

      <Btn
        label="Add exercise"
        icon="add"
        ghost
        onPress={() => router.push({ pathname: '/workout/library', params: { pick: '1' } })}
      />
      <Btn label="Finish workout" onPress={confirmFinish} />
      <Pressable onPress={confirmDiscard} style={s.discard}>
        <Text style={s.discardText}>Discard workout</Text>
      </Pressable>
    </Screen>
  );
}

/** Numeric cell that tolerates an empty string while the user is retyping. */
function NumField({
  value,
  onChange,
  accessibilityLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  accessibilityLabel: string;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <TextInput
      value={text}
      onChangeText={(next) => {
        const cleaned = next.replace(/[^0-9.]/g, '');
        setText(cleaned);
        const n = parseFloat(cleaned);
        if (!Number.isNaN(n)) onChange(n);
      }}
      onBlur={() => {
        if (text === '' || Number.isNaN(parseFloat(text))) {
          setText(String(value));
        }
      }}
      keyboardType="decimal-pad"
      selectTextOnFocus
      accessibilityLabel={accessibilityLabel}
      style={s.input}
    />
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '800', letterSpacing: -0.75, color: C.ink },
  clock: { height: 30, paddingHorizontal: 13, borderRadius: 15, backgroundColor: C.ink, justifyContent: 'center' },
  clockText: { color: '#fff', fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },

  rest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 11,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: C.ink,
  },
  restLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  restVal: { fontSize: 20, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'], letterSpacing: -0.6 },
  restTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.16)', overflow: 'hidden' },
  restFill: { height: '100%', borderRadius: 3, backgroundColor: C.redLight },
  restBtn: {
    height: 28,
    minWidth: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  headCell: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.faint, textTransform: 'uppercase' },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.line2,
  },
  setNum: { width: 26, fontSize: 14, fontWeight: '700', color: C.muted },
  input: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.wash,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 10,
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
  },
  doneBtn: {
    width: 76,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  doneBtnIdle: { backgroundColor: '#F0F2F5' },
  doneText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  doneTextIdle: { color: C.muted },

  addSet: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingTop: 11 },
  addSetText: { fontSize: 13, fontWeight: '700', color: C.red },

  discard: { alignItems: 'center', paddingVertical: 6 },
  discardText: { fontSize: 13, fontWeight: '600', color: C.muted },
});
