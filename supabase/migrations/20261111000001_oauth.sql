-- Online Claude connector (plan B), slice 2: OAuth 2.1 tables. Run once in
-- Supabase > SQL Editor (or `supabase db push`). Safe to run again.
--
-- Nothing here is readable from a browser: RLS is on, NO policy exists and the
-- app roles have no rights, so only the `mcp` Edge Function (service role) can
-- touch these tables. Tokens and codes are stored only as SHA-256 hashes, so a
-- leaked table cannot be used to call the connector.

create table if not exists public.oauth_clients (
  id text primary key check (char_length(id) <= 200),
  name text not null check (char_length(name) <= 100),
  redirect_uris text[] not null check (cardinality(redirect_uris) between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.oauth_codes (
  hash text primary key check (char_length(hash) = 64),
  client_id text not null references public.oauth_clients (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  redirect_uri text not null,
  challenge text not null check (char_length(challenge) = 43),
  scopes text[] not null,
  audience text not null,
  expires_at timestamptz not null
);

create table if not exists public.oauth_tokens (
  hash text primary key check (char_length(hash) = 64),
  kind text not null check (kind in ('access', 'refresh')),
  family text not null,
  client_id text not null references public.oauth_clients (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  scopes text[] not null,
  audience text not null,
  expires_at timestamptz not null,
  used_at timestamptz
);
create index if not exists oauth_tokens_family_idx on public.oauth_tokens (family);
create index if not exists oauth_tokens_user_idx on public.oauth_tokens (user_id);
create index if not exists oauth_tokens_expires_idx on public.oauth_tokens (expires_at);
create index if not exists oauth_codes_expires_idx on public.oauth_codes (expires_at);

alter table public.oauth_clients enable row level security;
alter table public.oauth_codes enable row level security;
alter table public.oauth_tokens enable row level security;
revoke all on public.oauth_clients, public.oauth_codes, public.oauth_tokens
  from anon, authenticated;

-- Housekeeping: drops expired codes and tokens (a refresh token is kept a day
-- past its expiry so a replay of an old one is still caught). Called by the
-- function now and then; never from a browser.
create or replace function public.oauth_cleanup() returns void
language sql security definer set search_path = public as $$
  delete from public.oauth_codes where expires_at < now();
  delete from public.oauth_tokens where expires_at < now() - interval '1 day';
$$;
revoke all on function public.oauth_cleanup() from public, anon, authenticated;
