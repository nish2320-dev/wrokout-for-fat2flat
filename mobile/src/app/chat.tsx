import { useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';

import { useCloud } from '@/cloud/CloudProvider';
import { errorText } from '@/cloud/supabase';
import { C, S } from '@/theme';
import { ChatThread } from '@/ui/Chat';
import { Btn, Card, Meta, Row, Screen } from '@/ui/kit';

/** The client's conversation with their coach. */
export default function ChatScreen() {
  const cloud = useCloud();
  const navigation = useNavigation();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const m = cloud.membership;

  useEffect(() => {
    if (m) navigation.setOptions({ title: m.coachName });
  }, [m, navigation]);

  // opening the chat counts as reading the coach's messages
  const unread = cloud.notes.some((n) => !n.from_client && !n.read_at);
  useEffect(() => {
    if (m && unread) cloud.markAllRead().catch(() => {});
  }, [m, unread, cloud]);

  if (!m) {
    return (
      <Screen>
        <Card>
          <Meta>Join your coach first (Profile → Join my coach) to send them messages.</Meta>
        </Card>
      </Screen>
    );
  }

  const send = async () => {
    setSending(true);
    try {
      await cloud.sendToCoach(draft);
      setDraft('');
    } catch (e) {
      Alert.alert('Could not send', errorText(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <Card>
        <ChatThread
          messages={cloud.notes.map((n) => ({ ...n, mine: n.from_client }))}
          emptyText={`Say hi to ${m.coachName}! Ask a question or tell them how your week is going.`}
        />
      </Card>
      <Card>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          multiline
          placeholder={`Message ${m.coachName}…`}
          placeholderTextColor={C.faint}
          style={s.input}
          maxLength={1000}
        />
        <Row style={{ gap: S.gap, marginTop: 10 }}>
          <Btn label="Refresh" icon="refresh" ghost onPress={() => cloud.refresh()} style={{ flex: 1 }} />
          <Btn label={sending ? 'Sending…' : 'Send'} icon="send" onPress={send} disabled={!draft.trim() || sending} style={{ flex: 1 }} />
        </Row>
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  input: {
    minHeight: 70,
    borderRadius: 12,
    backgroundColor: C.wash,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    fontSize: 15,
    lineHeight: 20,
    color: C.ink,
    textAlignVertical: 'top',
  },
});
