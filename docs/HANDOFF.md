# Handoff

- **Done:** Phases 1–8. Phase 9 steps 1, 3, 4, 5, 6 built and tested; publish job added (step 2).
- **Next:** Owner deletes the unused learning-notes Cloudflare project and installs from learning-notes-app.pages.dev; then step 7 (iPad).
- **Open issues:** WebKit failures parked for Phase 9; 12 moderate warnings in developer tools only; order-key tie must be fixed before sync.
- **Files touched:** vite.config.ts, src/App.tsx, src/main.tsx, public/, .github/workflows/ci.yml, playwright.config.ts.
- **Warnings:** Browser tests run on the built app (`npm run test:e2e` builds first). CI takes about 10 minutes, so push once per step.
