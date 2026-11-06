-- Learning Notes sync (Phase L): encrypted records, locked key copies, the
-- owner-only sign-in rule. Run once in Supabase › SQL Editor (see
-- docs/plans/owner-checks-pending.md, "SYNC SETUP"). Safe to run again.
--
-- The server never sees note content: `data` is encrypted on the device.
-- It still sees ids, sizes, times and counts (see docs/features/sync.md).

-- 1. Who may use the app: one Gmail address only.
create or replace function public.sync_is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(lower(auth.jwt() ->> 'email'), '') = 'priyanahubadhanalegends@gmail.com'
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;

-- 2. Encrypted records: one row per synced record (block, page, card, …).
create table if not exists public.sync_records (
  account_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  rev integer not null check (rev > 0),
  key_id text not null check (char_length(key_id) <= 32),
  data text not null check (char_length(data) <= 2000000),
  seq bigint not null,
  updated_at timestamptz not null default now(),
  primary key (account_id, id)
);
create sequence if not exists public.sync_seq;
create index if not exists sync_records_seq on public.sync_records (account_id, seq);

-- 3. Locked copies of the master key (passphrase, recovery code). Write once.
create table if not exists public.sync_key_bundles (
  account_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  data text not null check (char_length(data) <= 10000),
  created_at timestamptz not null default now(),
  primary key (account_id, id)
);

-- 4. Row rules (RLS): only the owner, only their own rows.
alter table public.sync_records enable row level security;
alter table public.sync_key_bundles enable row level security;

drop policy if exists "owner reads records" on public.sync_records;
create policy "owner reads records" on public.sync_records
  for select to authenticated
  using (account_id = auth.uid() and public.sync_is_owner());
-- No insert/update/delete policy: records change only through sync_push.

drop policy if exists "owner reads bundles" on public.sync_key_bundles;
create policy "owner reads bundles" on public.sync_key_bundles
  for select to authenticated
  using (account_id = auth.uid() and public.sync_is_owner());
drop policy if exists "owner adds bundles" on public.sync_key_bundles;
create policy "owner adds bundles" on public.sync_key_bundles
  for insert to authenticated
  with check (account_id = auth.uid() and public.sync_is_owner());

revoke all on public.sync_records from anon;
revoke all on public.sync_key_bundles from anon;
grant select on public.sync_records to authenticated;
grant select, insert on public.sync_key_bundles to authenticated;

-- 5. Save with compare-and-swap: each item is saved only if the server still
-- has the revision the device started from (`base_rev`, 0 = new).
create or replace function public.sync_push(items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  item jsonb;
  new_rev integer;
  new_seq bigint;
  accepted jsonb := '[]'::jsonb;
  conflicts jsonb := '[]'::jsonb;
begin
  if uid is null or not public.sync_is_owner() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 500 then
    raise exception 'bad items' using errcode = '22023';
  end if;
  for item in select * from jsonb_array_elements(items) loop
    new_seq := nextval('public.sync_seq');
    if (item ->> 'base_rev')::integer = 0 then
      insert into public.sync_records (account_id, id, rev, key_id, data, seq)
      values (uid, item ->> 'id', 1, item ->> 'key_id', item ->> 'data', new_seq)
      on conflict (account_id, id) do nothing
      returning rev into new_rev;
    else
      update public.sync_records
         set rev = rev + 1, key_id = item ->> 'key_id', data = item ->> 'data',
             seq = new_seq, updated_at = now()
       where account_id = uid and id = item ->> 'id'
         and rev = (item ->> 'base_rev')::integer
      returning rev into new_rev;
    end if;
    if new_rev is null then
      conflicts := conflicts || to_jsonb(item ->> 'id');
    else
      accepted := accepted || jsonb_build_object('id', item ->> 'id', 'rev', new_rev, 'seq', new_seq);
    end if;
    new_rev := null;
  end loop;
  return jsonb_build_object('accepted', accepted, 'conflicts', conflicts);
end;
$$;
revoke all on function public.sync_push(jsonb) from public, anon;
grant execute on function public.sync_push(jsonb) to authenticated;

-- 6. Server time (clock check).
create or replace function public.sync_now()
returns bigint
language sql
stable
as $$ select (extract(epoch from now()) * 1000)::bigint $$;
revoke all on function public.sync_now() from public, anon;
grant execute on function public.sync_now() to authenticated;

-- 7. Sign-up rule (Auth hook "Before User Created"): refuse every other
-- email before an account is even made. Turn it on in Authentication ›
-- Hooks (see the owner steps).
create or replace function public.hook_only_owner(event jsonb)
returns jsonb
language plpgsql
as $$
begin
  if lower(coalesce(event -> 'user' ->> 'email', '')) = 'priyanahubadhanalegends@gmail.com' then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object('http_code', 403, 'message', 'This app is private.')
  );
end;
$$;
grant execute on function public.hook_only_owner(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_only_owner(jsonb) from authenticated, anon, public;
