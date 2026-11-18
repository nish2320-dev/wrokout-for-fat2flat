import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/data/store';
import { startOfDay } from '@/data/stats';
import { C, S } from '@/theme';
import { Btn, Card, CardTitle, Empty, Label, Meta, Name, Row, Screen, Title } from '@/ui/kit';
import { MacrosCard } from '@/ui/MacrosCard';
import { MealPlanCard } from '@/ui/MealPlanCard';
import { useLogMeal } from '@/ui/useLogMeal';

export default function MealsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, removeMeal } = useStore();
  const logMeal = useLogMeal();

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const today = startOfDay(Date.now());
  const todaysMeals = state.meals.filter((m) => startOfDay(m.at) === today);
  const earlier = state.meals.filter((m) => startOfDay(m.at) !== today).slice(0, 10);

  const valid = name.trim() !== '' && calories !== '';
  // say what's missing rather than leaving a grey button to puzzle over
  const missing =
    name.trim() === '' && calories === ''
      ? 'Enter what you ate and its calories to add it.'
      : name.trim() === ''
        ? 'Enter what you ate to add it.'
        : calories === ''
          ? 'Enter the calories to add it.'
          : null;

  const submit = () => {
    if (!valid) return;
    logMeal({
      name: name.trim(),
      calories: Math.round(parseFloat(calories) || 0),
      protein: Math.round(parseFloat(protein) || 0),
      // count carbs and fat once either is entered (the other as 0)
      ...(carbs !== '' || fat !== '' ? { carbs: Math.round(parseFloat(carbs) || 0), fat: Math.round(parseFloat(fat) || 0) } : {}),
    });
    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    Keyboard.dismiss();
  };

  return (
    <Screen>
      <View style={{ height: insets.top }} />
      <Title>Meals</Title>

      <MacrosCard />

      <MealPlanCard />

      <Card>
        <CardTitle>Log a meal</CardTitle>
        <View style={s.pair}>
          <Btn label="Photo" icon="camera-outline" onPress={() => router.push('/meals/photo')} style={{ flex: 1 }} />
          <Btn label="Scan" icon="barcode-outline" ghost onPress={() => router.push('/meals/scan')} style={{ flex: 1 }} />
          <Btn label="Search" icon="search" ghost onPress={() => router.push('/meals/search')} style={{ flex: 1 }} />
        </View>
        <Meta style={{ marginTop: 12 }}>Or enter it yourself:</Meta>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="What did you eat?"
          placeholderTextColor={C.muted}
          style={[s.input, { marginTop: 6 }]}
          returnKeyType="next"
        />
        <View style={s.pair}>
          <TextInput
            value={calories}
            onChangeText={(t) => setCalories(t.replace(/[^0-9]/g, ''))}
            placeholder="Calories"
            placeholderTextColor={C.muted}
            keyboardType="number-pad"
            style={[s.input, { flex: 1 }]}
          />
          <TextInput
            value={protein}
            onChangeText={(t) => setProtein(t.replace(/[^0-9]/g, ''))}
            placeholder="Protein (g)"
            placeholderTextColor={C.muted}
            keyboardType="number-pad"
            style={[s.input, { flex: 1 }]}
          />
        </View>
        <View style={s.pair}>
          <TextInput
            value={carbs}
            onChangeText={(t) => setCarbs(t.replace(/[^0-9]/g, ''))}
            placeholder="Carbs (g)"
            placeholderTextColor={C.muted}
            keyboardType="number-pad"
            style={[s.input, { flex: 1 }]}
          />
          <TextInput
            value={fat}
            onChangeText={(t) => setFat(t.replace(/[^0-9]/g, ''))}
            placeholder="Fat (g)"
            placeholderTextColor={C.muted}
            keyboardType="number-pad"
            style={[s.input, { flex: 1 }]}
          />
        </View>
        <Meta style={{ marginTop: 6 }}>Protein, carbs and fat are optional.</Meta>
        <Btn label="Add meal" icon="add" onPress={submit} disabled={!valid} style={{ marginTop: 10 }} />
        {missing ? <Meta style={{ textAlign: 'center', marginTop: 8 }}>{missing}</Meta> : null}
      </Card>

      <Card flush>
        <Row style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
          <CardTitle>Today</CardTitle>
          <Label>{todaysMeals.length} logged</Label>
        </Row>
        <View style={s.hair} />
        {todaysMeals.length === 0 ? (
          <Empty
            icon="restaurant-outline"
            title="Nothing logged today"
            body="Add a meal above and it'll count toward today's macros."
          />
        ) : (
          todaysMeals.map((m) => (
            <View key={m.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Name>{m.name}</Name>
                <Meta>
                  {new Date(m.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </Meta>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.kcal}>{m.calories} cal</Text>
                <Meta>
                  {m.protein}g P{m.carbs !== undefined ? ` · ${m.carbs}g C · ${m.fat ?? 0}g F` : ''}
                </Meta>
              </View>
              <Pressable
                onPress={() => removeMeal(m.id)}
                hitSlop={10}
                accessibilityLabel={`Remove ${m.name}`}>
                <Ionicons name="close" size={17} color={C.faint} />
              </Pressable>
            </View>
          ))
        )}
      </Card>

      {earlier.length > 0 ? (
        <Card flush>
          <Row style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
            <CardTitle>Earlier</CardTitle>
          </Row>
          <View style={s.hair} />
          {earlier.map((m) => (
            <View key={m.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Name>{m.name}</Name>
                <Meta>{new Date(m.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Meta>
              </View>
              <Text style={s.kcal}>{m.calories} cal</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  hair: { height: 1, backgroundColor: C.line },
  track: { height: 6, borderRadius: 4, backgroundColor: C.line2, overflow: 'hidden', marginVertical: 10 },
  fill: { height: '100%', borderRadius: 4, backgroundColor: C.red },

  input: {
    height: 44,
    borderRadius: 12,
    backgroundColor: C.wash,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    color: C.ink,
  },
  pair: { flexDirection: 'row', gap: S.gap, marginTop: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.line2,
  },
  kcal: { fontSize: 14, fontWeight: '800', letterSpacing: -0.3, color: C.ink },
});
