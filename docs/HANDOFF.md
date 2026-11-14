# Handoff

**START HERE:** the build is **RUNNING, lean** (restart approved by the owner, 14 Nov 2026). Read docs/BUILD-STATE.md (it says what is live, what is paused and the next task), then docs/PENDING.md. The plan is docs/plans/phase-plan.md; how helpers work is docs/HOW-WE-BUILD.md. Only BUILD-STATE says whether the build is paused; this file never does.

This file keeps only live notes. Everything older was moved to docs/ARCHIVE.md on 14 Nov 2026 under "HANDOFF entries archived 14 Nov 2026" (search that heading). Old carried-over items are looked at when the phase they belong to is planned.

- **NOW:** Phase 0 (reset) is mostly done: rules and files cleaned, the real app's check green (0.3), the clash cleared (0.4), the fast test set (0.8) and the two safety programs (0.12) done on 14 Nov. Task 0.5 (scroll fix) is pushed and waits for its merge into `build/next`; 0.6 (test preset) is next. Then Phase 1 (the frame and Settings). Fable's audit of 14 Nov (evening): docs/plans/audit-2026-11-14.md.
- **Owner's tests:** docs/plans/ipad-checklist-first-preview.md (parts 1 and 2 done; findings F1 to F9 in docs/plans/ipad-test-findings-2026-11-14.md) and the older list in docs/plans/owner-checks-pending.md.
- **Files and restart:** `npm run dev` (https on the Wi-Fi for the iPad); browser tests run on the built app (`npm run test:e2e` builds first); never upload to Cloudflare by hand.
