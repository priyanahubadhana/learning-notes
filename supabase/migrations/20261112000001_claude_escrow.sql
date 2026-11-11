-- Online Claude connector (plan B), slices 3-5: the opt-in key escrow, the
-- write door for the connector, and the audit log. Run once in Supabase >
-- SQL Editor (or `supabase db push`) AFTER 20261111000001_oauth.sql. Safe to
-- run again.
--
-- Nothing here is readable or writable from a browser: RLS is on, NO policy
-- exists and the app roles have no rights, so only the `mcp` Edge Function
-- (service role) touches these tables.

-- 1. The escrow: the master key wrapped with a server secret (HKDF of a secret
-- from the function's environment + the user id). Without that secret the row
-- is useless. One row per person; deleting it switches Claude off.
create table if not exists public.claude_escrow (
  user_id uuid primary key references auth.users (id) on delete cascade,
  key_id text not null check (char_length(key_id) <= 32),
  wrapped text not null check (char_length(wrapped) between 1 and 400),
  -- null = every notebook; otherwise only these notebook ids.
  notebook_ids text[] check (notebook_ids is null or cardinality(notebook_ids) <= 500),
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

-- 2. The audit log: what Claude did, never what it read or wrote.
create table if not exists public.claude_audit (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  tool text not null check (char_length(tool) <= 40),
  client_id text not null check (char_length(client_id) <= 200),
  ids text[] not null default '{}' check (cardinality(ids) <= 60),
  counts jsonb not null default '{}'::jsonb
);
create index if not exists claude_audit_user_idx on public.claude_audit (user_id, at desc);

alter table public.claude_escrow enable row level security;
alter table public.claude_audit enable row level security;
revoke all on public.claude_escrow, public.claude_audit from anon, authenticated;

-- 3. Save new records for the connector, all or nothing. The same
-- compare-and-swap as sync_push (base_rev 0 = must be new), but for a named
-- person (the function checked who it is) and any conflict undoes the whole
-- call, so a half-made notebook cannot appear.
create or replace function public.claude_push(uid uuid, items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  new_rev integer;
  new_seq bigint;
  accepted jsonb := '[]'::jsonb;
begin
  if uid is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 1000 then
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
      raise exception 'conflict' using errcode = '40001';
    end if;
    accepted := accepted || jsonb_build_object('id', item ->> 'id', 'rev', new_rev, 'seq', new_seq);
    new_rev := null;
  end loop;
  return jsonb_build_object('accepted', accepted);
end;
$$;
revoke all on function public.claude_push(uuid, jsonb) from public, anon, authenticated;

-- 4. Auto-expiry: escrow unused for 30 days is deleted, and so are the
-- person's Claude passes. The function calls this now and then.
create or replace function public.claude_escrow_cleanup() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with gone as (
    delete from public.claude_escrow
     where last_used_at < now() - interval '30 days'
    returning user_id
  ), cut as (
    delete from public.oauth_tokens where user_id in (select user_id from gone)
  )
  select count(*) into n from gone;
  return n;
end;
$$;
revoke all on function public.claude_escrow_cleanup() from public, anon, authenticated;
