# New app frame (flag foundation.shell): scroll, sidebar and rotation fixes

Full frame design: [shell-spec](../design/shell-spec.md). This file holds the behaviour lines of the 14 Nov iPad test fixes (slice fix-scroll). Findings: [ipad-test-findings-2026-11-14](../plans/ipad-test-findings-2026-11-14.md). Everything is behind the flag `foundation.shell`.

## When

- SC-01 When any list or panel overflows (notebook sidebar, pages panel, page, any other list) → it shows the ONE shared scroll bar (`src/design/parts/ScrollBar.tsx`): the thumb is 4 px (6 px while dragged) with a 44 pt touch area, an arrow at each end that dims at its end, 150 ms motion, token colours only; the system bar is hidden, so there are never two bars. (F3, F6; `e2e/scrollFrame.spec.ts`, `e2e/scrollHints.spec.ts`)
- SC-02 When a finger or the pointer starts on a row, the header or empty space of the notebook sidebar → the whole panel scrolls (one scroller, no inner list that scrolls by itself). (F2)
- SC-03 When another panel is drawn over a list → that list's bar is hidden. (F6)
- SC-04 When the thumb is drawn → it has at least 3:1 contrast against the surfaces in Light, Dark and Sepia. (`src/design/parts/scrollBarContrast.test.ts`)
- SC-05 When the Notebooks sidebar is open → it has no Review, All cards or All summaries row and no empty gap or lone divider; all three stay reachable in the Review space. (F4; `e2e/scrollFrame.spec.ts`)
- SC-06 When the iPad is turned (landscape, portrait, landscape) → the frame equals a fresh load in that orientation (sidebar width, top bar, tool bar, page width), even when Safari reports the old window size for a moment. (F8; `e2e/scrollFrame.spec.ts` on ipad-webkit)
- SC-07 When a list is shorter than two arrows and a usable thumb (148 px, e.g. a short card) → the bar shows the thumb only, inside the list's gutter, never over its content. (`e2e/scrollFrame.spec.ts`)
- SC-08 When the list sits in a panel with rounded corners (the sidebar drawer) → the bar starts and ends inside the curve. When the list is moved off the screen (a closed drawer) → its bar draws nothing. (`e2e/scrollFrame.spec.ts`)
- SC-09 When the device is touch or Pencil → the sidebar shows no keyboard shortcut labels (Alt+T, Ctrl+K). (`e2e/scrollFrame.spec.ts`)
- SC-10 When the flag is off → the page keeps the old 24 px bar exactly and no list gets the shared bar. (`e2e/scrollFrame.spec.ts`)

## Won't do

- No second scroll bar style, and no browser scroll bars.
- No change to the page's own touch rules (ink, pinch).
- No change to stored data.
