-- Fat2Flat Fitness: coach features.
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run again: it only creates what is missing and replaces functions/policies.
--
-- Who can see what (enforced by row-level security, not by the app):
--   • A client sees and changes only their own row, messages and photos.
--   • A coach sees only the clients who joined them with their code, and
--     those clients' photos only while the client has photo sharing on.
--   • Nobody can list coaches or guess who else uses the app.

-- ── Tables ──────────────────────────────────────────────────────────────

create table if not exists public.coaches (
  user_id    uuid primary key references auth.users on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  code       text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  user_id      uuid primary key references auth.users on delete cascade,
  coach_id     uuid not null references public.coaches (user_id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 60),
  share_photos boolean not null default false,
  push_token   text,
  summary      jsonb not null default '{}'::jsonb,
  snapshot     jsonb not null default '{}'::jsonb,
  joined_at    timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists clients_coach_idx on public.clients (coach_id);

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches (user_id) on delete cascade,
  client_id  uuid not null references public.clients (user_id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index if not exists messages_client_idx on public.messages (client_id, created_at desc);

-- v2 additions: two-way chat, coach-set targets, coach notifications, AI usage
alter table public.messages add column if not exists from_client boolean not null default false;
alter table public.coaches add column if not exists push_token text;
alter table public.clients add column if not exists coach_targets jsonb;

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day     date not null default current_date,
  count   integer not null default 0,
  primary key (user_id, day)
);

alter table public.coaches  enable row level security;
alter table public.clients  enable row level security;
alter table public.messages enable row level security;
alter table public.ai_usage enable row level security; -- no policies: only the server function touches it

-- ── Column-level grants: what the app may write directly ────────────────
-- Rows are created through the functions below, so a client can never pick
-- their own coach_id, and a coach can never change a client's data.

revoke all on public.coaches, public.clients, public.messages, public.ai_usage from anon;
revoke all on public.ai_usage from authenticated;
revoke insert, update, delete on public.coaches, public.clients, public.messages from authenticated;
grant select on public.coaches, public.clients, public.messages to authenticated;
grant update (name, push_token) on public.coaches to authenticated;
grant update (name, share_photos, push_token, summary, snapshot, updated_at) on public.clients to authenticated;
grant delete on public.clients to authenticated;
grant insert (coach_id, client_id, body, from_client) on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;
grant delete on public.messages to authenticated;

-- ── Policies ────────────────────────────────────────────────────────────

drop policy if exists "coach reads own row" on public.coaches;
create policy "coach reads own row" on public.coaches for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "client reads their coach" on public.coaches;
create policy "client reads their coach" on public.coaches for select to authenticated
  using (user_id in (select coach_id from public.clients where user_id = auth.uid()));

drop policy if exists "coach renames self" on public.coaches;
create policy "coach renames self" on public.coaches for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "client reads own row" on public.clients;
create policy "client reads own row" on public.clients for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "coach reads their clients" on public.clients;
create policy "coach reads their clients" on public.clients for select to authenticated
  using (coach_id = auth.uid());

drop policy if exists "client updates own row" on public.clients;
create policy "client updates own row" on public.clients for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "client leaves or coach removes" on public.clients;
create policy "client leaves or coach removes" on public.clients for delete to authenticated
  using (user_id = auth.uid() or coach_id = auth.uid());

drop policy if exists "read own messages" on public.messages;
create policy "read own messages" on public.messages for select to authenticated
  using (client_id = auth.uid() or coach_id = auth.uid());

drop policy if exists "coach messages own clients" on public.messages;
create policy "coach messages own clients" on public.messages for insert to authenticated
  with check (
    coach_id = auth.uid()
    and not from_client
    and exists (select 1 from public.clients c where c.user_id = client_id and c.coach_id = auth.uid())
  );

drop policy if exists "client messages their coach" on public.messages;
create policy "client messages their coach" on public.messages for insert to authenticated
  with check (
    client_id = auth.uid()
    and from_client
    and coach_id = (select c.coach_id from public.clients c where c.user_id = auth.uid())
  );

drop policy if exists "client marks read" on public.messages;
drop policy if exists "recipient marks read" on public.messages;
create policy "recipient marks read" on public.messages for update to authenticated
  using ((client_id = auth.uid() and not from_client) or (coach_id = auth.uid() and from_client))
  with check ((client_id = auth.uid() and not from_client) or (coach_id = auth.uid() and from_client));

drop policy if exists "coach deletes own messages" on public.messages;
create policy "coach deletes own messages" on public.messages for delete to authenticated
  using (coach_id = auth.uid());

-- ── Functions the app calls ─────────────────────────────────────────────

-- Guest (anonymous) sessions exist only so meal photos work without an
-- account. They may not coach, join a coach, message or upload photos.
create or replace function public.is_guest()
returns boolean
language sql stable
as $$ select coalesce((auth.jwt()->>'is_anonymous')::boolean, false) $$;

-- Makes the signed-in user a coach (or renames them) and returns their code.
create or replace function public.become_coach(p_name text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_code text;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O, 1/I
begin
  if auth.uid() is null or is_guest() then raise exception 'Please sign in first.'; end if;
  if char_length(trim(coalesce(p_name, ''))) = 0 then raise exception 'Enter your name'; end if;
  select code into v_code from coaches where user_id = auth.uid();
  if found then
    update coaches set name = trim(p_name) where user_id = auth.uid();
    return v_code;
  end if;
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    begin
      insert into coaches (user_id, name, code) values (auth.uid(), trim(p_name), v_code);
      return v_code;
    exception when unique_violation then
      -- code taken: try another
    end;
  end loop;
end;
$$;

-- Joins the coach with this code (switching coach if already joined) and
-- returns the coach's name.
create or replace function public.join_coach(p_code text, p_name text, p_share_photos boolean)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_coach coaches%rowtype;
begin
  if auth.uid() is null or is_guest() then raise exception 'Please sign in first.'; end if;
  if char_length(trim(coalesce(p_name, ''))) = 0 then raise exception 'Enter your name'; end if;
  select * into v_coach from coaches where code = upper(replace(trim(coalesce(p_code, '')), ' ', ''));
  if not found then raise exception 'No coach has that code. Check it and try again.'; end if;
  if v_coach.user_id = auth.uid() then raise exception 'That is your own coach code.'; end if;
  insert into clients (user_id, coach_id, name, share_photos)
  values (auth.uid(), v_coach.user_id, trim(p_name), coalesce(p_share_photos, false))
  on conflict (user_id) do update
    set coach_id = excluded.coach_id,
        name = excluded.name,
        share_photos = excluded.share_photos,
        joined_at = case when clients.coach_id = excluded.coach_id then clients.joined_at else now() end;
  return v_coach.name;
end;
$$;

-- The coach sets a client's daily calories, protein and workouts per week;
-- the client's app applies them the next time it opens.
create or replace function public.set_client_targets(p_client uuid, p_targets jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_cal int := (p_targets->>'calorieGoal')::int;
  v_pro int := (p_targets->>'proteinGoal')::int;
  v_days int := nullif(p_targets->>'daysPerWeek', '')::int;
begin
  if auth.uid() is null or is_guest() then raise exception 'Please sign in first.'; end if;
  if not exists (select 1 from clients where user_id = p_client and coach_id = auth.uid()) then
    raise exception 'That person is not your client.';
  end if;
  if v_cal is null or v_cal < 1000 or v_cal > 6000 then raise exception 'Calories must be between 1,000 and 6,000.'; end if;
  if v_pro is null or v_pro < 30 or v_pro > 400 then raise exception 'Protein must be between 30 and 400 g.'; end if;
  if v_days is not null and v_days not in (3, 4, 5) then raise exception 'Workouts per week must be 3, 4 or 5.'; end if;
  update clients set coach_targets = jsonb_build_object(
    'calorieGoal', v_cal,
    'proteinGoal', v_pro,
    'daysPerWeek', v_days,
    'note', left(coalesce(p_targets->>'note', ''), 300),
    'at', (extract(epoch from now()) * 1000)::bigint
  ) where user_id = p_client;
end;
$$;

-- The coach's name and notification address, for the client's app to message them.
create or replace function public.my_coach()
returns table (name text, push_token text)
language sql security definer set search_path = public stable
as $$
  select co.name, co.push_token from coaches co
  join clients cl on cl.coach_id = co.user_id
  where cl.user_id = auth.uid();
$$;

-- Permanently deletes the signed-in user and everything tied to them.
-- The app removes the user's photos from storage first.
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.become_coach(text) from public, anon;
revoke execute on function public.join_coach(text, text, boolean) from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
revoke execute on function public.set_client_targets(uuid, jsonb) from public, anon;
revoke execute on function public.my_coach() from public, anon;
grant execute on function public.set_client_targets(uuid, jsonb) to authenticated;
grant execute on function public.my_coach() to authenticated;
grant execute on function public.become_coach(text) to authenticated;
grant execute on function public.join_coach(text, text, boolean) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- ── Error reports ───────────────────────────────────────────────────────
-- The app sends a JavaScript error's message (no names, emails or user ids)
-- so problems can be fixed. Anyone may add a report; nobody can read them
-- through the app - view them in Supabase → Table Editor → app_errors.

create table if not exists public.app_errors (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  platform    text check (char_length(platform) <= 20),
  app_version text check (char_length(app_version) <= 40),
  os_version  text check (char_length(os_version) <= 40),
  fatal       boolean not null default false,
  message     text not null check (char_length(message) <= 1000),
  stack       text check (char_length(stack) <= 4000),
  screen      text check (char_length(screen) <= 200)
);
alter table public.app_errors enable row level security;
revoke all on public.app_errors from anon, authenticated;
grant insert (platform, app_version, os_version, fatal, message, stack, screen) on public.app_errors to anon, authenticated;
drop policy if exists "anyone reports errors" on public.app_errors;
create policy "anyone reports errors" on public.app_errors for insert to anon, authenticated with check (true);

-- ── Progress photos (private storage) ───────────────────────────────────
-- Files live at progress-photos/<client user id>/<file name>.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/heic'])
on conflict (id) do nothing;

drop policy if exists "client manages own photos" on storage.objects;
create policy "client manages own photos" on storage.objects for all to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text and not public.is_guest());

drop policy if exists "coach views shared photos" on storage.objects;
create policy "coach views shared photos" on storage.objects for select to authenticated
  using (
    bucket_id = 'progress-photos'
    and exists (
      select 1 from public.clients c
      -- objects.name, not name: clients has its own name column
      where c.user_id::text = (storage.foldername(objects.name))[1]
        and c.coach_id = auth.uid()
        and c.share_photos
    )
  );
