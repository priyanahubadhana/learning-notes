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
