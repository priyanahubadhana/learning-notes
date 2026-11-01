# Changelog

Current phase only. Older entries are in [ARCHIVE.md](ARCHIVE.md).

## 2026-11-01

- **What:** Phase 7: private GitHub backup; new docs system (INDEX, HANDOFF, active CHANGELOG and DECISIONS, ARCHIVE, ROADMAP, CODE-MAP, LIMITATIONS, feature specs); README shortened; IDEAS padding removed; rules updated.
- **Why:** Save tokens, recover safely, keep rules current.
- **Files:** docs/, rules/, CLAUDE.md, README.md, .claude/commands/next.md, .prettierignore, src/help/helpRegistry.test.ts

## 2026-11-01

- **What:** CI on GitHub (Chrome required, WebKit as a warning); safe-action permissions; `check:links` blocks new direct feature links; fixed phone-drawer timing in the e2e helper; automatic retry turned off.
- **Why:** So a red CI is a real alarm.
- **Files:** .github/workflows/ci.yml, .claude/settings.json, scripts/, e2e/helpers.ts, playwright.config.ts, package.json

## 2026-11-01

- **What:** Feature specs for every feature; fixed the template-duplicate check (a broken pattern treated runs of the letter s as spaces); CI given read-only access; phase closed.
- **Why:** Finish Phase 7; the specs found the bug.
- **Files:** docs/features/, src/share/importBundle.ts, src/core/upgradeBackup.ts, .github/workflows/ci.yml, docs/

## 2026-11-01 (phone menu)

- **What:** The phone menu now closes when you choose the screen already open, and has a three-line close button at its top. Removed the old Phase 5 words from rules/sessions.md (owner OK).
- **Why:** Owner request before Phase 8; the menu only closed when the screen changed, so it stayed over the page.
- **Files:** src/App.tsx, src/app/ui.tsx, src/notebooks/Sidebar.tsx, e2e/phoneSidebar.spec.ts, docs/features/navigation.md, rules/sessions.md
