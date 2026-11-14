-- UrSpace — Owner provisioning (run ONCE, after creating the owner auth user)
--
-- Step 1: Supabase Dashboard → Authentication → Users → "Add user"
--         Create the owner with email + a strong password.
--         (Credentials are never stored in this repository.)
-- Step 2: Replace the email below, then run this script in the SQL Editor.
-- Step 3: Sign in at /login — the owner lands on /admin.

do $$
declare
  owner_email text := 'REPLACE_WITH_OWNER_EMAIL';
  owner_id uuid;
begin
  select id into owner_id from auth.users where email = owner_email;
  if owner_id is null then
    raise exception 'No auth user found for %. Create the user first (Step 1).', owner_email;
  end if;

  -- Ensure a profile exists (normally created by the signup trigger).
  insert into public.profiles (id, email, display_name, role)
  values (owner_id, owner_email, 'Owner', 'owner')
  on conflict (id) do update set role = 'owner', account_status = 'active';

  -- Mirror the role into app_metadata so JWT-based helpers stay consistent.
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"owner"}'::jsonb
  where id = owner_id;

  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (owner_id, 'owner.provisioned', 'profile', owner_id::text,
          jsonb_build_object('email', owner_email));
end;
$$;