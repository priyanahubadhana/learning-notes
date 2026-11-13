# Shared parts and shell (slice 0g step 1 + 0h)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

Sources: `docs/design/shell-spec.md` (SS), `docs/mockups/shell.css` (CSS) and `shell.js` (JS), `docs/mockups/toolbar-v8/design-study.md` section 3 (DS) with `v7.css` / `v8.css`, `docs/mockups/favourites/favourites-bar-mock.html` (FAV), `docs/mockups/home-mock-v2.html` (HOME), `docs/mockups/library-v2/v2.js` + `v2.css` (LIB), `docs/mockups/library-r3-comments.md` (LB2), `docs/mockups/settings-home-open-comments.md` (H-x, S-x), `docs/plans/mock-feedback-2026-11-11.md` (MF), `docs/PENDING.md` 262-352, `docs/mockups/pro-features.md` (PF).

## Purpose

Every screen in the new design is built from the same small set of parts, never from private copies. This file is the one place that says what each part looks like, how it behaves, how it is tested and where it lives. Slice 0g step 1 builds the parts; slice 0h builds the shell around them. Area slices (Home, Library, Notebooks, Review, Settings, Toolbar) only use them.

Plain words for the owner:

- A **part** is one reusable piece: a card, a tab row, a clear (✕) button in a text box, a tag chooser, a drag handle, an "arrange" sheet, an empty page message, a bar for a selected thing, a "Time range" bar.
- The **shell** is the frame around every screen: the icon strip (rail) or bottom bar (phone), the top bar with Undo/Redo, the side lists, and the pop-ups (sheet, small dialog, menu, toast, minimise chip).
- Build once, test once, and every screen gets the same look and the same behaviour. Nothing you can see changes while the flags are off.

## How it works

### 0. Flags and rollout

| Flag               | Covers                         | Default                                                                         |
| ------------------ | ------------------------------ | ------------------------------------------------------------------------------- |
| `foundation.parts` | SP-01 to SP-12, S3-01 to S3-40 | OFF (parts are only used by the gallery until an area slice flips its own flag) |
| `foundation.shell` | SH-01 to SH-14 (new shell)     | OFF = today's shell, pixel for pixel                                            |

Both live in `src/app/flags.ts` (slice 0a). Parts are lazy-loaded; the shell chunk loads with the first screen (size budget in Tests).

### 1. Shared rules for every part

- All colours, radii, motion and sizes come from tokens (SP-01). No raw hex, no raw px for sizes already in the token list, no `z-index` numbers outside the layer scale (lint check, slice 0b).
- Targets are 44 pt. A control drawn at 32-36 px carries an invisible 44 pt extender (CSS `.ib.sm::before`, shell.css:244-256).
- Every state exists in the gallery: default, hover, pressed, focus-visible, disabled, selected, open, plus loading/error where it applies.
- Beginner and Professional use the **same** part with the same words. Professional only adds controls inside it, each behind its own unlock switch (PF id). A Beginner can unlock one switch and stay in Beginner.
- Reduced motion: every transition drops to 0.01 ms (shell.css:1130-1138). State still changes, so nothing depends on motion to be understood. Reduced transparency: glass becomes `--surface-2`, no blur (shell.css:204-209).
- Overlays (card, sheet, dialog, pop menu, toast, tag picker) register with the overlay manager `src/app/overlay/` (slice 0f). One open at a time, Esc and tap-outside close, focus returns to the opener. Parts never add their own document listeners; they use the event router (0c) and gesture router (0d).
- Strings go through `t()` (`src/i18n`). Plain words, identical in Beginner and Professional.

### 2. Parts (slice 0g step 1)

Ids: SP-01 to SP-12. Paths are proposed, under `src/design/parts/`.

#### SP-01 Tokens

Path: `src/design/tokens.css` (extend), `src/design/layers.ts` (new, the z-scale as constants for tests).

What exists: colours, radii `--r-xs..xl/pill`, spacing `--space-1..20`, motion `--dur-1/2/3` (120/180/240 ms), `--ease-out`, `--ease-in`, `--spring`, elevations `--elev-1..3`, glass vars, three themes (`tokens.css:12-187`). The gallery already shows them.

Add (values from the mocks, names kept in the app's `--color-*` style):

| Token                                                                                                                                                                                        | Value (dark / light / sepia)                                       | Source                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------- |
| `--card-fill`                                                                                                                                                                                | rgba(31,30,38,.88) / rgba(255,255,255,.92) / rgba(251,243,224,.94) | v7.css:5,22,36 (`--pv-fill`)      |
| `--card-well`, `--card-well-2`                                                                                                                                                               | white 5.5% / 10%; ink 4.5% / 8%; sepia 5.5% / 10%                  | v7.css:6-7,23-24,37-38            |
| `--card-hair`, `--card-track`                                                                                                                                                                | 7% / 16% (dark); 8% / 14% (light)                                  | v7.css:9-10,26-27                 |
| `--card-shadow`, `--card-hi`                                                                                                                                                                 | two-layer shadow; inner 1 px top highlight                         | v7.css:11-14                      |
| `--card-w-pick`, `--card-w-panel`                                                                                                                                                            | 304 px, 376 px                                                     | v7.css:18-19                      |
| `--ease-spring`                                                                                                                                                                              | cubic-bezier(.34,1.45,.64,1)                                       | v7.css:16                         |
| `--sh-rail` 56, `--sh-side` 288, `--sh-panel` 288, `--sh-top` 52, `--sh-tabbar` 56, `--sh-sheet` 440, `--sh-hit` 44, `--sh-gap` 12                                                           | see Decisions D1 for 288 (mock says 264)                           | CSS:45-57, SS 8                   |
| `--z-tabbar` 30, `--z-fbar` 40, `--z-chip` 41, `--z-drawer-scrim` 59, `--z-drawer` 60, `--z-sheet-scrim` 79, `--z-sheet` 80, `--z-dialog` 85, `--z-pop` 86, `--z-tagpick` 88, `--z-toast` 90 | layer scale                                                        | SS 8, CSS 581-994, LIB v2.css:633 |

States: tokens have no states. Gallery shows each token on all three themes plus "Reduce glass" on.

Beginner/Professional: no difference.

#### SP-02 Card / ▾ frame (picker 304, panel 376, phone sheet)

Path: `src/design/parts/Card.tsx`, `Card.css`; hook `useAnchoredCard.ts`.

```ts
type CardProps = {
  anchor: HTMLElement | DOMRect | null // the ▾ that opened it; null = centred sheet
  size: 'pick' | 'panel' // 304 | 376 px wide
  title: string
  onClose(reason: 'x' | 'esc' | 'outside' | 'pick'): void
  back?: () => void // drill-in arrow (never a card from a card)
  autoClose?: boolean // pick cards close 190 ms after a choice (DS 3.6)
  children: ReactNode // body: groups of <CardWell>
  footer?: ReactNode
}
// Helpers: <CardGroup label>, <CardWell> (hairlines between rows), <CardNote>, <Tile>, <Swatch>, <SizeTile>, <SwitchRow>
```

Sizes (DS 3.1-3.4, FAV css 1689-1733): radius 20; padding 4 12 12; header 44 high, title 15 px / 650, close = 28-30 px circle inside a 44 pt target; arrow 13 px rotated square on the top edge pointing at the ▾; blur 28 px, saturate 170%; hairline edge + top highlight. Group label 12.5 px / 600 soft ink, sentence case. Well radius 14, rows separated by 1 px hairlines. Note 12 px muted. Body scrolls; when it overflows the bottom 30 px fade out (mask, FAV 1729). Width caps at `100vw - 24`. Height follows content.

Anchor rule (DS 3.3): 8 px below the bar; left edge lines up with the ▾; never within 12 px of the screen edge (the arrow slides instead); the ▾ looks pressed (tinted, chevron flipped) for as long as the card is open. Exceptions kept: Insert hangs from the Insert button; the Box card sits right of the box, else left, else under, else above (DS 7.4 M1) and then has no arrow.

Phone (≤ 640): same component as a bottom sheet, full width, radius 20 20 0 0, max-height 82 vh, 36 x 5 grab bar, scrim 40%, no arrow (FAV 1706-1714). Safe-area padding at the bottom.

States: closed; open (200 ms in); closing (130 ms); loading body (skeleton wells); scroll-fade on; ▾ trigger pressed. Tile states are in SP-02 helpers: default, hover (well), pressed (scale .96, 120 ms), selected (accent tint + 1.5 px ring, pop .93 → 1 in 280 ms spring), disabled (35%).

Keyboard / screen reader: `role="dialog"` with `aria-label=title`; focus moves to the first control, Tab stays inside, Esc closes and returns focus to the ▾; the ▾ has `aria-haspopup="dialog"`, `aria-expanded`. Arrow keys move through tiles (roving tabindex); tiles are `role="radio"` in a `radiogroup` (single) or `checkbox` (multi). A choice is announced through the toast live region only when the result is not visible.

Motion (DS 3.6): open 200 ms `--ease-out`, fade + scale .96 → 1 + rise 6 px, origin at the arrow; close 130 ms ease-in, fade + scale .98; switching view inside the card replays the open; segmented thumb slides 280 ms spring; value changed on the row = that ▾ glows once (accent ring spreads and fades, 700 ms). Reduced motion: instant.

Beginner/Professional: same frame and sections. Professional adds controls inside the same sections (DS 3.7). Which control is Pro is decided by the area slice with its own unlock id; the frame never forks.

#### SP-03 Tab row (one line, customisable)

Path: `src/design/parts/TabRow.tsx`, `TabEditor.tsx`, `useTabSet.ts` (state in `src/settings/tabSets.ts`, saved per key).

```ts
type TabDef = {
  id: string
  label: string
  icon?: IconName
  pro?: string /* unlock id */
  custom?: boolean
}
type TabRowProps = {
  setKey: string // 'pageTabs' | 'panel' | 'library' | ...
  catalog: TabDef[]
  defaults: string[]
  value: string
  onPick(id: string): void
  variant?: 'underline' | 'pill' // underline in columns/sheets, pill on the page
  editable?: boolean // shows the "+" (default true)
  sources?: () => TabSource[] // "Create your own tab" pointers (saved filters, shelves...)
}
```

Rules: always **one line**. Too many tabs scroll sideways inside `.sh-tscroll` (hidden scrollbar, `scrollbar-width:none`) with the **thin track** under the row (`track()`, JS 586-597, CSS 1274-1276; the track hides itself when nothing overflows). "+" is a fixed 44 px slot at the row end, accent coloured, never overlapping a tab (CSS 1262-1273). Tab: min height 44, 12.5 px / 600, underline 2 px accent when selected (CSS 606-629). Default is 3 tabs (S-b / S8). "+" opens a pop menu: add from catalog, **Create your own tab** (name it, point it at one thing; JS 962), **Edit tabs…**. Edit tabs dialog (JS 2110 in the toolbar mock, CSS 1277-1332): rows with grip, name input with ✕, ▲▼, remove (danger), Reset; rows reorder with SP-06; a mini preview of the tab row itself sits in the dialog (S-b), never in the main preview. Pro-only catalog entries show only when their id is unlocked (`ok()` in JS 727).

States: tab default / hover (well) / pressed / focus-visible (2 px accent outline) / selected / disabled; row: overflowing (track on), edit mode (rows lifted: shadow `--elev-2`, accent border), empty custom set (falls back to defaults), at max (the "+" is disabled with a one-line reason).

Keyboard / SR: `role="tablist"`, tabs `role="tab"` with `aria-selected`; Left/Right move, Home/End jump, Enter/Space picks (manual activation); the selected tab scrolls into view. "+" has `aria-haspopup="menu"`. Edit rows: Alt+↑/↓ move (SP-06), Delete removes with Undo toast. The track is `aria-hidden`.

Motion: underline slides 180 ms; new tab fades in 180 ms; scroll-into-view smooth (instant in reduced motion).

Beginner/Professional: both can add/edit/remove/reorder (owner S-b is not Pro). Pro unlocks: `nb.tabOptions` (rename, hide, colour per notebook), `nb.extraTabs` (extra tabs for new notebooks).

#### SP-04 ✕ clear field

Path: `src/design/parts/ClearField.tsx` (wrapper) and `useAutoClear.ts` (adds the ✕ to every system text input).

```ts
type ClearFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  onClear?: () => void
  multiline?: boolean
  clearLabel?: string // default t('ui.clear')
}
// Opt out: data-noclr (note text, code, passwords already have their own eye button).
```

Rules (MF HT2, H-g, JS 1229-1280, CSS 1340-1369): every **system** text field (search, add topic, rename, tag search, notebook search, filters) gets a ✕. Note text boxes (editor, text boxes, comments body) never do. The ✕ shows only while the field has text (`:placeholder-shown` trick), is a 44 pt target drawn 28 px inside the right edge (`right:2px`), field gets 40 px right padding, hides the browser's own search cancel button. Clear empties the value, fires `input`, keeps focus, announces "Cleared". Textarea variant puts ✕ top right (CSS 1358).

States: empty (no ✕), typing (✕ visible), hover, pressed, focus (focus stays in the field after clear), disabled/read-only (no ✕).

Keyboard / SR: ✕ is a real button, `aria-label` "Clear search" (names the field); Esc in a field with text clears it first, a second Esc leaves the field. Tab order: field then ✕.

Motion: ✕ fades 120 ms. Reduced: none.

Beginner/Professional: same.

#### SP-05 Tag picker (LB2, one for the whole app)

Path: `src/design/parts/TagPicker/` (`TagPicker.tsx`, `tagSearch.ts`, `TagRow.tsx`). Replaces `src/tags/TagPicker.tsx` (300 px, add-only). Data stays in `src/tags/tagService.ts`.

```ts
type TagPickerProps = {
  mode: 'filter' | 'assign' // filter: pick tags to filter by; assign: put tags on items
  itemIds?: string[] // assign: one or many items (bulk)
  anchor?: HTMLElement // popover on iPad/PC; bottom sheet on phone
  scope?: () => Set<string> // filter: tags present in the current results (others dimmed)
  value?: string[]
  onChange?(ids: string[]): void // filter state
  match?: 'any' | 'all'
  includeSub?: boolean
  onMatch?
  onIncludeSub?
  suggest?: (item) => string[] // "Suggested for this item"
  onClose(): void
}
```

Behaviour (LB2 in full, LIB v2.js 409-690):

1. **Search first.** The field is focused on open (`role="combobox"`, `aria-controls`, `autocapitalize=off`, ✕ from SP-04). Fuzzy match over tag names **and** paths; scores exact 100, prefix 80, contains 60, subsequence 30, path match 40; ties by use count (JS `fuzzy`, `tpBody`). Each result shows `#name` and the path `Category › Tag › Sub-tag` (small, muted).
2. **Before typing:** Pinned, Recent (stores 6, shows 4), Suggested for this item (assign, one item), then **Browse by category** (tree: category rows with count, expandable, 20 px indent per level, sorted by use). Tags with no category sit in "Not in a category yet".
3. **Counts** next to tags, sorted by use.
4. **Filter mode:** only tags present in the current results are normal; the rest are dimmed to 42% with the tooltip "Nothing on this screen has this tag" (still tickable).
5. **Multi-select** with a tri-state check (none / some / all, "some" when bulk items differ). Filter footer: Clear · "n ticked" · Done. Options well: **Match Any / All** (segmented) and **Include sub-tags** (switch, "#habits also finds #routines").
6. **Assign mode:** each tap saves at once with an Undo toast ("Saved as you tap. Undo works."); footer: hint · Done.
7. **Create:** typing a name that is not an exact tag adds a "Create #name" row, with **Put it under** (parent pick: "Nothing (decide later)" + paths) and a **near-duplicate warning** ("This looks like #habit, which you already have. Use #habit"): plural/singular or edit distance ≤ 1 (≤ 2 if length > 6). Merge goes through the existing tag tools (`tagTools.ts`).
8. **Keyboard:** `#` or `T` opens it from any list or highlight (not inside note text); ↑↓ move, Enter toggles/creates, Esc clears the text first then closes, Backspace on empty field removes the last ticked chip (filter). Letters never reach the page behind.
9. Used by: Library tag chip and filter, book tags, highlight tags, notebooks (tag bar, sidebar Tags), page tags, bulk tag, the AI bar, review deck builder, search filter.

Sizes (v2.css 631-720): 348 px wide popover (`max-width: 100vw - 24`), max height `min(580px, 100dvh - 24px)`, radius 20, glass card frame (SP-02 tokens), z `--z-tagpick`. Header 44 px with title ("Filter by tag" / "Tags for “title”" / "Tag n items") and ✕. Search row radius 12. Rows min height 46, 14.5 px / 600 name, 12 px path. Check box 22 px. Phone: bottom sheet, full width, max 86 dvh, radius 24 24 0 0, scrim 42%.

States: closed; open; empty library (EmptyState "No tags yet" + create row); no match ("No tag matches “q”."); row default / hover / keyboard-active (inset 1.5 px accent-soft ring) / selected / some / dimmed; creating; duplicate-warning; offline (works, local data); error saving (toast, row reverts).

Screen reader: listbox `aria-multiselectable`, rows `role="option"` with `aria-selected`; counts read as "12 items"; Create row announces the parent choice; the dim reason is in `aria-description`. Live region says "n tags ticked".

Motion: popover 200 ms (as SP-02); sheet 240 ms; row check draws 120 ms. Reduced: instant.

Beginner/Professional: Beginner = search, Pinned/Recent/Suggested, flat results with paths, multi-select, create (parent "decide later"), Any/All default Any. Professional (`lib.tagCategories`) = Browse by category tree, parent pick on create, Any/All switch, Include sub-tags. Tags tab and tag map = `lib.tagsTab`. Notebook tag bar = `nb.tagBar`.

#### SP-06 Drag: drop-line, ▲▼, live reflow

Path: `src/design/parts/drag/` (`useReorder.ts`, `DropLine.tsx`, `MoveButtons.tsx`, `Grip.tsx`), built on `src/app/input/gestureRouter.ts` (0d). Absorbs `src/app/tools/gripDrag.ts`, `src/home/useTaskDrag.ts`, `src/app/useLongPress.ts` behaviour.

```ts
type ReorderProps<T> = {
  items: T[]
  getId(t: T): string
  axis: 'y' | 'x' | 'grid'
  onMove(id: string, toIndex: number, kind: 'drag' | 'button' | 'key'): void // always one history step
  handle: 'grip' | 'row' | 'both' // grip always on in sheets; row = long-hold (0.3 s)
  showMoveButtons?: boolean // ▲▼ on the right
  fit?: (id, slot) => boolean // grid: can this item sit here (wide widget)?
  label(t: T): string // for Undo text and aria
}
```

Rules (H-a, H-e, H-l, H-m, HT3, FAV 5714-5779, HOME 3010-3070, 4057):

- **Live reflow:** while dragging, the other items slide out of the way (160 ms, `--ease-out`, FLIP) so the final layout shows before release. The lifted item follows the pointer (scale 1.02, shadow, `.lift`). In lists a **drop-line** (3 px accent line with 7 px end dots, HOME 3041-3070) shows where it lands; in grids the landing preview is the reflowed layout.
- **Grids (Home widgets):** a wide widget dropped between two small ones lands there and the small ones wrap; spots that cannot fit are not offered, drop snaps to the nearest that fits (`fit`). A widget can never vanish: if a drop fails, it returns to its old place with a toast.
- **Start:** grip = drag at once after 4 px of movement. Whole row = **long-hold 0.3 s** with feedback (row lifts, light haptic on iPhone), movement over 8 px before 0.3 s cancels the hold so the page still scrolls. Mouse lifts on press+move.
- **Safety:** the grip calls `setPointerCapture`; `touch-action:none` on the grip; `user-select:none` on the dragged list for the whole drag, text inside never gets selected (H-a); while a drag runs no tap, toolbar, menu or new box reacts anywhere until the drop (slice 0 core line); the gesture ends by itself within 4 s if the "finger lifted" event is lost.
- **▲▼ buttons** on the right of each row (44 pt, first ▲ and last ▼ disabled), and "Move to start / end" in the row menu (FAV 5751). Keyboard: focus the row, **Alt+↑ / Alt+↓** moves one place; Home/End with Alt jumps to start/end. After a move the focus stays on the same item and the row flashes (accent-soft, 700 ms).
- **Undo:** every move (drag, button, key) is one history step and shows the toast "Moved {name}" with Undo (6 s).

States: idle; hold-pending (press ring); lifted; over valid slot; over invalid slot (snap); dropping; disabled (locked list); single item (no ▲▼).

Screen reader: items in `role="list"`; the grip is a button "Drag {name} to reorder"; live region announces "{name} moved to position 3 of 8". Drag itself is optional; ▲▼ and Alt+arrows give the same result.

Motion: slide 160 ms; lift 120 ms; drop settle 180 ms. Reduced motion: items jump to place, drop-line still shows.

Beginner/Professional: long-hold drag and Alt+arrows work for everyone. The visible **grip** on notebook and page rows is `nb.dragGrip`; ▲▼ / "Move up, down, to top" in notebook menus is `nb.move`. In sheets built for arranging (SP-07, Top 3, Home edit) the grip and ▲▼ always show.

#### SP-07 Arrange sheet (the approved "Organise" sheet)

Path: `src/design/parts/ArrangeSheet.tsx`.

```ts
type ArrangeRow = {
  id: string
  label: string
  preview?: ReactNode
  removable?: boolean
  hint?: string
}
type ArrangeSheetProps = {
  title: string
  help?: string // "Drag, or use the arrows, to change the order."
  rows: ArrangeRow[]
  preview?: (rows) => ReactNode // live preview strip of the result
  onChange(rows: ArrangeRow[]): void // applied live; one history step per action
  onAdd?(): void
  addLabel?: string // "Add favourite"
  onReset?(): void
  onDone(): void
  onRowTap?(id): void // opens the row's edit form (sheet steps aside, returns)
}
```

Layout (FAV 5695-5760, css 1689-1760): the Card frame (SP-02, panel width on PC/iPad, anchored under the Organise ☰ button; **full-height bottom sheet on phone**). Header "Organise the row" + ✕; one muted help line; **Preview** well (chips of the result, wraps, +n more); body is a well of **big rows** (min height 56): 44 x 56 grip, 32 px preview tile, name, ▲ ▼, "…" menu (Move to start, Move to end, Remove). Footer: **Reset** (left), **Add favourite** (centre, with +), **Done** (accent). Remove shows the Undo bar at the bottom of the sheet ("Removed X · Undo"); Undo restores the exact place. Changes apply live to the real row behind (nothing is covered on wide screens), Done just closes; ✕/Esc closes too (nothing to discard because Undo exists).

States: default; row hovering/pressed; lifted; removing (row collapses 160 ms); empty (EmptyState: "Nothing here yet", Add button); at max (Add disabled with reason); Reset disabled when already default; busy.

Keyboard/SR: `role="dialog"`, list rows as in SP-06; "…" menu `role="menu"`; announces "Removed X. Undo available".

Motion: card open 200 ms; row slides 160 ms; remove collapse 160 ms; flash 700 ms; phone sheet 240 ms. Reduced: instant.

Beginner/Professional: same sheet. Used for: Favourites row (Pen, Text, all tabs), Home Top 3 and edit layout lists, notebook/page organise, Pages tab organise (add, delete, reorder, duplicate, extract: extra row actions, MF Notebooks v2 review), tab editing (SP-03 reuses the rows).

#### SP-08 Empty state

Path: `src/design/parts/EmptyState.tsx` (moves from `src/app/ui.tsx:142-179`, same props kept: `icon, text, action, onAction, testId, className`).

```ts
type EmptyStateProps = {
  variant?: 'page' | 'inline' // inline keeps today's dashed box
  icon: IconName
  title?: string
  text: string
  action?: string
  onAction?(): void
  secondary?: string
  onSecondary?(): void
  learnMore?: () => void // opens a pop-up explanation (never swaps the content)
  testId?: string
}
```

Sizes: page variant centred in the content area, icon 40 in a 72 px soft circle, title 17 / 600, text 14 muted max 40 ch, one primary button (44 high) and an optional quiet second action; inline variant = today's box (padding 20, dashed border, icon 28). States: default; loading (skeleton instead, never an empty state flash); offline variant ("You are offline. Your notes are on this device."); error variant (text + Try again). Rules: one idea per line; names the next step; never blame the user.

SR: `role="status"` only when it replaces content after a filter; otherwise plain region. Motion: fade in 180 ms. B/P: same words.

#### SP-09 Object bar

Path: `src/design/parts/ObjectBar.tsx`. From toolbar v8 recipe (v8.css 5-66: `#boxbar`, `#selbar`, lasso/picture bar, DS 7.2) and reused for tables, pictures, map nodes, database rows (`docs/plans/app-audit-2026-11-12.md:217`).

```ts
type ObjectBarProps = {
  kind: 'box' | 'text' | 'picture' | 'table' | 'node' | 'rows'
  target: DOMRect | (() => DOMRect) // selected thing (from the selection store 0e)
  actions: {
    id: string
    icon: IconName
    label: string
    danger?: boolean
    pro?: string
    menu?: MenuItem[]
  }[]
  count?: number // "3 selected"
  onAction(id: string): void
}
```

Sizes: glass pill-card, radius 16, padding 4, gap 2, blur 28; buttons 44 x 44, radius 12, icons 20; danger (Delete) in `--danger` with a 14% tinted hover; state label (`.bbst`) 600. Placement: above the object (12 px gap), flips below when no room, never covers the object or the handles, stays inside 12 px of the screen; the Box **card** opens beside the box (never over it). One bar at a time; it follows the selection store (selecting a box clears text/ink/picture selections).

States: default; hover (well); pressed (scale .96, 120 ms); toggled (well-2); disabled; overflow ("…" menu when it would be wider than the screen, never sideways scroll); multi ("3 selected").

SR: `role="toolbar"` `aria-label="Actions for the selection"`, roving tabindex, Esc returns focus to the object. Delete shows the Undo toast. Motion: slides in with a fade, 200 ms (v8drop). No second minimise on the box mini-bar (PENDING toolbar v6 cond. 4).

B/P: same bar. Pro actions (e.g. exact size, layers) carry the area's unlock id and appear in the "…" menu.

#### SP-10 Time range bar

Path: `src/design/parts/TimeRangeBar.tsx`, `timeRange.ts` (pure range maths, unit-tested), builder dialog `TimeRangeBuilder.tsx`. First use: Home reports; replaces `home/ReportsTab.tsx` Today/Week control (lines 74-114).

```ts
type Preset = {
  id: string
  label: string
  kind:
    | 'day'
    | 'week'
    | 'month'
    | 'lastmonth'
    | 'quarter'
    | 'year'
    | 'last7'
    | 'last30'
    | 'last4w'
    | 'custom'
  from?: string
  to?: string
}
type TimeRangeBarProps = {
  name?: string // default "Show:"
  presets: Preset[]
  value: string
  onChange(id: string, range: { from: string; to: string }): void
  editable?: boolean // "Edit time range" button
  onEdit?(next: { name: string; presets: Preset[] }): void
  customRange?: boolean // date range picker (HT5), one control
}
```

Rules (MF HT4, HT5; H-d, H-f, H-p; HOME 3090-3125, 9802-9830, 9949, 10176-10208): ONE reusable bar for any template and widget; no separate "This month" widget control. Words: "Time range", "Edit time range", "Show: Today / This week / This month" (never "Period"). Presets (HOME PRESETS): Today, This week, This month, Last month, This quarter, This year, Last 7 days, Last 30 days, Last 4 weeks, Custom range. Custom range opens one date range picker pop-up. Builder dialog: name the bar, tick presets, reorder (SP-06), add a custom preset, ✓ confirm, ✕ cancel, Reset; a short guided example ("Try it: add This week, rename the bar, press ✓"). A template can hold its own bar; every widget in it follows the bar. The chosen range prints as a muted line ("12-18 Nov 2026").

Sizes: segmented control (height 36 with 44 pt extender), scrolls sideways inside its box with hidden scrollbar + thin track (SP-03 track), "Edit time range" is a quiet button at the end; wraps under the title on phone.

States: default; hover; selected (raised thumb); custom active (shows dates); editing; invalid range (end before start: inline message, ✓ disabled); empty presets (falls back to Today, This week); offline ok.

SR: `role="radiogroup"`, `aria-label="Time range"`; the range line is `aria-live="polite"`. Keyboard: arrows move, Enter picks. Motion: thumb slides 280 ms spring. Reduced: instant.

B/P: Edit time range is visible to everyone (owner, round 2: "Edit period bar visible for all"): name the bar, add/remove presets, custom range, add to any template. No unlock switch. Wide card sizes stay `home.cardSizes`.

#### SP-11 Part list used by area slices (names to reuse in specs)

tokens · Card ▾ frame 304/376 · Tab row · ✕ field · Tag picker · Drag (drop-line + ▲▼, live reflow) · Arrange sheet · Empty state · Object bar · Time range bar. Step 2 parts (Context menu strip, Command list, Sheet, Dialog set, Toast queue, Banner) are specified in [page-menus](page-menus.md); step 3 parts (Tool frame, Wizard steps, Status pill stack, Before / after view) are in section 5 below; the shell versions of sheet, dialog, pop, toast are SH-09 to SH-12 and are the base those parts grow from.

#### SP-12 "Parts" gallery page

Path: `src/design/DesignTokensPage.tsx` (route `#/design-tokens`, `designRoute.ts`, hidden). Today (file, 245 lines): header + theme buttons (`THEMES`) + "Reduce glass" toggle, Colour grid (`COLOURS`, 21 tokens), Type scale, Spacing, Radius, Elevation + glass, Buttons x 5 kinds x 4 states (default, focus, disabled, loading). English only, `data-testid="design-tokens"`.

Keep all of that. Split into `src/design/gallery/` (one file per section, lazy) and add, in this order (each section gets `data-testid="gal-<id>"` and every demo `data-state="<state>"` so a screenshot test can target one cell):

| Section (testid)              | One demo per state                                                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens (`gal-tokens`)         | + card fills/wells/hairs, layers list, motion bars (120/180/240 + spring), shell sizes                                                   |
| Card (`gal-card`)             | pick 304 and panel 376, each: open, tile default/hover/pressed/selected/disabled, scroll-fade, phone sheet                               |
| Tab row (`gal-tabs`)          | 3 tabs, 12 tabs overflowing with track, "+" menu open, edit dialog, Pro tab hidden/shown                                                 |
| ✕ field (`gal-clear`)         | empty, with text, focus, disabled, textarea; opt-out sample                                                                              |
| Tag picker (`gal-tags`)       | filter mode (before typing, results, dimmed, tri-state, options), assign mode, create + duplicate warning, empty library, phone sheet    |
| Drag (`gal-drag`)             | list idle, hold-pending, lifted with drop-line, invalid slot, grid reflow with wide item, ▲▼ ends disabled                               |
| Arrange sheet (`gal-arrange`) | default, lifted row, removed + Undo bar, empty, at max, phone full-height                                                                |
| Empty state (`gal-empty`)     | page, inline, offline, error, with second action                                                                                         |
| Object bar (`gal-objbar`)     | box, text, picture, table, multi, overflow "…", danger hover                                                                             |
| Time range bar (`gal-range`)  | presets, custom range, editing, invalid, phone wrap                                                                                      |
| Shell (`gal-shell`)           | rail, tab bar, top bar (with/without Undo, Redo), sidebar, left panel, More sheet, dialog, pop menu, toast (plain / Undo), minimise chip |

Gallery controls added to the top: Theme (Night, Day, Sepia), Reduce glass, Beginner/Professional, "Show Pro unlocked" (unlock all), Reduce motion, width presets (390, 820, 1180, 1366). The screenshot test iterates these. English only stays (review page).

### 3. Shell (slice 0h)

Ids SH-01 to SH-14. Paths under `src/app/shell/`. Values: CSS = `docs/mockups/shell.css`, JS = `shell.js`, SS = `docs/design/shell-spec.md`. Breakpoints: **640** (phone) and **1180** (room for sidebar + panel) only (SS 8). Today's code uses `phone:` = width < 40rem or height < 32rem (`src/index.css:5-17`); the new shell keeps that rule (height < 32rem also counts as phone).

| Id    | Part                                       | Path                                                       | Notes                                                                                                                                            |
| ----- | ------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| SH-01 | Frame / layout                             | `Shell.tsx`, `shell.css`                                   | page never scrolls; only `.sh-scroll`, column bodies, sheet body scroll (CSS 458-490, 708-717); bottom padding 84 px so nothing hides under bars |
| SH-02 | Rail                                       | `Rail.tsx`                                                 | CSS 491-552                                                                                                                                      |
| SH-03 | Phone tab bar                              | `TabBar.tsx`                                               | CSS 1030, 1052-1129                                                                                                                              |
| SH-04 | Top bar                                    | `TopBar.tsx`                                               | CSS 656-707, SS 3                                                                                                                                |
| SH-05 | Undo / Redo                                | `HistoryButtons.tsx` (moves from `src/app/tools/`)         | JS 1150-1228                                                                                                                                     |
| SH-06 | View toggle (Beginner / Professional)      | `ViewToggle.tsx`                                           | MF "Notebooks v2 review"                                                                                                                         |
| SH-07 | Sidebar                                    | `Sidebar.tsx` (+ `SidebarGroup.tsx`, `SidebarResizer.tsx`) | CSS 564-584                                                                                                                                      |
| SH-08 | Left panel                                 | `LeftPanel.tsx`                                            | CSS 567-646, uses SP-03                                                                                                                          |
| SH-09 | More sheet 440                             | `MoreSheet.tsx`                                            | CSS 822-900                                                                                                                                      |
| SH-10 | Small dialog                               | `Dialog.tsx`                                               | CSS 901-933                                                                                                                                      |
| SH-11 | Pop menu                                   | `PopMenu.tsx`                                              | CSS 934-986                                                                                                                                      |
| SH-12 | Toast                                      | `Toast.tsx` (host in overlay manager)                      | CSS 987-1029                                                                                                                                     |
| SH-13 | Minimise chip + floating bar + edge handle | `MinimiseChip.tsx`, `FloatingBar.tsx`                      | CSS 719-805, 1194-1237                                                                                                                           |
| SH-14 | Layers and breakpoints                     | `layers.ts`, `useBreakpoint.ts`                            | SS 8                                                                                                                                             |

**SH-02 Rail.** 56 px wide, glass, radius 16, padding 8 6, gap 4; buttons 44 x 44, icons 24, Lucide 1.6 stroke. Order: brand "L" (32 px accent tile) · Home · Library · Notebooks · Review · space · Day/Night · gear. Library icon = books on a shelf (A), Notebooks = ruled notebook (B), Review = repeat arrows around a card (B), Home/gear/sun/moon as today (MF 114). Active: accent-soft fill, accent icon, 3 px accent bar on the outer edge, `aria-current="page"`. Review badge = due count (accent pill, 17 px, top right, 10.5 px). Hidden spaces (Home, Library, Review) follow `general.space.*`; Notebooks always stays. Day/Night: one tap flips (sun when dark, moon when light); Sepia lives in the gear menu. Gear menu: Settings · Save & restore · Trash · Device mode · Help · Day / Night / Sepia (+ today's Layers gallery and Refresh app rows, see Nothing lost). States: default, hover, pressed, focus-visible, selected, badge on/off. SR: `<nav aria-label="Spaces">`, labels from `t()`, badge text "17 cards due".

**SH-03 Tab bar (≤ 640).** Attached full width at the bottom, 56 px + safe area, glass, no radius; four spaces + "More" (the gear menu); icon 22 + 10 px label; badge beside the icon. Toast and floating bars sit above it (`--sh-bottom`).

**SH-04 Top bar.** One row, 52 px, flat. Left to right: sidebar toggle · panel toggle (only with an open notebook/book) · Back · Forward (36 px icon, 44 pt hit) · **Undo · Redo** · breadcrumbs (earlier crumbs are buttons, the last is plain text and truncates with …) · "Saved" status (muted, while editing) · Refresh (when `advanced.showRefresh` is on) · Device mode button · Search (Ctrl K) · view toggle (SH-06) · max 3 screen actions · "Show tool bar" pill when the bar is off. A screen's own title, tabs and More button live in the content, never here. Phone: panel and sidebar toggles stay; crumbs collapse to nothing (the title shows in the content); Search stays; the view toggle moves to the space's title row (D3).

**SH-05 Undo / Redo.** Two 44 pt icon buttons, always visible on every screen including Home (MF HT1, H-b). Disabled state when nothing to undo/redo (`aria-disabled`). Works on the open page's one history (`historyState`, `runHistory`) or the current area's history (Home layout edit, Library, Review). Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, Cmd on Mac, never inside text inputs (JS 1205-1226). A setting "Show Undo and Redo on a computer" (Settings › General, default ON) hides the pair when device mode is Computer; iPad and phone always show them. Tooltips "Undo (Ctrl Z)". Reader's `reader.historyBtns` remains its own bar's copy until the reader slice (same component).

**SH-06 View toggle.** Two-segment control "Beginner | Professional" at the top of **every** space (MF line 122); settings keep three levels (incl. Standard) inside Settings only. `data-mode="beg|pro"` on the shell root; saved in the app's level setting (`src/settings/level.ts`, slice 0a). Props: `views: {id, label}[]` (defaults the two) so users can later re-map to custom layouts (not built now). Changing shows a short toast-less glow on the toggle and the screen re-lays out in 180 ms; per-feature unlocks are untouched.

**SH-07 Sidebar.** Default 288 px (D1), glass-free `--surface-1` card, radius 16, 1 px line; header, scrolling body (`.sh-colscroll`, padding 6 8 12), optional footer. Resizable on PC (keep `SidebarResizer`: today's range 200 to `sidebarMax`, arrow keys step, `aria-valuenow`). Rows 48 high (44 minimum). Docked ≥ 1180; 641-1179 docked but steps aside while the panel is docked; ≤ 640 a drawer from the left. Overlay/drawer: width `min(86vw, 320)`, scrim `rgba(0,0,0,.48)` at `--z-drawer-scrim`, tap outside or Esc closes, slide-in 180 ms (`shIn`). Group "Notebooks" keeps Collapse all ⇄ Expand all (icon + words) and "+". `SidebarGroup` keeps saved open/closed state. States: docked, over, hidden (toggle), resizing.

**SH-08 Left panel.** Same card as the sidebar, 288 px (today 280 docked / 300 overlay, D1). Tabs via SP-03: **Pages · Outline · Resources** (books add Annotations); "Audio" is a kind of Resource. Pages: thumbnails (title + 3 lines + page number), current page highlighted and **centred** on open, hold 0.3 s or grip to reorder (SP-06), Undo toast. Outline: whole notebook, current heading highlighted and centred while reading, depth and fold options kept. Resources: scope This page / Notebook / Everywhere (`nb.resourceScope`), kind chips, Add, Insert in the page. Docks at ≥ 1024 today (`PANEL_DOCK_MIN`); new rule 1180 (D2).

**SH-09 More sheet.** Fixed box: right edge, 12 px from top, bottom, right; 440 px wide (`min(440, 100vw - 24)`); radius 24; surface-1; `--z-sheet` 80, scrim 79. Phone: full width from 8 px below the top to the bottom edge, radius 24 24 0 0, slides up (`translateY(105%)` to 0). Position and size never depend on content. Fixed parts: header (icon, title 17 px, one-line subtitle 12.5 px, ✕) → **picker row** (All + tiles, scrolls sideways with a track) → section tabs (SP-03 with track) → body (only this scrolls; tab switch resets to top; edits keep the place) → footer (hint · Cancel · ✓ Done). Draft model: nothing changes until Done; Cancel, ✕, Esc or tap outside discards (asks if there are edits: "Discard changes?" small dialog). The page stays visible beside the sheet on wide screens. Slide 240 ms. API: `openMore({title, sub, picker, tabs, tab, body, hint, onDone, onClose})`. The owner is reminded to test it on the iPad (MF 120).

**SH-10 Small dialog.** Centred, `min(420px, 100vw - 24)`, content-sized, radius 24, padding 18, ✕ top right, title 17 px, footer Cancel + one action (right aligned, gap 8). Destructive action in danger red with "You can undo this." Enter confirms, Esc cancels, focus trapped, first field focused (name dialogs). `--z-dialog` 85, scrim 79; in 180 ms (opacity + scale .98 → 1). Replaces `ConfirmDialog`, `NameDialog`, `ChoiceDialog`, `NameSheet` (ui.tsx:486-700).

**SH-11 Pop menu.** Anchored to its button, min width 220, max `100vw - 16`, radius 12, padding 6, rows 44 high, icon 18 + words 14 px, danger last after a divider, section labels 11 px caps muted. Flips to stay in the visible viewport (keyboard and pinch aware, as `MenuPopover` does today). In 120 ms (`shPop`, -4 px). Arrows move, Enter picks, Esc closes, `role="menu"`; sub-menus replace, never stack more than one level (today's `opener` rule kept).

**SH-12 Toast.** Pill, one at a time, bottom centre, 24 px above the bottom (above the tab bar on phone, above a visible floating bar, above the on-screen keyboard + 44 px bar via `toastBottom`), min height 48, `--surface-3`, `role="status"`. Time: 2.6 s plain, 6 s with Undo in the mock (JS 356); the app's rule (`toastTiming.ts`: 2.5 to 8 s by length, 6 s minimum with an action, hover/tap holds, 1.5 s after release) is kept (D4). Only for errors, Undo, or results not on screen. A toast never covers a title ("Plan ready" case, PENDING AI). A second toast replaces the first. Undo is built in: runs the stored undo function and closes. In/out 180 ms rise 16 px.

**SH-13 Minimise chip.** Right edge, starting 64 px below the top bar (phone 56), stacked 8 px apart, 44 high, accent 1.5 px border + 16% tint, radius 14 0 0 14, chevron + icon + **label**, slides in 150 ms; hover widens 4 px. Tap restores that bar only; each bar minimises/restores independently (reader bar vs drawing bar). Choice remembered (`ln-shell-v1` becomes a settings key). Floating bar: bottom centre of the main column, 16 px up (phone 12 above the tab bar), glass pill, 44 pt targets, ends with separator + minimise button; first-use pulse after 45 s then every 3 min until used once (JS 600-624). Edge handle (JS 625-715): draggable, snaps to left/right, `aria-label="Show X (drag to move)"`.

**SH-14 Layers and breakpoints.** Scale (SS 8): tab bar 30 · floating bar 40 · chips 41 · drawer scrim 59 · drawers 60 · sheet scrim 79 · sheet 80 · dialog 85 · pop 86 · tag picker 88 · toast 90. Today's scale (`index.css:20-24`: bar 20, pill 30, popup 40, toast 50) and loose values (`z-[39]`, `z-[70]`, `z-[2147483000]`, `z-50`) are mapped to it by the area slices; the lint count may only go down.

States for the whole shell: empty (new account: Notebooks space shows EmptyState), error (ErrorBoundary kept), offline ("Offline" status text next to Saved; everything local keeps working), phone ≤ 640, iPad portrait (docked sidebar OR panel, never both below 1180) and landscape (≥ 1180 both), Night / Day / Sepia, reduced motion, reduced transparency, hover-less touch.

### 4. When I do X → Y

Each line is one e2e test (chromium + ipad-webkit). B = Beginner, P = Professional (with unlock id).

**Parts**

| Id      | When I do X                                                | Then Y                                                                                                         |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| SP-01   | open `#/design-tokens` in Night, Day, Sepia                | every token swatch has contrast ≥ 4.5 (text) / 3 (UI) and the card fill reads over the page in all three       |
| SP-02   | tap a ▾                                                    | its card opens in 200 ms, 8 px below the bar, left edge on the ▾, arrow on the ▾, ▾ looks pressed              |
| SP-03   | tap outside, press Esc, or open another card               | the card closes in 130 ms, only one card is ever open, focus returns to the ▾                                  |
| SP-04   | pick a simple option in a pick card                        | the choice shows for 190 ms then the card closes, and the ▾ glows once                                         |
| SP-05   | open a card near the right edge                            | the card stays 12 px inside the screen and the arrow still points at the ▾                                     |
| SP-06   | open a card on a phone                                     | it is a bottom sheet with a grab bar, scrim, safe-area padding                                                 |
| SP-07   | the card body is taller than the screen                    | the body scrolls and the bottom edge fades                                                                     |
| SP-08   | add a 13th tab to a row                                    | the row stays one line, scrolls sideways, the thin track appears and the new tab scrolls into view             |
| SP-09   | tap "+" on a tab row                                       | a menu offers add, create your own, edit tabs; nothing overlaps a tab                                          |
| SP-10   | edit tabs: rename, drag a row, press ▲, remove             | the row updates live, mini preview matches, Undo restores each step                                            |
| SP-11   | press Left/Right on a focused tab                          | focus moves, Enter picks, the picked tab is in view                                                            |
| SP-12   | type in any system text field                              | a ✕ appears; tapping it clears the text and keeps focus; Esc clears first                                      |
| SP-13   | look at a note text box                                    | it has no ✕                                                                                                    |
| SP-14   | open the Tag picker                                        | the search box has focus and Pinned / Recent / Browse are listed                                               |
| SP-15   | type "hab"                                                 | tags match fuzzily and show paths such as `Life › Habits`                                                      |
| SP-16   | type a new name with a close existing one ("habbit")       | "Create #habbit" shows and a warning offers #habit                                                             |
| SP-17   | tick two tags in filter mode                               | the list filters, "2 ticked" shows, tags not in the results are dimmed                                         |
| SP-18   | pick 3 items then Tag                                      | rows show tri-state; tapping a "some" tag adds it to all; Undo reverts all                                     |
| SP-19   | press `#` on a list                                        | the picker opens as a popover (PC/iPad) or a sheet (phone)                                                     |
| SP-20   | hold a row 0.3 s and drag                                  | the row lifts, others slide away live, a drop-line shows, drop reorders, toast "Moved X · Undo"                |
| SP-21   | move my finger 10 px in 0.2 s on a row                     | no drag starts; the page scrolls                                                                               |
| SP-22   | drag text inside a dragged list                            | no text is selected                                                                                            |
| SP-23   | drop a wide widget between two small ones                  | it lands there and the small ones wrap; an impossible spot snaps to the nearest fit; the widget never vanishes |
| SP-24   | press ▲ on the 2nd row, then Alt+↓ on the focused row      | it moves up one, then down one; focus stays on it; each is one Undo step                                       |
| SP-25   | open the Arrange sheet                                     | big rows with grip, ▲▼, menu; preview strip matches the real row                                               |
| SP-26   | remove a row in the Arrange sheet, press Undo              | the row returns to the same place                                                                              |
| SP-27   | press Reset in the Arrange sheet                           | the row goes back to default and says so                                                                       |
| SP-28   | open the Arrange sheet on a phone                          | it fills the screen height as a sheet                                                                          |
| SP-29   | open a space with no data                                  | the Empty state shows icon, one line, one button naming the next step                                          |
| SP-30   | select a box, a picture, a table                           | one Object bar appears next to it, never covering it; other selections clear                                   |
| SP-31   | select 3 table rows                                        | the bar says "3 selected"; Delete removes all; one Undo restores all                                           |
| SP-32   | pick "This month" in the Time range bar                    | every widget in the template shows this month; the range line reads the dates                                  |
| SP-33   | choose Custom range with end before start                  | ✓ is disabled and a line says why                                                                              |
| SP-34   | open the gallery on any width                              | every section in SP-12 renders with every state cell                                                           |
| SP-B01  | (Beginner) open the Tag picker                             | no category tree, no Include sub-tags; flat results with paths                                                 |
| SP-B02  | (Beginner) open Time range bar                             | presets and one custom range; no "Edit time range"                                                             |
| SP-P01  | (Professional, `lib.tagCategories` on) open the Tag picker | Browse by category tree, parent pick on create, Any/All and Include sub-tags show                              |
| SP-P02  | (Beginner, `lib.tagCategories` unlocked) same              | the same extras show while the level is still Beginner                                                         |
| SP-P03  | (Professional, `nb.dragGrip` on) look at notebook rows     | a grip shows on each row; with it off the row still long-hold drags                                            |
| SP-P04  | (Professional, `nb.move` on) open a notebook menu          | Move up, Move down, Move to top show                                                                           |
| SP-P05  | (Professional, `nb.tabOptions` on) edit a notebook's tabs  | rename, hide and colour options show                                                                           |
| SP-B06b | (any level) press Edit time range                          | name, presets, reorder, ✓ ✕ Reset, guided example                                                              |

**Shell**

| Id    | When I do X                                                             | Then Y                                                                                     |
| ----- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| SH-01 | load any space on 1366 px                                               | rail 56 px, sidebar 288, top bar 52, page does not scroll, only the content area does      |
| SH-02 | load on 390 px                                                          | no rail; a 56 px tab bar with 4 spaces + More; safe-area padding                           |
| SH-03 | tap each rail icon                                                      | the space changes, the active item has accent-soft + 3 px bar + `aria-current`             |
| SH-04 | hide Home in Settings                                                   | Home leaves the rail; Notebooks cannot be hidden                                           |
| SH-05 | tap the Day/Night icon, then pick Sepia in the gear menu                | theme flips, then sepia, and is remembered after reload                                    |
| SH-06 | the gear menu opens                                                     | Settings, Save & restore, Trash, Device mode, Help, Layers, Refresh app, themes all listed |
| SH-07 | look at the top bar on Home                                             | Undo and Redo are visible and disabled; after a Home edit Undo is enabled                  |
| SH-08 | press Ctrl+Z in a search box                                            | the text undoes, the page does not                                                         |
| SH-09 | Settings › Show Undo and Redo on a computer = off, device mode Computer | the pair is hidden; Ctrl+Z still works; on iPad it is still shown                          |
| SH-10 | open any space                                                          | the Beginner / Professional toggle is at the top; switching re-lays the screen in 180 ms   |
| SH-11 | open a book and a notebook page                                         | the panel toggle shows, crumbs truncate with …, Saved shows while editing                  |
| SH-12 | tap Back / Forward                                                      | history moves; both disabled when there is nowhere to go                                   |
| SH-13 | resize the sidebar with keys                                            | width changes by one step, never below 200 or above the max                                |
| SH-14 | iPad portrait: open the panel while the sidebar is docked               | the sidebar steps aside; panel docked; toggle gives the sidebar as an overlay              |
| SH-15 | open the sidebar drawer on a phone                                      | 86 vw (max 320), scrim, tap outside closes, Esc closes                                     |
| SH-16 | tap Collapse all in the Notebooks group                                 | all trees fold; the same button reads Expand all                                           |
| SH-17 | open a notebook page                                                    | the panel opens on Pages with the current page centred                                     |
| SH-18 | hold a thumbnail 0.3 s and drag it                                      | the page reorders with a drop-line and an Undo toast                                       |
| SH-19 | open More on a notebook                                                 | a fixed 440 px sheet on the right; tab changes do not change its size                      |
| SH-20 | press Cancel with edits                                                 | a "Discard changes?" dialog; nothing changed until Done                                    |
| SH-21 | open More on a phone                                                    | full-width sheet from 8 px below the top                                                   |
| SH-22 | open a destructive dialog                                               | the action is red, the line "You can undo this." shows, Esc cancels                        |
| SH-23 | open a pop menu near the bottom                                         | it flips up and stays on screen; Delete is last after a divider                            |
| SH-24 | delete a page                                                           | a toast with Undo shows 6 s above the tab bar; Undo restores it                            |
| SH-25 | trigger two toasts                                                      | the second replaces the first; neither covers a title                                      |
| SH-26 | minimise the reader bar and the drawing bar                             | two chips stack; each restores only its own bar; after reload they stay minimised          |
| SH-27 | open a sheet over a floating bar                                        | layer order holds: sheet above scrim above bar                                             |
| SH-28 | set reduced motion                                                      | every shell transition is instant and every state still changes                            |

### 5. Step 3 parts (slice 0g step 3)

Ids S3-01 to S3-40 (lines below). Four parts: **Tool frame**, **Wizard steps**, **Status pill stack**, **Before / after view**. Flag: `foundation.parts` (same as step 1; only the gallery uses them until an area slice flips its own flag). Sources: `docs/plans/app-audit-2026-11-12.md:210-218, 368, 396`, [media-v2](media-v2.md) lines 17-34, 115, 123, [system-v2](system-v2.md) Y-P1 and line 54, [safety-v2](safety-v2.md) SF12, SF19 and line 63, [page-objects](page-objects.md) PO-33, [update-v2](update-v2.md) line 81. Section 1 rules apply to all four (tokens only, 44 pt targets, same words in Beginner and Professional, overlay manager, routers, `t()`).

Plain words for the owner:

- **Tool frame** = the full-screen workbench for a job with a result (crop a picture, scan, combine files, import). Big preview, steps on top, ✕ and ✓ at the bottom.
- **Wizard steps** = the row of numbered steps on top ("1 File · 2 Check · 3 Done") that you can tap to go back.
- **Status pill stack** = the small pills in the bottom corner (recording, now playing, timer, sync, update, zoom %). One tidy stack, so they never sit on top of each other.
- **Before / after view** = compare two versions: hold a button to see the original picture, or see two copies of a page side by side with the changes marked.

#### Tool frame

Path: `src/design/parts/ToolFrame.tsx`, `ToolFrame.css`. Grows from `src/reader/pdfTools/Shell.tsx` (audit line 210).

```ts
type ToolFrameProps = {
  title: string // "Edit picture"
  steps?: WizardStep[] // 2 to 6; omitted = a one-step tool, the title shows alone
  step?: string
  onStep?(id: string): void
  preview: ReactNode // fills the middle
  tools?: ToolAction[] // one row above the footer; options open as ▾ cards (SP-02)
  compare?: { label?: string; onShow(on: boolean): void } // Before / after button (hold mode)
  history?: { canUndo: boolean; canRedo: boolean; undo(): void; redo(): void }
  dirty: boolean // ✕ asks "Discard changes?" only when true
  canDone: boolean
  doneLabel?: string // default t('ui.done'); "Next" on a step that is not the last
  busy?: { label: string; progress?: number; onCancel?(): void } // "Reading the text… 40%"
  hint?: string // one muted line in the footer
  onDone(): void // the whole result = ONE history step on the page
  onClose(reason: 'x' | 'esc'): void
}
```

Layout (media-v2:31): **full screen**, over the shell and the phone tab bar (system-v2 Y-M1), page background `--surface-0`, safe-area padding on all four sides.

- **Top bar 52 px:** title 15 px / 650 on the left (truncates with …) · Wizard steps in the centre (when `steps`) · on the right Undo, Redo (the SH-05 buttons, working on the tool's own history) and the Before / after button (when `compare`). All 44 pt targets, 8 px gaps, 12 px side padding.
- **Preview:** fills the rest with 16 px margins on every side; content is centred and scaled to fit, never cropped by a bar; pinch zoom and two-finger pan stay inside the preview.
- **Tools row (optional) 56 px:** icon + word buttons, 44 pt, centred, 4 px gaps. A tool with choices carries a ▾ and opens a 304 / 376 px card above the row. When the row would be wider than the screen the last items fold into "…" (pop menu); it never scrolls sideways.
- **Footer 64 px:** ✕ left (quiet button, "Cancel"), ✓ right (accent button, "Done" / "Next"), 44 pt high each, 16 px side padding; the centre holds the hint (13 px muted) or, while busy, the label + a 6 px progress track. Icon + word at ≥ 641 px; icon only on phone (word stays in `aria-label`).
- Hairline (`--card-hair`) under the top bar and above the footer. No shadows, no glass on the bars (calm, content first).
- **Phone (≤ 640):** same frame; the steps collapse (see Wizard steps); the tools row keeps at most 5 buttons before "…".

Rules:

- One Tool frame at a time, placed by the overlay manager at `--z-tool` (D16). Cards, pop menus, dialogs and toasts open above it; the sidebar, panel, floating bars and minimise chips are covered and do not react.
- **✕ / Esc:** closes at once when nothing changed; with changes it opens the small dialog "Discard changes?" (SH-10). **✓ / Enter** (not while typing in a field): runs `onDone`; the page gets one history step and a toast with Undo when the result is not on screen.
- Every change inside the tool is one step of the tool's history (Undo / Redo in the top bar, Ctrl+Z / Ctrl+Y). The tool's history is dropped on close.
- ✓ is disabled (with a one-line reason in the hint) until `canDone`. While `busy`: ✓ shows a spinner, tools are disabled, ✕ becomes "Stop" when `onCancel` exists; closing never leaves a half result.
- Finger and Pencil never draw, type or select text in the frame; they move handles and press buttons only (media-v2:123). `user-select:none` on the frame except inside fields.
- The work survives a rotate, a resize and the on-screen keyboard (the footer rides above the keyboard).

States: opening; idle (clean); dirty; step change; ✓ disabled; busy (with / without %); error (inline line in the footer in `--danger` with an icon + "Try again"); offline (works; a tool that needs the network says so in the hint and disables ✓).

Keyboard / SR: `role="dialog"` `aria-modal="true"` `aria-label=title`; focus goes to the first tool (or the first field), Tab stays inside, focus returns to the opener on close. Order: top bar → preview → tools → ✕ → ✓. Busy progress is `role="progressbar"` and announced at 25 / 50 / 75 / 100 %.

Motion: opens 240 ms `--ease-out` (fade + scale .98 → 1), closes 180 ms; step change cross-fades the preview 180 ms. Reduced motion: instant.

Beginner/Professional: same frame, same words. Professional adds tools to the same row and steps to the same strip, each behind the area's unlock id (`tb.pictureEdit`, `pdf.toolsPlus`, `db.csvPlus`…); a Beginner with one switch unlocked sees just that tool.

#### Wizard steps

Path: `src/design/parts/WizardSteps.tsx`.

```ts
type WizardStep = {
  id: string
  label: string // "Match columns"
  state?: 'done' | 'error'
  pro?: string // unlock id; the step is absent while locked
}
type WizardStepsProps = {
  steps: WizardStep[] // 2 to 6
  value: string
  canGo?(id: string): boolean // default: any earlier step, and the next one when the current is valid
  onChange(id: string): void
  compact?: boolean | 'auto' // auto = compact when the strip does not fit, always at ≤ 640
}
```

Sizes: strip 52 px high (fits the Tool frame top bar; also used at the top of a Sheet or dialog body for sign-in and restore). A step = 24 px circle (number 12.5 px / 650, or a 14 px check when done) + label 13 px / 600, 8 px between circle and label, whole step a 44 pt target; steps joined by a 1 px hairline, 16 px minimum, 40 px maximum. Strip is centred and never wider than its box.

Looks: **current** = accent-filled circle, ink label, `aria-current="step"`; **done** = accent-soft circle with a check, label in soft ink; **upcoming** = `--card-well-2` circle, muted label; **error** = `--danger` ring + "!" in the circle and the words "needs a fix" in the name read aloud (never colour alone); **disabled** = 35 %.

Rules:

- **Clickable:** tapping a done step goes back and keeps everything typed in later steps; tapping the next step works only when the current step is valid (else nothing moves and the footer hint says what is missing); steps further ahead are not clickable.
- **One line, always.** No wrap, no sideways scroll. When it does not fit (or ≤ 640) it becomes compact: ‹ · "Step 2 of 4 · Match columns" (13 px / 600, truncates) · ›, both arrows 44 pt, with a 3 px progress line under it (accent on `--card-track`).
- The strip only shows where you are; the ✓ / "Next" button of the host (Tool frame footer, Sheet footer) stays the main way forward.
- A step with a locked `pro` id is left out and the numbers close up ("File · Check · Done" for a Beginner, "File · Match columns · Check · Done" with `db.csvPlus`).

States: per step default / hover (well) / pressed (scale .96) / focus-visible (2 px accent outline) / current / done / error / disabled; strip: full, compact.

Keyboard / SR: `<nav aria-label="Steps">` with an ordered list of buttons; Left / Right move focus, Enter / Space goes; a step that cannot be opened has `aria-disabled` and stays focusable so its reason can be read. A change is announced once: "Step 2 of 4, Match columns".

Motion: the accent fill and the progress line slide 180 ms `--ease-out`; the check draws 120 ms. Reduced: instant.

Beginner/Professional: same strip; only the number of steps differs through `pro` ids.

#### Status pill stack

Path: `src/design/parts/StatusPill.tsx` (one pill) and `src/app/overlay/pillStack.tsx` (the host and the `usePill()` hook; path named by system-v2:100, D17).

```ts
type PillKind =
  'recording' | 'playing' | 'timer' | 'sync' | 'update' | 'zoom' | 'custom'
type PillSpec = {
  id: string
  kind: PillKind // fixes the place in the stack
  icon: IconName
  label: string // "Recording 02:14", "Update ready", "120%"
  tone?: 'plain' | 'active' | 'problem' // problem = danger icon + words
  progress?: number // 0..1 ring around the icon
  onTap?(): void // opens the pill's own pop-up or screen
  action?: { icon: IconName; label: string; run(): void } // one inline button, e.g. Stop
  dismissable?: boolean // shows ✕ (update ready, updated)
  ttl?: number // ms; zoom 2000, "Updated to x" 4000
}
// usePill(spec | null): shows, updates or removes one pill. Owners never position their pill.
```

Sizes (media-v2:34, system-v2:54): the stack sits in the **bottom corner at the end side** (right; left in RTL), 16 px from the side and bottom edges, pills stacked upward with **8 px gaps**, end-aligned. Pill: 36 px high inside a 44 pt target, radius pill, padding 0 12, icon 16, label 13 px / 600 with tabular numbers, max width 240 px (truncates with …), glass card fill (`--card-fill`, blur 28, hairline, `--elev-1`). Inline action and ✕: 28 px circle inside a 44 pt target. Layer `--z-pills` (D16).

Place rules: the bottom offset follows `--sh-bottom`, so the stack is always above the phone tab bar, above the on-screen keyboard + its 44 px bar, above a floating bar or toast that reaches the corner (8 px gap), and above the Tool frame footer. It never covers a title, the toolbar, an Object bar or a sheet footer; when a docked sheet takes the corner the stack moves to the sheet's start edge.

Order from the bottom (fixed, so a pill never jumps): recording · now playing · timer · sync · update · custom · zoom. **At most 4 pills show**; more fold into a "+n" pill on top that opens a pop menu listing the rest. On phone, with 3 or more pills, all but the recording pill shrink to icon only (36 x 36; the label stays in `aria-label`).

Rules:

- Tap a pill = `onTap` (recorder, player, timer card, sync details, update details) which opens as a pop-up beside the stack, never over it.
- Sync shows only while it has something to say (syncing, offline, problem); a quiet "Saved" stays in the top bar (SH-04).
- Recording uses `--danger` for its dot and always shows the running time; it can never be folded into "+n" or dismissed (it is the proof that the microphone is on).
- A `ttl` pill fades after its time (200 ms); hover, focus or touch holds it.
- A problem pill stays until fixed or dismissed and says the problem in words ("Sync problem").
- Pills never take a tap meant for the page: only the pill's own 44 pt box reacts, the gaps pass through. A tap on a pill never draws, types or selects.

States: empty (nothing rendered, no reserved space); 1 pill; many; overflow "+n"; pill plain / active / problem / progress / hover / pressed / focus-visible; lifted (keyboard, toast, tab bar, Tool frame); icon-only (phone).

Keyboard / SR: the host is `role="region"` `aria-label="Status"`, reachable with F6 and in the Tab order after the page; pills are buttons with their full label; a new or changed pill is announced politely, a problem pill assertively; running times are not re-announced every second (the label is read on focus).

Motion: a pill rises 8 px + fades in 180 ms; the others slide to their place 160 ms (FLIP); leaving 200 ms fade. Reduced: instant.

Beginner/Professional: same stack. Which pills exist is decided by their features (for example `audio.plus`, `paper.furniture`); the stack has no switch of its own.

#### Before / after view

Path: `src/design/parts/BeforeAfter.tsx`, `compareBlocks.ts` (pure, unit-tested). Grows from the Claude Inbox compare (audit line 218).

```ts
type BeforeAfterProps =
  | {
      mode: 'hold' // pictures, scan looks: one preview, hold to see the original
      before: ReactNode
      after: ReactNode
      beforeLabel?: string // default "Before"
    }
  | {
      mode: 'side' // history, conflicts: two copies with the changes marked
      before: CompareDoc
      after: CompareDoc
      beforeLabel: string // "Before" · "Mine" · "12 Nov, 09:40"
      afterLabel: string // "After" · "Theirs" · "Now"
      actions?: ReactNode // footer: Keep mine / Keep theirs / Keep both, Restore this version…
      onCopy?(blocks: string[]): void // "Copy from this version" (area's unlock id)
    }
```

**Hold mode** (media-v2:18, MD-04): a 44 pt button "Before / after" (icon + word; icon only on phone) in the Tool frame top bar. Press and hold = the preview shows the original with a "Before" tag (pill, 28 px high, 12.5 px / 600, 12 px inside the top-start corner of the preview); let go = back to the edit. A short tap (under 0.3 s) or Space / Enter switches it on until the next tap (`aria-pressed`), so nobody has to keep holding. The picture does not move or resize between the two; the swap cross-fades 120 ms. Handles hide while "Before" shows.

**Side mode** (safety-v2 SF12, SF19): two equal columns with a 12 px gap; each has a 44 px header (label 13 px / 600 + a muted date line 12 px) and a read-only body on `--surface-1`, radius 16, padding 16. The two bodies scroll together. Above the columns one 44 px row: "n changes" (13 px muted) and ▲ ▼ "Previous change / Next change" (44 pt each). Marks, never colour alone: **added** = accent-soft background + a 3 px accent bar and "+" at the start edge; **removed** = `--danger` 14 % tint + strike-through + "−"; **changed** = both, word by word inside the block; unchanged runs longer than 6 blocks fold into "12 lines the same" (tap to open). Footer = the area's actions through the host's footer (Sheet or Tool frame). **Phone (≤ 640): the columns stack, Before on top, After below** (safety-v2:63), each half the height and scrolling together.

Rules: read-only (no typing, no drawing; text can be selected only when `onCopy` is given); the current change is ringed (1.5 px accent) and centred when ▲ ▼ are used; choosing an action is one history step with an Undo toast; the copy not chosen is always kept in History by the area slice; a long page is compared in chunks so the screen never freezes (skeleton until the first screen is ready).

States: hold: after (default), before (held or pressed on), no original (button disabled with reason). Side: loading (skeleton columns), no changes (EmptyState inline "These two are the same"), changes, one side missing ("This copy has no content"), error (Try again), stacked (phone).

Keyboard / SR: hold: the button says "Before / after, show the original", `aria-pressed`; the swap is announced "Showing before" / "Showing after". Side: each column is a `region` named by its label; marks read as "added", "removed", "changed"; N / P or the ▲ ▼ buttons jump between changes; the count is `aria-live="polite"`.

Motion: swap 120 ms; jump to a change scrolls 180 ms; fold opens 160 ms. Reduced: instant.

Beginner/Professional: the part is the same. Where it appears is the area's choice (History compare = `safety.historyCompare`; conflicts and Edit picture = everyone).

#### Gallery sections added (SP-12)

| Section (testid)                | One demo per state                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Tool frame (`gal-toolframe`)    | clean, dirty, with steps, tools row + "…" overflow, ✓ disabled with reason, busy with %, error, phone                  |
| Wizard steps (`gal-wizard`)     | 3 steps, 6 steps, done / current / upcoming / error / disabled, compact, Pro step hidden / shown                       |
| Status pill stack (`gal-pills`) | 1 pill, 4 pills, "+n" overflow, problem, progress, recording with Stop, lifted above keyboard / toast / tab bar, phone |
| Before / after (`gal-compare`)  | hold: after, before, disabled; side: changes, no changes, loading, one side missing, phone stacked                     |

The Tool frame demo opens from a button in its section (it is full screen) and closes with ✕.

#### When I do X → Y (step 3)

Each line is one e2e test (chromium + ipad-webkit), run on the gallery.

| Id    | When I do X                                                        | Then Y                                                                                                         |
| ----- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| S3-01 | open a Tool frame on 1366, 1180, 820 and 390 px                    | it fills the screen; top bar 52 px, footer 64 px, preview has 16 px margins; the shell and tab bar are covered |
| S3-02 | look at the footer                                                 | ✕ is on the left, ✓ on the right, each at least 44 pt; phone shows icons with spoken names                     |
| S3-03 | press ✕ or Esc with no change                                      | the frame closes at once, focus returns to the button that opened it, the page is unchanged                    |
| S3-04 | change something, then press ✕ or Esc                              | "Discard changes?" opens; Cancel keeps my work, Discard closes with the page unchanged                         |
| S3-05 | press ✓                                                            | the frame closes, the result is on the page as one history step; one Undo on the page removes it               |
| S3-06 | make two changes, press Undo twice, Redo once (buttons and Ctrl+Z) | the preview steps back and forward one change at a time; the page behind is untouched                          |
| S3-07 | the tool is not ready                                              | ✓ is disabled and the footer says why in one line                                                              |
| S3-08 | start a long job                                                   | the footer shows the label and progress, tools are disabled, "Stop" ends it with no half result                |
| S3-09 | give the tools row more buttons than fit                           | the last ones fold into "…"; the row never scrolls sideways; a ▾ tool opens its card above the row             |
| S3-10 | drag a finger or the Pencil over the preview                       | nothing is drawn, typed or selected; only handles move                                                         |
| S3-11 | open the keyboard or rotate the iPad with the frame open           | the footer stays visible above the keyboard and my work is kept                                                |
| S3-12 | Tab through the frame                                              | focus stays inside, in the order top bar, preview, tools, ✕, ✓                                                 |
| S3-13 | look at a 4-step strip on step 2                                   | step 1 has a check, step 2 is filled and `aria-current="step"`, steps 3 and 4 are muted                        |
| S3-14 | tap a done step                                                    | I go back to it and what I entered in later steps is still there                                               |
| S3-15 | tap the next step while the current one is not valid               | nothing moves and the hint says what is missing                                                                |
| S3-16 | tap a step two ahead                                               | nothing moves; it reads as not available yet                                                                   |
| S3-17 | view the strip on 390 px, or with 6 long names on 820 px           | it shows "Step 2 of 4 · name" with ‹ › and a progress line, on one line, no sideways scroll                    |
| S3-18 | press Left / Right then Enter on the strip                         | focus moves between steps, Enter opens an allowed step, "Step 3 of 4, Check" is announced once                 |
| S3-19 | a step has an error                                                | its circle shows "!" with a danger ring and the name reads "needs a fix"                                       |
| S3-20 | show one pill                                                      | it sits 16 px from the bottom and the end edge, 36 px high with a 44 pt target                                 |
| S3-21 | show recording, now playing, timer, sync and update together       | they stack 8 px apart in that order from the bottom, none overlapping; 4 show and "+1" lists the rest          |
| S3-22 | remove the middle pill                                             | the others slide together in 160 ms; the order of the rest does not change                                     |
| S3-23 | open the keyboard, show a toast, or use a phone with the tab bar   | the stack moves up and stays fully visible; it never covers a title or the toolbar                             |
| S3-24 | tap a pill, then tap the gap between two pills                     | the pill opens its pop-up beside the stack; the gap tap goes to the page                                       |
| S3-25 | change the zoom                                                    | the % pill shows for 2 s and fades in 200 ms; touching it keeps it                                             |
| S3-26 | press Stop on the recording pill, press ✕ on "Update ready"        | recording stops; the update pill leaves; the recording pill has no ✕ and is never inside "+n"                  |
| S3-27 | a sync problem happens                                             | the pill says it in words with a danger icon, is announced, and stays until fixed or dismissed                 |
| S3-28 | show 3 pills on 390 px                                             | all but recording become icon only, still 44 pt, with their full names read aloud                              |
| S3-29 | open a Tool frame while recording                                  | the recording pill sits above the frame's footer, still visible                                                |
| S3-30 | hold the Before / after button                                     | the original shows with a "Before" tag; letting go shows my edit; the picture does not move                    |
| S3-31 | tap the Before / after button briefly, or press Space on it        | it stays on "Before" until I tap again; "Showing before" is announced                                          |
| S3-32 | open a tool with no original                                       | the Before / after button is disabled and says why                                                             |
| S3-33 | open the side view with two versions                               | two equal columns named by their labels; added, removed and changed parts are marked with a sign and a tint    |
| S3-34 | scroll one column                                                  | the other follows                                                                                              |
| S3-35 | press ▼ "Next change", then ▲                                      | the next change is ringed and centred; the count reads "2 of 5"; ▲ goes back                                   |
| S3-36 | open the side view on 390 px                                       | Before is on top, After below, scrolling together                                                              |
| S3-37 | compare two identical versions                                     | "These two are the same" shows and the action buttons still work                                               |
| S3-38 | choose an action in the side view (for example Keep mine)          | it applies as one history step with an Undo toast; Undo brings the earlier state back                          |
| S3-39 | set reduced motion, then Night, Day and Sepia                      | every step 3 part changes state instantly; text contrast ≥ 4.5, marks and rings ≥ 3 in all three themes        |
| S3-40 | (Beginner, one Pro tool or step unlocked)                          | only that tool or step is added to the same frame and strip; the level stays Beginner                          |

#### Won't do (step 3)

- No real tools in this step: crop, scan, OCR, combine, CSV import, sign-in, History and conflict screens are built by their own slices (14, 13, 16, 17) on these parts.
- No second full-screen pattern: a tool with a result uses the Tool frame; no tool opens another Tool frame.
- No wizard with more than 6 steps, no branching step maps, no vertical step list.
- No dragging pills around, no pill on any other corner, no pill owner choosing its own position.
- No slider-wipe compare, no three-way merge, no editing inside the side view, no compare for ink strokes or pictures inside pages (text blocks only; a changed picture is marked "picture changed").
- No new colours, shadows or motion values; nothing a user can see while the flags are off.

#### Tests (step 3)

- **Unit:** `compareBlocks.ts` (added, removed, changed word by word, moved block counted once, folds over 6 same blocks, empty side, 2,000 blocks under the time budget); pill order and "+n" overflow (recording never folded); pill bottom-offset maths (tab bar, keyboard, toast, Tool frame footer); wizard `canGo` default rule and Pro step numbering; Tool frame close rule (clean / dirty / busy).
- **e2e:** one per line S3-01 to S3-40 on `chromium` and `ipad-webkit`; S3-10 and S3-24 use real touch and pen pointer events.
- **Screenshots:** the four gallery sections, Beginner / Professional x light / dark / sepia x iPad landscape (1180 x 820) / iPad portrait (820 x 1180) / phone (390 x 844) / PC (1366 x 768).
- **Accessibility:** axe on each section per theme; keyboard walk (Tab trap in the frame, arrows on the strip, F6 to the stack, N / P in the side view); 44 pt target check; contrast check for marks and rings.
- **Size budget:** all four are lazy chunks; first load stays ≤ 320,000 B (`npm run check:size`).
- **Rule checks:** no raw listeners, no raw z-index (the two new layers are tokens); lint counts may only go down.

#### Build order (step 3)

| #   | Commit                                  | Files owned                                                                             |
| --- | --------------------------------------- | --------------------------------------------------------------------------------------- |
| 12  | Layers + Wizard steps                   | `src/design/tokens.css`, `layers.ts` (`--z-tool`, `--z-pills`), `parts/WizardSteps.tsx` |
| 13  | Tool frame                              | `parts/ToolFrame.tsx`, `ToolFrame.css`, gallery `gal-toolframe`, `gal-wizard`           |
| 14  | Status pill stack                       | `parts/StatusPill.tsx`, `src/app/overlay/pillStack.tsx`, gallery `gal-pills`            |
| 15  | Before / after view + screenshot matrix | `parts/BeforeAfter.tsx`, `compareBlocks.ts`, gallery `gal-compare`, screenshot spec     |

Commits 13, 14 and 15 touch separate files and can run side by side after 12.

## Edge cases

- **Two overlays at once.** The overlay manager closes the first; the card, tag picker and pop menu never stack. A dialog may sit over a sheet (z 85 over 80).
- **Anchor scrolls away or is removed.** The card closes (never floats alone).
- **Keyboard on iPad.** Cards and sheets resize to the visual viewport; toast moves above the keyboard + 44 px bar.
- **Lost pointer-up.** Drags and chip drags end within 4 s (gesture router); no tool stays stuck.
- **Pencil vs finger.** Palm touches never start a drag; Pencil on a grip works; hold-to-drag ignores Pencil hover.
- **Very long names.** Tabs, crumbs, rows truncate with …; full text in the tooltip and `aria-label`.
- **RTL and long languages.** Parts use logical properties (`inset-inline`); the arrow of the card flips.
- **Huge lists.** Tag picker lists 5,000 tags without lag (virtual list after 200 rows); reorder lists past 100 rows use the grip only (no whole-row hold).
- **Offline.** All parts are local; Create tag works offline; nothing waits for the network.
- **Unlock turned off while a Pro tab is open.** The row falls back to the first visible tab and says so in a toast.
- **Hidden space opened by link.** `usableSpace` falls back to Notebooks.
- **Sidebar width saved wider than the new max.** Clamped on load.
- **Empty tab set after edits.** Defaults come back (Reset always available).

## Nothing lost

Every row is probed by the "nothing lost" test. Paths are today's files in `src/` (line numbers from the code at the time of writing).

| Today's feature                                                                                                      | Where (file:line)                                                                         | New home                                                  |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Four spaces, hide Home/Library/Review, Notebooks always stays, fallback space                                        | `app/spaces/spaces.ts:8-55`                                                               | Rail + tab bar (SH-02/03); `general.space.*`              |
| Space strip: slim column, bottom bar on phone, `aria-current`, per-space label, tooltip                              | `app/spaces/SpaceStrip.tsx:1-68`                                                          | SH-02/03 (keeps `Tip id="sidebar.spaces"`)                |
| Quiet corner gear: Settings, Save & restore, Layers gallery, Refresh app, Help, theme list                           | `app/spaces/QuietCorner.tsx:94-179`                                                       | Gear menu (SH-02); Day/Night button added                 |
| Space placeholder screen                                                                                             | `app/spaces/SpacePlaceholder.tsx`                                                         | EmptyState (SP-08)                                        |
| Top bar: sidebar toggle (PC) / drawer button (phone)                                                                 | `app/TopBar.tsx:57-79`                                                                    | SH-04                                                     |
| Panel toggle (`panel-toggle`, `aria-pressed`)                                                                        | `app/TopBar.tsx:48-59`                                                                    | SH-04                                                     |
| Back / Forward with disabled state                                                                                   | `app/TopBar.tsx:81-99`                                                                    | SH-04                                                     |
| Refresh button (`advanced.showRefresh`)                                                                              | `app/TopBar.tsx:100-112`                                                                  | SH-04                                                     |
| Screen slot (`onSlot`) and title                                                                                     | `app/TopBar.tsx:113-116`                                                                  | SH-04 crumbs + actions                                    |
| Device mode button                                                                                                   | `app/TopBar.tsx:117`, `app/DeviceModeMenu.tsx:17-53`                                      | SH-04 + gear "Device mode"                                |
| "Show tool bar" pill while the bar is off                                                                            | `app/TopBar.tsx:118-127`                                                                  | SH-04 / minimise chip (SH-13)                             |
| Undo / Redo pair, one history for editor and no-editor pages                                                         | `app/tools/HistoryButtons.tsx:1-50`                                                       | SH-05                                                     |
| Sidebar: today link, search row, quick access, calendar, databases, notebook tree, templates, study group, due badge | `notebooks/Sidebar.tsx:301-480`                                                           | SH-07 (groups unchanged)                                  |
| Sidebar: new notebook, rename, delete with Undo, add blank/template page, trash page with Undo                       | `notebooks/Sidebar.tsx:171-256,484-720`                                                   | SH-07 + SH-10/11/12                                       |
| Sidebar groups open/closed saved                                                                                     | `app/SidebarGroup.tsx:11-75`                                                              | SH-07                                                     |
| Sidebar resizer (drag, arrows, 200 to max)                                                                           | `app/SidebarResizer.tsx:13-63`, `app/sidebarWidth.ts:1-19`                                | SH-07                                                     |
| Sidebar drawer on phone, close button where the opener was                                                           | `notebooks/Sidebar.tsx:363-395`                                                           | SH-07 drawer                                              |
| Quick pages: Favourites, Recent                                                                                      | `app/QuickPages.tsx:112-136`                                                              | SH-07 Quick access                                        |
| Left panel tabs Pages / Outline / Audio (+ Annotations for books)                                                    | `app/panel/LeftPanel.tsx:46-49,451-470`                                                   | SH-08 (Audio becomes a Resource kind)                     |
| Left panel docked ≥ 1024 else overlay, close button                                                                  | `app/panel/LeftPanel.tsx:54,437-480`                                                      | SH-08 (1180, D2)                                          |
| Pages thumbnails, current centred, blank state, "more" cap                                                           | `app/panel/LeftPanel.tsx:101-184`                                                         | SH-08 Pages                                               |
| Outline: depth, toggles, numbers, fold, empty                                                                        | `app/panel/LeftPanel.tsx:270-320`, `panelModel.ts:65-160`                                 | SH-08 Outline                                             |
| Audio list, open recorder                                                                                            | `app/panel/LeftPanel.tsx:372-396`                                                         | SH-08 Resources                                           |
| Outline requests from elsewhere                                                                                      | `app/panel/outlineRequest.ts`                                                             | unchanged                                                 |
| Page tabs: extra tabs Mind map, Slides, Audio, Database, per-notebook, device default                                | `notebooks/pageTabs.ts:13-45`, `settings/PageTabsSection.tsx`, `app/summary/PageTabs.tsx` | SP-03 (`nb.extraTabs`, `nb.tabOptions`)                   |
| Pop-up rules (one at a time, outside tap, Esc, scroll grace 400 ms)                                                  | `app/popups.ts:1-166`                                                                     | Overlay manager 0f (SH-11, SP-02)                         |
| Menu popover: keyboard, flip, sub-menus                                                                              | `app/ui.tsx:181-400`                                                                      | SH-11                                                     |
| Toast: hold on hover/tap, Undo action, keyboard inset, timing                                                        | `app/ui.tsx:401-485`, `app/toastTiming.ts:1-26`, `app/appUi.ts:7-12`                      | SH-12                                                     |
| Confirm / Name / Choice dialogs, NameSheet, LazyNameSheet                                                            | `app/ui.tsx:486-700`, `app/NameSheet.tsx`, `app/LazyNameSheet.tsx`                        | SH-10                                                     |
| Empty state (icon, text, one action, test ids)                                                                       | `app/ui.tsx:142-179`                                                                      | SP-08 (props kept)                                        |
| Icon button, row menu button, rename input                                                                           | `app/ui.tsx:45-141`                                                                       | primitives `.ib`, SP-04, SH-11                            |
| Tag picker: find by name, "/" levels, create, ↑↓ Enter Esc, move-under / merge picks                                 | `tags/TagPicker.tsx:19-300`, `tags/tagService.ts:87-232`                                  | SP-05 (tag tools reuse it with `mode:'pick-one'`)         |
| Tag chips, page tags, tags section                                                                                   | `tags/TagChip.tsx`, `tags/PageTags.tsx`, `tags/TagsSection.tsx`                           | call SP-05                                                |
| Grip drag for floating bars (pointer capture, ink ignored)                                                           | `app/tools/gripDrag.ts:1-70`                                                              | SP-06 + SH-13                                             |
| Task drag onto a box (400 ms lift, `data-drop`, keyboard "Move to…")                                                 | `home/useTaskDrag.ts:1-30`                                                                | SP-06 (menu "Move to…" kept)                              |
| Top 3 pick and remove                                                                                                | `home/Top3.tsx:24-130`                                                                    | SP-06 + SP-07 (▲▼ added)                                  |
| Long-press 500 ms                                                                                                    | `app/useLongPress.ts:9-71`                                                                | SP-06 uses 0.3 s for drag; 500 ms stays for context menus |
| Edit-list sheet (reorder, add, remove)                                                                               | `app/tools/EditListSheet.tsx:26-389`                                                      | SP-07                                                     |
| Bar scroll and fade hints                                                                                            | `app/tools/BarScroll.tsx`, `ScrollFade.tsx`, `app/scrollHints.ts`                         | SP-03 track; SP-02 fade                                   |
| Reports Today / Week control                                                                                         | `home/ReportsTab.tsx:74-114`, `home/reports.ts`                                           | SP-10                                                     |
| Theme, glass, tokens, type, spacing                                                                                  | `design/tokens.css`, `design/glass.ts`, `app/theme.ts`                                    | SP-01                                                     |
| Gallery page                                                                                                         | `design/DesignTokensPage.tsx:1-245`, `design/designRoute.ts`                              | SP-12                                                     |
| Save notice, update bar/pill, mandatory update                                                                       | `app/SaveNotice.tsx`, `UpdateBar.tsx`, `UpdatePill.tsx`, `MandatoryUpdate.tsx`            | stay; move onto SH-12/SH-13 in their own slices           |
| Upgrade gate, error boundary                                                                                         | `app/UpgradeGate.tsx:74`, `app/ErrorBoundary.tsx`                                         | unchanged                                                 |
| Discard guard                                                                                                        | `app/useDiscardGuard.tsx:11`                                                              | SH-09 Cancel dialog                                       |

## Won't do

- No change a user can see while `foundation.*` flags are off.
- No new editor, no change of BlockNote or the stack.
- No custom re-mapping of the two view toggles yet (only the `views` prop).
- No second kind of card, no card opened from a card, no sideways-scrolling toolbar rows.
- No ✕ in note text boxes.
- No private copies of parts inside area slices; no raw document listeners, no raw z-index numbers.
- No Context menu strip, Command list, Dialog set, Toast queue, Banner in this file (step 2, see [page-menus](page-menus.md)). Step 3 parts have their own list in section 5.
- No Tag merge/rename UI beyond today's `tagTools` (picker only links to it).
- No collaboration, no native apps.

## Security check

Rules in [rules/security.md](../../rules/security.md) apply. For these parts:

- Tag names, tab names, preset names and row labels are user text: rendered as text (never as HTML), length-capped (tags 64, tabs 24, preset names 24), trimmed.
- ✕ field never logs or sends the cleared text; password fields are never wrapped.
- Saved layouts (tab sets, arrange order, time-range presets) are validated on load (unknown ids dropped, counts capped) so a broken or old backup cannot crash the shell.
- Unlock ids are checked on read, never trusted from stored layouts (a hidden Pro tab cannot be shown by editing storage).
- No remote images or fonts in parts; `loadInter` stays local.
- The tag picker never sends tag text to AI; "Suggested for this item" is local unless the owner approves AI cost.
- Undo toasts keep only ids, not content.

## Tests

- **Unit:** `timeRange.ts` (every preset, month ends, leap year, week start), tag fuzzy scoring and near-duplicate (the LIB rules), reorder maths (index, wide-item fit, snap), tab set load/validate/reset, toast timing (kept tests), layer scale constants (no duplicates, order), `useBreakpoint` at 640/641/1179/1180.
- **e2e per line id** (SP-xx, SH-xx above), on `chromium` and `ipad-webkit`; touch lines use real pointer events with pointer capture; the lost-pointer-up fault test for SP-20.
- **Screenshots:** gallery cells (SP-12) and shell, Beginner / Professional x light / dark (+ sepia on the gallery) x iPad landscape (1180 x 820) / iPad portrait (820 x 1180) / phone (390 x 844) / PC (1366 x 768).
- **Accessibility:** axe on the gallery and shell per theme; keyboard walk-through (Tab order, Esc, arrows, Alt+arrows); focus returns to opener; 44 pt target check; contrast check in the three themes; screen-reader names for every icon button.
- **Size budget:** first load stays ≤ 320,000 B; parts and shell lazy chunks reported; the Tag picker, Arrange sheet and Time range builder are lazy.
- **Nothing lost:** the table above is a probe list; each row is asserted to exist in the new build (flag ON) and to behave as before (flag OFF unchanged, pixel for pixel).
- **Rule checks:** lint counts raw listeners and z-index values; may only go down.
- **Regression:** BUG for "sidebar covers reader ✕" (layer scale), "toast covers plan title" (SH-12), "text selected while dragging" (SP-22).

## Sub-slice build order

One surface group per commit, each behind its flag, each with tests and a gallery section.

| #   | Commit                                              | Files owned                                                                                                   |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Tokens + layers                                     | `src/design/tokens.css`, `layers.ts`, gallery Tokens section                                                  |
| 2   | Card frame                                          | `parts/Card.tsx`, `Card.css`, `useAnchoredCard.ts`, gallery Card                                              |
| 3   | ✕ field + Tab row                                   | `parts/ClearField.tsx`, `useAutoClear.ts`, `TabRow.tsx`, `TabEditor.tsx`, `src/settings/tabSets.ts`           |
| 4   | Drag + Arrange sheet                                | `parts/drag/*`, `ArrangeSheet.tsx` (uses 0d gesture router)                                                   |
| 5   | Tag picker                                          | `parts/TagPicker/*` (data via `src/tags/tagService.ts`)                                                       |
| 6   | Empty state + Object bar + Time range bar           | `parts/EmptyState.tsx`, `ObjectBar.tsx`, `TimeRangeBar.tsx`, `timeRange.ts`, `TimeRangeBuilder.tsx`           |
| 7   | Shell: rail + tab bar                               | `src/app/shell/Shell.tsx`, `Rail.tsx`, `TabBar.tsx`, `shell.css`                                              |
| 8   | Shell: top bar, Undo/Redo, view toggle              | `TopBar.tsx`, `HistoryButtons.tsx`, `ViewToggle.tsx`                                                          |
| 9   | Shell: sidebar + left panel                         | `Sidebar.tsx`, `LeftPanel.tsx`, `SidebarGroup.tsx`, `SidebarResizer.tsx`                                      |
| 10  | Shell: sheet, dialog, pop menu, toast, chip, layers | `MoreSheet.tsx`, `Dialog.tsx`, `PopMenu.tsx`, `Toast.tsx`, `MinimiseChip.tsx`, `FloatingBar.tsx`, `layers.ts` |
| 11  | Gallery last pass                                   | `src/design/gallery/*`, `DesignTokensPage.tsx`, screenshot spec                                               |

The gallery section for a part ships in that part's commit; commit 11 only adds the global controls, the shell section and the screenshot matrix.

## Owner iPad check (3 steps)

1. Open the hidden page `#/design-tokens`. Switch Night, Day, Sepia. Scroll through the new sections. Tell me if anything looks different from the mock-ups you approved.
2. On the gallery, try each part: open a card, add tabs until the row scrolls, type in a search box and tap ✕, hold a row and drag it (watch the others slide), press ▲▼, open the tag picker and tick two tags.
3. Turn on "Try new design" for the shell. Check: Undo and Redo in the top bar on Home, the Beginner / Professional switch at the top, the bigger side lists, and open More once (this is the reminder to test the docked More sheet on the iPad).

## Decisions to review

Where sources disagree or are silent, I picked the safest option that drops nothing.

- **D1 Side list width.** `shell-spec.md` says 264 px; the owner said "a bit bigger, easier to tap" (MF 117); today's app is 260 / 280 / 300. Pick: 288 px for sidebar and panel (rows 48 high), PC resizer kept (200 to max). Change the one token `--sh-side` / `--sh-panel` if the owner wants another size.
- **D2 Panel dock width.** Today docks at 1024 (`LeftPanel.tsx:54`); shell-spec says 1180 for both columns. Pick 1180 (iPad landscape docks both; 820 and 1024 widths use an overlay for the second column).
- **D3 View toggle place.** The owner said "at the top of every space". Pick: top bar right side on PC/iPad, the space's title row on phone (the top bar is too narrow with Undo, Redo, Back, Forward).
- **D4 Toast time.** Mock 2.6 s / 6 s; app 2.5 to 8 s by length and 6 s minimum with an action, hold on hover. Pick the app's rule (it contains the mock's).
- **D5 Icons.** `shell-spec.md` section 9 picks Notebooks A (pencil); the owner's later review picked Notebooks B (ruled) and Review B (repeat arrows). Owner's review wins; the spec file is out of date.
- **D6 Time range builder.** Owner round 2 says "Edit period bar visible for all", so the builder is open in both levels with no unlock id.
- **D7 Hide Undo/Redo on PC.** The owner asked for a setting; no id exists. Pick: a plain setting "Show Undo and Redo on a computer" (default ON, Settings › General), not a Pro feature. Proposed name `general.showHistoryPC`.
- **D8 Tag picker levels.** LB2 has everything in one picker. Pick: Beginner gets search, Pinned/Recent/Suggested, paths, multi-select, create (parent "decide later"); the category tree, parent pick, Any/All and Include sub-tags are Professional (`lib.tagCategories`), each unlockable alone. Any stays the default in Beginner.
- **D9 Drag start.** Home asks for a grip (6 dots) plus long-hold; the favourites sheet drags from the grip at once; PENDING says long-hold 0.3 s. Pick: grip = immediate after 4 px; whole row = 0.3 s hold; today's 500 ms long-press stays for context menus; the 400 ms task lift moves to 300 ms.
- **D10 Layer scale.** shell-spec (30 to 90) differs from `index.css` (20 to 50). Pick the shell scale, with area slices migrating old values; tag picker gets 88 (between dialog/pop and toast).
- **D11 Close button size.** Design study says a 30 px circle; the favourites mock draws 28 px (inset 8 in a 44 target). Pick 28 px visible in a 44 pt target.
- **D12 Empty state look.** Today dashed box; shell mocks have none. Pick two variants: page (calm, no border) and inline (today's dashed box), so no screen loses its current look.
- **D13 Shell state key.** `ln-shell-v1` in the mock is browser storage; in the app, level, theme, minimised bars and tab sets are saved through the synced settings (`useSyncedSetting`), not a new key.
- **D14 Phone top bar.** Six 44 pt buttons do not fit with a title at 360 px. Pick: hide crumbs on phone (the space shows its own title), keep Back, Forward, Undo, Redo, panel/sidebar toggle and Search. If this is too tight on the owner's phone, Back/Forward move into the "…" menu (nothing removed).
- **D15 Object bar naming.** No spec names its keys; pick the v8 bar recipe and ask each area slice to list its own actions in its spec ("new shared part needed" only if a bar shape beyond a row of icons is required).
- **D16 Two new layers (step 3).** The layer scale has no place for a full-screen tool or the pills. Pick `--z-tool` 43 and `--z-pills` 45: both above the floating bar and chips (40, 41) so a tool covers them, and both below drawers, sheets, dialogs, pop menus and toasts (59 to 90) so "Discard changes?", ▾ cards and Undo toasts always show on top. Pills sit above the tool so the recording pill stays visible inside a Tool frame.
- **D17 Who builds the pill stack.** system-v2 (slice 17a) names `src/app/overlay/pillStack.tsx` as new. Pick: step 3 builds the part and the host at that path with gallery demos only; slices 17a (sync, update, timer) and 14 (recording, now playing, zoom) only move their pills onto it.
- **D18 Before / after has two modes.** media-v2 needs "hold to see the original"; the audit and safety-v2 need two columns with changes marked. Pick one part with `mode: 'hold' | 'side'` instead of two parts. A short tap also latches "Before" so people who cannot hold a button can still compare.
- **D19 Undo inside a Tool frame.** The frame covers the top bar, so Undo / Redo would vanish. Pick: the same two buttons in the frame's top bar, working on the tool's own steps; ✓ puts the whole result on the page as one step.
- **D20 Pill limit.** No source gives a number. Pick 4 visible pills, then "+n"; recording is never folded. Tool frame tools row 56 px and Wizard step sizes (24 px circle, 52 px strip) are also my picks, matched to the 52 px top bar in media-v2.
