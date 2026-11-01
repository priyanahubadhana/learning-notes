# Changelog

Current phase only. Older entries are in [ARCHIVE.md](ARCHIVE.md).

## 2026-11-01

- **What:** Phase 9: own icon, manifest and name; offline support with an update offer; screens load on demand (first download 1.8 MB to 320 KB); "This device" in Settings; messages for a full device and a database that won't open; live security rules; publish job; a title now saves when the app goes to the background; fixed the missing-page message, which failed when moving from Home.
- **Why:** Host the app and make it safe on the iPad.
- **Files:** public/, index.html, vite.config.ts, playwright.config.ts, package.json, .github/workflows/ci.yml, src/App.tsx, src/main.tsx, src/app/, src/core/storage.ts, src/editor/autosave.ts, src/pages/PageView.tsx, src/settings/, src/share/backupReminder.ts, src/i18n/, e2e/, docs/features/

## 2026-11-01

- **What:** Browser tests now run on the built app, under the live security rules; removed the speed test that needed the dev server; help tips no longer block clicks.
- **Why:** GitHub's small machine timed out compiling on demand.
- **Files:** playwright.config.ts, vite.config.ts, e2e/offline.spec.ts, e2e/tagTools.spec.ts
