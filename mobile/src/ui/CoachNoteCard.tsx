import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useCloud } from '@/cloud/CloudProvider';
import { fmtDate } from '@/data/stats';
import { C } from '@/theme';
import { Btn, Card, Label, Row } from '@/ui/kit';

/** The newest unread note from the client's coach, on Home until it's acknowledged. */
export function CoachNoteCard() {
  const { membership, notes, markRead } = useCloud();
  const unread = notes.filter((n) => !n.read_at);
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
      <Btn label="Got it" icon="thumbs-up-outline" ghost onPress={() => markRead(note.id)} style={{ marginTop: 10 }} />
    </Card>
  );
}

const s = StyleSheet.create({
  card: { borderColor: C.redWash, borderWidth: 1.5 },
  icon: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.redWash, alignItems: 'center', justifyContent: 'center' },
  from: { fontSize: 14, fontWeight: '800', color: C.ink },
  body: { fontSize: 15, lineHeight: 21, color: C.ink, marginTop: 10, fontWeight: '500' },
});
