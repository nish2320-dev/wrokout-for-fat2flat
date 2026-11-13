import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCloud } from '@/cloud/CloudProvider';
import { C } from '@/theme';
import { Meta } from '@/ui/kit';

/** Home: the way into the AI assistant. */
export function AskCard() {
  const router = useRouter();
  const cloud = useCloud();
  if (!cloud.enabled) return null;
  return (
    <Pressable onPress={() => router.push('/assistant')} style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      <View style={s.badge}>
        <Ionicons name="sparkles" size={17} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>Ask Fat2Flat</Text>
        <Meta>Questions about food, workouts or your plan? Ask the AI.</Meta>
      </View>
      <Ionicons name="chevron-forward" size={17} color={C.faint} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 13 },
  badge: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: C.ink },
});
