# Changelog

Current phase only. Older entries are in [ARCHIVE.md](ARCHIVE.md).

## 2026-11-02

- **What:** A failed save stays pending: it retries after 2 s, 4 s, 8 s up to a minute and on every flush. The changes are kept in localStorage, also when the page is left, and a lasting Not saved yet notice with Try again shows until they are in the database. Kept changes are no longer thrown away when bringing them back fails.
- **Why:** Audit B2: a failed save was never retried on leaving, so typing vanished without a message.
- **Files:** src/editor/autosave.ts, src/editor/pendingStash.ts, src/editor/pageSync.ts, src/app/saveStatus.ts, src/app/SaveNotice.tsx, src/App.tsx, src/i18n/, e2e/saveFailure.spec.ts, docs/features/

- **What:** A screen that fails now shows "This page could not be shown" with Go home and Save everything, around the page area and around the whole app. A screen file that fails to download reloads once. Damaged text in a block shows as a safe line and the stored record is left alone.
- **Why:** Audit B1: one damaged note or missed download left a white screen, even after reload, with no way out on the installed iPad app.
- **Files:** src/app/ErrorBoundary.tsx, src/app/chunkReload.ts, src/share/saveEverything.ts, src/main.tsx, src/App.tsx, src/editor/mapping.ts, src/editor/PageEditor.tsx, src/i18n/, e2e/errorScreen.spec.ts, docs/features/

- **What:** Journal month names in the sidebar follow the current language, like day names.
- **Why:** Owner saw a Hindi month after switching language.
- **Files:** src/journal/dates.ts, src/pages/PageTree.tsx, docs/HANDOFF.md

- **What:** Step 8 sign-in test run: Google sign-in and Drive work in the installed app, and the Drive pass renewed silently after its hour. Results in RESEARCH.md.
- **Why:** Phase 10's design depended on it.
- **Files:** docs/RESEARCH.md, docs/CHANGELOG.md, docs/HANDOFF.md

- **What:** The app looks for a new version as soon as it opens, not only when it returns to the front, and the update message stays until tapped or closed with ×. A drag handle between the menu and the page sets the menu width (200 to 480px, page keeps 320px), remembered per device; double-click resets, arrow keys work.
- **Why:** Owner's iPad showed the update message only after changing page, and the 6-second message could be missed. Owner asked to set the menu and page ratio per device.
- **Files:** src/main.tsx, src/app/updates.ts, src/app/updates.test.ts, src/app/appUi.ts, src/app/ui.tsx, src/App.tsx, src/app/SidebarResizer.tsx, src/app/sidebarWidth.ts, src/app/sidebarWidth.test.ts, src/notebooks/Sidebar.tsx, src/i18n/en.ts, src/i18n/es7.ts, src/i18n/hi7.ts, e2e/topBar.spec.ts, docs/

- **What:** Step 7 finished. Touch screens get bigger buttons (44px tall, 32 wide, outside the editor), including an iPad with a trackpad. Shortcut labels show ⌥ on Apple devices. Resized windows from 320px wide tested. WebKit failures went from 30 to 2: most were a slow engine on Windows or test timing, now fixed. Two stay open: fast robot typing of `#exam` gives `#ex`, and the Revise label buttons do not appear after a robot text selection. Owner checks both on the real iPad. Owner confirmed the iPad top bar is sharp.
- **Why:** Sidebar rows were 20px tall and arrows 14px on the iPad, too small for a finger. Plan step 7.
- **Files:** src/index.css, src/app/ui.tsx, src/app/keys.ts, src/app/keys.test.ts, src/App.tsx, src/notebooks/Sidebar.tsx, src/pages/PageView.tsx, src/i18n/en.ts, src/i18n/es6.ts, src/i18n/hi6.ts, e2e/touchTargets.spec.ts, e2e/helpers.ts, e2e/board.spec.ts, e2e/dashboard.spec.ts, e2e/databases.spec.ts, e2e/help.spec.ts, e2e/lesson.spec.ts, e2e/trash.spec.ts, docs/

## 2026-11-01

- **What:** In the installed iPad app the top bar and sidebar start 36px lower, below the blur iPadOS 26 adds to the top edge. Replaces an invisible strip, which did not work on the real iPad.
- **Why:** Owner saw the top bar blurred on every screen.
- **Files:** index.html, src/index.css, src/app/TopBar.tsx, src/notebooks/Sidebar.tsx, e2e/topBar.spec.ts, docs/features/offline-and-install.md

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
