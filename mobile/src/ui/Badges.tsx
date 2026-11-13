import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { badges, newBadges } from '@/data/badges';
import { useStore } from '@/data/store';
import { C } from '@/theme';
import { Btn, Card, CardTitle, Label, Meta, Row } from '@/ui/kit';

type IconName = keyof typeof Ionicons.glyphMap;

/** Home: a celebration when new badges are earned (after the welcome tour). */
export function BadgeCelebration() {
  const router = useRouter();
  const { state, ready, updateProfile } = useStore();
  if (!ready || !state.profile.seenWelcome) return null;
  const fresh = newBadges(state, Date.now());
  if (fresh.length === 0) return null;

  const markSeen = () =>
    updateProfile({ seenBadges: [...new Set([...(state.profile.seenBadges ?? []), ...fresh.map((b) => b.id)])] });
  const top = fresh[fresh.length - 1];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={markSeen}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.bigBadge}>
            <Ionicons name={top.icon as IconName} size={44} color="#fff" />
          </View>
          <Text style={s.kicker}>{fresh.length > 1 ? `${fresh.length} NEW BADGES` : 'NEW BADGE'}</Text>
          <Text style={s.title}>{top.title}</Text>
          <Text style={s.detail}>{top.detail}</Text>
          {fresh.length > 1 ? (
            <View style={s.more}>
              {fresh.slice(0, -1).slice(-4).map((b) => (
                <View key={b.id} style={s.chip}>
                  <Ionicons name={b.icon as IconName} size={13} color={C.red} />
                  <Text style={s.chipText}>{b.title}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <Btn
            label="Share my progress"
            icon="share-outline"
            onPress={() => {
              markSeen();
              router.push('/share');
            }}
            style={{ alignSelf: 'stretch', marginTop: 18 }}
          />
          <Btn label="Nice!" ghost onPress={markSeen} style={{ alignSelf: 'stretch', marginTop: 9 }} />
        </View>
      </View>
    </Modal>
  );
}

/** Progress: every badge, earned in colour and the rest greyed out. */
export function BadgeShelf() {
  const router = useRouter();
  const { state } = useStore();
  const all = badges(state, Date.now());
  const earned = all.filter((b) => b.earned).length;
  return (
    <Card>
      <Row>
        <View>
          <CardTitle>Badges</CardTitle>
          <Label>
            {earned} of {all.length} earned
          </Label>
        </View>
        <Pressable onPress={() => router.push('/share')} hitSlop={8} accessibilityRole="button">
          <Text style={s.share}>Share progress</Text>
        </Pressable>
      </Row>
      <View style={s.grid}>
        {all.map((b) => (
          <View key={b.id} style={s.cell} accessibilityLabel={`${b.title}${b.earned ? '' : ', not earned yet'}`}>
            <View style={[s.dot, !b.earned && s.dotOff]}>
              <Ionicons name={b.icon as IconName} size={18} color={b.earned ? '#fff' : C.faint} />
            </View>
            <Text style={[s.cellText, !b.earned && { color: C.faint }]} numberOfLines={2}>
              {b.title}
            </Text>
          </View>
        ))}
      </View>
      {earned === 0 ? <Meta style={{ marginTop: 8 }}>Finish your first workout to earn your first badge.</Meta> : null}
    </Card>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(14,16,19,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' },
  bigBadge: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: C.red },
  title: { fontSize: 24, fontWeight: '800', color: C.ink, letterSpacing: -0.6, marginTop: 4, textAlign: 'center' },
  detail: { fontSize: 15, lineHeight: 21, color: C.ink2, textAlign: 'center', marginTop: 6 },
  more: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.redWash, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { fontSize: 11, fontWeight: '700', color: C.red },
  share: { fontSize: 13, fontWeight: '800', color: C.red },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, rowGap: 12 },
  cell: { width: '25%', alignItems: 'center', gap: 5, paddingHorizontal: 2 },
  dot: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  dotOff: { backgroundColor: C.line2 },
  cellText: { fontSize: 10, fontWeight: '700', color: C.ink, textAlign: 'center' },
});
