import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useCloud } from '@/cloud/CloudProvider';
import { describe, pendingFromCoach, toExercises, type CoachWorkout } from '@/data/coachWorkouts';
import { exerciseName } from '@/data/exercises';
import { useActiveWorkout, useStore } from '@/data/store';
import { C } from '@/theme';
import { Btn, Card, CardTitle, Meta, Row, Tag } from '@/ui/kit';

/** Workouts the client's coach built for them that they haven't done yet. */
export function CoachWorkoutsCard({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const cloud = useCloud();
  const { state, startWorkout } = useStore();
  const active = useActiveWorkout();
  if (!cloud.membership) return null;
  const todo = pendingFromCoach(cloud.coachWorkouts, state.workouts);
  if (todo.length === 0) return null;
  const coach = cloud.membership.coachName;

  const start = (w: CoachWorkout) => {
    if (active) {
      Alert.alert('Finish your current workout first', `You have ${active.name} in progress.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open it', onPress: () => router.push('/workout/active') },
      ]);
      return;
    }
    startWorkout(w.name, toExercises(w.items), undefined, w.id);
    router.push('/workout/active');
  };

  const shown = compact ? todo.slice(0, 1) : todo;
  return (
    <Card style={{ gap: 12 }}>
      <Row>
        <CardTitle>From {coach}</CardTitle>
        <Tag label={todo.length === 1 ? 'New workout' : `${todo.length} workouts`} />
      </Row>
      {shown.map((w, i) => (
        <View key={w.id} style={[{ gap: 6 }, i > 0 && s.sep]}>
          <Text style={s.name}>{w.name}</Text>
          <Meta>{describe(w.items)}</Meta>
          {w.note ? <Text style={s.note}>“{w.note}”</Text> : null}
          {!compact ? (
            <View style={{ gap: 2 }}>
              {w.items.map((it, j) => (
                <Meta key={`${it.exerciseId}-${j}`}>
                  {j + 1}. {exerciseName(it.exerciseId)} · {it.sets} × {it.reps}
                </Meta>
              ))}
            </View>
          ) : null}
          <Btn label="Start this workout" icon="play" onPress={() => start(w)} style={{ marginTop: 4 }} />
        </View>
      ))}
      {compact && todo.length > 1 ? (
        <Meta>
          {todo.length - 1} more in Workouts
        </Meta>
      ) : null}
    </Card>
  );
}

const s = StyleSheet.create({
  name: { fontSize: 16, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  note: { fontSize: 14, fontStyle: 'italic', color: C.ink2, lineHeight: 20 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, paddingTop: 12 },
});
