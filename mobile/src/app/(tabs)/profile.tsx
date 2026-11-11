import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DIETS } from '@/data/mealplan';
import { useStore } from '@/data/store';
import { finished, fmtVolume, personalRecords, volume } from '@/data/stats';
import { C, S } from '@/theme';
import { CoachSettings } from '@/ui/CoachSettings';
import { Card, CardTitle, Eyebrow, Label, Meta, Metric, Row, Screen, Title } from '@/ui/kit';
import { useCloud } from '@/cloud/CloudProvider';
import { askNotifications } from '@/notify';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { state, updateProfile, resetAll, loadSample } = useStore();
  const { profile } = state;
  const cloud = useCloud();

  const [name, setName] = useState(profile.name);
  const [calorieGoal, setCalorieGoal] = useState(String(profile.calorieGoal));
  const [proteinGoal, setProteinGoal] = useState(String(profile.proteinGoal));

  // The fields hold their own text while typing; follow the saved profile
  // when it changes underneath them (erase, sample data), or they would keep
  // showing stale values and write them back on the next blur.
  useEffect(() => setName(profile.name), [profile.name]);
  useEffect(() => setCalorieGoal(String(profile.calorieGoal)), [profile.calorieGoal]);
  useEffect(() => setProteinGoal(String(profile.proteinGoal)), [profile.proteinGoal]);

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

  const confirmSample = () =>
    Alert.alert(
      'Load sample data?',
      'This replaces everything on this device with six weeks of example workouts, meals and weigh-ins, for taking screenshots. Use "Erase all data" afterwards to clear it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load sample data',
          style: 'destructive',
          onPress: loadSample,
        },
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
        <CardTitle>Food preference</CardTitle>
        <Meta>Used for your daily meal plan on the Meals tab.</Meta>
        <View style={s.dietRow}>
          {DIETS.map((d) => (
            <Pressable
              key={d.key}
              onPress={() => updateProfile({ diet: d.key })}
              style={[s.dietItem, profile.diet === d.key && s.segOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: profile.diet === d.key }}>
              <Text style={[s.segText, profile.diet === d.key && s.segTextOn]}>{d.label}</Text>
            </Pressable>
          ))}
        </View>
        <Meta>{DIETS.find((d) => d.key === profile.diet)?.detail ?? 'Veg includes eggs; Hindu Veg has no eggs.'}</Meta>
      </Card>

      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <CardTitle>Units</CardTitle>
            <Meta>Switching converts every weight you've logged.</Meta>
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

      {state.program ? (
        <Card>
          <Row>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <CardTitle>Reminders</CardTitle>
              <Meta>A nudge for your next workout, weekly check-in and weigh-ins.</Meta>
            </View>
            <Switch
              value={profile.reminders !== false}
              onValueChange={(on) => {
                updateProfile({ reminders: on });
                if (on) askNotifications();
              }}
              trackColor={{ true: C.red, false: C.line }}
            />
          </Row>
        </Card>
      ) : null}

      <CoachSettings />

      <Card>
        <CardTitle>Your data</CardTitle>
        <Meta>
          {cloud.membership
            ? `Everything is stored on this iPhone, and a copy of your progress is shared with ${cloud.membership.coachName}. Food lookups send only the barcode or search words to Open Food Facts.`
            : 'Everything stays on this iPhone. Food lookups send only the barcode or search words to Open Food Facts.'}
        </Meta>
        <Pressable onPress={confirmReset} style={s.danger} accessibilityRole="button">
          <Ionicons name="trash-outline" size={17} color={C.red} />
          <Text style={s.dangerText}>Erase all data</Text>
        </Pressable>
      </Card>

      {/* hidden on purpose: a long press loads demo data for App Store screenshots */}
      <Pressable onLongPress={confirmSample} delayLongPress={1500}>
        <Meta>Fat2Flat Fitness</Meta>
      </Pressable>
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

  dietRow: { flexDirection: 'row', gap: 6, marginTop: 10, marginBottom: 4 },
  dietItem: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
