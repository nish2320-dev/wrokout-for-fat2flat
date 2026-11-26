import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { itemFromMeal, macroLine, mealTotals, recentMeals } from '@/data/myMeals';
import { useStore } from '@/data/store';
import { C, S } from '@/theme';
import { Btn, Card, CardTitle, Eyebrow, Meta, Name, Row, Screen } from '@/ui/kit';
import { mealDraft, useMealDraft } from '@/ui/mealDraft';

const digits = (t: string) => t.replace(/[^0-9]/g, '');

/** Build a meal from several foods (search, barcode, recent or typed in), save it, and log it in one tap later. */
export default function CreateMeal() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const router = useRouter();
  const { state, saveMyMeal, deleteMyMeal } = useStore();
  const editing = edit ? state.myMeals?.find((m) => m.id === edit) : undefined;
  const items = useMealDraft();
  const [name, setName] = useState(editing?.name ?? '');
  const [showRecent, setShowRecent] = useState(false);
  const [manual, setManual] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });

  // start from the saved meal (or empty) and clear the draft when leaving
  useEffect(() => {
    mealDraft.set(editing?.items ?? []);
    return () => mealDraft.set([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = mealTotals(items);
  const recent = recentMeals(state.meals, Date.now(), 12);

  const addManual = () => {
    if (!manual.name.trim() || manual.calories === '') return;
    mealDraft.add({
      name: manual.name.trim(),
      calories: parseInt(manual.calories, 10) || 0,
      protein: parseInt(manual.protein, 10) || 0,
      ...(manual.carbs !== '' || manual.fat !== '' ? { carbs: parseInt(manual.carbs, 10) || 0, fat: parseInt(manual.fat, 10) || 0 } : {}),
    });
    setManual({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  };

  const save = () => {
    if (!name.trim()) return Alert.alert('Name your meal', 'For example “My breakfast” or “Dal, rice & salad”.');
    if (items.length === 0) return Alert.alert('Add a food', 'Search, scan or pick from your recent foods.');
    saveMyMeal({ id: editing?.id, name: name.trim(), items });
    router.back();
  };

  const confirmDelete = () =>
    editing &&
    Alert.alert(`Delete “${editing.name}”?`, 'Meals you already logged with it stay in your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteMyMeal(editing.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Card style={{ gap: 8 }}>
        <Eyebrow>Meal name</Eyebrow>
        <TextInput value={name} onChangeText={setName} placeholder="e.g. My breakfast" placeholderTextColor={C.faint} style={s.input} maxLength={60} />
      </Card>

      <Card flush>
        <Row style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
          <CardTitle>Foods</CardTitle>
          <Meta>{items.length ? macroLine(totals) : 'None yet'}</Meta>
        </Row>
        {items.map((it, i) => (
          <View key={`${it.name}-${i}`} style={s.row}>
            <View style={{ flex: 1 }}>
              <Name>{it.name}</Name>
              <Meta>{macroLine(it)}</Meta>
            </View>
            <Pressable onPress={() => mealDraft.remove(i)} hitSlop={10} accessibilityLabel={`Remove ${it.name}`}>
              <Ionicons name="close" size={17} color={C.faint} />
            </Pressable>
          </View>
        ))}
        <View style={[s.pair, { paddingHorizontal: 14, paddingTop: 12 }]}>
          <Btn label="Search" icon="search" ghost onPress={() => router.push({ pathname: '/meals/search', params: { for: 'meal' } })} style={{ flex: 1 }} />
          <Btn label="Scan" icon="barcode-outline" ghost onPress={() => router.push({ pathname: '/meals/scan', params: { for: 'meal' } })} style={{ flex: 1 }} />
          <Btn label="Recent" icon="time-outline" ghost onPress={() => setShowRecent((v) => !v)} style={{ flex: 1 }} />
        </View>
        {showRecent ? (
          recent.length === 0 ? (
            <Meta style={{ paddingHorizontal: 14, paddingTop: 10 }}>Foods you log will show up here.</Meta>
          ) : (
            <View style={{ paddingTop: 6 }}>
              {recent.map((m) => (
                <Pressable key={m.id} onPress={() => mealDraft.add(itemFromMeal(m))} style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}>
                  <View style={{ flex: 1 }}>
                    <Name>{m.name}</Name>
                    <Meta>{macroLine(m)}</Meta>
                  </View>
                  <Ionicons name="add-circle" size={22} color={C.red} />
                </Pressable>
              ))}
            </View>
          )
        ) : null}
      </Card>

      <Card style={{ gap: 8 }}>
        <CardTitle>Or type a food in</CardTitle>
        <TextInput value={manual.name} onChangeText={(t) => setManual((m) => ({ ...m, name: t }))} placeholder="Food, e.g. 2 rotis" placeholderTextColor={C.faint} style={s.input} />
        <View style={s.pair}>
          <TextInput value={manual.calories} onChangeText={(t) => setManual((m) => ({ ...m, calories: digits(t) }))} placeholder="Calories" placeholderTextColor={C.faint} keyboardType="number-pad" style={[s.input, { flex: 1 }]} />
          <TextInput value={manual.protein} onChangeText={(t) => setManual((m) => ({ ...m, protein: digits(t) }))} placeholder="Protein g" placeholderTextColor={C.faint} keyboardType="number-pad" style={[s.input, { flex: 1 }]} />
        </View>
        <View style={s.pair}>
          <TextInput value={manual.carbs} onChangeText={(t) => setManual((m) => ({ ...m, carbs: digits(t) }))} placeholder="Carbs g" placeholderTextColor={C.faint} keyboardType="number-pad" style={[s.input, { flex: 1 }]} />
          <TextInput value={manual.fat} onChangeText={(t) => setManual((m) => ({ ...m, fat: digits(t) }))} placeholder="Fat g" placeholderTextColor={C.faint} keyboardType="number-pad" style={[s.input, { flex: 1 }]} />
        </View>
        <Btn label="Add food" icon="add" ghost onPress={addManual} disabled={!manual.name.trim() || manual.calories === ''} />
      </Card>

      <Btn label={editing ? 'Save changes' : 'Save meal'} icon="checkmark" onPress={save} disabled={!name.trim() || items.length === 0} />
      {editing ? <Btn label="Delete meal" icon="trash-outline" ghost onPress={confirmDelete} /> : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  input: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: C.wash,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    color: C.ink,
  },
  pair: { flexDirection: 'row', gap: S.gap },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line2 },
});
