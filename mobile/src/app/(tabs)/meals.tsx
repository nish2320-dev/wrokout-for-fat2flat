import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/data/store';
import { startOfDay, todayMacros } from '@/data/stats';
import { C, S } from '@/theme';
import { Btn, Card, CardTitle, Empty, Label, Meta, Metric, Name, Row, Screen, Title } from '@/ui/kit';

export default function MealsScreen() {
  const insets = useSafeAreaInsets();
  const { state, addMeal, removeMeal } = useStore();

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');

  const macros = todayMacros(state);
  const today = startOfDay(Date.now());
  const todaysMeals = state.meals.filter((m) => startOfDay(m.at) === today);
  const earlier = state.meals.filter((m) => startOfDay(m.at) !== today).slice(0, 10);

  const valid = name.trim() !== '' && calories !== '';

  const submit = () => {
    if (!valid) return;
    addMeal({
      name: name.trim(),
      calories: Math.round(parseFloat(calories) || 0),
      protein: Math.round(parseFloat(protein) || 0),
    });
    setName('');
    setCalories('');
    setProtein('');
  };

  return (
    <Screen>
      <View style={{ height: insets.top }} />
      <Title>Meals</Title>

      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <Label>Calories today</Label>
            <View style={{ marginTop: 3 }}>
              <Metric value={`${macros.calories}`} unit={`/ ${state.profile.calorieGoal}`} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Label>Protein</Label>
            <View style={{ marginTop: 3 }}>
              <Metric value={`${macros.protein}`} unit={`/ ${state.profile.proteinGoal}g`} />
            </View>
          </View>
        </Row>
        <View style={s.track}>
          <View
            style={[
              s.fill,
              { width: `${Math.min(100, (macros.calories / state.profile.calorieGoal) * 100)}%` },
            ]}
          />
        </View>
        <Meta>
          {Math.max(0, state.profile.calorieGoal - macros.calories)} calories left today
        </Meta>
      </Card>

      <Card>
        <CardTitle>Log a meal</CardTitle>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="What did you eat?"
          placeholderTextColor={C.muted}
          style={[s.input, { marginTop: 10 }]}
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
        <Btn label="Add meal" icon="add" onPress={submit} disabled={!valid} style={{ marginTop: 10 }} />
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
            body="Add a meal above and it'll count toward your calorie and protein goals."
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
                <Meta>{m.protein}g protein</Meta>
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
