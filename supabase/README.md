# Supabase setup (coach features)

1. Supabase dashboard → your project → **SQL Editor** → New query → paste all of
   `schema.sql` → **Run**. Safe to run again after changes.
2. **Authentication → Sign In / Providers → Apple**: enable, Client IDs =
   `com.fat2flat.fitness`, Save.
3. Put the project URL and publishable key in `mobile/app.json` under
   `expo.extra.supabaseUrl` / `expo.extra.supabaseKey`. Both are public;
   never put the secret / service_role key in the app.

`schema.sql` holds every table, row-level-security policy, function and the
private `progress-photos` bucket. `bash supabase/test/run.sh` runs it against
a throwaway local Postgres with stubbed auth/storage and checks who can read
and write what (needs PostgreSQL 16 installed locally).

## Version 2.0 additions (chat, coach targets, meal photo AI)

1. **Re-run `schema.sql`** in the SQL Editor (it only adds what's missing).
2. **Allow anonymous sign-ins**: Authentication → Sign In / Providers →
   "Allow anonymous sign-ins" → on. Meal photos use a guest session so they
   work without an account; guests can't do anything else (coach features
   check for a real sign-in, and row-level security gives them no rows).
3. **Deploy the meal photo function**: Edge Functions → Deploy a new function →
   Via editor → name `analyze-meal` → paste `functions/analyze-meal/index.ts`
   → Deploy.
4. **Add the AI key**: create an API key at console.anthropic.com (add a few
   dollars of credit), then Edge Functions → Secrets → add
   `ANTHROPIC_API_KEY`. The key lives only in Supabase, never in the app.
   Each photo costs roughly 1–2 cents; the function allows 25 per person per day.

## Error reports and invite page

- `app_errors` (in `schema.sql`) receives anonymous JavaScript error reports
  from the app. Read them in **Table Editor → app_errors**; nobody can read
  them through the app.
- The coach invite page is `docs/join/index.html`, served by GitHub Pages at
  `https://nish2320-dev.github.io/wrokout-for-fat2flat/join/?code=XXXXXX`
  (repo Settings → Pages → Deploy from a branch → folder `/docs`).

## Version 2.1: AI assistant

1. Re-run `schema.sql` (adds `ai_usage.chat_count`).
2. Edge Functions → Deploy a new function → Via editor → name `assistant` →
   paste `functions/assistant/index.ts` → Deploy → Settings → turn **off**
   "Verify JWT with legacy secret" → Save. Uses the existing `ANTHROPIC_API_KEY`.
