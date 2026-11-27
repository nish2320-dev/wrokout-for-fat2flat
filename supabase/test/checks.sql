-- Security checks for schema.sql. Each block runs as a signed-in user.
\set coach  '''11111111-1111-1111-1111-111111111111'''
\set alice  '''22222222-2222-2222-2222-222222222222'''
\set bob    '''33333333-3333-3333-3333-333333333333'''
\set coach2 '''44444444-4444-4444-4444-444444444444'''
insert into auth.users values (:coach), (:alice), (:bob), (:coach2);

create function pg_temp.must_fail(q text, why text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then return; end;
  raise exception 'should have failed: %', why;
end $$;
create function pg_temp.eq(got bigint, want bigint, why text) returns void language plpgsql as $$
begin if got is distinct from want then raise exception '% (got %, want %)', why, got, want; end if; end $$;
grant execute on all functions in schema pg_temp to authenticated;

create table pg_temp.vars (k text primary key, v text);
grant all on pg_temp.vars to authenticated;

-- anon can do nothing (except report an error)
set role anon;
insert into app_errors (platform, message, fatal) values ('ios', 'test error', true);
select pg_temp.must_fail('select * from app_errors', 'anon reads error reports');
select pg_temp.must_fail('insert into app_errors (message) values (repeat(''x'', 2000))', 'oversized error report');
select pg_temp.must_fail('select become_coach(''X'')', 'anon becomes coach');
select pg_temp.must_fail('select * from clients', 'anon reads clients');
reset role;

-- coach signs up and gets a code
set role authenticated; select set_config('request.jwt.claim.sub', :coach, false);
insert into pg_temp.vars select 'code', become_coach('Coach Nish');
select pg_temp.eq((select count(*) from coaches), 1, 'coach sees own row');
select pg_temp.eq((select count(*) from coaches where code ~ '^[A-HJ-NP-Z2-9]{6}$'), 1, 'code format');
select pg_temp.eq((select count(*) from pg_temp.vars where v = become_coach('Coach N')), 1, 'second call keeps code');
select pg_temp.must_fail('update coaches set code = ''AAAAAA''', 'coach changes code directly');
select pg_temp.must_fail('insert into coaches values (auth.uid(), ''x'', ''BBBBBB'')', 'insert coach directly');
select pg_temp.must_fail('select join_coach((select v from pg_temp.vars), ''Me'', true)', 'join own code');

-- a second coach
select set_config('request.jwt.claim.sub', :coach2, false);
insert into pg_temp.vars select 'code2', become_coach('Other Coach');
select pg_temp.eq((select count(*) from coaches), 1, 'coach2 cannot see coach1');

-- alice joins with the code, sharing photos; bob joins without
select set_config('request.jwt.claim.sub', :alice, false);
select pg_temp.must_fail('select join_coach(''ZZZZZZ'', ''Alice'', true)', 'wrong code');
select pg_temp.eq((select count(*) from coaches), 0, 'alice cannot list coaches before joining');
select pg_temp.eq((select count(*) from pg_temp.vars where k = 'code' and join_coach(lower(v), 'Alice', true) = 'Coach N'), 1, 'join returns coach name (code is case-insensitive)');
select pg_temp.eq((select count(*) from coaches), 1, 'alice sees her coach only');
update clients set summary = '{"w":3}', snapshot = '{"a":1}', updated_at = now() where user_id = auth.uid();
select pg_temp.eq((select count(*) from clients where summary->>'w' = '3'), 1, 'alice syncs');
select pg_temp.must_fail('update clients set coach_id = ' || quote_literal(:coach2) || ' where user_id = auth.uid()', 'alice switches coach directly');
select pg_temp.must_fail('insert into clients (user_id, coach_id, name) values (auth.uid(), ' || quote_literal(:coach) || ', ''x'')', 'insert client directly');
insert into storage.objects (bucket_id, name) values ('progress-photos', :alice || '/front.jpg');
select pg_temp.must_fail('insert into storage.objects (bucket_id, name) values (''progress-photos'', ' || quote_literal(:bob || '/x.jpg') || ')', 'alice writes into bob folder');

select set_config('request.jwt.claim.sub', :bob, false);
select join_coach((select v from pg_temp.vars where k = 'code'), 'Bob', false);
select pg_temp.eq((select count(*) from clients), 1, 'bob sees only himself');
select pg_temp.eq((select count(*) from storage.objects), 0, 'bob cannot see alice photos');
insert into storage.objects (bucket_id, name) values ('progress-photos', :bob || '/front.jpg');

-- coach sees both clients, alice's photo but not bob's (bob is not sharing)
select set_config('request.jwt.claim.sub', :coach, false);
select pg_temp.eq((select count(*) from clients), 2, 'coach sees both clients');
select pg_temp.eq((select count(*) from storage.objects), 1, 'coach sees only shared photos');
update clients set summary = '{}', name = 'hacked';
select pg_temp.eq((select count(*) from clients where summary->>'w' = '3' and name = 'Alice'), 1, 'coach cannot edit client data');
insert into messages (coach_id, client_id, body) values (auth.uid(), :alice, 'Great week!');
select pg_temp.must_fail('insert into messages (coach_id, client_id, body) values (' || quote_literal(:coach2) || ', ' || quote_literal(:alice) || ', ''spoof'')', 'coach spoofs another coach');

-- coach2 sees nothing of coach1's clients and cannot message them
select set_config('request.jwt.claim.sub', :coach2, false);
select pg_temp.eq((select count(*) from clients), 0, 'coach2 sees no clients');
select pg_temp.eq((select count(*) from storage.objects), 0, 'coach2 sees no photos');
select pg_temp.eq((select count(*) from messages), 0, 'coach2 sees no messages');
select pg_temp.must_fail('insert into messages (coach_id, client_id, body) values (auth.uid(), ' || quote_literal(:alice) || ', ''hi'')', 'coach2 messages alice');

-- alice reads and marks her message; bob sees none
select set_config('request.jwt.claim.sub', :alice, false);
select pg_temp.eq((select count(*) from messages), 1, 'alice sees her message');
update messages set read_at = now();
select pg_temp.eq((select count(*) from messages where read_at is not null), 1, 'alice marks read');
select pg_temp.must_fail('update messages set body = ''edited''', 'alice edits message body');
select set_config('request.jwt.claim.sub', :bob, false);
select pg_temp.eq((select count(*) from messages), 0, 'bob sees no messages');

-- bob turns photo sharing on: coach can now see his photo
update clients set share_photos = true where user_id = auth.uid();
select set_config('request.jwt.claim.sub', :coach, false);
select pg_temp.eq((select count(*) from storage.objects), 2, 'coach sees bob photo after sharing on');

-- bob leaves; coach loses access
select set_config('request.jwt.claim.sub', :bob, false);
delete from clients where user_id = auth.uid();
select set_config('request.jwt.claim.sub', :coach, false);
select pg_temp.eq((select count(*) from clients), 1, 'coach no longer sees bob');
select pg_temp.eq((select count(*) from storage.objects), 1, 'coach no longer sees bob photo');

-- two-way chat
select set_config('request.jwt.claim.sub', :alice, false);
insert into messages (coach_id, client_id, body, from_client) values (:coach, auth.uid(), 'Thanks coach!', true);
select pg_temp.must_fail('insert into messages (coach_id, client_id, body, from_client) values (' || quote_literal(:coach) || ', auth.uid(), ''fake coach note'', false)', 'client posts as coach');
select pg_temp.must_fail('insert into messages (coach_id, client_id, body, from_client) values (' || quote_literal(:coach2) || ', auth.uid(), ''hi'', true)', 'client messages a coach they did not join');
update messages set read_at = now() where from_client;
select pg_temp.eq((select count(*) from messages where from_client and read_at is not null), 0, 'client cannot mark own message read');
select pg_temp.eq((select count(*) from my_coach()), 1, 'client sees their coach via my_coach');
select set_config('request.jwt.claim.sub', :coach, false);
select pg_temp.must_fail('insert into messages (coach_id, client_id, body, from_client) values (auth.uid(), ' || quote_literal(:alice) || ', ''spoof'', true)', 'coach posts as client');
update messages set read_at = now() where from_client;
select pg_temp.eq((select count(*) from messages where from_client and read_at is not null), 1, 'coach marks client reply read');
-- coach-set targets
select set_client_targets(:alice, '{"calorieGoal": 1900, "proteinGoal": 140, "daysPerWeek": 4, "note": "Cut a little"}');
select pg_temp.must_fail('select set_client_targets(' || quote_literal(:alice) || ', ''{"calorieGoal": 500, "proteinGoal": 140}'')', 'unsafe calories');
select pg_temp.must_fail('select set_client_targets(' || quote_literal(:alice) || ', ''{"calorieGoal": 2000, "proteinGoal": 140, "fatGoal": 5}'')', 'unsafe fat');
select set_client_targets(:alice, '{"calorieGoal": 1900, "proteinGoal": 140, "carbGoal": 180, "fatGoal": 60, "daysPerWeek": 4, "note": "Cut a little"}');
select pg_temp.eq((select count(*) from clients where (coach_targets->>'fatGoal')::int = 60 and (coach_targets->>'carbGoal')::int = 180), 1, 'coach sets carbs and fat');
select pg_temp.must_fail('update clients set coach_targets = ''{}'' where user_id = ' || quote_literal(:alice), 'coach writes targets directly');
select set_config('request.jwt.claim.sub', :coach2, false);
select pg_temp.must_fail('select set_client_targets(' || quote_literal(:alice) || ', ''{"calorieGoal": 2000, "proteinGoal": 140}'')', 'other coach sets targets');
select set_config('request.jwt.claim.sub', :alice, false);
select pg_temp.eq((select count(*) from clients where (coach_targets->>'calorieGoal')::int = 1900), 1, 'client sees coach targets');
select pg_temp.must_fail('update clients set coach_targets = ''{"calorieGoal": 4000}'' where user_id = auth.uid()', 'client edits coach targets');
select pg_temp.must_fail('select set_client_targets(auth.uid(), ''{"calorieGoal": 2000, "proteinGoal": 140}'')', 'client sets own targets via rpc');
select pg_temp.must_fail('select * from ai_usage', 'client reads ai usage');

-- workouts from the coach
select set_config('request.jwt.claim.sub', :coach, false);
select pg_temp.eq(send_coach_workout(array[:alice]::uuid[], 'Upper A', 'Go steady',
  '[{"exerciseId": "bench-press", "sets": 3, "reps": 8, "restSec": 90, "note": "Pause at the bottom", "extra": "dropped"}]'), 1, 'coach sends a workout');
select pg_temp.eq((select count(*) from coach_workouts where items->0 ? 'extra'), 0, 'unknown fields are dropped');
select pg_temp.must_fail('select send_coach_workout(array[' || quote_literal(:bob) || ']::uuid[], ''X'', '''', ''[{"exerciseId": "squat", "sets": 3, "reps": 8}]'')', 'send to someone who is not a client');
select pg_temp.must_fail('select send_coach_workout(array[' || quote_literal(:alice) || ']::uuid[], ''X'', '''', ''[{"exerciseId": "squat", "sets": 50, "reps": 8}]'')', 'silly set count');
select pg_temp.must_fail('select send_coach_workout(array[' || quote_literal(:alice) || ']::uuid[], ''X'', '''', ''[]'')', 'empty workout');
select pg_temp.must_fail('select send_coach_workout(''{}''::uuid[], ''X'', '''', ''[{"exerciseId": "squat", "sets": 3, "reps": 8}]'')', 'no recipients');
select pg_temp.must_fail('insert into coach_workouts (coach_id, client_id, name, items) values (auth.uid(), ' || quote_literal(:alice) || ', ''X'', ''[{}]'')', 'coach inserts directly');
select set_config('request.jwt.claim.sub', :coach2, false);
select pg_temp.eq((select count(*) from coach_workouts), 0, 'other coach sees no workouts');
select pg_temp.must_fail('select send_coach_workout(array[' || quote_literal(:alice) || ']::uuid[], ''X'', '''', ''[{"exerciseId": "squat", "sets": 3, "reps": 8}]'')', 'other coach sends to alice');
select set_config('request.jwt.claim.sub', :alice, false);
select pg_temp.eq((select count(*) from coach_workouts), 1, 'client sees the workout');
select pg_temp.must_fail('select send_coach_workout(array[auth.uid()]::uuid[], ''X'', '''', ''[{"exerciseId": "squat", "sets": 3, "reps": 8}]'')', 'client sends a workout');
select pg_temp.must_fail('update coach_workouts set name = ''Changed''', 'client renames workout');
update coach_workouts set done_at = now();
select pg_temp.eq((select count(*) from coach_workouts where done_at is not null), 1, 'client marks workout done');
select set_config('request.jwt.claim.sub', :coach, false);
select pg_temp.eq((select count(*) from coach_workouts where done_at is not null), 1, 'coach sees it done');
update coach_workouts set done_at = null;
select pg_temp.eq((select count(*) from coach_workouts where done_at is not null), 1, 'coach cannot undo done');

-- meal plans from the coach
select set_config('request.jwt.claim.sub', :coach, false);
select pg_temp.eq(send_coach_meal_plan(array[:alice]::uuid[], 'Cut week 1', 'Drink water',
  '[{"slot": "breakfast", "items": [{"name": "Oats", "calories": 300, "protein": 10, "carbs": 54, "fat": 5, "x": 1}]}, {"slot": "dinner", "items": [{"name": "Dal & rice", "calories": 520, "protein": 20}]}]'), 1, 'coach sends a meal plan');
select pg_temp.eq((select count(*) from coach_meal_plans where meals->0->'items'->0 ? 'x'), 0, 'unknown food fields dropped');
select pg_temp.must_fail('select send_coach_meal_plan(array[' || quote_literal(:alice) || ']::uuid[], ''X'', '''', ''[{"slot": "brunch", "items": [{"name": "A", "calories": 1}]}]'')', 'unknown meal slot');
select pg_temp.must_fail('select send_coach_meal_plan(array[' || quote_literal(:alice) || ']::uuid[], ''X'', '''', ''[{"slot": "lunch", "items": [{"name": "A", "calories": 99999}]}]'')', 'silly calories');
select pg_temp.must_fail('select send_coach_meal_plan(array[' || quote_literal(:bob) || ']::uuid[], ''X'', '''', ''[{"slot": "lunch", "items": [{"name": "A", "calories": 100}]}]'')', 'meal plan to a non-client');
select pg_temp.must_fail('insert into coach_meal_plans (coach_id, client_id, name, meals) values (auth.uid(), ' || quote_literal(:alice) || ', ''X'', ''[{}]'')', 'coach inserts plan directly');
select set_config('request.jwt.claim.sub', :coach2, false);
select pg_temp.eq((select count(*) from coach_meal_plans), 0, 'other coach sees no meal plans');
select set_config('request.jwt.claim.sub', :alice, false);
select pg_temp.eq((select count(*) from coach_meal_plans), 1, 'client sees the meal plan');
select pg_temp.must_fail('select send_coach_meal_plan(array[auth.uid()]::uuid[], ''X'', '''', ''[{"slot": "lunch", "items": [{"name": "A", "calories": 100}]}]'')', 'client sends a meal plan');
delete from coach_meal_plans;
select pg_temp.eq((select count(*) from coach_meal_plans), 1, 'client cannot delete the plan');
select set_config('request.jwt.claim.sub', :coach, false);
delete from coach_meal_plans;
select pg_temp.eq((select count(*) from coach_meal_plans), 0, 'coach removes the plan');

-- AI drafts (written by the server's agent, reviewed by the coach)
reset role;
insert into agent_drafts (coach_id, client_id, kind, payload, reason) values (:coach, :alice, 'workout', '{"name": "Upper A"}', 'Strength week');
set role authenticated;
select set_config('request.jwt.claim.sub', :alice, false);
select pg_temp.eq((select count(*) from agent_drafts), 0, 'client never sees drafts');
select set_config('request.jwt.claim.sub', :coach2, false);
select pg_temp.eq((select count(*) from agent_drafts), 0, 'other coach sees no drafts');
update agent_drafts set status = 'sent';
select set_config('request.jwt.claim.sub', :coach, false);
select pg_temp.eq((select count(*) from agent_drafts where status = 'pending'), 1, 'coach sees the pending draft');
select pg_temp.must_fail('insert into agent_drafts (coach_id, client_id, kind, payload) values (auth.uid(), ' || quote_literal(:alice) || ', ''workout'', ''{}'')', 'coach inserts a draft');
select pg_temp.must_fail('update agent_drafts set payload = ''{}''', 'coach rewrites the draft');
update agent_drafts set status = 'sent';
select pg_temp.eq((select count(*) from agent_drafts where status = 'sent'), 1, 'coach marks draft sent');

-- AI coaching agent settings
select set_config('request.jwt.claim.sub', :alice, false);
update clients set ai_checkins = true, tz = 'America/Los_Angeles' where user_id = auth.uid();
select pg_temp.eq((select count(*) from clients where ai_checkins and tz = 'America/Los_Angeles'), 1, 'client allows AI check-ins');
select pg_temp.must_fail('update clients set agent_paused = true where user_id = auth.uid()', 'client edits the pause flag');
select pg_temp.must_fail('update clients set agent_daily_on = current_date where user_id = auth.uid()', 'client edits agent bookkeeping');
select pg_temp.must_fail('insert into messages (coach_id, client_id, body, from_client, from_agent) values (' || quote_literal(:coach) || ', auth.uid(), ''fake AI'', true, true)', 'client posts as the AI');
select pg_temp.must_fail('select set_client_agent(auth.uid(), true)', 'client pauses own agent');
select set_config('request.jwt.claim.sub', :coach, false);
select set_client_agent(:alice, true);
select pg_temp.eq((select count(*) from clients where agent_paused), 1, 'coach pauses the agent for a client');
select pg_temp.must_fail('insert into messages (coach_id, client_id, body, from_agent) values (auth.uid(), ' || quote_literal(:alice) || ', ''fake AI'', true)', 'coach posts as the AI');
update clients set ai_checkins = false where user_id = :alice;
select pg_temp.eq((select count(*) from clients where ai_checkins), 1, 'coach cannot change the client''s AI choice');
update coaches set agent_on = false where user_id = auth.uid();
select pg_temp.eq((select count(*) from coaches where not agent_on), 1, 'coach turns the agent off');
select set_config('request.jwt.claim.sub', :coach2, false);
select pg_temp.must_fail('select set_client_agent(' || quote_literal(:alice) || ', false)', 'other coach changes the agent');

-- guests (anonymous sessions, for meal photos) can't coach, join or upload
\set guest '''55555555-5555-5555-5555-555555555555'''
reset role;
insert into auth.users values (:guest);
set role authenticated;
select set_config('request.jwt.claim.sub', :guest, false);
select set_config('request.jwt.claims', '{"is_anonymous": true}', false);
select pg_temp.must_fail('select become_coach(''Guest'')', 'guest becomes coach');
select pg_temp.must_fail('select join_coach((select v from pg_temp.vars where k = ''code''), ''Guest'', false)', 'guest joins coach');
select pg_temp.must_fail('insert into storage.objects (bucket_id, name) values (''progress-photos'', ' || quote_literal(:guest || '/x.jpg') || ')', 'guest uploads photo');
select pg_temp.eq((select count(*) from clients), 0, 'guest sees no clients');
select pg_temp.eq((select count(*) from messages), 0, 'guest sees no messages');
select set_config('request.jwt.claims', '', false);

-- alice deletes her account: row and messages are gone
select set_config('request.jwt.claim.sub', :alice, false);
select delete_my_account();
reset role;
select pg_temp.eq((select count(*) from auth.users where id = :alice), 0, 'alice account deleted');
select pg_temp.eq((select count(*) from clients where user_id = :alice), 0, 'alice client row deleted');
select pg_temp.eq((select count(*) from messages), 0, 'alice messages deleted');
select pg_temp.eq((select count(*) from coach_workouts), 0, 'alice workouts deleted');
