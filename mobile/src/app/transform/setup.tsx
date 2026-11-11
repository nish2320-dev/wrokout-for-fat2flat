import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { EQUIPMENT, Equipment } from '@/data/exercises';
import { DIETS, Diet } from '@/data/mealplan';
import { startOfDay } from '@/data/stats';
import { useStore } from '@/data/store';
import { ACTIVITY, computeTargets, PACES, validateBody } from '@/data/targets';
import { Activity, Body, Pace, Program, Sex } from '@/data/types';
import { fmtWeight } from '@/data/units';
import { askNotifications } from '@/notify';
import { C, S } from '@/theme';
import { Btn, Card, CardTitle, Eyebrow, Label, Meta, Metric, Pill, Row, Screen } from '@/ui/kit';

const num = (t: string) => {
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : NaN;
};
const digits = (t: string) => t.replace(/[^0-9.]/g, '');

export default function TransformSetup() {
  // the form seeds its fields from the saved plan once, so wait until it has loaded
  const { ready } = useStore();
  return ready ? <SetupForm /> : null;
}

function SetupForm() {
  const router = useRouter();
  const { state, startProgram, updateProgram, updateProfile } = useStore();
  const units = state.profile.units;
  const existing = state.program;
  const lastWeight = state.weighIns[state.weighIns.length - 1]?.weight;

  const [sex, setSex] = useState<Sex>(existing?.body.sex ?? 'male');
  const [age, setAge] = useState(existing ? String(existing.body.age) : '');
  // height is entered as ft + in for lb users, cm otherwise
  const startCm = existing?.body.heightCm;
  const [cm, setCm] = useState(startCm ? String(Math.round(startCm)) : '');
  const [ft, setFt] = useState(startCm ? String(Math.floor(Math.round(startCm / 2.54) / 12)) : '');
  const [inch, setInch] = useState(startCm ? String(Math.round(startCm / 2.54) % 12) : '');
  const [weight, setWeight] = useState(
    existing ? fmtWeight(lastWeight ?? existing.body.startWeight) : lastWeight !== undefined ? fmtWeight(lastWeight) : '',
  );
  const [goal, setGoal] = useState(existing ? fmtWeight(existing.body.goalWeight) : '');
  const [activity, setActivity] = useState<Activity>(existing?.body.activity ?? 'light');
  const [pace, setPace] = useState<Pace>(existing?.pace ?? 'steady');
  const [days, setDays] = useState<Program['daysPerWeek']>(existing?.daysPerWeek ?? 3);
  const [equipment, setEquipment] = useState<Equipment[]>(existing?.equipment ?? ['dumbbells', 'bodyweight']);
  const [diet, setDiet] = useState<Diet | undefined>(state.profile.diet);

  const heightCm = units === 'lb' ? (num(ft) * 12 + (num(inch) || 0)) * 2.54 : num(cm);
  const body: Body = {
    sex,
    age: num(age),
    heightCm,
    // editing keeps the original starting weight; the current one only feeds the targets
    startWeight: existing ? existing.body.startWeight : num(weight),
    goalWeight: num(goal),
    activity,
  };
  const current = num(weight);
  const problem = validateBody({ ...body, startWeight: current }, units) ?? (equipment.length === 0 ? 'Pick at least one kind of equipment.' : null);
  const targets = problem ? null : computeTargets(body, pace, units, current);

  const toggleEquipment = (key: Equipment) =>
    setEquipment((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  const save = () => {
    if (!targets || problem) return;
    if (diet) updateProfile({ diet });
    if (existing) {
      updateProgram({ body, pace, daysPerWeek: days, equipment }, targets);
      router.back();
    } else {
      startProgram(
        { startedAt: startOfDay(Date.now()), daysPerWeek: days, equipment, body, pace, adjustments: [] },
        targets,
        current,
      );
      // for the workout and check-in reminders; the plan works without them
      askNotifications();
      router.replace('/transform');
    }
  };

  return (
    <Screen>
      {!existing ? (
        <View style={{ gap: 4, paddingHorizontal: 2 }}>
          <Text style={s.h1}>Your 12-week Transformation</Text>
          <Meta>
            Tell us about you and we’ll set your daily calories and protein, plan your workouts week by week, and coach you
            to the finish line.
          </Meta>
        </View>
      ) : null}

      <Section title="About you">
        <Row style={{ justifyContent: 'flex-start', gap: S.gap }}>
          <Pill label="Male" on={sex === 'male'} onPress={() => setSex('male')} />
          <Pill label="Female" on={sex === 'female'} onPress={() => setSex('female')} />
        </Row>
        <View style={s.pair}>
          <Field label="Age" value={age} onChange={setAge} placeholder="Years" />
          {units === 'lb' ? (
            <View style={[s.pair, { flex: 1, marginTop: 0 }]}>
              <Field label="Height" value={ft} onChange={setFt} placeholder="ft" />
              <Field label=" " value={inch} onChange={setInch} placeholder="in" />
            </View>
          ) : (
            <Field label="Height" value={cm} onChange={setCm} placeholder="cm" />
          )}
        </View>
        <View style={s.pair}>
          <Field label={`Current weight (${units})`} value={weight} onChange={setWeight} placeholder={units} decimal />
          <Field label={`Goal weight (${units})`} value={goal} onChange={setGoal} placeholder={units} decimal />
        </View>
      </Section>

      <Section title="How active are you outside workouts?">
        {ACTIVITY.map((a) => (
          <Pill key={a.key} label={a.label} on={activity === a.key} onPress={() => setActivity(a.key)} />
        ))}
        <Meta style={s.full}>{ACTIVITY.find((a) => a.key === activity)?.detail}</Meta>
      </Section>

      <Section title="How fast do you want to lose?">
        {PACES.map((p) => (
          <Pill
            key={p.key}
            label={`${p.label} · ${p.perWeek[units]} ${units}/wk`}
            on={pace === p.key}
            onPress={() => setPace(p.key)}
          />
        ))}
        <Meta style={s.full}>Steady is the sweet spot for most people: real progress without losing muscle.</Meta>
      </Section>

      <Section title="Workouts per week">
        {([3, 4, 5] as const).map((d) => (
          <Pill key={d} label={`${d} days`} on={days === d} onPress={() => setDays(d)} />
        ))}
      </Section>

      <Section title="Equipment you can use">
        {EQUIPMENT.map((e) => (
          <Pill key={e.key} label={e.label} on={equipment.includes(e.key)} onPress={() => toggleEquipment(e.key)} />
        ))}
      </Section>

      <Section title="How do you eat?">
        {DIETS.map((d) => (
          <Pill key={d.key} label={d.label} on={diet === d.key} onPress={() => setDiet(d.key)} />
        ))}
        <Meta style={s.full}>
          {diet ? DIETS.find((d) => d.key === diet)?.detail : 'We’ll build a daily meal plan that fits your targets. Veg includes eggs; Hindu Veg has no eggs.'}
        </Meta>
      </Section>

      <Card>
        <CardTitle>Your daily targets</CardTitle>
        {targets ? (
          <>
            <Row style={{ marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Label>Calories</Label>
                <Metric value={targets.calories.toLocaleString()} />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Protein</Label>
                <Metric value={`${targets.protein}`} unit="g" />
              </View>
            </Row>
            <Meta>
              {targets.maintaining
                ? `That’s maintenance (${targets.maintenance.toLocaleString()} cal), so the plan focuses on training and body composition.`
                : `You burn about ${targets.maintenance.toLocaleString()} cal a day; eating ${(targets.maintenance - targets.calories).toLocaleString()} less loses fat steadily.`}
            </Meta>
            {targets.note ? <Meta style={{ color: C.red }}>{targets.note}</Meta> : null}
          </>
        ) : (
          <Meta style={{ marginTop: 6 }}>{problem}</Meta>
        )}
      </Card>

      <Btn
        label={existing ? 'Save changes' : 'Start my Transformation'}
        icon={existing ? 'checkmark' : 'flame'}
        onPress={save}
        disabled={!targets}
      />
      <Meta style={{ textAlign: 'center' }}>
        General fitness guidance, not medical advice. Check with a doctor before starting a new diet or exercise program.
      </Meta>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Eyebrow>{title}</Eyebrow>
      <View style={s.wrap}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  decimal,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  decimal?: boolean;
}) {
  return (
    <View style={{ flex: 1, gap: 5 }}>
      <Label>{label}</Label>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(digits(t))}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        accessibilityLabel={label.trim() || placeholder}
        style={s.input}
      />
    </View>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '800', letterSpacing: -0.75, color: C.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  full: { width: '100%' },
  pair: { flexDirection: 'row', gap: S.gap, width: '100%', marginTop: 4 },
  input: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
  },
});
