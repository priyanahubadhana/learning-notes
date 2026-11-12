# OPEN owner comments: Settings + Home (apply all, verify in a browser)

## Settings (settings-mock-v3.html)
S-a. "Icons A / B" switcher: the choice is already made (Library A, Notebooks B, Review B, rest A). REMOVE the switcher from EVERY mock (shell + all files) and hard-set the chosen icons.
S-b. Default page tabs: 3 by default, plus add / edit / remove / reorder more. Always ONE line (scroll if many). Preview the tab row in its own mini preview right there, not in the main preview.
S-c. Reduce glass "Auto": its preview looks bad; make the Auto preview beautiful and honest.
S-d. "Start new pages as": the user can pick ANY template (including their own) for the first new page.
S-e. Preview pane must not block the view (Tool bar preview especially); the preview shows exactly how the app will look.
S-f. "Let Claude use my notes" → rename the section "Let AI use my notebooks", generic (any connected AI/API), Claude listed first.
S-g. Show help (and every setting): make the changed thing CLEARLY visible where it changes (the glow + note), and the General preview must reflect it too.
S-h. General preview must update for EVERY General setting (it showed nothing).
S-i. "Your experience": a switch to turn it off, which moves it to the bottom (one-time setting). Below it, a Tours list: our experience-based guide included; other tour projects downloadable from the site (not downloaded by default).

## Home (home-mock-v2.html)
H-a. Edit layout: drag whole boxes (widgets) anywhere; holding the 6-dot grip drags items within a box. While editing the layout, text and inner content must NEVER get selected (user-select none, pointer capture on the grip). Confirm it also holds in the real app.
H-b. Done button: much more visible. Add Cancel (discard every change) and Reset. Undo/Redo always visible in the top bar on Home and every page (a setting can hide them on PC; Ctrl+Z/Ctrl+Y).
H-c. Delete button: far more visible.
H-d. Period bar editing: ✓ confirm, ✕ cancel and Reset.
H-e. Top 3: smooth drag with the app's insertion line (drop indicator) + ▲▼ buttons on the right.
H-f. Period bar: one uniform control (no separate symbol per widget); the user builds presets (name them: Today, Week, Year, custom date range…) and can add the bar to any template; a short guided example of how to build one.
H-g. ✕ clear in EVERY system text field (search, add topic…), not in note text.
H-h. "Built from" (Database / Transactions / Chart / Formula): an in-place plain explanation + a "How to build this" example.
H-k. Remove the leftover top-bar Done button (no purpose now that the sticky edit bar exists).
H-l. Widget drag: other widgets SLIDE out of the way live while dragging (live reflow preview), so the final layout shows before release; the displaced widget moves to its new spot. Apply the same live-reflow drag everywhere in the app (rule).
H-m. Wide widget dropped between two small boxes must land there: small boxes reflow (one wraps) so the wide widget takes the aimed spot; spots that can't fit are not offered, snap to nearest that fits; live landing preview (pairs with H-l). Real-build must-fix too.
H-n. Expense widget size menu (S/M/L): tapping a size made it disappear. Check whether the widget vanishes (bug) or the menu just closes; the size must apply visibly with a short animation and the menu should show the selected size; must never remove the widget.
H-o. 'Built from' must open a separate pop-up (sources + how numbers are worked out + How to build this), with ✕/Esc/tap-outside; the widget behind stays unchanged. Same for 'Built from: all'. Never swap a widget's content in place for explanations (app-wide rule).
H-p. Rename 'Period' → 'Time range' (button 'Edit time range', bar 'Show: Today / This week / This month…'); 'Built from' → 'Where this comes from'. All help/extra lines in everyday words (no source/filter/aggregate jargon), one idea per line, IDENTICAL wording in Beginner and Professional (Pro only adds detail). App-wide plain-words rule.
