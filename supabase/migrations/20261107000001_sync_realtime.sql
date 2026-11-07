-- Learning Notes sync, real-time pings (R6-13). Run once in Supabase › SQL
-- Editor after 20261106000001_sync.sql (see docs/plans/owner-checks-pending.md,
-- "SYNC REALTIME SETUP"). Safe to run again.
--
-- One small row per account, touched by every accepted save. Devices listen
-- to it over Realtime (a websocket) and pull at once instead of waiting for
-- the next poll. The row carries only the server order: never a record.

-- 1. The ping row.
create table if not exists public.sync_pings (
  account_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  seq bigint not null,
  updated_at timestamptz not null default now()
);
alter table public.sync_pings enable row level security;
drop policy if exists "owner reads pings" on public.sync_pings;
create policy "owner reads pings" on public.sync_pings
  for select to authenticated
  using (account_id = auth.uid() and public.sync_is_owner());
-- No insert/update policy: only sync_push (security definer) writes it.
revoke all on public.sync_pings from anon;
grant select on public.sync_pings to authenticated;
-- Realtime sends the whole row of an update when the table has full replica
-- identity; the row is tiny, and the filter (account_id) needs it.
alter table public.sync_pings replica identity full;

-- 2. sync_push also touches the ping row (same body as before, plus step 2b).
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
  last_seq bigint := null;
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
      last_seq := new_seq;
    end if;
    new_rev := null;
  end loop;
  -- 2b. One ping per push, after the records are in.
  if last_seq is not null then
    insert into public.sync_pings (account_id, seq) values (uid, last_seq)
    on conflict (account_id) do update set seq = excluded.seq, updated_at = now();
  end if;
  return jsonb_build_object('accepted', accepted, 'conflicts', conflicts);
end;
$$;
revoke all on function public.sync_push(jsonb) from public, anon;
grant execute on function public.sync_push(jsonb) to authenticated;

-- 3. Publish the ping table to Realtime (once; the check keeps it re-runnable).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sync_pings'
  ) then
    alter publication supabase_realtime add table public.sync_pings;
  end if;
end $$;
