import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useCloud } from '@/cloud/CloudProvider';
import { errorText } from '@/cloud/supabase';
import { unseenTargets } from '@/data/extras';
import { goalsFor } from '@/data/macros';
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
          <Text style={s.from}>{note.from_agent ? `AI check-in · ${membership.coachName}` : `From ${membership.coachName}`}</Text>
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
  small: { fontSize: 12, lineHeight: 17, color: C.muted, marginTop: 8 },
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
        {p.calorieGoal.toLocaleString()} calories · {p.proteinGoal} g protein · {goalsFor(p).carbs} g carbs · {goalsFor(p).fat} g fat a day
        {state.program ? ` · ${state.program.daysPerWeek} workouts a week` : ''}
      </Text>
      {p.coachTargetsNote ? <Text style={[s.body, { marginTop: 6, color: C.ink2 }]}>“{p.coachTargetsNote}”</Text> : null}
      <Btn label="Got it" icon="checkmark" ghost onPress={() => updateProfile({ coachTargetsSeenAt: p.coachTargetsAt })} style={{ marginTop: 10 }} />
    </Card>
  );
}

/**
 * Asks a coaching client, once, whether their coach's AI assistant may review
 * their shared progress and send them check-ins (App Store 5.1.2: personal
 * data goes to a third-party AI only with permission). "Not now" hides it; the
 * switch in Profile → Your coach changes it later.
 */
export function AiCheckinsCard() {
  const cloud = useCloud();
  const { state, updateProfile } = useStore();
  const m = cloud.membership;
  if (!m || m.aiCheckins || state.profile.aiCheckinsAskedAt) return null;
  const allow = () => cloud.setAiCheckins(true).catch((e) => Alert.alert('Could not turn on AI check-ins', errorText(e)));
  return (
    <Card style={s.card}>
      <Row style={{ justifyContent: 'flex-start', gap: 8 }}>
        <View style={s.icon}>
          <Ionicons name="sparkles" size={15} color={C.red} />
        </View>
        <Text style={[s.from, { flex: 1 }]}>Daily check-ins from {m.coachName}’s AI assistant?</Text>
      </Row>
      <Text style={[s.body, { fontSize: 14 }]}>
        Each evening it looks at the progress you share with {m.coachName} and sends a short, personal check-in, with a weekly summary on Sundays. On Sundays it may also fine-tune your calorie and macro targets and help {m.coachName} plan your workouts and meals. {m.coachName} sees every message.
      </Text>
      <Text style={[s.small]}>
        To write them, your shared progress is sent securely to Anthropic, the company behind the Claude AI. It isn’t used to train AI. You can turn this off any time in Profile.
      </Text>
      <Row style={{ gap: 9, marginTop: 10 }}>
        <Btn label="Not now" ghost onPress={() => updateProfile({ aiCheckinsAskedAt: Date.now() })} style={{ flex: 1 }} />
        <Btn label="Allow" icon="checkmark" onPress={allow} style={{ flex: 1 }} />
      </Row>
    </Card>
  );
}
