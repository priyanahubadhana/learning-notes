-- Learning Notes sync: "Make a new recovery code". Run once in Supabase >
-- SQL Editor (docs/plans/owner-checks-pending.md). Safe to run again.
--
-- The app may remove the owner's OLD recovery-code copy after the new one is
-- stored. Only recovery copies (id contains "-r-") can be removed: the
-- passphrase copy can never be deleted from the app.
drop policy if exists "owner removes recovery bundles" on public.sync_key_bundles;
create policy "owner removes recovery bundles" on public.sync_key_bundles
  for delete to authenticated
  using (account_id = auth.uid() and public.sync_is_owner() and id like '%-r-%');
grant delete on public.sync_key_bundles to authenticated;
