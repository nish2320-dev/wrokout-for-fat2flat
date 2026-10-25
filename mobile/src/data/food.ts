/**
 * Food lookup for the Meals tab: a built-in list of everyday foods, plus
 * barcode and name search against Open Food Facts (openfoodfacts.org), a free
 * public database that needs no account or API key. Only the barcode or the
 * search words are sent — nothing else from the app leaves the device.
 */

export type Food = {
  id: string;
  name: string;
  brand?: string;
  /** Calories per 100 g (or 100 ml for drinks). */
  kcal100: number;
  /** Protein grams per 100 g. */
  protein100: number;
  /** A typical portion, when one is known. */
  serving?: { grams: number; label: string };
  /** Extra search words for built-in foods. */
  aliases?: string[];
};

type Entry = [
  id: string,
  name: string,
  kcal100: number,
  protein100: number,
  grams?: number,
  label?: string,
  /** Other words people search with: "whey" for a protein shake, "soda" for cola. */
  aliases?: string,
];

/**
 * Everyday foods, drinks and takeaway staples that a packaged-food database
 * answers poorly (search "banana" there and you get banana bread). Typical
 * values from USDA FoodData Central and common chain menus; restaurant and
 * homemade dishes vary, and labels on packaged food are more exact.
 */
const ENTRIES: Entry[] = [
  // ---- coffee & tea ----
  ['coffee', 'Coffee, black', 1, 0.1, 240, '1 cup (240 ml)', 'drip americano brewed cold brew'],
  ['espresso', 'Espresso', 9, 0.1, 30, '1 shot (30 ml)', 'coffee'],
  ['coffee-cream-sugar', 'Coffee with cream and sugar', 25, 0.4, 240, '1 cup (240 ml)', 'regular milk'],
  ['latte', 'Latte, 2% milk', 40, 2.7, 473, '16 oz grande (473 ml)', 'coffee cafe starbucks'],
  ['latte-oat', 'Latte, oat milk', 40, 0.8, 473, '16 oz grande (473 ml)', 'coffee cafe starbucks'],
  ['cappuccino', 'Cappuccino, 2% milk', 30, 1.9, 473, '16 oz grande (473 ml)', 'coffee starbucks'],
  ['iced-coffee', 'Iced coffee, sweetened with milk', 35, 0.6, 473, '16 oz (473 ml)', 'coffee'],
  ['mocha', 'Mocha, 2% milk with whipped cream', 79, 2.8, 473, '16 oz grande (473 ml)', 'coffee chocolate starbucks'],
  ['frappuccino', 'Frappuccino, coffee', 49, 0.8, 473, '16 oz grande (473 ml)', 'coffee blended starbucks'],
  ['half-and-half', 'Half & half creamer', 131, 3.1, 30, '2 tbsp (30 ml)', 'cream coffee'],
  ['coffee-creamer', 'Coffee creamer, flavored', 333, 0, 15, '1 tbsp (15 ml)', 'cream'],
  ['tea', 'Tea, unsweetened', 1, 0, 240, '1 cup (240 ml)', 'green black herbal'],
  ['sweet-tea', 'Sweet tea', 36, 0, 473, '16 oz (473 ml)', 'iced'],
  ['chai-latte', 'Chai latte, 2% milk', 50, 1.7, 473, '16 oz grande (473 ml)', 'tea starbucks'],
  ['sugar', 'Sugar', 387, 0, 4, '1 tsp (4 g)', 'sweetener'],

  // ---- protein ----
  ['whey', 'Protein powder, whey', 400, 80, 30, '1 scoop (30 g)', 'shake supplement isolate'],
  ['shake-water', 'Protein shake with water', 36, 7.3, 330, '1 scoop + water (330 ml)', 'whey powder'],
  ['shake-milk', 'Protein shake with 2% milk', 88, 11.7, 274, '1 scoop + 1 cup milk', 'whey powder'],
  ['shake-rtd', 'Protein shake, ready to drink', 48, 9.1, 325, '1 bottle (11 oz)', 'premier fairlife muscle milk'],
  ['protein-bar', 'Protein bar', 350, 33, 60, '1 bar (60 g)', 'quest'],
  ['beef-jerky', 'Beef jerky', 410, 33, 28, '1 oz (28 g)', 'meat snack'],

  // ---- drinks ----
  ['whole-milk', 'Milk, whole', 61, 3.2, 244, '1 cup (244 ml)'],
  ['milk-2', 'Milk, 2%', 50, 3.3, 244, '1 cup (244 ml)', 'reduced fat'],
  ['skim-milk', 'Milk, skim', 34, 3.4, 245, '1 cup (245 ml)', 'nonfat fat free'],
  ['chocolate-milk', 'Chocolate milk, low-fat', 83, 3.2, 250, '1 cup (250 ml)'],
  ['almond-milk', 'Almond milk, unsweetened', 15, 0.4, 240, '1 cup (240 ml)'],
  ['oat-milk', 'Oat milk', 50, 1.3, 240, '1 cup (240 ml)', 'oatly'],
  ['soy-milk', 'Soy milk, unsweetened', 33, 2.9, 240, '1 cup (240 ml)'],
  ['orange-juice', 'Orange juice', 45, 0.7, 248, '1 cup (248 ml)', 'oj'],
  ['apple-juice', 'Apple juice', 46, 0.1, 248, '1 cup (248 ml)'],
  ['smoothie', 'Fruit smoothie', 60, 1, 473, '16 oz (473 ml)'],
  ['cola', 'Cola', 42, 0, 355, '1 can (355 ml)', 'soda coke pepsi pop soft drink'],
  ['diet-soda', 'Diet soda', 0, 0, 355, '1 can (355 ml)', 'coke zero diet coke pop'],
  ['sports-drink', 'Sports drink', 24, 0, 591, '1 bottle (20 oz)', 'gatorade powerade'],
  ['energy-drink', 'Energy drink', 44, 0, 250, '1 can (250 ml)', 'red bull monster'],
  ['beer', 'Beer', 43, 0.5, 355, '1 can (355 ml)'],
  ['light-beer', 'Beer, light', 29, 0.2, 355, '1 can (355 ml)'],
  ['wine', 'Wine', 85, 0.1, 150, '1 glass (150 ml)', 'red white'],
  ['liquor', 'Liquor (vodka, whiskey, rum)', 231, 0, 44, '1 shot (44 ml)', 'spirits tequila gin alcohol'],

  // ---- breakfast ----
  ['egg', 'Egg, whole', 143, 12.6, 50, '1 large (50 g)', 'boiled fried'],
  ['egg-white', 'Egg white', 52, 10.9, 33, '1 large (33 g)'],
  ['scrambled-eggs', 'Eggs, scrambled', 149, 9.9, 122, '2 eggs (122 g)'],
  ['oats', 'Oats, dry', 389, 16.9, 40, '½ cup (40 g)', 'oatmeal porridge'],
  ['cereal', 'Cereal, corn flakes', 357, 7.5, 28, '1 cup (28 g)'],
  ['granola', 'Granola', 471, 10, 61, '½ cup (61 g)'],
  ['pancake', 'Pancake', 227, 6.4, 77, '1 medium (77 g)', 'hotcake'],
  ['waffle', 'Waffle', 291, 7.9, 75, '1 round (75 g)'],
  ['bagel', 'Bagel, plain', 257, 10, 105, '1 bagel (105 g)'],
  ['cream-cheese', 'Cream cheese', 342, 6, 29, '2 tbsp (29 g)'],
  ['muffin', 'Muffin, blueberry', 377, 4.5, 113, '1 muffin (113 g)'],
  ['donut', 'Donut, glazed', 410, 4.5, 60, '1 donut (60 g)', 'doughnut'],
  ['bacon', 'Bacon, cooked', 541, 37, 8, '1 slice (8 g)'],
  ['greek-yogurt', 'Greek yogurt, plain nonfat', 59, 10.2, 170, '1 cup (170 g)', 'yoghurt'],
  ['yogurt', 'Yogurt, fruit low-fat', 99, 4, 170, '1 container (170 g)', 'yoghurt'],
  ['honey', 'Honey', 304, 0.3, 21, '1 tbsp (21 g)'],
  ['jam', 'Jam', 278, 0.4, 20, '1 tbsp (20 g)', 'jelly'],

  // ---- meat & fish ----
  ['chicken-breast', 'Chicken breast, cooked', 165, 31, 120, '1 portion (120 g)', 'grilled'],
  ['chicken-thigh', 'Chicken thigh, cooked, skinless', 179, 24.8, 100, '1 thigh (100 g)'],
  ['ground-beef', 'Ground beef 85% lean, cooked', 250, 26, 85, '3 oz (85 g)', 'mince hamburger'],
  ['ground-turkey', 'Ground turkey 93% lean, cooked', 213, 27, 85, '3 oz (85 g)'],
  ['steak', 'Steak, sirloin, cooked', 210, 29, 170, '6 oz (170 g)', 'beef'],
  ['pork-chop', 'Pork chop, cooked', 231, 24, 145, '1 chop (145 g)'],
  ['deli-turkey', 'Turkey, deli slices', 104, 17, 56, '2 oz (56 g)', 'lunch meat'],
  ['salmon', 'Salmon, cooked', 206, 22, 120, '1 fillet (120 g)', 'fish'],
  ['tuna', 'Tuna, canned in water', 116, 25.5, 85, '3 oz (85 g)', 'fish'],
  ['cod', 'Cod, cooked', 105, 23, 120, '1 fillet (120 g)', 'fish white'],
  ['shrimp', 'Shrimp, cooked', 99, 24, 85, '3 oz (85 g)', 'prawns'],
  ['tofu', 'Tofu, firm', 144, 17.3, 85, '3 oz (85 g)'],
  ['edamame', 'Edamame', 121, 11.9, 155, '1 cup (155 g)', 'soybeans'],

  // ---- grains, beans & starches ----
  ['white-rice', 'White rice, cooked', 130, 2.7, 158, '1 cup (158 g)'],
  ['brown-rice', 'Brown rice, cooked', 123, 2.7, 195, '1 cup (195 g)'],
  ['quinoa', 'Quinoa, cooked', 120, 4.4, 185, '1 cup (185 g)'],
  ['pasta', 'Pasta, cooked', 158, 5.8, 140, '1 cup (140 g)', 'spaghetti noodles macaroni'],
  ['white-bread', 'Bread, white', 265, 9, 28, '1 slice (28 g)', 'toast'],
  ['wheat-bread', 'Bread, whole wheat', 252, 12.4, 28, '1 slice (28 g)', 'toast'],
  ['flour-tortilla', 'Tortilla, flour', 312, 8.3, 45, '1 medium (45 g)', 'wrap'],
  ['corn-tortilla', 'Tortilla, corn', 218, 5.7, 26, '1 tortilla (26 g)'],
  ['potato', 'Potato, baked', 93, 2.5, 173, '1 medium (173 g)'],
  ['sweet-potato', 'Sweet potato, baked', 90, 2, 114, '1 medium (114 g)', 'yam'],
  ['lentils', 'Lentils, cooked', 116, 9, 198, '1 cup (198 g)', 'dal'],
  ['black-beans', 'Black beans, cooked', 132, 8.9, 172, '1 cup (172 g)'],
  ['chickpeas', 'Chickpeas, cooked', 164, 8.9, 164, '1 cup (164 g)', 'garbanzo'],
  ['hummus', 'Hummus', 166, 7.9, 30, '2 tbsp (30 g)'],
  ['ramen', 'Instant ramen, dry', 440, 10, 85, '1 package (85 g)', 'noodles'],

  // ---- fruit ----
  ['banana', 'Banana', 89, 1.1, 118, '1 medium (118 g)'],
  ['apple', 'Apple', 52, 0.3, 182, '1 medium (182 g)'],
  ['orange', 'Orange', 47, 0.9, 131, '1 medium (131 g)'],
  ['pear', 'Pear', 57, 0.4, 178, '1 medium (178 g)'],
  ['peach', 'Peach', 39, 0.9, 150, '1 medium (150 g)'],
  ['strawberries', 'Strawberries', 32, 0.7, 150, '1 cup (150 g)', 'berries'],
  ['blueberries', 'Blueberries', 57, 0.7, 148, '1 cup (148 g)', 'berries'],
  ['raspberries', 'Raspberries', 52, 1.2, 123, '1 cup (123 g)', 'berries'],
  ['grapes', 'Grapes', 69, 0.7, 151, '1 cup (151 g)'],
  ['pineapple', 'Pineapple', 50, 0.5, 165, '1 cup (165 g)'],
  ['mango', 'Mango', 60, 0.8, 165, '1 cup (165 g)'],
  ['watermelon', 'Watermelon', 30, 0.6, 152, '1 cup (152 g)', 'melon'],
  ['avocado', 'Avocado', 160, 2, 75, '½ avocado (75 g)', 'guacamole'],

  // ---- vegetables ----
  ['broccoli', 'Broccoli, cooked', 35, 2.4, 156, '1 cup (156 g)'],
  ['spinach', 'Spinach, raw', 23, 2.9, 30, '1 cup (30 g)'],
  ['salad', 'Salad greens', 17, 1.4, 85, '2 cups (85 g)', 'lettuce mixed'],
  ['carrot', 'Carrot, raw', 41, 0.9, 61, '1 medium (61 g)'],
  ['cucumber', 'Cucumber', 15, 0.7, 104, '1 cup sliced (104 g)'],
  ['tomato', 'Tomato', 18, 0.9, 123, '1 medium (123 g)'],
  ['bell-pepper', 'Bell pepper', 31, 1, 119, '1 medium (119 g)', 'capsicum'],
  ['onion', 'Onion', 40, 1.1, 110, '1 medium (110 g)'],
  ['mushrooms', 'Mushrooms', 22, 3.1, 70, '1 cup (70 g)'],
  ['green-beans', 'Green beans, cooked', 35, 1.9, 125, '1 cup (125 g)'],
  ['corn', 'Corn, sweet, cooked', 96, 3.4, 90, '1 ear (90 g)'],
  ['peas', 'Peas, cooked', 84, 5.4, 160, '1 cup (160 g)'],
  ['cauliflower', 'Cauliflower, cooked', 23, 1.8, 124, '1 cup (124 g)'],
  ['asparagus', 'Asparagus, cooked', 22, 2.4, 90, '6 spears (90 g)'],

  // ---- dairy, nuts & fats ----
  ['cheddar', 'Cheddar cheese', 403, 24.9, 28, '1 oz (28 g)', 'cheese'],
  ['mozzarella', 'Mozzarella, part-skim', 254, 24, 28, '1 oz / 1 string cheese (28 g)', 'cheese string'],
  ['parmesan', 'Parmesan', 431, 38, 5, '1 tbsp grated (5 g)', 'cheese'],
  ['feta', 'Feta cheese', 264, 14, 28, '1 oz (28 g)', 'cheese'],
  ['cottage-cheese', 'Cottage cheese, 2%', 81, 10.5, 113, '½ cup (113 g)', 'cheese'],
  ['butter', 'Butter', 717, 0.9, 14, '1 tbsp (14 g)'],
  ['olive-oil', 'Olive oil', 884, 0, 13.5, '1 tbsp (13.5 g)', 'cooking oil'],
  ['mayo', 'Mayonnaise', 680, 1, 14, '1 tbsp (14 g)', 'mayo'],
  ['ranch', 'Ranch dressing', 430, 1, 30, '2 tbsp (30 g)', 'salad dressing'],
  ['ketchup', 'Ketchup', 101, 1, 17, '1 tbsp (17 g)', 'catsup sauce'],
  ['peanut-butter', 'Peanut butter', 588, 25, 32, '2 tbsp (32 g)', 'pb'],
  ['almonds', 'Almonds', 579, 21, 28, '1 oz (28 g)', 'nuts'],
  ['peanuts', 'Peanuts, roasted', 585, 24, 28, '1 oz (28 g)', 'nuts'],
  ['cashews', 'Cashews', 553, 18, 28, '1 oz (28 g)', 'nuts'],
  ['walnuts', 'Walnuts', 654, 15.2, 28, '1 oz (28 g)', 'nuts'],
  ['chia', 'Chia seeds', 486, 16.5, 12, '1 tbsp (12 g)', 'seeds'],

  // ---- meals & takeaway ----
  ['pizza', 'Pizza, cheese', 266, 11.4, 107, '1 slice (107 g)'],
  ['pizza-pepperoni', 'Pizza, pepperoni', 290, 12.6, 111, '1 slice (111 g)'],
  ['cheeseburger', 'Cheeseburger', 252, 12.6, 119, '1 burger (119 g)', 'burger hamburger mcdonalds fast food'],
  ['big-burger', 'Burger, quarter pound with cheese', 257, 14.3, 202, '1 burger (202 g)', 'hamburger fast food'],
  ['fries', 'French fries', 312, 3.4, 117, '1 medium (117 g)', 'chips fast food'],
  ['nuggets', 'Chicken nuggets', 296, 15.3, 96, '6 pieces (96 g)', 'fast food'],
  ['burrito', 'Burrito, chicken, rice and beans', 165, 9, 400, '1 large (400 g)', 'chipotle mexican'],
  ['taco', 'Taco, beef', 210, 9.5, 78, '1 taco (78 g)', 'mexican'],
  ['sushi', 'Sushi, California roll', 128, 4.5, 200, '1 roll, 8 pieces (200 g)', 'japanese'],
  ['sandwich-turkey', 'Sandwich, turkey', 190, 11, 230, '1 sandwich (230 g)', 'sub subway'],
  ['pb-j', 'Peanut butter & jelly sandwich', 340, 10.5, 100, '1 sandwich (100 g)', 'pbj'],
  ['mac-cheese', 'Mac and cheese', 164, 6.6, 200, '1 cup (200 g)', 'macaroni'],
  ['fried-rice', 'Fried rice', 163, 4.7, 198, '1 cup (198 g)', 'chinese'],
  ['chicken-curry', 'Chicken curry with rice', 140, 8, 400, '1 plate (400 g)', 'indian'],
  ['chicken-salad', 'Chicken caesar salad', 127, 9.5, 300, '1 bowl (300 g)', 'caesar'],
  ['soup', 'Chicken noodle soup', 25, 1.6, 245, '1 cup (245 g)'],

  // ---- snacks & sweets ----
  ['chips', 'Potato chips', 536, 7, 28, '1 oz (28 g)', 'crisps'],
  ['pretzels', 'Pretzels', 380, 10, 28, '1 oz (28 g)'],
  ['popcorn', 'Popcorn, air-popped', 387, 13, 24, '3 cups (24 g)'],
  ['rice-cake', 'Rice cake', 387, 8.2, 9, '1 cake (9 g)'],
  ['dark-chocolate', 'Dark chocolate', 598, 7.8, 28, '1 oz (28 g)', 'candy'],
  ['milk-chocolate', 'Milk chocolate', 535, 7.7, 44, '1 bar (44 g)', 'candy'],
  ['cookie', 'Cookie, chocolate chip', 488, 5, 16, '1 cookie (16 g)', 'biscuit'],
  ['ice-cream', 'Ice cream, vanilla', 207, 3.5, 66, '½ cup (66 g)'],
];

export const COMMON_FOODS: Food[] = ENTRIES.map(([id, name, kcal100, protein100, grams, label, aliases]) => ({
  id: `common:${id}`,
  name,
  kcal100,
  protein100,
  serving: grams ? { grams, label: label ?? `${grams} g` } : undefined,
  aliases: aliases?.split(' '),
}));

/**
 * Edit distance where swapping two neighbouring letters counts as one typo,
 * so "cofee", "protien" and "bannana" all sit one step from the real word.
 */
function typoDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** 0 for a prefix match ("cof" → coffee), 1 for a one-typo match, null for none. */
function wordScore(typed: string, word: string): number | null {
  if (word.startsWith(typed)) return 0;
  // short words sit one typo from too many others ("beef" → "beer")
  if (typed.length < 5) return null;
  const best = Math.min(
    typoDistance(typed, word),
    typoDistance(typed, word.slice(0, typed.length)),
    typoDistance(typed, word.slice(0, typed.length + 1)),
  );
  return best <= 1 ? best : null;
}

const wordsOf = (f: Food) => [
  ...f.name.toLowerCase().split(/[^a-z0-9%]+/).filter(Boolean),
  ...(f.aliases ?? []),
];

/**
 * Built-in foods matching every word typed, in any order, by name or alias
 * and forgiving small typos. Exact matches come first, then name-order.
 */
export function searchCommon(query: string): Food[] {
  const typed = query.toLowerCase().split(/[^a-z0-9%]+/).filter(Boolean);
  if (typed.length === 0) return [];

  const scored: { food: Food; score: number; i: number }[] = [];
  COMMON_FOODS.forEach((food, i) => {
    const words = wordsOf(food);
    let score = 0;
    for (const t of typed) {
      const best = words.reduce<number | null>((acc, w) => {
        const s = wordScore(t, w);
        return s === null ? acc : acc === null ? s : Math.min(acc, s);
      }, null);
      if (best === null) return;
      score += best;
    }
    const name = food.name.toLowerCase();
    // a match on the food's own name beats one found only through an alias,
    // and "Milk, whole" is a better answer to "milk" than "Latte, 2% milk"
    if (!typed.every((t) => name.includes(t))) score += 0.5;
    if (name.startsWith(typed[0])) score -= 0.3;
    scored.push({ food, score, i });
  });

  // once something matches as typed, near-misses are just noise
  const exact = scored.some((x) => x.score < 1);
  return scored
    .filter((x) => !exact || x.score < 1)
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .map((x) => x.food);
}

/** Calories and protein for an amount in grams, rounded as meals store them. */
export const macrosFor = (food: Food, grams: number) => ({
  calories: Math.round((food.kcal100 * grams) / 100),
  protein: Math.round((food.protein100 * grams) / 100),
});

const num = (v: unknown) => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Turns an Open Food Facts product into a Food, or null when it lacks a name
 * or calorie data — a result we can't calculate from is worse than none.
 */
export function parseProduct(p: any): Food | null {
  if (!p || typeof p !== 'object') return null;
  const name = String(p.product_name || p.product_name_en || '').trim();
  if (!name) return null;

  const n = p.nutriments ?? {};
  // some products only list energy in kJ
  const kj = num(n.energy_100g);
  const kcal100 = num(n['energy-kcal_100g']) ?? (kj !== undefined ? kj / 4.184 : undefined);
  if (kcal100 === undefined || kcal100 < 0) return null;

  const grams = num(p.serving_quantity);
  const brand = String(p.brands || '').split(',')[0].trim();

  return {
    id: `off:${p.code ?? name}`,
    name,
    brand: brand || undefined,
    kcal100: Math.round(kcal100 * 10) / 10,
    protein100: Math.round((num(n.proteins_100g) ?? 0) * 10) / 10,
    serving:
      grams && grams > 0
        ? { grams, label: String(p.serving_size || '').trim() || `${grams} g` }
        : undefined,
  };
}

const BASE = 'https://world.openfoodfacts.org';
const FIELDS = 'code,product_name,product_name_en,brands,nutriments,serving_size,serving_quantity';
// Open Food Facts asks every app to identify itself
const HEADERS = { 'User-Agent': 'Fat2FlatFitness/1.0 (iOS)' };

async function getJson(url: string): Promise<any> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 15000);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: abort.signal });
    // a 404 is how the product endpoint says "no such barcode"
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Food database returned ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Looks up a scanned barcode. Null means not in the database; throws when offline. */
export async function lookupBarcode(code: string): Promise<Food | null> {
  const json = await getJson(`${BASE}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
  return json?.status === 1 ? parseProduct({ code, ...json.product }) : null;
}

/** Searches packaged foods by name. Throws when offline. */
export async function searchFoods(query: string): Promise<Food[]> {
  const q = encodeURIComponent(query.trim());
  const json = await getJson(
    `${BASE}/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=25&fields=${FIELDS}`,
  );
  const products: unknown[] = Array.isArray(json?.products) ? json.products : [];
  return products.map(parseProduct).filter((f): f is Food => f !== null);
}
