import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CloudProvider } from '@/cloud/CloudProvider';
import { planReminders } from '@/data/sharing';
import { StoreProvider, useStore } from '@/data/store';
import { HealthProvider } from '@/health/HealthProvider';
import { syncReminders } from '@/notify';
import { C } from '@/theme';

/** Keeps the Transformation reminders in step with the data: doing the thing cancels its reminder. */
function Reminders() {
  const { state, ready } = useStore();
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => syncReminders(state.profile.reminders === false ? [] : planReminders(state, Date.now())), 1500);
    return () => clearTimeout(t);
  }, [state, ready]);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <CloudProvider>
          <HealthProvider>
            <Reminders />
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: C.wash },
                headerShadowVisible: false,
                headerTintColor: C.red,
                headerTitleStyle: { color: C.ink, fontWeight: '800', fontSize: 17 },
                contentStyle: { backgroundColor: C.wash },
              }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="workout/active" options={{ title: 'Workout', headerBackTitle: 'Back' }} />
              <Stack.Screen name="workout/library" options={{ title: 'Exercises' }} />
              <Stack.Screen name="exercise/[id]" options={{ title: 'Exercise guide' }} />
              <Stack.Screen name="meals/search" options={{ title: 'Search food', headerBackTitle: 'Meals' }} />
              <Stack.Screen name="meals/scan" options={{ title: 'Scan barcode', headerBackTitle: 'Meals' }} />
              <Stack.Screen name="meals/portion" options={{ title: 'Add food' }} />
            <Stack.Screen name="meals/photo" options={{ title: 'Meal photo', headerBackTitle: 'Meals' }} />
              <Stack.Screen name="transform/index" options={{ title: 'Transformation', headerBackTitle: 'Back' }} />
              <Stack.Screen name="transform/setup" options={{ title: 'Set up your plan' }} />
              <Stack.Screen name="checkin" options={{ title: 'Weekly check-in' }} />
              <Stack.Screen name="photos" options={{ title: 'Before & after' }} />
              <Stack.Screen name="coach/join" options={{ title: 'Join my coach' }} />
              <Stack.Screen name="coach/index" options={{ title: 'My clients', headerBackTitle: 'Back' }} />
              <Stack.Screen name="coach/[id]" options={{ title: 'Client', headerBackTitle: 'Clients' }} />
              <Stack.Screen name="auth" options={{ headerShown: false, animation: 'none' }} />
            <Stack.Screen name="chat" options={{ title: 'Your coach', headerBackTitle: 'Back' }} />
            <Stack.Screen name="welcome" options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
            </Stack>
          </HealthProvider>
        </CloudProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
