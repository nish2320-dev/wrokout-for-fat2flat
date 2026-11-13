import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useCloud } from '@/cloud/CloudProvider';
import { unseenTargets } from '@/data/extras';
import { fmtDate } from '@/data/stats';
import { useStore } from '@/data/store';
import { C } from '@/theme';
import { Btn, Card, Label, Row } from '@/ui/kit';

/** The newest unread note from the client's coach, on Home until it's acknowledged. */
export function CoachNoteCard() {
  const router = useRouter();
  const { membership, notes, markRead } = useCloud();
  const unread = notes.filter((n) => !n.from_client && !n.read_at);
  const note = unread[0];
  if (!membership || !note) return null;

  return (
    <Card style={s.card}>
      <Row style={{ justifyContent: 'flex-start', gap: 8 }}>
        <View style={s.icon}>
          <Ionicons name="chatbubble-ellipses" size={15} color={C.red} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.from}>From {membership.coachName}</Text>
          <Label>
            {fmtDate(new Date(note.created_at).getTime())}
            {unread.length > 1 ? ` · ${unread.length - 1} more` : ''}
          </Label>
        </View>
      </Row>
      <Text style={s.body}>{note.body}</Text>
      <Row style={{ gap: 9, marginTop: 10 }}>
        <Btn label="Got it" icon="thumbs-up-outline" ghost onPress={() => markRead(note.id)} style={{ flex: 1 }} />
        <Btn label="Reply" icon="chatbubble-outline" onPress={() => router.push('/chat')} style={{ flex: 1 }} />
      </Row>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { borderColor: C.redWash, borderWidth: 1.5 },
  icon: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.redWash, alignItems: 'center', justifyContent: 'center' },
  from: { fontSize: 14, fontWeight: '800', color: C.ink },
  body: { fontSize: 15, lineHeight: 21, color: C.ink, marginTop: 10, fontWeight: '500' },
});

/** "Your coach updated your plan", until the client taps Got it. */
export function CoachTargetsCard() {
  const { membership } = useCloud();
  const { state, updateProfile } = useStore();
  const p = state.profile;
  if (!membership || !unseenTargets(state)) return null;
  return (
    <Card style={s.card}>
      <Row style={{ justifyContent: 'flex-start', gap: 8 }}>
        <View style={s.icon}>
          <Ionicons name="options" size={15} color={C.red} />
        </View>
        <Text style={[s.from, { flex: 1 }]}>{membership.coachName} updated your plan</Text>
      </Row>
      <Text style={s.body}>
        {p.calorieGoal.toLocaleString()} calories · {p.proteinGoal} g protein a day
        {state.program ? ` · ${state.program.daysPerWeek} workouts a week` : ''}
      </Text>
      {p.coachTargetsNote ? <Text style={[s.body, { marginTop: 6, color: C.ink2 }]}>“{p.coachTargetsNote}”</Text> : null}
      <Btn label="Got it" icon="checkmark" ghost onPress={() => updateProfile({ coachTargetsSeenAt: p.coachTargetsAt })} style={{ marginTop: 10 }} />
    </Card>
  );
}
