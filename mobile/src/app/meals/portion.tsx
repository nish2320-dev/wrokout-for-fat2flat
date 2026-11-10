import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Food, macrosFor } from '@/data/food';
import { useStore } from '@/data/store';
import { C, S } from '@/theme';
import { Btn, Card, CardTitle, Empty, Label, Meta, Metric, Row, Screen } from '@/ui/kit';

const parseFood = (raw?: string): Food | null => {
  try {
    return raw ? (JSON.parse(raw) as Food) : null;
  } catch {
    return null;
  }
};

export default function PortionScreen() {
  const router = useRouter();
  const { food: raw } = useLocalSearchParams<{ food?: string }>();
  const { addMeal } = useStore();
  const food = parseFood(raw);

  const [mode, setMode] = useState<'serving' | 'grams'>(food?.serving ? 'serving' : 'grams');
  const [amount, setAmount] = useState(food?.serving ? '1' : '100');

  if (!food) {
    return (
      <Screen>
        <Empty icon="alert-circle-outline" title="Food not found" body="Go back and pick it again." />
      </Screen>
    );
  }

  const n = parseFloat(amount);
  const qty = Number.isFinite(n) && n > 0 ? n : 0;
  const grams = mode === 'serving' && food.serving ? qty * food.serving.grams : qty;
  const { calories, protein } = macrosFor(food, grams);

  const switchMode = (next: 'serving' | 'grams') => {
    if (next === mode) return;
    setMode(next);
    setAmount(next === 'serving' ? '1' : String(food.serving?.grams ?? 100));
  };

  const add = () => {
    if (grams <= 0) return;
    const portion =
      mode === 'serving' && food.serving
        ? qty === 1
          ? food.serving.label
          : `${qty} × ${food.serving.label}`
        : `${Math.round(grams)} g`;
    addMeal({ name: `${food.name} (${portion})`, calories, protein });
    Keyboard.dismiss();
    router.dismissTo('/meals');
  };

  return (
    <Screen>
      <Card>
        <CardTitle>{food.name}</CardTitle>
        <Meta>
          {food.brand ? `${food.brand} · ` : ''}
          {Math.round(food.kcal100)} cal · {food.protein100}g protein per 100 g
        </Meta>
        {food.id.startsWith('off:') ? <Meta>Food data from Open Food Facts (openfoodfacts.org)</Meta> : null}
      </Card>

      <Card>
        <Row>
          <CardTitle>How much?</CardTitle>
          {food.serving ? (
            <View style={s.seg}>
              {(['serving', 'grams'] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => switchMode(m)}
                  style={[s.segItem, mode === m && s.segOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mode === m }}>
                  <Text style={[s.segText, mode === m && s.segTextOn]}>
                    {m === 'serving' ? 'Servings' : 'Grams'}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Row>
        <TextInput
          value={amount}
          onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={s.input}
          accessibilityLabel={mode === 'serving' ? 'Number of servings' : 'Grams'}
        />
        <Meta>
          {mode === 'serving' && food.serving
            ? `1 serving = ${food.serving.label}`
            : 'Weigh it, or check the package (ml counts as grams for drinks).'}
        </Meta>
      </Card>

      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <Label>Calories</Label>
            <Metric value={`${calories}`} />
          </View>
          <View style={{ flex: 1 }}>
            <Label>Protein</Label>
            <Metric value={`${protein}`} unit="g" />
          </View>
        </Row>
      </Card>

      <Btn label="Add to today" icon="add" onPress={add} disabled={grams <= 0} />
      {grams <= 0 ? <Meta style={{ textAlign: 'center' }}>Enter an amount to add it.</Meta> : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: C.line2, borderRadius: 10, padding: 3, gap: 3 },
  segItem: { paddingHorizontal: 12, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.red },
  segText: { fontSize: 13, fontWeight: '700', color: C.ink2 },
  segTextOn: { color: '#fff' },
  input: {
    height: 50,
    borderRadius: 12,
    backgroundColor: C.wash,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 14,
    fontSize: 22,
    fontWeight: '800',
    color: C.ink,
    marginTop: 10,
    marginBottom: S.gap - 3,
  },
});
