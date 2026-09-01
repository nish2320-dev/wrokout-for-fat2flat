/**
 * Fat2Flat brand tokens. These mirror the App Store screenshot artwork in
 * screenshots/ so marketing and the shipped app stay visually identical.
 */
export const C = {
  ink: '#0E1013',
  ink2: '#3C424B',
  muted: '#878D96',
  faint: '#B6BCC4',
  line: '#E9EBEF',
  line2: '#F1F3F6',
  wash: '#F4F6F8',
  card: '#FFFFFF',
  red: '#E1251B',
  redLight: '#FF4033',
  redWash: '#FDECEB',
  green: '#17A34A',
  greenWash: '#E7F6ED',
} as const;

export const S = {
  gap: 9,
  pad: 14,
  radius: 16,
  radiusSm: 11,
} as const;

export const F = {
  metric: { fontSize: 26, fontWeight: '800', letterSpacing: -0.9, color: C.ink },
  metricSm: { fontSize: 22, fontWeight: '800', letterSpacing: -0.7, color: C.ink },
  title: { fontSize: 25, fontWeight: '800', letterSpacing: -0.85, color: C.ink },
  cardTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, color: C.ink },
  name: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2, color: C.ink },
  label: { fontSize: 12, fontWeight: '600', color: C.muted },
  meta: { fontSize: 11, fontWeight: '500', color: C.muted },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: C.muted,
    textTransform: 'uppercase',
  },
} as const;
