# New app frame (flag foundation.shell): scroll, sidebar and rotation fixes

Full frame design: [shell-spec](../design/shell-spec.md). This file holds the behaviour lines of the 14 Nov iPad test fixes (slice fix-scroll). Findings: [ipad-test-findings-2026-11-14](../plans/ipad-test-findings-2026-11-14.md). Everything is behind the flag `foundation.shell`.

## When

- SC-01 When any list or panel overflows (notebook sidebar, pages panel, page, any other list) → it shows the ONE shared scroll bar (`src/design/parts/ScrollBar.tsx`): the bar is 22 px wide, the thumb 8 px (12 px while dragged) with a touch area as wide as the bar (22 px, SC-18) (P1.1: was 20 / 4 / 6 px), an arrow (22 px wide inside the gutter, 38 px tall, 44 pt tall on touch) at each end, so an arrow never reaches over a row that dims at its end, 150 ms motion, token colours only; the system bar is hidden, so there are never two bars. (F3, F6; `e2e/scrollFrame.spec.ts`, `e2e/scrollHints.spec.ts`)
- SC-02 When a finger or the pointer starts on a row, the header or empty space of the notebook sidebar → the whole panel scrolls (one scroller, no inner list that scrolls by itself). (F2)
- SC-03 When another panel is drawn over a list → that list's bar is hidden. (F6)
- SC-04 When the thumb is drawn → the colour the bar USES (`--sbar-thumb`: the muted ink in Light and Sepia, the soft ink in Dark) is at least 3:1 on every surface it can sit on (canvas, surfaces 0 to 3) and on the track drawn under it, in Light, Dark and Sepia; also measured on the rendered page. (14 Nov check read one token against two surfaces and never the page or the track; rewritten in P1.4. `src/design/parts/scrollBarContrast.test.ts`, `e2e/scrollBarLook.spec.ts`)
- SC-05 When the Notebooks sidebar is open → it has no Review, All cards or All summaries row and no empty gap or lone divider; all three stay reachable in the Review space. (F4; `e2e/scrollFrame.spec.ts`)
- SC-06 When the iPad is turned (landscape, portrait, landscape) → the frame equals a fresh load in that orientation (sidebar width, top bar, tool bar, page width), even when Safari reports the old window size for a moment. (F8; `e2e/scrollFrame.spec.ts` on ipad-webkit)
- SC-07 When a list is shorter than two arrows and a usable thumb (156 px; 168 px on touch, where each arrow is 44 pt; e.g. a short card) → the bar shows the thumb only, inside the list's gutter, never over its content. (`e2e/scrollFrame.spec.ts`)
- SC-08 When the list sits in a panel with rounded corners (the sidebar drawer) → the bar starts and ends inside the curve. When the list is moved off the screen (a closed drawer) → its bar draws nothing. (`e2e/scrollFrame.spec.ts`)
- SC-09 When the device is touch or Pencil → the sidebar shows no keyboard shortcut labels (Alt+T, Ctrl+K). (`e2e/scrollFrame.spec.ts`)
- SC-10 When the flag is off → the page keeps the old 24 px bar exactly and no list gets the shared bar. (`e2e/scrollFrame.spec.ts`)
- SC-11 When the Apple Pencil (pointerType "pen") taps an arrow, taps anywhere across the bar's width or drags the thumb → it works exactly like a finger and nothing behind the bar (tool bar, rows) gets it; the whole bar width is the live track (not only its 6 px line), and the thumb and track are marked `data-pen-native` so the Pencil-tap guard does not cancel their touch. (P1.1 / L4; `e2e/scrollBarPen.spec.ts`, chromium + ipad-webkit)
- SC-12 When a panel, card or sheet is drawn over any part of a list's bar column (the tool bar ⋯ menu, the bar's More card, the page More sheet over the page's right edge) → that list's bar is hidden while it is open and returns when it closes: one bar per edge. The ⋯ menu itself, when it overflows, shows its own bar from the start (not only after a touch), on iPad, short windows and phone. (P1.1 / L4; `e2e/scrollBarPen.spec.ts`)
- SC-13 When the bar is drawn with the frame on → bar 22 px, thumb 8 px at rest and 12 px while dragged, arrows 38 px, the thumb's touch area 44 pt wide and the arrows 44 pt tall on touch (the arrow box itself is 22 × 44 on a touch or Pencil device, the chevron unchanged; the thumb travels exactly between the arrows; a tap at an arrow's top or bottom edge scrolls), the arrow never wider than the gutter, tokens only; SC-04 contrast unchanged. (P1.1 / L1; `e2e/scrollBarPen.spec.ts`, chromium + ipad-webkit; `src/design/parts/scrollBarLogic.test.ts`)
- SC-14 When the pointer rests on, presses or drags the thumb → rest 8 px in `--sbar-thumb`; hover and press the stronger ink (`--sbar-thumb-hover`); drag 12 px in the accent; 180 ms, instant with reduced motion. (P1.4 / L1; `e2e/scrollBarLook.spec.ts`, chromium + ipad-webkit)
- SC-15 When the arrows are drawn → they are the app's Lucide chevrons (stroke 1.6), dimmed at their end; hover and press show a soft round well behind the chevron. (P1.4; `e2e/scrollBarLook.spec.ts`)
- SC-16 When the track is drawn → a quiet 14 px pill (`--sbar-track`) with a hairline, wider than the 8 px thumb; the thumb is a pill with a hairline glass halo. Tokens only. (P1.4; `e2e/scrollBarLook.spec.ts`)
- SC-17 When a bar state changes → 180 ms (`--dur-2`, ease-out); with reduced motion → none. (P1.4; `e2e/scrollBarLook.spec.ts`)
- SC-18 When a list overflows → no touch box of its bar (the thumb's area, the track, the arrows) overlaps a control of that list, and no control's touch box overlaps the bar, at any scroll position; every touch box stays in its own lane. The gutter stays 22 px; the thumb's touch area is as wide as the 22 px bar (and as tall as the thumb, 40 px at least). A tap and a Pencil tap on the sidebar's "+" create a notebook with 7 real notebooks, iPad upright and sideways, on a touch device. (P1.4 fix: a 44 pt wide touch area covered the "+"; `e2e/scrollBarHeader.spec.ts`)

## Won't do

- No second scroll bar style, and no browser scroll bars.
- No change to the page's own touch rules (ink, pinch).
- No change to stored data.
