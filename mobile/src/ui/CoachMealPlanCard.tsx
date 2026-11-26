import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useCloud } from '@/cloud/CloudProvider';
import { loggedSlots, mealToLog, orderedMeals, planTotals, slotLabel } from '@/data/coachMealPlans';
import { macroLine, mealTotals } from '@/data/myMeals';
import { useStore } from '@/data/store';
import { C } from '@/theme';
import { Btn, Card, CardTitle, Meta, Row, Tag } from '@/ui/kit';
import { MealPlanCard } from '@/ui/MealPlanCard';
import { useLogMeal } from '@/ui/useLogMeal';

/** Today's meal plan: the coach's plan when they've sent one, otherwise the automatic plan. */
export function TodaysMealPlan() {
  const { coachMealPlan, membership } = useCloud();
  return coachMealPlan && membership ? <CoachMealPlanCard /> : <MealPlanCard />;
}

/** The meal plan the coach wrote: each meal with its foods and a one-tap Log. */
export function CoachMealPlanCard() {
  const { coachMealPlan: plan, membership } = useCloud();
  const { state } = useStore();
  const logMeal = useLogMeal();
  if (!plan || !membership) return null;
  const meals = orderedMeals(plan.meals);
  const done = loggedSlots(state.meals, plan.id, Date.now());
  const totals = planTotals(meals);

  return (
    <Card flush>
      <View style={{ paddingHorizontal: 14, paddingBottom: 10, gap: 4 }}>
        <Row>
          <CardTitle>{plan.name}</CardTitle>
          <Tag label={`From ${membership.coachName}`} />
        </Row>
        <Meta>{macroLine(totals)} for the day</Meta>
        {plan.note ? <Text style={s.note}>“{plan.note}”</Text> : null}
      </View>
      {meals.map((m) => {
        const t = mealTotals(m.items);
        const logged = done.has(m.slot);
        return (
          <View key={m.slot} style={s.meal}>
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.slot}>{slotLabel(m.slot).toUpperCase()}</Text>
                {m.items.map((it, i) => (
                  <Text key={i} style={s.item}>
                    {it.name}
                  </Text>
                ))}
                <Meta>{macroLine(t)}</Meta>
              </View>
              {logged ? (
                <View style={s.done}>
                  <Ionicons name="checkmark" size={13} color={C.green} />
                  <Text style={s.doneText}>Logged</Text>
                </View>
              ) : (
                <Btn label="Log" icon="add" onPress={() => logMeal(mealToLog(plan, m))} style={{ paddingHorizontal: 14 }} />
              )}
            </Row>
          </View>
        );
      })}
    </Card>
  );
}

const s = StyleSheet.create({
  note: { fontSize: 14, fontStyle: 'italic', color: C.ink2, lineHeight: 20, marginTop: 2 },
  meal: { paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.line2 },
  slot: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: C.muted },
  item: { fontSize: 15, fontWeight: '700', color: C.ink },
  done: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.greenWash, borderRadius: 14, paddingHorizontal: 10, height: 28 },
  doneText: { fontSize: 12, fontWeight: '800', color: C.green },
});
