-- SANKET sign-in: run once in Supabase -> SQL Editor (safe to run again).
--
-- Supabase Auth keeps the accounts (email, password, email codes). This adds:
--   public.profiles   one row per account: name, phone, role, districts, approval status
--   public.audit_log  who did what (sign-ins, approvals, incidents, field reports)
-- New sign-ups start as 'pending' until an admin approves them in SANKET's admin page.

create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text,
  full_name           text not null default '',
  phone               text,
  requested_role      text check (requested_role in ('district_officer', 'field_officer')),
  requested_districts text[] not null default '{}',
  role                text check (role in ('admin', 'district_officer', 'field_officer')),
  districts           text[] not null default '{}',
  status              text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
  approved_by         uuid references auth.users (id) on delete set null,
  approved_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       uuid references auth.users (id) on delete set null,
  actor_email text,
  action      text not null,
  target      text,
  details     jsonb not null default '{}'::jsonb
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);

-- Create a pending profile for every new account, from the details entered on the sign-up form.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, requested_role, requested_districts)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case when new.raw_user_meta_data ->> 'requested_role' in ('district_officer', 'field_officer')
         then new.raw_user_meta_data ->> 'requested_role' end,
    coalesce(array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'requested_districts', '[]'::jsonb))), '{}')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-level security: a signed-in user may read only their own profile. Nobody can write through the
-- public API; SANKET's server writes with the service-role key, which bypasses these rules.
alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

-- Table permissions. Newer Supabase projects no longer grant these automatically to tables made in the
-- SQL editor: the SANKET server (service_role) reads and writes both tables; signed-in users may only
-- read (row-level security above limits that to their own profile).
grant usage on schema public to service_role, authenticated;
grant select, insert, update, delete on public.profiles, public.audit_log to service_role;
grant usage, select on all sequences in schema public to service_role;
grant select on public.profiles to authenticated;

-- ---------------------------------------------------------------------------------------------
-- After you have signed up yourself in SANKET and entered the email code, make yourself the first
-- admin (replace the email), then press "Check again" on the waiting screen:
--
--   update public.profiles
--      set role = 'admin', status = 'active', approved_at = now()
--    where email = 'you@example.com';
