import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { C, S } from '@/theme';

/* ---------------- text ---------------- */

export const Title = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[t.title, style]}>{children}</Text>
);
export const CardTitle = ({ children }: { children: ReactNode }) => <Text style={t.cardTitle}>{children}</Text>;
export const Name = ({ children }: { children: ReactNode }) => <Text style={t.name}>{children}</Text>;
export const Label = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[t.label, style]}>{children}</Text>
);
export const Meta = ({ children }: { children: ReactNode }) => <Text style={t.meta}>{children}</Text>;
export const Eyebrow = ({ children }: { children: ReactNode }) => <Text style={t.eyebrow}>{children}</Text>;
export const Metric = ({ value, unit, small }: { value: string; unit?: string; small?: boolean }) => (
  <Text style={small ? t.metricSm : t.metric}>
    {value}
    {unit ? <Text style={t.metricUnit}> {unit}</Text> : null}
  </Text>
);

/* ---------------- containers ---------------- */

export const Card = ({
  children,
  style,
  flush,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Removes horizontal padding so list rows can span the full card width. */
  flush?: boolean;
}) => <View style={[t.card, flush && t.cardFlush, style]}>{children}</View>;

export const Row = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[t.row, style]}>{children}</View>
);

export const Screen = ({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) =>
  scroll ? (
    <ScrollView
      style={t.screen}
      contentContainerStyle={t.screenContent}
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[t.screen, t.screenContent]}>{children}</View>
  );

export const Divider = () => <View style={t.divider} />;

/* ---------------- controls ---------------- */

export function Pill({
  label,
  on,
  small,
  onPress,
}: {
  label: string;
  on?: boolean;
  small?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      style={({ pressed }) => [
        t.pill,
        small && t.pillSm,
        on && t.pillOn,
        pressed && t.pressed,
      ]}>
      <Text style={[t.pillText, small && t.pillTextSm, on && t.pillTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function Btn({
  label,
  onPress,
  icon,
  ghost,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  ghost?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        t.btn,
        ghost && t.btnGhost,
        disabled && t.btnDisabled,
        pressed && !disabled && t.pressed,
        style,
      ]}>
      {icon ? <Ionicons name={icon} size={18} color={ghost ? C.ink : '#fff'} /> : null}
      <Text style={[t.btnText, ghost && t.btnTextGhost]}>{label}</Text>
    </Pressable>
  );
}

export const Tag = ({ label, tone = 'red' }: { label: string; tone?: 'red' | 'grey' | 'green' }) => (
  <View style={[t.tag, tone === 'grey' && t.tagGrey, tone === 'green' && t.tagGreen]}>
    <Text style={[t.tagText, tone === 'grey' && t.tagTextGrey, tone === 'green' && t.tagTextGreen]}>
      {label}
    </Text>
  </View>
);

/* ---------------- charts ---------------- */

export function Ring({ pct, label }: { pct: number; label: string }) {
  const r = 16.5;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <View style={t.ring}>
      <Svg viewBox="0 0 40 40" width={54} height={54} style={t.ringSvg}>
        <Circle cx={20} cy={20} r={r} fill="none" stroke={C.line2} strokeWidth={6} />
        <Circle
          cx={20}
          cy={20}
          r={r}
          fill="none"
          stroke={C.red}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </Svg>
      <View style={t.ringLabel} pointerEvents="none">
        <Text style={t.ringText}>{label}</Text>
      </View>
    </View>
  );
}

export function Bars({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1);
  return (
    <View style={t.chart}>
      {values.map((v, i) => (
        <View key={i} style={t.chartCol}>
          <View
            style={[
              t.chartBar,
              // an empty week still needs a visible stub, or the axis reads as broken
              { height: `${Math.max(3, (v / max) * 100)}%` },
              v === 0 && t.chartBarEmpty,
              i === values.length - 1 && t.chartBarCurrent,
            ]}
          />
          <Text style={t.chartX}>{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}

export function Trend({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const W = 320;
  const H = 84;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const xy = points.map((p, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - 12 - ((p - min) / span) * (H - 24);
    return [x, y] as const;
  });
  const line = xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const last = xy[xy.length - 1];

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={84}>
      <Defs>
        <LinearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={C.red} stopOpacity={0.2} />
          <Stop offset="100%" stopColor={C.red} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill="url(#trend)" />
      <Path d={line} fill="none" stroke={C.red} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last[0]} cy={last[1]} r={4.5} fill={C.red} stroke="#fff" strokeWidth={2.5} />
    </Svg>
  );
}

/* ---------------- empty state ---------------- */

export function Empty({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={t.empty}>
      <View style={t.emptyIcon}>
        <Ionicons name={icon} size={26} color={C.faint} />
      </View>
      <Text style={t.emptyTitle}>{title}</Text>
      <Text style={t.emptyBody}>{body}</Text>
    </View>
  );
}

const t = StyleSheet.create({
  title: { fontSize: 25, fontWeight: '800', letterSpacing: -0.85, color: C.ink },
  cardTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, color: C.ink },
  name: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2, color: C.ink },
  label: { fontSize: 12, fontWeight: '600', color: C.muted },
  meta: { fontSize: 11, fontWeight: '500', color: C.muted, marginTop: 2 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: C.muted,
    textTransform: 'uppercase',
  },
  metric: { fontSize: 26, fontWeight: '800', letterSpacing: -0.9, color: C.ink },
  metricSm: { fontSize: 22, fontWeight: '800', letterSpacing: -0.7, color: C.ink },
  metricUnit: { fontSize: 14, fontWeight: '700', color: C.muted, letterSpacing: -0.2 },

  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: S.radius,
    padding: 13,
  },
  cardFlush: { paddingHorizontal: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: C.line2 },

  screen: { flex: 1, backgroundColor: C.wash },
  screenContent: { padding: S.pad, gap: S.gap, paddingBottom: 28 },

  pill: {
    height: 34,
    paddingHorizontal: 15,
    borderRadius: 17,
    backgroundColor: '#EEF0F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSm: { height: 28, paddingHorizontal: 12, borderRadius: 14 },
  pillOn: { backgroundColor: C.red },
  pillText: { fontSize: 13, fontWeight: '700', letterSpacing: -0.15, color: C.ink2 },
  pillTextSm: { fontSize: 12 },
  pillTextOn: { color: '#fff' },

  btn: {
    height: 52,
    borderRadius: 15,
    backgroundColor: C.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line },
  btnDisabled: { backgroundColor: C.faint },
  btnText: { fontSize: 16, fontWeight: '800', letterSpacing: -0.25, color: '#fff' },
  btnTextGhost: { color: C.ink },
  pressed: { opacity: 0.75 },

  tag: {
    height: 20,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: C.redWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagGrey: { backgroundColor: '#F0F2F5' },
  tagGreen: { backgroundColor: C.greenWash },
  tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3, color: C.red },
  tagTextGrey: { color: C.muted },
  tagTextGreen: { color: C.green },

  ring: { width: 54, height: 54 },
  ringSvg: { position: 'absolute' },
  ringLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: { fontSize: 12, fontWeight: '800', letterSpacing: -0.3, color: C.ink },

  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 128 },
  chartCol: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 6 },
  chartBar: { width: '100%', borderRadius: 6, backgroundColor: C.red },
  chartBarCurrent: { backgroundColor: '#F3B7B2' },
  chartBarEmpty: { backgroundColor: C.line2 },
  chartX: { fontSize: 10, fontWeight: '700', color: C.faint },

  empty: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20, gap: 4 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: C.line2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.ink, letterSpacing: -0.2 },
  emptyBody: { fontSize: 13, fontWeight: '500', color: C.muted, textAlign: 'center', lineHeight: 18 },
});
