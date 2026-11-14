# Pending: one list (11 Nov 2026)

## Needs you

- Needs you (13 Nov, the bugs-only rule has expired): open docs/HANDOFF.md with the owner, list the tasks carried forward repeatedly, and decide them.
- Owner: when ready, add your test API key in Settings > AI (cap about $5); never paste it in chat.
- Needs your OK (13 Nov, not applied): a proposed gate-2 rule, "report only spec gaps and breakages, not style". Until you say yes, gate 2 reports style as well.
- DONE 13 Nov: Claude connector A tested by the owner on the PC (list, create notebook, append, revoke, reconnect all passed; safety switch passed in tests). It is registered with Claude Code (user scope), not Claude Desktop.
- Needs you (Supabase, when free; nothing is blocked): turn on refresh-token rotation; confirm the email-code limits; restrict CORS on the `drive-token` function.
- Needs you (one check before the strict security header is switched on): Google sign-in, Drive and fonts still work. Until then the strict rule only reports, it blocks nothing.
- Preview (free, new parts can be switched on there): https://build-next.learning-notes-app.pages.dev . New parts are under Settings › Try new features, all OFF. The live app got the same code on 12 Nov with everything off.
- Needs you (Supabase, when free): the online part of the Claude connector needs the new job tools deployed (list in docs/features/ai-framework.md "Needs the owner"); the app side is built and waits.
- To review: a new unlock switch "about.updateDetails" is proposed (until your OK it uses "about.version"); 50 new unlock switches were added to docs/mockups/pro-features.md under "Added by the build specs" (169 → 219).
- Decisions to review: see docs/DECISIONS.md "Decisions to review" (build night 1).

- iPad check of the preview (BUG-002, connector, key flows): see "iPad checklist (first preview)" below.

### iPad checklist (first preview)

Written 13 Nov 2026. Do it on the iPad in Safari, at the preview address. Tap each box as you go. If a step does not match "You should see", write down the step number and what you saw, then tell Claude. The live app is not changed by this test.

**Not in this check:** Reader v2 (the new reader). The connector's full test ran on the PC; here you only check its screens.

**Part 1: Open the preview and turn on the new parts**

1. [ ] Open Safari and go to https://build-next.learning-notes-app.pages.dev
   - You should see: the app loads within a few seconds, with no error page.
2. [ ] Go to Settings, then Try new features.
   - You should see: a list of switches, all OFF.
3. [ ] Turn ON each of these: Shell, New Home, Storage safety (or do it in step 44), New Library, Notebooks and Search, New Settings, Page menus, Toolbar, AI framework, New updates. If a name differs a little, pick the closest one.
   - You should see: each switch stays ON after you tap it.
4. [ ] Close the app completely (swipe up from the bottom, then swipe it away) and open it again.
   - You should see: the switches are still ON and your notes are still there.

**Part 2: Shell (the frame of the app)**

5. [ ] Move between Home, Library, Notebooks, Search and Settings.
   - You should see: each screen opens at once, and the back button returns you to where you were.
6. [ ] Turn the iPad sideways, then upright.
   - You should see: nothing is cut off, and nothing scrolls sideways.

**Part 3: Home v2**

7. [ ] Open Home and tap Edit.
   - You should see: a big blue Done bar at the top.
8. [ ] Press and hold a box, then drag it. Let go.
   - You should see: the other boxes move out of the way while you drag, and the box stays where you let go.
9. [ ] Tap the three dots on a box and pick a size.
   - You should see: the box grows or shrinks smoothly and stays on screen.
10. [ ] Add the Pending items box and tick one item.
    - You should see: the box shows what is late and what is open, and the ticked item changes.
11. [ ] Tap Edit time range, pick the Exam time example, tap the tick, then tap Undo at the top.
    - You should see: the bar changes, then Undo brings back the old version.

**Part 4: Library v2**

12. [ ] Open Library.
    - You should see: the book you are reading is at the top with a Continue button, then all covers. Tap + Add: a menu shows Import, Capture and Prompts.
13. [ ] Tap More, pick Videos, then tap Done. Tap the small ✕ on the Videos chip.
    - You should see: only videos show, then all covers come back.
14. [ ] Tap Knowledge, then View, then Export. Switch a few items off and export.
    - You should see: the file saves and leaves out the items you switched off.

**Part 5: Notebooks and Search v2**

15. [ ] Open Notebooks and tap All, Starred, then Recent.
    - You should see: the list changes each time you tap.
16. [ ] Press and hold a notebook cover, then tap Pin, then Undo.
    - You should see: a small strip of actions appears, Pin adds the pin, and Undo removes it.
17. [ ] Open a notebook, then a page.
    - You should see: the tab row is hidden. A small arrow brings it back.
18. [ ] Open the side panel, tap Pages, and tap Organise. Try Duplicate, then Delete, then Undo.
    - You should see: Duplicate makes a copy, Delete removes the page, and Undo brings it back.
19. [ ] Tap More, change a notebook's cover to one of your photos, then tap Done.
    - You should see: the new cover shows in your list.
20. [ ] Tap Search and type a word that is in one of your notes. Tap that result.
    - You should see: the note is in the results, and it opens at that word.
21. [ ] Tap the ✕ to clear the search. Tap the Features chip and search "dark".
    - You should see: only matching results show.

**Part 6: Settings v3 and the connector screens**

22. [ ] Open Settings and tap each section.
    - You should see: the sections are laid out in the new way, and the text is easy to read.
23. [ ] Open Settings, then Claude. Tap Inbox, then Activity.
    - You should see: three tabs (Settings, Inbox, Activity). Inbox says "Nothing is waiting". Activity shows an empty list or "no activity yet". Nothing breaks.
24. [ ] Open Settings, then About.
    - You should see: the update area is there, and nothing downloads by itself.

**Part 7: Page menus**

25. [ ] Open a page and press and hold one word.
    - You should see: the strip shows above the word, not on top of the handles. Tap Paste to see the formats.
26. [ ] Copy a line from Safari and paste it into a page.
    - You should see: the pasted text keeps its look and is easy to read.
27. [ ] On an empty line, type / then the word tab, then press Enter.
    - You should see: a table appears. Tap Show all and you see every group.
28. [ ] Tap the three dots at the top of a page.
    - You should see: the side sheet opens to the full height. Delete a test page, then tap Undo. The page comes back.

**Part 8: Toolbar v8, and BUG-002 (the format bar)**

29. [ ] Tap Pen, tap it again, and pick a pen type, a size and a colour. Tap + to save a favourite. Tap ☰ to move it, remove it, then Undo.
    - You should see: each change shows at once, and Undo brings back what was removed.
30. [ ] **BUG-002.** Select a word near each corner of the screen, and near the left and right edges, in landscape and in portrait.
    - You should see: the format bar stays fully on screen, keeps its normal size, and never covers the blue handles.
31. [ ] Turn on Hide toolbar while writing, then write with the Pencil.
    - You should see: the bar tucks away, and the Show toolbar pill brings it back.

**Part 9: AI framework**

32. [ ] Go to Settings, then AI.
    - You should see: AI is still OFF. Nothing is sent and nothing is charged. Do NOT type or paste any key here.

**Part 10: Update flow**

33. [ ] Go to Settings, then About, and tap Check for updates now.
    - You should see: a normal update shows only a small pill. Nothing downloads by itself.
34. [ ] Go to Settings, then Advanced, and tap the hidden test button "Pretend a must-have update" (preview only).
    - You should see: a full-screen notice counts down 5 seconds, downloads, and the app reopens on the same page.
35. [ ] Turn Wi-Fi off and repeat step 34.
    - You should see: the notice asks you to connect. Turn Wi-Fi on, and it carries on by itself.

**Part 11: Key flows**

36. [ ] Tap + on Home or Library, name a new notebook, and create it.
    - You should see: it opens at once with its name at the top, and it is in your list after you go back.
37. [ ] Open a page. Write a short line with the Pencil, then type a word on the keyboard. Close the page and open it again.
    - You should see: the ink and the typed word are both where you put them, with no lag you can notice.
38. [ ] Select a few words on a page and make a card from them.
    - You should see: the card shows in your cards list with those words.
39. [ ] Open Review. Answer two cards: once Know it, once Not yet.
    - You should see: the next card appears after each answer, and the count left goes down.
40. [ ] Fully close the app, open it, and time how long until Home is ready. Do this three times.
    - You should see: Home is usable in a few seconds. Write the three times down.

**Part 11b: Added overnight (14 Nov)**

43. [ ] **BUG-006, the Settings gear.** Hold the iPad upright in Safari, open a page, tap in a text box so the keyboard shows.
    - You should see: the ⚙ gear at the bottom of the left strip is still visible and opens its menu (Settings is in it).
44. [ ] **Storage safety.** In Settings, then Try new features, turn ON Storage safety. Reload the page.
    - You should see: a calm notice "Keep your notes safe: add this app to your Home Screen" with Show how and Back up first. Tap Show how: three short steps. Tap Back up first: "Backup saved." and a file in Downloads.
45. [ ] **Review (new).** Open Review and answer a few cards; open its other tabs.
    - You should see: the counts change after each answer, and nothing jumps or overlaps.

**Part 12: Send your results**

41. [ ] Write down each step that did NOT match: the step number and what you saw. Send the list to Claude.
    - You should see: nothing to do here. Claude fixes each one and tells you when to check again.
42. [ ] Turn OFF any new part you do not want, in Settings, then Try new features.
    - You should see: those screens go back to how they looked before.

## Decide before public launch

- Supabase paid plan (about US$25 a month). No cost now.

## Build board (one row per slice)

| Slice                                                                                                                 | State                                                                                                | Branch                                                                                | Next step                                                                                                                                  | Gate                                |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| First job: CI green + deploy                                                                                          | DONE, live                                                                                           | main                                                                                  | none                                                                                                                                       | done                                |
| Night 1 release: 0a, 0b, 0c, 0d, 0e, 0f, 0i, 9 (AI slices 0-1), 10 update flow, 11 security mediums, iPad flake fixes | DONE, live, all switched off (main b5b0bc7, run 43205383635)                                         | main                                                                                  | owner tests when free                                                                                                                      | done                                |
| 0g step 1 shared parts (10 parts + gallery), AI slice 2 (Build screen), outside-tap swallow                           | merged to build/next, green (run 43219746700)                                                        | build/next                                                                            | next release                                                                                                                               | QA passed, Fable passed screenshots |
| 0g step 2 (strip, command list, sheet, dialogs, toasts, banner)                                                       | built, gate not finished                                                                             | slice/0g-parts                                                                        | merge build/next, finish gate                                                                                                              | builder                             |
| 0h shell                                                                                                              | SH-01..08 built behind foundation.shell                                                              | slice/0h-shell                                                                        | SH-06, SH-09..14, then QA                                                                                                                  | builder                             |
| 1 toolbar v8                                                                                                          | 1a, 1b built                                                                                         | slice/1-toolbar-v8                                                                    | 1c Pen cards onwards                                                                                                                       | builder                             |
| 3 Settings v3                                                                                                         | 7 of 13 sub-slices built; unlock list now 219                                                        | slice/3-settings-v3                                                                   | sub-slices 8-13                                                                                                                            | builder                             |
| 9 AI framework slice 3 + local table aiJobs (Dexie version 24)                                                        | built, green on its branch                                                                           | slice/9-ai-framework-1                                                                | QA review of the version 24 upgrade, merge; then slice 4                                                                                   | QA                                  |
| 4 Notebooks + Search v2, 7 Reader v2                                                                                  | starting                                                                                             | slice/4-notebooks-search, slice/7-reader-v2                                           | build from spec                                                                                                                            | builder                             |
| 2 text box v2, 5 Home, 6 Library, 8 Review, 12-17                                                                     | spec ready, not built                                                                                | -                                                                                     | after toolbar / shell                                                                                                                      | -                                   |
| iPad storage safety                                                                                                   | not started                                                                                          | flag storage.safety                                                                   | Safari-tab notice to Add to Home Screen; one-tap backup export; calm handling of IndexedDB connection-lost and quota errors (owner 13 Nov) | -                                   |
| 5 Prompt caching (AI)                                                                                                 | queued (owner-approved 13 Nov)                                                                       | -                                                                                     | first tasks of the AI slice (docs/features/ai-framework.md); builder Sonnet                                                                | Opus review                         |
| 6 Real token count for the cost preview (AI)                                                                          | queued (owner-approved 13 Nov)                                                                       | -                                                                                     | first tasks of the AI slice (docs/features/ai-framework.md); builder Sonnet                                                                | Opus review                         |
| 14 Nov gates: 8b Review rest, Reader v2, 12 rest, toolbar 1e/1f                                                       | 8b ready for the owner (gates 2+3 PASS); Reader gate 2 PASS; 12 rest and toolbar fixing gate 2 lists | slice/8b-review-rest, slice/7-reader-v2, slice/12-page-menus-rest, slice/1-toolbar-v8 | merge queue after BUG-006 CI: storage, 0g3, 9-6, 15, then 8b                                                                               | see docs/BUILD-STATE.md             |
| 14 Nov merges: storage safety (cfebd3a4), BUG-006 in preview                                                          | storage safety merged OFF, CI running; AI cost additions ready for the owner                         | build/next                                                                            | lazy-load storage safety, then 0g3, 9-6, 15, 8b, 9-cost                                                                                    | see docs/BUILD-STATE.md             |

nContinuity: see [CONTINUITY.md](CONTINUITY.md). Mock-ups: docs/mockups/.

Owner rule: remove a line when it's solved. Tokens are low until Fri 13 Nov, so only Priority 1 is built now. The full detail for each item lives in the linked plan file.

## Priority 1: text box (built 11 Nov, waiting for the owner iPad checks)

Detail: plans/owner-bug-batch-3-2026-11-11.md (B3) and plans/owner-ideas-batch-2-2026-11-10.md item 4.

## Priority 2: live, waiting for the owner test

- Double-tap no longer erases a word (600 ms grace) and sign-in is kept; see owner-checks-pending.md. Delete this line after the owner checks it.

## Priority 1 leftovers (text box)

- Owner checks for the whole text box v2 list (steps 1 to 7, 12 Nov) are at the top of plans/owner-checks-pending.md. Not built from that list: the glide into place after a drop, minimum width = longest word, rotation, a box wrapping ahead of a neighbour at the same height (see Questions).

- [ ] Minimum width = longest word (now the column minimum).
- [ ] Leftover worktree folders the owner can delete: ln-textbox, ln-textbox-base, ln-auth.

## Text box v2 (owner, 11 Nov 7:32; references Notability + GoodNotes)

- [ ] Rotation is new (text box rotate). Layer order (forward/back) ties into the parked layers idea.

- [ ] Owner 11 Nov 7:40 decisions for Text box v2 (polish the existing box only, no new features):
  - Grab handle: bigger and clearer, Notability-style ≡ tab on top of the box.
  - Drag is exclusive: while a box is dragged nothing else in the app reacts (no taps, toolbars, new boxes, menus) until it is dropped. Owner asked about a ✓ confirm after the drop (see question).
  - Dropped from the list: layers, front/back, hide/show, recall card from a box, send to Summary, handwriting into a box, fold a box.

  - Selected box border clear by default like GoodNotes/Notability: a solid 1.5 px accent line with clear corner dots, visible on dark and light paper (ours is too faint). Line highlight/selection is fine, leave it.

## Priority 4: other bugs

- Built 11 Nov, waiting for the owner iPad checks (top of plans/owner-checks-pending.md). Delete this line after the owner checks them.

## Text tool + Pencil (built 12 Nov, waiting for the owner iPad check)

Safer shape detection, Undo fix (one press = one step with several boxes), Sticky/Callout/own presets and last style were already in. Check list: top of plans/owner-checks-pending.md. Not verifiable here: real Scribble on the iPad.

## Owner tests waiting

See plans/owner-checks-pending.md (top) and the 7-item list from 10 Nov: grid, hold menu, Pencil taps, clash bar, Layout Assist, Text tool, ribbon and History.

## After Friday (ideas, not bugs)

plans/owner-ideas-batch-2-2026-11-10.md: update bar, customizable bars, layers, shrink a box to scale its text. Also: book annotations, Views, snapshot Lasso. Fri 13 Nov: review the HANDOFF carry-overs.

## Housekeeping

- Empty worktree folders the owner can delete by hand: ln-l, ln-base2, ln-ci2, ln-g, ln-g2, ln-a, ln-base, dist-rb.

- CI fix pushed 11 Nov for Text box v2 (deploy pending green CI); check the deploy ran, then delete this line.

## Owner answers 11 Nov (top priority: text box, typing, Pencil)

- BUG: the cursor lands in the wrong place or jumps.
- BUG: a Pencil double-tap to select doesn't work at all in a text box (the owner expects a paragraph selection; confirm word vs paragraph).
- BUG: too many highlights. Tapping a line draws a border or highlight around that single line or block. Instead only the WHOLE box shows as selected (GoodNotes): no per-line or per-block outline inside a box.
- Progress: a short note per live part, with a 2–3 line test.

## Questions for owner

- Two taps at the same height: the second box goes just UNDER the first (every free box is its own row; others slide down). Do you want boxes side by side at the same height from a tap? That needs a different layout model (overlap checks per box). Safest option taken: stacked.

## Owner bug register (PDF, 11 Nov): plan first, questions pending

- BUG-001: turning a block into a checklist shows "Not saved yet" (src/i18n/en.ts:1282 save-failed bar). "Try again" does nothing, and typing feels laggy. NOT fixed yet (string still live; needs a repro).
- BUG-002: the floating format toolbar extends or moves beyond its bounds. Keep it at its size and position.
- BUG-003: toolbar turned off in Settings. After "Show" plus using a tool it should auto-hide again, with a very visible "Show toolbar" control.
- BUG-004: replace the black "Updating…" overlay (update.splash) with one full-screen MANDATORY update flow:
  - a short countdown, then auto download;
  - the download can be cancelled, but the app stays blocked until it updates;
  - progress, then a full-screen "installing" state with interactions blocked;
  - restore with all data kept;
  - handle failures and interruptions.
- BUG-006 (owner, 13 Nov, iPad Safari portrait, preview): the ⚙ Settings gear at the bottom of the left strip is not reachable; the strip does not scroll and the gear falls off screen (keyboard and format bar open). **Must be fixed before the live release**, also for the installed app: pin the gear inside the visible area or let the strip scroll; test on a short iPad Safari viewport. Screenshot: owner upload 13 Nov 20:29.
- BUG-005: settings need visual previews (e.g. toolbar on/off) plus a guided walkthrough highlighting Compact view, Ribbon and Toolbar.
- Standing instruction: ask until fully understood; no assumptions.
- OWNER answers for the register:
  - BUG-004: forced only when needed (storage change or data fix); other updates stay optional with the pill. 5 s countdown.
  - BUG-003: the bar hides when you start writing or typing; a small "Show toolbar" pill stays at the top edge.
  - BUG-005: the walkthrough shows on first launch, with replay in Help and Settings.
  - Still need: the BUG-001/002/003 screenshots resent as images (the PDF images couldn't be read).
- BUG-005 plan addition (owner, do NOT build yet): on first launch a small pop-up asks "New to the app / Used it a little / Experienced".
  - New → the full guided walkthrough, a few steps at a time (never too much at once).
  - Used a little / Experienced → no walkthrough (maybe a "Replay tour" in Help).

- Settle animation after a drop (the dropped box glides into place) is NOT built yet.

- Circled number / shape Undo: one Undo may also take back the typing of the same box if it was just before (page history groups text steps). Handwriting to text rests on iPadOS Scribble, not verified on the iPad.

## Lane C: toolbar + settings redesign (planning; nothing built until the mock-up is approved)

- Owner 11 Nov:
  - default = hybrid (minimal, with show-all on demand);
  - the confusion is the toolbar, Ribbon and Compact view (Pencil-writes-text and device mode are fine);
  - wants it organised like GoodNotes;
  - saved layouts: built-in "Beginner" and "Professional speed", plus several (up to 3) user layouts that save the whole toolbar arrangement and its preferences.
- Step 1 (running): Fable maps every toolbar surface and setting from the code and proposes the organisation. Then an artifact map for the owner to mark, then a tappable mock-up.
- Step 1 done: map in docs/plans/toolbar-map-2026-11-11.md (Fable). Decision page for the owner: https://claude.ai/artifact/Xquz4AAJC2vssFFa5dGRxX (13 changes + 8 questions). Waiting for the owner's pasted choices, then the tappable mock-up.
- OWNER answers (11 Nov):
  1. Ribbon/All tools hidden in Beginner, available in Professional only.
  2. Compact view merges into the layouts (Beginner = compact); no separate setting.
  3. Switch layouts in BOTH Settings and the toolbar ⋯.
  4. Own layouts: yes (sync, each device picks its active one; assumed, confirm).
  5. NO names under icons in Beginner; icons only, names on hover or long-press.
- OWNER decision page (11 Nov):
  - Changes agreed: C1–C8, C10, C12, C13. C9 (one Keyboard button, hold for Pencil keys) and C11 (picture/table "More" expands in place) left blank.
  - Q1 fixed strip under the bar. Q2 keep the micro bar separate (conflicts with C8 "one Selection bar"; ask). Q3 Read moves under ⋯ as "Reading mode". Q4 no names in Beginner. Q5 Professional = toolbar + one slim All-tools row. Q6 switch everyone to Beginner. Q7 switch layouts in Settings + ⋯. Q8 layouts sync, each device picks its active one.
- OWNER notes (11 Nov, more coming):
  - Pen = one tool with pen types inside (Apple Notes style): pen, pencil, marker, highlighter… Highlighter moves inside Pen (no separate button).
  - Backspace stays on the Beginner/simple bar, next to New line.
- OWNER artifact comments (11 Nov, discuss at the end):
  - Layout model: built-ins Beginner and Professional (each customisable), plus 3 optional own layouts.
  - Per-device copies: customising a layout on a device creates that device's copy (unlimited device copies, e.g. iPhone/PC/iPad versions of Professional).
  - Layouts can be renamed. "New layout" starts from Blank, Beginner or Professional.
  - The owner wants C9 (one Keyboard button) and C11 (picture "More") explained.
- OWNER FINAL toolbar (11 Nov discussion):
  - C9: the problem is that several keyboard buttons/bars appear by themselves whenever you type or tap. Show only ONE (ours) and stop our extra keyboard bars popping up on their own. The iPadOS system shortcut bar can't be removed from a web app (explain).
  - C11: bug fix (picture "More" expands in place).
  - C8/Q2: (a) merge 3 bars into one Selection bar, keep the micro bar.
  - Layouts: as understood (built-in Beginner/Professional, customisable; per-device copies; 3 own layouts from Blank/Beginner/Professional; rename). Own layouts get device copies too. Every layout has "Reset to original", plus a "Reset all layouts" in Settings. A new device copies the closest device type's version.
- OWNER OK: a "Keyboard stays hidden" toggle (toolbar icon + Settings, saved per layout). While on, our keyboard/mini/micro bars never auto-pop and the iPad keyboard stays down (inputmode none) until the Keyboard button is tapped. Check on the iPad that Scribble still works while it's on. Next: the tappable mock-up.
- OWNER OK (11 Nov): an Opus quality review (strict Apple-style) after each feature passes CI, before the owner's iPad test. Toyota-style reliability as a working standard (rule text proposed to the owner).
- Mock-up (https://claude.ai/artifact/6urqSfFnkCVsvLynEUL54N) owner decisions:
  - the real system keyboard (no mock keys);
  - distinct Pen/Pencil/Marker/Highlighter icons;
  - the All tools row fixed in place, one line with sideways scroll; tools show only after a tab tap and tuck away after use; tabs with icon + label;
  - the full Lasso: text + ink, loose catch, Cut/Copy/Paste/Duplicate/Colour/Resize/Delete/Convert/Screenshot;
  - the Text tool pill is BOX-first (styles, border, fill, corners, padding, layout), with text formatting in one "Aa";
  - "Last tool" becomes "Back to <tool>" showing the target tool's icon, Professional only.
- OWNER: the eraser. Beginner keeps the simple eraser; Professional brings back the app's CURRENT eraser (its options + size preview, which the owner likes), best of both. The owner will share a reference. Mock pen tray redesigned (Fable, Apple-style matched set).
- OWNER rule (11 Nov): every change must be applied everywhere the thing is used (toolbar, All tools, menus, pills, settings), so nothing is left half-updated. Real-app check: the tool icons are picked by name, so add a missing-icon fallback + warning and a test that every registered tool's icon exists.
- Mock: Professional eraser + Lasso ported from the real app and merged with the new ones (in progress).
- OWNER (11 Nov): Beginner = few, simple options (keep as is). Professional = ALL existing features kept (nothing lost), each purpose-driven: grouped by task, shown in context, advanced behind ▾. Complexity only where it serves a clear purpose.
- OWNER design north star: like Apple, deep capability that feels effortless. Smart defaults, progressive disclosure, consistent patterns across iPad/PC/phone, no setting needed to get started.

## Audits 11 Nov (read-only, waiting for owner choices)

- Open items planner: https://claude.ai/artifact/Dx2mjXxwovbm3PjtGESgDr
- Security (Opus spot-check): no Critical/High. Medium:
  - the lock is a privacy screen only (PIN brute-forceable offline): add attempt delays and a longer password;
  - the session is in localStorage: refresh-token rotation, clear the PKCE verifier;
  - the drive-token function allows any CORS origin: restrict it;
  - confirm the OTP rate limits in the Supabase dashboard;
  - remote images in imported notes leak IP: proxy or ask.
    Low: style-src unsafe-inline, HSTS includeSubDomains, pencil-test.html shipped, SW cache checks, npm audit, import paths not yet checked.
- Root causes of UI bugs (Opus):
  1. One editor per box, each adding global listeners (161 global listeners) → multi-Undo, save races, stray boxes, perf. Fix: one page-level event router.
  2. Competing Pencil/tap handlers settled by timers. Fix: inputMachine as the single gesture router.
  3. No single owner of selection/focus (window CustomEvents). Fix: one selection store.
  4. Five floating bars/toasts. Fix: one overlay manager (part of the toolbar redesign).
  5. WebKit can't be tested locally. Fix: WebKit as a required CI check / Docker.
  6. The 320 KB budget forces lazy workarounds. Fix: a critical-path budget + preload.
  7. Builders colliding. Fix: one branch per builder, a conflict-marker pre-commit check.
  8. Session renewal triggers. Fix: a single auth refresher (mostly done today).
  9. slowMoments writes per long task. Fix: throttle.
     Latent: duplicate save flushes on exit, a stale timer caretIn, a stale closure in the usePaperBoxes keydown, an unguarded window Delete handler, the listenerCount undercount, seeded RNG in driveServer tests.

## OWNER open-items choices (11 Nov)

- BUILD: Magnifier in reader; Book annotations; AI-off card; Prompts on note pages; Make notes from a PDF; Claude connector; Cost estimate; Default paper style; Settings previews & tour; Reduce glass check; Table rows across sheet gap; Database page filter; Search checkboxes & formulas; Custom Views; All/Starred/Recent tabs; Picture border/wrap/draw-on; Delete forever removes pictures; Labels & tape on pictures; Required-update marker; Shorten HANDOFF; CHANGELOG stray text; Old copies (3 unsaved files done 11 Nov); Undo gaps (47); Old flaky tests; Spanish & Hindi; First-download size; Replace emoji icons; Premium design 3–6.
- LATER: Shapes/ruler/tape in reader pen; Open sync to everyone; Per-notebook presets; Video timestamps beyond YouTube; Update bar at top.
- DROP: Update pill vs bar.
- Rule: anything that touches the UI being redesigned in the mock-up (toolbar, text box, Lasso, ink, layout, settings layout) waits until the owner signs off the mock-up. Everything else goes ahead under the Apple + Toyota + premium-design rules.
- OWNER answers (wave 2 questions): Q1 (a) the redesign-touching items (settings previews & tour, emoji icons, premium design 3–6, labels & tape on pictures, reader magnifier) WAIT and get added to the mock-up artifact to be designed there first. Q2 (a) a short Book annotations plan for approval, then build. Q3–Q10: waiting.
- Book annotations short plan ready (3 slices, 6 questions); waiting for owner approval. Summary in chat 11 Nov; detail in docs/plans/book-annotations-plan.md (existing) + this plan.
- OWNER answers (wave 2):
  - Q4 (a) Notes from a PDF with a cost estimate before each run. PLUS a full audit of every AI/cost setting so no two settings double-enable a paid feature or charge twice (severity: high).
  - Q5 (b) the Claude connector reads AND writes from the start.
  - Q6 unclear ("A. B."), ask.
  - Q9 handle the 3 unsaved files as I judge best, safely (no consequences).
  - Q10 reliability first, then features.
  - Book annotations Q1–6: waiting.
- Builder H done (11 Nov): DB page filter, search finds checkboxes/formulas, All/Starred/Recent, Delete forever erases pictures, picture Border, video start/size, slowMoments throttled, seeded driveServer tests, first load 319.9 → 301.8 KB. Waiting for the redesign: text wrap around pictures (src/paper) and Draw on picture (src/ink + tools).

## OWNER TO-DO (answer in one go later)

Questions:

1. Q6 Custom Views: (a) short plan first or (b) build straight away? (owner wrote "A. B.")
2. Book annotations Q1–6 (my picks used in the mock-up): scroll-only drawing; a phrase = 3 s; sticky notes yes; Beginner shows everything; user-named colours; sync strokes only.
3. Toyota-style rules into rules/building.md: yes/no?
4. Mock-up renames: keep "Pen"/"Sticky note" names (Fable is reviewing).
5. What was the rest of "And make…"?
   Tasks only the owner can do:

- ~~Supabase dashboard~~ DONE 12 Nov: Email OTP expiry 600 s (owner); rotation = Supabase default; rate limits default. (CAPTCHA later.)
- ~~Redeploy drive-token~~ DONE 12 Nov (owner).
- ~~Delete leftover folders~~ DONE 12 Nov (checked: plain build output, no links).
- iPad checks at the top of docs/plans/owner-checks-pending.md once the build is live.
- Review the mock-ups: toolbar v2/v3, book annotations.
- BUG-002 (format bar moves/extends beyond its bounds): no screenshot needed (owner, 12 Nov). The build adds an automatic test (bar stays inside the screen on iPad sizes) AND puts it in the owner's iPad test checklist.
- Claude connector plan: docs/plans/claude-connector-plan.md. Questions:
  - (1) write access ON from the start (the owner said read+write) vs off until allowed in Settings;
  - (2) the key in Windows Credential Manager;
  - (3) run from the local repo (not npm) at first;
  - (4) Claude edits existing text only via the Inbox, while appends and new pages go straight in;
  - (5) reads logged locally only;
  - (6) no delete ever.
    Note: PC only, not iPad. Slices 1–4 are built (docs/features/claude-connector.md); the Inbox, audit screen and rate limits (5–6) are next.

    Note: PC only, not iPad. Connector A slices 1–2 are built; connector B (online) slices 1–8 are built on main and not deployed (docs/features/claude-connector.md has the owner steps).
- OWNER (11 Nov): the Claude connector is the app's MAIN USP.
  - PRIMARY: from the Claude UI, Claude builds whole notebooks for the user using ALL app features (notes, summary, recall cards, databases, layouts, styles, books/highlights…), so the user gets the best notebook with ultimate customisation, then refines by chatting.
  - SECONDARY: refine AI mid-work inside the app (a Claude chat in the notebook).
  - Open decision: A local (PC, private) vs B online (claude.ai everywhere, opt-in server access) vs both. Recommended: both, with B as the main path for regular users.
- OWNER: connector = BOTH (B online main path, opt-in; A local for privacy). Quality standard written: docs/design/quality-standard.md (+ rules/building.md pointer), owner-approved.
- Connector B plan in docs/plans/claude-connector-plan.md. Questions: Supabase hosting? escrow 30-day expiry? Inbox thresholds? notebooks scope? B first? (picks: yes / yes / >30% or cards / default all / B first). Deploying needs the owner's OK.
- Toolbar mock v3 (Fable, the reorganised Professional): https://claude.ai/artifact/ (v3 link in chat). Questions for the owner:
  1. Pen/Ballpoint/Sticky note labels in Beginner too.
  2. "Callout" appears 3 times; rename the Box look to "Accent"?
  3. Layers in both Pen and Lasso, or Pen only?
  4. The layer chip on the Pen pill only with 2 layers.
  5. Lasso Move/Scale/Rotate on text: does "no rotate on boxes" cover it?
  6. Favourites in Pen ▾ Colour vs at the pill end.
  7. The Layout icon and the Professional ▾ chip open the same menu; "Show names" is still in Settings.
- Claude connector A (local, now with writes + device list) is built; setup and the SQL to run are in docs/plans/owner-checks-pending.md. Google setup needs the Supabase redirect http://127.0.0.1:53682/callback.
- Account gate open question: also freeze cards review, tasks, habits, database cells and ink while signed out? (now only pages/notebooks are frozen)
- Mock feedback (24 comments) in docs/plans/mock-feedback-2026-11-11.md. Building the final toolbar mock (T1–T14) and annotations v2 (A1, A3–A7). A2 (reader lock modes) needs research + owner questions.
- A2 reader lock: research + 5 questions in docs/plans/mock-feedback-2026-11-11.md (picks: 3 modes / Select with a tool / tap to unlock / per book / notes open read-only).

## Complete reader mode revamp (owner, 11 Nov night)

Three ways of using the reader, as presets:

1. **Read**: pure reading, nothing to disturb.
2. **Light study**: highlight, notes and basic tools.
3. **Deep study**: full knowledge capture.
   Highlights flow automatically into a notebook per book, and a cross-book Highlights database (10 books → one DB) has one-tap jump-to-context. The lock modes are part of the presets. Goal: a lifelong personal knowledge bank (Obsidian/researcher style).
   Next: deep research (Obsidian, Readwise, Zotero, LiquidText, MarginNote, Kindle, Apple Books, zettelkasten/PKM), then questions to the owner, then a "Complete reader mode" mock-up.

- Reader revamp plan: docs/plans/reader-revamp-plan.md. 10 owner questions (picks: Read preset uses Reading mode; Light study default; Deep study for everyone; virtual DB rows; Light-study highlights in the DB too; merge duplicates; keep cards marked 'source deleted'; renamable colour meanings; 5 Daily Highlights; Markdown+CSV now, Obsidian later). Mock-up being built with these picks.
- OWNER reader answers (11 Nov night):
  - Read preset keeps quick highlights; the Full/Frozen lock board stays separate.
  - A new book opens in the LAST used preset; the first-ever default is the full "editing" mode (Everything works), not Light study.
  - A full-screen option.
  - FIX the reader top bar always looking blurry.
  - Professional toolbar: a separate tab gathering audio + formats.
  - LIBRARY revamp: a knowledge database tab (all books + per book), notes filterable, highlights+notes in one place with a side preview, the knowledge bank alongside.
  - Deep-study extras: research and explain the best ideas with examples; complex ones go in Professional.
  - ORDER: Library first → then reading mode → then the study modes. Ask questions before each mock-up.
- Library questions (docs/plans/library-revamp-plan.md A5, 10 questions; picks marked there) + which deep-study ideas 1–5 go with the Library.
- REAL-BUILD requirement (owner): box resize/move handles must be easy with the Apple Pencil: ≥44 pt hit area, pointer capture, touch-action none, no switch to ink mid-drag, a small dead-zone, grow-on-grab feedback, live resize.
- REAL-BUILD fix (owner): the main bar's 'more tools' scroll arrow overlaps the last icon (Backspace). Give it its own slot at the right end, never over a tool.
- OWNER (11 Nov night): apply the toolbar mock-up approach to the OTHER areas too (Search, Home, Review/cards, Notebooks/sidebar, Settings), but NOT Reader/Library (in progress). Learned patterns are in docs/design/owner-ui-patterns.md. Mock-ups are being built per area.
- REAL-BUILD requirement (owner): resize handles pick the NEAREST handle, side vs corner zones don't overlap, and a short hold with feedback before the drag commits. The text box must never wrap letter by letter (one line until near the right margin).
- Home mock: published. Questions (picks): Beginner 4 cards; a Daily Highlight from saved highlights; Continue as a sideways row; glance widgets as counts only; Tasks/Plan/Routines/Reports as tabs.
- Notebooks mock: published. Questions (picks): Trash in the quiet corner + a More tab; a star only on pinned covers; add Duplicate/Reset look/Start on; tree grip in Professional only; Lock & Allow AI in a Privacy tab only.
- Search mock: published. Questions (picks): a side panel (not a popup); scope starts at Notebook; Beginner chips All/Pages/Notes/Cards; Books & Highlights shown as 'Soon'; keep Pencil scribble search; no save-search in Beginner.
- Review mock: published. Questions (picks): add reverse + true/false card types first; undo last rating yes; card editor inside Review yes; forecast chart yes; the Coverage tab is mock only.
- Settings mock: published. Questions (picks): the experience picker sets the view (New/Little → Beginner, Experienced → Professional); Pencil gets its own category; merge AI/Permissions/Connections/Claude; a 7-step tour; the scheduler visible in Beginner; small 'Pro' tags.
- Home dashboard plan: docs/plans/home-dashboard-plan.md, 11 questions (picks in bold there).
- REAL-BUILD requirement (owner): resize dots sit OUTSIDE the box; their hit area extends outward only, never over the text, so caret taps near the edge never grab a handle.
- REAL-BUILD requirement (owner): pressing a box's grip drops the typing cursor (blur + collapse the selection) and blocks typing until the move/menu ends.
- REAL-BUILD requirement (owner): cards/sheets are a layer — taps/scroll inside never reach the page; the first outside tap only closes the card (swallowed; pills/strips excepted); card controls keep the text selection; fields return focus to the previous caret.
- Shared app shell spec: docs/design/shell-spec.md (23 contradictions found between mocks; all mocks are being moved onto the shell). Rail icon picks: Library = books on a shelf, Notebooks = notebook + pencil, Review = flashcards + tick (B options in the mock). Shell decisions to confirm: the More sheet docks right at full height (full screen on phone); the phone tab bar is attached full width; breakpoints 640/1180.
- OWNER: Beginner toolbar also gets a small Shapes & drawing aids icon (simple card).
- REMIND OWNER: test the right-docked full-height More sheet on the iPad (real use) once built.
- PAUSED 12 Nov (owner at 93% of the limit): shell adoption for search/review/settings/annotations mocks (restart after the reset), the CI WebKit debug watcher (TEMP logging 84e0e9b still on main; read the [tapdbg]/[rddbg] logs, fix, then revert). Only planning continues.

## Review mock: owner note (12 Nov), apply only in the real build

- Search and Review mock-ups are approved ("okay to pass").
- Review › More: "Again comes back after…" row has image and text overlapping; fix the layout in the real app.
- BUG (iPad): the sidebar covers the reader bar's ✕ (Exit reading). Found by CI 12 Nov; fix in a real-build slice.
- Real build (reader): the reader bar and the drawing bar must minimise/restore independently (each edge handle restores only its own bar). Owner, 12 Nov.
- Real build (reader): Listen long-press = hold only (release must not also start read-aloud); no selection/callout on long-press. Owner, 12 Nov.

## Book annotations / Reader mock: APPROVED by owner (12 Nov 2026), build with these conditions

Mock: claude.ai/artifact/UQuji6cLjk9PNuuF9vsGEB (all owner comments on it are build requirements).

1. "Highlight where I land" switch: the jump/scroll glow is ON for new users and can be turned off (remembered).
2. The reader bar and the drawing bar minimise/restore independently.
3. Sticky note: tapping opens a READ view that looks like a real sticky note (paper colour, text, ✕, ✏️). Only ✏️ opens the edit dialog; a new note opens in edit.
4. Listen: tap = read aloud; hold = settings only (release must not start playback); no selection/callout on long-press.
5. Pages-grid edits change the real book (Undo + Restore original); no dimming behind the panel; Minimise hides the whole strip; edge-tap page turns with a slide; voices by type with pins; Style "Full" by default; ✕ on every dialog; customisable tabs Pages/Outline/Annotations/+.
6. The top-bar AI button needs a rework: do it together with the AI mode build (not in this mock).

- Real build (Home): widget drag uses live reflow preview; a wide widget dropped between small ones lands there (small ones wrap); impossible spots snap to nearest fit. Owner, 12 Nov.

## Home dashboard mock: APPROVED by owner (12 Nov 2026), build with these conditions

Mock: claude.ai/artifact/NqQG7z5SGyLv5YxnkArK9e (all owner comments on it are build requirements).

1. Remove the leftover top-bar Done button (the edit bar has its own Done/Cancel/Reset).
2. Drag uses a live reflow preview: other widgets slide out of the way while dragging (app-wide rule).
3. A wide widget dropped between small ones lands there (small ones wrap); impossible spots snap to the nearest fit.
4. Widget size S/M/L applies visibly (short animation, selected size shown); a widget can never vanish.
5. "Where this comes from" (was "Built from") opens a separate pop-up with ✕/Esc/tap-outside; the widget never swaps its content (app-wide rule).
6. Plain words: "Period" → "Time range" ("Edit time range", "Show: Today / This week…"); help lines in everyday words, one idea per line, identical in Beginner and Professional (app-wide rule).
7. Optional gap: a "Pending items" widget (overdue + open tasks); ask the owner when building.

## Settings mock v3: APPROVED by owner (12 Nov 2026), build with this condition

Mock: claude.ai/artifact/RqQwq5CgT1srfExuQPnP46 (incl. Professional features switches, 169 items in scratchpad pro-features.md; re-check the Home/Library counts).

1. The "Bold · Pen · Read" preview illustration (a setting preview) pops out too much: redo it in calm theme colours/style, matching the design rules.

## Toolbar mock v6: APPROVED by owner (12 Nov 2026), build with these conditions

Mock: claude.ai/artifact/UNS1UzPv4wb6errBrtpv4h (v6; sources and mapping in scratchpad v6\; old → new map in v6\mapping.md, 878 probes).

1. Visible feedback for every setting change: the changed part glows briefly, new items slide/fade in, a toast with Undo, a tiny live preview per row (app-wide rule).
2. Professional: "+" at the end of each tool row to pin any setting (reorder, rename, remove, group); overflow goes into "⋯ more pinned ▾", never sideways scroll; Beginner unchanged.
3. The Box card opens beside the selected box, never over it.
4. Remove the second minimise on the text box's own mini-bar; remove the top-bar Done if it has no purpose.

- Real build (AI): a tool framework, where every catalog tool is a defined action (inputs, outputs, where it writes) the AI can chain into plans; Studio multi-select builds one plan. Owner, 12 Nov.

## AI mode mock v4: APPROVED by owner (12 Nov 2026), build with the owner's comments

Mock: claude.ai/artifact/7rKh3JHCSZwHcPZQ2DdSTD (all owner comments on it are build requirements). Framework: docs/design/ai-tool-framework.md (8e3ff82). Explainer: docs/design/ai-flow-explained.pdf.

- Jobs tab still uses the v3 run flow: switch it to the framework executor in the build.
- The "Plan ready" toast must not cover the plan title.

## Library mock v2: APPROVED by owner (12 Nov 2026)

Mock: claude.ai/artifact/Ffc86ofYpqurWGnMvsXS3L (Fable v2; study in scratchpad library-v2\study.md). Owner said yes to: Continue-reading first + covers, one "+ Add", shelves only in the side panel, filters in More with active-filter chip, universal Tag picker, Knowledge highlights-first + Export "What to include", Professional = one extra row.

- Build: the universal Tag picker everywhere (notebooks, AI bar, highlights); fix the Professional 820-portrait filter row wrap; re-probe all 34 inventory features; cover tap keeps opening the notes page (Continue reading first in ⋯).

## LATER (owner, 12 Nov 2026): design together when the owner says

- Study modes: summary layers, theme pages, links between notes, reading journal, chapter recap, Quiz/Teach-back (AI), focus session (ideas in docs/plans/library-revamp-plan.md B6–B10). Open questions: which modes, where they live (Study tab vs own space vs Review), Beginner vs Professional.
- First-launch welcome + tours (New / Used it a little / Experienced).

## Toolbar mock v8: APPROVED by owner (12 Nov 2026)

Mock: claude.ai/artifact/UNS1UzPv4wb6errBrtpv4h; sources docs/mockups/toolbar-v8/ (Fable design-study.md = card system for the whole app). Last change: Favourites on the Text row too (same as Pen). Earlier v6 conditions are built in.

## Carry-over review (owner, 12 Nov 2026; done a day early)

- Root causes (one event router, one gesture router, one selection store, one overlay manager) = FIRST slice of the real build.
- Security mediums (PIN attempt delays + longer PIN, ask before loading remote pictures, headers) = fix in the build.
- Custom Views = skipped for now (parked).
- Home: ADD the "Pending items" card (overdue + open tasks).
- BUG-003 (auto-hide toolbar while writing + small "Show toolbar" pill) and BUG-004 (forced full-screen update only when needed, 5 s countdown) = build's first slices. Check: BUG-003 must sit with toolbar v8's Minimise (an optional setting "Hide toolbar while writing", same pill style); BUG-004 keeps the optional update pill for normal updates (no contradiction).
- Text box v2 (half-built): Fable decides reuse vs restart, following the approved toolbar/Box design and rules/quality.md.
- Old ideas: layers, shrink a box to scale its text, snapshot Lasso → mock-up batch 3; update bar → batch 6.
- BUG-001 / BUG-002 = fix within the build (no work on the current app now; saves tokens).
- Owner: PLANNING ONLY now; execution later in auto mode (owner sleeps).

## Favourites row + Organise + long-press strip + Paste: APPROVED (owner, 12 Nov 2026)

Pictures and mock: docs/mockups/favourites/. Favourites live inside the tool row on every tab, with "+" (Add form: tool → Current setup / Any preset → ticks → preview → name) and "☰" (Organise sheet: live preview, big rows, drag handle + ▲▼ + Move to start/end, remove with Undo, Reset, Add, Done; full-height on phone). The ★ custom tool is removed. Long-press = right-click = a horizontal GoodNotes-style strip above the selection; paste keeps the original by default, Paste ▾ offers formats, and Settings has a default paste format. Fix in the build: the B/I/U bar covering the selection handles; phone "More favourites" items must be tappable.
