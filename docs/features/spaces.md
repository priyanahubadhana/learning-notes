# Spaces, quiet corner and one Search

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Redesign step 4a. The app has four **spaces** (Home, Library, Notebooks, Review). A slim strip of icons down the left edge (a bottom tab bar on a phone) switches between them, and the sidebar lists only the current space. Rarely used things sit in a **quiet corner** (⚙). There is **one Search** for pages, notes, cards and features.

## How it works

- **Strip** (`src/app/spaces/SpaceStrip.tsx`): a `nav` named "Spaces" with four buttons (icon; on a phone also a label), `aria-current="page"` on the active one, and the quiet corner at the end. Computer and iPad: 56 px column at the left edge. Phone: fixed bar at the bottom (above the phone drawer; the page gets bottom padding).
- **Spaces** (`src/app/spaces/spaces.ts`): `home`, `library`, `notebooks`, `review`. `spaceForRoute` maps an address to a space (review, cards and saved searches → Review; pages, notebooks, databases, calendar → Notebooks; settings, Save & restore, a plain search and the empty address → none, the sidebar stays). When the address changes the sidebar follows it; on a fresh load an address that belongs to a space wins over the remembered one. Deep links (`#/...`) are unchanged: the router has no new routes.
- **Remembered per device:** the last space (`space` in the device preferences). Default Notebooks.
- **What each space lists** (`src/notebooks/Sidebar.tsx`):
  - **Notebooks:** as before: Today, Search, Study (Review, All cards), Quick access (Favourites, Recent, Calendar, Databases), the notebook tree, Tags, Templates, Saved searches.
  - **Review:** Search, Study (Review with its due count, All cards) and Saved searches. Decks come in step 6.
  - **Library:** placeholder "Coming next: your books" and a disabled Import button (also in the main area). The real Library is step 5.
  - **Home:** the Home cockpit (Phase F, see home.md); the sidebar still shows the small "Today" link.
    Tapping Home or Library opens their page in the main area (it closes any open page); tapping Notebooks or Review only switches the list (on a phone it opens the drawer).
- **Quiet corner** (`src/app/spaces/QuietCorner.tsx`): a ⚙ button (named "Quiet corner") that opens a panel with Settings, Save & restore, Trash (the old Trash list, folded), Device mode (opens the Computer/Touch/Pencil list), Help (opens Settings at "Show help") and the Day/Night/Sepia buttons. It stays open while you use Trash, the theme and Device mode; Settings, Save & restore and Help close it. Esc or a click outside closes it.
- **Hide a space** (`src/settings/spaceSettings.ts`): Settings › General has Show/Hide for Home, Library and Review (device setting). Notebooks cannot be hidden. If the remembered space is hidden the sidebar uses Notebooks. Hidden spaces still show up in Search (Features). A Layer gallery comes later (step 9).
- **One Search** (`src/search/SearchPopup.tsx`): Ctrl/Cmd+K and Ctrl/Cmd+Shift+K both open it (also the 🔍 buttons). One box; filter chips All · Pages · Notes · Books · Highlights · Cards · Tasks · Features; result groups Pages, Notes, Cards, Features. Features are every tool and setting (the former control panel, same rows from `controlRows.ts`, with "Pin to bar" on the Features chip). With All, up to three matching features show under the notes; Enter runs the first feature when no note matches. Books, Highlights and Tasks have chips and a "comes with …" line until the Library, the reader and Home exist. "Search all features…" (page ⋯ menu, bar, Settings) opens Search on the Features chip. The old separate control panel dialog is gone.
- **Keyboard and screen reader:** the strip is a labelled navigation; buttons are named "Space: Review" and so on; the corner is a labelled dialog and returns focus to its ⚙ button on Esc; Search keeps its combobox/listbox pattern (↑ ↓ Enter, Esc closes even with text), with a live "N results" line.

## Edge cases

- A hidden space that was remembered falls back to Notebooks without changing the remembered value (showing it again restores it).
- Opening a page from Home's button moves the sidebar to Notebooks (the page belongs there).
- With the phone drawer open the tab bar stays reachable (above the drawer).

## Security check

- No new data, no network. The only stored values are the last space (device preference) and three show/hide device settings, all validated on read.
- Deletes: none (Trash behaves as before; Delete forever still asks).

## Tests

- Unit: `src/app/spaces/spaces.test.ts`, `src/settings/spaceSettings.test.ts`, translations and help tests.
- Browser: `e2e/spaces.spec.ts` (space switching, remembered space, every old sidebar item reachable, quiet corner, one Search groups and chips, hiding a space, deep links, phone tab bar), `e2e/controlPanel.spec.ts` (Features), plus the older sidebar specs updated for the corner.

## Home (Phase F)

The Home space now shows the real cockpit (tabs Today, Tasks, Plan, Routines, Reports) instead of the placeholder: see [home.md](home.md). The running timer chip on every screen opens it.
