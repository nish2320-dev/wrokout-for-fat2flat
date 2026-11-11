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
