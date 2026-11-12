# Home v2: the build-it-yourself dashboard (slice 5, flag `home.v2`)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

Sources: mock `docs/mockups/home-mock-v2.html` (cited as HOME line), PENDING "Home dashboard mock: APPROVED" 1-7 and the live-reflow note above it, carry-over "ADD the Pending items card", `settings-home-open-comments.md` H-a to H-p, `mock-feedback-2026-11-11.md` H1-H7, answers, dashboard answers, HT1-HT6, round 2. Parts: [shared-parts.md](shared-parts.md) (SP-xx, SH-xx). The cockpit it builds on: [home.md](home.md) (stays true; this spec changes the screen, not the data).

## Purpose

### Plain-words summary

Home becomes a page of cards (boxes) that you arrange yourself. Each card does one job: Top 3, Tasks, Pending items, Timer, Daily Highlight and more. Tap **Edit** to move, resize, add or delete cards. Drag a card and the others slide out of the way while you drag, so you see the result before you let go. A bar at the top, "Show: Today / This week / This month", sets the time range for every card that uses one. You can build your own bar. A new card, **Pending items**, shows what is overdue and what is still open. Nothing you have today is removed: tasks, plan, routines, reports, timer, evening review and briefing all keep working.

### Flag

`home.v2`. OFF = today's Home exactly (`src/home/HomeScreen.tsx`, tabs Today / Tasks / Plan / Routines / Reports). ON = this spec. Data tables are the same either way, so switching the flag back loses nothing. Layout data is new (key `home.layouts`, see HM-B60) and is ignored when OFF.

### Unlock switches used (exact ids from `docs/mockups/pro-features.md`)

| id               | Name            | What it unlocks here                                                                     |
| ---------------- | --------------- | ---------------------------------------------------------------------------------------- |
| `home.cardSizes` | Wide card sizes | Sizes M and L for any card (Beginner: the card's own default size, and S)                |
| `home.builtFrom` | Built from      | The "Where this comes from" pop-up (card header icon, ⋯ menu row, and "all" row in More) |

The Time range builder is **not** Professional here (owner round 2: "Edit period bar visible for all"). See Decisions D1.

## How it works

### Screen map

Top bar (shell SH-04): Back/Forward, crumbs "Home › {dashboard} · {page}", **Undo / Redo (always visible, SH-05)**, template gallery button, **Edit** button. There is **no Done in the top bar** (PENDING 1, H-k). Under it: dashboard tabs (SP-03, last tab "+ Template", a "More" button at the start), then the sub-bar: **Time range bar** (SP-10), the "Words" button, "Edit time range", and the range line. Then the card grid (HOME 1729-1743). While editing, a sticky Edit bar sits above the grid (HOME 1834-1860).

The old tabs Tasks, Plan, Routines, Reports remain as full screens opened from their cards ("Open") and from More › "Home sections". They reuse today's components unchanged (see Nothing lost). Reason: owner H7 "Tasks/Plan/Routines/Reports tabs ✓" and "never drop a feature".

### Cards (registry; each = id, name, icon, group, default size, sizes allowed, "where this comes from" text)

First build ships these, taken from HOME 6106-7560 and today's `src/home/`:

| Card id                                                           | Name                               | Default | Group           | Data (existing tables)                           |
| ----------------------------------------------------------------- | ---------------------------------- | ------- | --------------- | ------------------------------------------------ |
| `top3`                                                            | Top 3                              | M       | Planner         | tasks (`top3Day`)                                |
| `tasks`                                                           | Tasks                              | L       | Planner         | tasks                                            |
| `pending`                                                         | Pending items (new)                | M       | Planner         | tasks                                            |
| `blocks`                                                          | Time blocks (Plan)                 | L       | Planner         | dayPlans                                         |
| `timer`                                                           | Timer                              | M       | Planner         | timeEntries, projects                            |
| `routines`                                                        | Routines                           | M       | Planner         | habits, habitChecks                              |
| `briefing`                                                        | Briefing                           | M       | Planner         | briefing.ts                                      |
| `due`                                                             | Cards due                          | S       | Summary         | recall cards                                     |
| `record`                                                          | Day record (open / done / carried) | S       | Summary         | dayRecord                                        |
| `evening`                                                         | Evening review                     | M       | Planner         | tasks, journal                                   |
| `hl`                                                              | Daily Highlight                    | M       | General         | highlight sources (own spec: Highlight settings) |
| `kfocus` `ktasks` `kstreak` `kwtasks` `kwhours` `kybest` `kydays` | Summary tiles (numbers + streaks)  | S       | Summary         | timeEntries, tasks, habitChecks                  |
| `wcal` `whours` `rheat` `ycal` `yline` `ygoals`                   | Week and Year cards                | L / M   | Planner         | as in HOME 6628-6928                             |
| Learning and Money cards (`lring` ... `fadd`)                     | HOME 6929-7560                     | as mock | Learning, Money | databases (spec `dashboards.md`)                 |

Every card is a registry entry, never a hard-wired block. A card has a Small tile (S) and a body (M, L). A card never shows explanations inside itself.

### Default layouts (templates)

- **Beginner first run** (owner pick "Beginner 4 cards"): Planner › Today shows **Top 3, Tasks, Pending items, Daily Highlight**. All other cards are one tap away in "Add a card". Professional and users who already used Home get the full Planner set (HOME 7587-7620) with the old tabs' content as cards.
- Planner pages **Today / Week / Year** follow the time range (HOME 7710-7715): a one-day range shows Today, up to 31 days Week, longer Year.
- Other built-in templates (Learning tracker, Finance, Blank, imported): sub-slice 5f, same grid.

## Sizes, spacing, motion (from the mock)

| Item              | Value                                                                   | HOME line              |
| ----------------- | ----------------------------------------------------------------------- | ---------------------- |
| Grid columns      | 2 (phone, iPad portrait), 4 from 860 px wide (iPad landscape, PC)       | 1729-1740              |
| Row height        | 184 px (`--row`); preview thumbnails 150                                | 1674, 1742             |
| Gap               | 12 px                                                                   | 1734                   |
| Card              | surface-1, 1 px line, radius 16, overflow hidden                        | 1745-1758              |
| Sizes             | S 1x1, M 2x1, L 2x2 (cells)                                             | 1760-1769              |
| Card header       | min 40 high, padding 4 2 0 12, icon 17, title 13/600 ink-soft, ellipsis | 1770-1797              |
| Card body         | padding 0 12 10, scrolls inside, thin scrollbar                         | 1798-1806              |
| Edit outline      | 1.5 px dashed `--line-strong`, body 55% opaque and not clickable        | 1811-1822              |
| Edit bar          | sticky top 0, z 7, padding 10 12, accent-soft, 1 px accent, elev-2      | 1834-1860              |
| Done button       | `.btn.lg`: min 48 high, padding 0 26, 16/700, elev-2                    | 1862-1869              |
| Delete button     | red `#d92d20`, white, 700, min 36 high, shows only in Edit              | 1870-1880, 1883-1890   |
| Lifted card       | scale 1.02, elev-3, 92% opacity, no transitions, pointer events off     | 1906-1912, 3087        |
| Drop line (lists) | 3 px accent, 7 px end dots                                              | 3041-3070              |
| Add card tile     | dashed 1.5 px, accent text, hover accent-soft                           | 1913-1928              |
| Durations         | 120 / 180 / 240 ms, `--ease-out` cubic-bezier(.2,.8,.2,1)               | 48-51                  |
| Reflow slide      | 160 ms (SP-06)                                                          | shared-parts SP-06     |
| Size change       | 180 ms (new; grid-column/row animate by FLIP)                           | new, follows `--dur-2` |

Reduced motion: all transitions 0.01 ms (HOME 1146-1155); reflow jumps, the drop landing outline still shows.

## When I do X → Y (each line = one e2e test)

Flag `home.v2` ON for all. "Beginner" = default view. "Professional" lines name their switch; test with the switch ON and OFF.

### Opening and the edit bar

- **HM-B01** I open Home → I see the dashboard tabs, the Time range bar, then cards. The top bar shows Undo, Redo and **Edit**; there is no Done button in the top bar.
- **HM-B02** I tap **Edit** → the top bar still has no Done. A sticky bar appears with the text "Editing the layout. Drag any box to move it. Tap the three dots for the size. Cancel throws away every change." and three buttons: **Cancel**, **Reset**, **Done** (48 high, accent, clearly the biggest).
- **HM-B03** In edit mode every card shows a dashed outline, a 6-dot grip, a red **Delete** button and a ⋯ button; the card's text and buttons inside do nothing.
- **HM-B04** In edit mode I press and drag across card text → no text is selected, no selection handles or callout appear (H-a); same on iPad with finger and Pencil.
- **HM-B05** I tap **Done** → edit mode ends, layout is kept, toast "Layout saved on this device".
- **HM-B06** I change things, tap **Cancel** → a small dialog "Discard all changes?" (Discard / Keep editing, ✕). Discard restores the layout from before Edit and leaves edit mode. Keep editing closes the dialog.
- **HM-B07** I tap **Reset** → the page returns to the template's layout; one Undo step "Layout reset"; Undo brings my layout back.
- **HM-B08** I press Esc in edit mode with no dialog open → nothing is lost; focus stays on Edit bar (Esc never discards silently).
- **HM-B09** I tap red **Delete** on a card → the card goes at once, toast "{Card} removed" with Undo (6 s). Undo restores it in the same place and size.
- **HM-B10** I delete the last card → the page shows "This page is empty. Tap Edit, then Add a card." and the Add tile.

### Drag and live reflow

- **HM-B11** (edit mode) I press the grip of a card and move 4 px → the card lifts (scale 1.02, shadow) and follows my pointer; the other cards slide (160 ms) to the layout they would have if I let go now.
- **HM-B12** I hold a card anywhere on its body (not a button) for 0.3 s in edit mode → it lifts the same way; moving over 8 px before 0.3 s scrolls the page instead.
- **HM-B13** I drag a wide (M) card between two small (S) cards → the small ones wrap (one goes to the next row), the wide card shows landing exactly there; on release it stays there (H-m, PENDING 3).
- **HM-B14** I drag a card to a spot where it cannot fit (for example M starting in the last column) → that spot is not offered; the preview snaps to the nearest spot that fits; release lands there (PENDING 3).
- **HM-B15** I drag and release outside the grid → the card returns to its old place, toast "Couldn't move it there"; the card never disappears (PENDING 4).
- **HM-B16** I press Esc during a drag → card returns, nothing changed.
- **HM-B17** During a drag the page auto-scrolls near the top and bottom edges (50 px zone, 12 px per step) and no tap, menu or toolbar reacts until I drop.
- **HM-B18** I let go → one history step "Moved {card}" (Undo / Redo work); toast has Undo.
- **HM-B19** I use ⋯ › **Move earlier** / **Move later** → the card moves one place with the same slide; first/last item disables the matching row. Keyboard: with the grip focused, Alt+↑ / Alt+↓ do the same.
- **HM-B20** The grip is a button "Drag {card} to reorder"; the live region says "{card} moved to place 3 of 9".

### Size

- **HM-B21** I tap ⋯ on a card → a pop menu shows **Size** with a segmented control, the current size highlighted (selected state visible), then Move earlier, Move later, Remove. Beginner shows the card's default size and **S** only. (Professional with `home.cardSizes`: see HM-P01.)
- **HM-B22** I pick another size → the menu stays open with the new choice highlighted, the card animates to the new size in 180 ms, the others reflow. The card is still there (H-n, PENDING 4). The size is remembered per device class (HM-B61).
- **HM-B23** I pick a size that needs room → the grid makes room; if a size cannot fit anywhere the segment is disabled with the note "No room on this row". The card never vanishes in any case.
- **HM-B24** I tap **Remove** in the ⋯ menu → same as Delete (HM-B09).
- **HM-B25** I tap **Add a card** (dashed tile, last in the grid, edit mode only) → a sheet (More sheet 440, SH-09) "Add a card" with tabs Planner / Learning / Money / Summary / General, each card with a one-line description and **Add**. A card already on the page shows a quiet tag "on page" (adding twice is allowed).
- **HM-B26** I tap **Add** → the card appears at the end, scrolled into view, with a short highlight; the sheet stays open; ✕ closes it.

### Top 3

- **HM-B27** I tap a Top 3 row's circle → it is ticked and **stays** in Top 3 (struck through); tapping again unticks. Only ✕ removes it from Top 3 (H4). The task itself stays in Tasks.
- **HM-B28** I tap ✕ on a Top 3 row → the task leaves Top 3, stays open in Tasks; toast with Undo.
- **HM-B29** I have three items and press **+ Add to Top 3** → disabled with "Top 3 is full" (a fourth is refused, never swapped).
- **HM-B30** I drag a Top 3 row by its grip → the row lifts, a **drop-line** (3 px accent) shows the place, the others do not jump; on release the order is saved (HT3, H-e).
- **HM-B31** I tap ▲ or ▼ on a Top 3 row → it moves one place; first ▲ and last ▼ are disabled; focus stays on the same row, which flashes (700 ms).
- **HM-B32** Alt+↑ / Alt+↓ on a focused Top 3 row moves it (HOME 10600-10614).
- **HM-B33** Top 3 has a second grip in its header (outside Edit): dragging it moves the **whole card** to another place on Home with live reflow and a toast with Undo (round 2: "reorder tasks AND move the whole card"). In Edit mode this grip is hidden (the normal card grip does it).
- **HM-B34** Top 3 card at size S shows "2/3 Top 3 done" and a progress bar; tapping opens the M view.

### Pending items card (new, carry-over)

- **HM-B35** I add the card → it shows tasks that need me. **Overdue** = open tasks whose planned day is before today (today follows "Day starts at"). **Open** = open tasks planned for today or with no day, not in the Drop box, not in the future. Done, soft-deleted and future-planned tasks are never counted. A task that is in both Top 3 and Pending shows in both.
- **HM-B36** Size S: two big numbers "3 overdue" (red when above 0) and "7 open", nothing else; tap anywhere opens the full Tasks screen.
- **HM-B37** Size M: header counts, then up to 5 rows, overdue first (oldest planned day first, a red "2 days late"), then open tasks in the Tasks order. Each row: circle, title, project tag. If more exist: "+ 9 more" opens the Tasks screen. Size L: up to 12 rows in two groups, "Overdue" and "Open", plus a quick-add field (same as Tasks, day words work).
- **HM-B38** I tap a row's circle → task done, row fades out (180 ms), counts drop, toast with Undo. Linked note checklists tick too (existing behaviour).
- **HM-B39** I tap a row's title → the full Tasks screen opens with that task highlighted for 1.5 s (a task from a note offers "Open note" in its ⋯ menu).
- **HM-B40** I tap ⋯ on an overdue row → menu **Move to today**, **Tomorrow**, **Pick a day**, **Add to Top 3**, **Delete** (existing TaskMenu items, same words). Moving it removes it from Overdue.
- **HM-B41** There are no open tasks → Empty state (SP-08): "Nothing pending. You're clear." with the button **Add a task**.
- **HM-B42** The card ignores the Time range bar (it is always "now"); its "Where this comes from" says so.
- **HM-B43** Counts above 99 show "99+". The card is correct offline and updates live after a sync. If reading fails: "Couldn't load tasks. Try again." with a **Try again** button.
- **HM-B44** Overdue rows have a red dot and the text "late" (not colour alone).

### Time range bar (SP-10)

- **HM-B45** I see "Show:" then a segmented bar (default for Planner: Today / Week / Year), the range line (for example "Mon 16 Nov" or "9 Nov – 15 Nov"), and quiet buttons **Words**, **Dates**, **Edit time range**. The word "Period" appears nowhere (PENDING 6, H-p).
- **HM-B46** I tap a preset → the selected thumb slides (280 ms), the range line updates, every card that follows the bar re-reads; cards that do not follow it (Pending items, Timer) stay.
- **HM-B47** I tap **Dates** → a date picker (small dialog, ✕): tap first day, then last day; **Done** is disabled until both are set; an end before the start shows "The last day must be after the first day"; Done adds/updates a "Custom" preset and selects it.
- **HM-B48** I tap **Edit time range** (visible in Beginner and Professional) → a dialog (SH-10) with: name of the bar (✕ clear), the list of choices (rename, ▲▼, ✕ remove, change dates for custom), an **Add** chips row (Today, This week, This month, Last month, This quarter, This year, Last 7 days, Last 30 days, Last 4 weeks, Custom range), and a footer **Reset**, **✕ Cancel**, **✓ Done** (H-d).
- **HM-B49** In that dialog I tap ✓ Done → the bar updates and one history step "Time range changed"; ✕ Cancel or Esc discards; Reset restores the template's bar. The last choice cannot be removed (✕ disabled).
- **HM-B50** I open the walkthrough "Build an Exam time bar" and tap "Build this example for me" → the name becomes "Exam time", Today and This week are added, and a custom range "Exam week" (30 Nov – 6 Dec) is added; each of the three steps gets a tick as it becomes true; Undo reverts it (H-f, HT4).
- **HM-B51** Each dashboard has its own bar. A bar is saved with "Save as template" and comes back on every dashboard made from it. In the Edit dialog, **Use on other dashboards** (a list with switches) copies the bar to them, so any template can have it (H-f).
- **HM-B52** There is no separate "This month" or "Period" control on any card; a card needing a range follows the bar (HT5).
- **HM-B53** I tap **Words** → a pop-up "What these words mean" explains Database, View, Chart, Formula, Rollup, Block in everyday words, with ✕ and Got it (HT6). It does not change the page behind it.

### Everyday behaviour

- **HM-B54** Every system text field on Home (quick add, new project, dashboard name, bar name, choice names, search in Add a card) shows ✕ when it has text; ✕ clears it and keeps focus; not shown inside note text (H-g, HT2, SP-04).
- **HM-B55** Undo and Redo are visible in the top bar on Home in edit and normal mode; Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z or Ctrl+Y work; they undo layout moves, size, add, delete, time range changes, Top 3 order. More › "Show Undo and Redo" can hide them on a PC only (never on phone or iPad) (H-b, HT1).
- **HM-B56** I switch dashboard tab → that dashboard's own layout and bar show; the choice is remembered on this device.
- **HM-B57** I tap **More** (first in the dashboard row) → More sheet (440): tabs Dashboard / Templates. Dashboard: Name (✕), Edit layout, Show Undo and Redo, Delete this dashboard (disabled when only one; Undo available), hint "Changes apply when you tap Done".
- **HM-B58** I tap **+ Template** → the template gallery (sub-slice 5f): cards with name, one line, tags; Preview with sample rows; Apply asks "Use existing or new?" for databases; one Undo. Export / import of `.lntemplate.json` per `dashboards.md`.
- **HM-B59** Timer card: **Start** with a project and Free or Focus; clock is now minus stored start (reload-safe); the chip beside "Now playing" shows on every screen; after 2 h "Still working?" (all as `home.md`, unchanged).
- **HM-B60** I reload the page → the same dashboards, pages, layouts, sizes, bars come back. Layout store: key `home.layouts` = `{dashboardId: {device: 'phone'|'tablet'|'desktop', page, cards: [{id, type, size}]}}`.
- **HM-B61** Layouts and sizes are per device class: making Top 3 L on the iPad does not change the phone (dashboard answer Q1). A device with no layout of its own starts from the template.
- **HM-B62** In Edit I press the grip on a card on an iPhone with a finger → it drags; the page does not scroll; text is not selected; on release a light haptic is fired where supported.

### Plain words and the "where this comes from" pop-up

- **HM-B63** All explanations on Home use everyday words, one idea per line, and are **identical** in Beginner and Professional (Pro only adds detail lines). No "source, filter, aggregate". Test: a word-list check on the Home strings (H-p).
- **HM-B64** No card ever swaps its content to show an explanation (PENDING 5). In Beginner there is no "Where this comes from" anywhere; the ⋯ menu and header show none.
- **HM-P01** (`home.cardSizes` ON) ⋯ › Size shows **S, M, L**; picking L makes the card 2x2 with the 180 ms animation and the selected size highlighted; M and L never remove the card. With the switch OFF the segments M/L are absent (Beginner: default size + S).
- **HM-P02** (`home.cardSizes` ON) a card saved at L, then the switch turned OFF → the card keeps its saved size (nothing shrinks silently) but the menu offers only default + S.
- **HM-P03** (`home.builtFrom` ON) every card bigger than S shows a layers icon button in its header ("Where this comes from"). Tap → a **separate pop-up** (SH-10), not inside the card: title "Where this comes from: {card}", rows Database / View / Chart / Formula with plain explanations, a section **How to build this** with numbered steps ending "Add a card on Home and pick what you made", and ✕, Esc and tap-outside to close.
- **HM-P04** (`home.builtFrom` ON) while the pop-up is open the card behind it is unchanged (same content, same size, no flip) (H-o).
- **HM-P05** (`home.builtFrom` ON) the ⋯ menu also has a **Where this comes from** row (also for S cards); it opens the same pop-up.
- **HM-P06** (`home.builtFrom` ON) More › "Where this comes from: all" opens ONE pop-up listing every card of the page with its parts and how to build it, same close rules. It is a button, not a persistent switch that rewrites cards.
- **HM-P07** (`home.builtFrom` OFF) none of header icon, ⋯ row, More row exists in the DOM.
- **HM-P08** (`home.builtFrom` ON, Professional view) the pop-up adds a "Formula text" line per card; all other words match Beginner exactly.
- **HM-P09** (`home.cardSizes` ON) in Edit mode the Add sheet lets me choose the size on adding (default pre-selected).

## Shared parts used

tokens · Card ▾ frame (the Add sheet and ⋯ menu use 304 picker/376 panel rules; phone = bottom sheet) · Tab row (dashboard tabs, Add tabs) · ✕ field · Drag (drop-line + ▲▼, live reflow) with `fit` for the grid · Arrange sheet (not used; Home edit is on the page) · Empty state · Time range bar (SP-10) · Object bar (not used). Shell: rail, top bar, Undo/Redo (SH-05), More sheet 440, small dialog, pop menu, toast, minimise chip (Timer chip stays). Tag picker is not used on Home (task project tag stays as today).

No private copies. **New shared part needed:** a small `GridReflow` helper (pure function `layoutGrid(cards, cols)` → cells + `fits(card, index)`) sits inside SP-06's `fit` hook, not a second drag part. See D5.

## States

| State                | What shows                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty page           | Hint text + dashed Add tile in Edit; Empty state (SP-08) outside Edit with button **Edit**                                                                  |
| Card empty           | Each card has its own Empty state line (for example Top 3: "Pick up to three things that matter today" + **+ Add to Top 3**)                                |
| Loading              | Card keeps its size, skeleton lines only after 150 ms (no layout jump)                                                                                      |
| Error                | Per card: "Couldn't load {card}. Try again." + button; one broken card never blocks the others                                                              |
| Offline              | Everything local works; cards reading synced data show a quiet "Offline" tag when stale; nothing is blocked                                                 |
| Phone (≤640)         | 2 columns, S tiles side by side, M full width, L full width and 2 rows; Edit bar wraps, Done stays 48 high; sheets are bottom sheets; tab bar replaces rail |
| iPad portrait        | 2 columns (width < 860); rail visible                                                                                                                       |
| iPad landscape / PC  | 4 columns                                                                                                                                                   |
| Dark / light / sepia | Only tokens; the red Delete and late dot keep contrast 4.5:1 in all three                                                                                   |
| Reduced motion       | No slide, no scale; drop landing outline and drop-line stay; size change is instant                                                                         |
| Edit + offline/error | Edit works fully offline; Save is local                                                                                                                     |
| Large text / RTL     | Titles ellipsis; grips and ▲▼ mirror in RTL; nothing clipped at 200% text                                                                                   |

## Edge cases

- A card whose type is removed in a later version stays as a "Card unavailable" tile with Remove; never silently dropped.
- Dragging a card while a Timer runs does not stop the timer. Deleting the Timer card does not stop a running timer (the chip stays).
- Two devices editing the layout: last edit per device class wins (layouts are per device class, so they rarely meet). Sync: later, record-merge by `updatedAt`.
- Day rolls over while Home is open: Pending, Top 3 and Briefing refresh at the day-start hour without reload.
- A hidden Home space (`general.space.home`) hides the screen; layouts stay.
- Rapid taps on a size segment cancel the earlier animation; the last tap wins.
- Pointer lost during a drag: gesture ends by itself in 4 s and the card returns (SP-06).
- Layout with 100+ cards: the grid virtualises cards below the fold; drag still works (auto-scroll).
- Bar with 12+ choices scrolls sideways inside its box (hidden scrollbar + thin track).

## Nothing lost (today's Home in `src/` → new place)

| Today (file:line)                                                                                                                                                                                                                   | New place                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `HomeScreen.tsx:24` tabs today/tasks/plan/routines/reports; `:52` `usePref('home.tab')`; `:111-123` tab strip                                                                                                                       | Dashboard tabs + card "Open" links + More › Home sections; `home.tab` read once to choose the first dashboard page         |
| `HomeScreen.tsx:107` date label                                                                                                                                                                                                     | Top bar crumb + range line                                                                                                 |
| `HomeScreen.tsx:129` `DueTile` (cards due, opens Review)                                                                                                                                                                            | `due` card (S), tap opens Review                                                                                           |
| `HomeScreen.tsx:131` `BriefingCard` (`BriefingCard.tsx:18-39` Top 3 left, tasks today, habits left, carried; `:53-64` cards due link; `:69-75` missed habits red cross)                                                             | `briefing` card, same lines                                                                                                |
| `HomeScreen.tsx:135-139` "Today's journal" button (`openToday`)                                                                                                                                                                     | Button row inside the `briefing` card, plus ⋯ menu                                                                         |
| `HomeScreen.tsx:141`, `Top3.tsx:24-187` Top 3: tick (`:90`), ✕ (`:116`), "1 of 3" (`:66`), picker (`:127-160`), full toast (`:52`), yesterday's marks (`:166-175`)                                                                  | `top3` card; tick-stays, ✕, picker, yesterday strip all kept; adds grip, ▲▼                                                |
| `HomeScreen.tsx:142`, `TimerCard.tsx:25-193` Start/Stop (`:115`), project select (`:125-134`), Free/Focus radios (`:143-157`), Focus lengths (`:164`), Wake Lock (`:65`)                                                            | `timer` card (M), same controls                                                                                            |
| `TimerChip.tsx:38-176` chip on every screen (`:80`), Stop (`:111`), "Still working?" (`:120-168`)                                                                                                                                   | Unchanged shell chip                                                                                                       |
| `HomeScreen.tsx:143`, `EveningReview.tsx:34-207` after-time (`:92`), Start now (`:106`), summary (`:116`), per-task choices (`:124-165`), prompts (`:176-190`), save to journal (`:197`)                                            | `evening` card (M); opens a dialog for the long form                                                                       |
| `HomeScreen.tsx:151-166` record counts open/done/carried; `:164` empty line                                                                                                                                                         | `record` card (S)                                                                                                          |
| `HomeScreen.tsx:169`, `TasksTab.tsx:44-365` inbox + quick add (`:187-220`), matrix with drag (`:225-245`, `useTaskDrag.ts:28`), upcoming (`:247`), completed + older (`:265-290`), projects + filter chips (`:159-185`, `:293-350`) | `tasks` card (list + quick add) and full **Tasks screen** (unchanged component) via Open                                   |
| `TaskMenu.tsx:37-221` Move to box (`:72`), Tomorrow (`:93`), Pick a day (`:101`), Move to list (`:111`), Project (`:119`), Open note (`:128`), Delete (`:137`)                                                                      | Same menu, reused by Tasks and Pending rows                                                                                |
| `TaskRow.tsx:16-125` title drag, "…" menu, today / from-note / carried-n tags (`:90-96`)                                                                                                                                            | Same row component                                                                                                         |
| `core/taskService.ts` (`setTop3` `:422`, `top3Marks` `:449`, `dayRecord` `:390`, `upcomingByDay` `:372`, `bucketTasks` `:358`)                                                                                                      | Same services; Pending uses `listTasks` + a new pure `pendingOf(tasks, today)`                                             |
| `HomeScreen.tsx:179`, `PlanTab.tsx:41-314` day nav (`:99-113`), task list + "Add at" (`:121-160`), timeline 05:00 on (`:20`, `:165-245`), block buttons, free block (`:252-298`), 15 min snap (`planService.ts:13`)                 | `blocks` card (L) and full **Plan screen**; plus the mock's duration slider (H3) in the block editor                       |
| `HomeScreen.tsx:182`, `Routines.tsx:281-439` Morning/Night/Daily lists (`:33`), 7-day strip (`:45-80`), add habit (`:413-429`), delete + Undo (`:386-392`), no-reminders note (`:436`)                                              | `routines` card and full **Routines screen**                                                                               |
| `Routines.tsx:84-146` affirmation Play/Stop; `:148-275` add affirmation, page, recording                                                                                                                                            | Same, inside Routines screen and card                                                                                      |
| `HomeScreen.tsx:185`, `ReportsTab.tsx:65-178` Today/Week control (`:74`, `:102-117`), hours per project (`:119-152`), plan vs tracked timeline (`:155-173`)                                                                         | `whours` / reports cards and full **Reports screen**; its Today/Week control becomes the Time range bar (SP-10)            |
| `App.tsx:1951` `writePref('home.tab','tasks')` (Search › Tasks opens Home › Tasks); `search/TaskResults.tsx`                                                                                                                        | Opens the Tasks screen; same behaviour                                                                                     |
| `HomeScreen.tsx:130-142` deps (`openToday`, `openPage`, `countCardsDue`, `openReview`, `appendJournal`)                                                                                                                             | Same `HomeDeps`, passed to cards                                                                                           |
| `App.tsx:1870` `HomeScreenSwitch`, `:2025` `TimerChip`                                                                                                                                                                              | Flag switch picks old or new screen                                                                                        |
| `home/briefing.ts`, `habitService.ts`, `timerService.ts`, `planService.ts`, `reports.ts`, `quickAdd.ts`, `affirm.ts`, `beep.ts`, `dayLabel.ts`, `timeLabel.ts`                                                                      | Unchanged, pure, reused by cards                                                                                           |
| Not in today's Home, in the mock (new)                                                                                                                                                                                              | Daily Highlight, Summary tiles, Week/Year cards, Learning and Money cards, templates, Pending items (see Decisions D2, D6) |

Probe test: for each row above, a Playwright check finds the control by its existing `data-testid` or role in the new Home (flag ON) and exercises it once.

## Won't do

- Free-form canvas placing at any pixel (grid only; owner pick Q1).
- Click-a-chart-to-filter-others (cross-filter): later.
- Reminders or notifications for tasks (web cannot).
- AI-written highlights or summaries (cost approval first).
- A third-party chart library; charts use the existing Dashboard view charts.
- Sharing templates by public link (needs sync and owner OK).
- Editing the Daily Highlight engine here (own spec).
- Work/Life split (owner Q5: personal only).

## Security check

- Layout, bar, size values are validated on load against a schema (known card types, sizes S/M/L, page ids, max 60 cards per page, names max 24 characters for choices, 60 for dashboards); unknown values fall back to template.
- Imported `.lntemplate.json`: data only, no code, 2 MB cap, schema check, ids remapped (per `dashboards.md`).
- Names are rendered as text, never as HTML. No new network access, no new dependency, no new permission. Deletes of tasks stay soft with Undo.
- The pop-up text is static strings, not user HTML.

## Tests

Unit (Vitest):

- `layoutGrid(cards, cols)`: placement for 2 and 4 columns, S/M/L, dense flow; `fits` and nearest-fit snap; wide-between-small; never loses a card (property test, 500 random layouts).
- `pendingOf`: overdue, open, Drop box, future, done, deleted, day-start boundary (at 03:59 vs 04:01), 99+ cap, ordering.
- `timeRange.ts`: every preset incl. week starts Monday, custom swapped ends rejected.
- Layout store: per device class, schema fallback, Reset, Cancel snapshot.
- Plain-words list: banned words absent from Home strings; Beginner string set equals Professional set (except Pro detail lines).

E2E (chromium and ipad-webkit), one per id above: HM-B01 to HM-B64, HM-P01 to HM-P09. Notes: drag tests use real pointer events (mouse for chromium, touch for ipad-webkit); reduced-motion run repeats HM-B11, B13, B22; HM-B04 checks `getSelection().toString() === ''` after dragging across text.

Screenshots (Beginner / Professional x light / dark x iPad landscape / iPad portrait / phone / PC): Home normal, Edit mode, drag mid-flight with reflow, Pending items S/M/L and empty, Time range dialog, Where this comes from pop-up (Pro), Add sheet. Sepia on Beginner PC only.

A11y: axe on each screenshot state; grips and ▲▼ are buttons with names; the Edit bar is a labelled region; the drag has a keyboard route (Alt+arrows, Move earlier/later) and a screen reader announcement; targets 44 pt (Done 48); colour is never the only signal for Overdue; focus returns to the opener when a dialog closes.

Size budget: Home chunk (lazy) grows by at most 25 KB gzip over today; first paint of Home under 150 ms with 20 cards on a mid iPad; drag runs at 60 fps with 40 cards (perf test using `performance.now` frames).

Nothing-lost probe: the table above, automated (see its last line). Also: with `home.v2` OFF the old Home passes the existing `e2e/home*.spec.ts` unchanged.

## Sub-slice build order (one surface group per commit)

| #   | Commit                                                                                                                                     | Files owned (proposed)                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 5a  | Card registry, `layoutGrid`, layout store, grid render, flag switch                                                                        | `src/home/v2/registry.ts`, `layoutGrid.ts`, `layoutStore.ts`, `HomeV2.tsx`, `Grid.tsx` |
| 5b  | Edit mode: Edit bar, Cancel / Reset / Done, Delete, no top-bar Done, selection lock                                                        | `src/home/v2/EditBar.tsx`, `useEditSnapshot.ts`                                        |
| 5c  | Live reflow drag using SP-06 `fit`, wide-between-small, snap, size menu + animation, Add sheet                                             | `src/home/v2/useGridDrag.ts`, `SizeMenu.tsx`, `AddCardSheet.tsx`                       |
| 5d  | Top 3 v2 (grip, ▲▼, card grip), Pending items card, ports of existing cards (Tasks, Timer, Routines, Briefing, Evening, Due, Record, Plan) | `src/home/v2/cards/*.tsx`, `pendingOf.ts`                                              |
| 5e  | Time range bar + builder + Words + Dates; ✕ fields; Undo/Redo wiring                                                                       | `src/home/v2/TimeRange*.tsx` (uses `design/parts/TimeRangeBar`)                        |
| 5f  | "Where this comes from" pop-up, `home.cardSizes` and `home.builtFrom` gates, More sheet                                                    | `src/home/v2/WhereFrom.tsx`, `MoreSheet.tsx`                                           |
| 5g  | Summary, Week/Year, Learning, Money cards and template gallery (depends on `dashboards.md`)                                                | `src/home/v2/cards/*`, `Gallery.tsx`                                                   |

Each commit ships behind `home.v2`, with its HM tests and screenshots.

## Owner iPad check (3 steps)

1. Open Home. Tap **Edit**. You should see a big blue **Done** bar at the top and no Done in the corner. Press and hold a box and drag it: the other boxes should slide away while you drag. Let go and it stays.
2. Tap the three dots on a box and pick a size. The box should grow or shrink smoothly and stay on screen. Add the **Pending items** box and check it shows what is late and what is open. Tick one.
3. Tap **Edit time range**. Build the "Exam time" example, tap the tick, and see the bar change. Then press Undo in the top bar. Last, in Top 3 drag a task by its dots and use the small arrows.

## Decisions to review

- **D1 Time range builder is for everyone.** shared-parts D6 proposed a Professional id `home.timeRangeBuilder`. The owner's round 2 says "Edit period bar visible for all". Pick: Beginner and Professional both get Edit time range; no new unlock id. Change shared-parts SP-10 and its SP-P06 line to match.
- **D2 Beginner sees 4 cards** (Top 3, Tasks, Pending items, Daily Highlight) as the owner's earlier pick; the rest is in "Add a card". Existing users keep all current features as cards. The mock's Planner has 9 cards in every view; this is a choice.
- **D3 Sizes in Beginner.** `pro-features.md` says M and L are Pro, the mock shows S/M/L to everyone. Pick: Beginner = default size and S, Pro = S/M/L. A saved bigger size is never shrunk if the switch goes off.
- **D4 Old tabs stay as full screens** (Tasks, Plan, Routines, Reports) opened from cards, since the mock's cards are summaries (no matrix, no upcoming, no projects). Dropping them would lose features.
- **D5 Grid logic.** The mock's drag (HOME 10640-10710) only shows a drop line and reorders on release; live reflow, wide-between-small and snap are new. Pick: order-based dense grid (`layoutGrid`) so layouts stay simple to save; a hole larger than one cell is "impossible".
- **D6 Pending items rules.** Not in the mock. Pick: overdue = planned before today; open = today or no day; Drop box and future excluded; ignores the time range; tap row = title opens Tasks, circle ticks. Ask the owner on first build (PENDING 7 said "ask the owner when building"), keep these as the default.
- **D7 Layouts per device class** (phone / tablet / desktop), not synced yet. Matches "different per device"; sync later with the rest.
- **D8 Continue row** (H7 "Continue as a sideways row") is not in the Home mock or today's Home; it belongs to Library/Notebooks. Not built here. Add as a card later if the owner wants it on Home.
- **D9 "Use on other dashboards"** (copy a bar to other dashboards, H-f "add the bar to any template") is not drawn in the mock; the row in the bar dialog is my proposal.
- **D10 Cancel asks first** ("Discard all changes?") as in the mock (HOME 9169); Reset is undoable instead of asking.
- **D11 Delete confirm.** Delete removes at once with Undo (no dialog), because Undo is always visible.
- **D12 Wording** "Add a card" replaces the mock's "Add widget" / "widget" to match the owner's "box/card" words; Settings strings use "card" too.

## First build (slice 5): When lines

The first cut is described in [../plans/home-v2-spec.md](../plans/home-v2-spec.md) (six widgets, edit bar, shared reflow drag, S/M/L, source pop-up, Pending items). Its checks:

- When this applies: Home > Today, flag on -> I see the widgets as a board, plus an "Edit layout" button. Flag off -> the old stacked Today, unchanged.
- When I tap "Edit layout" -> an edit bar sticks to the top of the board with Done, Cancel and Reset; every widget shows a grip, its S / M / L control, ▲▼ and "Where this comes from". Text inside widgets cannot be selected while editing.
- When I drag a widget by its grip -> the other widgets slide out of the way live, so the final layout shows before I let go (shared grid drag, `ReorderList`).
- When I drop a wide widget (M or L) between small ones -> it lands exactly there; the small ones wrap to the next row.
- When I drop a widget where it cannot fit (it would leave a hole in a row, e.g. a full-row L after one S) -> it snaps to the nearest spot that fits, and that spot is what the live preview shows.
- When I use ▲ / ▼ or Alt+arrows on a widget -> it moves to the next spot that fits (same rule as drag).
- When I pick S, M or L on a widget -> its size changes with a short animation; the chosen size is marked (selected); the widget never disappears and keeps its place.
- When I tap "Where this comes from" on a widget -> a separate pop-up opens (top layer) with where the numbers come from, in plain words, and a "How to build this" line. The widget behind stays unchanged. I close it with ✕, Esc or a tap outside.
- When I tap Done -> the layout is saved on this device and edit mode ends. Cancel -> every change since I started editing is dropped. Reset -> the default order and sizes (still inside edit mode, so Cancel can undo it).
- When I reload the page -> my saved layout is back.
- When this applies: A widget with nothing to show (e.g. no cards due) -> still shown, with a calm one-line empty text. A widget is never hidden by size or data.
- When this applies: The Pending items widget -> lists overdue tasks first (planned before today, still open), then other open tasks, at most 5, with "N more" when there are more; the title shows the count; tapping a row's tick completes it. Dropped and done tasks are never listed. Nothing pending -> "Nothing pending."
- When this applies: Wording: every "Period" becomes "Time range"; "Built from" becomes "Where this comes from". Same words in Beginner and Professional.
- When this applies: There is no Done button in the top bar of Home (only the one on the edit bar).
