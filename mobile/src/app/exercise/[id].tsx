import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { byId, equipmentLabel, muscleLabel } from '@/data/exercises';
import { personalRecords } from '@/data/stats';
import { useActiveWorkout, useStore } from '@/data/store';
import { C } from '@/theme';
import { Btn, Card, CardTitle, Empty, Label, Row, Screen, Tag } from '@/ui/kit';

export default function ExerciseGuide() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, addExercise } = useStore();
  const active = useActiveWorkout();
  const exercise = byId(id);

  if (!exercise) {
    return (
      <Screen>
        <Empty icon="alert-circle-outline" title="Exercise not found" body="It may have been removed." />
      </Screen>
    );
  }

  const pr = personalRecords(state).find((p) => p.exerciseId === exercise.id);

  return (
    <Screen>
      <Stack.Screen options={{ title: exercise.name }} />

      <Card>
        <CardTitle>{exercise.name}</CardTitle>
        <Row style={{ justifyContent: 'flex-start', gap: 6, marginTop: 9 }}>
          <Tag label={muscleLabel(exercise.muscle)} />
          <Tag tone="grey" label={equipmentLabel(exercise.equipment)} />
          <Tag tone="grey" label={exercise.compound ? 'Compound' : 'Isolation'} />
        </Row>
      </Card>

      {pr ? (
        <Card>
          <Row>
            <View>
              <Label>Your best set</Label>
              <Text style={s.pr}>
                {pr.reps} × {pr.weight} {state.profile.units}
              </Text>
            </View>
            <Ionicons name="trophy" size={22} color={C.red} />
          </Row>
        </Card>
      ) : null}

      <Card>
        <CardTitle>How to do it</CardTitle>
        <View style={{ gap: 11, marginTop: 11 }}>
          {exercise.cues.map((cue, i) => (
            <View key={i} style={s.cue}>
              <View style={s.bullet}>
                <Text style={s.bulletText}>{i + 1}</Text>
              </View>
              <Text style={s.cueText}>{cue}</Text>
            </View>
          ))}
        </View>
      </Card>

      {active ? (
        <Btn
          label={`Add to ${active.name}`}
          icon="add"
          onPress={() => {
            addExercise(exercise.id);
            router.dismissTo('/workout/active');
          }}
        />
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  pr: { fontSize: 22, fontWeight: '800', letterSpacing: -0.7, color: C.ink, marginTop: 3 },
  cue: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: C.redWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  bulletText: { fontSize: 11, fontWeight: '800', color: C.red },
  cueText: { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 20, color: C.ink2 },
});
