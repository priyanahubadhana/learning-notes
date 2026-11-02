# Handoff

- **Done:** Phases 1–8. Phase 9 steps 1–8 built and tested; sign-in test passed (RESEARCH.md). Audit of 2026-11-02 fixed: B1, B2, B3, B6, B7, B8, B9, B10, B11, B12, B13, B14, B15 (part), B4 wording, B5 warning, safe parts of B16 and B18, S1, S2, S3, S4, S8 and the live checks. Details in CHANGELOG.
- **Next:** Step 9 week trial started 2026-11-02 (owner and one tester), ends 2026-11-09. Owner sends problems; Hindi and the new texts get reviewed alongside; then close Phase 9. Owner reads the new rows in DECISIONS.md "Decisions to review".
- **Open issues:** 21 warnings in developer tools only (2 low, 19 moderate); order-key tie and the other sync blockers before sync; a full restore (B4) and big backups (B5).
- **Owner checks:** (1) Make the scoped Cloudflare token (DECISIONS.md). (2) iPad: an update bar appears; tap Update. (3) iPad: select text; the toolbar wraps and the page does not widen. (4) iPad: Save everything, then restore into Safari (B16). (5) iPad: tap a line and see if the side menu appears (B17). (6) Does a Card or to-do look spread out on touch? Tests cannot judge the look.
- **Files touched:** see CHANGELOG 2026-11-02; new: src/app/ErrorBoundary.tsx, SaveNotice.tsx, UpdateBar.tsx, saveStatus.ts, chunkReload.ts; src/editor/pageLock.ts; src/share/checkRows.ts, saveEverything.ts; scripts/check-live.mjs; .github/workflows/live-check.yml.
- **Warnings:** Browser tests run on the built app (`npm run test:e2e` builds first). CI takes about 10 minutes, so push once per step. Never upload to Cloudflare by hand: the daily live check will go red.
