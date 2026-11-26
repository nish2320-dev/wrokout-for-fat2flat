import { useLocalSearchParams } from 'expo-router';

import { WorkoutBuilder } from '@/app/coach/workout';

/** Build (or edit, with ?edit=id) one of your own workouts to save and reuse. */
export default function BuildMyWorkout() {
  const { edit, copy } = useLocalSearchParams<{ edit?: string; copy?: string }>();
  return <WorkoutBuilder mine editId={edit} copy={copy} />;
}
