import { File, Paths } from 'expo-file-system';
import { useRef, useState } from 'react';
import { Alert, Platform, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Rect, Stop, Text as SvgText, TSpan } from 'react-native-svg';

import { badges } from '@/data/badges';
import { finished } from '@/data/stats';
import { useStore } from '@/data/store';
import { fmtLength, lengthUnit } from '@/data/units';
import { C, S } from '@/theme';
import { Btn, Meta, Screen } from '@/ui/kit';

const W = 1080;
const H = 1350; // 4:5, Instagram's portrait size
const DAY = 86400000;

const round1 = (n: number) => Math.round(n * 10) / 10;
const FONT = Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif';

/** A progress card to share on social media, drawn with SVG so it can be saved as an image. */
export default function ShareProgress() {
  const { state } = useStore();
  const { width } = useWindowDimensions();
  const svg = useRef<Svg>(null);
  const [busy, setBusy] = useState(false);
  const u = state.profile.units;

  const weighIns = [...state.weighIns].sort((a, b) => a.at - b.at);
  const startWeight = state.program?.body.startWeight ?? weighIns[0]?.weight;
  const nowWeight = weighIns[weighIns.length - 1]?.weight;
  const lost = startWeight !== undefined && nowWeight !== undefined ? round1(startWeight - nowWeight) : 0;
  const since = state.program?.startedAt ?? weighIns[0]?.at ?? finished(state)[finished(state).length - 1]?.startedAt;
  const weeks = since ? Math.max(1, Math.round((Date.now() - since) / (7 * DAY))) : 0;
  const waists = [...state.checkIns].sort((a, b) => a.at - b.at).filter((c) => c.waist !== undefined);
  const waistDown = waists.length > 1 ? waists[0].waist! - waists[waists.length - 1].waist! : 0;
  const workouts = finished(state).length;
  const earned = badges(state, Date.now()).filter((b) => b.earned).length;

  const stats: { value: string; label: string }[] = [
    ...(lost > 0 ? [{ value: `−${lost} ${u}`, label: 'WEIGHT LOST' }] : []),
    ...(waistDown > 0.4 ? [{ value: `−${fmtLength(waistDown, u)} ${lengthUnit(u)}`, label: 'OFF MY WAIST' }] : []),
    { value: `${workouts}`, label: workouts === 1 ? 'WORKOUT' : 'WORKOUTS' },
    { value: `${earned}`, label: earned === 1 ? 'BADGE EARNED' : 'BADGES EARNED' },
  ].slice(0, 4);

  const share = () => {
    if (!svg.current) return;
    setBusy(true);
    svg.current.toDataURL(async (base64: string) => {
      try {
        const file = new File(Paths.cache, `fat2flat-progress-${Date.now()}.png`);
        file.write(base64, { encoding: 'base64' });
        // iOS shares the image itself; Android's share sheet takes text, so it gets a caption
        await Share.share(
          Platform.OS === 'ios'
            ? { url: file.uri }
            : { message: `${weeks} weeks into my Fat2Flat journey${lost > 0 ? `: −${lost} ${u} so far` : ''}! 💪` },
        );
      } catch {
        Alert.alert('Couldn’t share', 'Please try again.');
      } finally {
        setBusy(false);
      }
    });
  };

  // useWindowDimensions can report 0 before layout; never draw a zero-sized card
  const preview = Math.min(Math.max(width - S.pad * 2, 300), 420);

  return (
    <Screen>
      <View style={[s.frame, { width: preview, height: (preview * H) / W }]}>
        <Svg ref={svg} width={preview} height={(preview * H) / W} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#16191E" />
              <Stop offset="1" stopColor="#0B0C0F" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={W} height={H} fill="url(#bg)" />
          <Circle cx={W - 80} cy={120} r={360} fill="#E1251B" opacity={0.22} />
          <SvgText fontFamily={FONT} x="80" y="150" fill="#FFFFFF" fontSize="44" fontWeight="800" letterSpacing="10">
            <TSpan>FAT</TSpan>
            <TSpan fill="#E1251B">2</TSpan>
            <TSpan>FLAT FITNESS</TSpan>
          </SvgText>
          <SvgText fontFamily={FONT} x="80" y="330" fill="#FFFFFF" fontSize="110" fontWeight="800" letterSpacing="-3">
            {weeks > 0 ? `${weeks} ${weeks === 1 ? 'week' : 'weeks'}` : 'Day one'}
          </SvgText>
          <SvgText fontFamily={FONT} x="80" y="430" fill="#FF4033" fontSize="96" fontWeight="800" letterSpacing="-3">
            of showing up.
          </SvgText>
          {stats.map((st, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = 80 + col * 470;
            const y = 560 + row * 300;
            return (
              <G key={st.label}>
                <Rect x={x} y={y} width="440" height="260" rx="36" fill="#FFFFFF" opacity={0.07} />
                <SvgText fontFamily={FONT} x={x + 40} y={y + 135} fill="#FFFFFF" fontSize="88" fontWeight="800" letterSpacing="-2">
                  {st.value}
                </SvgText>
                <SvgText fontFamily={FONT} x={x + 40} y={y + 205} fill="#B6BCC4" fontSize="30" fontWeight="700" letterSpacing="4">
                  {st.label}
                </SvgText>
              </G>
            );
          })}
          <SvgText fontFamily={FONT} x="80" y={H - 90} fill="#B6BCC4" fontSize="34" fontWeight="600">
            Tracked with Fat2Flat Fitness
          </SvgText>
        </Svg>
      </View>
      <Btn label={busy ? 'Preparing…' : 'Share'} icon="share-outline" onPress={share} disabled={busy} />
      <Meta style={{ textAlign: 'center' }}>Shares this picture to Instagram, WhatsApp, Messages or anywhere else you choose.</Meta>
    </Screen>
  );
}

const s = StyleSheet.create({
  frame: { alignSelf: 'center', borderRadius: 18, overflow: 'hidden', backgroundColor: C.ink },
});
