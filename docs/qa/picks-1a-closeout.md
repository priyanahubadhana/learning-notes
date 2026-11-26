# Picks, phase 1A close-out (26 Nov 2026)

The rule (owner, 25 Nov; plan-after-1a.md section 5 step 2a): a pick in DECISIONS.md "Decisions to review" that is older than 7 days and built counts as accepted.
The product picks of the last week (19 to 26 Nov) are shown to the owner here. F2 holds: a pick that touches an owner decision is not closed without the owner.

## Shown to the owner (6)

1. **25 Nov. The Pencil hold stops at 18 px of travel.** If the Pencil creeps more than 18 px while held, it is no longer a hold (it was 36 px first). Tiny Pencil wobble under 2 px is ignored. This touches your 25 Nov numbers (3 mm, 0.8 s).
   The case against: a Pencil that slowly creeps past 18 px while held no longer holds.
   Keep or change?

2. **25 Nov. A Pencil hold also breaks when the Pencil travels more than 36 px in total.** This is so a small loop round two letters counts as a circle select, not a hold. A comma-sized wobble still holds. (Point 1 above later tightened the limit to 18 px.)
   The case against: a very shaky hold with more than 36 px of wobble is not a hold.
   Keep or change?

3. **25 Nov. One Pencil hold everywhere, and writing near a box edge stays ink.** The Pencil text selection now uses your hold (0.8 s), not a second, faster one (0.3 s). A pen stroke that starts in the border strip of a box stays ink; only a short tap there picks the box.
   The case against: holding then dragging to select with the Pencil gets slower; a very short dot right on the border picks the box.
   Keep or change?

4. **23 Nov. The bar and menu rules from the eleven part cards.** For example: a pinned bar wins over a new selection; names also show on keyboard focus; one slider drag is one Undo; quick fonts work offline, "More fonts" needs internet once; Delete by key never deletes text next to the cursor; the bar never blocks Ctrl+X, C, V. (Its right-click question was answered by you on 24 Nov: "always".)
   The case against: each one is written on its own card in docs/features/parts/ (the entry does not repeat them).
   Keep or change?

5. **23 Nov. The "..." button on the Action bar: when does it show the small down arrow?** The picture follows the tool table (the arrow shows even when the list holds only "Customise bar..."), not the spec line AB-05 (arrow only when the list holds more). The entry asked you which is right; no answer is written down.
   The case against: the two documents disagree, so one of them must change.
   Keep or change?

6. **20 Nov. Lasso, from the phase 2 finish plan.** A Lasso loop whose lift was lost still finishes and selects (instead of being thrown away). At text level the "Picks" filter is not used.
   The case against: not stated in the entry; a loop you did not mean to finish may select.
   Keep or change?

## Counted as accepted (150)

150 picks in the "Decisions to review" section are dated before 19 Nov (7 to 18 Nov). They count as accepted when built. More older picks sit in the later "Decisions to review (...)" sections (9 to 12 Nov) and in repeated copies of lines below line 1037 of DECISIONS.md; they are not counted one by one.

Entries that say a part is NOT built (they do not count as accepted for that part):

- 8 Nov, Notebooks locked alert: "Make a new recovery code" button, and the other alert levels.
- 8 Nov, Polish 2 item 9: the Settings default for new pages' paper style.
- 9 Nov, NotebookLM import and page tabs: drop or paste onto a page; a page filter on the Database tab.
- 9 Nov, Paste pipeline: "As text box" on paper pages; "Clean up with AI" as a 4th paste option.
- 9 Nov, Pasted addresses: Vimeo, Loom and .mp4 embeds; the Copy side (all formats at once, "Copy as...").
- 9 Nov, Table handles: row-height resize, double-click "fit content", touch drag of a column border.
- 9 Nov, ink on PDF and EPUB pages: "View as drawn".
- 10 Nov, Builder L batch 2: text and ink Undo steps do not survive a reload.
- 10 Nov, Book reader panel: read-aloud for books.
- 12 Nov, Calendar: auto-scroll sideways while dragging; dragging between Year-view days.
- 12 Nov, Batch H pictures: text wrap around pictures (and the other items listed in that entry).

## Not product picks (no owner action)

- Test, CI, method or tooling picks, 19 to 26 Nov: 13.
- Already decided or approved by you, or replaced by your later numbers (entries starting "Owner:", your chat answers, the approved Action bar pictures, the 21 Nov hold numbers): 45. These are left out of the list above.
