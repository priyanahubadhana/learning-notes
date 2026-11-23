# Security audit checklist (read-only, owner's own app only)

Rules: non-destructive, the test account and the "Test" notebook only, nothing against third-party systems (Supabase, Google, Cloudflare are used, not attacked), no real user data, no secrets in the report. Mark each line **Confirmed**, **Probable**, **Unverified** or **Not applicable**, with evidence. The repository is public: report a confirmed vulnerability in the reports folder only and say "security, read in private" in the summary line.

Context to read first: rules/security.md, docs/CODE-MAP.md (`src/sync/`, `src/share/`, `src/core/lock/`, `src/connector/`, `src/ai/`, `mcp/`, `supabase/`), docs/LIMITATIONS.md, docs/research/ai-cost-audit-2026-11-11.md.

## Accounts and access

- Sign-in required before any note is shown; sign-out clears what it should (storage, caches, service worker).
- A signed-out or other user's URL (`#/…`) does not reveal data.
- Supabase row-level security: every table in `supabase/migrations/` has policies that scope rows to the user; no policy is `true` for all.
- Edge functions (`supabase/functions/`) check the caller's identity; secrets read only from the server environment.

## Data handling and storage

- Local data (Dexie, IndexedDB) and backups (`src/share/`): what is encrypted, with which key, where the key lives; what is plain text.
- The privacy lock (`src/core/lock/`): hashing, rate of attempts, locked content not reachable through search, links, history or export.
- Sync (`src/sync/`): payloads encrypted before they leave the device; merge rules cannot be used to overwrite another user's row.
- Export, print and share paths do not leak locked or trashed content.

## Input and injection

- Imported files (notebook format, Anki, PDF, EPUB, DOCX via mammoth, pasted HTML and links in `src/capture/`): validated, size-limited, no HTML rendered unsanitised, no `dangerouslySetInnerHTML` without a sanitiser.
- Cross-site scripting through note text, titles, tags, link labels, database cells, KaTeX input.
- SQL in `sql.js` databases built from user input is parameterised.
- URL schemes in links (`javascript:`, `data:`) blocked or neutralised.

## Secrets and keys

- No key, token or password in the repository, the build output (`dist/`), the docs site or a screenshot.
- AI provider keys (`src/ai/`): device store, the optional encrypted mirror (`keySync.ts`), never logged, never sent anywhere but the provider.
- `.env` files ignored by git; the secret-scan hook present.

## Dependencies and build

- `npm audit --omit=dev` result, with the list of findings and whether a fix exists.
- Pinned versions, lockfile committed, no install scripts from unknown packages.
- Service worker and update path (`docs/features/update-v2.md`): no stale or poisoned cache can keep running after an update.

## Headers and transport

- The preview and live sites are HTTPS; content security policy, frame protection and referrer policy present or absent (report, do not fix).
- Third-party scripts and fonts: list them, from where, with what integrity.

## Privacy

- What leaves the device, when, to whom (sync, AI calls, update check, docs site). Matches what Settings tells the user.
- Logs and the slow-moments recorder (`src/perf/`) hold no note text.

## Distinguish

Confirmed vulnerability (reproduced, evidence) · Probable (code path clear, not reproduced) · Theoretical risk (would need another failure first). Never say "passed" for a line you did not check.
