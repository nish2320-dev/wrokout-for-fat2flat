-- Fat2Flat Fitness: runs the AI coaching agent every hour.
-- Run this ONCE in Supabase → SQL Editor, after deploying the coach-agent function.
--
-- Before running, replace YOUR-AGENT-KEY below (once) with the same
-- password you saved as the AGENT_KEY secret.
-- The key is stored in Supabase Vault (encrypted), not in the schedule itself.
-- Running it again updates the key and the schedule.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ↓↓↓ Paste your password between the quotes on the next line (replace YOUR-AGENT-KEY) ↓↓↓
do $agent$
declare
  k text := 'YOUR-AGENT-KEY';
begin
  if k like 'YOUR-%' or length(k) < 20 then
    raise exception 'Paste your AGENT_KEY password between the quotes first.';
  end if;
  if exists (select 1 from vault.secrets where name = 'agent_key') then
    perform vault.update_secret((select id from vault.secrets where name = 'agent_key'), k);
  else
    perform vault.create_secret(k, 'agent_key');
  end if;
end
$agent$;

select cron.schedule(
  'coach-agent-hourly',
  '7 * * * *', -- seven minutes past every hour
  $$
  select net.http_post(
    url := 'https://iycgmlwiglrvlyetkwzi.supabase.co/functions/v1/coach-agent',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-key', (select decrypted_secret from vault.decrypted_secrets where name = 'agent_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- To stop the agent completely:  select cron.unschedule('coach-agent-hourly');
