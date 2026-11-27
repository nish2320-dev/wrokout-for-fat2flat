import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { listClients, markDraft, sendMealPlan, type ClientRow } from '@/cloud/coachApi';
import { useCloud } from '@/cloud/CloudProvider';
import { errorText } from '@/cloud/supabase';
import { PLAN_SLOTS, planTotals, samplePlan, type PlanMeal, type PlanSlot } from '@/data/coachMealPlans';
import { DIETS, type Diet } from '@/data/mealplan';
import { goalsFor } from '@/data/macros';
import { macroLine, mealTotals } from '@/data/myMeals';
import { useStore } from '@/data/store';
import type { MealItem } from '@/data/types';
import { C, S } from '@/theme';
import { Btn, Card, CardTitle, Eyebrow, Meta, Name, Pill, Row, Screen } from '@/ui/kit';
import { mealDraft, useMealDraft } from '@/ui/mealDraft';

const digits = (t: string) => t.replace(/[^0-9]/g, '');

/** The coach writes a day of meals and sends it to one or more clients. */
export default function BuildMealPlan() {
  const { to, copy, draft } = useLocalSearchParams<{ to?: string; copy?: string; draft?: string }>();
  const router = useRouter();
  const cloud = useCloud();
  const { state } = useStore();
  const start = useMemo(() => {
    try {
      return copy ? (JSON.parse(copy) as { name: string; note: string; meals: PlanMeal[] }) : null;
    } catch {
      return null;
    }
  }, [copy]);
  const [name, setName] = useState(start?.name ?? 'Meal plan');
  const [note, setNote] = useState(start?.note ?? '');
  const [showEvening, setShowEvening] = useState(!!start?.meals.some((m) => m.slot === 'snack2'));
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [chosen, setChosen] = useState<string[]>(to ? [to] : []);
  const [sending, setSending] = useState(false);
  const [sampleDiet, setSampleDiet] = useState<Diet>('veg');
  const [sampleCal, setSampleCal] = useState('2000');
  const [seed, setSeed] = useState(1);
  const coachId = cloud.coach ? cloud.userId : null;

  // one draft list per meal; cleared when leaving
  useEffect(() => {
    for (const s of PLAN_SLOTS) mealDraft.set(s.key, start?.meals.find((m) => m.slot === s.key)?.items ?? []);
    return () => mealDraft.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!coachId) return;
    listClients(coachId)
      .then((cs) => setClients(cs.sort((a, b) => a.name.localeCompare(b.name))))
      .catch((e) => {
        Alert.alert('Could not load clients', errorText(e));
        setClients([]);
      });
  }, [coachId]);

  const breakfast = useMealDraft('breakfast');
  const lunch = useMealDraft('lunch');
  const snack = useMealDraft('snack');
  const dinner = useMealDraft('dinner');
  const snack2 = useMealDraft('snack2');
  const bySlot: Record<PlanSlot, MealItem[]> = { breakfast, lunch, snack, dinner, snack2 };
  const meals: PlanMeal[] = PLAN_SLOTS.map((s) => ({ slot: s.key, items: bySlot[s.key] })).filter((m) => m.items.length > 0);
  const totals = planTotals(meals);
  const one = clients?.find((c) => c.user_id === chosen[0]);
  // compare with the client's goals when sending to one person
  const theirGoals = chosen.length === 1 && one && 'calorieGoal' in one.summary ? goalsFor({ calorieGoal: one.summary.calorieGoal, proteinGoal: one.summary.proteinGoal }) : null;

  const fill = (meals: PlanMeal[]) => {
    for (const s of PLAN_SLOTS) mealDraft.set(s.key, meals.find((m) => m.slot === s.key)?.items ?? []);
    if (meals.some((m) => m.slot === 'snack2')) setShowEvening(true);
  };
  const confirmReplace = (go: () => void) =>
    meals.length === 0
      ? go()
      : Alert.alert('Replace the foods?', 'This swaps your current meals for a sample you can then edit.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', onPress: go },
        ]);
  const buildSample = (diet: Diet, calories: number, nextSeed = seed + 1) =>
    confirmReplace(() => {
      setSeed(nextSeed);
      fill(samplePlan(diet, calories, nextSeed));
    });
  // the one client being planned for, when their phone has sent their targets
  const target = chosen.length === 1 && one && 'calorieGoal' in one.summary ? one.summary : null;
  const fitToClient = () => {
    if (!target) return;
    const diet = (target.diet ?? sampleDiet) as Diet;
    setSampleDiet(diet);
    setSampleCal(String(target.calorieGoal));
    if (name === 'Meal plan') setName(`${one!.name.split(' ')[0]}’s meal plan`);
    buildSample(diet, target.calorieGoal);
  };

  const send = async () => {
    if (!cloud.coach || !clients) return;
    if (!name.trim()) return Alert.alert('Name the plan', 'For example “Week 1 meal plan”.');
    if (meals.length === 0) return Alert.alert('Add some food', 'Add at least one food to a meal.');
    const recipients = clients.filter((c) => chosen.includes(c.user_id));
    if (recipients.length === 0) return Alert.alert('Choose who gets it', 'Tap at least one client’s name.');
    setSending(true);
    try {
      const n = await sendMealPlan(cloud.coach.name, recipients, { name, note, meals });
      if (draft) await markDraft(draft, 'sent').catch(() => {});
      Alert.alert('Sent', n === 1 ? `${recipients[0].name.split(' ')[0]} will see it on their Meals tab.` : `${n} clients will see it on their Meals tab.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Could not send', errorText(e));
    } finally {
      setSending(false);
    }
  };

  const slots = PLAN_SLOTS.filter((s) => s.key !== 'snack2' || showEvening);

  return (
    <Screen>
      <Card style={{ gap: 10 }}>
        <Eyebrow>Plan name</Eyebrow>
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Week 1 meal plan" placeholderTextColor={C.faint} style={s.input} maxLength={80} />
        <Eyebrow>Note for your client (optional)</Eyebrow>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Swap rice for roti any day you like."
          placeholderTextColor={C.faint}
          style={[s.input, { minHeight: 60 }]}
          multiline
          maxLength={500}
        />
      </Card>

      <Card style={{ gap: 4 }}>
        <CardTitle>Day total</CardTitle>
        <Meta>{meals.length ? macroLine(totals) : 'Add foods to the meals below.'}</Meta>
        {theirGoals && meals.length ? (
          <Meta>
            {one!.name.split(' ')[0]}’s targets: {theirGoals.calories.toLocaleString()} cal · {theirGoals.protein} g protein
          </Meta>
        ) : null}
      </Card>

      <Card style={{ gap: 10 }}>
        <CardTitle>Start from a sample</CardTitle>
        {target ? (
          <>
            <Meta>
              Built from {one!.name.split(' ')[0]}’s targets: {target.calorieGoal.toLocaleString()} cal, {target.proteinGoal} g protein
              {target.diet ? `, ${DIETS.find((d) => d.key === target.diet)?.label ?? ''}` : ''}.
            </Meta>
            <Btn label={`Fit to ${one!.name.split(' ')[0]}’s targets`} icon="sparkles-outline" onPress={fitToClient} />
            <Meta>Or choose your own:</Meta>
          </>
        ) : (
          <Meta>A full day sized to the calories you choose. Change anything before sending.</Meta>
        )}
        <View style={s.chips}>
          {DIETS.map((d) => (
            <Pill key={d.key} label={d.label} on={sampleDiet === d.key} onPress={() => setSampleDiet(d.key)} />
          ))}
        </View>
        <Row style={{ gap: S.gap }}>
          <TextInput value={sampleCal} onChangeText={(v) => setSampleCal(digits(v))} keyboardType="number-pad" placeholder="Calories" placeholderTextColor={C.faint} style={[s.input, { flex: 1 }]} />
          <Btn label="Build" icon="restaurant-outline" ghost onPress={() => buildSample(sampleDiet, parseInt(sampleCal, 10) || 2000)} style={{ flex: 1 }} />
        </Row>
        {meals.length ? <Meta>Don’t like it? Tap Build again for a different day.</Meta> : null}
      </Card>

      {slots.map(({ key, label }) => (
        <SlotCard key={key} slot={key} label={label} items={bySlot[key]} />
      ))}
      {!showEvening ? <Btn label="Add an evening snack" icon="add" ghost onPress={() => setShowEvening(true)} /> : null}

      <Card style={{ gap: 10 }}>
        <CardTitle>Send to</CardTitle>
        {clients === null ? (
          <Meta>Loading your clients…</Meta>
        ) : clients.length === 0 ? (
          <Meta>No clients yet. Share your coach code first.</Meta>
        ) : (
          <>
            <View style={s.chips}>
              {clients.map((c) => (
                <Pill
                  key={c.user_id}
                  label={c.name}
                  on={chosen.includes(c.user_id)}
                  onPress={() => setChosen((cur) => (cur.includes(c.user_id) ? cur.filter((x) => x !== c.user_id) : [...cur, c.user_id]))}
                />
              ))}
            </View>
            {clients.length > 1 ? (
              <Pressable onPress={() => setChosen(chosen.length === clients.length ? [] : clients.map((c) => c.user_id))} accessibilityRole="button">
                <Text style={s.link}>{chosen.length === clients.length ? 'Clear all' : 'Choose everyone'}</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </Card>

      <Btn
        label={sending ? 'Sending…' : chosen.length > 1 ? `Send to ${chosen.length} clients` : 'Send meal plan'}
        icon="send"
        onPress={send}
        disabled={sending || meals.length === 0 || chosen.length === 0 || !name.trim()}
      />
      <Meta style={{ textAlign: 'center' }}>It replaces their automatic meal plan until you remove it. Your saved meals ({state.myMeals?.length ?? 0}) can be added to any meal.</Meta>
    </Screen>
  );
}

/** One meal of the plan: its foods, and ways to add more. */
function SlotCard({ slot, label, items }: { slot: PlanSlot; label: string; items: MealItem[] }) {
  const router = useRouter();
  const { state } = useStore();
  const [mode, setMode] = useState<'none' | 'mine' | 'type'>('none');
  const [manual, setManual] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  const myMeals = state.myMeals ?? [];
  const t = mealTotals(items);

  const addManual = () => {
    if (!manual.name.trim() || manual.calories === '') return;
    mealDraft.add(
      {
        name: manual.name.trim(),
        calories: parseInt(manual.calories, 10) || 0,
        protein: parseInt(manual.protein, 10) || 0,
        ...(manual.carbs !== '' || manual.fat !== '' ? { carbs: parseInt(manual.carbs, 10) || 0, fat: parseInt(manual.fat, 10) || 0 } : {}),
      },
      slot,
    );
    setManual({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  };

  return (
    <Card flush>
      <Row style={{ paddingHorizontal: 14, paddingBottom: 8 }}>
        <CardTitle>{label}</CardTitle>
        <Meta>{items.length ? `${t.calories.toLocaleString()} cal · ${t.protein} g P` : ''}</Meta>
      </Row>
      {items.map((it, i) => (
        <View key={`${it.name}-${i}`} style={s.row}>
          <View style={{ flex: 1 }}>
            <Name>{it.name}</Name>
            <Meta>{macroLine(it)}</Meta>
          </View>
          <Pressable onPress={() => mealDraft.remove(slot, i)} hitSlop={10} accessibilityLabel={`Remove ${it.name}`}>
            <Ionicons name="close" size={17} color={C.faint} />
          </Pressable>
        </View>
      ))}
      <View style={[s.chips, { paddingHorizontal: 14, paddingTop: 10 }]}>
        <Pill
          label="Search food"
          on={false}
          onPress={() => {
            mealDraft.target(slot);
            router.push({ pathname: '/meals/search', params: { for: 'meal' } });
          }}
        />
        {myMeals.length ? <Pill label="My meals" on={mode === 'mine'} onPress={() => setMode(mode === 'mine' ? 'none' : 'mine')} /> : null}
        <Pill label="Type it in" on={mode === 'type'} onPress={() => setMode(mode === 'type' ? 'none' : 'type')} />
      </View>
      {mode === 'mine' ? (
        <View style={[s.chips, { paddingHorizontal: 14, paddingTop: 8 }]}>
          {myMeals.map((m) => (
            <Pill key={m.id} label={m.name} on={false} onPress={() => m.items.forEach((it) => mealDraft.add(it, slot))} />
          ))}
        </View>
      ) : null}
      {mode === 'type' ? (
        <View style={{ paddingHorizontal: 14, paddingTop: 8, gap: 8 }}>
          <TextInput value={manual.name} onChangeText={(v) => setManual((m) => ({ ...m, name: v }))} placeholder="Food, e.g. 2 boiled eggs" placeholderTextColor={C.faint} style={s.input} />
          <View style={s.pair}>
            <TextInput value={manual.calories} onChangeText={(v) => setManual((m) => ({ ...m, calories: digits(v) }))} placeholder="Calories" placeholderTextColor={C.faint} keyboardType="number-pad" style={[s.input, { flex: 1 }]} />
            <TextInput value={manual.protein} onChangeText={(v) => setManual((m) => ({ ...m, protein: digits(v) }))} placeholder="Protein g" placeholderTextColor={C.faint} keyboardType="number-pad" style={[s.input, { flex: 1 }]} />
          </View>
          <View style={s.pair}>
            <TextInput value={manual.carbs} onChangeText={(v) => setManual((m) => ({ ...m, carbs: digits(v) }))} placeholder="Carbs g" placeholderTextColor={C.faint} keyboardType="number-pad" style={[s.input, { flex: 1 }]} />
            <TextInput value={manual.fat} onChangeText={(v) => setManual((m) => ({ ...m, fat: digits(v) }))} placeholder="Fat g" placeholderTextColor={C.faint} keyboardType="number-pad" style={[s.input, { flex: 1 }]} />
          </View>
          <Btn label="Add food" icon="add" ghost onPress={addManual} disabled={!manual.name.trim() || manual.calories === ''} />
        </View>
      ) : null}
    </Card>
  );
}

const s = StyleSheet.create({
  input: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: C.wash,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: C.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pair: { flexDirection: 'row', gap: S.gap },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line2 },
  link: { fontSize: 14, fontWeight: '700', color: C.red },
});
