# Navigation (addresses, Back and Forward)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Every screen has an address (the part after `#`), so refresh, Back, Forward and bookmarks return to the same place.

## How it works

- `src/app/router.ts`: `routeToHash` and `parseHash` convert between a `Route` and the hash. Routes: home, page, notebook, database, databases, cards, data, settings, search (saved id or a JSON query), review (all, wrong, notebook, page with optional `?sub=1`, custom).
- A notebook, database or settings route can carry up to 3 own levels (`parts`: tab, view, Revise lesson, category). `pushRouteParts` adds a history entry for a level; if the address had no level yet, it first writes the current one into the entry being left so Back returns to it. `useRouteParts` follows the address.
- `src/App.tsx`: the route is built from the screen state. A new screen adds an entry (`pushEntry`); the first write and the fix-up for a missing page replace the current one (`replaceEntry`). On `popstate`, `applyRoute` shows the screen of the address, unless only the levels changed (`baseHash` equal), which those screens handle themselves.
- **Sidebar groups (batch 2e):** the sidebar is folding groups, each with a small uppercase heading that is a button (▸/▾, `aria-expanded`, remembered per device; `SidebarGroup.tsx`). Top, not folding: **Today** and **Search**. Then **Study** (Review with its count, All cards), **Quick access** (Favourites, Recent, Calendar, Databases), **Notebooks** (the notebook tree; the heading's + adds a notebook), **Tags** (folded at first, with its + and tag options), **Templates** (folded at first), **Saved searches** (only once there is one; folded at first). After a divider: Save & restore, Trash, Settings and the theme buttons. Study, Quick access and Notebooks start open; saved states are kept in `sidebar.group.<id>` (Notebooks `notebooksOpen`, Templates `templatesOpen`). The row action buttons (+ ⟳ ✎ ×) are unchanged. Rows are 36 px tall, 44 px on a touch screen, with tighter gaps.
- **Page address (batch 2e, renamed in 2g):** the path in the top bar can be **Short** (Notebook / Page, as before), **Full** (like folders) (📘 Notebook › Parent › Sub › Page: every part a link; every › opens a list of the pages at that level, with the open path ticked, like Windows File Explorer; paths of more than 4 parts keep the first and the last two and fold the middle into "…", which lists the hidden parts) or **Name only** (the name; tapping it shows the full path). All lists are pop-ups with a ✕ (the pop-up rule in toolbar-ribbon.md). The choice has three levels: the page's own (page ⋯ menu › Page address ▸, with "App default"), the notebook's (the notebook screen's Tab options menu), then the Settings default (General › Page address, per device, found by "path" or "breadcrumb"); the page wins over the notebook, which wins over the default (`resolvePathStyle`). The page and notebook choices are optional fields `pathStyle` on the records (no index, so no database upgrade): they are in backups, restores and shared files (`checkRows.ts` validates them) and older files without them still import. Code: `src/pages/PagePath.tsx`, `pathStyle.ts`.
- Phone menu: it closes on any choice in it (also the screen already open), on another screen, Esc, a tap outside, or its three-line button, which sits where the opening button was. The full-screen search popup has the opening button too; while the menu covers Review, keys don't reach the card.
- Top bar, above every screen: three-line menu button (hides or shows the sidebar on wider screens, remembered per device; `Ctrl+\` / `⌘\`), ← and → through the app's own history, the page's path or the screen's name, and on pages the ⋯ menu.
- ← returns to the previous page and is grey on the first one. → is grey until ← is used, and grey again after opening something new. The app keeps its own count (`src/app/navHistory.ts`) because browsers don't say whether a next entry exists.
- Sidebar (batch 2d): after Today and Search come **Calendar** (the Calendar screen, `#/calendar`), **Favourites** (starred pages, hidden while empty, kept per device in `favourites`) and **Recent** (the last 8 pages opened, folded at first; the list of up to 20 ids is `search/recentPages.ts`; only the 8 shown are read, by id). Star a page from its ⋯ menu or the ☆ on its sidebar row. Everything after them keeps its old order. Code: `src/app/QuickPages.tsx`, `favourites.ts`.
- Calendar screen (`src/databases/CalendarScreen.tsx`, `calendarEntries.ts`): every dated database row (on its Date columns) and every journal day, by month or week, reusing the database Calendar view's day grid (`calendarData.ts`). It reads databases by workspace, columns by database, rows by the `databaseId` index (only databases with a Date column) and journal pages by notebook; the period is cut in memory, since a date lives inside the row's values. No database upgrade was needed; if 100,000+ dated rows ever make it slow, add a helper index (an upgrade with a backup). A day's number opens or starts that day's journal page. Speed test: 10,000 rows.
- Page ⋯ menu: Add to favourites, Search all features…, Show/Hide the tool bar, Review this page (`Alt+R`), History, Save as template, Save & restore (opens that screen), Import and Export (grey, Coming soon).
- `useDiscardGuard.tsx` is separate: a click outside a dialog closes it only if nothing was changed, otherwise asks "Discard your changes?".

The handle between the menu and the page sets the menu width (`src/app/SidebarResizer.tsx`, limits in `sidebarWidth.ts`), remembered per device. Drag it, use the arrow keys, or double-click to reset. It is hidden on phones and when the menu is hidden.

## Edge cases

- Empty, unknown or damaged addresses (including bad percent-encoding) become home.
- `#/review/custom` and unknown review paths cannot be reopened; custom shows nothing, other unknown ones go home.
- A damaged or non-object search query gives a plain search.
- An address to a missing page shows Home with a message (e2e).
- Touch sizes (`src/index.css`): buttons 32×44 and inputs and lists 44 tall, except inside lines of text (`.bn-inline-content`). The selection toolbar wraps at the screen width.

## Security check

- Address parts are percent-decoded safely (a failure gives home) and used as ids only; the search query is JSON-parsed in a try block and accepted only if it is an object.
- Nothing leaves the device; addresses stay in the browser.
- Deletes: none from navigation itself.

## Tests

`src/app/router.test.ts` (round trips, damaged input, 3-level limit, `baseHash`), `src/pages/pathStyle.test.ts`, `src/share/fullFile.test.ts` (path styles in a backup); e2e: `sidebarGroups.spec.ts`, `pathStyle.spec.ts`, `navigation.spec.ts`, `discard.spec.ts`, `phoneSidebar.spec.ts`.

- **Page ⋯ menu (2g):** page actions first (Review this page, History, favourite, Save as template, Import and Export (grey), Search all features), then **Copy & paste ▸**, **Page address ▸**, **Device mode ▸**, Hide/Show tool bar and Save & restore. A row with ▸ opens a small list (a pop-up with a ✕, ticks on the current choice). The top bar also has the **Device mode** button on every screen.
