// Supabase Edge Function: estimates the calories and protein in a meal photo
// with Claude. The app sends a small JPEG (base64); nothing is stored - the
// photo goes to Anthropic for this one request and the estimate comes back.
//
// Deploy: Supabase dashboard → Edge Functions → Deploy a new function → Via editor,
// name it "analyze-meal", paste this file, Deploy. Then Edge Functions → Secrets:
// add ANTHROPIC_API_KEY. (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided
// automatically.) Requires anonymous sign-ins to be enabled (Authentication →
// Sign In / Providers) so people without an account can use it.

import Anthropic from 'npm:@anthropic-ai/sdk@^1.8.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

/** Photos per person per day, to keep the AI bill predictable. */
const DAILY_LIMIT = 25;
/** ~5 MB of base64 is far more than a 1024 px JPEG needs. */
const MAX_IMAGE_CHARS = 5_000_000;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      description: 'Each distinct food or drink visible, largest first.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Plain name, e.g. "Chicken biryani" or "Greek salad".' },
          portion: { type: 'string', description: 'Estimated amount in everyday terms, e.g. "1½ cups" or "2 rotis".' },
          calories: { type: 'integer', description: 'Estimated kcal for the portion shown.' },
          protein: { type: 'integer', description: 'Estimated grams of protein for the portion shown.' },
        },
        required: ['name', 'portion', 'calories', 'protein'],
        additionalProperties: false,
      },
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    note: { type: 'string', description: 'One short sentence for the user, e.g. what was hard to judge. Empty if nothing to add.' },
  },
  required: ['items', 'confidence', 'note'],
  additionalProperties: false,
};

const DIETS: Record<string, string> = {
  nonveg: 'The person eats meat, fish and eggs.',
  veg: 'The person is vegetarian and eats eggs (no meat or fish).',
  hinduveg: 'The person is lacto-vegetarian: no meat, fish or eggs. Assume vegetarian versions of dishes (for example paneer rather than chicken).',
};

const SYSTEM = `You estimate the calories and protein in photos of meals for a fitness app used by people trying to lose fat. Many users eat Indian food as well as Western food, so recognise dishes such as dal, sabzi, roti, paratha, biryani, idli, dosa, poha and paneer dishes as readily as Western ones.

Identify each food and drink you can see and estimate its portion from visual cues (plate size, utensils, hands). Give realistic estimates for typical home or restaurant preparation, including visible oil, ghee, butter, sauces and dressings. If the photo is not food, return an empty items list with confidence "low" and a note saying so. Keep the note to one plain sentence.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (!user) return json({ error: 'Please close and reopen the app, then try again.' }, 401);

  let body: { image?: unknown; diet?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'That photo could not be read.' }, 400);
  }
  const image = typeof body.image === 'string' ? body.image : '';
  if (!image || image.length > MAX_IMAGE_CHARS) return json({ error: 'That photo is too large or empty. Try another one.' }, 400);
  const diet = typeof body.diet === 'string' ? DIETS[body.diet] : undefined;

  // fair-use limit per person per day
  const day = new Date().toISOString().slice(0, 10);
  const { data: usage } = await admin.from('ai_usage').select('count').eq('user_id', user.id).eq('day', day).maybeSingle();
  const used = usage?.count ?? 0;
  if (used >= DAILY_LIMIT) return json({ error: `You’ve used today’s ${DAILY_LIMIT} meal photos. Try again tomorrow, or log the meal by search.` }, 429);
  await admin.from('ai_usage').upsert({ user_id: user.id, day, count: used + 1 });

  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the function's secrets
  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // a quick estimate is the job: low effort keeps it fast and cheap
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: `${diet ? `${diet} ` : ''}Estimate this meal.` },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') return json({ error: 'That photo couldn’t be analysed. Try another one.' }, 422);
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return json({ error: 'No estimate came back. Please try again.' }, 502);
    return json(JSON.parse(text.text));
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'Busy right now. Please try again in a minute.' }, 503);
    if (e instanceof Anthropic.APIError) {
      console.error('Anthropic API error', e.status, e.message);
      return json({ error: 'The meal estimate service had a problem. Please try again.' }, 502);
    }
    console.error(e);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
