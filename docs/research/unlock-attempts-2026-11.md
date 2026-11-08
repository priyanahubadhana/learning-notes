# Wrong passphrase / recovery code: errors, retries and waits (research, 2026-11-08)

Question: how should the unlock boxes (Settings › Sync, `src/onboarding/SignInGuide.tsx`) handle a wrong
passphrase or recovery code? The owner wants a clear red error, an easy retry, ~3 free tries, then a few-minute wait.

## What others do

| Product                   | Where the limit lives                                                               | Schedule / limit                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| iPhone passcode           | Secure Enclave (hardware)                                                           | Tries 1–4 free, then 1 min, 5 min, 15 min, 1 h, 3 h, 8 h; survives restart; repeating the same wrong code does not count; optional erase after 10 [1] |
| iCloud Keychain escrow    | Apple HSM cluster (server hardware)                                                 | 10 tries total; locked after several, Support can grant more; 10th failure destroys the record [2]                                                    |
| Signal PIN (SVR)          | SGX enclave on the server                                                           | Small fixed guess count, then the secret is gone [3][4]                                                                                               |
| WhatsApp encrypted backup | HSM "Backup Key Vault"                                                              | Limited tries, then the key is permanently unreachable; researchers found a hostile server could get extra guesses [5][6]                             |
| Bitwarden                 | Server rate limit (login); PIN unlock: "require master password after 5 wrong PINs" | Details kept private [7]                                                                                                                              |
| NIST SP 800-63B           | Verifier (server)                                                                   | At most 100 consecutive failures per account; prefer throttling (growing waits, CAPTCHA) over hard lockout [8]                                        |
| OWASP                     | Server                                                                              | Generic error, growing delays instead of permanent lockout, beware lockout abuse [9]                                                                  |

Lesson: **every limit that really stops guessing lives in hardware or on a server that holds the secret.**
A limit in app code on the attacker's own machine is a speed bump for a casual person at the keyboard, nothing more.
Google/1Password specifics were not found in public docs in this pass; not used.

## Honest check for our app

- The test is local: the app downloads the locked key copy and tries to open it. Anyone who has the user's Google
  session (or the Drive **spare key** file) can copy the bundle and guess offline at full speed. A local lockout
  cannot stop that, and clearing site data resets it.
- Real defences already in place: **Argon2id 64 MiB, t=3** (each guess costs ~0.5–1 s and 64 MiB of memory, so
  big guessing farms are slow) and a **128-bit recovery code** (not guessable at all, with or without limits).
  The weak link is a short or common passphrase; the 12+ letter check is what protects it.
- So the local waits are for: stopping someone at an unlocked laptop trying a few guesses, and calm UX. Say so in docs; never claim "guessing is impossible because of the wait".

## Server-side counter: feasible? worth it?

Feasible in Supabase at ₹0: hide the bundle table from direct reads and give it out only through a `security definer`
RPC that counts tries per user [10]. But it is **not worth it now**:

1. The passphrase copy also sits in the user's Drive as the spare key, which the server cannot rate-limit.
   The counter would only guard one of two doors.
2. The server cannot tell a wrong guess from a right one (it never sees the passphrase; checking happens on the device).
   It could only limit _downloads_, and one download is enough for unlimited offline guessing.
3. Making it real needs a server-checked secret (like Signal/Apple: OPAQUE/SRP or an enclave) — a redesign and an outside review. Park for the sync audit.

If ever wanted, the shape (no secrets; names illustrative):

```sql
create table unlock_throttle (user_id uuid primary key references auth.users,
  fetches int not null default 0, window_start timestamptz not null default now());
alter table unlock_throttle enable row level security;           -- no policies: no direct access
revoke select on key_bundles from authenticated;                 -- bundles only via the function
create function get_key_bundle() returns setof key_bundles
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.unlock_throttle(user_id) values (auth.uid())
    on conflict (user_id) do update set
      fetches = case when unlock_throttle.window_start < now() - interval '1 hour' then 1
                     else unlock_throttle.fetches + 1 end,
      window_start = case when unlock_throttle.window_start < now() - interval '1 hour' then now()
                          else unlock_throttle.window_start end;
  if (select fetches from public.unlock_throttle where user_id = auth.uid()) > 10 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;
  return query select * from public.key_bundles where user_id = auth.uid();
end $$;
```

## Recommended design (local, per device)

**Error and retry (like a Wi-Fi box)**

- On a wrong try: keep the typed text, select it all and keep focus in the box (fixing one typo is easy; one key wipes it).
- Red border + red text under the box, plus an icon (not colour alone):
  - Passphrase: "That passphrase didn't work. Check caps lock and try again."
  - Code: "That recovery code didn't match. Check each letter and try again."
- Show/hide eye button on the passphrase (default hidden; `aria-pressed`, label "Show passphrase"). Code box shown as plain text.
- Caps lock hint when detected. "Forgot it? Use your recovery code" link under the passphrase box (and back).
- While Argon2id runs: button shows "Checking…", disabled, so one press = one try.

**Waits** — 3 free tries, then: 4th wrong → 1 min, 5th → 5 min, 6th → 15 min, 7th and later → 1 h each (cap, never permanent lockout, never erase data).

- Message during a wait: "Too many tries. Try again in 4:32." Live countdown; box and button disabled; the "use your recovery code" / "Get help" links stay usable.
- Same schedule, separate counters for passphrase and code (a user who forgot the passphrase must still reach the code).
- Same wrong value twice in a row does not count (Apple does this; protects typo-retry). Store only a short hash of the last attempt in memory, never on disk.
- Persist per device in `localStorage` key `unlock-throttle-v1`: `{ kind, fails, lockedUntil (UTC ms) }`. Survives reload. Reset to 0 on success.
  If the stored clock is in the future by more than the max wait (clock changed), clamp to 1 h.
- Wording in docs/help: "This slows down someone at your device. Your real protection is a long passphrase and your recovery code."

**Recovery code input tolerance**

- Accept any case, spaces, dashes, dots, line breaks (paste from a printout or note). Normalise: uppercase, remove everything not in the code alphabet, then check length = 26.
- Show it back grouped (e.g. `ABCD-EFGH-…`) as the user types; if the alphabet excludes look-alikes, map O→0 / I,L→1 (or the reverse) per our alphabet.
- Wrong length: say so before trying ("The code has 26 letters; you typed 24") — this does **not** count as a try.

**Accessibility** [11][12]

- Error text in an element with an id; input gets `aria-invalid="true"` (only after a check) and `aria-describedby` pointing to it.
- Error/wait region is `role="alert"` once (not every countdown second; announce the wait start, then a `aria-live="polite"` update each minute).
- Focus stays in the box; the red is also shown by icon + text; 4.5:1 contrast in light and dark.

## Sources

1. Apple Platform Security, Passcodes and passwords — https://support.apple.com/guide/security/sec20230a10d/web
2. Apple Platform Security, Escrow security for iCloud Keychain — https://support.apple.com/guide/security/sec3e341e75d/
3. Signal, Secure Value Recovery — https://signal.org/blog/secure-value-recovery/ and https://github.com/signalapp/SecureValueRecovery2
4. M. Green, thoughts on Signal SVR — https://blog.cryptographyengineering.com/2020/07/10/a-few-thoughts-about-signals-secure-value-recovery/
5. Meta Engineering, WhatsApp E2EE backups — https://engineering.fb.com/2021/09/10/security/whatsapp-e2ee-backups/
6. Davies et al., IACR ePrint 2023/843 — https://eprint.iacr.org/2023/843.pdf
7. Bitwarden community, rate limiting / PIN — https://community.bitwarden.com/t/denial-expiration-of-repeated-login-attempts-time-based-or-repetition-based/90455 ; https://github.com/bitwarden/android/issues/258
8. NIST SP 800-63B §5.2.2 (rev 3 text) — https://openid-foundation-japan.github.io/800-63-3/sp800-63b/sec5_authenticators.html
9. OWASP brute force / ASVS anti-automation — https://wiki.owasp.org/index.php/OWASP_Periodic_Table_of_Vulnerabilities_-_Brute_Force_Login ; https://owasp-aasvs4.readthedocs.io/en/latest/2.2.1.html
10. Supabase, Securing your API — https://supabase.com/docs/guides/api/securing-your-api
11. W3C ARIA21 — https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA21
12. W3C Understanding 3.3.1 — https://w3c.github.io/wcag/understanding/error-identification
