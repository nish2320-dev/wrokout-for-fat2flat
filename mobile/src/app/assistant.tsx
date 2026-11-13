import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCloud } from '@/cloud/CloudProvider';
import { errorText } from '@/cloud/supabase';
import { assistantContext, recentTurns } from '@/data/assistant';
import { useStore } from '@/data/store';
import { C, S } from '@/theme';
import { Btn, Card, Meta, Row } from '@/ui/kit';

const STARTERS = [
  'What should I eat for dinner tonight?',
  'How am I doing this week?',
  'Can I swap an exercise in my next workout?',
  'Why isn’t my weight going down?',
];

/** "Ask Fat2Flat": a chat with the AI assistant, which knows the user's plan and progress. */
export default function Assistant() {
  const router = useRouter();
  const cloud = useCloud();
  const { state, addAssistantMessage, clearAssistant } = useStore();
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  // the stack header sits above this screen: safe area + a 44 pt bar
  const headerHeight = useSafeAreaInsets().top + 44;
  const messages = state.assistant ?? [];
  const lastQuestion = [...messages].reverse().find((m) => m.role === 'user');

  if (!cloud.enabled) {
    return (
      <View style={s.empty}>
        <Meta>The assistant isn’t switched on in this version of the app yet.</Meta>
      </View>
    );
  }

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || thinking) return;
    setDraft('');
    addAssistantMessage({ role: 'user', content: q });
    setThinking(true);
    try {
      const turns = recentTurns([...messages, { id: 'new', role: 'user', content: q, at: Date.now() }]);
      const reply = await cloud.askAssistant(turns, assistantContext(state, Date.now(), cloud.membership?.coachName));
      addAssistantMessage({ role: 'assistant', content: reply });
    } catch (e) {
      Alert.alert('No answer this time', errorText(e));
    } finally {
      setThinking(false);
    }
  };

  const askCoach = async () => {
    if (!lastQuestion || !cloud.membership) return;
    try {
      await cloud.sendToCoach(lastQuestion.content);
      Alert.alert('Sent to your coach', `${cloud.membership.coachName} will see your question in your chat.`, [
        { text: 'Open chat', onPress: () => router.push('/chat') },
        { text: 'OK' },
      ]);
    } catch (e) {
      Alert.alert('Could not send', errorText(e));
    }
  };

  const confirmClear = () =>
    Alert.alert('Clear this conversation?', 'It’s only stored on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearAssistant },
    ]);

  return (
    <KeyboardAvoidingView style={s.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={headerHeight}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={s.list}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        <Card style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'flex-start', gap: 10 }}>
            <View style={s.badge}>
              <Ionicons name="sparkles" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Ask Fat2Flat</Text>
              <Meta>An AI assistant that knows your plan and progress</Meta>
            </View>
            {messages.length ? (
              <Pressable onPress={confirmClear} hitSlop={10} accessibilityLabel="Clear conversation">
                <Ionicons name="trash-outline" size={18} color={C.muted} />
              </Pressable>
            ) : null}
          </Row>
          <Meta>
            Answers are AI-generated and can be wrong. It’s general guidance, not medical advice.
            {cloud.membership ? ` For changes to your plan, check with ${cloud.membership.coachName}.` : ''}
          </Meta>
        </Card>

        {messages.length === 0 ? (
          <View style={{ gap: 8 }}>
            {STARTERS.map((q) => (
              <Pressable key={q} onPress={() => ask(q)} style={({ pressed }) => [s.starter, pressed && { opacity: 0.6 }]}>
                <Text style={s.starterText}>{q}</Text>
                <Ionicons name="arrow-forward" size={15} color={C.red} />
              </Pressable>
            ))}
          </View>
        ) : (
          messages.map((m) => (
            <View key={m.id} style={[s.bubble, m.role === 'user' ? s.mine : s.theirs]}>
              <Text style={[s.body, m.role === 'user' && { color: '#fff' }]}>{m.content}</Text>
            </View>
          ))
        )}
        {thinking ? (
          <View style={[s.bubble, s.theirs, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
            <ActivityIndicator size="small" color={C.red} />
            <Text style={s.body}>Thinking…</Text>
          </View>
        ) : null}
        {cloud.membership && lastQuestion && !thinking ? (
          <Btn label={`Ask ${cloud.membership.coachName} instead`} icon="person-outline" ghost onPress={askCoach} />
        ) : null}
      </ScrollView>

      <View style={s.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask about workouts, food or your plan…"
          placeholderTextColor={C.faint}
          style={s.input}
          multiline
          maxLength={1000}
        />
        <Pressable
          onPress={() => ask(draft)}
          disabled={!draft.trim() || thinking}
          style={[s.send, (!draft.trim() || thinking) && { opacity: 0.4 }]}
          accessibilityLabel="Send">
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.wash },
  empty: { flex: 1, padding: 20, backgroundColor: C.wash },
  list: { padding: S.pad, gap: 10, paddingBottom: 24 },
  badge: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  starter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  starterText: { fontSize: 14, fontWeight: '600', color: C.ink, flex: 1, marginRight: 8 },
  bubble: { maxWidth: '88%', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: C.red, borderBottomRightRadius: 5 },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: C.line },
  body: { fontSize: 15, lineHeight: 21, color: C.ink },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    paddingBottom: 26,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: 21,
    backgroundColor: C.wash,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 15,
    color: C.ink,
  },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
});
