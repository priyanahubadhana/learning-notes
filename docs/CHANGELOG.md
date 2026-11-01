# Changelog

Current phase only. Older entries are in [ARCHIVE.md](ARCHIVE.md).

## 2026-11-01

- **What:** One top bar above every screen: three-line button that hides the menu on any screen size, ← → that grey out when there is nowhere to go, the page path, and a ⋯ menu that replaces the row of page buttons. New shortcuts Alt+R and Ctrl+\. Phone screens now sit under the bar.
- **Why:** Owner could not hide the menu on the iPad and asked for Notion-style navigation. Sample approved 2026-11-01.
- **Files:** src/App.tsx, src/app/TopBar.tsx, src/app/navHistory.ts, src/app/ui.tsx, src/app/appUi.ts, src/app/router.ts, src/main.tsx, src/index.css, src/pages/PageView.tsx, src/notebooks/, src/recall/, src/search/, src/settings/, src/share/, src/databases/, src/help/helpRegistry.ts, src/i18n/, e2e/, docs/features/

## 2026-11-01

- **What:** The phone menu button now shows on Review and in the full-screen search popup; while the menu covers Review, keys no longer reach the card. On phones Review shows the menu, the choice of cards and close on one line, with the title on its own line below.
- **Why:** Owner found no way to reach the menu from these screens on a narrow window.
- **Files:** src/App.tsx, src/recall/ReviewScreen.tsx, src/search/SearchPopup.tsx, e2e/phoneSidebar.spec.ts, docs/features/navigation.md

## 2026-11-01

- **What:** Phase 9: own icon, manifest and name; offline support with an update offer; screens load on demand (first download 1.8 MB to 320 KB); "This device" in Settings; messages for a full device and a database that won't open; live security rules; publish job; a title now saves when the app goes to the background; fixed the missing-page message, which failed when moving from Home.
- **Why:** Host the app and make it safe on the iPad.
- **Files:** public/, index.html, vite.config.ts, playwright.config.ts, package.json, .github/workflows/ci.yml, src/App.tsx, src/main.tsx, src/app/, src/core/storage.ts, src/editor/autosave.ts, src/pages/PageView.tsx, src/settings/, src/share/backupReminder.ts, src/i18n/, e2e/, docs/features/

## 2026-11-01

- **What:** Browser tests now run on the built app, under the live security rules; removed the speed test that needed the dev server; help tips no longer block clicks.
- **Why:** GitHub's small machine timed out compiling on demand.
- **Files:** playwright.config.ts, vite.config.ts, e2e/offline.spec.ts, e2e/tagTools.spec.ts

## 2026-11-01

- **What:** Site published; moved to learning-notes-app because learning-notes was taken.
- **Why:** A clean permanent address before anything is installed.
- **Files:** .github/workflows/ci.yml, docs/
