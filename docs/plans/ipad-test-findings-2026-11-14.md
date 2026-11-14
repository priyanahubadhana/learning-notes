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
