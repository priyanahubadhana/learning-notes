# Security mediums (slice 11, flag `security.m1`)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

In plain words: four small locks on the doors. (1) Guessing a PIN gets slower and slower. (2) New PINs have 6 digits and new lock passwords at least 8 characters; old shorter ones keep working until you change them. (3) A picture stored on another website never loads by itself, anywhere in the app; you tap to allow it. (4) The website sends stricter safety headers, without breaking Google sign-in, Drive, fonts, PDFs, OCR, embeds or the microphone.

Sources: `docs/PENDING.md` "Audits 11 Nov" (security mediums and lows) and "Carry-over review"; build plan 3.3 row 11; audit batch 5 problem "five different minimum password lengths"; [lock.md](lock.md); [encryption.md](encryption.md). **Nothing here needs a Supabase change** (see "Needs the owner").

## How it works (what exists, what changes)

### 1. Growing delay after wrong codes

- **Exists:** `src/core/lock/lockState.ts:33-95`: 3 free tries, then 30 s, 1 min, 5 min, 15 min, then 1 h each; kept per device in localStorage (`learning-notes:lock-throttle-v1`), so a reload gives no fresh tries; a clock set back cannot stretch it past 1 h. The sync passphrase form has its own limiter (`src/sync/UnlockForm.tsx:17`, 1 min, 5, 15, 1 h).
- **Changes:** one shared limiter part (`src/core/limiter.ts`) used by both forms, same steps; the lock screen shows a live countdown ("Try again in 0:28") and disables the field; the Forgot flow stays available during a wait; the doc text in `lock.md` ("five tries, 30 s doubling") is corrected to the real numbers. A right code clears the count.

### 2. Code length

- **Exists:** `src/core/lock/lockCrypto.ts:23-31`: PIN `^\d{4,6}$`, password 6 to 128 (12 recommended when sync is on).
- **Changes:** two patterns. `isNewPin` = exactly 6 digits; `isStoredPin` = 4 to 6 digits (unlock only). `isNewPassword` = 8 to 128; unlock accepts any stored hash. Setting or changing a code uses the "new" rule. A device whose stored PIN came from a 4- or 5-digit code shows a calm note in Settings › Lock: "Your PIN is shorter than 6 digits. Change it for better privacy." (the length is stored as a new optional field `len` beside the hash when a code is set; old hashes without `len` are treated as "maybe short" only for PIN and the note says "may be").

### 3. Remote pictures only after I allow

- **Exists:** `src/images/remoteImages.ts`: pasted web pictures are copied in; a web picture left in a note shows a "Load remote image" card (`placeholderSrc`, `watchRemoteImages`, `approveRemote`) in the page editor (`src/editor/PageEditor.tsx:133,460`), clipboard and copy formats.
- **Gap:** `src/images/useImageUrl.ts:26` returns any non-ref source as is, so a web address in a database gallery (`src/databases/views/GalleryView.tsx:369-386`) or a card's answer picture (`src/recall/ReviewScreen.tsx:494-501`) loads silently. Any other `<img>` fed by note data must be checked the same way (list in "Nothing lost").
- **Changes:** `useImageUrl` returns the tap-to-load card for a web address that is not approved; one shared **Remote picture card** (the existing card drawing, as a component) shows the host name and "Load picture". Allowing is per visit, as today; Professional can also choose "Always load from this site" (per device, list in Settings › Privacy with ✕ per site).

### 4. Security headers (`public/_headers`, Cloudflare Pages)

Exact new block for `/*` (unchanged lines kept; changes marked):

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://accounts.google.com/gsi/client; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' blob: data: https://api.dictionaryapi.dev https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com https://eludllranljtyasdoyaj.supabase.co wss://eludllranljtyasdoyaj.supabase.co https://www.googleapis.com https://accounts.google.com; frame-src blob: https://www.youtube-nocookie.com https://player.vimeo.com https://www.loom.com https://accounts.google.com; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
  Cross-Origin-Opener-Policy: same-origin-allow-popups
  Cross-Origin-Resource-Policy: same-origin
  Origin-Agent-Cluster: ?1
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-Permitted-Cross-Domain-Policies: none
  Referrer-Policy: no-referrer
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Permissions-Policy: camera=(), microphone=(self), geolocation=(), payment=(), usb=(), serial=(), hid=(), bluetooth=(), browsing-topics=()
```

New: `script-src-attr 'none'`, `manifest-src 'self'`, `upgrade-insecure-requests`, COOP, CORP, Origin-Agent-Cluster, X-Permitted-Cross-Domain-Policies, five more Permissions-Policy entries. Path blocks below `/*` (cache rules) stay as they are.

**What could break, and the guard for each:**

| Thing                                    | Risk                                                                   | Guard                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Google sign-in / Drive token (GIS popup) | COOP `same-origin` would cut the popup's link back                     | use `same-origin-allow-popups` (never `same-origin`); e2e S17                 |
| Supabase Google sign-in (redirect)       | none (full-page redirect)                                              | e2e S17                                                                       |
| Inter font                               | loaded from our own site (`src/main.tsx:337`)                          | `font-src 'self' data:` unchanged                                             |
| PDF worker, OCR worker, wasm             | worker and wasm rules                                                  | `worker-src 'self' blob:` and `'wasm-unsafe-eval'` kept; e2e S18              |
| Inline `onclick` attributes              | `script-src-attr 'none'` blocks them                                   | grep shows none in `src/` and `index.html`; `public/theme-boot.js` is a file  |
| YouTube / Vimeo / Loom embeds            | CORP/COOP do not apply to framed sites; COEP is **not** added          | e2e S19                                                                       |
| Allowed remote pictures                  | `img-src https:` kept (needed after I allow); `http:` pictures upgrade | an `http:` picture that has no `https:` copy fails and shows the card's error |
| Microphone (audio notes, affirmations)   | `microphone=(self)` kept                                               | e2e S20 (permission prompt appears)                                           |
| Wake lock, fullscreen in reader          | not restricted                                                         | unchanged                                                                     |
| `/version.json`, `/sw.js` checks         | CORP same-origin is fine for own fetches                               | e2e S21 update check                                                          |

## When I do X → Y (each line = one e2e test)

Beginner and Professional behave the same unless marked.

- **S1** When I type a wrong PIN 3 times → each says "That is not right" and the field clears; nothing waits yet.
- **S2** When I type a wrong PIN a 4th time → the field is disabled and a live countdown "Try again in 0:30" shows; at 0:00 the field comes back by itself.
- **S3** When I keep failing → the waits are 30 s, 1 min, 5 min, 15 min, then 1 h each.
- **S4** When I reload or close the app during a wait → the same wait continues.
- **S5** When I type the right code after a wait → it opens and the count goes back to 0.
- **S6** When I am waiting → "Forgot?" still works (the [lock.md](lock.md) Forgot flow).
- **S7** When I fail the sync passphrase → the same waits and the same countdown look (shared limiter).
- **S8** When I set a new PIN with 4 or 5 digits → Save stays off and the hint says "A PIN is 6 digits."
- **S9** When I set a new lock password shorter than 8 → Save stays off; the hint says "At least 8 characters." before I type.
- **S10** When my old 4-digit PIN is stored → it still unlocks; Settings › Lock shows "Your PIN may be shorter than 6 digits. Change it for better privacy." with "Change PIN".
- **S11** When I change that PIN to 6 digits → the note disappears and a toast says "PIN changed".
- **S12** When a database gallery, a card answer or any other place holds a web picture → I see the Remote picture card with the site name; nothing is fetched (no request to that host in the network log).
- **S13** When I tap "Load picture" → it loads for this visit (a local copy first, as today), with `referrerpolicy="no-referrer"`.
- **S14** When I reload → the card shows again (allowing is per visit).
- **S15** (Professional, proposed unlock `privacy.remoteSites`) When I tap "Always load from this site" → pictures from that site load without asking on this device; Settings › Privacy lists the site with ✕; ✕ removes it with an Undo toast.
- **S16** When the page loads → the response has every header in section 4 (checked against `public/_headers` by `scripts/siteRules.test.mjs`).
- **S17** When I sign in with Google and connect Drive → both work with the new headers (Chromium e2e with mocked Google pages; real check by the owner).
- **S18** When I open a PDF and run OCR on a picture → both work, no CSP error in the console.
- **S19** When I open a page with a YouTube embed → it plays.
- **S20** When I record an audio note → the microphone prompt appears.
- **S21** When the update check runs → it reads `version.json` with no console error.
- **S22** When the flag is off → today's lock rules, image behaviour and headers. (Headers cannot sit behind a runtime flag: they ship with the release, see Decisions.)

## Shared parts used (plan 3.2 row 0g)

Dialog set (unlock, set code), ✕ field, Toast queue (Undo), Banner (the short-PIN note uses the in-card note style, not a Banner), Remote picture card (new small part, see Decisions), Empty state (Settings › Privacy site list empty: "No sites yet").

## Sizes, spacing, motion

- Code fields 44 px tall, radius 12 px, 2 px soft-ink border (as `lock.md` D1); countdown text 13 px tabular, muted; disabled field 50% opacity.
- Remote picture card: radius 12 px, tonal well, 16 px padding, globe icon 20 px (Lucide 1.6), host 13 px, "Load picture" tonal button 44 px.
- Wrong code: field shakes 3 × 4 px in 240 ms; reduced motion = no shake, the message still shows.

## States

- Empty: no lock set → nothing to throttle; no sites allowed → "No sites yet".
- Error: picture failed after allowing → card says "Could not load this picture" with "Try again".
- Offline: lock works offline; remote card says "Offline" and Load is off.
- Phone: countdown under the field; card full width.
- Dark: tokens only.

## Nothing lost

| Today's feature                                                                             | Where today (`src/`)                                                                                                                                        | New home                                                       |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Lock wait steps, localStorage, clock cap                                                    | `core/lock/lockState.ts:33-95`                                                                                                                              | shared `core/limiter.ts`, same numbers                         |
| Sync passphrase limiter                                                                     | `sync/UnlockForm.tsx:17,102-207`                                                                                                                            | shared limiter, same steps                                     |
| PIN 4–6, password 6–128, 12 recommended with sync                                           | `core/lock/lockCrypto.ts:23-31`                                                                                                                             | new 6 / 8; old stored codes unlock                             |
| PBKDF2 210,000 rounds, constant-time compare                                                | `core/lock/lockCrypto.ts:18-22`                                                                                                                             | unchanged                                                      |
| Set PIN / password dialog (sync warning)                                                    | `app/lock/LockSection.tsx:321-402`                                                                                                                          | same dialog, new hints                                         |
| Unlock form (PIN / password switch, Face ID)                                                | `app/lock/UnlockForm.tsx:19-165`                                                                                                                            | unchanged + countdown                                          |
| Remote card in the editor                                                                   | `images/remoteImages.ts:23-58,241`, `editor/PageEditor.tsx:460`                                                                                             | Remote picture card part                                       |
| Paste copies web pictures in                                                                | `images/remoteImages.ts:130-240`, `editor/pasteFlow.ts:31`                                                                                                  | unchanged                                                      |
| Copy keeps approved pictures                                                                | `editor/clipboard.ts:2`, `editor/copyFormats.ts:4`                                                                                                          | unchanged                                                      |
| Gallery picture                                                                             | `databases/views/GalleryView.tsx:369-386`                                                                                                                   | gated by `useImageUrl`                                         |
| Card answer picture                                                                         | `recall/ReviewScreen.tsx:494-501`                                                                                                                           | gated by `useImageUrl`                                         |
| Other `<img>` from data: book cover, library, picture placement, ink convert, slides (blob) | `library/BookHeader.tsx:30`, `library/LibraryScreen.tsx:251`, `images/PicturePlacement.tsx:322,422`, `ai/ConvertInk.tsx:159`, `pages/tabs/SlidesTab.tsx:83` | audited in 11c; image refs and blobs pass, web addresses gated |
| Account avatar (Google picture)                                                             | `sync/AccountSection.tsx:151`                                                                                                                               | stays direct (own account, `no-referrer`); see Decisions       |
| Headers today                                                                               | `public/_headers:1-8`                                                                                                                                       | section 4 block                                                |
| Header test                                                                                 | `scripts/siteRules.test.mjs:6`                                                                                                                              | extended (S16)                                                 |

## Won't do

- No encryption of notes on the device (that is [encryption.md](encryption.md); the lock stays a privacy screen).
- No picture proxy (would need a server and cost).
- No removal of `style-src 'unsafe-inline'` (the editor sets inline styles; it would break typing and layout).
- No `Cross-Origin-Embedder-Policy` (would block allowed remote pictures, embeds and Google sign-in).
- No forced change of old PINs or passwords.
- No Supabase change.

## Needs the owner

- Supabase dashboard (no code): confirm the email-code rate limits (the app already asks 15 characters for the account password) and turn on refresh-token rotation. Not part of this slice; listed so nothing is forgotten.
- The `drive-token` online function allows any CORS origin: restricting it is a Supabase function change, so it waits for the owner.

## Sub-slices (one commit each)

1. **11a limiter** (D14): `src/core/limiter.ts` (new), `src/core/lock/lockState.ts`, `src/sync/UnlockForm.tsx`, `src/app/lock/UnlockForm.tsx`, `docs/features/lock.md` text fix. Tests S1 to S7.
2. **11b code length** (D14): `src/core/lock/lockCrypto.ts`, `src/core/lock/lockConfig.ts` (`len`), `src/app/lock/LockSection.tsx`, i18n `lock.*` (en, es, hi). Tests S8 to S11.
3. **11c remote pictures** (security finding): `src/images/useImageUrl.ts`, `src/images/RemotePictureCard.tsx` (new), `src/images/remoteImages.ts`, `src/databases/views/GalleryView.tsx`, `src/recall/ReviewScreen.tsx`, Settings › Privacy site list. Tests S12 to S15.
4. **11d headers** (security lows): `public/_headers`, `scripts/siteRules.test.mjs`. Tests S16 to S21.
5. **11e flag + screenshots**: `src/app/flags.ts`, S22.

## Tests

- Unit: limiter steps, reload keeps the wait, clock-back cap, shared by both forms; `isNewPin`/`isStoredPin`/`isNewPassword`; `len` read and missing; `useImageUrl` for ref, blob, data, http, https, approved; header file parse.
- e2e (Chromium + `ipad-webkit`): S1 to S22; network log assertion for S12.
- Screenshots: lock screen waiting, set-PIN dialog with hint, short-PIN note, Remote picture card × light / dark × iPad / phone / PC.
- Security review against `rules/security.md` by the QA sub-manager.

## Owner iPad check (3 steps)

1. Lock a page and type a wrong PIN 4 times: a 30 s countdown appears; close and reopen the app: it is still counting.
2. In Settings › Lock tap "Change PIN": 4 digits are refused, 6 are accepted, and the "shorter PIN" note is gone.
3. Open a page or gallery with a picture from the web: a card asks first; tap "Load picture" and it appears; sign in with Google again to see sign-in still works.

## Decisions to review

- **Headers ship with the release, not behind the flag** (a static file cannot be switched per person). They go out only with the first "release" after the e2e S16 to S21 pass on the preview link. Rollback = revert the commit.
- **Old short PINs:** kept working; a note asks for a change. Old hashes have no length, so the note says "may be shorter" until the PIN is changed.
- **Lock password minimum 8** (was 6), matching the batch-5 "one rule" pick; the sync passphrase stays at 12 because it is real encryption.
- **Account avatar** from Google stays direct: it is the signed-in person's own picture from their own account, not note content.
- **New unlock id** `privacy.remoteSites` is proposed (not yet in `docs/mockups/pro-features.md`).
- **Remote picture card** is a small new shared part, but it reuses today's card drawing; no new visual pattern.
- `upgrade-insecure-requests` means an `http:` picture with no `https:` version cannot load even after I allow it; picked for safety.
