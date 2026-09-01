import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { exerciseName } from '@/data/exercises';
import { useStore } from '@/data/store';
import { finished, fmtDate, fmtVolume, personalRecords, streak, volume, weeklyVolume } from '@/data/stats';
import { C, S } from '@/theme';
import { Bars, Btn, Card, CardTitle, Empty, Label, Meta, Metric, Name, Row, Screen, Tag, Title, Trend } from '@/ui/kit';

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
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
              {last !== undefined ? `${last} ${units} · ${weights.length} weigh-ins` : 'No weigh-ins yet'}
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
                {pr.weight} {units}
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
