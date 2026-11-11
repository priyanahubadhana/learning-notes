# Pending: one list (11 Nov 2026)

Owner rule: remove a line when it's solved. Tokens are low until Fri 13 Nov, so only Priority 1 is built now. The full detail for each item lives in the linked plan file.

## Priority 1: text box (built 11 Nov, waiting for the owner iPad checks)

Detail: plans/owner-bug-batch-3-2026-11-11.md (B3) and plans/owner-ideas-batch-2-2026-11-10.md item 4.

## Priority 2: live, waiting for the owner test

- Double-tap no longer erases a word (600 ms grace) and sign-in is kept; see owner-checks-pending.md. Delete this line after the owner checks it.

## Priority 1 (continued): layout, part of the text-box settings (owner)

## Priority 1 leftovers (text box)

- [ ] Layout button fixed on the MAIN toolbar (owner asked; now only in Text strip, box menu, More).
- [ ] Minimum width = longest word (now the column minimum).
- [ ] Apply to all pages: lazy per page (now all at once).
- [ ] Leftover worktree folders the owner can delete: ln-textbox, ln-textbox-base, ln-auth.

## Layout mode v2 (owner, 11 Nov 7:19; collecting notes, owner will share more)

- [ ] Current on-page Layout mode rejected ("trash"): (1) you can select only one thing (one preset or box); (2) no visible Done ✓ or Cancel ✕ on screen; (3) it sits ON the page and covers it.
- [ ] Wanted: a full-screen preview like Ctrl+P print preview. The page shown whole as a sheet on a dimmed backdrop, outside the page; layouts and controls around it; clear ✕ Cancel and ✓ Done always visible.

- [ ] Owner clarified: a POP-UP like the Ctrl+P print dialog. A big live page preview where boxes can be dragged and resized, plus a side panel with layout presets, box settings (style, colour, border) and text settings (font, size, spacing), and page or tab switching. All layout and box settings live in this one place. ✕ Cancel / ✓ Done.

- [ ] Owner answers: FULL-SCREEN pop-up (the preview takes the whole screen, like print preview, on every device). Box settings stay in the box ⋯ menu too (both places). Changes apply on Done (assumed; confirm).

## Text box v2 (owner, 11 Nov 7:32; references Notability + GoodNotes)

**Text box v2 progress (11 Nov):** DONE steps 1 (bugs: first box handles/menu/Box style, Lock removed, lone box width, top handle) and 2 (wrap); waiting for the owner iPad check in owner-checks-pending.md. Step 3 is partly in (frame 1.5 px, ≡ tab, side pills, min size = content). NEXT: finish 3 if needed, then 4 (8-point drag), 5 (bars above box and bottom format bar), 6 (groups). Each step: commit, push, CI green.

- [ ] Notability-style box: 4 corner dots (resize), a grab tab ≡ on top (move), a rotate handle (a line + white dot on the right side), and a floating bar above the box: edit, style, duplicate, cut, copy, lock, bring forward, send back, delete, more.
- [ ] Notability-style format bar at the bottom while typing: font, size − 35 +, colour, B / I / U, more, highlight, link.
- [ ] GoodNotes-style side pills on the left and right edges to change width.
- [ ] Rotation is new (text box rotate). Layer order (forward/back) ties into the parked layers idea.

- [ ] Owner 11 Nov 7:40 decisions for Text box v2 (polish the existing box only, no new features):
  - Grab handle: bigger and clearer, Notability-style ≡ tab on top of the box.
  - Drag is exclusive: while a box is dragged nothing else in the app reacts (no taps, toolbars, new boxes, menus) until it is dropped. Owner asked about a ✓ confirm after the drop (see question).
  - Group boxes (move together): wanted, with the method to be agreed.
  - Dropped from the list: layers, front/back, hide/show, recall card from a box, send to Summary, handwriting into a box, fold a box.

  - Grouping: the Lasso loops boxes, then Group; tap the group, then Ungroup (owner chose A).
  - Drag smoothness plan (8 points proposed in chat: lift and shadow on pick-up, 1:1 follow with the app frozen, landing outline and others slide, edge auto-scroll, gentle snap guides, settle animation and stays selected, drag back to cancel, 0.5 s calm after drop, palm rejection). No ✓ needed. OWNER APPROVED 11 Nov.
  - Selected box border clear by default like GoodNotes/Notability: a solid 1.5 px accent line with clear corner dots, visible on dark and light paper (ours is too faint). Line highlight/selection is fine, leave it.

## Priority 4: other bugs

- Built 11 Nov, waiting for the owner iPad checks (top of plans/owner-checks-pending.md). Delete this line after the owner checks them.

## Owner tests waiting

See plans/owner-checks-pending.md (top) and the 7-item list from 10 Nov: grid, hold menu, Pencil taps, clash bar, Layout Assist, Text tool, ribbon and History.

## After Friday (ideas, not bugs)

plans/owner-ideas-batch-2-2026-11-10.md: update bar, Acrobat PDF tools, customizable bars, layers, shrink a box to scale its text. Also: book annotations, Views, snapshot Lasso. Fri 13 Nov: review the HANDOFF carry-overs.

## Housekeeping

- Owner's uncommitted edits in the main checkout: docs/INDEX.md, src/i18n/enO.ts, hiO.ts (ask).
- Empty worktree folders the owner can delete by hand: ln-l, ln-base2, ln-ci2, ln-g, ln-g2, ln-a, ln-base, dist-rb.

- CI fix pushed 11 Nov for Text box v2 (deploy pending green CI); check the deploy ran, then delete this line.

- Owner top bugs 1-3 (box line outline, caret spot, Pencil double/triple tap) fixed in code 11 Nov, need the owner iPad check. NOT done yet: Text box v2 steps 4-6 and Layout mode v2 (large; need a fresh session). Pencil-writes-text default in a box not verified.
- Smart guides in the drag step (thin red edge/centre lines, equal-spacing marks, gentle snap); on/off switch ONLY in Settings (default on). Layout pop-up tidy: Line up left, Space evenly (3+), One box, Columns. Approved 11 Nov, not built.
- Smart guide look: 1 px magenta, only while dragging, each line spans from the dragged box edge/centre to the matched object only, plus a page-centre line and equal-spacing marks, gentle snap, never overlap. Not built.

## Owner answers 11 Nov (top priority: text box, typing, Pencil)

- Pencil in a text box = handwriting becomes text (Scribble) by default.
- BUG: the cursor lands in the wrong place or jumps.
- BUG: a Pencil double-tap to select doesn't work at all in a text box (the owner expects a paragraph selection; confirm word vs paragraph).
- BUG: too many highlights. Tapping a line draws a border or highlight around that single line or block. Instead only the WHOLE box shows as selected (GoodNotes): no per-line or per-block outline inside a box.
- Layout presets: the owner uses only "One box" (ask whether to keep the others in the pop-up).
- Progress: a short note per live part, with a 2–3 line test.
- Owner 4:45 (GoodNotes iPhone screenshots), the text box model:
  - Pencil/finger taps: 1 = caret, 2 = word, 3 = line, 4 = paragraph.
- Research 11 Nov, additions to consider for box layout and tidying (proposed to the owner):
  - Smart guides while dragging: centre/edge lines and equal-spacing hints (Keynote, Freeform, Notability pink guides).
  - Tidy: Line up left, Distribute evenly (3+ boxes), One box, Columns.
  - A dot grid or paper lines as a visual aid. A guide toggle in settings.
  - Box options as in Notability: rounded corners, wrap on/off.
  - Locked boxes are skipped by tidy (no lock for now).
- OWNER OK (11 Nov): smart guides while dragging, Notability-style thin red lines (edge/centre alignment + equal-spacing marks), gentle snap. Tidy choices: Line up left, Space evenly, One box, Columns. Guides on/off switch ONLY in Settings (not in the layout UI). Paper lines/dot grid already exist, nothing new. The owner can share Notability guide references.
- Notability guide reference (owner screenshots, 11 Nov):
  - Guides are thin 1 px magenta lines, shown only while dragging.
  - Each line runs from the dragged box's edge or centre to the matched object only (not across the page): top-edge to top-edge, left-edge vertical, centre horizontal.
  - Our version should be better: the same thin lines in the accent or magenta colour, plus small equal-spacing marks, a page-centre line, and a soft haptic-like snap. No overlap (Notability lets boxes overlap and that looks messy).
- Owner 11 Nov (text tool vs pen):
  - Text tool + Pencil writing inside a box = handwriting becomes text. Pen tool = ink on its own layer over the text, never converted.
  - Text tool: drawn arrows, lines, circles and rectangles become clean shapes on the ink layer (reuse the shape recogniser). A digit with a circle drawn round it becomes a circled number (②). One Undo turns it back.
  - FINAL: NO double-tap-to-make-a-box at all. A single tap with the Text tool makes a box (as before).
  - Box styles: sticky note/callout in Box style settings (no quick dots). Remember the last style. User-saved text/box presets.
- OWNER FINAL (11 Nov): 1a a tap inside a box with the Text tool puts the caret there straight away; 2a with a box selected, a tap on empty paper only deselects; 3b one bar while typing (the text bar above the keyboard), the box bar only when the box is selected and you're not typing; 4a boxes invisible until selected.

## Questions for owner

- Two taps at the same height: the second box goes just UNDER the first (every free box is its own row; others slide down). Do you want boxes side by side at the same height from a tap? That needs a different layout model (overlap checks per box). Safest option taken: stacked.

## Owner bug register (PDF, 11 Nov): plan first, questions pending

- BUG-001: turning a block into a checklist shows "Not saved yet" (src/i18n/en.ts:1282 save-failed bar). "Try again" does nothing, and typing feels laggy. NOT fixed yet (string still live; needs a repro).
- BUG-002: the floating format toolbar extends or moves beyond its bounds. Keep it at its size and position.
- BUG-003: toolbar turned off in Settings. After "Show" plus using a tool it should auto-hide again, with a very visible "Show toolbar" control.
- BUG-004: replace the black "Updating…" overlay (update.splash) with one full-screen MANDATORY update flow:
  - a short countdown, then auto download;
  - the download can be cancelled, but the app stays blocked until it updates;
  - progress, then a full-screen "installing" state with interactions blocked;
  - restore with all data kept;
  - handle failures and interruptions.
- BUG-005: settings need visual previews (e.g. toolbar on/off) plus a guided walkthrough highlighting Compact view, Ribbon and Toolbar.
- Standing instruction: ask until fully understood; no assumptions.
- OWNER answers for the register:
  - BUG-004: forced only when needed (storage change or data fix); other updates stay optional with the pill. 5 s countdown.
  - BUG-003: the bar hides when you start writing or typing; a small "Show toolbar" pill stays at the top edge.
  - BUG-005: the walkthrough shows on first launch, with replay in Help and Settings.
  - Still need: the BUG-001/002/003 screenshots resent as images (the PDF images couldn't be read).
- BUG-005 plan addition (owner, do NOT build yet): on first launch a small pop-up asks "New to the app / Used it a little / Experienced".
  - New → the full guided walkthrough, a few steps at a time (never too much at once).
  - Used a little / Experienced → no walkthrough (maybe a "Replay tour" in Help).
