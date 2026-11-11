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

- [ ] Text and ink Undo after a reload (batch-1 item 47).
- [ ] Text strip: its own font, size and line-spacing controls.

## Owner tests waiting

See plans/owner-checks-pending.md (top) and the 7-item list from 10 Nov: grid, hold menu, Pencil taps, clash bar, Layout Assist, Text tool, ribbon and History.

## After Friday (ideas, not bugs)

plans/owner-ideas-batch-2-2026-11-10.md: update bar, Acrobat PDF tools, customizable bars, layers, shrink a box to scale its text. Also: book annotations, Views, snapshot Lasso. Fri 13 Nov: review the HANDOFF carry-overs.

## Housekeeping

- Owner's uncommitted edits in the main checkout: docs/INDEX.md, src/i18n/enO.ts, hiO.ts (ask).
- Empty worktree folders the owner can delete by hand: ln-l, ln-base2, ln-ci2, ln-g, ln-g2, ln-a, ln-base, dist-rb.

- CI fix pushed 11 Nov for Text box v2 (deploy pending green CI); check the deploy ran, then delete this line.

- Owner top bugs 1-3 (box line outline, caret spot, Pencil double/triple tap) fixed in code 11 Nov, need the owner iPad check. NOT done yet: Text box v2 steps 4-6 and Layout mode v2 (large; need a fresh session). Pencil-writes-text default in a box not verified.
- Grow-then-wrap box width and small-box-at-tap (coordinator spec 11 Nov) NOT built: the width is a grid column fraction, needs auto-width flag on lone boxes; do in a fresh session. Tap counts 1 caret/2 word/3 line/4 paragraph already match the code.
- Grow-then-wrap max width: stop about one page side margin before the right edge (coordinator 11 Nov); placement unchanged until the owner answers.
