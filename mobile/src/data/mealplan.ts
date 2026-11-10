/**
 * Daily meal plans that fit the user's calorie and protein targets.
 *
 * Diets nest: Hindu Veg (lacto-vegetarian: dairy, no eggs, meat or fish) ⊂
 * Veg (adds eggs) ⊂ Non-veg (adds meat and fish). Each meal is tagged with the
 * least restrictive diet it needs, so a Veg plan can use every Hindu Veg meal
 * plus egg dishes, and so on.
 *
 * Portions scale in quarter steps to land each meal near its share of the day.
 * Workout days get a little more food and a protein-forward post-workout
 * snack; rest days get a little less, so the weekly total still matches the
 * target. Values are estimates for typical home recipes.
 */

export type Diet = 'hinduveg' | 'veg' | 'nonveg';
export type Slot = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export const DIETS: { key: Diet; label: string; detail: string }[] = [
  { key: 'nonveg', label: 'Non-veg', detail: 'Chicken, fish, mutton, eggs and dairy' },
  { key: 'veg', label: 'Veg', detail: 'Vegetarian with eggs and dairy' },
  { key: 'hinduveg', label: 'Hindu Veg', detail: 'Vegetarian with dairy, no eggs' },
];

const RANK: Record<Diet, number> = { hinduveg: 0, veg: 1, nonveg: 2 };
export const allowed = (mealDiet: Diet, userDiet: Diet) => RANK[mealDiet] <= RANK[userDiet];

export type MealIdea = {
  id: string;
  name: string;
  slot: Slot;
  /** The least restrictive diet this meal needs. */
  diet: Diet;
  cuisine: 'indian' | 'western';
  /** What one serving is. */
  serving: string;
  kcal: number;
  protein: number;
};

type Row = [id: string, name: string, slot: Slot, diet: Diet, cuisine: MealIdea['cuisine'], serving: string, kcal: number, protein: number];

const ROWS: Row[] = [
  // ---- breakfast ----
  ['poha', 'Poha with peanuts + glass of milk', 'breakfast', 'hinduveg', 'indian', '1½ cups poha, 1 cup milk', 400, 15],
  ['paneer-bhurji', 'Paneer bhurji + 2 rotis', 'breakfast', 'hinduveg', 'indian', '100 g paneer, 2 rotis', 460, 25],
  ['besan-chilla', 'Besan chilla with curd', 'breakfast', 'hinduveg', 'indian', '2 chillas, ½ cup curd', 380, 19],
  ['moong-chilla', 'Moong dal chilla stuffed with paneer', 'breakfast', 'hinduveg', 'indian', '2 chillas, 50 g paneer', 410, 24],
  ['upma', 'Vegetable upma + glass of milk', 'breakfast', 'hinduveg', 'indian', '1½ cups upma, 1 cup milk', 420, 14],
  ['oats-pb', 'Oats with milk, banana & peanut butter', 'breakfast', 'hinduveg', 'western', '½ cup oats, 1 cup milk, 1 banana, 1 tbsp PB', 450, 18],
  ['yogurt-bowl', 'Greek yogurt, berries & granola', 'breakfast', 'hinduveg', 'western', '1 cup yogurt, ½ cup berries, ⅓ cup granola', 380, 24],
  ['smoothie', 'Protein smoothie (whey, milk, banana, oats)', 'breakfast', 'hinduveg', 'western', '1 scoop whey, 1 cup milk, 1 banana, ¼ cup oats', 420, 34],
  ['masala-omelette', 'Masala omelette + 2 slices toast', 'breakfast', 'veg', 'indian', '3 eggs, 2 slices whole-wheat toast', 430, 26],
  ['egg-bhurji', 'Egg bhurji + 2 rotis', 'breakfast', 'veg', 'indian', '3 eggs, 2 rotis', 440, 24],
  ['avocado-eggs', 'Scrambled eggs on avocado toast', 'breakfast', 'veg', 'western', '2 eggs, ½ avocado, 2 slices toast', 460, 22],
  ['breakfast-wrap', 'Turkey & egg breakfast wrap', 'breakfast', 'nonveg', 'western', '1 tortilla, 2 eggs, 60 g turkey', 450, 32],

  // ---- lunch ----
  ['rajma-chawal', 'Rajma chawal + salad', 'lunch', 'hinduveg', 'indian', '1 cup rajma, 1 cup rice, salad', 520, 20],
  ['dal-roti', 'Dal, 2 rotis, sabzi & curd', 'lunch', 'hinduveg', 'indian', '1 cup dal, 2 rotis, 1 cup sabzi, ½ cup curd', 550, 24],
  ['palak-paneer', 'Palak paneer + 2 rotis', 'lunch', 'hinduveg', 'indian', '1 cup palak paneer, 2 rotis', 560, 27],
  ['chana-rice', 'Chana masala + brown rice', 'lunch', 'hinduveg', 'indian', '1 cup chana, 1 cup brown rice', 520, 20],
  ['paneer-wrap', 'Paneer tikka wrap', 'lunch', 'hinduveg', 'indian', '1 wrap, 100 g paneer tikka', 520, 30],
  ['quinoa-bowl', 'Quinoa bowl with chickpeas & feta', 'lunch', 'hinduveg', 'western', '1 cup quinoa, ½ cup chickpeas, 30 g feta', 500, 22],
  ['egg-curry', 'Egg curry + rice', 'lunch', 'veg', 'indian', '2 eggs in curry, 1 cup rice', 540, 24],
  ['egg-sandwich', 'Egg salad sandwich + fruit', 'lunch', 'veg', 'western', '2 eggs, 2 slices bread, 1 apple', 470, 22],
  ['chicken-rice', 'Chicken & rice bowl with veggies', 'lunch', 'nonveg', 'western', '150 g chicken, 1 cup rice, veggies', 550, 45],
  ['chicken-salad', 'Grilled chicken salad', 'lunch', 'nonveg', 'western', '150 g chicken, greens, dressing', 450, 42],
  ['tandoori-roti', 'Tandoori chicken + 2 rotis & salad', 'lunch', 'nonveg', 'indian', '2 pieces tandoori chicken, 2 rotis', 540, 46],
  ['fish-curry', 'Fish curry + rice', 'lunch', 'nonveg', 'indian', '150 g fish, 1 cup rice', 520, 36],

  // ---- dinner ----
  ['paneer-stirfry', 'Paneer & vegetable stir-fry + 2 rotis', 'dinner', 'hinduveg', 'indian', '100 g paneer, veggies, 2 rotis', 530, 30],
  ['dal-tadka', 'Dal tadka, jeera rice & salad', 'dinner', 'hinduveg', 'indian', '1 cup dal, 1 cup rice, salad', 520, 20],
  ['soya-curry', 'Soya chunks curry + 2 rotis', 'dinner', 'hinduveg', 'indian', '50 g soya chunks (dry), 2 rotis', 480, 34],
  ['khichdi', 'Moong dal khichdi with curd', 'dinner', 'hinduveg', 'indian', '1½ cups khichdi, ½ cup curd', 480, 20],
  ['tofu-bowl', 'Tofu & vegetable bowl with rice', 'dinner', 'hinduveg', 'western', '150 g tofu, veggies, 1 cup rice', 500, 28],
  ['lentil-pasta', 'Lentil pasta with tomato & veggies', 'dinner', 'hinduveg', 'western', '1½ cups lentil pasta, sauce, veggies', 510, 28],
  ['egg-fried-rice', 'Egg fried rice with vegetables', 'dinner', 'veg', 'indian', '2 eggs, 1½ cups rice, veggies', 530, 22],
  ['shakshuka', 'Shakshuka with crusty bread', 'dinner', 'veg', 'western', '3 eggs in tomato sauce, 1 roll', 460, 24],
  ['salmon-plate', 'Salmon, sweet potato & broccoli', 'dinner', 'nonveg', 'western', '150 g salmon, 1 sweet potato, broccoli', 560, 38],
  ['chicken-tikka', 'Chicken tikka masala + rice', 'dinner', 'nonveg', 'indian', '150 g chicken, 1 cup rice', 600, 42],
  ['turkey-taco', 'Turkey taco bowl', 'dinner', 'nonveg', 'western', '150 g ground turkey, rice, beans, salsa', 560, 40],
  ['chicken-stirfry', 'Chicken stir-fry + rice', 'dinner', 'nonveg', 'western', '150 g chicken, veggies, 1 cup rice', 520, 40],

  // ---- snacks (the high-protein ones double as post-workout) ----
  ['roasted-chana', 'Roasted chana', 'snack', 'hinduveg', 'indian', '50 g', 190, 10],
  ['sprouts-chaat', 'Sprouts chaat', 'snack', 'hinduveg', 'indian', '1 cup', 180, 12],
  ['paneer-tikka-bites', 'Paneer tikka bites', 'snack', 'hinduveg', 'indian', '100 g paneer', 270, 18],
  ['makhana-chaas', 'Roasted makhana + chaas', 'snack', 'hinduveg', 'indian', '1 cup makhana, 1 glass chaas', 180, 7],
  ['shake', 'Protein shake with milk', 'snack', 'hinduveg', 'western', '1 scoop whey, 1 cup milk', 240, 32],
  ['greek-yogurt', 'Greek yogurt with honey', 'snack', 'hinduveg', 'western', '1 cup yogurt, 1 tsp honey', 180, 17],
  ['apple-pb', 'Apple with peanut butter', 'snack', 'hinduveg', 'western', '1 apple, 1 tbsp PB', 200, 5],
  ['cottage-fruit', 'Cottage cheese with fruit', 'snack', 'hinduveg', 'western', '½ cup cottage cheese, ½ cup fruit', 160, 15],
  ['boiled-eggs', 'Boiled eggs with chaat masala', 'snack', 'veg', 'indian', '2 eggs', 155, 13],
  ['egg-toast', 'Egg on toast', 'snack', 'veg', 'western', '1 egg, 1 slice toast', 160, 10],
  ['chicken-bites', 'Chicken tikka bites', 'snack', 'nonveg', 'indian', '100 g chicken', 190, 30],
  ['tuna-crackers', 'Tuna on whole-grain crackers', 'snack', 'nonveg', 'western', '1 small can tuna, 6 crackers', 220, 22],
];

export const MEALS: MealIdea[] = ROWS.map(([id, name, slot, diet, cuisine, serving, kcal, protein]) => ({
  id,
  name,
  slot,
  diet,
  cuisine,
  serving,
  kcal,
  protein,
}));

export const SLOT_LABELS: Record<Slot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
};

/** Share of the day's calories for each slot. */
const SHARE: Record<Slot, number> = { breakfast: 0.25, lunch: 0.3, snack: 0.15, dinner: 0.3 };
const ORDER: Slot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

/**
 * The day's calorie target. Workout days get 100 more; rest days give that
 * back across the week, so the weekly total equals 7 × the base target.
 */
export function dayTarget(base: number, daysPerWeek: number, workoutDay: boolean) {
  const rest = 7 - daysPerWeek;
  if (workoutDay) return base + 100;
  return Math.round((base - (100 * daysPerWeek) / Math.max(rest, 1)) / 10) * 10;
}

export type PlannedMeal = {
  slot: Slot;
  /** Shown as "Snack" or "Post-workout". */
  label: string;
  meal: MealIdea;
  /** Portion multiplier in quarter steps, 0.5–2. */
  portion: number;
  kcal: number;
  protein: number;
};

export type DayPlan = { meals: PlannedMeal[]; kcal: number; protein: number; target: number };

/** A meal's main ingredient, so one day doesn't serve paneer four times. */
const MAINS = ['paneer', 'chicken', 'egg', 'turkey', 'fish', 'salmon', 'tuna', 'tofu', 'soya', 'dal', 'chana', 'rajma', 'yogurt'];
const mainOf = (m: MealIdea) => {
  const name = m.name.toLowerCase();
  return MAINS.find((k) => name.includes(k)) ?? m.id;
};

/** Small stable hash so the same day always gets the same plan. */
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

const portionFor = (kcal: number, budget: number) => Math.min(2, Math.max(0.5, Math.round((budget / kcal) * 4) / 4));

export const portionLabel = (p: number) => {
  if (p === 1) return '1 serving';
  const whole = Math.floor(p);
  const frac = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' }[(p - whole) as 0 | 0.25 | 0.5 | 0.75] ?? '';
  return `${whole || ''}${frac} servings`;
};

/**
 * One day's plan. `dateKey` (e.g. "2026-11-10") keeps it stable through the
 * day; `swaps` moves a slot to its next option when the user taps Swap.
 */
export function planDay(opts: {
  dateKey: string;
  diet: Diet;
  calories: number;
  workoutDay: boolean;
  swaps?: Partial<Record<Slot, number>>;
}): DayPlan {
  const { dateKey, diet, calories, workoutDay, swaps = {} } = opts;
  const used = new Set<string>();
  const mains = new Map<string, number>();
  const meals: PlannedMeal[] = [];

  for (const slot of ORDER) {
    let pool = MEALS.filter((m) => m.slot === slot && allowed(m.diet, diet));
    // after a workout, favour snacks with real protein in them
    if (slot === 'snack' && workoutDay) pool = pool.filter((m) => m.protein >= 12);
    pool = pool.filter((m) => !used.has(m.id));
    // at most two meals a day built on the same main ingredient
    const varied = pool.filter((m) => (mains.get(mainOf(m)) ?? 0) < 2);
    if (varied.length > 0) pool = varied;
    const i = (hash(`${dateKey}:${diet}:${slot}`) + (swaps[slot] ?? 0)) % pool.length;
    const meal = pool[i];
    used.add(meal.id);
    mains.set(mainOf(meal), (mains.get(mainOf(meal)) ?? 0) + 1);
    const portion = portionFor(meal.kcal, calories * SHARE[slot]);
    meals.push({
      slot,
      label: slot === 'snack' && workoutDay ? 'Post-workout' : SLOT_LABELS[slot],
      meal,
      portion,
      kcal: Math.round(meal.kcal * portion),
      protein: Math.round(meal.protein * portion),
    });
  }

  // big targets can outgrow four meals even at double portions: add a snack
  const total = () => meals.reduce((n, m) => n + m.kcal, 0);
  if (calories - total() > 220) {
    const extras = MEALS.filter((m) => m.slot === 'snack' && allowed(m.diet, diet) && !used.has(m.id));
    const meal = extras[hash(`${dateKey}:${diet}:extra`) % extras.length];
    const portion = portionFor(meal.kcal, calories - total());
    meals.splice(3, 0, {
      slot: 'snack',
      label: 'Snack',
      meal,
      portion,
      kcal: Math.round(meal.kcal * portion),
      protein: Math.round(meal.protein * portion),
    });
  }

  // quarter-step rounding can stack up: trim or top up portions until the
  // day sits within about 4% of the target, one quarter at a time
  const setPortion = (m: PlannedMeal, portion: number) => {
    m.portion = portion;
    m.kcal = Math.round(m.meal.kcal * portion);
    m.protein = Math.round(m.meal.protein * portion);
  };
  for (let step = 0; step < 12; step++) {
    const off = total() - calories;
    if (Math.abs(off) <= calories * 0.04) break;
    const candidates = meals.filter((m) => (off > 0 ? m.portion > 0.5 : m.portion < 2));
    if (candidates.length === 0) break;
    // trim the biggest meal, or top up the smallest
    const m = candidates.sort((a, b) => (off > 0 ? b.kcal - a.kcal : a.kcal - b.kcal))[0];
    const change = m.meal.kcal * 0.25;
    // stop if the change would overshoot by more than it fixes
    if (change > Math.abs(off) * 2) break;
    setPortion(m, m.portion + (off > 0 ? -0.25 : 0.25));
  }

  return {
    meals,
    kcal: total(),
    protein: meals.reduce((n, m) => n + m.protein, 0),
    target: calories,
  };
}

/** How a planned meal is logged on the Meals tab. */
export const loggedName = (m: PlannedMeal) =>
  m.portion === 1 ? m.meal.name : `${m.meal.name} (${portionLabel(m.portion)})`;
