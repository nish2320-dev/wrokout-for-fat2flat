import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { fmtDate } from '@/data/stats';
import { useStore } from '@/data/store';
import { displayToCm, fmtLength, fmtWeight, lengthUnit } from '@/data/units';
import { deletePhotos, photoUri, savePhoto } from '@/photos';
import { C, S } from '@/theme';
import { Btn, Card, CardTitle, Label, Meta, Name, Row, Screen } from '@/ui/kit';

type Pose = 'front' | 'side';

const digits = (t: string) => t.replace(/[^0-9.]/g, '');
const num = (t: string) => {
  const n = parseFloat(t);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export default function CheckInScreen() {
  const router = useRouter();
  const { state, addCheckIn, addWeighIn, removeCheckIn } = useStore();
  const units = state.profile.units;
  const len = lengthUnit(units);

  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [chest, setChest] = useState('');
  const [photos, setPhotos] = useState<{ front?: string; side?: string }>({});
  const [busy, setBusy] = useState(false);

  // photos are copied in as soon as they're picked; if the check-in is
  // abandoned, clean them up so they don't sit on the phone unused
  const saved = useRef(false);
  const pending = useRef(photos);
  useEffect(() => {
    pending.current = photos;
  }, [photos]);
  useEffect(
    () => () => {
      if (!saved.current) deletePhotos([pending.current.front, pending.current.side]);
    },
    [],
  );

  const last = state.checkIns[state.checkIns.length - 1];

  const keep = async (pose: Pose, result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets[0]) return;
    setBusy(true);
    try {
      const name = await savePhoto(result.assets[0].uri, pose);
      setPhotos((p) => {
        deletePhotos([p[pose]]);
        return { ...p, [pose]: name };
      });
    } catch {
      Alert.alert('Couldn’t save that photo', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const fromCamera = async (pose: Pose) => {
    // the system prompt asks for access the first time; no pre-prompt of our own
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Camera access is off',
        'Turn on camera access for Fat2Flat Fitness in Settings to take progress photos, or choose one from your library.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    keep(pose, await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [3, 4] }));
  };

  // the iOS photo picker runs outside the app and needs no permission
  const fromLibrary = async (pose: Pose) =>
    keep(pose, await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [3, 4] }));

  const choose = (pose: Pose) =>
    Alert.alert(pose === 'front' ? 'Front photo' : 'Side photo', 'Same spot, same light, same time of day makes the best comparison.', [
      { text: 'Take photo', onPress: () => fromCamera(pose) },
      { text: 'Choose from library', onPress: () => fromLibrary(pose) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const w = num(weight);
  const m = { waist: num(waist), hips: num(hips), chest: num(chest) };
  const hasAnything = w !== undefined || Object.values(m).some((v) => v !== undefined) || photos.front || photos.side;

  const save = () => {
    if (!hasAnything) return;
    if (w !== undefined) addWeighIn(w);
    addCheckIn({
      waist: m.waist !== undefined ? displayToCm(m.waist, units) : undefined,
      hips: m.hips !== undefined ? displayToCm(m.hips, units) : undefined,
      chest: m.chest !== undefined ? displayToCm(m.chest, units) : undefined,
      photos,
    });
    saved.current = true;
    router.back();
  };

  const confirmDelete = (id: string) =>
    Alert.alert('Delete this check-in?', 'Its measurements and photos will be removed from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeCheckIn(id) },
    ]);

  return (
    <Screen>
      <Card>
        <CardTitle>Weight</CardTitle>
        <View style={s.pair}>
          <Field label={`Weight (${units})`} value={weight} onChange={setWeight} hint={last ? undefined : 'Same time each week, ideally first thing in the morning.'} />
        </View>
      </Card>

      <Card>
        <CardTitle>Measurements</CardTitle>
        <Meta>Measure at the same spots each week: waist at your belly button, hips at the widest point.</Meta>
        <View style={s.pair}>
          <Field label={`Waist (${len})`} value={waist} onChange={setWaist} />
          <Field label={`Hips (${len})`} value={hips} onChange={setHips} />
          <Field label={`Chest (${len})`} value={chest} onChange={setChest} />
        </View>
        {last?.waist !== undefined ? (
          <Meta style={{ marginTop: 8 }}>
            Last time ({fmtDate(last.at)}): waist {fmtLength(last.waist, units)} {len}
            {last.hips !== undefined ? ` · hips ${fmtLength(last.hips, units)}` : ''}
            {last.chest !== undefined ? ` · chest ${fmtLength(last.chest, units)}` : ''}
          </Meta>
        ) : null}
      </Card>

      <Card>
        <CardTitle>Progress photos</CardTitle>
        <Meta>Private: they stay on this phone unless you choose to share them with your coach.</Meta>
        <View style={s.photoRow}>
          {(['front', 'side'] as const).map((pose) => (
            <Pressable
              key={pose}
              onPress={() => choose(pose)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`${pose === 'front' ? 'Front' : 'Side'} photo`}
              style={s.photoSlot}>
              {photos[pose] ? (
                <Image source={{ uri: photoUri(photos[pose]!) }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={s.photoEmpty}>
                  <Ionicons name="camera-outline" size={24} color={C.faint} />
                  <Text style={s.photoLabel}>{pose === 'front' ? 'Front' : 'Side'}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </Card>

      <Btn label="Save check-in" icon="checkmark" onPress={save} disabled={!hasAnything || busy} />

      {state.checkIns.length > 0 ? (
        <Card flush>
          <Row style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
            <CardTitle>Past check-ins</CardTitle>
          </Row>
          {[...state.checkIns].reverse().map((c) => (
            <Pressable key={c.id} onLongPress={() => confirmDelete(c.id)} style={s.histRow} accessibilityHint="Long press to delete">
              <View style={{ flex: 1 }}>
                <Name>{fmtDate(c.at)}</Name>
                <Meta>
                  {[
                    c.waist !== undefined ? `waist ${fmtLength(c.waist, units)} ${len}` : null,
                    c.hips !== undefined ? `hips ${fmtLength(c.hips, units)}` : null,
                    c.chest !== undefined ? `chest ${fmtLength(c.chest, units)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Photos only'}
                </Meta>
              </View>
              {(['front', 'side'] as const).map((pose) =>
                c.photos[pose] ? (
                  <Image key={pose} source={{ uri: photoUri(c.photos[pose]!) }} style={s.thumb} contentFit="cover" />
                ) : null,
              )}
            </Pressable>
          ))}
          <Meta style={{ paddingHorizontal: 14, paddingTop: 8 }}>Long-press a check-in to delete it.</Meta>
        </Card>
      ) : null}

      {state.weighIns.length > 0 ? (
        <Meta style={{ textAlign: 'center' }}>
          Latest weigh-in: {fmtWeight(state.weighIns[state.weighIns.length - 1].weight)} {units}
        </Meta>
      ) : null}
    </Screen>
  );
}

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <View style={{ flex: 1, gap: 5 }}>
      <Label>{label}</Label>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(digits(t))}
        keyboardType="decimal-pad"
        placeholder="—"
        placeholderTextColor={C.faint}
        accessibilityLabel={label}
        style={s.input}
      />
      {hint ? <Meta>{hint}</Meta> : null}
    </View>
  );
}

const s = StyleSheet.create({
  pair: { flexDirection: 'row', gap: S.gap, marginTop: 10 },
  input: {
    height: 44,
    borderRadius: 12,
    backgroundColor: C.wash,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
  },
  photoRow: { flexDirection: 'row', gap: S.gap, marginTop: 10 },
  photoSlot: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: C.wash,
    borderWidth: 1,
    borderColor: C.line,
  },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoLabel: { fontSize: 12, fontWeight: '700', color: C.muted },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.line2,
  },
  thumb: { width: 36, height: 48, borderRadius: 7, backgroundColor: C.line2 },
});
