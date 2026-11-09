-- Drive pass keeper: one locked Google refresh token per account. Run once in
-- Supabase > SQL Editor (docs/plans/owner-checks-pending.md, "Drive stays
-- connected"). Safe to run again.
--
-- The token is locked (AES-GCM) by the `drive-token` function with the secret
-- DRIVE_TOKEN_KEY. RLS is on and NO policy exists, and the app roles have no
-- rights, so a browser can never read or write this table; only the function
-- (service role) can, after it has checked that the caller is the owner.

create table if not exists public.drive_tokens (
  account_id uuid primary key references auth.users (id) on delete cascade,
  data text not null check (char_length(data) <= 4000),
  updated_at timestamptz not null default now()
);
alter table public.drive_tokens enable row level security;
revoke all on public.drive_tokens from anon, authenticated;
