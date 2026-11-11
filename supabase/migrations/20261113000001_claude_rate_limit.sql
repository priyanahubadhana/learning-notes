-- Online Claude connector (plan B), slice 8: rate limits. Run once in Supabase >
-- SQL Editor (or `supabase db push`) AFTER 20261112000001_claude_escrow.sql.
-- Safe to run again.
--
-- Limits per person: 60 reads a minute, 20 writes a minute, 500 writes a day.
-- A call over the limit is refused (HTTP 429 with Retry-After) and is not
-- counted. Like the other Claude tables: RLS on, no policy, no rights for the
-- app roles; only the `mcp` Edge Function (service role) reaches them.

create table if not exists public.claude_rate (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null check (bucket in ('read:min', 'write:min', 'write:day')),
  -- Start of the window, in seconds since 1970 (UTC).
  window_start bigint not null,
  hits integer not null default 0 check (hits >= 0),
  primary key (user_id, bucket, window_start)
);
alter table public.claude_rate enable row level security;
revoke all on public.claude_rate from anon, authenticated;

-- Counts one call. Returns {"ok": true} or {"ok": false, "retry_after": seconds}.
-- The `where hits < limit` makes the count-and-check one atomic step, so two
-- calls at the same moment cannot both slip under the limit.
create or replace function public.claude_rate_hit(uid uuid, kind text, now_ms bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  minute_limit integer;
  mstart bigint;
  dstart bigint;
  got integer;
begin
  if uid is null or kind not in ('read', 'write') or now_ms is null then
    raise exception 'bad call' using errcode = '22023';
  end if;
  minute_limit := case kind when 'read' then 60 else 20 end;
  mstart := (now_ms / 60000) * 60;
  dstart := (now_ms / 86400000) * 86400;

  insert into public.claude_rate as r (user_id, bucket, window_start, hits)
  values (uid, kind || ':min', mstart, 1)
  on conflict (user_id, bucket, window_start)
    do update set hits = r.hits + 1 where r.hits < minute_limit
  returning hits into got;
  if got is null then
    return jsonb_build_object('ok', false, 'retry_after', greatest(1, mstart + 60 - now_ms / 1000));
  end if;

  if kind = 'write' then
    got := null;
    insert into public.claude_rate as r (user_id, bucket, window_start, hits)
    values (uid, 'write:day', dstart, 1)
    on conflict (user_id, bucket, window_start)
      do update set hits = r.hits + 1 where r.hits < 500
    returning hits into got;
    if got is null then
      -- Over the day's limit: give back the minute hit just taken.
      update public.claude_rate
         set hits = greatest(0, hits - 1)
       where user_id = uid and bucket = 'write:min' and window_start = mstart;
      return jsonb_build_object('ok', false, 'retry_after', greatest(1, dstart + 86400 - now_ms / 1000));
    end if;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.claude_rate_hit(uuid, text, bigint) from public, anon, authenticated;

-- Old counters (and audit lines older than 90 days) are removed now and then;
-- the function calls this together with the escrow cleanup.
create or replace function public.claude_rate_cleanup() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from public.claude_rate
   where window_start < extract(epoch from now())::bigint - 2 * 86400;
  get diagnostics n = row_count;
  delete from public.claude_audit where at < now() - interval '90 days';
  return n;
end;
$$;
revoke all on function public.claude_rate_cleanup() from public, anon, authenticated;
