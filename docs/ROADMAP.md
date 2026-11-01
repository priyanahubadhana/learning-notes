# Roadmap

Approved 2026-11-01. Each phase still gets a short planning talk, a Definition of Done, and mockups for new screens. Only the owner uses the app for now, mainly on iPad and Windows PC; the phone just needs to work. Budget ₹0 or close.

- **Phase 7 — Cleanup + CI:** docs system, private GitHub, CI (lint, unit, e2e, Chrome + WebKit), flaky tests, feature specs.
- **Phase 8 — Deep research:** Claude Code runs it. Supabase + encrypted sync of block data, Safari/iPad PWA limits, Google Drive API limits, current free-plan catches, smart merge options.
- **Phase 9 — Hosting + PWA:** Cloudflare Pages on a free `*.pages.dev` address; installable with offline cache; safe update flow; split the first load; security headers and review. iPad: touch targets, tap for hover menus, Magic Keyboard shortcuts, Split View. Phone: usable. Check the parked WebKit test failures (run `npm run test:e2e:webkit`) on a real iPad. Page "⋯" menu from IDEAS. Fresh start is fine (mostly test data). At the end, a throwaway Google sign-in test on the real iPad (see RESEARCH.md); it decides the Drive part of Phase 10. Then one real user tries it for a week, and Spanish and Hindi get native review.
- **Phase 10 — Sync:** Approved design (RESEARCH.md): notes on Supabase Free; pictures, backups and spare key in a visible Google Drive folder; the PC keeps a third copy; two swappable connectors. Fix the order-key tie first. Google sign-in limited to the owner's email; end-to-end encrypted, with per-user access rules. Rules per data type, not only blocks. Newest edit wins per block and the losing version goes to page History. Spare key in Drive locked with a passphrase, plus a printed recovery code. New-device flow. Planned first merge of PC and iPad data. Encrypted Drive backups when the app is open (about 7 daily + monthly). Delete forever also clears pictures and cloud copies. Clock skew. Pictures. Health-data privacy review.
- **Phase 11 — Summary · Notes · Review tabs:** at page, notebook and app level; must fit the existing notebook tabs. "Add to Summary" keeps lines linked. See IDEAS.
- **Phase 12 — Maths, new-page start, Calendar:** visual maths editor + LaTeX, loaded only when used; template list with "Study (Recommended)" first; Calendar Day / Week / Month.
- **Phase 13 — Polish pack:** power features and polish from IDEAS; one commit per item; at most 5–7 owner checks, each under 2 minutes.
- **Phase 14 — AI:** learning companion and handwriting to text. Ask about cost first. iPad browsers can't capture the screen. Sending notes to AI leaves the encryption, so the owner must decide.
- **Phase 15 — Before global launch:** smart merge, passkeys, sign-up, App Store app (needs a Mac, $99/yr).

## Keep in mind

- Phase 8 result: [RESEARCH.md](RESEARCH.md). Read it before planning Phases 9 and 10.
- Smart merge is a must before any global launch.
- Deep research comes before building sync.
- A custom domain later is a new address, so browser data does not follow it.
- The 5-year vision is parked.
