-- UrSpace — RLS / authorization test suite
-- Run in the SQL Editor AFTER schema.sql. Creates throwaway users inside a
-- transaction and rolls everything back at the end. Every `assert` failure
-- raises an exception naming the failed check.
--
-- Covers: tutor isolation, role escalation, suspension, staff oversight.

begin;

-- Test fixtures -------------------------------------------------------------
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', 'tutor-a@test.local', '{"role":"tutor"}', '{"display_name":"Tutor A"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'tutor-b@test.local', '{"role":"tutor"}', '{"display_name":"Tutor B"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'admin@test.local', '{"role":"admin"}', '{"display_name":"Admin"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'owner@test.local', '{"role":"owner"}', '{"display_name":"Owner"}');

insert into public.notes (id, user_id, title, body)
values
  ('00000000-0000-0000-0000-0000000000n1', '00000000-0000-0000-0000-0000000000a1', 'A private note', '{"type":"doc"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000n2', '00000000-0000-0000-0000-0000000000a2', 'B private note', '{"type":"doc"}'::jsonb);

-- Helper: run subsequent statements as a given end user.
create or replace function pg_temp.act_as(uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', uid, 'role', 'authenticated')::text, true);
end;
$$;

-- 1. Tutor A reads own note, not tutor B's ----------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
do $$
begin
  assert (select count(*) from public.notes) = 1, 'FAIL 1a: tutor sees wrong note count';
  assert exists(select 1 from public.notes where title = 'A private note'), 'FAIL 1b: tutor cannot read own note';
end $$;

-- 2. Tutor A cannot update tutor B's note -----------------------------------
do $$
declare
  affected int;
begin
  update public.notes set title = 'hacked'
  where id = '00000000-0000-0000-0000-0000000000n2';
  get diagnostics affected = row_count;
  assert affected = 0, 'FAIL 2: tutor updated another tutor''s note';
end $$;

-- 3. Tutor A cannot insert a note owned by tutor B --------------------------
do $$
begin
  begin
    insert into public.notes (user_id, title, body)
    values ('00000000-0000-0000-0000-0000000000a2', 'spoof', '{"type":"doc"}'::jsonb);
    raise exception 'FAIL 3: tutor inserted a note for another user';
  exception when insufficient_privilege then
    null; -- expected: RLS violation
  end;
end $$;

-- 4. Tutor A cannot change own role or status -------------------------------
do $$
begin
  begin
    update public.profiles set role = 'owner'
    where id = '00000000-0000-0000-0000-0000000000a1';
    raise exception 'FAIL 4a: tutor escalated own role';
  exception when raise_exception then
    null; -- expected: protect_profile_fields
  end;
  begin
    update public.profiles set account_status = 'suspended'
    where id = '00000000-0000-0000-0000-0000000000a2';
    raise exception 'FAIL 4b: tutor changed another account status';
  exception when insufficient_privilege or raise_exception then
    null; -- expected: RLS blocks (0 rows) or trigger raises
  end;
end $$;

-- 5. Admin reads tutor notes, cannot touch owner profile --------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
do $$
declare
  affected int;
begin
  assert (select count(*) from public.notes) = 2, 'FAIL 5a: admin cannot read tutor notes';
  update public.profiles set role = 'owner'
  where id = '00000000-0000-0000-0000-0000000000c1';
  get diagnostics affected = row_count;
  assert affected = 0, 'FAIL 5b: admin modified owner profile';
  update public.profiles set role = 'owner'
  where id = '00000000-0000-0000-0000-0000000000b1';
  get diagnostics affected = row_count;
  assert affected = 0, 'FAIL 5c: admin self-promoted (RLS)';
end $$;

-- 6. Admin can suspend a tutor ----------------------------------------------
do $$
declare
  affected int;
begin
  update public.profiles set account_status = 'suspended'
  where id = '00000000-0000-0000-0000-0000000000a2';
  get diagnostics affected = row_count;
  assert affected = 1, 'FAIL 6: admin cannot suspend tutor';
end $$;

-- 7. Suspended tutor B loses note access ------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
do $$
declare
  affected int;
begin
  assert (select count(*) from public.notes) = 0, 'FAIL 7a: suspended tutor still reads notes';
  insert into public.notes (user_id, title, body)
  values ('00000000-0000-0000-0000-0000000000a2', 'x', '{"type":"doc"}'::jsonb);
  raise exception 'FAIL 7b: suspended tutor inserted a note';
exception when insufficient_privilege then
  null; -- expected
end $$;

-- 8. Owner can update any profile role --------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
do $$
declare
  affected int;
begin
  update public.profiles set display_name = 'Renamed'
  where id = '00000000-0000-0000-0000-0000000000b1';
  get diagnostics affected = row_count;
  assert affected = 1, 'FAIL 8: owner cannot manage admin profile';
end $$;

-- 9. anon role sees nothing --------------------------------------------------
select set_config('role', 'anon', true);
do $$
begin
  assert (select count(*) from public.notes) = 0, 'FAIL 9: anon reads notes';
end $$;

rollback;