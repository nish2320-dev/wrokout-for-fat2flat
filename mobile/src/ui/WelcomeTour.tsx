import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/data/store';
import { C } from '@/theme';
import { Btn } from '@/ui/kit';

const SLIDES: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'barbell',
    title: 'Welcome to Fat2Flat',
    body: 'Build a workout in seconds, log every set with a rest timer, and track your meals by scanning, searching or snapping a photo.',
  },
  {
    icon: 'flame',
    title: 'Your 12-week Transformation',
    body: 'Tap the dark card on Home to set it up: daily calorie and protein targets, a workout plan for every week, and a coach that fine-tunes as you go.',
  },
  {
    icon: 'restaurant',
    title: 'Meals made easy',
    body: 'The Meals tab has a daily meal plan for Non-veg, Veg or Hindu Veg. Log a meal in one tap, or photograph your plate and let the app estimate it.',
  },
  {
    icon: 'people',
    title: 'Your coach and your watch',
    body: 'In Profile, connect your health app to bring in steps, sleep and workouts, and join your trainer with their code so they can keep you on track.',
  },
];

/**
 * A short first-run tour, shown once over Home. It's a plain modal rather than
 * a screen so it never navigates before the app's navigation is ready.
 */
export function WelcomeTour() {
  const { state, ready } = useStore();
  if (!ready || state.profile.seenWelcome) return null;
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => {}}>
      <Slides />
    </Modal>
  );
}

function Slides() {
  const insets = useSafeAreaInsets();
  const { updateProfile } = useStore();
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  const done = () => updateProfile({ seenWelcome: true });

  return (
    <View style={[s.wrap, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      <Pressable onPress={done} style={s.skip} accessibilityRole="button">
        <Text style={s.skipText}>{last ? '' : 'Skip'}</Text>
      </Pressable>
      <View style={s.center}>
        <View style={s.badge}>
          <Ionicons name={slide.icon} size={44} color="#fff" />
        </View>
        <Text style={s.title}>{slide.title}</Text>
        <Text style={s.body}>{slide.body}</Text>
      </View>
      <View style={s.dots}>
        {SLIDES.map((_, k) => (
          <View key={k} style={[s.dot, k === i && s.dotOn]} />
        ))}
      </View>
      <Btn label={last ? 'Get started' : 'Next'} icon={last ? 'checkmark' : 'arrow-forward'} onPress={() => (last ? done() : setI(i + 1))} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.wash, paddingHorizontal: 24 },
  skip: { alignSelf: 'flex-end', padding: 8, minHeight: 36 },
  skipText: { fontSize: 15, fontWeight: '700', color: C.muted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  badge: { width: 96, height: 96, borderRadius: 28, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: C.ink, letterSpacing: -0.8, textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 23, color: C.ink2, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 18 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.line },
  dotOn: { width: 20, backgroundColor: C.red },
});
