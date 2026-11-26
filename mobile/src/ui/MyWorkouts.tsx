import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { describe, toExercises } from '@/data/coachWorkouts';
import { useActiveWorkout, useStore } from '@/data/store';
import type { MyWorkout } from '@/data/types';
import { C } from '@/theme';
import { Btn, Card, CardTitle, Meta, Row } from '@/ui/kit';

/** The user's own saved workouts: start one, edit it, or build a new one. */
export function MyWorkoutsCard() {
  const router = useRouter();
  const { state, startWorkout, discardWorkout } = useStore();
  const active = useActiveWorkout();
  const mine = state.myWorkouts ?? [];

  const begin = (w: MyWorkout) => {
    startWorkout(w.name, toExercises(w.items));
    router.push('/workout/active');
  };

  const start = (w: MyWorkout) => {
    if (!active) return begin(w);
    const logged = active.exercises.some((e) => e.sets.some((x) => x.done));
    Alert.alert(`${active.name} is still open`, logged ? `Start ${w.name} instead? The sets you logged will be lost.` : `Start ${w.name} instead?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: `Open ${active.name}`, onPress: () => router.push('/workout/active') },
      {
        text: `Start ${w.name}`,
        style: logged ? 'destructive' : 'default',
        onPress: () => {
          discardWorkout();
          begin(w);
        },
      },
    ]);
  };

  return (
    <Card style={{ gap: 10 }}>
      <Row>
        <CardTitle>My workouts</CardTitle>
        {mine.length ? <Meta>{mine.length} saved</Meta> : null}
      </Row>
      {mine.length === 0 ? (
        <Meta>Build your own workout with the exercises, sets, reps and rest you like, save it, and start it any time, on top of your plan.</Meta>
      ) : (
        mine.map((w, i) => (
          <View key={w.id} style={[s.row, i > 0 && s.line]}>
            <Pressable onPress={() => router.push({ pathname: '/workout/build', params: { edit: w.id } })} style={{ flex: 1 }} accessibilityRole="button" accessibilityHint="Edit this workout">
              <Text style={s.name} numberOfLines={1}>
                {w.name}
              </Text>
              <Meta>{describe(w.items)}</Meta>
            </Pressable>
            <Pressable onPress={() => router.push({ pathname: '/workout/build', params: { edit: w.id } })} hitSlop={8} accessibilityLabel={`Edit ${w.name}`}>
              <Ionicons name="create-outline" size={19} color={C.muted} />
            </Pressable>
            <Pressable onPress={() => start(w)} style={s.go} accessibilityRole="button" accessibilityLabel={`Start ${w.name}`}>
              <Ionicons name="play" size={13} color="#fff" />
              <Text style={s.goText}>Start</Text>
            </Pressable>
          </View>
        ))
      )}
      <Btn label="Create a workout" icon="add" ghost onPress={() => router.push('/workout/build')} />
    </Card>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, paddingTop: 10 },
  name: { fontSize: 15, fontWeight: '800', color: C.ink },
  go: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: C.red },
  goText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
