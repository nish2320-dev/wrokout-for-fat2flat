import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EQUIPMENT, Equipment, equipmentLabel, muscleLabel } from '@/data/exercises';
import { FOCUS, Focus, GOALS, Goal, LENGTHS, generate, planToExercises } from '@/data/generator';
import { useActiveWorkout, useStore } from '@/data/store';
import { C, S } from '@/theme';
import { Btn, Card, CardTitle, Empty, Eyebrow, Label, Meta, Name, Pill, Row, Screen, Tag, Title } from '@/ui/kit';

export default function WorkoutsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { startWorkout } = useStore();
  const active = useActiveWorkout();

  const [focus, setFocus] = useState<Focus>('full');
  const [equipment, setEquipment] = useState<Equipment[]>(['dumbbells', 'barbell']);
  const [goal, setGoal] = useState<Goal>('muscle');
  const [minutes, setMinutes] = useState(45);

  const plan = useMemo(
    () => generate({ focus, equipment, goal, minutes }),
    [focus, equipment, goal, minutes],
  );

  const toggleEquipment = (key: Equipment) =>
    setEquipment((cur) =>
      cur.includes(key)
        ? // never let the user deselect everything — there'd be nothing to build from
          cur.length === 1
          ? cur
          : cur.filter((k) => k !== key)
        : [...cur, key],
    );

  const totalSets = plan.items.reduce((n, i) => n + i.sets, 0);

  const start = () => {
    if (active) {
      router.push('/workout/active');
      return;
    }
    startWorkout(plan.name, planToExercises(plan));
    router.push('/workout/active');
  };

  return (
    <Screen>
      <View style={{ height: insets.top }} />

      <Row style={{ paddingHorizontal: 2 }}>
        <Title>Build a workout</Title>
        <Pressable onPress={() => router.push('/workout/library')} accessibilityRole="button">
          <View style={s.libBtn}>
            <Ionicons name="library-outline" size={15} color={C.ink2} />
            <Text style={s.libText}>Library</Text>
          </View>
        </Pressable>
      </Row>

      {active ? (
        <Pressable onPress={() => router.push('/workout/active')}>
          <Card style={s.resume}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text style={s.resumeTitle}>Resume {active.name}</Text>
                <Text style={s.resumeMeta}>You have a workout in progress</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </Row>
          </Card>
        </Pressable>
      ) : null}

      <Group title="Muscle group">
        {FOCUS.map((f) => (
          <Pill key={f.key} label={f.label} on={focus === f.key} onPress={() => setFocus(f.key)} />
        ))}
      </Group>

      <Group title="Equipment">
        {EQUIPMENT.map((e) => (
          <Pill
            key={e.key}
            label={e.label}
            on={equipment.includes(e.key)}
            onPress={() => toggleEquipment(e.key)}
          />
        ))}
      </Group>

      <Group title="Goal">
        {GOALS.map((g) => (
          <Pill key={g.key} label={g.label} on={goal === g.key} onPress={() => setGoal(g.key)} />
        ))}
      </Group>

      <Group title="Session length">
        {LENGTHS.map((m) => (
          <Pill key={m} label={`${m} min`} on={minutes === m} onPress={() => setMinutes(m)} />
        ))}
      </Group>

      <Card flush>
        <Row style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <CardTitle>Today's plan</CardTitle>
            <Meta>
              {plan.items.length} exercises · {totalSets} sets · ~{minutes} min
            </Meta>
          </View>
          <Tag label="Auto-built" />
        </Row>
        <View style={s.hair} />

        {plan.items.length === 0 ? (
          <Empty
            icon="options-outline"
            title="Nothing matches those filters"
            body="Try adding another piece of equipment, or widen the muscle group."
          />
        ) : (
          plan.items.map((item, i) => (
            <View key={item.exercise.id} style={s.planRow}>
              <View style={s.num}>
                <Text style={s.numText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Name>{item.exercise.name}</Name>
                <Meta>
                  {muscleLabel(item.exercise.muscle)} · {equipmentLabel(item.exercise.equipment)}
                </Meta>
              </View>
              <Text style={s.scheme}>
                {item.sets} × {item.reps}
              </Text>
            </View>
          ))
        )}
      </Card>

      <Btn
        label={active ? 'Resume workout' : 'Start this workout'}
        icon="play"
        onPress={start}
        disabled={!active && plan.items.length === 0}
      />
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Eyebrow>{title}</Eyebrow>
      <View style={s.chips}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  hair: { height: 1, backgroundColor: C.line },

  libBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.line,
  },
  libText: { fontSize: 12, fontWeight: '700', color: C.ink2 },

  resume: { backgroundColor: C.ink, borderColor: C.ink },
  resumeTitle: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  resumeMeta: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: C.line2,
  },
  num: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: C.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontSize: 12, fontWeight: '800', color: C.muted },
  scheme: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3, color: C.red },
});
