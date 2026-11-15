# Approved plan vs new work: contradictions (15 Nov 2026)

Owner's request: check the earlier approved mock-ups and final plan against today's comments and the three new mock-ups (Phase 1 fixes, Settings v4, tool bar v9 brief); list only contradictions. Read-only audit by an Opus agent; sources cited in each line.

## Already matches the approved plan

Pen bar without names (toolbar-v8.md:56, TB-23); "on" states (design-study.md:65-75); + and ☰ favourites (owner-decisions.md:349, TB-52/53); New line and Backspace always on the bar (owner-decisions.md:113, TB-11); ⋯ card in the 2A.2 style; lasso rebuilt from the live lasso (owner replaced v8's on purpose); colours inside Format ("no card opens from a card", design-study.md:55); Page options folded, Pin kept; side list moves the page aside (owner's ask; shell-spec.md:77 to update); T5/T23 (DECISIONS.md:19); Settings v4 icons, one AI section, experience switch, any template, tabs editor, glass Auto, phone toast; offline never blocks (update-v2.md:125); fixed-height bar (R19 option given).

## Contradictions (Claude's pick in bold)

1. Update lock-out: decided "app stays blocked until it updates" (owner-decisions.md:74; update-v2.md:129); new "Not now" on a failed update. **Allow "Not now" only when nothing was installed; storage-change case stays blocked.**
2. ✓/✕ place: decided footer (owner-ui-patterns.md:22; shell-spec.md:158); new: top. **Top on sheets everywhere; quick pickers still close by themselves; rewrite the two rule lines.**
3. Card on a card: decided never (design-study.md:55; TB-05); T16 asks own layer. **Put everything inside the card's tabs; a second layer only where unavoidable, then per T16.**
4. Eraser target: "highlights only" already a Mode tile and an Options switch (v7.js:979, :1019; one place per option). **The Highlighter/Text/Pen choice replaces both; Beginner stays simple.**
5. Format tabs: decided 3 in Beginner, 4 in Professional (design-study.md:101). **Keep that.**
6. Bar size: decided 52 px, Beginner icons only, Professional icon + name (toolbar-v8.md:22); panel 6: 64 px, names by mode. **64 px, names still by Beginner/Professional.**
7. Right sheets: shell-spec 440 px vs page-menus 376 px full height; panel 2 below the top bar. **Accept panel 2; one width (440) in both specs.**
8. Settings previews: "real previews in Phase 10" (findings:57) vs SET-B08/B09. **Build them now with v4.**
9. Settings v4 lacks Try new features, Test a phase, Pretend update. **Add them under Advanced; fix the test steps.**
10. Settings › Tool bar wording: v8 removed the All tools row and the Compact view setting, added Layouts and "Hide toolbar while writing". **Follow v8.**
11. The 2A reference picture: v8 vs v9. **Once v9 is approved it becomes the 2A reference.**

## Not decided anywhere yet

Light default ink in dark mode (and on light paper later); an eraser that erases typed text; "Back to pen" in ⋯ for everyone (was Professional, on the bar); update timer and slow thresholds; upright Pencil mode icons only; the Settings ⋯ "Search" tile repeating the search box; the "Shift K" key label on touch (R3); merging the duplicate "November 2026" pages (changes stored data).

## Owner's answers (15 Nov)

Yes to Claude's pick on 2, 3, 4, 6, 8, 9, 10, 11; yes to A (light default ink in dark mode), B (eraser can erase typed text), D (timer numbers), F (no Search tile in Settings ⋯), G (no Shift K label on touch). **C: no** ("Back to pen" stays as approved: Professional, on the bar). **1 and 7: yes, but make sure nothing can get stuck** (a failed update always has a way forward; sheets always close). Asked to explain: E (upright Pencil mode icons only) and H (merging the two November 2026 pages). 5 (Format tabs) not answered yet.

Later the same day: **E: option 1** (upright Pencil mode shows icons only; names come back sideways; a long press shows the name). **H: option 1** (merge the two "November 2026" Journal pages into one, backup first, nothing lost; a planned task after the Phase 1 fixes, checked against the backup before the owner sees it). **5: yes** (Format: 3 tabs in Beginner, 4 in Professional).

Then: **the page top bar loses its back < and forward > arrows; Undo and Redo move there (top left, before the page path) and leave the tool bar** (owner picked this, 15 Nov). Going back stays possible through the page path and swipe back. **All mock-ups must show the same shared parts** (top bar, tool bar, icons): the owner saw an old tool bar and old pen icons in one picture; the manager checks all three against the decisions.
