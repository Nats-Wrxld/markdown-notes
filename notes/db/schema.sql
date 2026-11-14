-- UrSpace — consolidated database setup
-- Run in Supabase Dashboard → SQL Editor.
-- Safe to run on a fresh project OR over the Phase 1 notes-only schema:
-- existing objects are kept, Phase 1 policies are replaced by the final ones.

-- ---------------------------------------------------------------------------
-- Private schema for authorization helpers (not exposed via the Data API)
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  avatar_url text,
  role text not null default 'tutor'
    check (role in ('owner', 'admin', 'tutor')),
  account_status text not null default 'active'
    check (account_status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Authorization helpers. SECURITY DEFINER so policies can read profiles
-- without recursive RLS evaluation. Only `authenticated` may execute them.
create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function private.is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select account_status = 'active' from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role = 'admin' and account_status = 'active'
     from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role = 'owner' and account_status = 'active'
     from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function private.current_role(), private.is_active(),
  private.is_admin(), private.is_owner() from public, anon;
grant execute on function private.current_role(), private.is_active(),
  private.is_admin(), private.is_owner() to authenticated;

-- Create the profile whenever an auth user is created.
-- Role comes from app_metadata (only settable via service role / SQL),
-- never from user_metadata (which is user-editable). Public signups
-- (email or OAuth) therefore always become tutors. Display name falls
-- back to provider profile names, then the email local part.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
begin
  requested_role := new.raw_app_meta_data ->> 'role';
  if requested_role is null or requested_role not in ('owner', 'admin', 'tutor') then
    requested_role := 'tutor';
  end if;

  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    left(
      coalesce(
        nullif(new.raw_user_meta_data ->> 'display_name', ''),
        nullif(new.raw_user_meta_data ->> 'full_name', ''),
        nullif(new.raw_user_meta_data ->> 'name', ''),
        split_part(new.email, '@', 1)
      ),
      60
    ),
    requested_role
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Guard protected profile fields. End users may never change id, email,
-- role or account_status. Admins may suspend/reactivate tutors only.
-- Owners may change anything. Service-role calls (auth.uid() is null)
-- are the trusted provisioning path.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new; -- trusted server-side path
  end if;

  if new.id is distinct from old.id or new.email is distinct from old.email then
    raise exception 'Profile identity fields are immutable';
  end if;

  if new.role is distinct from old.role then
    if not private.is_owner() then
      raise exception 'Only the owner can change roles';
    end if;
  end if;

  if new.account_status is distinct from old.account_status then
    if private.is_owner() then
      null;
    elsif private.is_admin() and old.role = 'tutor' and new.role = 'tutor' then
      null;
    else
      raise exception 'Not allowed to change account status';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields
  before update on public.profiles
  for each row
  execute function public.protect_profile_fields();

-- ---------------------------------------------------------------------------
-- notes (extends the Phase 1 table)
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes
  add column if not exists tags text[] not null default '{}';

create index if not exists notes_user_id_created_at_idx
  on public.notes (user_id, created_at desc);
create index if not exists notes_tags_idx
  on public.notes using gin (tags);

-- Note ownership can never be reassigned.
create or replace function public.protect_note_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'Note ownership is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists notes_protect_owner on public.notes;
create trigger notes_protect_owner
  before update on public.notes
  for each row
  execute function public.protect_note_owner();

-- ---------------------------------------------------------------------------
-- audit_logs (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- platform_settings (owner-managed key/value)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.platform_settings (key, value)
values
  ('allow_public_signup', 'true'::jsonb),
  ('platform_notice', '""'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- user_preferences (cross-device theme/background)
-- ---------------------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  background_id text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

drop trigger if exists platform_settings_set_updated_at on public.platform_settings;
create trigger platform_settings_set_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.notes enable row level security;
alter table public.audit_logs enable row level security;
alter table public.platform_settings enable row level security;
alter table public.user_preferences enable row level security;

-- profiles: read own; staff read all. Update own (guarded by trigger);
-- staff update tutor rows; owner updates any. No direct inserts (trigger
-- handles creation) and no deletes (accounts are suspended, not deleted).
drop policy if exists "profiles_select_own_or_staff" on public.profiles;
create policy "profiles_select_own_or_staff"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or private.is_admin()
    or private.is_owner()
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) and private.is_active())
  with check (id = (select auth.uid()));

drop policy if exists "profiles_update_staff_tutors" on public.profiles;
create policy "profiles_update_staff_tutors"
  on public.profiles for update
  to authenticated
  using (
    (private.is_admin() or private.is_owner())
    and role = 'tutor'
  )
  with check (
    (private.is_admin() or private.is_owner())
    and role = 'tutor'
  );

drop policy if exists "profiles_update_owner_any" on public.profiles;
create policy "profiles_update_owner_any"
  on public.profiles for update
  to authenticated
  using (private.is_owner())
  with check (private.is_owner());

-- notes: tutors own-row CRUD while active; staff read/manage tutor notes.
drop policy if exists "Users can select their own notes" on public.notes;
drop policy if exists "Users can insert their own notes" on public.notes;
drop policy if exists "Users can update their own notes" on public.notes;
drop policy if exists "Users can delete their own notes" on public.notes;

drop policy if exists "notes_select_own_or_staff" on public.notes;
create policy "notes_select_own_or_staff"
  on public.notes for select
  to authenticated
  using (
    (user_id = (select auth.uid()) and private.is_active())
    or (
      (private.is_admin() or private.is_owner())
      and exists (
        select 1 from public.profiles p
        where p.id = notes.user_id and p.role = 'tutor'
      )
    )
  );

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own"
  on public.notes for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and private.is_active()
  );

drop policy if exists "notes_update_own_or_staff" on public.notes;
create policy "notes_update_own_or_staff"
  on public.notes for update
  to authenticated
  using (
    (user_id = (select auth.uid()) and private.is_active())
    or (
      (private.is_admin() or private.is_owner())
      and exists (
        select 1 from public.profiles p
        where p.id = notes.user_id and p.role = 'tutor'
      )
    )
  )
  with check (
    (user_id = (select auth.uid()) and private.is_active())
    or (
      (private.is_admin() or private.is_owner())
      and exists (
        select 1 from public.profiles p
        where p.id = notes.user_id and p.role = 'tutor'
      )
    )
  );

drop policy if exists "notes_delete_own_or_staff" on public.notes;
create policy "notes_delete_own_or_staff"
  on public.notes for delete
  to authenticated
  using (
    (user_id = (select auth.uid()) and private.is_active())
    or (
      (private.is_admin() or private.is_owner())
      and exists (
        select 1 from public.profiles p
        where p.id = notes.user_id and p.role = 'tutor'
      )
    )
  );

-- audit_logs: active users append their own entries; staff read.
drop policy if exists "audit_logs_insert_own" on public.audit_logs;
create policy "audit_logs_insert_own"
  on public.audit_logs for insert
  to authenticated
  with check (
    actor_id = (select auth.uid())
    and private.is_active()
  );

drop policy if exists "audit_logs_select_staff" on public.audit_logs;
create policy "audit_logs_select_staff"
  on public.audit_logs for select
  to authenticated
  using (private.is_admin() or private.is_owner());

-- platform_settings: public read (signup toggle + notice are shown on public
-- pages); owner writes.
drop policy if exists "platform_settings_select_active" on public.platform_settings;
create policy "platform_settings_select_public"
  on public.platform_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "platform_settings_insert_owner" on public.platform_settings;
create policy "platform_settings_insert_owner"
  on public.platform_settings for insert
  to authenticated
  with check (private.is_owner());

drop policy if exists "platform_settings_update_owner" on public.platform_settings;
create policy "platform_settings_update_owner"
  on public.platform_settings for update
  to authenticated
  using (private.is_owner())
  with check (private.is_owner());

-- user_preferences: own row only.
drop policy if exists "user_preferences_select_own" on public.user_preferences;
create policy "user_preferences_select_own"
  on public.user_preferences for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "user_preferences_insert_own" on public.user_preferences;
create policy "user_preferences_insert_own"
  on public.user_preferences for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own"
  on public.user_preferences for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "user_preferences_delete_own" on public.user_preferences;
create policy "user_preferences_delete_own"
  on public.user_preferences for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Data API grants (RLS above still restricts rows)
-- ---------------------------------------------------------------------------
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant select, insert, update on public.platform_settings to authenticated;
grant select on public.platform_settings to anon;
grant select, insert, update, delete on public.user_preferences to authenticated;

revoke all on public.profiles, public.notes, public.audit_logs,
  public.user_preferences from anon;

-- ---------------------------------------------------------------------------
-- Storage: public avatars bucket, per-user folder write access
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );