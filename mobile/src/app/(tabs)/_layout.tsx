import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { C } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const tab = (title: string, icon: IconName, active: IconName) => ({
  title,
  tabBarIcon: ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Ionicons name={focused ? active : icon} size={size} color={color} />
  ),
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.red,
        tabBarInactiveTintColor: C.faint,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: C.line },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={tab('Home', 'home-outline', 'home')} />
      <Tabs.Screen name="workouts" options={tab('Workouts', 'barbell-outline', 'barbell')} />
      <Tabs.Screen name="meals" options={tab('Meals', 'restaurant-outline', 'restaurant')} />
      <Tabs.Screen name="progress" options={tab('Progress', 'stats-chart-outline', 'stats-chart')} />
      <Tabs.Screen name="profile" options={tab('Profile', 'person-outline', 'person')} />
    </Tabs>
  );
}
