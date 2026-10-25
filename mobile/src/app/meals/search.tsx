import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Food, searchCommon, searchFoods } from '@/data/food';
import { C } from '@/theme';
import { Btn, Card, Empty, Eyebrow, Meta, Name, Screen } from '@/ui/kit';

type Online =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'done'; query: string; foods: Food[] };

export default function FoodSearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [online, setOnline] = useState<Online>({ kind: 'idle' });

  // the best few, so the online search button stays in view
  const common = searchCommon(query).slice(0, 8);
  const q = query.trim();

  // Online search runs on demand, not per keystroke: Open Food Facts limits
  // how often an app may search, and it's slower than the built-in list.
  const searchOnline = async () => {
    if (q === '') return;
    setOnline({ kind: 'loading' });
    try {
      setOnline({ kind: 'done', query: q, foods: await searchFoods(q) });
    } catch {
      setOnline({ kind: 'error' });
    }
  };

  const open = (food: Food) =>
    router.push({ pathname: '/meals/portion', params: { food: JSON.stringify(food) } });

  return (
    <Screen>
      <View style={s.search}>
        <Ionicons name="search" size={16} color={C.muted} />
        <TextInput
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            if (online.kind !== 'loading') setOnline({ kind: 'idle' });
          }}
          onSubmitEditing={searchOnline}
          placeholder="Search foods and drinks"
          placeholderTextColor={C.muted}
          style={s.searchInput}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {q === '' ? (
        <Empty
          icon="nutrition-outline"
          title="Find a food"
          body="Try coffee, protein shake, chicken breast or pizza. Everyday foods show up as you type; search online for packaged and branded foods."
        />
      ) : null}

      {common.length > 0 ? <FoodList title="Common foods" foods={common} onPick={open} /> : null}

      {q !== '' && online.kind === 'idle' ? (
        <Btn label={`Search online for "${q}"`} icon="globe-outline" ghost onPress={searchOnline} />
      ) : null}

      {online.kind === 'loading' ? (
        <View style={s.status}>
          <ActivityIndicator color={C.red} />
          <Meta>Searching Open Food Facts…</Meta>
        </View>
      ) : null}

      {online.kind === 'error' ? (
        <Card>
          <Empty
            icon="cloud-offline-outline"
            title="Couldn't reach the food database"
            body="Check your internet connection and try again, or enter the calories yourself."
          />
          <Btn label="Try again" onPress={searchOnline} />
        </Card>
      ) : null}

      {online.kind === 'done' ? (
        online.foods.length > 0 ? (
          <FoodList title="Online results" foods={online.foods} onPick={open} />
        ) : (
          <Empty
            icon="search-outline"
            title={`Nothing found for "${online.query}"`}
            body="Try fewer or different words, scan the barcode, or enter the calories yourself."
          />
        )
      ) : null}
    </Screen>
  );
}

function FoodList({ title, foods, onPick }: { title: string; foods: Food[]; onPick: (f: Food) => void }) {
  return (
    <View style={{ gap: 9 }}>
      <Eyebrow>{title}</Eyebrow>
      <Card flush>
        {foods.map((f, i) => (
          <Pressable
            key={`${f.id}-${i}`}
            onPress={() => onPick(f)}
            accessibilityRole="button"
            style={({ pressed }) => [
              s.row,
              i === foods.length - 1 && { borderBottomWidth: 0 },
              pressed && { backgroundColor: C.line2 },
            ]}>
            <View style={{ flex: 1 }}>
              <Name>{f.name}</Name>
              <Meta>
                {f.brand ? `${f.brand} · ` : ''}
                {Math.round(f.kcal100)} cal per 100 g
              </Meta>
            </View>
            <Ionicons name="chevron-forward" size={15} color={C.faint} />
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.line,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '600', color: C.ink },
  status: { alignItems: 'center', gap: 8, paddingVertical: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.line2,
  },
});
