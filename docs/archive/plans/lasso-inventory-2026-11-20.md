# Today's Lasso: what it does and why (Fable, 20 Nov 2026)

Read at `build/next` f65b1fa6. Purpose: the new text-level selection is added without changing anything on this page (owner rule, fable-brief-smart-select.md sections 12 and 14). `ctl` = src/ink/controller.ts, `IS` = src/ink/InkSurface.tsx. **(V)** = read in the code or docs; **(I)** = inferred, not proven. No test was run for this page.

## 0. How it is built (V)

- **A loop that starts inside a text box** belongs to that box's own ink engine: `ctl` `lassoDown` → `selectRegion` (ctl:2323).
- **A loop that starts on bare paper or the margin** is a second, separate path: `PaperFrame.lassoDown` / `lassoUp` (src/paper/PaperFrame.tsx:1778, 1796), an SVG loop, then `lassoAcrossBoxes` (src/ink/inkTransfer.ts:87).
- **Default picks: ink only** (inkSettings.ts:363, owner 7 Nov). With Text and Pictures off a loop round words selects nothing.
- **Which bar shows:** ink → the drawing menu, or SelectionBarV8 with toolbar.v8 on; words inside one block → the MiniToolbar; several blocks or a picture → SelectionBarV8 / SelectionMenu; whole boxes → the box bar or the group pill.
- **No letters today:** words are taken whole, by their centre (src/editor/lassoWords.ts:42, 118).
- **Taps under the Lasso on a paper box are counted by the Text tool's tap counter** (src/editor/tapSelect.ts:661): box not active: 1 box, 2 caret, 3 word, 4 line, 5 paragraph (e2e/boxTaps.spec.ts:135). On the page's own text a double tap selects nothing.

## 1. Inventory

### a. Starting a loop

| Behaviour                                                                                     | Why                                         | Code                       | Test                                |
| --------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------- | ----------------------------------- |
| The Lasso owns a clear pad over the page: text under it never reacts (no Scribble, no scroll) | owner 7 Nov; ink.md:12                      | ctl:807-833, 2162          | penSelect.spec:163; lassoPencil:123 |
| Pencil and mouse draw a loop; a finger scrolls (loops only when "Finger can draw" is Always)  | owner 7 Nov                                 | ctl:2057-2070              | penSelect.spec:223                  |
| A finger tap or mouse click on the pad places the caret                                       | typing stays one tap away                   | ctl:2145-2156, 2263-2294   | none                                |
| Free-hand or rectangle, fixed when the touch starts                                           | round 6 (R6-3)                              | ctl:2199-2209, 2257        | barFixes.spec:41; ownerLasso:235    |
| A loop may start on the margin or bare paper                                                  | owner batch A, 10 Nov                       | PaperFrame.tsx:1796-1856   | ownerLasso.spec:95                  |
| A tap on a stroke selects it (8 px reach)                                                     | ink.md:12                                   | ctl:2033, 2172-2191        | inkTools.spec:301                   |
| A new loop first clears the old ink and text selection, the caret and the browser's selection | owner item 15; DECISIONS 10 Nov             | ctl:2109-2120 `freshStart` | ownerLasso.spec:345                 |
| The page is not editable while a loop or handle is held                                       | Scribble then has nothing to write in       | ctl:1629-1636, 2164        | penSelect.spec:177                  |
| Pencil touchstart and touchmove are cancelled on the overlay                                  | the Pencil must not scroll or wake Scribble | ctl:507-523                | none                                |
| No loop starts under a bar, on a handle, or while a picture is being placed                   | DECISIONS 9 Nov                             | ctl:2074-2075, 2128        | none                                |

### b. What gets picked

| Behaviour                                                                                                                      | Why            | Code                            | Test                                   |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------- | ------------------------------- | -------------------------------------- |
| Ink: a stroke with at least 60 % of its points inside                                                                          | owner 7 Nov    | ctl:299, 2683-2696              | only through other loop tests          |
| Text pick on: the words whose centre is inside, first to last in reading order, as one text range                              | R6-17          | lassoWords.ts:118-160; ctl:2411 | lassoWords.spec:151, 162               |
| A line taken whole (or every word inside) becomes a block selection                                                            | owner 7 Nov    | lassoMenu.ts:100; ctl:2331-2358 | lassoMenu.test:36; lassoWords.spec:175 |
| With textbox.v2 a block is "whole" only when every word and symbol is inside                                                   | C5, 16 Nov     | ctl:2335-2339                   | c45-symbols-scribble.spec:357          |
| Pictures pick on: a picture mostly inside                                                                                      | ink.md         | ctl:2388-2405                   | penSelect.spec:150; lassoPicture:52    |
| Ink with text or pictures: the mixed menu; the handles move the ink only                                                       | owner 7 Nov    | ctl:2341-2346; MixedMenu.tsx    | lassoUniversal.spec:60, 92             |
| Boxes (textbox.v2): a margin loop holding all four corners picks the box; else a box whose centre is inside; groups come along | TB-32          | PaperFrame.tsx:1819-1856        | tb2-group.spec:86, 293                 |
| In books the Lasso picks ink only                                                                                              | ink.md (Books) | ctl:2330, 2393                  | none                                   |

### c. How the selection looks

| Behaviour                                                                            | Why                    | Code                | Test                |
| ------------------------------------------------------------------------------------ | ---------------------- | ------------------- | ------------------- |
| The loop: accent colour, dashed, halo and tint (rectangle: a tinted box)             | owner batch A; R6-3    | ctl:1132-1162       | ownerLasso.spec:95  |
| The paper-level loop is an SVG shape of the same look                                | same look              | PaperFrame.tsx:2924 | none                |
| Dashed box, 4 corner handles, side handles on sides of 110 px or more, a turn handle | DECISIONS 336          | IS:722-858, 1079    | inkTools.spec:218   |
| Fades in 220 ms, out 150 ms                                                          | owner item 21          | IS:661-687          | none                |
| A faint line to the linked text line (hidden with toolbar.v8)                        | ink rule 8; TB-33      | IS:719, 782-806     | paperInk.spec:133   |
| Selected words: a tint with thin handles and a loupe                                 | owner batch A, item 42 | ownSelection.ts:118 | ownerLasso.spec:377 |

### d. Move, resize, turn

| Behaviour                                                                                     | Why                | Code          | Test                   |
| --------------------------------------------------------------------------------------------- | ------------------ | ------------- | ---------------------- |
| A drag inside the box moves the selection                                                     | owner 7 Nov        | ctl:2193-2197 | inkTools.spec:218      |
| Corners resize keeping the shape; side handles stretch one way (0.1× to 10×)                  | DECISIONS 336      | ctl:2904-2985 | inkTools.spec:218      |
| The turn handle clicks to quarter turns within 5 degrees                                      | DECISIONS 336      | ctl:312, 2978 | lassoPencil.spec:194   |
| Two fingers on the box twist and move it                                                      | DECISIONS 336      | ctl:2986-3008 | none                   |
| A tap on the box or a handle without movement makes no Undo step                              | DECISIONS 335      | ctl:3010-3020 | none                   |
| Dropped ink links to the line under it (or a new box); a mixed drag moves the lines; one Undo | ink rules 5, 6, 10 | ctl:3039-3195 | paperInk.spec:133, 238 |

### e. The bar and its menu

| Behaviour                                                                                                      | Why                   | Code                            | Test                                         |
| -------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------- | -------------------------------------------- |
| Drawing menu row: Copy, Cut, Duplicate, Convert to text, Colour; the rest under ⋯ More                         | owner 7 Nov           | lassoMenu.ts:14-30; IS:870-1010 | lassoMenuOrder.spec:11                       |
| ⋯ More: Delete, Thickness, Make card, Add to Summary, Name this drawing, Paste, Replay, Copy / Save as picture | owner 7 Nov           | IS:960-1010                     | partly (none: Thickness, Name, Replay, Save) |
| Deselect ⓧ beside the count, always visible                                                                    | R6-6                  | IS:~985                         | barFixes.spec:237                            |
| The user chooses and orders the row (ten actions, this device)                                                 | DECISIONS 337         | lassoMenu.ts:46-70              | toolbarV9Lasso.spec:109                      |
| v8/v9 bar: Cut, Copy, Paste, Duplicate, Colour, Resize, Delete, ⋯; Professional adds nine                      | TB-33                 | SelectionBarV8.tsx              | toolbarV8Tools.spec:396                      |
| On words: Resize opens the Text size card; Paste follows Settings › Paste as                                   | TB-33; PM-40 to PM-46 | SelectionBarV8.tsx:~90-120      | none found                                   |

### f. How a selection ends

| Behaviour                                       | Code          | Test                |
| ----------------------------------------------- | ------------- | ------------------- |
| A tap or loop on empty paper lets go            | ctl:2276-2290 | lassoLoops.spec:192 |
| A new loop lets go of the old one at once       | ctl:2109      | ownerLasso.spec:345 |
| Esc lets go; Delete or Backspace deletes        | ctl:2792-2820 | lassoLoops.spec:192 |
| Leaving the Lasso tool lets go                  | IS:354-358    | none                |
| An action (Delete, Cut…) replaces or removes it | ctl:2822-2870 | inkTools.spec:218   |

### g. Guards

| Behaviour                                                       | Why                               | Code                  | Test                            |
| --------------------------------------------------------------- | --------------------------------- | --------------------- | ------------------------------- |
| A held pointer with no movement for 4 s is dropped              | stuck gestures on the iPad        | inputMachine.ts:29-35 | tools-machine.spec:36           |
| A tool change, an app switch or a lost capture ends a half loop | iPad lifts that never arrive (R7) | ctl:635-694, 814-820  | resume.spec:63; lassoPicture:86 |
| While a bar grip is dragged the Lasso ignores pointers          | round 6                           | ctl:2123              | unit only                       |
| A loop gives way to a press-and-hold text selection             | R7                                | ctl:2226              | none                            |

### h. Settings and i. ways in

- Shape, Picks (Ink / Pictures / Text), the menu row, Bigger Lasso, Professional switches `tb.lassoOptions` and `tb.selectionMenu` (inkSettings.ts:350-377; tests toolbarV9Lasso.spec:50-109).
- "Circle to lasso" pen gesture (off by default): a quick circle round ink selects it and switches to the Lasso (ctl:1913-1923; no end-to-end test). A Pencil tap on blank paper with a drawing tool goes back to the Lasso (ownerPlacement.spec:143).

## 2. No automated test today

Finger tap places the caret; Pencil touch cancel; two-finger twist; the no-move tap; fades; the paper-level loop's clean-up on cancel; leaving the tool clears the selection; loop gives way to hold-select; Thickness, Name this drawing, Replay, Save as picture; Circle to lasso end to end; the Lasso in books. **These get "freeze" tests before any selection code is touched.**

## 3. Code the Lasso shares with the Text tool (where a text change can leak in)

- `tapSelect.ts` (tap counter, `lookThrough`, `boxShift`): counts taps under the Lasso. Changed by ios-select on 18 Nov (1 s window, held lift).
- `ownSelection.ts` (`keepSelection`, `deselect`, the `ln-sel` tint): draws the Lasso's word tint; puts a collapsed selection back.
- `lassoWords.ts` (`wordRanges`, `wordsInRegion`, `selectTextRange`, `dropNativeSelection`): also used by scribbleDelete and the MiniToolbar.
- `miniToolbarOpen`, `selectGesture`, `selectBlocks`, the input machine, the edit lock, `isUiEvent`.
- `circleSelect.ts` and the circle recorder share nothing with the Lasso's engine (Text tool only).

## 4. Leads for the two rare bugs (owner, 20 Nov) (I, to prove with a failing test first)

(a) old outlines stay; (b) the next stroke still acts on the old selection for a moment.

1. **A hovering Pencil keeps a loop alive after a lost lift.** `lassoMove` (ctl:2212) takes moves with no button and no pressure; B11 filtered hover only for Pen and Eraser. Hover moves also keep the 4 s timer fresh, so the stuck loop is never dropped. Checked in the code (V); that this is the owner's bug is (I).
2. **While a loop is still open, the next touch is ignored** (`lassoDownInner` returns early, ctl:2124-2145) (V), so no fresh start runs until the old one ends.
3. `clearSelection` returns early when no ink is selected, which can leave a stale block selection (ctl:2705) (I).
4. The paper-level loop has no lost-capture handler, no input-machine entry and does not clear the old selection at touch-down (PaperFrame.tsx:1778-1796) (V).
5. Since the owner's last good check (19 Nov) the Lasso's own files changed only in B11 (dae84d1c); the shared files `tapSelect.ts` and `ownSelection.ts` changed in ios-select (18 Nov).
