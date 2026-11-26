import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { itemFromMeal, macroLine, mealTotals, recentMeals } from '@/data/myMeals';
import { useStore } from '@/data/store';
import type { Meal, MyMeal } from '@/data/types';
import { C } from '@/theme';
import { Btn, Card, CardTitle, Meta, Pill, Row } from '@/ui/kit';
import { useLogDay } from '@/ui/logDay';
import { useLogMeal } from '@/ui/useLogMeal';

/** One-tap logging: foods eaten recently, and meals the user saved. Logs to the day chosen on the Meals tab. */
export function QuickAddCard() {
  const router = useRouter();
  const { state, saveMyMeal } = useStore();
  const logMeal = useLogMeal();
  const { isToday, label } = useLogDay();
  const myMeals = state.myMeals ?? [];
  const [tab, setTab] = useState<'recent' | 'mine'>(myMeals.length ? 'mine' : 'recent');
  const recent = recentMeals(state.meals, Date.now(), 10);
  const where = isToday ? 'today' : label === 'Yesterday' ? 'yesterday' : label;

  const logRecent = (m: Meal) => {
    logMeal({ name: m.name, calories: m.calories, protein: m.protein, ...(m.carbs !== undefined ? { carbs: m.carbs, fat: m.fat ?? 0 } : {}) });
  };
  const logMine = (m: MyMeal) => logMeal({ name: m.name, ...mealTotals(m.items) });
  const saveRecent = (m: Meal) => {
    if (myMeals.some((x) => x.name.toLowerCase() === m.name.toLowerCase())) return Alert.alert('Already saved', `“${m.name}” is in My meals.`);
    saveMyMeal({ name: m.name, items: [itemFromMeal(m)] });
    Alert.alert('Saved to My meals', `Log “${m.name}” any time from My meals.`);
  };

  return (
    <Card style={{ gap: 10 }}>
      <Row>
        <CardTitle>Quick add</CardTitle>
        <Meta>Adds to {where}</Meta>
      </Row>
      <Row style={{ justifyContent: 'flex-start', gap: 7 }}>
        <Pill label="Recent" on={tab === 'recent'} onPress={() => setTab('recent')} />
        <Pill label={`My meals${myMeals.length ? ` (${myMeals.length})` : ''}`} on={tab === 'mine'} onPress={() => setTab('mine')} />
      </Row>

      {tab === 'recent' ? (
        recent.length === 0 ? (
          <Meta>Foods you log show up here, so you can add them again with one tap.</Meta>
        ) : (
          recent.map((m, i) => (
            <View key={m.id} style={[s.row, i > 0 && s.line]}>
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={1}>
                  {m.name}
                </Text>
                <Meta>{macroLine(m)}</Meta>
              </View>
              <Pressable onPress={() => saveRecent(m)} hitSlop={8} accessibilityLabel={`Save ${m.name} to My meals`}>
                <Ionicons name="bookmark-outline" size={18} color={C.muted} />
              </Pressable>
              <Pressable onPress={() => logRecent(m)} hitSlop={8} style={s.add} accessibilityLabel={`Add ${m.name}`}>
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
            </View>
          ))
        )
      ) : (
        <>
          {myMeals.length === 0 ? (
            <Meta>Build a meal from several foods, like your usual breakfast, and log the whole thing in one tap.</Meta>
          ) : (
            myMeals.map((m, i) => (
              <View key={m.id} style={[s.row, i > 0 && s.line]}>
                <Pressable onPress={() => router.push({ pathname: '/meals/create', params: { edit: m.id } })} style={{ flex: 1 }} accessibilityHint="Edit this meal">
                  <Text style={s.name} numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Meta>
                    {m.items.length} food{m.items.length === 1 ? '' : 's'} · {macroLine(mealTotals(m.items))}
                  </Meta>
                </Pressable>
                <Pressable onPress={() => router.push({ pathname: '/meals/create', params: { edit: m.id } })} hitSlop={8} accessibilityLabel={`Edit ${m.name}`}>
                  <Ionicons name="create-outline" size={18} color={C.muted} />
                </Pressable>
                <Pressable onPress={() => logMine(m)} hitSlop={8} style={s.add} accessibilityLabel={`Add ${m.name}`}>
                  <Ionicons name="add" size={20} color="#fff" />
                </Pressable>
              </View>
            ))
          )}
          <Btn label="Create a meal" icon="add" ghost onPress={() => router.push('/meals/create')} />
        </>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, paddingTop: 10 },
  name: { fontSize: 15, fontWeight: '700', color: C.ink },
  add: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
});
