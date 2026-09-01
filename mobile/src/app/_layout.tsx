import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StoreProvider } from '@/data/store';
import { C } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
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
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
