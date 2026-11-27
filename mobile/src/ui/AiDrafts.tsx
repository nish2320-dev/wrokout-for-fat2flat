import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { markDraft, pendingDrafts, sendDraft, type AgentDraft, type ClientRow } from '@/cloud/coachApi';
import { useCloud } from '@/cloud/CloudProvider';
import { errorText } from '@/cloud/supabase';
import { orderedMeals, planTotals, slotLabel } from '@/data/coachMealPlans';
import { describe } from '@/data/coachWorkouts';
import { exerciseName } from '@/data/exercises';
import { macroLine } from '@/data/myMeals';
import { C } from '@/theme';
import { Btn, Card, CardTitle, Meta, Row, Tag } from '@/ui/kit';

/** On a client's page: next week's workouts and meal plan the AI drafted, for the coach to send, edit or dismiss. */
export function ClientDraftsCard({ client }: { client: Pick<ClientRow, 'user_id' | 'push_token' | 'name'> }) {
  const router = useRouter();
  const cloud = useCloud();
  const [drafts, setDrafts] = useState<AgentDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const first = client.name.split(' ')[0];

  const load = useCallback(() => {
    pendingDrafts(client.user_id)
      .then(setDrafts)
      .catch(() => setDrafts([]));
  }, [client.user_id]);
  useFocusEffect(load);

  if (drafts.length === 0) return null;
  const reason = drafts.find((d) => d.reason)?.reason;

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    if (!cloud.coach) return;
    setBusy(true);
    try {
      await fn();
      if (done) Alert.alert('Sent', done);
    } catch (e) {
      Alert.alert('Could not send', errorText(e));
    } finally {
      setBusy(false);
      load();
    }
  };

  const edit = (d: AgentDraft) =>
    router.push({
      pathname: d.kind === 'workout' ? '/coach/workout' : '/coach/mealplan',
      params: { to: client.user_id, draft: d.id, copy: JSON.stringify(d.payload) },
    });

  return (
    <Card style={[{ gap: 10 }, s.card]}>
      <Row>
        <CardTitle>AI drafts for next week</CardTitle>
        <Tag label="Needs your OK" tone="amber" />
      </Row>
      <Meta>Nothing reaches {first} until you send it.{reason ? ` ${reason}` : ''}</Meta>
      {drafts.map((d) => (
        <View key={d.id} style={s.draft}>
          <Text style={s.kind}>{d.kind === 'workout' ? 'WORKOUT' : 'MEAL PLAN'}</Text>
          <Text style={s.name}>{d.payload.name}</Text>
          {d.kind === 'workout' ? (
            <>
              <Meta>{describe(d.payload.items)}</Meta>
              <Meta numberOfLines={2}>{d.payload.items.map((i) => exerciseName(i.exerciseId)).join(' · ')}</Meta>
            </>
          ) : (
            <>
              <Meta>{macroLine(planTotals(d.payload.meals))}</Meta>
              {orderedMeals(d.payload.meals).map((m) => (
                <Meta key={m.slot} numberOfLines={1}>
                  {slotLabel(m.slot)}: {m.items.map((i) => i.name).join(', ')}
                </Meta>
              ))}
            </>
          )}
          <Row style={{ justifyContent: 'flex-start', gap: 18, marginTop: 6 }}>
            <Pressable disabled={busy} onPress={() => run(() => sendDraft(cloud.coach!.name, client, d), `${first} has it now.`)} hitSlop={6}>
              <Text style={s.action}>Send</Text>
            </Pressable>
            <Pressable disabled={busy} onPress={() => edit(d)} hitSlop={6}>
              <Text style={s.action}>Edit first</Text>
            </Pressable>
            <Pressable disabled={busy} onPress={() => run(() => markDraft(d.id, 'dismissed'))} hitSlop={6}>
              <Text style={[s.action, { color: C.muted }]}>Dismiss</Text>
            </Pressable>
          </Row>
        </View>
      ))}
      {drafts.length > 1 ? (
        <Btn
          label={busy ? 'Sending…' : `Send all ${drafts.length}`}
          icon="send"
          disabled={busy}
          onPress={() =>
            run(async () => {
              // workouts first, the meal plan last, so the newest plan is the one they keep
              for (const d of [...drafts].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'workout' ? -1 : 1))) await sendDraft(cloud.coach!.name, client, d);
            }, `${first} has next week’s plan.`)
          }
        />
      ) : null}
    </Card>
  );
}

/** On the coach's client list: which clients have AI drafts waiting. */
export function DraftsSummaryCard({ clients }: { clients: ClientRow[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<AgentDraft[]>([]);
  useFocusEffect(
    useCallback(() => {
      pendingDrafts()
        .then(setDrafts)
        .catch(() => setDrafts([]));
    }, []),
  );
  const byClient = clients.filter((c) => drafts.some((d) => d.client_id === c.user_id));
  if (byClient.length === 0) return null;
  return (
    <Card style={[{ gap: 8 }, s.card]}>
      <Row>
        <CardTitle>AI drafts to review</CardTitle>
        <Tag label={`${byClient.length} client${byClient.length === 1 ? '' : 's'}`} tone="amber" />
      </Row>
      <Meta>Next week’s workouts and meal plans, drafted by your AI assistant. Tap a client to send, edit or dismiss.</Meta>
      {byClient.map((c) => {
        const n = drafts.filter((d) => d.client_id === c.user_id);
        return (
          <Pressable key={c.user_id} onPress={() => router.push({ pathname: '/coach/[id]', params: { id: c.user_id } })} style={({ pressed }) => [s.client, pressed && { opacity: 0.6 }]}>
            <Text style={s.name}>{c.name}</Text>
            <Meta>
              {n.filter((d) => d.kind === 'workout').length} workouts{n.some((d) => d.kind === 'mealplan') ? ' · meal plan' : ''}
            </Meta>
          </Pressable>
        );
      })}
    </Card>
  );
}

const s = StyleSheet.create({
  card: { borderColor: C.amberWash, borderWidth: 1.5 },
  draft: { gap: 2, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  kind: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: C.muted },
  name: { fontSize: 15, fontWeight: '800', color: C.ink },
  action: { fontSize: 14, fontWeight: '700', color: C.red },
  client: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
});
