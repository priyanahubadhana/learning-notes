# Settings v5: user stories

Status: draft for the Settings v5 plan (15 Nov 2026). Not approved as a build spec yet.

Sources:

- Mock: `settings-v5.html` (Fable, scratchpad; copy to `docs/mockups/settings-v5/` when approved). Pictures: `settings-v5-shots/1-first-page.png` to `8-phone-first-page.png`.
- Owner answers: end of [owner-decisions.md](../design/owner-decisions.md) and the "Decisions the owner needs to make" table in [Full customisation kept simple](../research/reports/Full%20customisation%20kept%20simple.md). Yes to the pick on 1 to 10 and 12. 11, 13, 14 and 15 are later (docs/IDEAS.md).
- Every v3 feature: [settings-v3.md](settings-v3.md) (SET-Bxx, SET-Pxx, N-xx).

How to read: each story is one thing a person wants. "Done when" lists checks a tester can see on the iPad (landscape unless said). Ids are `S5-xx`.

---

## 1. First launch and the experience question

**S5-01** As a new user, I want two quick choices on my first launch, so that the app starts close to how I work.
Done when:

- The first launch shows one "Welcome" dialog with two parts: "How well do you know this app?" (New, Used a little, Experienced) and "Pick a starter setup" (4 cards).
- Picking an experience pre-selects a matching starter (New → Simple, Used a little → Pencil first, Experienced → Everything on) until I tap a card myself.
- The dialog says "They only set starting values. Nothing is ever hidden." Tapping Start closes it and Settings shows the chosen starter as Current.

**S5-02** As a user, I want my experience answer never to hide anything, so that I can always find every setting.
Done when:

- After choosing New, every group still shows its Advanced entry and search still finds Advanced rows and test tools.
- There is no Beginner / Standard / Professional switch inside Settings that hides rows.
- "My experience" lives in Account (common rows) and in More › Experience; changing it later hides no row.
- Changing it later asks "Also apply the matching starter?" (owner, 15 Nov). Yes applies that starter with a toast and Undo; No changes only the label (toast with Undo).

**S5-03** As a user, I want to see the first-launch question again, so that I can start over without losing notes.
Done when:

- Account › Advanced › Help and first launch has "Show the first-launch question again"; it opens the same Welcome dialog with the same words.
- Help & tour has a link "Show the first-launch question again" that opens the same row in Account › Advanced (it is not a second copy).
- Closing it with ✕ changes nothing; ✓ (Start) applies the choice with a toast and Undo.

## 2. Starter cards and Undo

**S5-04** As a user, I want 4 picture cards at the top of Settings (Simple, Pencil first, Typing and study, Everything on), so that I can set many things at once by picture.
Done when:

- The first Settings page shows "Starter setups" with 4 cards, each with a small picture, a name and one plain line; the current one is outlined and tagged "Current".
- The line under the cards reads "A starter only sets starting values. It never hides a setting, and you can undo it."
- Tapping another card shows a toast "“Pencil first” starter set" with Undo, and the group tiles' value lines update at once.

**S5-05** As a user, I want to undo a starter in one step, so that trying one is safe.
Done when:

- Toast Undo, or the top-left Undo, brings back every value, feature switch and the old Current card in one step; Redo applies it again.
- Tapping the Current card after I changed things asks "Go back to Simple? (n changes)" (owner, 15 Nov); yes puts the starter's values back with a toast and Undo.
- Tapping the Current card with no changes shows "“Simple” is already set, with nothing changed" and adds no Undo step.

**S5-06** As a user, I want to hide the starter cards once I am set up, so that the first page is shorter.
Done when:

- Look and feel › Advanced › Starter setups has "Show starter setups at the top"; turning it off removes the cards from the first page (toast with Undo).
- Search "starter" or "presets" still finds the switch.

## 3. The 6 groups and their Advanced pages

**S5-07** As a user, I want about 6 short groups instead of 13 sections, so that I can guess where a setting is.
Done when:

- The first page and the side list show: Look and feel, Writing, Study, AI, Sync and backup, Account (plus Changed by me and Help & tour below a line).
- Each group tile shows a grey value line (for example "Day · English · Lined paper") and, if I changed something, "n changed" (the side list shows "• n", see S5-15).
- "General" and "Advanced" are no longer groups; their rows sit in the group they belong to.

**S5-08** As a user, I want each group to show only its common rows first, so that the page is calm.
Done when:

- A group page shows 3 to 8 common rows, then one "Advanced" row with a count line, for example "13 more settings · 40 feature switches · 2 changed".
- The group header has a "Reset group" button.
- Writing says under its title that tool bar and Pencil settings stay on This device; the rest follow me.

**S5-09** As a user, I want an Advanced page per group with clear sub-headings, so that rare settings are one tap away but tidy.
Done when:

- Tapping Advanced opens a page titled "Advanced" with a back button named after the group (for example "‹ Writing").
- Rows sit under sub-headings (for example Writing: Tool bar, Pencil and touch, New pages and paste, Test tools), then "Feature switches" with the line "Extra features, one switch each."
- A sub-heading shows only when it has rows: Study › Advanced shows "Journal" only once Journal has settings; there is never an empty heading.
- Back returns to the group at the same scroll place.

**S5-09a** As a user, I want "Turn on all in this group", so that I can try every extra feature of a group at once (SET-B40).
Done when:

- Each Advanced page has a "Turn on all in this group" button at its Feature switches heading.
- Tapping it turns on every feature switch of that group at once (no question), with a toast "All Writing features on" and Undo; Undo turns back only those it turned on.
- All already on: "All Writing features are already on", no Undo step.

**S5-10** As a user, I want the feature on/off switches inside the group they belong to, so that I do not hunt in one long list.
Done when:

- Home, Notebooks, Library and Search features are under Look and feel › Advanced; Tool bar, text and pen under Writing; Reader and Review under Study; AI under AI.
- Turning one on shows a toast "X is on" with Undo, and the feature appears in its own screen at once.
- The old central "Professional features" page is gone; nothing in it is missing (see the checklist at the end).

## 4. Show all settings

**S5-11** As a user who likes to see everything, I want one "Show all settings" switch, so that every Advanced row is open at once.
Done when:

- The switch sits at the bottom of the first page (sticky on iPad and phone) with the line "Opens every Advanced row in every group. It does not turn any feature on."
- With it on, each group shows its Advanced rows under a heading "Advanced · shown because “Show all settings” is on", with no extra tap.
- Turning it on changes no feature switch (Changed by me count stays the same); turning it off puts every group back to the short view. Undo works.

## 5. Search

**S5-12** As a user, I want one search that finds settings, tools and feature switches, so that I never need to know the group.
Done when:

- Typing "highlighter" shows "4 results for “highlighter”" with sections, in this order: Settings, Tools, Feature switches, From Help (a section with no result is not shown).
- Each result shows where it lives, for example "Writing › Advanced › Feature switches" or "Tool bar tool".
- ✕ in the box clears it and returns to the page I was on. No match: a plain "No settings match" with a tip.

**S5-13** As a user, I want to act on a result right there, so that I save taps.
Done when:

- A switch or choice in a result works in place (toast with Undo).
- A tool result (for example Highlighter) shows "Add to tool bar" or "Remove from tool bar" and the This device tag.
- Tapping a result's name opens its group (or Advanced page), scrolls to the row and makes it glow once.

**S5-14** As a user, I want plain words and old names to work, so that search understands me.
Done when:

- "ribbon", "customize", "presets", "Let Claude use my notes" each find the right row.
- Search on the phone sits at the top of the page ("Search settings and features").

## 6. Changed by me: the dot and the reset card

**S5-15** As a user, I want a small dot on every row I changed, so that I can see what is not default.
Done when:

- A changed row shows a small accent dot right next to its name, away from the row's control; a row at its default has no dot.
- The dot's 44 px tap area never overlaps the row's control: at least 8 px of space between them.
- For groups with changes, the side list shows "• n" and the group tiles show "n changed" (as in the mock).
- "Default" means the value from my current starter (the page says "your “Simple” starter").

**S5-16** As a user, I want to tap the dot and see the default, so that I can go back safely.
Done when:

- Tapping the dot opens a small card beside it: "Changed from default", "Default: Top" and one button "Reset to default".
- The card never covers the dot or its row's control; tap outside or Esc closes it.
- "Reset to default" restores the value, the dot disappears and a toast "Reset to default: Bar position" with Undo shows.

**S5-17** As a user, I want a "Changed by me" page, so that I can review all my changes in one place.
Done when:

- It lists only changed rows and switches, grouped by group, each with its place; the tool bar shows as one row "Tools on the tool bar" with Reset to default if changed.
- Nothing changed: "Nothing changed yet."
- The page ends with "Reset to Simple starter" and "Reset everything".

## 7. Reset per row, per group and everything

**S5-18** As a user, I want to reset one row, one group or everything, each with Undo, so that I can fix mistakes at the right size.
Done when:

- Row: from the dot card, no question asked, toast with Undo.
- Group: "Reset group" in the group header resets only that group's rows and feature switches, no question asked, toast "Writing reset" with Undo. Nothing to reset: "Nothing to reset in Writing".
- Everything: "Reset…" (red) asks first: "Every setting goes back to the “Simple” starter setup. Tool bar and Pencil settings reset on this device only; the rest reset on all your devices. Your notes are not touched, and you can undo."

**S5-19** As a user, I want every reset to come back with one Undo, so that nothing is lost.
Done when:

- After any reset, Undo (toast or top left) restores every value in one step and the dots return.
- Reset everything also puts the tool bar back to its default tools on this device; Undo brings my tools back.
- No reset ever deletes a note.

**S5-19a** As a user, I want "Reset to Simple starter", so that I can go back to the calm beginner values in one step (SET-B41; formerly "Reset to Beginner layout", owner 15 Nov).
Done when:

- The button "Reset to Simple starter" sits in More › Settings tools › Reset and at the bottom of the Changed by me page. It replaces no other button or row.
- It asks first: "Go back to the Simple starter? (n changes)". Yes puts every value and feature switch back to the Simple starter and makes Simple Current, with a toast and Undo; Undo brings everything back in one step.
- Nothing differs from Simple: "Already on the Simple starter", no Undo step. No note is touched.

## 8. Live preview on look rows only

**S5-20** As a user, I want a small picture only on rows that change the look, so that the page stays light.
Done when:

- Only these rows have a picture: Theme, Language, Default paper, Date style, Reduce glass, Path style, Device mode.
- Every other row shows its value as text, never an empty box.
- The "Bold · Pen · Read" language picture uses calm theme colours (v3 condition).

**S5-21** As a user on a wide screen, I want one big preview beside a group, so that I see the overall effect.
Done when:

- Look and feel, Writing, Study, and Sync and backup show a live preview column on iPad landscape; AI and Account do not.
- Changing a row makes the changed part of the preview glow once.
- iPad portrait and phone: a "Preview" pill opens it as a sheet; ✕ closes it.

## 9. Tool bar editing in place, with locked tools

**S5-22** As a Pencil user, I want to change the tool bar on the tool bar itself, so that I do not leave my page.
Done when:

- Touch and hold the tool bar on any page (or tap "Customise" in Settings) opens edit mode with a bar on top: ✕ "Editing the tool bar · Drag to move. Tap − to remove. Tools with a lock always stay." ✓.
- Removable tools show "−"; a tray "More tools · tap or drag one up" shows the rest with "+".
- Dragging moves a tool with other tools sliding aside live; ✓ saves (toast "Tool bar changed on this device" with Undo); ✕ keeps the bar as it was.

**S5-23** As a user, I want the core tools locked, so that I can never lose them.
Done when:

- Text, Pen, Eraser, Backspace, New line and More show a lock and no "−".
- A removed tool waits in More tools and can be added back with one tap.
- I can add Highlighter to the tool bar in under a minute and undo it (owner test from the research).

**S5-24** As a user, I want Settings to point to the tool bar, so that I find it from either side.
Done when:

- "Customise the tool bar" is a row on the first page and in Writing, with the This device tag and the line "Done on the tool bar itself: touch and hold, drag, Done".
- Search finds "Customise the tool bar" and every tool by name.

## 10. Sync versus This device

**S5-25** As a user with an iPad and a laptop, I want tool bar and Pencil settings to stay per device, so that each device has the right tools.
Done when:

- Writing's common rows, its Tool bar and Pencil and touch rows, Device mode and every row of Account › Advanced › This device and app carry a "This device" tag (they are per device); other rows have no tag.
- Changing Bar position on the iPad does not change it on the PC; changing Theme does.
- The reset-everything question names which settings reset on this device only.

**S5-26** As a user, I want to see what follows me, so that sync has no surprises.
Done when:

- Sync and backup › Advanced › What syncs lists group switches with v5 names: Look and feel, Writing (except This device), Study, AI settings, Lock, AI keys.
- Every v3 sync group is kept and mapped: General → Look and feel (its Writing rows → Writing), Appearance → Look and feel, Review → Study, Reading → Study, AI settings → AI settings, Lock → Lock, AI keys → AI keys. Turning a v5 switch off stops sync for every v3 group mapped to it.
- The Sync preview shows iPad ⇄ PC with what is kept on both.
- Offline: sync rows say "Offline, will sync later"; local changes still work.

**S5-26a** As a user with two devices, I want to choose per row whether a value stays on this device or follows me, so that sync fits me (v3 sync badge menu, kept).
Done when:

- Tapping a row's "This device" tag, or the row's ⋯, opens a small menu: "Keep on this device", "Use this value everywhere", "Reset to synced value".
- Rows that can be per device: Writing's common, Tool bar and Pencil and touch rows, Device mode, and Account › Advanced › This device and app. Only these show the tag and the menu's ⋯; other rows always sync.
- "Use this value everywhere" sends this device's value to all devices; "Reset to synced value" takes the synced value here. Each shows a toast with Undo.
- "Keep on this device" brings back the tag; the menu never covers the row's control.

## 11. Undo and Redo at the top left

**S5-27** As a user, I want Undo and Redo at the top left of Settings, so that every change is reversible from one place.
Done when:

- Undo and Redo sit in the top bar, left, next to the side-list button; greyed when there is nothing to undo or redo.
- They undo and redo single changes, starters, resets, Show all settings and tool bar edits; a toast says "Undone: …" or "Redone: …".
- Ctrl+Z / Ctrl+Y work when no text field is focused. The history clears when I leave Settings (v3 decision 2).

## 12. Sheets: ✕ always, ✓ only with a draft

**S5-28** As a user, I want every sheet to close the same way, so that I am never stuck.
Done when:

- Sheets that hold a draft (Edit tabs, the tool bar edit bar, the first-launch Welcome) have ✕ on the top left and ✓ (Done) on the top right; no Done button at the bottom. ✕ or Esc leaves without saving the draft; ✓ saves and shows a toast with Undo.
- Action sheets (More › Settings tools, Tours, Reset) have only ✕ (close) on the top left, no ✓. Their actions run at once with a toast and Undo; only Reset everything (and Reset to Simple starter) asks first.
- Esc closes any sheet. On a phone sheets open full height with the same buttons.

**S5-29** As a user, I want the More sheet for rare Settings tools, so that the page stays clean.
Done when:

- "More" (top of the page) opens "Settings tools" with tabs Experience, Tours, Reset.
- Reset tab offers "Reset this group" (inside a group), "Reset to Simple starter" and "Reset everything", with the note "One row goes back from its own dot".

## 13. Test tools found by search

**S5-30** As the owner testing a phase, I want test tools in Advanced and found by search, so that they never clutter normal pages.
Done when:

- Test tools sit under their group's Advanced: Writing (Pencil lab, Tool state), Sync and backup (Record slow moments, Slow-moments report), Account (Try new features, Test a phase, Pretend a must-have update).
- Searching "test", "pencil lab", "try new" or "update" finds them with their place, at any experience level.
- "Test a phase" turns a whole phase on with one tap and off with one tap; "Pretend a must-have update" can always be left.
- The hidden "Try new design" list still opens by tapping Version 5 times (SET-B26).

## 14. Phone and dark mode

**S5-31** As a phone user, I want Settings in one column, so that it fits my hand.
Done when:

- At ≤ 640 px: search at the top, starter cards stacked one per row with picture on the left, groups below, "Show all settings" pinned above the tab bar.
- Group pages open full width with a "‹ Settings" back button; no sideways scrolling anywhere.
- The Preview pill and sheet sit above the tab bar.

**S5-32** As a user who reads at night, I want dark mode everywhere in Settings, so that nothing flashes white.
Done when:

- Dark mode (shots 6 and 7) shows the first page, group pages, the dot card and sheets in dark tokens with readable contrast.
- Starter pictures and previews follow the theme; the accent dot stays visible.
- Switching theme is a look row: its picture updates and Undo works.

## 15. Accessibility

**S5-33** As a Pencil, touch or keyboard user, I want every control easy to hit and named, so that I can use Settings without trouble.
Done when:

- Every button, switch, segment, dot and ✕ / ✓ has a hit area of at least 44 px (the dot draws small but has a 44 px tap area, kept at least 8 px clear of the row's control).
- Every control has a spoken label (for example the dot: "Changed by you: Bar position. Show the default and reset"; locked tools: "Text (always on the tool bar)").
- The focus ring shows only when using a keyboard (Tab), never after a tap or Pencil touch; Tab order follows the page; Esc closes cards and sheets.
- Reduced motion: glows become a static outline; no slides.

## 16. PENDING OWNER: Your layouts

**S5-34 (PENDING OWNER, picks: later)** As a user with several jobs, I want saved tool bar layouts ("Pencil notes", "Study"), so that I can switch setups fast.

- The mock still shows "Your layouts" (up to 3, "New…") and "Reset all layouts" under Writing › Advanced › Tool bar.
- Owner answer 11 is "later". Do not build until the owner decides. Until then: keep the rows out of the build, or show nothing; log in docs/IDEAS.md.

---

## Where every v3 feature lives

The mock has the full table: Settings first page › "Where did it go" (`wherePage()` in `settings-v5.html`, every v3 row and its v5 place). A probe test must still read every registry id and fail if one has no row or search result in v5. Summary by v3 section:

- [ ] Your experience (3 level cards) → first-launch Welcome; later Account › My experience and More › Experience. Sets starting values only (S5-01 to S5-03).
- [ ] Beginner / Professional view hiding rows, "Show in Beginner" switches → gone as hiding controls; every row is always there: common, Advanced, or Show all settings (S5-02, S5-11).
- [ ] Professional features list (central) → each group › Advanced › Feature switches; search finds each (S5-10, S5-12).
- [ ] Turn on all in this group / Reset to Beginner (SET-B40, B41) → kept (owner, 15 Nov): a "Turn on all in this group" button on each Advanced page (S5-09a), and "Reset to Simple starter" (formerly Reset to Beginner layout) in Settings tools › Reset and on Changed by me, asks first, with Undo (S5-19a). The mock must add both before the build.
- [ ] General: theme, language, show help, date style, default paper, open notebook at → Look and feel (common).
- [ ] General: reduce glass (Auto, Solid), scroll hints, path style, refresh button, spaces Home/Library/Review, default page tabs, day start hour → Look and feel › Advanced.
- [ ] General: device mode → Writing (common). New page study / chooser, paste as → Writing › Advanced › New pages and paste. Auto update → Account (common).
- [ ] Tool bar (show, layout, placement, finger only, names, newline extras, hold time, pill reset, reset) → Writing, common and Advanced › Tool bar; Customise → on the tool bar itself (S5-22).
- [ ] Pencil & touch (pencil writes, auto switch, pen picks pen, hold select, hold menu, tap twice, pencil scrolls, smart guides) → Writing, common and Advanced › Pencil and touch.
- [ ] Hover tips, shortcut hints → Writing › Advanced › Tool bar (v3 had them in Help & tour).
- [ ] Reading (all 16 rows) → Study (entry, theme, font, size common; rest Advanced › Reading).
- [ ] Review (new per day, scheduler, max per day common; again minutes, good steps, target memory, nested card, practice order, revise labels Advanced) → Study.
- [ ] Journal (empty) → Study › Advanced › Journal, shown only once Journal has settings; no empty heading (S5-09).
- [ ] AI & connections, Let AI use my notebooks, Claude area, keys, test/get a key, model per notebook, usage → AI (common and Advanced › Keys and cost, AI access to notebooks).
- [ ] Sync (status, sync now, setup, unlock, backup; test, reconnect Drive; What syncs 7 groups) → Sync and backup; What syncs uses v5 names with every v3 group mapped (S5-26).
- [ ] Account (sign in/out, new code, forget key, sign out everywhere, devices, connected apps) → Account and Account › Advanced.
- [ ] Lock (PIN, device unlock, idle minutes; password, what is locked, remove all) → Account and Account › Advanced › Lock.
- [ ] Device (picker, control panel, install, version) → Account › Advanced › This device and app.
- [ ] Advanced test tools (Pencil lab, slow moments, tool state, try new design) → Test tools in Writing, Sync and backup, Account (S5-30).
- [ ] Help & tour (tours library, download, glossary, questions, replay, first-launch question) → Help & tour; first-launch question in Account › Advanced, with a link from Help & tour (S5-03).
- [ ] Sync badge menu per row (keep on this device, use this device's value everywhere, reset to synced) → kept: tap the "This device" tag or the row's ⋯ (S5-26a). The mock must add the menu before the build.
- [ ] Per-row Reset link, per-section reset, Undo toast, top-bar Undo/Redo → dot card, Reset group, Reset everything, top-left Undo/Redo (S5-15 to S5-19, S5-27).
- [ ] Row previews and the big preview → look rows only; big preview on 4 groups (S5-20, S5-21).
- [ ] `alsoIn` notes, deep links, Pencil offer, control panel reading the registry → unchanged.
- [ ] Hidden "Try new design" (Version × 5) → kept (S5-30).
- [ ] Your layouts → PENDING OWNER (S5-34).
