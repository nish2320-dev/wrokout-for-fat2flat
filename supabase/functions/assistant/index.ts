// Supabase Edge Function: "Ask Fat2Flat", the in-app AI assistant.
// The app sends the recent conversation plus a short summary of the user's
// own plan and progress; Claude answers in a friendly coach voice. Nothing is
// stored here - the conversation lives on the user's phone.
//
// Deploy like analyze-meal: Edge Functions → Deploy a new function → Via editor,
// name "assistant", paste this file, Deploy, then turn off "Verify JWT with
// legacy secret" in its Settings (this code checks the session itself).
// Uses the same ANTHROPIC_API_KEY secret.

import Anthropic from 'npm:@anthropic-ai/sdk@^1.8.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

/** Messages per person per day. */
const DAILY_LIMIT = 40;
const MAX_TURNS = 20;
const MAX_MESSAGE_CHARS = 2000;
const MAX_CONTEXT_CHARS = 6000;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SYSTEM = `You are the AI assistant inside Fat2Flat Fitness, a workout, meal-planning and fat-loss app. People open you to ask quick questions about training, food, their plan and their progress.

How to answer:
- Sound like a friendly, encouraging personal trainer: warm, direct and practical.
- Keep it short: usually 2 to 5 sentences, or a short list when steps or options help. No long essays, no headings.
- Use the facts about this person below (their targets, plan, recent workouts, meals, weight trend and diet) to make answers specific to them. Never invent numbers you weren't given; if you need something you don't have, ask.
- Use their units (lb or kg) and respect their diet: for "Veg" suggest no meat or fish; for "Hindu Veg" suggest no meat, fish or eggs. Many users eat Indian food, so Indian options are as welcome as Western ones.
- You are an AI, not their personal trainer. If they have a coach and want to change their plan, targets or schedule, give your view briefly and suggest they tap "Ask my coach" to check with them. Never claim to be their coach.
- When it helps, point them to the right part of the app: Home (today's calories, water, Transformation card), Workouts (generate a workout), Meals (daily meal plan, log by photo, barcode or search), Progress (charts, check-ins, before & after photos), Profile (goals, health app, coach).

Safety:
- You give general fitness and nutrition guidance, not medical advice.
- For pain, injury, dizziness, chest pain, shortness of breath, pregnancy, medications, diabetes, heart conditions, eating disorders or any medical condition: give only general, cautious information and recommend a doctor (and their coach, if they have one). If they describe chest pain, fainting or another emergency, tell them to stop exercising and seek urgent medical help.
- Never recommend eating under 1,200 calories a day (women) or 1,500 (men), extreme fasting, crash diets, dehydration tricks, or supplements beyond everyday basics such as protein powder or creatine.
- If someone seems to be struggling with their relationship with food or their body, respond kindly, avoid numbers-focused advice, and encourage them to talk to a doctor or someone they trust.`;

type Turn = { role: 'user' | 'assistant'; content: string };

function validTurns(raw: unknown): Turn[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_TURNS) return null;
  const turns: Turn[] = [];
  for (const t of raw) {
    const role = (t as Turn)?.role;
    const content = (t as Turn)?.content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    const text = content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!text) return null;
    // the API needs alternating roles: merge any repeats
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += `\n\n${text}`;
    else turns.push({ role, content: text });
  }
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== 'user') return null;
  return turns;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (!user) return json({ error: 'Please close and reopen the app, then try again.' }, 401);

  let body: { messages?: unknown; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Something went wrong. Please try again.' }, 400);
  }
  const turns = validTurns(body.messages);
  if (!turns) return json({ error: 'Something went wrong with that message. Please try again.' }, 400);
  const context = typeof body.context === 'string' ? body.context.slice(0, MAX_CONTEXT_CHARS) : '';

  // fair-use limit per person per day
  const day = new Date().toISOString().slice(0, 10);
  const { data: usage } = await admin.from('ai_usage').select('count, chat_count').eq('user_id', user.id).eq('day', day).maybeSingle();
  const used = usage?.chat_count ?? 0;
  if (used >= DAILY_LIMIT) return json({ error: `You’ve reached today’s ${DAILY_LIMIT} questions. Ask again tomorrow, or message your coach.` }, 429);
  await admin.from('ai_usage').upsert({ user_id: user.id, day, count: usage?.count ?? 0, chat_count: used + 1 });

  const client = new Anthropic(); // ANTHROPIC_API_KEY from the function's secrets
  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // quick chat answers: low effort keeps them fast
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: SYSTEM },
        { type: 'text', text: `About this person (from their app, today):\n${context || 'No details available.'}` },
      ],
      messages: turns,
    });

    if (response.stop_reason === 'refusal') {
      return json({ reply: 'I can’t help with that one. For anything medical, please check with a doctor, or ask your coach.' });
    }
    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')
      .trim();
    if (!reply) return json({ error: 'No answer came back. Please try again.' }, 502);
    return json({ reply });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'Busy right now. Please try again in a minute.' }, 503);
    if (e instanceof Anthropic.APIError) {
      console.error('Anthropic API error', e.status, e.message);
      return json({ error: 'The assistant had a problem. Please try again.' }, 502);
    }
    console.error(e);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
