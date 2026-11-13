import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { hasSummary, listClients, unreadReplies, type ClientRow } from '@/cloud/coachApi';
import { useCloud } from '@/cloud/CloudProvider';
import { errorText } from '@/cloud/supabase';
import { attentionScore, flags, timeAgo as ago } from '@/data/sharing';
import { useStore } from '@/data/store';
import { C } from '@/theme';
import { Btn, Card, CardTitle, Empty, Label, Meta, Row, Screen, Tag } from '@/ui/kit';
import { SignInButton } from '@/ui/SignIn';

const APP_LINK = 'https://apps.apple.com/app/fat2flat-fitness/id6804222219';

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(Math.round(n * 10) / 10)}`;

/** The coach's home: their invite code and every client, the ones needing a nudge first. */
export default function CoachHome() {
  const router = useRouter();
  const cloud = useCloud();
  const { state } = useStore();
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [unread, setUnread] = useState<Set<string>>(new Set());
  const [name, setName] = useState(state.profile.name);
  const [busy, setBusy] = useState(false);
  const coachId = cloud.coach ? cloud.userId : null;

  const load = useCallback(async () => {
    if (!coachId) return;
    try {
      setClients(await listClients(coachId));
      setUnread(await unreadReplies(coachId).catch(() => new Set<string>()));
    } catch (e) {
      Alert.alert('Could not load clients', errorText(e));
      setClients((c) => c ?? []);
    }
  }, [coachId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!cloud.enabled) {
    return (
      <Screen>
        <Card>
          <CardTitle>Coming soon</CardTitle>
          <Meta>Coaching isn’t switched on in this version of the app yet.</Meta>
        </Card>
      </Screen>
    );
  }

  if (!cloud.userId) {
    return (
      <Screen>
        <Card>
          <CardTitle>Coach your clients</CardTitle>
          <Meta style={{ marginBottom: 12 }}>
            Sign in to get your coach code. Clients enter it in their app to share their workouts, weight, meals and check-ins with you.
          </Meta>
          <SignInButton />
        </Card>
      </Screen>
    );
  }

  if (!cloud.coach) {
    const create = async () => {
      setBusy(true);
      try {
        await cloud.becomeCoach(name.trim());
      } catch (e) {
        Alert.alert('Could not set up coaching', errorText(e));
      } finally {
        setBusy(false);
      }
    };
    return (
      <Screen>
        <Card>
          <CardTitle>Set up coaching</CardTitle>
          <Meta>Your clients will see this name on notes you send them.</Meta>
          <TextInput value={name} onChangeText={setName} placeholder="e.g. Coach Nish" placeholderTextColor={C.faint} style={s.input} maxLength={60} />
          <Btn label={busy ? 'Setting up…' : 'Get my coach code'} icon="key-outline" onPress={create} disabled={!name.trim() || busy} />
        </Card>
      </Screen>
    );
  }

  const code = cloud.coach.code;
  const invite = () =>
    Share.share({
      message: `Join me on Fat2Flat Fitness! 1) Download the app: ${APP_LINK} 2) Go to Profile → Join my coach 3) Enter my code: ${code}`,
    });

  const now = Date.now();
  const sorted = [...(clients ?? [])].sort((a, b) => {
    const sa = hasSummary(a.summary) ? attentionScore(a.summary, now) : 1000;
    const sb = hasSummary(b.summary) ? attentionScore(b.summary, now) : 1000;
    return sb - sa || a.name.localeCompare(b.name);
  });
  const needing = sorted.filter((c) => !hasSummary(c.summary) || flags(c.summary, now)[0].tone !== 'green').length;

  return (
    <Screen>
      <Card style={s.codeCard}>
        <Label style={{ color: 'rgba(255,255,255,0.65)' }}>YOUR COACH CODE</Label>
        <Text style={s.code} selectable>
          {code}
        </Text>
        <Meta style={{ color: 'rgba(255,255,255,0.65)' }}>Clients enter this in Profile → Join my coach.</Meta>
        <Btn label="Invite a client" icon="share-outline" onPress={invite} style={{ marginTop: 12 }} />
      </Card>

      <Row style={{ paddingHorizontal: 2 }}>
        <Text style={s.h2}>
          {clients === null ? 'Clients' : `${clients.length} client${clients.length === 1 ? '' : 's'}`}
          {clients && clients.length > 0 ? <Text style={s.h2sub}> · {needing} need{needing === 1 ? 's' : ''} attention</Text> : null}
        </Text>
        <Pressable onPress={load} hitSlop={10} accessibilityLabel="Refresh">
          <Ionicons name="refresh" size={20} color={C.red} />
        </Pressable>
      </Row>

      {clients === null ? (
        <ActivityIndicator color={C.red} style={{ marginTop: 20 }} />
      ) : clients.length === 0 ? (
        <Card>
          <Empty icon="people-outline" title="No clients yet" body="Tap “Invite a client” to send your code. They’ll appear here as soon as they join." />
        </Card>
      ) : (
        <Card flush>
          {sorted.map((c, i) => (
            <Pressable
              key={c.user_id}
              onPress={() => router.push({ pathname: '/coach/[id]', params: { id: c.user_id } })}
              style={({ pressed }) => [s.row, i > 0 && s.rowLine, pressed && { opacity: 0.6 }]}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{c.name.trim().charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Row style={{ justifyContent: 'flex-start', gap: 6 }}>
                  <Text style={s.name}>{c.name}</Text>
                  {unread.has(c.user_id) ? <Tag label="New message" /> : null}
                </Row>
                {hasSummary(c.summary) ? (
                  <>
                    <View style={s.tags}>
                      {flags(c.summary, now).slice(0, 2).map((f) => (
                        <Tag key={f.key} label={f.label} tone={f.tone} />
                      ))}
                    </View>
                    <Meta numberOfLines={1}>
                      {c.summary.plannedThisWeek !== null
                        ? `${c.summary.workoutsThisWeek}/${c.summary.plannedThisWeek} workouts`
                        : `${c.summary.workoutsThisWeek} workouts this week`}
                      {c.summary.weightStart !== null && c.summary.weightNow !== null
                        ? ` · ${signed(c.summary.weightNow - c.summary.weightStart)} ${c.summary.units} total`
                        : ''}
                      {` · updated ${ago(c.updated_at, now)}`}
                    </Meta>
                  </>
                ) : (
                  <Meta>Joined {ago(c.joined_at, now)} · waiting for their first sync</Meta>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.faint} />
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
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
    marginVertical: 12,
  },
  codeCard: { backgroundColor: C.ink, borderColor: C.ink },
  code: { fontSize: 38, fontWeight: '800', letterSpacing: 8, color: '#fff', marginVertical: 4 },
  h2: { fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  h2sub: { fontSize: 13, fontWeight: '600', color: C.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 12 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.redWash, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', color: C.red },
  name: { fontSize: 15, fontWeight: '800', color: C.ink },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
});
