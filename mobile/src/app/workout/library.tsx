import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { EXERCISES, MUSCLES, Muscle, equipmentLabel } from '@/data/exercises';
import { useActiveWorkout, useStore } from '@/data/store';
import { C } from '@/theme';
import { Card, Empty, Eyebrow, Meta, Name, Pill, Row, Screen, Tag } from '@/ui/kit';

export default function LibraryScreen() {
  const router = useRouter();
  const { pick } = useLocalSearchParams<{ pick?: string }>();
  const { addExercise } = useStore();
  const active = useActiveWorkout();
  const picking = pick === '1' && active !== null;

  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<Muscle | 'all'>('all');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = EXERCISES.filter(
      (e) =>
        (muscle === 'all' || e.muscle === muscle) &&
        (q === '' || e.name.toLowerCase().includes(q)),
    );
    return MUSCLES.map((m) => ({
      ...m,
      items: matched.filter((e) => e.muscle === m.key),
    })).filter((g) => g.items.length > 0);
  }, [query, muscle]);

  const onSelect = (id: string) => {
    if (picking) {
      addExercise(id);
      router.back();
    } else {
      router.push(`/exercise/${id}`);
    }
  };

  return (
    <Screen>
      {picking ? (
        <View style={s.banner}>
          <Ionicons name="add-circle" size={16} color={C.red} />
          <Text style={s.bannerText}>Pick an exercise to add to {active!.name}</Text>
        </View>
      ) : null}

      <View style={s.search}>
        <Ionicons name="search" size={16} color={C.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${EXERCISES.length} exercises`}
          placeholderTextColor={C.muted}
          style={s.searchInput}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={s.chips}>
        <Pill label="All" small on={muscle === 'all'} onPress={() => setMuscle('all')} />
        {MUSCLES.map((m) => (
          <Pill
            key={m.key}
            label={m.label}
            small
            on={muscle === m.key}
            onPress={() => setMuscle(m.key)}
          />
        ))}
      </View>

      {groups.length === 0 ? (
        <Empty
          icon="search-outline"
          title="No exercises found"
          body="Try a different search term or clear the muscle filter."
        />
      ) : (
        groups.map((g) => (
          <View key={g.key} style={{ gap: 9 }}>
            <Row style={{ paddingHorizontal: 2 }}>
              <Eyebrow>{g.label}</Eyebrow>
              <Meta>{g.items.length} exercises</Meta>
            </Row>
            <Card flush>
              {g.items.map((e, i) => (
                <Pressable
                  key={e.id}
                  onPress={() => onSelect(e.id)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    s.row,
                    i === g.items.length - 1 && { borderBottomWidth: 0 },
                    pressed && { backgroundColor: C.line2 },
                  ]}>
                  <View style={s.thumb}>
                    <Ionicons name="barbell" size={20} color={C.red} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Name>{e.name}</Name>
                    <Meta>
                      {equipmentLabel(e.equipment)} · {e.compound ? 'Compound' : 'Isolation'}
                    </Meta>
                  </View>
                  {picking ? (
                    <Ionicons name="add-circle-outline" size={22} color={C.red} />
                  ) : (
                    <>
                      <Tag label="Guide" />
                      <Ionicons name="chevron-forward" size={15} color={C.faint} />
                    </>
                  )}
                </Pressable>
              ))}
            </Card>
          </View>
        ))
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    borderRadius: 12,
    backgroundColor: C.redWash,
  },
  bannerText: { fontSize: 13, fontWeight: '700', color: C.red, flex: 1 },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 42,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor: '#EDEFF2',
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', color: C.ink },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
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
});
