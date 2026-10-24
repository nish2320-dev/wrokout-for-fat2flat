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
};

const c = (
  id: string,
  name: string,
  kcal100: number,
  protein100: number,
  grams?: number,
  label?: string,
): Food => ({
  id: `common:${id}`,
  name,
  kcal100,
  protein100,
  serving: grams ? { grams, label: label ?? `${grams} g` } : undefined,
});

/**
 * Everyday foods that a packaged-food database answers poorly (search
 * "banana" there and you get banana bread). Typical values from USDA
 * FoodData Central; labels on packaged food are more exact.
 */
export const COMMON_FOODS: Food[] = [
  c('banana', 'Banana', 89, 1.1, 118, '1 medium (118 g)'),
  c('apple', 'Apple', 52, 0.3, 182, '1 medium (182 g)'),
  c('orange', 'Orange', 47, 0.9, 131, '1 medium (131 g)'),
  c('strawberries', 'Strawberries', 32, 0.7, 150, '1 cup (150 g)'),
  c('blueberries', 'Blueberries', 57, 0.7, 148, '1 cup (148 g)'),
  c('grapes', 'Grapes', 69, 0.7, 151, '1 cup (151 g)'),
  c('avocado', 'Avocado', 160, 2, 75, '½ avocado (75 g)'),
  c('egg', 'Egg, whole', 143, 12.6, 50, '1 large (50 g)'),
  c('egg-white', 'Egg white', 52, 10.9, 33, '1 large (33 g)'),
  c('chicken-breast', 'Chicken breast, cooked', 165, 31, 120, '1 portion (120 g)'),
  c('ground-beef', 'Ground beef 85% lean, cooked', 250, 26, 85, '3 oz (85 g)'),
  c('salmon', 'Salmon, cooked', 206, 22, 120, '1 fillet (120 g)'),
  c('tuna', 'Tuna, canned in water', 116, 25.5, 85, '3 oz (85 g)'),
  c('shrimp', 'Shrimp, cooked', 99, 24, 85, '3 oz (85 g)'),
  c('bacon', 'Bacon, cooked', 541, 37, 8, '1 slice (8 g)'),
  c('tofu', 'Tofu, firm', 144, 17.3, 85, '3 oz (85 g)'),
  c('white-rice', 'White rice, cooked', 130, 2.7, 158, '1 cup (158 g)'),
  c('brown-rice', 'Brown rice, cooked', 123, 2.7, 195, '1 cup (195 g)'),
  c('quinoa', 'Quinoa, cooked', 120, 4.4, 185, '1 cup (185 g)'),
  c('pasta', 'Pasta, cooked', 158, 5.8, 140, '1 cup (140 g)'),
  c('oats', 'Oats, dry', 389, 16.9, 40, '½ cup (40 g)'),
  c('white-bread', 'Bread, white', 265, 9, 28, '1 slice (28 g)'),
  c('wheat-bread', 'Bread, whole wheat', 252, 12.4, 28, '1 slice (28 g)'),
  c('potato', 'Potato, baked', 93, 2.5, 173, '1 medium (173 g)'),
  c('sweet-potato', 'Sweet potato, baked', 90, 2, 114, '1 medium (114 g)'),
  c('broccoli', 'Broccoli, cooked', 35, 2.4, 156, '1 cup (156 g)'),
  c('spinach', 'Spinach, raw', 23, 2.9, 30, '1 cup (30 g)'),
  c('carrot', 'Carrot, raw', 41, 0.9, 61, '1 medium (61 g)'),
  c('lentils', 'Lentils, cooked', 116, 9, 198, '1 cup (198 g)'),
  c('black-beans', 'Black beans, cooked', 132, 8.9, 172, '1 cup (172 g)'),
  c('hummus', 'Hummus', 166, 7.9, 30, '2 tbsp (30 g)'),
  c('whole-milk', 'Milk, whole', 61, 3.2, 244, '1 cup (244 ml)'),
  c('milk-2', 'Milk, 2%', 50, 3.3, 244, '1 cup (244 ml)'),
  c('skim-milk', 'Milk, skim', 34, 3.4, 245, '1 cup (245 ml)'),
  c('greek-yogurt', 'Greek yogurt, plain nonfat', 59, 10.2, 170, '1 cup (170 g)'),
  c('cottage-cheese', 'Cottage cheese, 2%', 81, 10.5, 113, '½ cup (113 g)'),
  c('cheddar', 'Cheddar cheese', 403, 24.9, 28, '1 oz (28 g)'),
  c('butter', 'Butter', 717, 0.9, 14, '1 tbsp (14 g)'),
  c('olive-oil', 'Olive oil', 884, 0, 13.5, '1 tbsp (13.5 g)'),
  c('peanut-butter', 'Peanut butter', 588, 25, 32, '2 tbsp (32 g)'),
  c('almonds', 'Almonds', 579, 21, 28, '1 oz (28 g)'),
  c('pizza', 'Pizza, cheese', 266, 11.4, 107, '1 slice (107 g)'),
  c('orange-juice', 'Orange juice', 45, 0.7, 248, '1 cup (248 ml)'),
  c('cola', 'Cola', 42, 0, 355, '1 can (355 ml)'),
  c('beer', 'Beer', 43, 0.5, 355, '1 can (355 ml)'),
];

/** Built-in foods whose name contains every word typed, in any order. */
export function searchCommon(query: string): Food[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return COMMON_FOODS.filter((f) => {
    const name = f.name.toLowerCase();
    return words.every((w) => name.includes(w));
  });
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
