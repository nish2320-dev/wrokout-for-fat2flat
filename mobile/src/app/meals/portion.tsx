import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Food, macrosFor } from '@/data/food';
import { C, S } from '@/theme';
import { LogDayNote } from '@/ui/LogDayNote';
import { Btn, Card, CardTitle, Empty, Label, Meta, Metric, Row, Screen } from '@/ui/kit';
import { useLogDay } from '@/ui/logDay';
import { mealDraft } from '@/ui/mealDraft';
import { useLogMeal } from '@/ui/useLogMeal';

const parseFood = (raw?: string): Food | null => {
  try {
    return raw ? (JSON.parse(raw) as Food) : null;
  } catch {
    return null;
  }
};

export default function PortionScreen() {
  const router = useRouter();
  // for=meal: adding a food to a meal being built (Create a meal), not logging it
  const { food: raw, for: forWhat, back } = useLocalSearchParams<{ food?: string; for?: string; back?: string }>();
  const forMeal = forWhat === 'meal';
  const logMeal = useLogMeal();
  const logDay = useLogDay();
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
  const macros = macrosFor(food, grams);
  const { calories, protein } = macros;

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
    Keyboard.dismiss();
    if (forMeal) {
      mealDraft.add({ name: `${food.name} (${portion})`, ...macros });
      // back past the search (or scanner) to the meal builder
      router.dismiss(Number(back) || 1);
      return;
    }
    logMeal({ name: `${food.name} (${portion})`, ...macros });
    router.dismissTo('/meals');
  };

  return (
    <Screen>
      {forMeal ? null : <LogDayNote />}
      <Card>
        <CardTitle>{food.name}</CardTitle>
        <Meta>
          {food.brand ? `${food.brand} · ` : ''}
          {Math.round(food.kcal100)} cal · {food.protein100}g protein
          {food.carbs100 !== undefined && food.fat100 !== undefined ? ` · ${food.carbs100}g carbs · ${food.fat100}g fat` : ''} per 100 g
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
          {macros.carbs !== undefined ? (
            <>
              <View style={{ flex: 1 }}>
                <Label>Carbs</Label>
                <Metric value={`${macros.carbs}`} unit="g" />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Fat</Label>
                <Metric value={`${macros.fat}`} unit="g" />
              </View>
            </>
          ) : null}
        </Row>
      </Card>

      <Btn label={forMeal ? 'Add to meal' : logDay.isToday ? 'Add to today' : `Add to ${logDay.label === 'Yesterday' ? 'yesterday' : logDay.label}`} icon="add" onPress={add} disabled={grams <= 0} />
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
