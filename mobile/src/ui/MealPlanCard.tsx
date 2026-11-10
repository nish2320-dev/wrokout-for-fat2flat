import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DIETS, dayTarget, loggedName, planDay, portionLabel, Slot } from '@/data/mealplan';
import { nextSession } from '@/data/program';
import { startOfDay } from '@/data/stats';
import { useActiveWorkout, useStore } from '@/data/store';
import { C } from '@/theme';
import { Card, CardTitle, Label, Meta, Name, Pill, Row } from '@/ui/kit';

const dateKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Today's meal plan: four meals sized to the calorie target, following the
 * user's diet and whether today is a workout day, with Swap and one-tap Log.
 */
export function MealPlanCard() {
  const { state, addMeal, updateProfile } = useStore();
  const active = useActiveWorkout();
  const now = Date.now();
  const today = startOfDay(now);
  const diet = state.profile.diet;

  // a workout day if one is logged or running today, or the program has a session to do
  const workedOutToday = state.workouts.some((w) => startOfDay(w.finishedAt ?? w.startedAt) === today);
  const guess = workedOutToday || active !== null || nextSession(state, now) !== null;
  const [override, setOverride] = useState<boolean | null>(null);
  const workoutDay = override ?? guess;
  const [swaps, setSwaps] = useState<Partial<Record<Slot, number>>>({});

  if (!diet) {
    return (
      <Card>
        <CardTitle>Get a daily meal plan</CardTitle>
        <Meta>Meals sized to your calorie and protein targets, Indian and Western. Pick how you eat:</Meta>
        <View style={s.wrap}>
          {DIETS.map((d) => (
            <Pill key={d.key} label={d.label} onPress={() => updateProfile({ diet: d.key })} />
          ))}
        </View>
        <Meta style={{ marginTop: 6 }}>Veg includes eggs; Hindu Veg has no eggs. You can change this in Profile.</Meta>
      </Card>
    );
  }

  const target = dayTarget(state.profile.calorieGoal, state.program?.daysPerWeek ?? 3, workoutDay);
  const plan = planDay({ dateKey: dateKey(now), diet, calories: target, workoutDay, swaps });
  const todays = state.meals.filter((m) => startOfDay(m.at) === today);
  const isLogged = (name: string) => todays.some((m) => m.name === name);

  return (
    <Card flush>
      <View style={{ paddingHorizontal: 14, gap: 4 }}>
        <Row>
          <CardTitle>Today’s meal plan</CardTitle>
          <Label>{DIETS.find((d) => d.key === diet)?.label}</Label>
        </Row>
        <Meta>
          About {plan.kcal.toLocaleString()} cal · {plan.protein} g protein · your {workoutDay ? 'workout' : 'rest'}-day target is{' '}
          {target.toLocaleString()}
        </Meta>
        <View style={[s.wrap, { marginBottom: 10 }]}>
          <Pill label="Workout day" small on={workoutDay} onPress={() => setOverride(true)} />
          <Pill label="Rest day" small on={!workoutDay} onPress={() => setOverride(false)} />
        </View>
      </View>
      <View style={s.hair} />
      {plan.meals.map((m, i) => {
        const name = loggedName(m);
        const logged = isLogged(name);
        // the occasional extra snack on big days isn't swappable; it follows the others
        const extra = m.slot === 'snack' && i !== plan.meals.findIndex((x) => x.slot === 'snack');
        return (
          <View key={`${m.slot}-${i}`} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={[s.slot, m.label === 'Post-workout' && { color: C.red }]}>{m.label.toUpperCase()}</Text>
              <Name>{m.meal.name}</Name>
              <Meta>
                {m.portion === 1 ? m.meal.serving : `${portionLabel(m.portion)} of: ${m.meal.serving}`}
              </Meta>
              <Meta>
                {m.kcal} cal · {m.protein} g protein
              </Meta>
            </View>
            <View style={{ gap: 6, alignItems: 'flex-end' }}>
              <Pressable
                onPress={() => !logged && addMeal({ name, calories: m.kcal, protein: m.protein })}
                disabled={logged}
                accessibilityRole="button"
                accessibilityLabel={logged ? `${m.meal.name} logged` : `Log ${m.meal.name}`}
                style={[s.log, logged && s.logged]}>
                <Ionicons name={logged ? 'checkmark' : 'add'} size={14} color={logged ? C.green : '#fff'} />
                <Text style={[s.logText, logged && { color: C.green }]}>{logged ? 'Logged' : 'Log'}</Text>
              </Pressable>
              {!logged && !extra ? (
                <Pressable
                  onPress={() => setSwaps((cur) => ({ ...cur, [m.slot]: (cur[m.slot] ?? 0) + 1 }))}
                  accessibilityRole="button"
                  accessibilityLabel={`Swap ${m.label.toLowerCase()}`}
                  hitSlop={6}
                  style={s.swap}>
                  <Ionicons name="shuffle" size={13} color={C.ink2} />
                  <Text style={s.swapText}>Swap</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
      <Meta style={{ paddingHorizontal: 14, paddingTop: 8 }}>
        Calories are estimates for typical home recipes. Logged meals count toward today’s totals above.
      </Meta>
    </Card>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  hair: { height: 1, backgroundColor: C.line },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.line2,
  },
  slot: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: C.muted, marginBottom: 2 },
  log: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: C.red,
  },
  logged: { backgroundColor: C.greenWash },
  logText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  swap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: C.line2,
  },
  swapText: { color: C.ink2, fontSize: 11, fontWeight: '700' },
});
