import { Alert } from 'react-native';

import { crossingWarning, dayTotals, goalsFor } from '@/data/macros';
import { useStore } from '@/data/store';
import type { Meal } from '@/data/types';
import { stampFor, useLogDay } from '@/ui/logDay';

/**
 * Logs a meal on the day chosen on the Meals tab (today unless the user went
 * back) and, if it pushes that day's calories, carbs or fat over the goal, says so.
 */
export function useLogMeal() {
  const { state, addMeal } = useStore();
  const { day, isToday, label } = useLogDay();
  return (meal: Omit<Meal, 'id' | 'at'>) => {
    const at = stampFor(day, Date.now());
    const before = dayTotals(state.meals, at);
    const after = {
      calories: before.calories + meal.calories,
      protein: before.protein + meal.protein,
      carbs: before.carbs + (meal.carbs ?? 0),
      fat: before.fat + (meal.fat ?? 0),
    };
    addMeal({ ...meal, at });
    const warning = crossingWarning(before, after, goalsFor(state.profile), isToday ? 'today’s' : label === 'Yesterday' ? 'yesterday’s' : 'that day’s');
    if (warning) setTimeout(() => Alert.alert('Over your goal', warning), 400);
  };
}
