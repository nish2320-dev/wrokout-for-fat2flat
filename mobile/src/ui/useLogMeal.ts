import { Alert } from 'react-native';

import { crossingWarning, dayTotals, goalsFor } from '@/data/macros';
import { useStore } from '@/data/store';
import type { Meal } from '@/data/types';

/** Logs a meal and, if it pushes today's calories, carbs or fat over the goal, says so. */
export function useLogMeal() {
  const { state, addMeal } = useStore();
  return (meal: Omit<Meal, 'id' | 'at'>) => {
    const now = Date.now();
    const before = dayTotals(state.meals, now);
    const after = {
      calories: before.calories + meal.calories,
      protein: before.protein + meal.protein,
      carbs: before.carbs + (meal.carbs ?? 0),
      fat: before.fat + (meal.fat ?? 0),
    };
    addMeal(meal);
    const warning = crossingWarning(before, after, goalsFor(state.profile));
    if (warning) setTimeout(() => Alert.alert('Over your goal', warning), 400);
  };
}
