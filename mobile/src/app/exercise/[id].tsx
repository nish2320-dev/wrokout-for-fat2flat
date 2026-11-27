import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, View } from 'react-native';

import { useCloud } from '@/cloud/CloudProvider';
import { errorText } from '@/cloud/supabase';

import { byId, equipmentLabel, muscleLabel, STRENGTH_GROUPS } from '@/data/exercises';
import { personalRecords } from '@/data/stats';
import { useActiveWorkout, useStore } from '@/data/store';
import { fmtWeight } from '@/data/units';
import { C } from '@/theme';
import { Btn, Card, CardTitle, Empty, Label, Row, Screen, Tag } from '@/ui/kit';

export default function ExerciseGuide() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, addExercise } = useStore();
  const active = useActiveWorkout();
  const exercise = byId(id);

  if (!exercise) {
    return (
      <Screen>
        <Empty icon="alert-circle-outline" title="Exercise not found" body="It may have been removed." />
      </Screen>
    );
  }

  // a heaviest-set record only means something for weights
  const pr = exercise.kind ? undefined : personalRecords(state).find((p) => p.exerciseId === exercise.id && p.weight > 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: exercise.name }} />

      <Card>
        <CardTitle>{exercise.name}</CardTitle>
        <Row style={{ justifyContent: 'flex-start', gap: 6, marginTop: 9 }}>
          <Tag label={muscleLabel(exercise.muscle)} />
          <Tag tone="grey" label={equipmentLabel(exercise.equipment)} />
          <Tag
            tone="grey"
            label={exercise.kind === 'hold' ? 'Timed hold' : exercise.kind === 'cardio' ? 'Logged in minutes' : STRENGTH_GROUPS.includes(exercise.muscle) ? (exercise.compound ? 'Compound' : 'Isolation') : 'Reps'}
          />
        </Row>
      </Card>

      {pr ? (
        <Card>
          <Row>
            <View>
              <Label>Your best set</Label>
              <Text style={s.pr}>
                {pr.reps} × {fmtWeight(pr.weight)} {state.profile.units}
              </Text>
            </View>
            <Ionicons name="trophy" size={22} color={C.red} />
          </Row>
        </Card>
      ) : null}

      <Card>
        <CardTitle>How to do it</CardTitle>
        <View style={{ gap: 11, marginTop: 11 }}>
          {exercise.cues.map((cue, i) => (
            <View key={i} style={s.cue}>
              <View style={s.bullet}>
                <Text style={s.bulletText}>{i + 1}</Text>
              </View>
              <Text style={s.cueText}>{cue}</Text>
            </View>
          ))}
        </View>
      </Card>

      <VideoCard exerciseId={exercise.id} name={exercise.name} isYoga={exercise.muscle === 'yoga'} />

      {active ? (
        <Btn
          label={`Add to ${active.name}`}
          icon="add"
          onPress={() => {
            addExercise(exercise.id);
            router.dismissTo('/workout/active');
          }}
        />
      ) : null}
    </Screen>
  );
}

/**
 * Videos for an exercise: the coach's own demo when there is one (their
 * clients see it; the coach can add, replace or remove it), and a YouTube
 * search for everyone.
 */
function VideoCard({ exerciseId, name, isYoga }: { exerciseId: string; name: string; isYoga: boolean }) {
  const cloud = useCloud();
  const [busy, setBusy] = useState<'open' | 'upload' | null>(null);
  const path = cloud.videos[exerciseId];
  const isCoach = !!cloud.coach;
  const coachName = cloud.membership?.coachName;

  const watch = async () => {
    if (!path) return;
    setBusy('open');
    try {
      await WebBrowser.openBrowserAsync(await cloud.videoUrl(path));
    } catch (e) {
      Alert.alert('Could not play the video', errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const youtube = () =>
    Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(isYoga ? `how to do ${name} yoga pose` : `how to do ${name} proper form`)}`);

  const upload = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true, // lets the coach trim it
      videoMaxDuration: 60,
      videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720, // plays everywhere, small enough to upload
    });
    if (res.canceled || !res.assets[0]) return;
    setBusy('upload');
    try {
      await cloud.uploadVideo(exerciseId, res.assets[0].uri);
      Alert.alert('Video added', 'Your clients will see it on this exercise.');
    } catch (e) {
      Alert.alert('Could not upload the video', errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = () =>
    Alert.alert('Remove your video?', 'Your clients will see the YouTube option instead.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => cloud.removeVideo(exerciseId).catch((e) => Alert.alert('Could not remove', errorText(e))) },
    ]);

  return (
    <Card style={{ gap: 9 }}>
      <CardTitle>Watch how</CardTitle>
      {path ? (
        <Btn label={busy === 'open' ? 'Opening…' : isCoach ? 'Watch your video' : `Watch ${coachName ?? 'your coach'} demo it`} icon="play-circle" onPress={watch} disabled={!!busy} />
      ) : null}
      <Btn label="Watch on YouTube" icon="logo-youtube" ghost onPress={youtube} />
      {isCoach ? (
        busy === 'upload' ? (
          <Row style={{ justifyContent: 'flex-start', gap: 10 }}>
            <ActivityIndicator color={C.red} />
            <Text style={s.cueText}>Uploading your video…</Text>
          </Row>
        ) : (
          <>
            <Btn label={path ? 'Replace your video' : 'Add your own video'} icon="videocam-outline" ghost onPress={upload} />
            {path ? <Btn label="Remove your video" icon="trash-outline" ghost onPress={remove} /> : null}
            <Text style={s.hint}>Film a 15–30 second demo with your phone camera first, then add it here. Your clients see your video instead of YouTube.</Text>
          </>
        )
      ) : null}
    </Card>
  );
}

const s = StyleSheet.create({
  hint: { fontSize: 12, lineHeight: 17, color: C.muted },
  pr: { fontSize: 22, fontWeight: '800', letterSpacing: -0.7, color: C.ink, marginTop: 3 },
  cue: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: C.redWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  bulletText: { fontSize: 11, fontWeight: '800', color: C.red },
  cueText: { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 20, color: C.ink2 },
});
