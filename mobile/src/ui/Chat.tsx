import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';

import { C } from '@/theme';
import { Meta } from '@/ui/kit';

/** A message in a coach–client conversation, drawn as a chat bubble. */
export type ChatMessage = { id: string; body: string; created_at: string; read_at: string | null; mine: boolean };

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Oldest at the top, newest at the bottom, scrolled to the end. */
export function ChatThread({ messages, emptyText }: { messages: ChatMessage[]; emptyText: string }) {
  const scroll = useRef<ScrollViewInstance>(null);
  const ordered = [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (ordered.length === 0) return <Meta style={{ textAlign: 'center', marginVertical: 16 }}>{emptyText}</Meta>;
  return (
    <ScrollView
      ref={scroll}
      style={{ maxHeight: 420 }}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
      onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
      nestedScrollEnabled>
      {ordered.map((m) => (
        <View key={m.id} style={[s.bubble, m.mine ? s.mine : s.theirs]}>
          <Text style={[s.body, m.mine && { color: '#fff' }]}>{m.body}</Text>
          <Text style={[s.meta, m.mine && { color: 'rgba(255,255,255,0.75)' }]}>
            {when(m.created_at)}
            {m.mine ? (m.read_at ? ' · Read' : ' · Sent') : ''}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bubble: { maxWidth: '85%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, gap: 3 },
  mine: { alignSelf: 'flex-end', backgroundColor: C.red, borderBottomRightRadius: 5 },
  theirs: { alignSelf: 'flex-start', backgroundColor: C.line2, borderBottomLeftRadius: 5 },
  body: { fontSize: 15, lineHeight: 20, color: C.ink },
  meta: { fontSize: 10, fontWeight: '600', color: C.muted },
});
