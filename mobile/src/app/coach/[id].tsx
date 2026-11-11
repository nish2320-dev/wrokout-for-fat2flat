import { Image } from 'expo-image';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { clientNotes, getClient, hasSummary, photoUrls, removeClient, sendNote, type ClientDetail, type SentNote } from '@/cloud/coachApi';
import { useCloud } from '@/cloud/CloudProvider';
import { errorText } from '@/cloud/supabase';
import { flags, snapshotToState, suggestNote, timeAgo, type SharedSnapshot } from '@/data/sharing';
import { fmtDate, fmtVolume, setCount, volume } from '@/data/stats';
import { fmtLength, fmtWeight, lengthUnit } from '@/data/units';
import { C, S } from '@/theme';
import { Btn, Card, CardTitle, Label, Meta, Metric, Row, Screen, Tag, Trend } from '@/ui/kit';

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtWeight(Math.abs(Math.round(n * 10) / 10))}`;

/** One client: how their week is going, their numbers and photos, and a note to send. */
export default function ClientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const cloud = useCloud();
  const [client, setClient] = useState<ClientDetail | null | undefined>(undefined);
  const [notes, setNotes] = useState<SentNote[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const now = Date.now();

  const load = useCallback(async () => {
    try {
      const c = await getClient(id);
      setClient(c);
      if (!c) return;
      navigation.setOptions({ title: c.name });
      setNotes(await clientNotes(id));
      const snap = c.snapshot as SharedSnapshot;
      if (c.share_photos && snap.v === 1) {
        const withPhotos = snap.checkIns.filter((x) => x.photos.front || x.photos.side);
        const ends = [withPhotos[0], withPhotos[withPhotos.length - 1]].filter(Boolean);
        setPhotos(await photoUrls(id, ends.flatMap((x) => [x.photos.front, x.photos.side]).filter((n): n is string => !!n)));
      }
      if (hasSummary(c.summary)) setDraft((d) => d || suggestNote(c.name, c.summary as never, Date.now()));
    } catch (e) {
      Alert.alert('Could not load this client', errorText(e));
      setClient((c) => c ?? null);
    }
  }, [id, navigation]);

  useEffect(() => {
    load();
  }, [load]);

  if (client === undefined) return <ActivityIndicator color={C.red} style={{ marginTop: 40 }} />;
  if (client === null) {
    return (
      <Screen>
        <Card>
          <CardTitle>Client not found</CardTitle>
          <Meta>They may have stopped sharing with you.</Meta>
        </Card>
      </Screen>
    );
  }

  const summary = hasSummary(client.summary) ? client.summary : null;
  const st = snapshotToState(client.snapshot as SharedSnapshot);
  const units = st.profile.units;
  const recent = st.workouts.slice(0, 5);
  const weights = [...st.weighIns].sort((a, b) => a.at - b.at).slice(-20);
  const checkIns = [...st.checkIns].sort((a, b) => a.at - b.at);
  const latestCheckIn = checkIns[checkIns.length - 1];
  const withPhotos = checkIns.filter((x) => x.photos.front || x.photos.side);
  const firstPhoto = withPhotos[0];
  const lastPhoto = withPhotos.length > 1 ? withPhotos[withPhotos.length - 1] : undefined;
  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  const todaysMeals = st.meals.filter((m) => m.at >= todayStart).sort((a, b) => a.at - b.at);

  const send = async () => {
    if (!cloud.userId || !cloud.coach) return;
    setSending(true);
    try {
      await sendNote(cloud.userId, cloud.coach.name, client, draft);
      setDraft('');
      setNotes(await clientNotes(id));
      Alert.alert('Sent', `${client.name.split(' ')[0]} will see it in the app${client.push_token ? ' and get a notification' : ''}.`);
    } catch (e) {
      Alert.alert('Could not send', errorText(e));
    } finally {
      setSending(false);
    }
  };

  const confirmRemove = () =>
    Alert.alert(`Remove ${client.name}?`, 'They will stop sharing with you and disappear from your list. They keep all their data in their own app.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeClient(client.user_id);
            router.back();
          } catch (e) {
            Alert.alert('Could not remove', errorText(e));
          }
        },
      },
    ]);

  return (
    <Screen>
      <View style={{ gap: 6, paddingHorizontal: 2 }}>
        <Meta>
          Updated {timeAgo(client.updated_at, now)} · joined {fmtDate(new Date(client.joined_at).getTime())}
        </Meta>
        {summary ? (
          <View style={s.tags}>
            {flags(summary, now).map((f) => (
              <Tag key={f.key} label={f.label} tone={f.tone} />
            ))}
          </View>
        ) : (
          <Meta>Waiting for their phone to send its first update.</Meta>
        )}
      </View>

      <Card>
        <CardTitle>Send a note</CardTitle>
        <Meta>A suggestion based on their week. Edit it to make it yours.</Meta>
        <TextInput value={draft} onChangeText={setDraft} multiline placeholder="Write a note…" placeholderTextColor={C.faint} style={s.note} maxLength={1000} />
        <Row style={{ gap: S.gap }}>
          {summary ? (
            <Btn label="Suggest" icon="sparkles-outline" ghost onPress={() => setDraft(suggestNote(client.name, summary, Date.now()))} style={{ flex: 1 }} />
          ) : null}
          <Btn label={sending ? 'Sending…' : 'Send'} icon="send" onPress={send} disabled={!draft.trim() || sending} style={{ flex: 1 }} />
        </Row>
        {notes.length > 0 ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            <Label>Sent</Label>
            {notes.slice(0, 5).map((n) => (
              <View key={n.id} style={s.sent}>
                <Text style={s.sentBody}>{n.body}</Text>
                <Meta>
                  {timeAgo(n.created_at, now)} · {n.read_at ? 'Read' : 'Not read yet'}
                </Meta>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      {summary ? (
        <Card>
          <CardTitle>
            {summary.week !== null && summary.week <= 12 ? `Week ${summary.week} of 12` : 'This week'}
          </CardTitle>
          <Row style={{ marginTop: 10 }}>
            <Stat label="Workouts" value={summary.plannedThisWeek !== null ? `${summary.workoutsThisWeek}/${summary.plannedThisWeek}` : `${summary.workoutsThisWeek}`} />
            <Stat label="Last workout" value={summary.lastWorkoutAt ? timeAgo(summary.lastWorkoutAt, now).replace(' ago', '') : '—'} />
          </Row>
          {summary.nextWorkout ? <Meta style={{ marginTop: 6 }}>Up next: {summary.nextWorkout}</Meta> : null}
          {recent.length > 0 ? (
            <View style={{ marginTop: 10, gap: 6 }}>
              {recent.map((w) => (
                <Row key={w.id}>
                  <Text style={s.line}>{w.name}</Text>
                  <Meta>
                    {fmtDate(w.finishedAt!)} · {setCount(w)} sets · {fmtVolume(volume(w))} {units}
                  </Meta>
                </Row>
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      {summary && summary.weightNow !== null ? (
        <Card>
          <CardTitle>Weight</CardTitle>
          <Row style={{ marginTop: 10 }}>
            <Stat label="Now" value={fmtWeight(summary.weightNow)} unit={units} />
            <Stat label="Since start" value={summary.weightStart !== null ? signed(summary.weightNow - summary.weightStart) : '—'} unit={units} />
            <Stat label="Last 7 days" value={summary.weightChange7d !== null ? signed(summary.weightChange7d) : '—'} unit={units} />
          </Row>
          {weights.length >= 2 ? (
            <View style={{ marginTop: 8 }}>
              <Trend points={weights.map((w) => w.weight)} />
            </View>
          ) : null}
          {summary.weightGoal !== null ? <Meta>Goal: {fmtWeight(summary.weightGoal)} {units}</Meta> : null}
        </Card>
      ) : null}

      {summary ? (
        <Card>
          <CardTitle>Food</CardTitle>
          <Row style={{ marginTop: 10 }}>
            <Stat label="Today" value={summary.caloriesToday.toLocaleString()} unit={`/ ${summary.calorieGoal.toLocaleString()}`} />
            <Stat label="Protein today" value={`${summary.proteinToday}`} unit={`/ ${summary.proteinGoal} g`} />
          </Row>
          <Meta style={{ marginTop: 6 }}>
            {summary.daysLogged7d === 0
              ? 'No meals logged in the last 7 days.'
              : `7-day average: ${summary.avgCalories7d?.toLocaleString()} cal, ${summary.avgProtein7d} g protein (logged ${summary.daysLogged7d} of 7 days)`}
          </Meta>
          {todaysMeals.length > 0 ? (
            <View style={{ marginTop: 8, gap: 4 }}>
              {todaysMeals.map((m) => (
                <Row key={m.id}>
                  <Text style={s.line} numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Meta>
                    {m.calories} cal · {m.protein} g
                  </Meta>
                </Row>
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <CardTitle>Check-ins</CardTitle>
        {latestCheckIn ? (
          <>
            <Meta style={{ marginTop: 4 }}>
              Last one {fmtDate(latestCheckIn.at)} · {checkIns.length} total
            </Meta>
            <Row style={{ marginTop: 10 }}>
              {(['waist', 'hips', 'chest'] as const).map((k) => (
                <Stat
                  key={k}
                  label={k[0].toUpperCase() + k.slice(1)}
                  value={latestCheckIn[k] !== undefined ? fmtLength(latestCheckIn[k]!, units) : '—'}
                  unit={lengthUnit(units)}
                />
              ))}
            </Row>
            {summary?.waistStart != null && summary.waistNow != null && summary.waistStart !== summary.waistNow ? (
              <Meta style={{ marginTop: 6 }}>
                Waist {summary.waistNow < summary.waistStart ? 'down' : 'up'} {fmtLength(Math.abs(summary.waistStart - summary.waistNow), units)}{' '}
                {lengthUnit(units)} since their first check-in
              </Meta>
            ) : null}
          </>
        ) : (
          <Meta style={{ marginTop: 4 }}>No check-ins yet.</Meta>
        )}
        {!client.share_photos ? (
          <Meta style={{ marginTop: 8 }}>Progress photos: not shared.</Meta>
        ) : firstPhoto ? (
          <View style={{ marginTop: 10, gap: 6 }}>
            <Row style={{ gap: S.gap }}>
              <PhotoPair label={fmtDate(firstPhoto.at)} front={photos[firstPhoto.photos.front ?? '']} side={photos[firstPhoto.photos.side ?? '']} />
              {lastPhoto ? (
                <PhotoPair label={fmtDate(lastPhoto.at)} front={photos[lastPhoto.photos.front ?? '']} side={photos[lastPhoto.photos.side ?? '']} />
              ) : null}
            </Row>
            <Meta>{lastPhoto ? 'First and latest check-in photos.' : 'Their first check-in photos.'}</Meta>
          </View>
        ) : (
          <Meta style={{ marginTop: 8 }}>No progress photos yet.</Meta>
        )}
      </Card>

      <Pressable onPress={confirmRemove} style={{ alignSelf: 'center', padding: 8 }}>
        <Text style={s.remove}>Remove client</Text>
      </Pressable>
    </Screen>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Label>{label}</Label>
      <Metric small value={value} unit={unit} />
    </View>
  );
}

function PhotoPair({ label, front, side }: { label: string; front?: string; side?: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Label>{label}</Label>
      <Row style={{ gap: 4 }}>
        {[front, side].map((uri, i) =>
          uri ? <Image key={i} source={{ uri }} style={s.photo} contentFit="cover" /> : <View key={i} style={[s.photo, s.noPhoto]} />,
        )}
      </Row>
    </View>
  );
}

const s = StyleSheet.create({
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  note: {
    minHeight: 96,
    borderRadius: 12,
    backgroundColor: C.wash,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    fontSize: 15,
    lineHeight: 21,
    color: C.ink,
    marginVertical: 10,
    textAlignVertical: 'top',
  },
  sent: { backgroundColor: C.wash, borderRadius: 10, padding: 10, gap: 4 },
  sentBody: { fontSize: 13, color: C.ink, lineHeight: 18 },
  line: { fontSize: 13, fontWeight: '700', color: C.ink, flexShrink: 1, marginRight: 8 },
  photo: { flex: 1, aspectRatio: 3 / 4, borderRadius: 8, backgroundColor: C.line2 },
  noPhoto: { borderWidth: 1, borderColor: C.line, borderStyle: 'dashed' },
  remove: { fontSize: 13, fontWeight: '700', color: C.muted },
});
