# Handoff

**START HERE:** the build is **PAUSED** (owner, 14 Nov 2026). Read docs/BUILD-STATE.md, then docs/PENDING.md. The plan is docs/plans/phase-plan.md; how helpers work is docs/HOW-WE-BUILD.md. Do not start building until the owner says "restart".

This file keeps only live notes. Everything older was moved to docs/ARCHIVE.md on 14 Nov 2026 under "HANDOFF entries archived 14 Nov 2026" (search that heading). Old carried-over items are looked at when the phase they belong to is planned.

- **NOW:** Phase 0 (reset) is half done: the rules and files were cleaned on 14 Nov; tasks 0.4 to 0.6 wait for the restart. Then Phase 1 (the frame and Settings).
- **Owner's tests:** docs/plans/ipad-checklist-first-preview.md (parts 1 and 2 done; findings F1 to F9 in docs/plans/ipad-test-findings-2026-11-14.md) and the older list in docs/plans/owner-checks-pending.md.
- **Files and restart:** `npm run dev` (https on the Wi-Fi for the iPad); browser tests run on the built app (`npm run test:e2e` builds first); never upload to Cloudflare by hand.
