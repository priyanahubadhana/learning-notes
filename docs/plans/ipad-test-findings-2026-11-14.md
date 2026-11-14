# iPad preview test findings (owner, 14 Nov 2026)

Owner is running the iPad checklist (docs/PENDING.md "iPad checklist (first preview)") in Safari at the preview. Findings are only noted here; nothing is fixed until the owner reviews the full list at the end.

## Part 1: done

- Switches stayed ON after closing and reopening. OK.

## Findings

- **F1. Sign-in asked again after every reopen.** Closing and reopening the app in Safari asks the owner to log in again each time. It should stay signed in. (Part 1, step 4.)
- **F2. Sidebar notebook list is hard to scroll.** In the left panel with the notebook and page list (New app frame on, Notebooks screen): dragging on a row scrolls fine, but starting the drag on empty space in the panel (where there is no row) does not scroll well. The whole panel should scroll from anywhere, easily. Screenshot: owner upload 14 Nov 06:04 (iPad portrait, Safari).
- **F3. Scroll position bar is too faint.** The sidebar (and other scrolling panels) needs a small visible scroll bar showing where you are and where the end is, with small arrows at the ends. Make it a little brighter, clearer and slightly bigger, not much. Must stay calm and within the design tokens.
- **F4. Remove "Review (20)", "All cards" and "All summaries" rows from the Notebooks sidebar.** They duplicate what the Review tab already has. Owner wants them gone from the Notebooks panel. (Check the never-drop-features rule: the features stay, reachable from the Review tab.) Screenshot: owner upload 14 Nov.
- **F5. Search pop-up: replace the red "Esc" with ✕ controls (touch-first).** In the "Search everything" pop-up, the red "Esc" text at the right of the search field is a keyboard hint, useless on iPad. Wanted: (a) a ✕ inside the search field that clears the typed text; (b) a small but visible ✕ that closes the whole pop-up, placed on or near the search bar. Keep Esc working on a keyboard. The "↑↓ move · Enter open · Esc close" footer is also keyboard-only; consider hiding it on touch. Fits the Definition of Done rule "✕ on fields and dialogs". Screenshot: owner upload 14 Nov 06:10.
- **F6. One scrolling behaviour and one scroll bar everywhere.** The page outline sidebar (left panel inside an open page, with "1.4 Hallucination", "Stage 2" etc.) has the same problem as F2: it does not scroll as freely as the main page on the right. Owner wants all scroll areas (notebook sidebar, page outline sidebar, the page itself, and any other scrolling panel) to scroll the same way as the main page does: from anywhere, smoothly. The page's scroll bar is too big: make it a little smaller. Then use ONE scroll bar style everywhere (sidebar and page alike), together with F3 (a little brighter, clear position and ends). Build it once as a shared part (rules/quality.md section 1), not per screen. Screenshot: owner upload 14 Nov 06:15 (red marks are the owner's).
- **F7. The screen sometimes freezes (UI gets stuck).** Happens now and then, with no clear trigger the owner could see. Needs investigation, not a guess: add a long-task / freeze recorder in the preview (main-thread blocks over ~500 ms logged with what was happening), reproduce on ipad-webkit under the checklist flows, and fix the root cause. Ask the owner what they were doing when it next happens.

## Part 2: done

- Frame works apart from F2, F3, F6 and F7.
- **F8. Layout breaks after turning the iPad sideways and back upright.** After a landscape → portrait turn, the open page does not hold its frame: the page outline sidebar keeps a wide landscape width and squeezes the page into a narrow column; the top bar (notebook / page title row) is gone and the tool bar is cut to a few tools with a stray scroll indicator; page blocks sit narrow with wide empty margins. Expected: after any rotation the layout is exactly what a fresh load in that orientation gives (sidebar width, top bar, full tool bar, page width). Add an e2e that rotates landscape → portrait → landscape on ipad-webkit and compares with a fresh load. Screenshot: owner upload 14 Nov 06:18. Related to step 6 of the checklist.
