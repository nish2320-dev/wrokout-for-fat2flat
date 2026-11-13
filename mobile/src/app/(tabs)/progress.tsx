import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { exerciseName } from '@/data/exercises';
import { useStore } from '@/data/store';
import { finished, fmtDate, fmtVolume, personalRecords, streak, volume, weeklyVolume } from '@/data/stats';
import { cmToDisplay, fmtLength, fmtWeight, lengthUnit } from '@/data/units';
import { C, S } from '@/theme';
import { WeekActivity } from '@/ui/ActivityCard';
import { BadgeShelf } from '@/ui/Badges';
import { Bars, Btn, Card, CardTitle, Empty, Label, Meta, Metric, Name, Row, Screen, Tag, Title, Trend } from '@/ui/kit';

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, addWeighIn } = useStore();
  const [weight, setWeight] = useState('');

  const done = finished(state);
  const weekly = weeklyVolume(state, 8);
  const prs = personalRecords(state).slice(0, 5);
  const totalVolume = done.reduce((n, w) => n + volume(w), 0);
  const units = state.profile.units;

  // last 8 weeks, labelled by how many weeks back they are
  const labels = weekly.map((_, i) => (i === weekly.length - 1 ? 'Now' : `${weekly.length - 1 - i}w`));

  const weights = state.weighIns.slice(-12);
  const first = weights[0]?.weight;
  const last = weights[weights.length - 1]?.weight;
  const delta = first !== undefined && last !== undefined ? last - first : null;

  const submitWeight = () => {
    const n = parseFloat(weight);
    if (!Number.isNaN(n) && n > 0) {
      addWeighIn(n);
      setWeight('');
    }
  };

  return (
    <Screen>
      <View style={{ height: insets.top }} />
      <Title>Progress</Title>

      <View style={s.tiles}>
        <Card style={s.tile}>
          <Label>Workouts</Label>
          <View style={{ marginVertical: 2 }}>
            <Metric small value={`${done.length}`} />
          </View>
          <Meta>all time</Meta>
        </Card>
        <Card style={s.tile}>
          <Label>Volume</Label>
          <View style={{ marginVertical: 2 }}>
            <Metric small value={fmtVolume(totalVolume)} />
          </View>
          <Meta>{units} lifted</Meta>
        </Card>
        <Card style={s.tile}>
          <Label>Streak</Label>
          <View style={{ marginVertical: 2 }}>
            <Metric small value={`${streak(state)}d`} />
          </View>
          <Meta>current</Meta>
        </Card>
      </View>

      <Card>
        <Row style={{ marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <CardTitle>Weekly volume</CardTitle>
            <Meta>Last 8 weeks</Meta>
          </View>
        </Row>
        {totalVolume === 0 ? (
          <Empty
            icon="stats-chart-outline"
            title="No volume yet"
            body="Log a few sets with weight and your weekly totals will chart here."
          />
        ) : (
          <Bars values={weekly} labels={labels} />
        )}
      </Card>

      <Card>
        <Row style={{ marginBottom: 9 }}>
          <View style={{ flex: 1 }}>
            <CardTitle>Body weight</CardTitle>
            <Meta>
              {last !== undefined ? `${fmtWeight(last)} ${units} · ${weights.length} weigh-ins` : 'No weigh-ins yet'}
            </Meta>
          </View>
          {delta !== null && delta !== 0 ? (
            <Tag
              tone={delta < 0 ? 'green' : 'grey'}
              label={`${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${units}`}
            />
          ) : null}
        </Row>

        {weights.length >= 2 ? <Trend points={weights.map((w) => w.weight)} /> : null}

        <View style={s.weighIn}>
          <TextInput
            value={weight}
            onChangeText={(t) => setWeight(t.replace(/[^0-9.]/g, ''))}
            placeholder={`Today's weight (${units})`}
            placeholderTextColor={C.muted}
            keyboardType="decimal-pad"
            style={s.input}
            returnKeyType="done"
            onSubmitEditing={submitWeight}
          />
          <Pressable
            onPress={submitWeight}
            disabled={weight === ''}
            style={[s.addBtn, weight === '' && { backgroundColor: C.faint }]}
            accessibilityRole="button"
            accessibilityLabel="Save weigh-in">
            <Ionicons name="add" size={20} color="#fff" />
          </Pressable>
        </View>
      </Card>

      <BadgeShelf />

      <WeekActivity />

      <BodyCard onCheckIn={() => router.push('/checkin')} onCompare={() => router.push('/photos')} />

      <Card flush>
        <Row style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
          <CardTitle>Personal records</CardTitle>
        </Row>
        <View style={s.hair} />
        {prs.length === 0 ? (
          <Empty
            icon="trophy-outline"
            title="No records yet"
            body="Your heaviest completed set for each exercise shows up here."
          />
        ) : (
          prs.map((pr) => (
            <View key={pr.exerciseId} style={s.prRow}>
              <View style={s.thumb}>
                <Ionicons name="trophy" size={19} color={C.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Name>{exerciseName(pr.exerciseId)}</Name>
                <Meta>{fmtDate(pr.at)}</Meta>
              </View>
              <Text style={s.prVal}>
                {fmtWeight(pr.weight)} {units}
              </Text>
            </View>
          ))
        )}
      </Card>

      {done.length === 0 ? (
        <Meta>Finish your first workout to start filling these out.</Meta>
      ) : null}
    </Screen>
  );
}

/** Waist trend and the latest measurements from weekly check-ins. */
function BodyCard({ onCheckIn, onCompare }: { onCheckIn: () => void; onCompare: () => void }) {
  const { state } = useStore();
  const units = state.profile.units;
  const len = lengthUnit(units);
  const withWaist = state.checkIns.filter((c) => c.waist !== undefined);
  const latest = state.checkIns[state.checkIns.length - 1];
  const photos = state.checkIns.filter((c) => c.photos.front || c.photos.side).length;
  const change = withWaist.length >= 2 ? withWaist[withWaist.length - 1].waist! - withWaist[0].waist! : null;

  return (
    <Card>
      <Row style={{ marginBottom: 9 }}>
        <View style={{ flex: 1 }}>
          <CardTitle>Body</CardTitle>
          <Meta>
            {withWaist.length > 0
              ? `Waist ${fmtLength(withWaist[withWaist.length - 1].waist!, units)} ${len} · ${state.checkIns.length} check-ins`
              : 'Track your waist: the scale doesn’t show fat turning into muscle'}
          </Meta>
        </View>
        {change !== null && Math.abs(change) >= 0.1 ? (
          <Tag tone={change < 0 ? 'green' : 'grey'} label={`${change > 0 ? '+' : '−'}${fmtLength(Math.abs(change), units)} ${len}`} />
        ) : null}
      </Row>
      {withWaist.length >= 2 ? <Trend points={withWaist.map((c) => cmToDisplay(c.waist!, units))} /> : null}
      {latest && (latest.hips !== undefined || latest.chest !== undefined) ? (
        <Meta style={{ marginTop: 6 }}>
          Latest: {[
            latest.waist !== undefined ? `waist ${fmtLength(latest.waist, units)}` : null,
            latest.hips !== undefined ? `hips ${fmtLength(latest.hips, units)}` : null,
            latest.chest !== undefined ? `chest ${fmtLength(latest.chest, units)}` : null,
          ]
            .filter(Boolean)
            .join(' · ')} {len}
        </Meta>
      ) : null}
      <View style={{ flexDirection: 'row', gap: S.gap, marginTop: 12 }}>
        <Btn label="Check in" icon="camera-outline" onPress={onCheckIn} style={{ flex: 1 }} />
        {photos >= 2 ? <Btn label="Before & after" icon="images-outline" ghost onPress={onCompare} style={{ flex: 1 }} /> : null}
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: S.gap },
  tile: { flex: 1, padding: 11 },
  hair: { height: 1, backgroundColor: C.line },

  weighIn: { flexDirection: 'row', gap: 8, marginTop: 12 },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.wash,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    color: C.ink,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
  },

  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.line2,
  },
  thumb: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prVal: { fontSize: 15, fontWeight: '800', letterSpacing: -0.4, color: C.ink },
});
