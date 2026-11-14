# New app frame (flag foundation.shell): scroll, sidebar and rotation fixes

Full frame design: [shell-spec](../design/shell-spec.md). This file holds the behaviour lines of the 14 Nov iPad test fixes (slice fix-scroll). Findings: [ipad-test-findings-2026-11-14](../plans/ipad-test-findings-2026-11-14.md). Everything is behind the flag `foundation.shell`.

## When

- SC-01 When any list or panel overflows (notebook sidebar, pages panel, page, any other list) → it shows the ONE shared scroll bar (`src/design/parts/ScrollBar.tsx`): the bar is 22 px wide, the thumb 8 px (12 px while dragged) with a 44 pt touch area (P1.1: was 20 / 4 / 6 px), an arrow (22 px wide inside the gutter, 38 px tall, 44 pt tall on touch) at each end, so an arrow never reaches over a row that dims at its end, 150 ms motion, token colours only; the system bar is hidden, so there are never two bars. (F3, F6; `e2e/scrollFrame.spec.ts`, `e2e/scrollHints.spec.ts`)
- SC-02 When a finger or the pointer starts on a row, the header or empty space of the notebook sidebar → the whole panel scrolls (one scroller, no inner list that scrolls by itself). (F2)
- SC-03 When another panel is drawn over a list → that list's bar is hidden. (F6)
- SC-04 When the thumb is drawn → it has at least 3:1 contrast against the surfaces in Light, Dark and Sepia. (`src/design/parts/scrollBarContrast.test.ts`)
- SC-05 When the Notebooks sidebar is open → it has no Review, All cards or All summaries row and no empty gap or lone divider; all three stay reachable in the Review space. (F4; `e2e/scrollFrame.spec.ts`)
- SC-06 When the iPad is turned (landscape, portrait, landscape) → the frame equals a fresh load in that orientation (sidebar width, top bar, tool bar, page width), even when Safari reports the old window size for a moment. (F8; `e2e/scrollFrame.spec.ts` on ipad-webkit)
- SC-07 When a list is shorter than two arrows and a usable thumb (156 px, e.g. a short card) → the bar shows the thumb only, inside the list's gutter, never over its content. (`e2e/scrollFrame.spec.ts`)
- SC-08 When the list sits in a panel with rounded corners (the sidebar drawer) → the bar starts and ends inside the curve. When the list is moved off the screen (a closed drawer) → its bar draws nothing. (`e2e/scrollFrame.spec.ts`)
- SC-09 When the device is touch or Pencil → the sidebar shows no keyboard shortcut labels (Alt+T, Ctrl+K). (`e2e/scrollFrame.spec.ts`)
- SC-10 When the flag is off → the page keeps the old 24 px bar exactly and no list gets the shared bar. (`e2e/scrollFrame.spec.ts`)
- SC-11 When the Apple Pencil (pointerType "pen") taps an arrow, taps anywhere across the bar's width or drags the thumb → it works exactly like a finger and nothing behind the bar (tool bar, rows) gets it; the whole bar width is the live track (not only its 6 px line), and the thumb and track are marked `data-pen-native` so the Pencil-tap guard does not cancel their touch. (P1.1 / L4; `e2e/scrollBarPen.spec.ts`, chromium + ipad-webkit)
- SC-12 When a panel, card or sheet is drawn over any part of a list's bar column (the tool bar ⋯ menu, the bar's More card, the page More sheet over the page's right edge) → that list's bar is hidden while it is open and returns when it closes: one bar per edge. The ⋯ menu itself, when it overflows, shows its own bar from the start (not only after a touch), on iPad, short windows and phone. (P1.1 / L4; `e2e/scrollBarPen.spec.ts`)
- SC-13 When the bar is drawn with the frame on → bar 22 px, thumb 8 px at rest and 12 px while dragged, arrows 38 px, the thumb's touch area 44 pt wide and the arrows 44 pt tall on touch, the arrow never wider than the gutter, tokens only; SC-04 contrast unchanged. (P1.1 / L1; `e2e/scrollBarPen.spec.ts`)

## Won't do

- No second scroll bar style, and no browser scroll bars.
- No change to the page's own touch rules (ink, pinch).
- No change to stored data.
