import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fmtDate } from '@/data/stats';
import { useStore } from '@/data/store';
import { CheckIn } from '@/data/types';
import { photoUri } from '@/photos';
import { C, S } from '@/theme';
import { Card, Empty, Eyebrow, Meta, Pill, Row, Screen } from '@/ui/kit';

type Pose = 'front' | 'side';

export default function PhotosScreen() {
  const { state } = useStore();
  const withPhotos = state.checkIns.filter((c) => c.photos.front || c.photos.side);

  const [pose, setPose] = useState<Pose>(withPhotos.some((c) => c.photos.front) ? 'front' : 'side');
  const choices = withPhotos.filter((c) => c.photos[pose]);
  const [beforeId, setBeforeId] = useState<string | undefined>(undefined);
  const [afterId, setAfterId] = useState<string | undefined>(undefined);

  // default to first vs latest; fall back if a pick has no photo for this pose
  const before = choices.find((c) => c.id === beforeId) ?? choices[0];
  const after = choices.find((c) => c.id === afterId) ?? choices[choices.length - 1];

  if (choices.length < 2 || !before || !after) {
    return (
      <Screen>
        <Empty
          icon="images-outline"
          title="Two photos needed"
          body="Add a progress photo at your weekly check-ins. Once you have two, compare them here with a slider."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'flex-start', gap: S.gap }}>
        {(['front', 'side'] as const).map((p) => (
          <Pill
            key={p}
            label={p === 'front' ? 'Front' : 'Side'}
            small
            on={pose === p}
            onPress={() => setPose(p)}
          />
        ))}
      </Row>

      <Compare before={before} after={after} pose={pose} />

      <Card>
        <Eyebrow>Before</Eyebrow>
        <DatePicker items={choices} selected={before.id} onPick={setBeforeId} />
        <View style={{ height: 12 }} />
        <Eyebrow>After</Eyebrow>
        <DatePicker items={choices} selected={after.id} onPick={setAfterId} />
      </Card>
      <Meta style={{ textAlign: 'center' }}>Drag the handle to reveal before and after. Photos stay on this phone unless you share them with your coach.</Meta>
    </Screen>
  );
}

/** Two stacked photos; dragging the handle reveals more of "after" over "before". */
function Compare({ before, after, pose }: { before: CheckIn; after: CheckIn; pose: Pose }) {
  const [width, setWidth] = useState(0);
  const [pos, setPos] = useState(0.5);
  const widthRef = useRef(0);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // keep the page from scrolling while dragging the slider
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => setPos(clamp(e.nativeEvent.locationX / (widthRef.current || 1))),
        onPanResponderMove: (e) => setPos(clamp(e.nativeEvent.locationX / (widthRef.current || 1))),
      }),
    [],
  );

  return (
    <View
      style={s.frame}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
        setWidth(e.nativeEvent.layout.width);
      }}
      {...pan.panHandlers}>
      <Image source={{ uri: photoUri(before.photos[pose]!) }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={[s.reveal, { width: width * pos }]} pointerEvents="none">
        <Image source={{ uri: photoUri(after.photos[pose]!) }} style={{ width, height: '100%' }} contentFit="cover" />
      </View>
      <View style={[s.divider, { left: width * pos - 1.5 }]} pointerEvents="none">
        <View style={s.handle}>
          <Ionicons name="code-outline" size={16} color={C.ink} />
        </View>
      </View>
      <Text style={[s.tag, { left: 10 }]} pointerEvents="none">
        After · {fmtDate(after.at)}
      </Text>
      <Text style={[s.tag, { right: 10 }]} pointerEvents="none">
        Before · {fmtDate(before.at)}
      </Text>
    </View>
  );
}

function DatePicker({ items, selected, onPick }: { items: CheckIn[]; selected: string; onPick: (id: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
      {items.map((c) => (
        <Pill key={c.id} label={fmtDate(c.at)} small on={c.id === selected} onPress={() => onPick(c.id)} />
      ))}
    </ScrollView>
  );
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));

const s = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 3 / 4, borderRadius: S.radius, overflow: 'hidden', backgroundColor: C.line2 },
  reveal: { position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden' },
  divider: { position: 'absolute', top: 0, bottom: 0, width: 3, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  handle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  tag: {
    position: 'absolute',
    bottom: 10,
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
