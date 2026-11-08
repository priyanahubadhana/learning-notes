# Attention alerts — research and design (2026-11)

Problem: sync/backup/update problems show only a red dot in Settings behind the gear. Users miss them (hidden notebooks, stale Drive token).

## Findings (with sources)

- **NN/g:** pick the UI by urgency and whether the user must act. Use modals only for action-required, urgent events. Use banners or badges for passive information, and don't put critical messages in them alone. **Never use a toast for errors**: in one case a user waited 5 minutes because a 5-second error toast faded. Interruptions unrelated to the current goal get ignored or resented. https://www.nngroup.com/articles/indicators-validations-notifications/
- **Apple HIG (Alerts):** use alerts sparingly, only for critical info that needs action now. Don't chain alerts. Use specific verb buttons ("Reconnect", not "OK") and at most ~2–3 buttons. https://developer.apple.com/design/human-interface-guidelines/alerts
- **Material banners:** persistent and non-modal. **One banner at a time.** Pair dismiss with a fixing action, not a lone "OK". They stay until resolved or dismissed, with no auto-timeout (same in Mozilla Acorn). https://m3.material.io/components/banners , https://acorn.firefox.com/latest/mobile/components/banner/android-8QAJBJ4r
- **Material snackbar:** brief, low-priority feedback about the user's own action, with at most one action, and it may time out. Not for problems that persist. https://m3.material.io/components/snackbar/guidelines
- **App patterns (product observation, general knowledge; not verified page-by-page this session):**
  - Google Docs shows an "offline/reconnecting" status inline in the doc header, not a pop-up.
  - Dropbox and Google Drive desktop show a tray badge, then a persistent "Sign in again" notice with one button.
  - 1Password and Bitwarden use a full lock screen when the vault is locked. You can't see the data until you unlock, so the unlock prompt _is_ the screen.
  - Obsidian Sync shows a status-bar icon that turns red, plus a notice on error.
  - Slack shows a top yellow/red bar for "connection trouble / reconnecting", which clears itself.
  - Notion shows a small offline banner.
  - iCloud uses a Settings badge plus a one-time system alert for "storage full".
  - Shared lesson: **badge for status, banner for a fixable problem, modal only when the app can't show the user's content.**
- **Accessibility:** banners go in `role="status"` with `aria-live="polite"`. Use `role="alert"` (assertive) only for blocking errors. Modals use `role="alertdialog"` with focus trapped and focus returned on close. Never rely on colour alone. https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/ , https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role
- **Alert fatigue:** show one surface at a time and keep severity honest. Don't re-show the same thing within the same session after a dismissal. Clear it automatically when it's fixed. Let transient errors retry silently before telling the user.

## Severity levels for our app

| Level            | UI                                                         | Interrupts?           | Dismiss                                                                                          |
| ---------------- | ---------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| L1 Blocking      | One modal (`alertdialog`)                                  | Yes, once per session | "Later" closes it; after that, an L2 banner remains                                              |
| L2 Action needed | Top banner, bright (danger/warn token), one fix button + × | No                    | × snoozes it for this session; it returns on next app start, or sooner if the problem gets worse |
| L3 Heads-up      | Top banner, calm (accent token)                            | No                    | × snoozes it for 7 days                                                                          |
| L4 Status        | Dot on gear + Settings › Sync status (exists today)        | No                    | Not dismissable; clears when fixed                                                               |

Every L1–L3 problem also keeps the L4 dot, so Settings is always the full record.

## Mapping our problem types

| Problem (code)                                        | Level                                                  | Copy idea                                     | Buttons                                      |
| ----------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------- | -------------------------------------------- |
| `phase: needsKey` after sign-in (notebooks hidden)    | L1                                                     | "Your notebooks are locked on this device"    | Enter passphrase · Use recovery code · Later |
| `problem: needCode` / `unreadable`                    | L1                                                     | "This key can't open your notes"              | Use recovery code · Later                    |
| `needsDriveTap` / `signInAgain` (Drive token expired) | L2                                                     | "Drive disconnected — changes aren't syncing" | Reconnect Drive · ×                          |
| `driveFull`                                           | L2                                                     | "Google Drive is full — sync paused"          | Open Drive storage · ×                       |
| `notAllowed`                                          | L2                                                     | "This Google account can't sync"              | Switch account · ×                           |
| `clock`                                               | L2                                                     | "Your device clock is wrong — sync paused"    | How to fix · ×                               |
| `failed` repeated (3+ tries or >30 min)               | L2                                                     | "Sync keeps failing"                          | Try again · ×                                |
| Backup failing (2+ in a row)                          | L2                                                     | "Backups are failing"                         | Open backups · ×                             |
| Storage almost full (>90% local quota)                | L3                                                     | "Storage almost full"                         | Manage storage · ×                           |
| Update needed (old app can't read new data)           | L2; plain update available = L3 (existing `UpdateBar`) | "Update to keep syncing"                      | Update now · ×                               |
| `needsSetup`                                          | L3                                                     | "Finish setting up sync"                      | Set up · ×                                   |
| `offline`, `busy`, single `failed`                    | L4 only                                                | —                                             | Silent retry; dot says Offline               |

## Rules

1. **One surface at a time.** Show the highest level only, and never stack banners. If an L1 modal is open, no banner appears. The other problems stay listed in Settings › Sync status.
2. **Interrupt only at safe moments.** Show the modal on app start or right after sign-in, never mid-typing. If the user is typing, wait until the editor is idle for about 2 seconds.
3. **Snooze per problem code**, stored as a per-device convenience in localStorage, key `attn.snooze.<code>`. Wrap access in try/catch, and if storage fails, just show the banner.
4. **Re-show after dismiss** in these cases: on the next app start (L2), when the problem gets worse (e.g. backup fails again after 24 h), or when the problem code changes.
5. **Auto-clear** as soon as `syncStatus` no longer has the problem. Then show a short success toast ("Drive reconnected"). That's the only place a toast is used.
6. **One-tap fix:** the main button runs the fix directly (e.g. opens the Drive consent page or the passphrase sheet), not just Settings. A secondary "Details" link opens Settings › Sync.
7. **Words:** plain and specific. Say what's wrong, the effect on the user ("not syncing"), and what to do. No error codes in the UI.
8. **A11y:**
   - Banner: `role="status"`, `aria-live="polite"`, × labelled "Dismiss". Use `role="alert"` only for L1.
   - Modal: focus trap, Esc = Later, focus returns to where it was.
   - Buttons at least 44 px, and no colour-only meaning.
   - The banner sits in normal flow at the top, so it pushes content down instead of covering it. Respects safe-area.

## Where it lives in code (no src edits made)

- **Source of truth:** `src/sync/syncStatus.ts` (`phase`, `problem`, `needsDriveTap`), `src/sync/syncDisplay.ts` (`SyncProblem`), `src/sync/useSyncLabel.ts`, and `src/sync/SyncDot.tsx` (L4 stays as is).
- **New `src/app/attention/attentionLevel.ts`** (tiny, eager, ~1 KB): a pure function that turns the status into `{code, level}` or null. It also reads backup, storage and update state. Unit-test it.
- **New `src/app/attention/AttentionBanner.tsx` + `AttentionModal.tsx`**: load them lazily with `React.lazy`, _only when_ the level is not null. Healthy users download nothing extra, which protects the tight first-load budget (about 299 KB).
- **Mount point:** the `src/App.tsx` top layout, above the main area.
- **Reuse:**
  - `UpdateBar.tsx` styling for the banner shell. Better still, fold UpdateBar into the banner so there's one system, not two bars.
  - The existing passphrase/recovery sheet from Settings › Sync for L1.
  - `Toast` from `src/app/ui.tsx` for the "fixed" message.
- **i18n:** add `attention.*` keys to `src/i18n/enO.ts`. That file already loads late, so the strings ride the lazy chunk. Mirror the keys in `hiO.ts` and `esO.ts`.
- **Tests:**
  - e2e: expired token → banner → Reconnect; needsKey → modal → Later → banner remains; dismiss → reload → banner returns.
  - Unit: level mapping and snooze rules.

## Open questions for owner

- Is "Later" on the locked modal OK? (Safer than forcing it: the user may not have the passphrase at hand.)
- Should UpdateBar merge into this banner system? (Recommended.)
