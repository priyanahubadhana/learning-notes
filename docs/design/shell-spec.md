# Shared app shell: one spec for every mock-up (U1, U2 · 12 Nov 2026)

Every mock pastes `shell.css` (top of its `<style>`) and `shell.js` (top of its `<script>`), and draws only its own screen inside `<main>`. Nothing in this list may be redefined by a mock. First user: `notebooks-mock-v2.html`.

Base: the approved `toolbar-mock-v4.html` (tokens, glass, rail sizes, accent chip) and the real app (`src/app/spaces/spaces.ts`, `SpaceStrip.tsx`, `TopBar.tsx`, `panel/LeftPanel.tsx`, `notebooks/Sidebar.tsx`).

## 1. Page skeleton (copy this)

```html
<div class="sh-wrap" id="app" data-mode="beg">
  <div class="sh-demo">
    title ·
    <div class="seg">
      <button data-sh-mode="beg">Beginner</button
      ><button data-sh-mode="pro">Professional</button>
    </div>
  </div>
  <div class="sh-shell">
    <nav class="sh-rail glass" id="sh-rail"></nav>
    <aside class="sh-side" id="sh-side"></aside>
    <!-- optional: the sidebar -->
    <aside class="sh-panel" id="sh-panel" data-state="hidden"></aside>
    <!-- optional: the left panel -->
    <div class="sh-main">
      <header class="sh-top" id="sh-top"></header>
      <main class="sh-scroll" id="main"></main>
    </div>
  </div>
</div>
<script>
  Shell.mount({ space: 'notebooks', due: 17, onSpace, onCorner, onChange })
</script>
```

The page itself never scrolls. Only `.sh-scroll`, `.sh-colscroll` and the sheet body scroll. The tab bar, scrim, sheet, dialog, pop menu, toast and chip dock are created by `shell.js`.

## 2. Rail (spaces)

| Item                       | Rule                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Order, top to bottom       | brand mark "L" · **Home · Library · Notebooks · Review** · (space) · **Day/Night** · **gear**                                                                       |
| Why this order             | It is the app's own order (`SPACES` in `spaces.ts`). Search is not a space: it lives in the top bar.                                                                |
| Size                       | 56 px wide, glass, radius 16. Buttons 44 × 44, icons 24, gap 4.                                                                                                     |
| Active                     | accent-soft fill + accent icon + a 3 px accent bar on the outer edge + `aria-current="page"`.                                                                       |
| Badge                      | Review shows the due count (accent pill, top right).                                                                                                                |
| Hidden spaces              | Home, Library and Review can be hidden in Settings. Notebooks always stays.                                                                                         |
| Day/Night button           | one tap flips Day ↔ Night (sun when dark, moon when light). Sepia is in the gear menu.                                                                              |
| Gear ("Settings and more") | one menu, same everywhere: Settings · Save & restore · Trash · Device mode · Help · Day / Night / Sepia.                                                            |
| Phone (≤ 640 px)           | the rail becomes a **bottom tab bar**: full width, attached to the bottom edge, 56 px + safe area, icon 22 + 10 px label, the four spaces + "More" (the gear menu). |

## 3. Top bar

One row, 52 px, flat (not glass), inside the main column. Left to right:

1. sidebar toggle (when the screen has a sidebar)
2. page-panel toggle (only while a notebook or book is open)
3. Back · Forward (36 px icons, 44 px hit area)
   3b. **Undo · Redo** (always visible, SH-05)
4. breadcrumbs (earlier crumbs are buttons, the last one is plain text, truncates with …)
5. "Saved" status (muted, only while editing)
6. Search (opens the search popup, Ctrl K), then the Beginner | Professional view toggle (SH-06; on a phone it moves to the screen's title row)
7. screen actions (max 3 icons; in a Professional view only if rare). "Done" (reader, drawing) goes last.

A screen's own title, tabs and More button sit in the content below, never in the top bar.

## 4. Sidebar and left panel

Two columns, both 288 px (owner: a bit bigger; the mock drew 264, see shared-parts D1), both `--surface-1` cards with a header, optional tabs, a scrolling body and an optional footer.

|             | Sidebar (`#sh-side`)                                                                                                                      | Left panel (`#sh-panel`)                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Holds       | what the current space lists (Notebooks: Today, Search, Review, Quick access, the notebook tree, Tags, Templates, Saved searches)         | what the open notebook or book holds                                                                           |
| Tabs        | none                                                                                                                                      | **Pages · Outline · Resources** (books add Annotations). "Audio" is gone: recordings are one kind of Resource. |
| Shown       | always, unless hidden with its toggle                                                                                                     | only while a notebook/book is open                                                                             |
| ≥ 1180 px   | docked                                                                                                                                    | docked while the page keeps 600 px, else opens over the page (page-width rule below)                           |
| 641–1179 px | docked while the page keeps 600 px; steps aside while the panel is docked; else collapses to the rail (its toggle opens it over the page) | docked while the page keeps 600 px, else opens over the page                                                   |
| ≤ 640 px    | drawer from the left (tap Notebooks in the tab bar, or its toggle)                                                                        | drawer from the left (its toggle)                                                                              |

- **Page-width rule (0h, 12 Nov 2026).** The page keeps a comfortable writing width of at least **600 px** (`MIN_PAGE_W`). Docked columns may take only what is left; the frame (12 px padding both sides), the 56 px rail and its gap are always paid first. Columns give way in this order, and the first that leaves 600 px wins: (1) sidebar and panel both docked (≥ 1180 only); (2) the sidebar steps aside and the panel docks (under 1180); (3) the **panel opens over the page** (overlay manager: Esc or a tap outside closes it; it starts right after the rail and **covers the docked sidebar, never the page**, so the page's own ✕ and bars stay reachable) and the sidebar stays docked; (4) the **sidebar collapses to the rail** (its toggle opens it over the page) and the panel docks if it fits, else opens over the page. A wider sidebar (resized up) gives way sooner. Example: iPad landscape 1180 with both open leaves 488 px, so the panel opens over the page and the page stays 788 px; iPad portrait 820 leaves 428 px with the sidebar docked, so the sidebar sits on the rail until opened.
- Overlay/drawer: 86 vw (max 320), scrim behind, tap outside or Esc closes.
- Pages: thumbnails (title + 3 lines + page number). The current page is highlighted and **centred** on open. Tap opens. Hold 0.3 s (or use the grip) and drag to reorder; a line shows the drop place; Undo toast. Keyboard: Alt + ↑/↓.
- Outline: the whole notebook; other pages folded to one line; the current heading is highlighted and kept **centred** while reading.
- Resources: This page / Notebook / Everywhere · kind chips (All, Images, Links, References, Notes, Audio, Files) · Add · Insert in the page.
- Sidebar group "Notebooks" has the one-click **Collapse all ⇄ Expand all** toggle (icon + words) and "+".

## 5. Floating bars and the minimise chip

| Thing                                       | Position                                                                                    | Rule                                                                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Floating bar                                | bottom centre of the main column, 16 px up (phone: 12 px above the tab bar)                 | glass pill, 44 px targets, at most one row, never over the top bar. Ends with a separator + the **minimise** button (arrow-to-edge icon).       |
| Tool bars under the top bar (editor/reader) | as approved in toolbar v4: a glass bar in its own gap above the page, options pill below it | unchanged; they use the same minimise button and chips. Drag by the grip, snap to left/right/bottom (v4 code).                                  |
| Minimise chip                               | right edge of the screen, starting 64 px below the top bar, stacked 8 px apart              | accent border + tint, 44 px high, chevron + icon + **label**, slides in 150 ms. Tap restores the bar. The choice is remembered (`ln-shell-v1`). |
| Content clearance                           | `.sh-scroll` keeps 84 px of bottom padding                                                  | nothing is ever hidden under a bar.                                                                                                             |

## 6. More: button, sheet, small dialogs

- **More button**: sliders icon + the word "More", accent-soft pill, the FIRST control of the screen's own row. One per screen.
- **More sheet** (N4): a fixed box. Wide screens: right edge, 12 px from top, bottom and right, 440 px wide. Phone: full width, from 8 px below the top to the bottom edge. **Its position and size never depend on the content.**
  - Fixed parts: header (icon, title, one-line subtitle, ✕) → **picker row** (N3: "All notebooks" + one tile per notebook, mini covers, scrolls sideways with a track) → section tabs (with a track) → footer (hint · Cancel · ✓ Done).
  - Only the body scrolls. Switching tab resets the body to the top; edits keep the scroll place.
  - Draft model: nothing changes until Done. Cancel, ✕, Esc or a tap outside discards.
  - The page stays visible beside the sheet on wide screens (live previews).
- **Pick on top, edit below** (N3) is the rule for every per-item settings screen: notebooks here; decks in Review; books in the reader; saved searches; dashboard tabs in Home.
- **Small dialogs** (name, confirm): centred, 420 px max, content-sized, Cancel + one action. Destructive action in danger red, with "You can undo this."
- **Pop menus**: anchored to their button, 44 px rows, icon + words, danger last after a divider.

## 7. Toasts

Bottom centre, pill, one at a time, 24 px up (above the tab bar on phones, above a visible floating bar). 2.6 s; 6 s with **Undo**. Only for errors, Undo, or actions whose result is not on screen. `role="status"`.

## 8. Tokens and rules

- Colours, radii, motion: the app's `src/design/tokens.css` values, as in toolbar v4. Themes: Night (default), Day, Sepia, all three in every mock.
- Shell sizes (CSS variables): rail 56 · sidebar 288 · panel 288 · top bar 52 · tab bar 56 · sheet 440 · hit 44 · gap 12.
- Breakpoints: **640** (phone) and **1180** (room for sidebar + panel). No others for shell parts.
- Layers: tab bar 30 · floating bar 40 · chips 41 · drawer scrim 59 · drawers 60 · sheet scrim 79 · sheet 80 · dialog 85 · pop 86 · toast 90.
- Hit areas: 44 pt everywhere. A control drawn at 32–36 px carries an invisible extender (`::before`).
- Sideways rows: hidden scrollbar + the thin track under it (`Shell.track`).
- Modes: `data-mode="beg" | "pro"` on `.sh-wrap`; `.pro` hides in Beginner. Buttons use `data-sh-mode`. One saved key for mode, theme, icon option and minimised bars: `ln-shell-v1`.
- Motion 120/180/240 ms, ease-out; reduced motion and reduced transparency respected.

## 9. Icon set

One dictionary, `Shell.I`, Lucide geometry: 24 grid, 1.6 stroke, round caps, no fills. A mock adds its own names with `Object.assign(Shell.I, {...})` and never redraws a shared name. Shared names: home, sun, moon, gear, library, notebooks, review, sidebar, panel, back, fwd, chev, chevL, up, down, search, sliders, minim, x, check, plus, dots, grip, undo, save, trash, device, help, lock, star.

### Rail icons (U2). Home, sun/moon and gear are kept.

| Space               | Option A                                                           | Option B                             | Pick                                                                                                                               |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Library**         | Books standing on a shelf (two upright, one leaning, a shelf line) | Open book                            | **A (owner kept A).** A shelf says "a collection you read from". An open book looks like a notebook, which is the confusion today. |
| **Notebooks**       | Ring-bound notebook with a pencil                                  | Ring-bound notebook with ruled lines | **B (owner chose B, MF 114).** Ruled notebook; the pencil was judged busy.                                                         |
| **Review / Recall** | Two flashcards with a tick on the front one                        | Repeat arrows around a card          | **A.** Reads as "cards to get through" and carries the due badge well. B explains spaced repetition but looks like "refresh/sync". |

Both sets are live in `notebooks-mock-v2.html` (demo bar: "Icons A / Icons B"). The brain (old Review) and the four bare lines (old Library) are retired.

## 10. `shell.js` API

`Shell.mount(opts)` · `Shell.rail({space,due,hidden})` · `Shell.top({crumbs,saved,actions,side,panel,nav})` · `Shell.col('side'|'panel', 'dock'|'over'|'hidden')` · `Shell.toast(msg, undoFn)` · `Shell.pop(anchor, html)` · `Shell.ask(title, value, cb)` · `Shell.confirm(msg, okLabel, cb)` · `Shell.sheet.open({title,sub,picker,tabs,tab,body,hint,after,onClose})` / `.draw()` / `.close(commit)` · `Shell.bar(key,{label,icon,html,show})` · `Shell.track(scroller, track)` · `Shell.ic(name)` · `Shell.setTheme` · `Shell.setMode` · `Shell.icons('A'|'B')`.

## 11. Audit: contradictions between the current mocks

Mocks: T = toolbar v4 (approved), A = annotations/reader, H = home, N = notebooks v1, S = search, R = review, G = settings v1.

| #   | Part                | What differs today                                                                                                                                                                                                            | Shell rule                                                                            |
| --- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | Rail exists?        | T, A, H, N, S have one. **R and G have none.**                                                                                                                                                                                | every screen has the rail                                                             |
| 2   | Rail items          | T/H/N: Home, Library, Notebooks, Review. **S: Home, Library, Search, Cards.** **A: Library, Book, Notes panel, Notebook page** (screen actions, not spaces).                                                                  | the four spaces only; screen actions go to the top bar                                |
| 3   | Rail bottom         | T/H/N: gear. A: Day/Night only, no gear. S: nothing.                                                                                                                                                                          | Day/Night + gear                                                                      |
| 4   | Library icon        | T: four lines. H, S: open book. N: lines. A: open book.                                                                                                                                                                       | books on a shelf                                                                      |
| 5   | Notebooks icon      | T/H: ringed notebook. N: closed book.                                                                                                                                                                                         | notebook + pencil                                                                     |
| 6   | Review icon         | T/H: brain (two drawings). N: target. S: stacked cards, named "Cards".                                                                                                                                                        | flashcards + tick, named Review                                                       |
| 7   | Phone bottom bar    | **H: floating tab bar (8 px inset, radius 24). N: attached full-width bar. A: floating bar (≤ 600). T and S: the rail just disappears, no way to change space.** R/G: none.                                                   | attached full-width tab bar ≤ 640                                                     |
| 8   | Phone breakpoint    | 640 (T, H), 600 + 760 (A), 820 (N), 520 + 860 (S), 759 (G)                                                                                                                                                                    | 640 (and 1180 for two columns)                                                        |
| 9   | Top bar             | T, A: 52 px bar with crumbs. S: crumbs only. **H, N, R, G: none.** "Saved" and "Done" only in T.                                                                                                                              | one top bar everywhere                                                                |
| 10  | Left column         | N: tabs inside the sidebar (Notebooks/Pages/Outline/Audio, 276 px). A: Notes panel. S: search panel on the right. G: its own category column.                                                                                 | sidebar + left panel, 288 px each, fixed tab names                                    |
| 11  | More button place   | H, S, R, N: first in the row (correct). **T: a ▾ at the END of each pill. A: a chevron at the END of the reader bar.** N showed two More buttons at once (sidebar and page).                                                  | first, one per screen                                                                 |
| 12  | More surface        | T: 360–400 px card anchored under the bar. H: centred modal, height by content. N: centred modal, height by content (the N4 complaint). R: bottom sheet 440 px, fixed height. S: overlay inside the search panel. A: popover. | one fixed full-height sheet (tool cards under a bar stay cards, capped at one height) |
| 13  | Sheet footer        | N: ✕ and ✓ icons with no words; each mock builds its own footer.                                                                                                                                                              | hint · Cancel · ✓ Done                                                                |
| 14  | Minimise chip       | T, S: accent chip with icon + label at the right edge. **H: glass chip, icon only, 48 × 52, at top 150 px. A: a round button at the top LEFT.**                                                                               | accent chip, icon + label, right edge                                                 |
| 15  | Floating bar        | H: timer bar at bottom right (84 px up). T: bars under the top bar. Others none.                                                                                                                                              | bottom centre, or under the top bar for tools                                         |
| 16  | Toast               | height from bottom: 22 (T, R, G), 16 (S), 76 (N), 86 (A), 90 (H). Shape: rounded box (T, H, R, G) vs pill (A, N, S). Class `.show` vs `.on`. Undo button in some only.                                                        | pill, 24 px up, Undo built in                                                         |
| 17  | Scrim / sheet names | `.sheetbg`/`.sheet` (T, H, R), `.bg`/`.sheet` (N), `.layer` (A), `.scrim`/`.modal` (G)                                                                                                                                        | `.sh-scrim`, `.sh-sheet`, `.sh-dialog`                                                |
| 18  | Theme switch        | A: rail button. S: Night/Day in the demo bar. R: icon in the demo bar. N: gear menu. T: gear sheet. G: in the page. **App-wide Sepia exists in T, N, G only.**                                                                | rail button + gear menu, three themes                                                 |
| 19  | Mode names          | `beginner/pro` (T, A, G), `b/p` (H), `beg/pro` (N, S, R); each saved under its own key, so the choice does not carry over                                                                                                     | `beg/pro`, one key                                                                    |
| 20  | Icons               | seven separate dictionaries; home, gear, moon, brain, search and sliders are each drawn 2–3 ways                                                                                                                              | one dictionary                                                                        |
| 21  | Hit areas           | 32, 36 and 40 px controls in every mock (T 14 rules, A 13, N 11, H 6)                                                                                                                                                         | 44 pt with extenders                                                                  |
| 22  | Page width          | 1060 (T) to 1180 (N); the page scrolls, so rails and sidebars scroll away                                                                                                                                                     | app frame fills the screen; inner areas scroll                                        |
| 23  | Settings per item   | N: the Privacy pane repeated its switches for every notebook; colour and cover lived in a menu AND a pane.                                                                                                                    | pick on top, one shared panel                                                         |

Not a contradiction, but to carry over: T's drag-and-snap for bars, T's keyboard bars and A's reader lock stay as designed; they only adopt the shared chip, toast, sheet and icons.

## 12. Moving a mock onto the shell (order of work)

1. Replace its `:root` tokens, `.glass`, `.seg`, `.btn`, rail, toast and sheet CSS with `shell.css`.
2. Replace its icon dictionary, toast, sheet, pop and rail code with `shell.js`; keep only its own icons.
3. Wrap its screen in the skeleton (section 1); move screen actions out of the rail into the top bar.
4. Move its More content into `Shell.sheet.open` (tabs + optional picker).
5. Run the checks: no page scroll, sheet box identical across tabs, 44 pt targets, three themes, 400 px and 1280 px.

Suggested order: Review and Settings (no shell at all today), Search (wrong rail), Home, reader, then the toolbar mock last (it is the approved one; it changes least).
