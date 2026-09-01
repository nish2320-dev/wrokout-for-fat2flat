import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/data/store';
import { finished, fmtVolume, personalRecords, volume } from '@/data/stats';
import { C, S } from '@/theme';
import { Card, CardTitle, Eyebrow, Label, Meta, Metric, Row, Screen, Title } from '@/ui/kit';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { state, updateProfile, resetAll } = useStore();
  const { profile } = state;

  const [name, setName] = useState(profile.name);
  const [calorieGoal, setCalorieGoal] = useState(String(profile.calorieGoal));
  const [proteinGoal, setProteinGoal] = useState(String(profile.proteinGoal));

  const done = finished(state);
  const totalVolume = done.reduce((n, w) => n + volume(w), 0);

  const commitGoal = (key: 'calorieGoal' | 'proteinGoal', raw: string, fallback: number) => {
    const n = parseInt(raw, 10);
    updateProfile({ [key]: Number.isNaN(n) || n <= 0 ? fallback : n });
  };

  const confirmReset = () =>
    Alert.alert(
      'Erase all data?',
      'Every workout, meal and weigh-in on this device will be deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Erase everything', style: 'destructive', onPress: resetAll },
      ],
    );

  return (
    <Screen>
      <View style={{ height: insets.top }} />
      <Title>Profile</Title>

      <View style={s.tiles}>
        <Card style={s.tile}>
          <Label>Workouts</Label>
          <Metric small value={`${done.length}`} />
        </Card>
        <Card style={s.tile}>
          <Label>Volume</Label>
          <Metric small value={fmtVolume(totalVolume)} />
        </Card>
        <Card style={s.tile}>
          <Label>PRs</Label>
          <Metric small value={`${personalRecords(state).length}`} />
        </Card>
      </View>

      <Card>
        <CardTitle>Your name</CardTitle>
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={() => updateProfile({ name: name.trim() })}
          placeholder="What should we call you?"
          placeholderTextColor={C.muted}
          style={[s.input, { marginTop: 10 }]}
          returnKeyType="done"
        />
        <Meta>Used for the greeting on your home screen.</Meta>
      </Card>

      <Card>
        <CardTitle>Daily goals</CardTitle>
        <View style={s.pair}>
          <View style={{ flex: 1, gap: 6 }}>
            <Eyebrow>Calories</Eyebrow>
            <TextInput
              value={calorieGoal}
              onChangeText={(t) => setCalorieGoal(t.replace(/[^0-9]/g, ''))}
              onBlur={() => commitGoal('calorieGoal', calorieGoal, profile.calorieGoal)}
              keyboardType="number-pad"
              style={s.input}
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Eyebrow>Protein (g)</Eyebrow>
            <TextInput
              value={proteinGoal}
              onChangeText={(t) => setProteinGoal(t.replace(/[^0-9]/g, ''))}
              onBlur={() => commitGoal('proteinGoal', proteinGoal, profile.proteinGoal)}
              keyboardType="number-pad"
              style={s.input}
            />
          </View>
        </View>
      </Card>

      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <CardTitle>Units</CardTitle>
            <Meta>Applies to weights and volume everywhere.</Meta>
          </View>
          <View style={s.seg}>
            {(['lb', 'kg'] as const).map((u) => (
              <Pressable
                key={u}
                onPress={() => updateProfile({ units: u })}
                style={[s.segItem, profile.units === u && s.segOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: profile.units === u }}>
                <Text style={[s.segText, profile.units === u && s.segTextOn]}>{u}</Text>
              </Pressable>
            ))}
          </View>
        </Row>
      </Card>

      <Card>
        <CardTitle>Your data</CardTitle>
        <Meta>
          Everything stays on this iPhone. Nothing is uploaded, and there is no account to sign into.
        </Meta>
        <Pressable onPress={confirmReset} style={s.danger} accessibilityRole="button">
          <Ionicons name="trash-outline" size={17} color={C.red} />
          <Text style={s.dangerText}>Erase all data</Text>
        </Pressable>
      </Card>

      <Meta>Fat2Flat Fitness</Meta>
    </Screen>
  );
}

const s = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: S.gap },
  tile: { flex: 1, padding: 11, gap: 3 },

  input: {
    height: 44,
    borderRadius: 12,
    backgroundColor: C.wash,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    color: C.ink,
    marginBottom: 6,
  },
  pair: { flexDirection: 'row', gap: S.gap, marginTop: 10 },

  seg: { flexDirection: 'row', backgroundColor: C.line2, borderRadius: 10, padding: 3, gap: 3 },
  segItem: { paddingHorizontal: 14, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.red },
  segText: { fontSize: 13, fontWeight: '700', color: C.ink2 },
  segTextOn: { color: '#fff' },

  danger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.redWash,
    backgroundColor: C.redWash,
    marginTop: 12,
  },
  dangerText: { fontSize: 14, fontWeight: '800', color: C.red },
});
