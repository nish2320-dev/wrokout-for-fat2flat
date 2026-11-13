import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DEFAULT_WATER_GOAL, waterToday } from '@/data/extras';
import { useStore } from '@/data/store';
import { C } from '@/theme';
import { Card, CardTitle, Label, Row } from '@/ui/kit';

const BLUE = '#2F80ED';

/** Glasses of water today, one tap to add (Home). */
export function WaterCard() {
  const { state, addWater } = useStore();
  const goal = state.profile.waterGoal ?? DEFAULT_WATER_GOAL;
  const n = waterToday(state, Date.now());
  const amount = state.profile.units === 'lb' ? `${n * 8} oz` : `${(n * 0.25).toFixed(n % 4 === 0 ? 0 : 2).replace(/0$/, '')} L`;

  return (
    <Card>
      <Row>
        <View>
          <CardTitle>Water</CardTitle>
          <Label>
            {n} of {goal} glasses · {amount}
            {n >= goal ? ' · goal reached 🎉' : ''}
          </Label>
        </View>
        <Row style={{ gap: 8 }}>
          <Pressable onPress={() => addWater(-1)} disabled={n === 0} style={[s.round, n === 0 && { opacity: 0.35 }]} accessibilityLabel="Remove a glass">
            <Ionicons name="remove" size={18} color={C.ink2} />
          </Pressable>
          <Pressable onPress={() => addWater(1)} style={[s.round, s.add]} accessibilityLabel="Add a glass of water">
            <Ionicons name="add" size={18} color="#fff" />
          </Pressable>
        </Row>
      </Row>
      <View style={s.drops}>
        {Array.from({ length: Math.max(goal, n) }, (_, i) => (
          <Ionicons key={i} name={i < n ? 'water' : 'water-outline'} size={20} color={i < n ? BLUE : C.faint} />
        ))}
      </View>
      <Text style={s.hint}>One glass is 250 ml (8 oz).</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  round: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.line2, alignItems: 'center', justifyContent: 'center' },
  add: { backgroundColor: BLUE },
  drops: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  hint: { fontSize: 10, color: C.muted, marginTop: 6, fontWeight: '500' },
});
