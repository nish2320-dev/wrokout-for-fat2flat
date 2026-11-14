import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listClients, sendWorkout, type ClientRow } from '@/cloud/coachApi';
import { useCloud } from '@/cloud/CloudProvider';
import { errorText } from '@/cloud/supabase';
import { cleanItems, DEFAULT_REST, describe, MAX_ITEMS, REST_CHOICES, type CoachWorkoutItem } from '@/data/coachWorkouts';
import { byId, EQUIPMENT, EXERCISES, equipmentLabel, MUSCLES, muscleLabel, type Exercise, type Muscle } from '@/data/exercises';
import { FOCUS, generate, type Focus } from '@/data/generator';
import { C, S } from '@/theme';
import { Btn, Card, CardTitle, Eyebrow, Meta, Name, Pill, Row, Screen } from '@/ui/kit';

const restLabel = (sec: number) => (sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : `${sec}s`);

const newItem = (e: Exercise): CoachWorkoutItem => ({
  exerciseId: e.id,
  sets: 3,
  reps: e.compound ? 8 : 12,
  restSec: e.compound ? 120 : 60,
});

/** The coach builds a workout from the exercise library and sends it to one or more clients. */
export default function BuildWorkout() {
  const { to, copy } = useLocalSearchParams<{ to?: string; copy?: string }>();
  const router = useRouter();
  const cloud = useCloud();
  const start = useMemo(() => {
    try {
      return copy ? (JSON.parse(copy) as { name: string; note: string; items: CoachWorkoutItem[] }) : null;
    } catch {
      return null;
    }
  }, [copy]);
  const [name, setName] = useState(start?.name ?? '');
  const [note, setNote] = useState(start?.note ?? '');
  const [items, setItems] = useState<CoachWorkoutItem[]>(start ? cleanItems(start.items) : []);
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [chosen, setChosen] = useState<string[]>(to ? [to] : []);
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState(false);
  const coachId = cloud.coach ? cloud.userId : null;

  useEffect(() => {
    if (!coachId) return;
    listClients(coachId)
      .then((cs) => setClients(cs.sort((a, b) => a.name.localeCompare(b.name))))
      .catch((e) => {
        Alert.alert('Could not load clients', errorText(e));
        setClients([]);
      });
  }, [coachId]);

  const patch = (i: number, p: Partial<CoachWorkoutItem>) => setItems((cur) => cur.map((it, j) => (j === i ? { ...it, ...p } : it)));
  const move = (i: number, by: -1 | 1) =>
    setItems((cur) => {
      const j = i + by;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const quickFill = (focus: Focus) => {
    const fill = () => {
      const plan = generate({ focus, equipment: EQUIPMENT.map((e) => e.key), goal: 'fat', minutes: 45 });
      setItems(plan.items.map((p) => ({ ...newItem(p.exercise), sets: p.sets, reps: p.reps })));
      if (!name.trim()) setName(plan.name);
    };
    if (items.length === 0) fill();
    else
      Alert.alert('Replace the exercises?', 'This swaps your current list for a ready-made one you can then edit.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', onPress: fill },
      ]);
  };

  const send = async () => {
    if (!cloud.coach || !clients) return;
    const clean = cleanItems(items);
    if (!name.trim()) return Alert.alert('Name the workout', 'For example “Upper body A” or “Leg day”.');
    if (clean.length === 0) return Alert.alert('Add an exercise', 'Tap “Add exercise” to pick from the library.');
    const to = clients.filter((c) => chosen.includes(c.user_id));
    if (to.length === 0) return Alert.alert('Choose who gets it', 'Tap at least one client’s name.');
    setSending(true);
    try {
      const n = await sendWorkout(cloud.coach.name, to, { name, note, items: clean });
      Alert.alert('Sent', n === 1 ? `${to[0].name.split(' ')[0]} will find it under Workouts.` : `${n} clients will find it under Workouts.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Could not send', errorText(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <Card style={{ gap: 10 }}>
        <Eyebrow>Workout name</Eyebrow>
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Upper body A" placeholderTextColor={C.faint} style={s.input} maxLength={60} />
        <Eyebrow>Note for your client (optional)</Eyebrow>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Go light today, focus on form."
          placeholderTextColor={C.faint}
          style={[s.input, { minHeight: 64 }]}
          multiline
          maxLength={500}
        />
      </Card>

      {items.length === 0 ? (
        <Card style={{ gap: 10 }}>
          <CardTitle>Start from scratch or a ready-made list</CardTitle>
          <Meta>Pick one to fill in exercises you can then change, or add your own below.</Meta>
          <View style={s.chips}>
            {FOCUS.map((f) => (
              <Pill key={f.key} label={f.label} on={false} onPress={() => quickFill(f.key)} />
            ))}
          </View>
        </Card>
      ) : (
        <Meta style={{ paddingHorizontal: 2 }}>{describe(cleanItems(items))}</Meta>
      )}

      {items.map((it, i) => {
        const ex = byId(it.exerciseId);
        return (
          <Card key={`${it.exerciseId}-${i}`} style={{ gap: 10 }}>
            <Row>
              <View style={{ flex: 1 }}>
                <Name>
                  {i + 1}. {ex?.name ?? 'Exercise'}
                </Name>
                {ex ? <Meta>{muscleLabel(ex.muscle)} · {equipmentLabel(ex.equipment)}</Meta> : null}
              </View>
              <IconBtn name="chevron-up" label="Move up" onPress={() => move(i, -1)} disabled={i === 0} />
              <IconBtn name="chevron-down" label="Move down" onPress={() => move(i, 1)} disabled={i === items.length - 1} />
              <IconBtn name="trash-outline" label="Remove" onPress={() => setItems((cur) => cur.filter((_, j) => j !== i))} />
            </Row>
            <Row style={{ gap: 10 }}>
              <Stepper label="Sets" value={it.sets} min={1} max={10} onChange={(sets) => patch(i, { sets })} />
              <Stepper label="Reps" value={it.reps} min={1} max={100} onChange={(reps) => patch(i, { reps })} />
            </Row>
            <View style={{ gap: 6 }}>
              <Eyebrow>Rest between sets</Eyebrow>
              <View style={s.chips}>
                {REST_CHOICES.map((r) => (
                  <Pill key={r} label={restLabel(r)} on={(it.restSec ?? DEFAULT_REST) === r} onPress={() => patch(i, { restSec: r })} />
                ))}
              </View>
            </View>
            <TextInput
              value={it.note ?? ''}
              onChangeText={(t) => patch(i, { note: t })}
              placeholder="Tip for this exercise (optional)"
              placeholderTextColor={C.faint}
              style={s.input}
              maxLength={200}
            />
          </Card>
        );
      })}

      <Btn
        label="Add exercise"
        icon="add"
        ghost
        onPress={() => (items.length >= MAX_ITEMS ? Alert.alert('That’s plenty', `A workout can have up to ${MAX_ITEMS} exercises.`) : setPicking(true))}
      />

      <Card style={{ gap: 10 }}>
        <CardTitle>Send to</CardTitle>
        {clients === null ? (
          <Meta>Loading your clients…</Meta>
        ) : clients.length === 0 ? (
          <Meta>No clients yet. Share your coach code first.</Meta>
        ) : (
          <>
            <View style={s.chips}>
              {clients.map((c) => (
                <Pill
                  key={c.user_id}
                  label={c.name}
                  on={chosen.includes(c.user_id)}
                  onPress={() => setChosen((cur) => (cur.includes(c.user_id) ? cur.filter((x) => x !== c.user_id) : [...cur, c.user_id]))}
                />
              ))}
            </View>
            {clients.length > 1 ? (
              <Pressable
                onPress={() => setChosen(chosen.length === clients.length ? [] : clients.map((c) => c.user_id))}
                accessibilityRole="button">
                <Text style={s.link}>{chosen.length === clients.length ? 'Clear all' : 'Choose everyone'}</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </Card>

      <Btn
        label={sending ? 'Sending…' : chosen.length > 1 ? `Send to ${chosen.length} clients` : 'Send workout'}
        icon="send"
        onPress={send}
        disabled={sending || items.length === 0 || chosen.length === 0 || !name.trim()}
      />

      <ExercisePicker
        visible={picking}
        onClose={() => setPicking(false)}
        onPick={(e) => {
          setItems((cur) => [...cur, newItem(e)]);
          setPicking(false);
        }}
      />
    </Screen>
  );
}

function IconBtn({ name, label, onPress, disabled }: { name: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6} style={[s.iconBtn, disabled && { opacity: 0.3 }]} accessibilityLabel={label}>
      <Ionicons name={name} size={17} color={C.ink2} />
    </Pressable>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <View style={s.stepper}>
      <Text style={s.stepLabel}>{label}</Text>
      <Row style={{ gap: 6 }}>
        <Pressable onPress={() => onChange(Math.max(min, value - 1))} style={s.stepBtn} accessibilityLabel={`Fewer ${label.toLowerCase()}`}>
          <Ionicons name="remove" size={16} color={C.ink} />
        </Pressable>
        <Text style={s.stepVal}>{value}</Text>
        <Pressable onPress={() => onChange(Math.min(max, value + 1))} style={s.stepBtn} accessibilityLabel={`More ${label.toLowerCase()}`}>
          <Ionicons name="add" size={16} color={C.ink} />
        </Pressable>
      </Row>
    </View>
  );
}

function ExercisePicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (e: Exercise) => void }) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const list = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return EXERCISES.filter((e) => (!muscle || e.muscle === muscle) && words.every((w) => e.name.toLowerCase().includes(w)));
  }, [q, muscle]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.sheet, { paddingBottom: insets.bottom }]}>
        <Row style={{ paddingHorizontal: S.pad, paddingTop: 16 }}>
          <Text style={s.sheetTitle}>Add exercise</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <Text style={s.link}>Done</Text>
          </Pressable>
        </Row>
        <View style={{ paddingHorizontal: S.pad, gap: 10, paddingVertical: 12 }}>
          <TextInput value={q} onChangeText={setQ} placeholder="Search exercises" placeholderTextColor={C.faint} style={s.input} autoCorrect={false} />
          <View style={s.chips}>
            <Pill label="All" on={muscle === null} onPress={() => setMuscle(null)} />
            {MUSCLES.map((m) => (
              <Pill key={m.key} label={m.label} on={muscle === m.key} onPress={() => setMuscle(m.key)} />
            ))}
          </View>
        </View>
        <FlatList
          data={list}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Meta style={{ padding: S.pad }}>No exercises match that search.</Meta>}
          renderItem={({ item }) => (
            <Pressable onPress={() => onPick(item)} style={({ pressed }) => [s.pickRow, pressed && { backgroundColor: C.line2 }]}>
              <View style={{ flex: 1 }}>
                <Name>{item.name}</Name>
                <Meta>
                  {muscleLabel(item.muscle)} · {equipmentLabel(item.equipment)}
                </Meta>
              </View>
              <Ionicons name="add-circle" size={22} color={C.red} />
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  input: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: C.wash,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: C.ink,
  },
  iconBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: C.wash, marginLeft: 6 },
  stepper: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 10, gap: 6, alignItems: 'center' },
  stepLabel: { fontSize: 11, fontWeight: '700', color: C.faint, textTransform: 'uppercase', letterSpacing: 0.8 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.wash, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  stepVal: { minWidth: 36, textAlign: 'center', fontSize: 20, fontWeight: '800', color: C.ink },
  link: { fontSize: 14, fontWeight: '700', color: C.red },
  sheet: { flex: 1, backgroundColor: '#fff' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.ink },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: S.pad, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.line2 },
});
