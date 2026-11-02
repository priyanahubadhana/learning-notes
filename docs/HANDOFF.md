# Handoff

- **Done:** Phases 1–8. Phase 9 steps 1–7 built and tested. iPad top bar confirmed sharp by the owner.
- **Next:** Owner checks on the iPad: ⋯ on a page opens its menu; sidebar buttons are easy to tap; names are readable; in a note, typing `#exam` then a space makes a whole `#exam` tag; selecting a word shows the Revise label buttons; `/` opens the menu. Then step 8: throwaway Google sign-in test (owner creates Google Cloud and Supabase accounts).
- **Open issues:** 21 moderate warnings in developer tools only; order-key tie must be fixed before sync.
- **Files touched:** src/index.css, src/app/keys.ts, e2e/touchTargets.spec.ts, e2e/helpers.ts.
- **Warnings:** Browser tests run on the built app (`npm run test:e2e` builds first). CI takes about 10 minutes, so push once per step.
