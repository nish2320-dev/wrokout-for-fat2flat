import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useCloud, type MealGuessItem } from '@/cloud/CloudProvider';
import { errorText } from '@/cloud/supabase';
import { useStore } from '@/data/store';
import { C, S } from '@/theme';
import { Btn, Card, CardTitle, Label, Meta, Metric, Row, Screen } from '@/ui/kit';

type Phase = { step: 'pick' } | { step: 'reading'; uri: string } | { step: 'result'; uri: string; confidence: string; note: string };

/** Shrinks a photo to 1024 px on the long side: plenty for the AI, quick to upload. */
async function prepare(uri: string): Promise<string> {
  // loaded on first use, so the app never touches it at launch
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
  const ctx = ImageManipulator.manipulate(uri).resize({ width: 1024 });
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!out.base64) throw new Error('Couldn’t prepare that photo.');
  return out.base64;
}

/** Photograph a meal, get an editable calorie and protein estimate, log it. */
export default function MealPhoto() {
  const router = useRouter();
  const cloud = useCloud();
  const { state, addMeal } = useStore();
  const [phase, setPhase] = useState<Phase>({ step: 'pick' });
  const [items, setItems] = useState<MealGuessItem[]>([]);
  const [name, setName] = useState('');

  if (!cloud.enabled) {
    return (
      <Screen>
        <Card>
          <CardTitle>Coming soon</CardTitle>
          <Meta>Meal photos aren’t switched on in this version of the app yet.</Meta>
        </Card>
      </Screen>
    );
  }

  const analyse = async (uri: string) => {
    setPhase({ step: 'reading', uri });
    try {
      const guess = await cloud.analyzeMeal(await prepare(uri), state.profile.diet);
      setItems(guess.items);
      setName(guess.items.map((i) => i.name).slice(0, 3).join(', ').slice(0, 60));
      setPhase({ step: 'result', uri, confidence: guess.confidence, note: guess.note });
    } catch (e) {
      setPhase({ step: 'pick' });
      Alert.alert('Couldn’t read that photo', errorText(e));
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access is off', 'Turn on camera access for Fat2Flat in Settings to photograph meals, or choose a photo instead.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) analyse(res.assets[0].uri);
  };

  const choosePhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) analyse(res.assets[0].uri);
  };

  const update = (i: number, patch: Partial<MealGuessItem>) => setItems((cur) => cur.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  const total = items.reduce((a, i) => ({ calories: a.calories + (i.calories || 0), protein: a.protein + (i.protein || 0) }), { calories: 0, protein: 0 });

  const log = () => {
    addMeal({ name: name.trim() || 'Meal (photo)', calories: Math.round(total.calories), protein: Math.round(total.protein) });
    router.back();
  };

  if (phase.step === 'pick') {
    return (
      <Screen>
        <Card>
          <View style={s.hero}>
            <Ionicons name="camera" size={34} color={C.red} />
          </View>
          <CardTitle>Snap your meal</CardTitle>
          <Meta>Take a photo from above with the whole plate in view. You’ll get an estimate of the calories and protein that you can adjust before logging.</Meta>
          <Btn label="Take a photo" icon="camera" onPress={takePhoto} style={{ marginTop: 14 }} />
          <Btn label="Choose from library" icon="images-outline" ghost onPress={choosePhoto} style={{ marginTop: 9 }} />
        </Card>
        <Meta style={{ textAlign: 'center', paddingHorizontal: 12 }}>
          The photo is sent securely to our server and to Anthropic (the company behind Claude) to make the estimate. It isn’t stored or used for anything else.
        </Meta>
      </Screen>
    );
  }

  return (
    <Screen>
      <Image source={{ uri: phase.uri }} style={s.photo} contentFit="cover" />
      {phase.step === 'reading' ? (
        <Card>
          <Row style={{ justifyContent: 'flex-start', gap: 12 }}>
            <ActivityIndicator color={C.red} />
            <Text style={s.reading}>Looking at your meal…</Text>
          </Row>
        </Card>
      ) : (
        <>
          <Card>
            <Row>
              <View style={{ flex: 1 }}>
                <Label>Calories</Label>
                <Metric value={Math.round(total.calories).toLocaleString()} />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Protein</Label>
                <Metric value={`${Math.round(total.protein)}`} unit="g" />
              </View>
            </Row>
            <Meta style={{ marginTop: 6, color: phase.confidence === 'low' ? C.red : C.muted }}>
              {phase.confidence === 'low' ? 'Rough estimate: check the amounts. ' : 'AI estimate: adjust anything that looks off. '}
              {phase.note}
            </Meta>
          </Card>

          <Card flush>
            {items.length === 0 ? (
              <Meta style={{ paddingHorizontal: 14 }}>No food found in that photo. Try another one, or log it by search.</Meta>
            ) : (
              items.map((it, i) => (
                <View key={i} style={[s.item, i > 0 && s.itemLine]}>
                  <Row>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemName}>{it.name}</Text>
                      <Meta>{it.portion}</Meta>
                    </View>
                    <Pressable onPress={() => setItems((cur) => cur.filter((_, k) => k !== i))} hitSlop={10} accessibilityLabel={`Remove ${it.name}`}>
                      <Ionicons name="close-circle" size={20} color={C.faint} />
                    </Pressable>
                  </Row>
                  <Row style={{ gap: S.gap, marginTop: 8 }}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Label>Calories</Label>
                      <TextInput
                        value={String(it.calories)}
                        onChangeText={(v) => update(i, { calories: parseInt(v.replace(/[^0-9]/g, ''), 10) || 0 })}
                        keyboardType="number-pad"
                        style={s.field}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Label>Protein (g)</Label>
                      <TextInput
                        value={String(it.protein)}
                        onChangeText={(v) => update(i, { protein: parseInt(v.replace(/[^0-9]/g, ''), 10) || 0 })}
                        keyboardType="number-pad"
                        style={s.field}
                      />
                    </View>
                  </Row>
                </View>
              ))
            )}
          </Card>

          <Card>
            <Label>Meal name</Label>
            <TextInput value={name} onChangeText={setName} placeholder="e.g. Chicken curry and rice" placeholderTextColor={C.faint} style={[s.field, { marginTop: 4 }]} maxLength={60} />
            <Btn label="Add to today" icon="add" onPress={log} disabled={items.length === 0} style={{ marginTop: 12 }} />
            <Btn label="Try another photo" icon="camera-outline" ghost onPress={() => setPhase({ step: 'pick' })} style={{ marginTop: 9 }} />
          </Card>
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { width: 64, height: 64, borderRadius: 18, backgroundColor: C.redWash, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: S.radius, backgroundColor: C.line2 },
  reading: { fontSize: 15, fontWeight: '700', color: C.ink },
  item: { paddingHorizontal: 14, paddingVertical: 12 },
  itemLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  itemName: { fontSize: 15, fontWeight: '800', color: C.ink },
  field: {
    height: 42,
    borderRadius: 11,
    backgroundColor: C.wash,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    color: C.ink,
  },
});
