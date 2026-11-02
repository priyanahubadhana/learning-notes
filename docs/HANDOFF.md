# Handoff

- **Done:** Phases 1–8. Phase 9 steps 1–8 built and tested; sign-in test passed (RESEARCH.md).
- **Trial fixes:** journal month names in the sidebar follow the app language.
- **Next:** Step 9 week trial started 2026-11-02 (owner and one tester), ends 2026-11-09. Owner sends problems; Hindi review alongside; then close Phase 9.
- **Open issues:** 21 moderate warnings in developer tools only; order-key tie must be fixed before sync.
- **Files touched:** src/index.css, src/app/keys.ts, e2e/touchTargets.spec.ts, e2e/helpers.ts.
- **Warnings:** Browser tests run on the built app (`npm run test:e2e` builds first). CI takes about 10 minutes, so push once per step.
