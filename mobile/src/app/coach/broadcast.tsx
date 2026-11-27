import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { listClients, sendNoteToMany, type ClientRow } from '@/cloud/coachApi';
import { useCloud } from '@/cloud/CloudProvider';
import { errorText } from '@/cloud/supabase';
import { C } from '@/theme';
import { Btn, Card, CardTitle, Meta, Pill, Screen } from '@/ui/kit';

const IDEAS = [
  'Big week ahead, everyone! Log your meals every day and get all your workouts in. I’m checking in on each of you 💪',
  'Reminder: weekly check-in is due. Hop on the scale, measure your waist and add your photos in the app.',
  'New in the app: tap “Allow” on the AI check-ins card on Home to get a quick tip from me every evening.',
];

/** The coach sends one message to all (or some) clients; each gets it in their own chat with a notification. */
export default function MessageAllClients() {
  const router = useRouter();
  const cloud = useCloud();
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const coachId = cloud.coach ? cloud.userId : null;

  useEffect(() => {
    if (!coachId) return;
    listClients(coachId)
      .then((cs) => {
        const sorted = cs.sort((a, b) => a.name.localeCompare(b.name));
        setClients(sorted);
        setChosen(sorted.map((c) => c.user_id)); // everyone, unless the coach unticks someone
      })
      .catch((e) => {
        Alert.alert('Could not load clients', errorText(e));
        setClients([]);
      });
  }, [coachId]);

  const send = () => {
    if (!coachId || !cloud.coach || !clients) return;
    const to = clients.filter((c) => chosen.includes(c.user_id));
    Alert.alert(`Send to ${to.length} client${to.length === 1 ? '' : 's'}?`, 'Each gets it in their own chat with you, with a notification. Replies come back to you one by one.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          setSending(true);
          try {
            const n = await sendNoteToMany(coachId, cloud.coach!.name, to, text);
            Alert.alert('Sent', `${n} client${n === 1 ? '' : 's'} got your message.`, [{ text: 'OK', onPress: () => router.back() }]);
          } catch (e) {
            Alert.alert('Could not send', errorText(e));
          } finally {
            setSending(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <Card style={{ gap: 10 }}>
        <CardTitle>Your message</CardTitle>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          placeholder="Write to all your clients…"
          placeholderTextColor={C.faint}
          style={s.input}
          maxLength={1000}
        />
        <Meta>Ideas (tap to use, then edit):</Meta>
        {IDEAS.map((idea) => (
          <Pressable key={idea} onPress={() => setText(idea)} style={({ pressed }) => [s.idea, pressed && { opacity: 0.6 }]}>
            <Text style={s.ideaText}>{idea}</Text>
          </Pressable>
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <CardTitle>Send to</CardTitle>
        {clients === null ? (
          <Meta>Loading your clients…</Meta>
        ) : clients.length === 0 ? (
          <Meta>No clients yet. Share your coach code first.</Meta>
        ) : (
          <>
            <View style={s.chips}>
              {clients.map((c) => (
                <Pill
                  key={c.user_id}
                  label={c.name}
                  on={chosen.includes(c.user_id)}
                  onPress={() => setChosen((cur) => (cur.includes(c.user_id) ? cur.filter((x) => x !== c.user_id) : [...cur, c.user_id]))}
                />
              ))}
            </View>
            <Pressable onPress={() => setChosen(chosen.length === clients.length ? [] : clients.map((c) => c.user_id))} accessibilityRole="button">
              <Text style={s.link}>{chosen.length === clients.length ? 'Clear all' : 'Choose everyone'}</Text>
            </Pressable>
          </>
        )}
      </Card>

      <Btn
        label={sending ? 'Sending…' : `Send to ${chosen.length} client${chosen.length === 1 ? '' : 's'}`}
        icon="send"
        onPress={send}
        disabled={sending || !text.trim() || chosen.length === 0}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  input: {
    minHeight: 110,
    borderRadius: 12,
    backgroundColor: C.wash,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: C.ink,
    textAlignVertical: 'top',
  },
  idea: { borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 10 },
  ideaText: { fontSize: 13, color: C.ink2, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  link: { fontSize: 14, fontWeight: '700', color: C.red },
});
