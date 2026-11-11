-- Learning Notes: the local Claude connector (mcp/) as its own revocable
-- device (Connector A, slice 3). Run once in Supabase > SQL Editor, after
-- 20261106000001_sync.sql and 20261107000001_sync_realtime.sql. Safe to run
-- again. NOT deployed yet (needs the owner's OK).
--
-- How it works. The connector signs in with its own session (its own sign-in
-- token pair). It registers that session here as a "device". Revoke marks the
-- session revoked; from then on the database refuses that session everything
-- that touches notes (reads of records and key copies, and every save), even
-- while its access token is still valid. A revoked session can never register
-- again; reconnecting means running `setup` on the PC (a new session).
-- The app's own browser sessions are never registered, so nothing changes
-- for them. Nothing here ever holds note content.

-- 1. The registry.
create table if not exists public.connector_devices (
  account_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null,
  device_id text not null check (char_length(device_id) between 1 and 40),
  name text not null check (char_length(name) between 1 and 60),
  kind text not null default 'mcp' check (kind = 'mcp'),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (account_id, session_id)
);
alter table public.connector_devices enable row level security;
drop policy if exists "owner reads connector devices" on public.connector_devices;
create policy "owner reads connector devices" on public.connector_devices
  for select to authenticated
  using (account_id = auth.uid() and public.sync_is_owner());
-- No insert/update/delete policy: rows change only through the functions below.
revoke all on public.connector_devices from anon, authenticated;
grant select on public.connector_devices to authenticated;

-- 2. The audit trail of what the connector wrote (never any content).
create table if not exists public.connector_audit (
  id bigint generated always as identity primary key,
  account_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  device_id text not null,
  tool text not null check (char_length(tool) <= 40),
  ids text[] not null default '{}' check (cardinality(ids) <= 60),
  counts jsonb not null default '{}'::jsonb
);
create index if not exists connector_audit_account_at on public.connector_audit (account_id, at desc);
alter table public.connector_audit enable row level security;
drop policy if exists "owner reads connector audit" on public.connector_audit;
create policy "owner reads connector audit" on public.connector_audit
  for select to authenticated
  using (account_id = auth.uid() and public.sync_is_owner());
revoke all on public.connector_audit from anon, authenticated;
grant select on public.connector_audit to authenticated;

-- 3. Which session is asking, and is it revoked?
create or replace function public.connector_session() returns uuid
language sql stable set search_path = '' as $$
  select nullif(auth.jwt() ->> 'session_id', '')::uuid
$$;

create or replace function public.sync_session_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from public.connector_devices d
     where d.account_id = auth.uid()
       and d.session_id = public.connector_session()
       and d.revoked_at is not null
  )
$$;
revoke all on function public.sync_session_ok() from public, anon;
grant execute on function public.sync_session_ok() to authenticated;

-- 4. A revoked session reads no records and no key copies ...
drop policy if exists "owner reads records" on public.sync_records;
create policy "owner reads records" on public.sync_records
  for select to authenticated
  using (account_id = auth.uid() and public.sync_is_owner() and public.sync_session_ok());

drop policy if exists "owner reads bundles" on public.sync_key_bundles;
create policy "owner reads bundles" on public.sync_key_bundles
  for select to authenticated
  using (account_id = auth.uid() and public.sync_is_owner() and public.sync_session_ok());

-- ... and saves nothing. A trigger (not a copy of sync_push) so the save
-- function stays as it is; the error undoes the whole save.
create or replace function public.sync_records_session_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.sync_session_ok() then
    raise exception 'this connection was revoked' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.sync_records_session_guard() from public, anon, authenticated;
drop trigger if exists sync_records_session_guard on public.sync_records;
create trigger sync_records_session_guard
  before insert or update on public.sync_records
  for each row execute function public.sync_records_session_guard();

-- 5. Register this session as a device. A revoked session cannot come back;
-- an older live session of the same device id is replaced (one live
-- connection per device).
create or replace function public.connector_register(p_device_id text, p_name text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  sid uuid := public.connector_session();
  old record;
begin
  if uid is null or not public.sync_is_owner() or sid is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if exists (select 1 from public.connector_devices
              where account_id = uid and session_id = sid and revoked_at is not null) then
    raise exception 'this connection was revoked' using errcode = '42501';
  end if;
  for old in
    update public.connector_devices
       set revoked_at = now()
     where account_id = uid and device_id = p_device_id
       and session_id <> sid and revoked_at is null
    returning session_id
  loop
    begin
      delete from auth.sessions where id = old.session_id and user_id = uid;
    exception when others then null; -- best effort; the registry already refuses it
    end;
  end loop;
  insert into public.connector_devices (account_id, session_id, device_id, name)
  values (uid, sid, left(p_device_id, 40), left(p_name, 60))
  on conflict (account_id, session_id)
  do update set last_seen_at = now(), name = excluded.name, device_id = excluded.device_id;
  return 'ok';
end;
$$;

-- 6. 'ok' | 'revoked' | 'unregistered'. Also notes "last seen" (at most once a minute).
create or replace function public.connector_status() returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.connector_devices;
begin
  if uid is null or not public.sync_is_owner() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into d from public.connector_devices
   where account_id = uid and session_id = public.connector_session();
  if not found then return 'unregistered'; end if;
  if d.revoked_at is not null then return 'revoked'; end if;
  if d.last_seen_at < now() - interval '1 minute' then
    update public.connector_devices set last_seen_at = now()
     where account_id = uid and session_id = d.session_id;
  end if;
  return 'ok';
end;
$$;

-- 7. Revoke (the app's button). Only your own devices. Also ends the session
-- itself where the database allows it, so the renewal token stops working too.
create or replace function public.connector_revoke(p_session_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  hit integer;
begin
  if uid is null or not public.sync_is_owner() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.connector_devices set revoked_at = now()
   where account_id = uid and session_id = p_session_id and revoked_at is null;
  get diagnostics hit = row_count;
  if hit > 0 then
    begin
      delete from auth.sessions where id = p_session_id and user_id = uid;
    exception when others then null;
    end;
  end if;
  return hit > 0;
end;
$$;

-- 8. One audit line per write (the connector calls this after a save).
create or replace function public.connector_audit_add(p_tool text, p_ids text[], p_counts jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  dev text;
begin
  if uid is null or not public.sync_is_owner() or not public.sync_session_ok() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select device_id into dev from public.connector_devices
   where account_id = uid and session_id = public.connector_session();
  insert into public.connector_audit (account_id, device_id, tool, ids, counts)
  values (uid, coalesce(dev, 'unregistered'), left(p_tool, 40), p_ids[1:60], coalesce(p_counts, '{}'::jsonb));
end;
$$;

revoke all on function
  public.connector_register(text, text), public.connector_status(),
  public.connector_revoke(uuid), public.connector_audit_add(text, text[], jsonb)
  from public, anon;
grant execute on function
  public.connector_register(text, text), public.connector_status(),
  public.connector_revoke(uuid), public.connector_audit_add(text, text[], jsonb)
  to authenticated;
