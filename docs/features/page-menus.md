# Page menus (slice 12, flag `page.menus`)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

In plain words: the menus you use while writing on a page. Type "/" to add a block. Long-press (iPad) or right-click (PC) to get a small horizontal strip like the iPad's own (Cut, Copy, Paste ▾, Delete, ⋯). Paste keeps the look of what you copied, with no question. The page ⋯ opens a tidy side sheet. New pages offer a start card until you pick a default. Blocks get a handle that works with touch and Pencil. Beginner sees short lists; Professional gets everything, each extra behind its own switch. Nothing the app does today is lost.

Sources: `docs/plans/build-master-plan.md` 2.2 (owner's answers, final); `docs/plans/app-audit-2026-11-12.md` section 5 batch 1 (recommended split and spec lines); `docs/PENDING.md` "Favourites row + Organise + long-press strip + Paste: APPROVED" with `docs/mockups/favourites/` (menu-1.png, menu-2.png, menu-3.png, menu-1-phone.png); [copy-paste.md](copy-paste.md), [editor-and-blocks.md](editor-and-blocks.md), [new-page-start.md](new-page-start.md), [templates.md](templates.md). Per the master plan's running principle 2, this spec replaces a mock-up.

The tool bar, the text-selection format bar (BUG-002) and Favourites of tools live in [toolbar-v8.md](toolbar-v8.md).

## How it works

### New shared parts (exact behaviour and sizes)

All live in `src/design/parts/`, are placed only by the overlay manager `src/app/overlay/` (fixed layer order, one open at a time, Esc and tap-outside, "open beside, never over", focus kept inside dialogs), take input from the event / gesture routers and read `src/app/selection/store.ts`. They use the tokens and card frame of `docs/mockups/toolbar-v8/design-study.md` 3 (glass 88–92 %, blur 28 px, hairline, two-layer shadow, Lucide 1.6 icons, 44 px targets, 150–200 ms motion, instant with reduced motion). Each appears on the Parts gallery (`src/design/DesignTokensPage.tsx`) for screenshot tests.

| Part                   | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Sizes and motion                                                                                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Context menu strip** | One horizontal row of actions (icon + name) for right-click, long-press (0.5 s finger, also Pencil) and ⋯ on rows. Groups split by hairlines; Delete last, in danger red. Items with ▾ open a 304 px picker card below the strip (replace, not stack). Overflow folds into "⋯ More" which opens the full list as a Command list. Arrow points at the press point. Never covers the selection or its handles: above, else below, else beside. Tap outside or Esc closes. | Height 48 px, radius 16 px, padding 4 px, items 44 px tall with 12 px side padding, 8 px gap from the selection, at least 12 px from screen edges. Opens 160 ms (fade + scale .96 → 1 from the arrow), closes 120 ms. |
| **Command list**       | A searchable list with group headings, an icon or small picture per row, the shortcut key on the right, ★ on hover / long-press (Professional). Type to filter (matches names and aliases); ↑ ↓ moves, Enter picks, Esc closes. Recent (last 3) and Favourites on top. "Show all" row at the bottom when the list is short. Used by "/", "[[", "#", the command palette and Strip "⋯ More".                                                                             | Width 320 px (phone: full width − 24 px, bottom sheet), max height 420 px (or the space left, min 240), rows 44 px, group label 12.5 px semibold. Opens 160 ms.                                                       |
| **Sheet**              | Docked right at full height on iPad / PC, full screen on a phone. Header: title, optional section tabs (segmented), ✕. Body scrolls; footer optional (✓ / ✕ or Done). Fixed place and height (owner note N4). Swipe right (or down on phone) closes. The page stays usable beside it on wide screens.                                                                                                                                                                   | Width 376 px (≥ 1024 px screens) else 100 %, padding 16 px, header 56 px. Slides in 240 ms cubic-bezier(.2,.8,.2,1), out 180 ms.                                                                                      |
| **Dialog set**         | Confirm, Name, Choice, Alert. Centred, focus trapped, ✕ top right, Enter = main button, Esc = cancel. Red only for danger. Name field has ✕ clear and a 40-character limit shown at 32+.                                                                                                                                                                                                                                                                                | Width 360 px (phone: full width − 32 px), radius 20 px, padding 20 px, buttons 44 px. Fade + scale .96 → 1, 180 ms; backdrop 30 % black.                                                                              |
| **Toast queue**        | Stack of up to 3 at the bottom centre; kinds: done (2.5 s), undo (6 s, with Undo button), problem (stays until ✕). A new toast never replaces an earlier Undo; the 4th pushes out the oldest non-problem toast. Hover / touch pauses the timer. Never covers a title or an open sheet's footer.                                                                                                                                                                         | Width up to 420 px, height 44 px, 8 px apart, 16 px above the bottom safe area. Slide up 200 ms, out 150 ms.                                                                                                          |
| **Banner**             | One line across the top of the page content: icon, text, one action, ✕. Kinds: template, journal, read-only, lock, backup, update. One banner at a time; a newer one queues.                                                                                                                                                                                                                                                                                            | Height 44 px, radius 12 px, 12 px margin, slides down 200 ms.                                                                                                                                                         |

### Sizes, spacing, motion for the page surfaces

- "/" menu: Command list anchored 6 px under the cursor line, left edge on the cursor, clamped 12 px inside the screen; flips above when there is no room below.
- Block handle: "+" and ⠿ each 28 px visible inside a 44 px target, 8 px left of the block; on touch and Pencil it shows for the block with the cursor (no hover needed).
- Page ⋯ Sheet: sections Page · View · Share · Protect · Tools; pinned row of up to 5 action tiles (64 × 64 px) on top.
- New-page start card: 520 px max width, centred 48 px under the title, tiles 120 × 96 px.
- "Pasted as" chip (Professional): 32 px tall pill 8 px under the pasted content's end, shows 8 s.

### Spec lines ("When I do X → Y")

Each line is one end-to-end test (Chromium + `ipad-webkit`). "(Pro: `id`)" is the unlock switch. Ids marked **new** are added to `docs/mockups/pro-features.md` by this slice (see Decisions to review).

**"/" menu (Command list)**

- PM-01 When I type "/" on an empty line → the Command list opens under the cursor; Beginner shows about 12 items in 3 groups (Basic: Text, Heading, Bullet list, Numbered list, Checklist; Study: Card, Callout, Quote; Insert: Picture, Table, Divider, Link to page) and "Show all" at the bottom.
- PM-02 When I tap "Show all" → every item shows in 6 groups (Basic, Lists, Study, Media, Data, Page), including Card list, Mind map, Formula, Day record, Video / link, File, Camera, Database, Insert template, Save page as template, New sub-page, Link to page.
- PM-03 When I type after "/" → the list filters by name and alias as I type; Enter inserts the first match; Esc closes and leaves the "/" as text.
- PM-04 When I have used items → the last 3 used show in "Recent" on top.
- PM-05 When I type "/" inside a table cell → only items that fit in a cell show.
- PM-06 Professional: ★ on an item pins it to a Favourites group on top; ★ again removes it with a toast Undo (Pro: `page.slashStars` new).
- PM-07 Professional: "Arrange this menu" at the bottom opens the shared Arrange sheet (hide, reorder, reset) (Pro: `page.slashStars` new).
- PM-08 Professional: select a styled block → Strip ⋯ → "Save to My blocks" → Name dialog; it then shows in a "My blocks" group in "/" and inserts with its style (Pro: `page.myBlocks` new).
- PM-09 Beginner with Professional off sees "Show all" always available (no feature hidden for good).

**Long-press = right-click strip (Context menu strip)**

- PM-20 When I right-click (PC) or long-press 0.5 s (finger or Pencil) on text or a block → the strip opens above the selection: Paste ▾ · Copy · Cut · Duplicate · Turn into ▾ · Colour ▾ · Add to favourites · Comment · Delete (as menu-1.png); Beginner shows Cut, Copy, Paste ▾, Delete, ⋯.
- PM-21 The strip never covers the selection handles or the B/I/U bar (approval fix 1): strip above, format bar below.
- PM-22 When I tap ⋯ on the strip → the full list opens as a Command list in the same place (Select, Select all, Insert picture, Insert line, Copy as ▾, Move to page, Make card, Key point) (Pro extras: `tb.miniToolbar`, `page.contextMore` new).
- PM-23 When I long-press a page row, notebook row, library row or task row → the same strip opens at that point with that row's actions.
- PM-24 The hold time follows Settings "Press-and-hold menu time" (`advanced.holdMenu`).
- PM-25 When I drag after the long-press starts (more than the move distance) → the strip does not open and the gesture router hands the touch to select / drag.
- PM-26 On a phone → the strip shows up to 4 items + ⋯; every item in ⋯ is tappable (approval fix 2).

**Paste**

- PM-40 When I paste (Ctrl/Cmd+V, strip Paste, ⋯ Paste) → the content appears at once with its original look; no question first.
- PM-41 When I tap Paste ▾ → options: Keep original, Plain text, As text box (paper pages), As table (tab rows), As quote, Link / Embed (lone address), Clean up with AI (AI on with a key; cost shown first); the pick pastes in that form.
- PM-42 When I press Ctrl/Cmd+Shift+V → plain text, as today.
- PM-43 Settings › General › "Paste as" → Keep original (default), Plain text, Always ask; "Always ask" opens today's paste chooser before pasting.
- PM-44 Professional switch "Show 'Pasted as' chip" (default off in Beginner; on in Professional, where every switch reads as on per SET-B43, and can be turned off by itself) → after a paste the chip "Pasted as <form> ▾" shows for 8 s; choosing another form re-pastes it (Pro: `page.pastedChip` new).
- PM-45 When I tap Undo after any paste → the whole paste goes in one step.
- PM-46 Pasted HTML is always cleaned by `sanitizePastedHtml` (unchanged rules).

**Page ⋯ (Sheet)**

- PM-60 When I tap the page ⋯ → a Sheet opens docked right at full height (full screen on phone).
- PM-61 Beginner sees 8 items: Rename, Move, Duplicate, Export, History, Lock, Delete, Reading mode.
- PM-62 Professional sees all 22 by section: Page (Rename, Move, Duplicate, Favourite, Save as template, Import into page, Delete, Restore backup), View (Reading mode / Full-screen reader, Paper style ▾, Paper size ▾, Device mode ▾, Show / hide tool bar, Theme ▾), Share (Export, Copy ▸ pictures / plain text / Markdown, Paste as plain text), Protect (Lock, History), Tools (Review this page, Prompts, Search all features, Control panel) (Pro: `page.menuAll` new).
- PM-63 Professional: "+" pins up to 5 actions into the top row; reorder with the Arrange sheet (Pro: `page.menuAll` new).
- PM-64 When I delete the page from the sheet → it goes to Trash and an undo toast shows for 6 s.

**Block handle**

- PM-80 When I tap a block's handle → its menu (Context menu strip) opens beside the block: Delete, Duplicate, Turn into ▾, Move up, Move down.
- PM-81 When I hold the handle 0.3 s → the block lifts, a drop-line shows, others make room; drop moves it; nothing else reacts until the drop.
- PM-82 Professional adds Colour, Copy link to block, Copy as ▾ (Markdown, Rich text, Plain text, HTML), Make card, Add to Summary, Comment for AI (Pro: `page.blockMenuMore` new).
- PM-83 On touch and Pencil the handle shows next to the block with the cursor, without hover.

**New-page start card**

- PM-100 When I create a new page → the start card offers Blank, my default template and "More templates…", plus the paper style row.
- PM-101 Typing anything or tapping the page → the card goes away.
- PM-102 The card has "Always start with…" → pick Blank or a template; after that the card no longer shows and new pages start that way (`general.newPageStudy`); Settings can bring the card back.

**Templates**

- PM-110 When I tap "More templates…" or "/" Insert template → the template picker shows real previews (Pick on top), Manage below in Professional.
- PM-111 Professional: manage, categories, "Save this page as a template", starter page setting (Pro: `nb.addFromTemplate`, `nb.sideTemplates`, `general.newPageStudy`).
- PM-112 A page started from a template shows a Banner "Started from <template>" with ✕.

**Breadcrumb and tabs**

- PM-120 The breadcrumb shows notebook › page; tapping a part opens it.
- PM-121 Professional: sibling menu ("Pages at this level"), "Hidden parts of the path", full path, copy address (Pro: `page.breadcrumbMore` new).
- PM-122 Page tabs show Notes, Summary, Review; Professional adds add / reorder / hide tabs (Pro: `nb.tabOptions`, `nb.extraTabs`).

**Shared parts behaviour**

- PM-140 When a second menu, card or sheet opens → the first closes.
- PM-141 When I delete a block or page from any menu → an undo toast shows for 6 s and does not replace an earlier Undo toast.
- PM-142 Every Dialog has ✕, Esc closes, focus stays inside, Enter confirms.
- PM-143 Toasts never cover a page title or a sheet footer.

### States

- Empty: "/" with no match → "No block called '<text>'" and "Show all"; no templates → Empty state with "Save this page as a template"; no pinned row → "+ Pin an action".
- Error: clipboard refused → problem toast with the Ctrl/Cmd+Shift+V hint; template missing → Banner "Template not found" with "Start blank".
- Offline: all menus work; Clean up with AI is greyed with "Needs internet".
- Phone: strip max 4 items + ⋯; Command list and Sheet full width / full screen; Dialogs full width − 32 px.
- Dark / light / sepia: same tokens; danger red from the token.

## Nothing lost: today's features and their new home

| Today (file:line)                                                                                                               | New home                         |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Slash menu builder `src/editor/slashMenu.tsx:44`, aliases `:15`                                                                 | Command list PM-01–03            |
| Slash items `src/editor/slashMenu.tsx:72-202`                                                                                   | PM-01/02 groups                  |
| Slash mounted / close-on-select `src/editor/PageEditor.tsx:946-972`                                                             | Command list via overlay manager |
| "[[" trigger `src/editor/tagActions.ts:28`                                                                                      | Command list (same part)         |
| Hold menu `src/editor/HoldMenu.tsx:43-98`, watcher `holdMenuWatch.ts:204`                                                       | Strip PM-20/22                   |
| Long-press hook `src/app/useLongPress.ts:19`                                                                                    | Gesture router long-press        |
| Pen contextmenu `src/app/penTap.ts:200`                                                                                         | Gesture router                   |
| Row long-press `src/pages/PageTree.tsx:78`, `notebooks/Sidebar.tsx:183`, `library/LibraryScreen.tsx:225`, `home/TaskRow.tsx:37` | Strip PM-23                      |
| Anchored menu `src/app/tools/useAnchoredMenu.ts:27`, `AnchoredMenu.tsx:12`                                                      | Context menu strip               |
| Page row menu `src/pages/PageRowMenu.tsx:14`                                                                                    | Strip PM-23                      |
| Paste planner `src/editor/pasteFlow.ts:117`, choices `:195`, apply `:417`                                                       | PM-40/41/45                      |
| Paste chooser `src/editor/PasteChooser.tsx:31`                                                                                  | "Always ask" PM-43               |
| "Pasted as" chip `src/i18n/en/late/importExport.ts:108`                                                                         | PM-44 (Pro, on; Beginner off)    |
| Paste as box `src/editor/pasteFlow.ts:402`                                                                                      | Paste ▾ PM-41                    |
| Plain paste `src/editor/clipboard.ts:376`                                                                                       | PM-42, Paste ▾                   |
| Clean up with AI `src/editor/cleanupAi.ts`                                                                                      | Paste ▾ PM-41                    |
| Copy formats `src/editor/copyFormats.ts`                                                                                        | Copy as ▾ PM-22/82               |
| Picture chooser paste `src/images/PictureChooser.tsx:49`                                                                        | Kept                             |
| Page ⋯ items `src/pages/PageView.tsx:272-415`                                                                                   | Sheet PM-61/62                   |
| Block menu `src/editor/CardMenu.tsx:188-201`, Make card `:29`, Duplicate `:48`                                                  | PM-80/82                         |
| Breadcrumb `src/pages/PagePath.tsx:178`, style `pathStyle.ts:2`                                                                 | PM-120/121                       |
| Page tabs `src/notebooks/pageTabs.ts:13-41`, `app/summary/PageTabs.tsx:4`                                                       | PM-122                           |
| Page tabs settings `src/settings/PageTabsSection.tsx:43`                                                                        | Kept                             |
| Template picker `src/App.tsx:193-195`, `appUi.ts:25`                                                                            | PM-110                           |
| New from template `src/App.tsx:1122-1127`, template service `templates/templateService.ts:28`                                   | PM-110/111                       |
| Templates sidebar `src/templates/TemplatesSection.tsx:32`                                                                       | Kept (`nb.sideTemplates`)        |
| Starter templates `src/templates/starterTemplates.ts:73`                                                                        | Picker                           |
| New page start `src/templates/NewPageStart.tsx:31`, `PageView.tsx:685`                                                          | PM-100–102                       |
| Page favourites `src/app/favourites.ts:43`                                                                                      | Page section "Favourite"         |
| Toast `src/app/ui.tsx:401`, state `App.tsx:854-898`, `toastTiming.ts`                                                           | Toast queue                      |
| Undo trash `src/pages/pageTrash.ts:17`                                                                                          | PM-64/141                        |
| Attention banner `src/app/attention/AttentionBanner.tsx:137`                                                                    | Banner                           |
| Confirm `src/app/ui.tsx:486`, Choice `:635`, Name sheet `app/NameSheet.tsx:15`                                                  | Dialog set                       |
| Lasso menu sheet `src/ink/LassoMenuSheet.tsx:17`, Mixed menu `MixedMenu.tsx:24`                                                 | Strip / Object bar               |
| Popups `src/app/popups.ts:28-166`                                                                                               | Overlay manager                  |
| z-index tokens `src/index.css:22-28`, hard-coded `:892`                                                                         | Overlay layer order              |

## Edge cases

- Long-press on a word in a table cell → strip with cell items; "/" in a cell → PM-05.
- Paste of 10,000+ lines → appears with a done toast; one Undo.
- Two strips cannot open; a strip open while the keyboard rises stays clamped 12 px inside the visual viewport.
- Pencil long-press while drawing with Pen → no strip (gesture router: drawing owns the touch).

## Security check

Pasted HTML cleaned as before; My blocks and template names escaped, max 40 characters; Clean up with AI never sends before consent and cost; no new network calls.

## Won't do

- Comments between people; slash commands that call paid AI without the consent step; new block types.
- Removing the paste chooser (kept as "Always ask").

## Build order (one surface group per commit)

1. **12a Shared parts**: `src/design/parts/{ContextStrip,CommandList,Sheet,Dialog,ToastQueue,Banner}.tsx` + gallery entries; overlay hooks in `src/app/overlay/`.
2. **12b "/" menu (W1)**: `src/editor/v2/slashCommandList.tsx`, `src/editor/v2/slashItems.ts`.
3. **12c Long-press strip (W2)**: `src/editor/v2/pageStrip.tsx`, `src/app/rows/rowStrip.ts`.
4. **12d Paste (W3)**: `src/editor/v2/pasteMenu.tsx`, `src/settings/pasteAsSetting.ts` (reuses `pasteFlow.ts` untouched).
5. **12e Page ⋯ sheet (W5)**: `src/pages/v2/PageSheet.tsx`, `src/pages/v2/pageActions.ts`.
6. **12f Block handle (W8)**: `src/editor/v2/BlockHandle.tsx`.
7. **12g Start card + templates (W9–W11)**: `src/templates/v2/*`.
8. **12h Breadcrumb + tabs (W12–W14)**: `src/pages/v2/PagePathV2.tsx`, `src/app/summary/v2/PageTabsV2.tsx`.
9. **12i Stars + My blocks**: `src/editor/v2/myBlocks.ts`, `src/editor/v2/slashStars.ts`.

## Tests

- Unit: each shared part (open / close / clamp / queue rules), slash filter and recent, paste default and setting, my-blocks save / insert.
- E2E: one per PM line, Chromium + `ipad-webkit`.
- Screenshots: Beginner / Professional × light / dark × iPad landscape / portrait / phone / PC, plus the Parts gallery.
- Nothing lost: probes from the table above.
- Accessibility (roles menu / dialog / status, focus order), size budget (parts lazy-loaded).

## Owner iPad check (3 steps)

1. Long-press a word: the strip shows above it, not over the handles; Paste ▾ shows the formats; paste something from Safari and it keeps its look.
2. Type "/" on an empty line, type "tab", press Enter: a table appears; tap Show all and see every group.
3. Tap the page ⋯: the side sheet opens at full height; delete a test page and tap Undo.

## Decisions to review

1. New unlock switch ids (not yet in `pro-features.md`): `page.slashStars`, `page.myBlocks`, `page.contextMore`, `page.pastedChip`, `page.menuAll`, `page.blockMenuMore`, `page.breadcrumbMore`. This slice adds them.
2. "Always ask" kept in Settings "Paste as" so today's chooser is not dropped.
3. Clean up with AI sits inside Paste ▾ (it was the chooser's 4th row).
4. Start card: shown until "Always start with…" is picked (Fable's pick; owner question 6 still open).
5. Beginner "/" short list: the 12 items listed in PM-01.
6. Long-press time 0.5 s default, following `advanced.holdMenu` when set.
7. The strip order follows menu-1.png (Paste first); Delete stays last in red.
