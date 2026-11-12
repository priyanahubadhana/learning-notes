# Notebooks and Search v2 (slice 4)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

Flags: `notebooks.v2` and `search.v2` (in `src/app/flags.ts`, both start OFF; OFF = today's screens unchanged).
Mocks: `docs/mockups/notebooks-mock-v2.html`, `docs/mockups/search-mock.html`. Shell: `docs/design/shell-spec.md`.
Conditions used: build-master-plan 3.3 row 4; `docs/mockups/notebooks-open-comments.md` N1 to N13; mock-feedback "Notebooks (owner, 12 Nov)" N1 to N6 and "Notebooks v2 review + shell decisions"; PENDING "Review mock: owner note" (Search approved, "okay to pass") and "Favourites row + Organise + long-press strip" approval.

## Purpose

Notebooks: find a notebook, open it, see its pages, outline and resources, and set it up (look, tabs, privacy, actions) in one place. Search: find pages, notes, cards, books, highlights, tasks and app features from one box, anywhere.

### Plain-words summary

- Notebooks home shows your notebooks as covers. Tabs: All, Starred, Recent.
- A side list (sidebar) shows all notebooks as a tree. One button folds or opens them all.
- A small panel beside a notebook has three tabs: Pages, Outline, Resources. Pages lets you add, delete, copy, move and pull out pages.
- Inside a page, the row of notebook tabs hides so the pen and tools get the room. A small arrow brings it back.
- "More" opens one tall sheet on the right. Pick a notebook at the top, then change its look, tabs, privacy and actions. Nothing changes until you press Done.
- Hold a finger on a notebook or page row (or right-click). A small strip of actions appears. Then Undo is always there.
- Search has one box with an ✕, chips (All, Pages, Notes, Cards, and more) and a "Features" chip that finds tools and settings.
- Beginner sees the calm essentials. Professional adds extras, each with its own switch in Settings › Professional features.
- Nothing in today's app is removed. The "arrive with the Library" notes are gone.

## How it works

### Shared parts used (names from the shared parts list)

| Part                                                    | Used for                                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| tokens                                                  | all colours, radii, motion (`src/design/tokens.css`)                                                                      |
| Tab row                                                 | Home tabs All / Starred / Recent; notebook tab row (with "+" and Edit tabs); left panel tabs; More sheet section tabs     |
| ✕ field                                                 | Find a notebook, Find a page, Find a heading, Find resources, the Search box, every search box in More                    |
| Tag picker                                              | Home tag bar filter (Pro), notebook tags, Search tag filter                                                               |
| Drag (drop-line + ▲▼, live reflow)                      | notebook order, page order in the tree and in Pages tab, tab order; each drag also has ▲▼ and "Move to start/end" buttons |
| Arrange sheet                                           | Home › Organise: notebook order, Edit tabs                                                                                |
| Empty state                                             | empty shelf, "No pages yet", empty Resources, empty Trash, no search results                                              |
| Object bar                                              | Pages tab multi-pick bar (turn, move, copy, delete, extract) while pages are picked                                       |
| Card ▾ frame 304/376                                    | small pickers: cover colour, sort, filters (Search) anchored under their ▾                                                |
| shell: rail, top bar, sidebar, left panel               | `src/app/shell/` (slice 0h); this slice fills the sidebar and left panel                                                  |
| More sheet 440                                          | notebook More; Search More                                                                                                |
| small dialog, pop menu, toast, minimise chip, Undo/Redo | New notebook, Rename, confirm; row menus; "Moved to Trash" with Undo; Search panel minimise chip                          |
| Context menu strip (0g step 2)                          | long-press / right-click on a notebook card, sidebar row, page row, page thumbnail, search result row                     |

No private copies. New shared part needed: none. Dependency: the Context menu strip (0g step 2). See Decisions to review D1.

### Flag split

- `notebooks.v2`: Home, sidebar, left panel, notebook screen, More sheet, covers.
- `search.v2`: Search popup, Search screen, Search More sheet, chips.
- Either flag can be ON alone. Both share the Context menu strip and the ✕ field.

### Sizes, spacing, motion (from the mocks)

| What                  | Value                                                                                                           | Source                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Motion                | 120 / 180 / 240 ms, ease-out `cubic-bezier(.2,.8,.2,1)`; reduced motion = 0 ms                                  | notebooks-mock-v2.html:51-55     |
| Sidebar, left panel   | 264 px each; drawers on phone 86 vw, max 320                                                                    | shell-spec.md section 4          |
| Rail / top bar / tabs | 56 / 52 / bottom tab bar 56 + safe area                                                                         | shell-spec.md section 8          |
| More sheet            | right edge, top / bottom / right 12 px, width 440 (`min(440, 100vw - 24)`), slide-in 240 ms; phone = full width | notebooks-mock-v2.html:857-884   |
| Shelf                 | grid `repeat(auto-fill, minmax(140px, 1fr))`, gap 18 px (rows) 14 px (columns)                                  | notebooks-mock-v2.html:1668-1672 |
| Cover                 | ratio 3 / 4, radius `6px 14px 14px 6px`, shadow elev-2                                                          | notebooks-mock-v2.html:1680-1690 |
| Continue strip card   | 228 px wide, gap 10                                                                                             | notebooks-mock-v2.html:1619-1632 |
| Page thumbnail row    | min height 64, radius md, current = accent border + accent-soft fill + 1 px ring                                | notebooks-mock-v2.html:2170-2195 |
| Drop line             | 3 px, radius 3, inset 8 px each side; lifted row 55% opacity, dashed accent outline                             | notebooks-mock-v2.html:2108-2125 |
| Search chips          | height 36 drawn, 44 hit (extender), radius pill, 12.5 px / 600                                                  | search-mock.html:1682-1700       |
| Search box            | `type=search`, own ✕ button (`#clr`) shown when text exists; scope switch below                                 | search-mock.html:2225-2262       |
| Hit area              | 44 pt everywhere                                                                                                | shell-spec.md section 8          |
| Row hold              | 500 ms opens the Context menu strip; slop 8 px (today's `useLongPress`, `app/useLongPress.ts:10-12`)            | audit "Long press and row menus" |
| Drag lift             | hold 0.3 s on a thumbnail or the grip                                                                           | shell-spec.md section 4          |

## When I do X, then Y

"Beginner" lines (NB-Bxx) work for everyone. "Professional" lines (NB-Pxx) need the named switch (id from `docs/mockups/pro-features.md`). Each line becomes one e2e test.

### Notebooks home

| Id     | When I do X                                                                       | Then Y                                                                                                                                                                           |
| ------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NB-B01 | open Notebooks (rail)                                                             | Home shows the title, "New notebook", a Shelf / List switch, tabs All / Starred / Recent, and the covers. The shell has no space switcher (N1: already removed; test checks it). |
| NB-B02 | tap Starred                                                                       | only starred notebooks show; with none: "Pin a notebook and it will show here".                                                                                                  |
| NB-B03 | tap Recent                                                                        | notebooks sorted by last opened, with "Today / Yesterday / date"; with none: "Notebooks you open will show here."                                                                |
| NB-B04 | tap a cover (or a list row)                                                       | the notebook opens on the last tab and the last page I used.                                                                                                                     |
| NB-B05 | look at a notebook with cards due                                                 | its cover shows an "N due" badge; tapping the badge starts Review for that notebook.                                                                                             |
| NB-B06 | tap New notebook (button or "+" tile)                                             | a small dialog asks for a name (✕ and Cancel); Create adds it at the end and opens it; toast "Notebook created".                                                                 |
| NB-B07 | tap the star on a cover                                                           | it pins to the top and the star fills at once; tap again to unpin; Undo toast.                                                                                                   |
| NB-B08 | hold a cover 0.5 s (or right-click it, or tap its ⋯)                              | the Context menu strip opens above it: Open, Pin to the top, Rename, Cover and settings, Duplicate, Delete (red, last).                                                          |
| NB-B09 | choose Delete in the strip                                                        | a small dialog asks with the page count and "You can undo this."; confirm moves it to Trash; toast with Undo restores it.                                                        |
| NB-B10 | switch Shelf / List                                                               | the layout changes in 180 ms and is remembered on this device.                                                                                                                   |
| NB-B11 | look at "Continue where you stopped"                                              | up to 4 cards (cover + page title); tap opens that page; the row has a thin scroll track when it overflows.                                                                      |
| NB-B12 | have 500+ notebooks and scroll                                                    | only visible rows are drawn (virtual); scrolling stays smooth.                                                                                                                   |
| NB-B13 | tap Home with zero notebooks                                                      | an Empty state with "New notebook"; no blank screen.                                                                                                                             |
| NB-P01 | type in "Find a notebook" (unlock `nb.find`)                                      | the shelf filters as I type; a ✕ clears the text and the list at once; none: "No notebooks match."                                                                               |
| NB-P02 | tap a tag in the tag bar (unlock `nb.tagBar`)                                     | only notebooks with that tag show; the Tag picker adds more; "All tags" resets.                                                                                                  |
| NB-P03 | open a notebook ⋯ and choose Move up, Move down or Move to top (unlock `nb.move`) | the notebook moves one place; the shelf reflows; Undo toast.                                                                                                                     |
| NB-P04 | hold a grip and drag a cover or row (unlock `nb.dragGrip`)                        | other covers slide aside while dragging (live reflow); a drop-line shows the place; dropping saves the order; ▲▼ do the same by keyboard.                                        |
| NB-P05 | open the strip on a notebook (unlock `nb.addEmptyPage`)                           | "Add empty page" adds a blank page and opens it.                                                                                                                                 |
| NB-P06 | open the strip on a notebook (unlock `nb.addFromTemplate`)                        | "Add from template…" opens the template picker, then makes the page.                                                                                                             |
| NB-P07 | open the strip on a notebook (unlock `nb.reviewNotebook`)                         | "Review this notebook" starts a review of only its cards.                                                                                                                        |

### Sidebar (264 px, Notebooks space)

| Id     | When I do X                                               | Then Y                                                                                                                                                                |
| ------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NB-B20 | open the sidebar                                          | top: Today (journal), Search (Ctrl K), Review with a due badge. Below: the Notebooks tree and the fixed Journal group. Rows are 44 px high.                           |
| NB-B21 | tap the chevron of a notebook                             | its pages show nested; tap again to fold; the state is remembered per notebook.                                                                                       |
| NB-B22 | tap "Collapse all"                                        | every notebook folds in one tap; the same button reads "Expand all" and opens them all (icon + words, Notion-like). It sits in the Notebooks group header beside "+". |
| NB-B23 | tap a page row                                            | it opens; the current page row is bold with `aria-current`.                                                                                                           |
| NB-B24 | hold a notebook row 0.5 s (or right-click, or tap ⋯)      | the Context menu strip opens: Add page, Review this notebook, Rename, Lock, Lock editing, Move up, Move down, Delete (red).                                           |
| NB-B25 | hold a page row 0.5 s (or right-click, or tap ⋯)          | the strip opens: Rename, Add sub-page, Favourite, Lock, Lock editing, Move up, Move down, Move to top level, Delete (red).                                            |
| NB-B26 | choose Delete on a page                                   | it goes to Trash at once; toast "Moved “X” and N sub-pages to Trash" with Undo (6 s).                                                                                 |
| NB-B27 | tap "+" on a notebook or page row                         | a pop menu: Blank page, From template…; a new page opens.                                                                                                             |
| NB-B28 | drag the sidebar edge (PC) or press ← / →                 | width changes in 16 px steps, min 200, max 480; double-click resets to 264. Hidden on phone.                                                                          |
| NB-B29 | on a phone, tap Notebooks in the bottom bar               | the sidebar opens as a left drawer (86 vw) with a scrim; tap outside or Esc closes it.                                                                                |
| NB-B30 | a drag starts on a row                                    | no tap, menu or strip reacts until the drop (gesture router).                                                                                                         |
| NB-P20 | turn on `nb.sideStudy`                                    | a Study group appears: Review, All cards, All summaries.                                                                                                              |
| NB-P21 | turn on `nb.sideQuick`                                    | a Quick access group: Favourites (with × to remove), Recent pages, Calendar, Databases.                                                                               |
| NB-P22 | turn on `nb.sideTags`                                     | a Tags list with "Manage tags"; tapping a tag opens Search filtered by it.                                                                                            |
| NB-P23 | turn on `nb.sideTemplates`                                | a Templates list (folded by default); tapping one starts a page from it.                                                                                              |
| NB-P24 | turn on `nb.sideSaved`                                    | a Saved searches list; tap opens it; ☆ review button shows the card count.                                                                                            |
| NB-P25 | hold a page row's grip and drag (unlock `nb.dragGrip`)    | before, after or inside another page; live reflow; one Undo step; a page cannot move inside itself.                                                                   |
| NB-P26 | choose Move up / down / to top level (unlock `nb.move`)   | the page moves; Undo toast.                                                                                                                                           |
| NB-P27 | choose Lock this page in the strip (unlock `nb.lockPage`) | the page locks (🔒); "Unlock this page" shows on it.                                                                                                                  |

### Left panel (Pages · Outline · Resources)

| Id     | When I do X                                    | Then Y                                                                                                                                                                                                                                       |
| ------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NB-B40 | open a notebook and tap the panel toggle       | a 264 px panel opens with tabs Pages · Outline · Resources. "Audio" is gone: recordings are a kind of Resource (N5). The tab row is the shared Tab row, with "+" to add any tab.                                                             |
| NB-B41 | open Pages                                     | thumbnails (title, 3 lines, page number, 🔒); the current page is highlighted and centred; scroll; tap opens. Up to 200 rows, then "Show more".                                                                                              |
| NB-B42 | tap "Organise" in Pages                        | a pick mode starts: tap thumbnails to pick; the Object bar shows Move earlier, Move later, Duplicate, Delete, Extract, Pick all / none, Undo.                                                                                                |
| NB-B43 | hold a thumbnail 0.3 s and drag                | it lifts (55%), a drop-line shows the place, other rows slide aside; drop saves; Undo toast; ▲▼ buttons do the same on keyboard (Alt + ↑/↓).                                                                                                 |
| NB-B44 | pick pages and tap Delete                      | they go to Trash; toast "Moved N pages to Trash" with Undo; the notebook never loses its last page (toast "A notebook needs at least one page").                                                                                             |
| NB-B45 | pick pages and tap Duplicate                   | copies appear right after each original, named "X copy"; toast with Undo.                                                                                                                                                                    |
| NB-B46 | pick pages and tap Extract…                    | a small dialog asks for a name and a notebook (new or existing); the pages move there; toast with Undo and "Open".                                                                                                                           |
| NB-B47 | tap "Page" (add) in the footer                 | a blank page is added after the current one and opens.                                                                                                                                                                                       |
| NB-B48 | open Outline                                   | the whole notebook outline; other pages fold to one line; the current heading is highlighted and kept centred while I read; scrollable. Find box has ✕.                                                                                      |
| NB-B49 | tap a heading in the Outline                   | the page opens and glides to that heading (and opens any Toggle around it).                                                                                                                                                                  |
| NB-B50 | open Resources                                 | scope This page / Notebook / Everywhere; kind chips All, Images, Links, References, Notes, Audio, Files; "Add" menu; each row has Insert in the page and ⋯ (Rename, Keep for this page / notebook, Copy, Delete). Empty: "Nothing here yet." |
| NB-B51 | tap the panel's ✕                              | the panel closes; the choice is remembered per device.                                                                                                                                                                                       |
| NB-B52 | open the panel on a phone                      | a left drawer (86 vw) with scrim, same tabs.                                                                                                                                                                                                 |
| NB-P40 | turn on `nb.outlineLevels`                     | a row above the Outline: Level 1, 1-2, All, Toggles, Numbers (1, 1.1), and a fold arrow per line; remembered per device.                                                                                                                     |
| NB-P41 | turn on `nb.resourceScope`                     | the scope switch (This page / Notebook / Everywhere) shows; Beginner uses This page and Notebook only.                                                                                                                                       |
| NB-P42 | hold a thumbnail's grip (unlock `nb.dragGrip`) | a grip shows on every thumbnail; dragging by it works exactly like NB-B43.                                                                                                                                                                   |

### Notebook screen, tab row, pages

| Id     | When I do X                                             | Then Y                                                                                                                                                                            |
| ------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NB-B60 | open a notebook                                         | cover, title, "N pages · N cards due · opened …", a Close ✕, the "More" button FIRST in the row (sliders icon + word), then the tab row Notes · Summary · Cards · Revise.         |
| NB-B61 | tap a tab                                               | it opens; the choice is saved per notebook and kept in the address (`#/notebook/<id>/<tab>`); ← / → move between tabs.                                                            |
| NB-B62 | scroll a notebook with many tabs                        | the row scrolls sideways with a thin track; overflow arrows have their own slot.                                                                                                  |
| NB-B63 | hold a tab (or right-click it)                          | the strip shows Rename tab, Hide tab; hidden tabs come back through "Show tab …". (Beginner keeps today's rename and hide.)                                                       |
| NB-B64 | open a page inside the notebook                         | the notebook tab row hides so the pen and tools get the space; a small arrow (▾, 44 px target) at the top-left of the page shows it again for this visit.                         |
| NB-B65 | open Settings › Notebooks › "Show the tab row on pages" | on = the row stays shown inside pages; off (default) = hidden. The change shows at once; the arrow still works.                                                                   |
| NB-B66 | the Notes tab has pages                                 | pages list as List by default; Table / Board / Gallery are the per-tab view choices (remembered per tab). Table shows Page, Sub-pages, Changed.                                   |
| NB-B67 | the notebook has no pages                               | "No pages yet." with a "New page" button.                                                                                                                                         |
| NB-B68 | open a locked notebook / locked page                    | "This notebook is locked" with "Unlock in settings" / "This page is locked" with "Unlock this page"; nothing inside is readable.                                                  |
| NB-B69 | open the Pages / Outline preview pop from the bar       | a small pop shows the pages strip or the outline; "Open in the side panel" opens the left panel on that tab.                                                                      |
| NB-P60 | turn on `nb.viewSwitch`                                 | a View switch Default / Shelf / Tabs shows in Notes; it is saved on the notebook.                                                                                                 |
| NB-P61 | turn on `nb.tabOptions`                                 | a pen button on the tab row opens "Tab options": rename, hide / show, colour for each tab; reorder with the drag handle or ▲▼; "+" adds a tab (Edit tabs dialog, shared Tab row). |
| NB-P62 | turn on `nb.extraTabs`                                  | More › Tabs & views and Settings offer "Extra tabs for new notebooks" (Mind map, Slides, Resources, Database, own tab).                                                           |

### More sheet (docked right, 440 px, full screen on phone)

| Id     | When I do X                                                | Then Y                                                                                                                                                                                                       |
| ------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| NB-B80 | tap More                                                   | the sheet slides in (240 ms) at the same place and height every time (N10); only the body scrolls; the page stays visible beside it on wide screens.                                                         |
| NB-B81 | look at the sheet top                                      | header (icon, title, one-line subtitle, ✕) → picker row ("All notebooks" + one mini-cover tile per notebook, scrolls sideways with a track) → section tabs → body → footer (hint · Cancel · ✓ Done).         |
| NB-B82 | pick another notebook tile                                 | the same sheet shows that notebook's settings; no separate page per book (N11). Unsaved edits to the first one are kept in the draft.                                                                        |
| NB-B83 | switch tab, then back                                      | the body goes to the top on a new tab; edits keep their scroll place.                                                                                                                                        |
| NB-B84 | change a value                                             | the changed row glows once (700 ms), a live preview updates (cover, tab row); nothing is saved yet.                                                                                                          |
| NB-B85 | press Cancel, ✕, Esc, or tap outside                       | the draft is discarded; if I changed something, a small "Discard your changes?" dialog asks first.                                                                                                           |
| NB-B86 | press ✓ Done                                               | all changes save in one step; toast "Saved" with Undo.                                                                                                                                                       |
| NB-B87 | pick "All notebooks"                                       | tabs: Organise (Home layout Shelf / List, Start on, Open a notebook at, keep tab row), Tags, Templates, Trash.                                                                                               |
| NB-B88 | pick one notebook                                          | tabs: Look, Tabs & views, Privacy & AI, Actions.                                                                                                                                                             |
| NB-B89 | open Look › Cover                                          | six styles: Solid, Gradient, Pattern, Illustrated (13 art designs), Photo, First page; short label; colour; Reset look. Many more patterns and gradients than today (N9).                                    |
| NB-B90 | choose Photo and add a picture                             | a 3:4 crop frame shows with a rule-of-thirds grid; drag to position, Zoom 1 to 3; text says "Your photo: W × H px" and "Fits the cover exactly" or "Small photo: it may look soft". Replace, Centre, Remove. |
| NB-B91 | open Privacy & AI                                          | lock ring (hold to unlock), Allow AI, Allow AI while locked, Edit lock, a list of locked pages with Unlock; empty: "None. Lock a single page from its ⋯ menu."                                               |
| NB-B92 | open Actions                                               | Review this notebook, Move in the list, Duplicate, Export notebook, Reset look, Delete notebook (red, "You can undo this.").                                                                                 |
| NB-B93 | open Trash (All notebooks)                                 | list with kind and "Deleted 3 days ago"; Restore and Delete forever are visible buttons (not hover); Empty: "Trash is empty."; note "Restore brings back everything deleted at the same moment."             |
| NB-P80 | open More › Tags (unlock `nb.managePanes`)                 | manage tags: rename, colour, move up a level, merge, delete; nested; ✕ in the search.                                                                                                                        |
| NB-P81 | open More › Templates / Organise (unlock `nb.managePanes`) | Templates: list, Use, New template, delete ("Daily journal" is protected). Organise: notebook order ▲▼ and Edit.                                                                                             |
| NB-P82 | open Actions (unlock `nb.shareLayers`)                     | "Share layers" shows with the line "Saves this notebook's add-on layers as a file a friend can import." Without the switch it is not shown anywhere (also not in the tab-row menu).                          |

### Search chips, from the notebooks side

The notebook-side search box ("Find a notebook") is NB-P01. The Search popup is below (SR-lines).

## Search

### When I do X, then Y

| Id     | When I do X                                                         | Then Y                                                                                                                                                                                        |
| ------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SR-B01 | press Ctrl K / ⌘K, or tap Search in the top bar                     | the Search panel opens with the cursor in the box (full screen on phone). Ctrl+Shift+K opens it on the Features chip. Esc closes it.                                                          |
| SR-B02 | type                                                                | results appear as I type, in groups with counts: Pages, Notes, Cards; words highlighted; a location line "Notebook › Page".                                                                   |
| SR-B03 | look at the box with text in it                                     | an ✕ (44 px target) sits inside the box; tap clears the text, keeps focus, and shows the browse state. Same ✕ in the Search screen box (N7).                                                  |
| SR-B04 | look at the chips                                                   | Beginner: All · Pages · Notes · Cards, with counts. A chip tap filters at once.                                                                                                               |
| SR-B05 | look at the scope switch                                            | This page · Notebook · Everything; the choice is remembered. This page shows Find in page with "3 of 12", previous / next.                                                                    |
| SR-B06 | open Search with no text (browse state)                             | Recent pages (last 20 opened, shows 5), Recent searches with Clear, Recent tools, Recommended tools.                                                                                          |
| SR-B07 | press ↑ ↓ Enter                                                     | the highlighted row moves; Enter opens it; the footer shows the keys line. On a result row, Enter on "See all" opens the full Search screen.                                                  |
| SR-B08 | tap a Pages / Notes result                                          | the page opens and the match glows (the "Highlight where I land" switch, on by default); toast only if it could not open.                                                                     |
| SR-B09 | tap a Cards result                                                  | it opens the card's page at the card.                                                                                                                                                         |
| SR-B10 | hold a result row 0.5 s (or right-click)                            | the Context menu strip opens: Open, Open in new place (side panel), Copy link, Pin as favourite. Does not run the search again.                                                               |
| SR-B11 | type something with a typo                                          | "Did you mean …" offers a fix only if it finds a live result.                                                                                                                                 |
| SR-B12 | search for a word with no match                                     | Empty state "Nothing found" with "Search Trash" when Trash has matches; no stale "arrive with…" text anywhere.                                                                                |
| SR-B13 | a page is locked                                                    | its title may show with 🔒 and "Unlock to search inside"; its text never matches.                                                                                                             |
| SR-B14 | tap "See all N"                                                     | the Search screen opens with the same query, a ✕ close, filters row, count, result list.                                                                                                      |
| SR-B15 | type a word that is also a tool or setting, on All                  | a Features group shows matching tools and settings (same as today); tapping runs the tool or opens the setting. Beginner has no Features chip (see D3), but this group and Ctrl+Shift+K stay. |
| SR-B16 | the Search screen shows cards                                       | "Review these (N)" starts a review of the matched cards; "Remove N empty cards" offers a cleanup with Undo toast.                                                                             |
| SR-B17 | open Search with the Library or Home missing                        | Books, Highlights and Tasks chips are not shown; there is no "Soon" or "arrive with…" text (stale chips removed).                                                                             |
| SR-P01 | turn on `search.moreChips`                                          | extra chips Books, Highlights, Tasks, Features appear with counts. Features lists tools and settings with a pin button; the hint says "Ctrl+Shift+K opens just those".                        |
| SR-P02 | tap a Books or Highlights chip (unlock `search.moreChips`)          | results come from the Library (books by title and text, highlights by text and note); tapping opens the book at the place. If the Library flag is off the chip stays hidden.                  |
| SR-P03 | tap the Tasks chip (unlock `search.moreChips`)                      | tasks from Home with a done tick; tapping opens Home's Tasks.                                                                                                                                 |
| SR-P04 | tap More (sliders + "More", first in the row; unlock `search.more`) | a 440 px sheet (same shared More sheet) opens with tabs: Where and type, Filters, Time and order, View, Saved, Find in page, Tools, Handwriting and more.                                     |
| SR-P05 | use Filters (unlock `search.filters`)                               | Notebook list with counts; Tag chips with an "All tags" drill row (Tag picker); Card status (New, Learning, Due, Paused, Empty); the results update live.                                     |
| SR-P06 | filters are in use (unlock `search.activeFilters`)                  | a row of chips shows each active filter, each with its own ✕; "Clear all".                                                                                                                    |
| SR-P07 | use Time and order (unlock `search.sort`)                           | Changed: Any time, Past week, Past month; include Journal, Templates, Trash; Sort: Best match, Newest, Most missed.                                                                           |
| SR-P08 | choose a View (unlock `search.views`)                               | List, Compact or Grouped; remembered.                                                                                                                                                         |
| SR-P09 | tap "Review these" (unlock `search.reviewThese`)                    | a review of the matching cards starts; toast "Review started with the matching cards".                                                                                                        |
| SR-P10 | use Saved (unlock `search.saved`)                                   | Save current search (name dialog, ✕), the saved list with card counts; Rename in place; Duplicate; Delete with Undo; tap opens it.                                                            |
| SR-P11 | use Find in page (unlock `search.findInPage`)                       | "Find x of y" with Previous, Next, Next page, live count; the match glows.                                                                                                                    |
| SR-P12 | use Tools (unlock `search.tools`)                                   | search all features; pin or unpin a tool to the toolbar favourites row.                                                                                                                       |
| SR-P13 | use Write to search (unlock `search.scribble`)                      | a pad opens; I write a word with the Pencil, lift it, and the word is searched; one tap on Use or Clear.                                                                                      |
| SR-P14 | open Handwriting and more (unlock `search.handwriting`)             | switch for scribble-to-search; drawing-label search on / off; recent searches list with Clear.                                                                                                |
| SR-P15 | tap the minimise button on the Search panel                         | it collapses to an accent chip (icon + "Search") on the right edge; tap restores; nothing is covered while docked.                                                                            |

## States

| State                     | Notebooks                                                                                                                                           | Search                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Empty                     | Home: Empty state with New notebook. Notes: "No pages yet.". Resources: "Nothing here yet.". Trash: "Trash is empty."; Starred / Recent notes above | "Nothing found"; browse state when the box is empty; "No feature matches …".                     |
| Error                     | a notebook that cannot load shows "This notebook could not be shown" with Retry; a failed save keeps the draft and toasts the reason                | the index still building shows "Getting ready…" with progress; results appear as they are ready. |
| Offline                   | everything works (local); Photo cover upload works; Share layers / Export save a file locally                                                       | all local; only the Library-web look-ups (outside this slice) say "needs internet".              |
| Phone (≤ 640)             | bottom tab bar; sidebar and panel are drawers; More sheet full screen; shelf 2 columns; strip centred above the row                                 | full-screen panel; chips scroll sideways with a track; sheet full screen.                        |
| iPad landscape / portrait | landscape: sidebar + panel docked (≥ 1180); portrait: the sidebar steps aside while the panel is docked (641 to 1179)                               | panel docks right at 360 (landscape), overlay in portrait.                                       |
| Light / dark / sepia      | all tokens; covers keep their own colours; text on covers keeps 4.5:1 contrast                                                                      | same                                                                                             |
| Reduced motion            | slide, glow and lift are instant; states still change                                                                                               | same                                                                                             |
| Reduced transparency      | glass becomes solid                                                                                                                                 | same                                                                                             |

## Nothing lost

### Notebooks (today, file:line, to new home)

| Today's feature                                                                | Where in code                                                                                                      | New home                                               |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Home title, Shelf / List switch, New notebook button                           | `NotebooksHome.tsx:200-240`                                                                                        | NB-B01, NB-B06, NB-B10                                 |
| Tabs All / Starred / Recent, remembered                                        | `NotebooksHome.tsx:76, 242-269`, `notebookLook.ts:135`                                                             | NB-B02, NB-B03                                         |
| Only visible rows drawn (500+ notebooks)                                       | `NotebooksHome.tsx:112-160`, `notebookLook.ts:105`                                                                 | NB-B12                                                 |
| Cover with colour, short label, first-page cover                               | `NotebooksHome.tsx:352-410`, `notebookLook.ts:24-48`                                                               | NB-B89 (Look › Cover, First page)                      |
| Star button on a card; Pin to the top                                          | `NotebooksHome.tsx:306-335`, `notebookService.ts` `setNotebookStarred`                                             | NB-B07, NB-B08                                         |
| Card menu: Pin, cover page / colour, Change colour (right-click and ⋯)         | `NotebooksHome.tsx:161-197, 411-460`                                                                               | NB-B08 (strip) and NB-B89                              |
| "N due" badge, opened Today / Yesterday / date                                 | `NotebooksHome.tsx:336-350, 43-52`                                                                                 | NB-B03, NB-B05                                         |
| "+" add tile at end of the All shelf                                           | `NotebooksHome.tsx:533-548`                                                                                        | NB-B06                                                 |
| Empty lines for Starred / Recent                                               | `NotebooksHome.tsx:284-290`, `i18n/en/late/library.ts:8-10`                                                        | NB-B02, NB-B03, NB-B13                                 |
| Notebook opened-time memory (500 kept), last page per notebook (200 kept)      | `notebookLook.ts:60-88`, `lastPage.ts:17-40`                                                                       | NB-B04, NB-B11                                         |
| Notebook screen: crumb, title, Close ✕                                         | `NotebookScreen.tsx:193-205`                                                                                       | NB-B60                                                 |
| Tab row with keyboard (← →), rename / hide / show tabs                         | `NotebookScreen.tsx:107-120, 122-190, 210-245`                                                                     | NB-B61, NB-B63, NB-P61                                 |
| Tab ⋯ menu: Export notebook                                                    | `NotebookScreen.tsx:145-147`                                                                                       | NB-B92 (Actions)                                       |
| Tab ⋯ menu: Pause (Review pause)                                               | `NotebookScreen.tsx:149-155`                                                                                       | NB-B92 (Actions)                                       |
| Tab ⋯ menu: Lock this notebook; Lock editing                                   | `NotebookScreen.tsx:94, 158`, `app/lock/lockMenu.ts:54`, `editLockMenu.ts:15-33`                                   | NB-B91                                                 |
| Tab ⋯ menu: Share layers                                                       | `NotebookScreen.tsx:161-175`                                                                                       | NB-P82 (Pro only, owner decision N12)                  |
| Notes / Database / Cards / Revise / Summary tab bodies                         | `NotebookScreen.tsx:261-300, 345`, `recall/CardsTab.tsx:39`, `revise/ReviseTab.tsx:23`                             | opened in their own slices; this slice only hosts them |
| Notes views: List, Gallery, Table, Board                                       | `NotesViews.tsx:221-370`                                                                                           | NB-B66                                                 |
| Notes views: Shelf, Tabs (notebook View menu)                                  | `NotesViews.tsx:382-440`, `notebookViews.ts:17-60`                                                                 | NB-P60                                                 |
| Per-tab view memory and section tab colour                                     | `notebookViews.ts:30-60`                                                                                           | NB-P61                                                 |
| Page tabs on a page (Notes / Summary / Review + extras) and the "Tabs" chooser | `pageTabs.ts:13-35`, `app/summary/PageTabs.tsx:24-95`                                                              | stays; extras chosen in NB-P62                         |
| Sidebar width handle, keys, 200 to 480                                         | `app/SidebarResizer.tsx:10, 35-56` (keys 35-40, double-click 55), `sidebarWidth.ts:2-20` (260 default, 200 to 480) | NB-B28                                                 |
| Sidebar Today link and Alt+T                                                   | `Sidebar.tsx:389-409`, Alt+T in `App.tsx:1168`                                                                     | NB-B20                                                 |
| Sidebar Search link                                                            | `Sidebar.tsx:409`                                                                                                  | NB-B20                                                 |
| Study group: Review + due badge, All cards, All summaries                      | `Sidebar.tsx:301-355`                                                                                              | NB-P20 (Review stays in NB-B20)                        |
| Quick access: Favourites, Recent pages, Calendar, Databases                    | `Sidebar.tsx:433-480`, `app/QuickPages.tsx:112-155`                                                                | NB-P21                                                 |
| Notebook tree: expand / collapse, rows, "+", due pill (refresh 60 s)           | `Sidebar.tsx:481-674, 594-603`                                                                                     | NB-B21, NB-B27                                         |
| Journal group and its date-sorted rows                                         | `Sidebar.tsx:391, 661`, `pages/PageTree.tsx:137, 225-232`                                                          | NB-B20 (unchanged)                                     |
| Tags section + Manage tags                                                     | `Sidebar.tsx:675`, `tags/TagsSection`                                                                              | NB-P22, NB-P80                                         |
| Templates section (folded) + Memory helpers row                                | `Sidebar.tsx:680`, `templates/TemplatesSection.tsx:137-150`                                                        | NB-P23, NB-P81                                         |
| Saved searches section                                                         | `Sidebar.tsx:692`, `search/SavedSearchesSection.tsx:31-159`                                                        | NB-P24                                                 |
| Notebook row menu (8 items) and hover buttons                                  | `NotebookRowMenu.tsx:11-85`, `Sidebar.tsx:735-760`                                                                 | NB-B24                                                 |
| Page row menu (7 items), double-click rename, hover buttons                    | `pages/PageRowMenu.tsx:14-93`, `pages/PageTree.tsx:219, 247-303`                                                   | NB-B25                                                 |
| Page drag (before / after / inside), one Undo, ▲▼ keyboard                     | `pages/pageDrag.ts`, `PageTree.tsx:93-111, 155`                                                                    | NB-B43, NB-P25                                         |
| Delete page with Undo; delete notebook with confirm and Undo                   | `Sidebar.tsx:244-272`, `pages/pageTrash.ts:17`                                                                     | NB-B09, NB-B26                                         |
| Long-press 500 ms, slop 8 px, swallow the click, block native menu             | `app/useLongPress.ts:10-123`, `Sidebar.tsx:183`, `PageTree.tsx:78`                                                 | NB-B24, NB-B25 (same hook feeds the strip)             |
| Visible ⋯ on touch and on narrow rows (< 19 rem)                               | `app/ui.tsx:77-98`                                                                                                 | NB-B24 (kept)                                          |
| Add-page menu (blank, from template) and template picker                       | `Sidebar.tsx:707-737`, `templates/TemplatePicker.tsx:18-94`                                                        | NB-B27                                                 |
| Phone drawer, scrim                                                            | `App.tsx:1539-1548`                                                                                                | NB-B29                                                 |
| Left panel Pages: thumbnails, lock, 3 lines lazy, 200 cap, blank, empty        | `app/panel/LeftPanel.tsx:59-190`                                                                                   | NB-B41                                                 |
| Left panel Outline + depth, Toggles, numbers, fold                             | `LeftPanel.tsx:192-357`, `panelModel.ts`                                                                           | NB-B48, NB-P40                                         |
| Left panel Audio (recordings list, Record now, open recorder)                  | `LeftPanel.tsx:359-400`                                                                                            | NB-B50 (Audio kind in Resources)                       |
| Left panel close, docked 280 / overlay 300, remembered tab                     | `LeftPanel.tsx:407-513`                                                                                            | NB-B40, NB-B51                                         |
| Sheet strip for long paper pages                                               | `LeftPanel.tsx:516-554`                                                                                            | NB-B41 (kept inside Pages)                             |
| Book panel and read-aloud panel                                                | `reader/BookPanel`, `reader/aloud/AloudPanel`                                                                      | not changed (Library slice)                            |
| Review home: due per notebook                                                  | `ReviewHome.tsx:15-100`                                                                                            | Review slice; not changed here                         |
| Hidden notebooks (Templates, databases home) stay hidden                       | `notebookService.ts` `listNotebooks`                                                                               | unchanged                                              |
| Cover sizes and the "Collapse all" button                                      | not in today's code (no match for collapse in `Sidebar.tsx`)                                                       | NB-B22 (new; restored per owner)                       |

### Search (today, file:line, to new home)

| Today's feature                                                                                                                | Where in code                                               | New home                                 |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------- |
| Popup opens with Ctrl/Cmd+K and Ctrl/Cmd+Shift+K; 🔍 buttons                                                                   | `SearchPopup.tsx:49-60`, `App.tsx:1201-1219`                | SR-B01                                   |
| Search box (native `type=search`)                                                                                              | `SearchPopup.tsx:224`, `SearchScreen.tsx:186-194`           | SR-B03 (own ✕)                           |
| Chips All, Pages, Notes, Cards, Books, Highlights, Tasks, Features                                                             | `SearchPopup.tsx:34-46, 258-270`, `TypeChips.tsx:5-47`      | SR-B04, SR-P01                           |
| Stale "arrive with the Library / reader / Home" text: Books and Highlights chips (`COMING` list); the Tasks text key is unused | `SearchPopup.tsx:45-46, 303-305`, `i18n/en/search.ts:25-29` | removed (SR-B17, SR-P02, SR-P03)         |
| Recent pages (20) in browse state                                                                                              | `SearchPopup.tsx:99-105`, `recentPages.ts`                  | SR-B06                                   |
| Recent tools and recommended tools                                                                                             | `recentTools.ts:10-23`, `SearchPopup.tsx:285-300`           | SR-B06                                   |
| Result groups with limits, "See all N"                                                                                         | `SearchPopup.tsx:109-120, 468`                              | SR-B02, SR-B14                           |
| Features rows (every tool and setting), pin to toolbar                                                                         | `SearchPopup.tsx:123-131, 389-440`, `ToolSections.tsx`      | SR-B15, SR-P01, SR-P12                   |
| Keyboard ↑ ↓ Enter Esc, keys footer                                                                                            | `SearchPopup.tsx:157-180, 460`                              | SR-B07                                   |
| No results + Search Trash offer                                                                                                | `SearchPopup.tsx:344-346`, `SearchScreen.tsx:365-393`       | SR-B12                                   |
| Task results                                                                                                                   | `TaskResults.tsx:51`                                        | SR-P03                                   |
| Search screen: title, close, count, hint                                                                                       | `SearchScreen.tsx:166-180, 315-355`                         | SR-B14                                   |
| Filters: notebook, tag (+ All tags), card status, "More filters"                                                               | `SearchScreen.tsx:205-285` (chip ✕ at 514)                  | SR-P05, SR-P06                           |
| Changed, Include (journal, templates, Trash), Sort                                                                             | `SearchScreen.tsx:582-594`                                  | SR-P07                                   |
| View switch                                                                                                                    | `SearchScreen.tsx:291`                                      | SR-P08                                   |
| Review these (N); Remove empty cards with Undo                                                                                 | `SearchScreen.tsx:327-343, 130`                             | SR-B16, SR-P09                           |
| Did you mean                                                                                                                   | `SearchScreen.tsx:375`, `searchService` `suggestSearch`     | SR-B11                                   |
| Result rows (highlight, status, empty card, locked, in Trash)                                                                  | `SearchResults.tsx:1-157`, `highlight.ts`                   | SR-B02, SR-B13                           |
| Save search / Update saved, name dialog                                                                                        | `SaveSearchActions.tsx:20-91`                               | SR-P10                                   |
| Saved searches: rename, delete (confirm), review count                                                                         | `SavedSearchesSection.tsx:31-159`, `savedSearchService.ts`  | SR-P10                                   |
| Index middleware, ranking, counts, word index                                                                                  | `indexMiddleware.ts`, `searchQuery.ts`, `searchService.ts`  | unchanged (data layer; no schema change) |
| Row computed fields                                                                                                            | `rowComputed.ts`                                            | unchanged                                |

## Edge cases

- A tab, notebook or page deleted in another window while a menu is open: the menu closes with "That was removed" and nothing breaks.
- Dropping a page into its own sub-page is refused (the drop-line does not appear).
- Extract to a locked notebook is refused with the "locked" message.
- Photo cover: files over 10 MB or not a picture show an error line in the sheet; the draft keeps the previous cover.
- Search text with no letters or digits finds nothing and shows the browse state.
- Search while the index is still being built: partial results, plus "Still getting ready".
- Long names wrap to two lines in rows; the delete button is never clipped.
- A fast double-tap on Done saves once.
- Pencil drawn over a row does not open the strip or start a drag; finger or mouse only.
- iPad Safari long-press: the native callout is blocked while the strip is open.

## Security check

- Photo cover is read on the device, cropped to a small picture, stored locally; it is never uploaded by this slice. Picture type and size are checked; SVG covers are not accepted as uploads.
- Search text is only split into words, never run as code or a pattern; saved queries are checked on read.
- Names are inserted as text, never as HTML.
- Share layers writes a file the user chooses to share; nothing is sent by this slice.
- Deletes are soft (Trash) with Undo. "Delete forever" asks first.
- Locked notebooks and pages never show text or match a search while locked.
- No new network calls; no secrets.

## Tests

- Unit: `homeTabList`, `shelfOrder`, `visibleRows`, extract / duplicate / delete-page plans (pure functions), cover crop maths (photo ratio, fit message), strip item builders per row kind, search chip list per level and flag, `✕` clear behaviour.
- E2E: one test per line id above (NB-B01 to NB-B93, NB-P01 to NB-P82, SR-B01 to SR-B17, SR-P01 to SR-P15), on Chromium and `ipad-webkit`. Pro lines first turn on only their own switch and check Beginner stays Beginner.
- Screenshots: Beginner and Professional x light and dark x iPad landscape, iPad portrait, phone, PC for Home, Sidebar + panel, Notebook, More sheet (each tab, All and one notebook), Search popup, Search More, Pages Organise, cover crop.
- Accessibility: names, roles, focus return after sheet / strip / dialog, contrast on covers, tab order; 44 pt target check.
- Size budget: first load stays at or below 320,000 B; More sheet, cropper, Search More and Organise are lazy chunks.
- Nothing-lost probe: every row of the two tables above is probed in the new build with the flags ON.
- Flag test: with both flags OFF, screenshots equal today's, pixel for pixel.
- Fault tests: dropped pointer-up during a drag ends it within 4 s; second pop-up closes the first.
- Regression: each fixed bug gets a "why it happened" line and a test (see list in Decisions to review D10).

### Sub-slice build order (one surface group per commit)

| #   | Group                                                       | Files (proposed)                                                                                                     |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | Flags and shared glue                                       | `src/app/flags.ts` (two names), `src/notebooks/v2/strips.ts` (builds strip items from today's menus), ✕ field wiring |
| 2   | Home (All / Starred / Recent, strip)                        | `src/notebooks/v2/HomeV2.tsx`, `ContinueStrip.tsx`                                                                   |
| 3   | Sidebar v2 (Collapse all, groups)                           | `src/notebooks/v2/SidebarV2.tsx`, `treeState.ts`                                                                     |
| 4   | Left panel v2 (Pages, Outline, Resources)                   | `src/app/panel/v2/PagesTabV2.tsx`, `OutlineTabV2.tsx`, `ResourcesTab.tsx`, `pageOrganise.ts` (pure plans)            |
| 5   | Notebook screen (tab row hide, arrow)                       | `src/notebooks/v2/NotebookScreenV2.tsx`, `tabRowVisibility.ts`, Settings row                                         |
| 6   | More sheet: Organise, Tags, Templates, Trash                | `src/notebooks/v2/more/*.tsx`                                                                                        |
| 7   | More sheet: Look (covers + cropper), Tabs, Privacy, Actions | `src/notebooks/v2/more/Look.tsx`, `covers/` (patterns, art), `Cropper.tsx`                                           |
| 8   | Search popup v2 (chips, ✕, stale text removed)              | `src/search/v2/SearchPopupV2.tsx`, `chips.ts`                                                                        |
| 9   | Search More sheet and Search screen                         | `src/search/v2/SearchMore.tsx`, `SearchScreenV2.tsx`                                                                 |
| 10  | Pencil scribble-to-search                                   | `src/search/v2/ScribblePad.tsx`                                                                                      |

Each commit: tests green, screenshots, then the next. Group 2 to 7 can run in two lanes (notebooks, search) because they touch separate folders.

## Won't do

- No change with both flags OFF.
- No data-model change; only added optional fields (cover art id, crop box). Old fields stay.
- No private copy of the Tab row, ✕ field, drag, More sheet or strip.
- No hover-only buttons (touch must see them).
- No new "Library" or "Home" screens here; only the search hooks for them.
- No AI calls from Search or the cover picker.
- No new notebook types, no collaboration, no sync changes.
- No automatic page deletion; Delete always goes to Trash with Undo.
- No cover upload of SVG or animated pictures.
- No changes to the page editor, Cards, Revise, Summary or Mind map tab bodies.

## 3-step owner iPad check

1. Open Notebooks. Tap All, Starred, Recent. Hold your finger on a cover. A small strip of actions should appear. Try Pin, then Undo.
2. Open a notebook, then a page. The row of tabs should be hidden; tap the small arrow to bring it back. Open the side panel, tap Pages, hold a page and drag it; tap Organise and try Duplicate and Delete (then Undo). Tap More, pick another notebook at the top, change its cover with your own photo, and press Done.
3. Tap Search, type a word, tap the ✕ to clear it, tap the Features chip and search "dark". Hold a result to see its strip. Try the Pencil in Professional with Write to search switched on.

## Decisions to review

D1. Context menu strip is shared part step 2 of 0g. If it is not built when this slice starts, the slice uses today's `MenuPopover` behind the same item builders and swaps to the strip with no spec change.
D2. Pages-tab organise (add, delete, duplicate, extract, reorder) is in Beginner, with no new unlock switch, because the owner asked for the full set and Beginner needs delete and reorder anyway. Only the grip (`nb.dragGrip`) and Move up / down (`nb.move`) are Pro. A new switch such as `nb.pagesOrganise` could split it later; tell me if you want that.
D3. Today Beginner sees the Features chip. The mock hides it from Beginner. To drop nothing, Beginner keeps the Features group under All when typing, Ctrl+Shift+K, and "Search all features" in the page ⋯ menu; only the chip is Pro (`search.moreChips`).
D4. Today Beginner can rename and hide notebook tabs; the mock makes tab options Pro. Beginner keeps Rename and Hide in the hold strip; colour, reorder and "+" are `nb.tabOptions`.
D5. Share layers is Pro only (owner decision). Beginners who used it today lose it until they turn on `nb.shareLayers`; the Settings list says so in one line.
D6. Hold timing: 0.3 s lifts a thumbnail for drag, 0.5 s opens the strip. On a page thumbnail, lift then release without moving opens the strip. Elsewhere, drag uses the grip (Pro) or Move up / down.
D7. Panel and sidebar width: 264 px per the shell spec (today 260 and 280) with 44 px rows. "Bigger" is met by the taller rows and the 44 px targets, not by a wider panel. Tell me if you want 300.
D8. Books and Highlights chips show only when the Library slice is on; Tasks only when Home is on. No "Soon" label at all.
D9. "Collapse all" is not in today's code (the owner remembers it). It is built new, in the Notebooks group header.
D10. Bugs fixed on the way (each needs a "why" line and a test): sidebar covers the reader bar's ✕ (CI 12 Nov; sidebar steps aside or lower layer 59); More sheet height jumping with content (fixed box); Review More overlapping row is in the Review slice, not here.
D11. Settings option name and place: Settings › Notebooks › "Show the tab row on pages", default OFF inside a page (hidden). The Settings slice owns the row; this slice reads the pref `notebooks.tabRowOnPage`.
D12. Cover art: 13 illustrated designs exist in the mock; "many more" is met with 6 styles and about 40 patterns / gradients / art tiles. The exact count is open; ship the 13 art tiles first and add more as small commits.
D13. Right-click on search result rows is new (today there is none). It opens the same strip as long-press.
D15. Owner pick in PENDING ("a star only on pinned covers") is read as: the star means Pin and is filled only when pinned. Today's star is always drawn (outline when not pinned) and touch has no hover, so the outline star stays visible and fills only when pinned. Safest choice, same as D14.
D16. Today every level sees all eight chips (no level check in `SearchPopup.tsx`). Tasks results already work (`TaskResults.tsx`); only Books and Highlights are `COMING` chips with stale text. Level gating of chips is new in v2 (D3).
D14. The Starred star and the "N due" badge on a cover stay visible in both levels (they are today's essentials), not Pro.
