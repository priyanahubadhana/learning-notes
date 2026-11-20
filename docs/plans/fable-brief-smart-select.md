# Brief for Fable: Pencil selection + one smart selection bar (Opus, 19 Nov 2026)

For the owner's planning session with Fable (from 20 Nov). Read this, then the linked files only as needed.

## 1. The owner's goal

The owner's main iPad use (about 60%) is **editing AI-made notes with the Apple Pencil**: select a word or a few letters → delete / paste → write over with Scribble. Scribble always stays ON. The rest is voice to text. (owner-decisions.md "The owner's main iPad flow")

## 2. What we proved (evidence)

- **Under Scribble, Safari keeps the whole Pencil stroke on text:** the page gets one pointerdown + one pointermove, then nothing until touchend. Our own circle reader cannot work in the Text tool. (pencil-select-plan.md, Trace 1)
- **Scribble's circle selects the word LEFT of where the circle starts** (it puts the caret at the start point, a word gap, and takes the word on its left). Not fixable from a web page. (Trace 2)
- **Our code and Scribble fight over the selection** (7 flips in 300 ms = the flicker the owner saw).
- **Apple's Paste/Select bar beats ours ~19 of 20 double taps** on the real iPad; tests in the browser cannot reproduce Scribble.
- **Taps do reach the page**, so double/triple tap can be ours.
- **The Lasso works perfectly on the iPad** (it does not compete with Scribble).
- A web page cannot switch Scribble off (native apps like Goodnotes can, per view).
- Bugs open now: B11 (Text-tool circle leaves ink), B12 (Paste ▾ missing in the owner's own top row).

## 3. Already decided by the owner

- Precise selection lives in the **Lasso**: circle part of a word or whole words; double / triple / four taps = word / line / paragraph; our highlight (strong purple + 2 handles); after an action or a tap → back to the Text tool with the cursor (Delete → cursor in the gap). The Lasso keeps everything it does today.
- **One smart selection bar** replacing the Lasso's drawing bar, the text selection mini bar and the selection parts of the box bar; **based on the one bar** (Goodnotes-style box bar of 18 Nov) and its premium look; nothing dropped.
- Content-driven: text → text buttons (Paste ▾, Copy, Cut, Delete, B/I, Colour, Highlight); ink → drawing buttons (Thickness, Colour, Turn, Resize, Move, Duplicate…); mixed → mixed; pictures → picture buttons.
- **Presets: Edit and Study** (each with format options inside); maybe **Text + drawing**. No Format or Drawing preset.
- **Auto by default**; a Setting can turn Auto off for one fixed bar everywhere. Customisable (which buttons, order).
- Paste: Paste ▾ in the top row (Pencil mode with Mic, Backspace, Enter), Keep look default, More…; one name per option everywhere.
- Idea to discuss: **the Goodnotes approach** — a tap on text switches to the Lasso by default (IDEAS.md).
- Idea to test later: while a box is selected (not typing), switch Scribble off for that box so circling works in the Text tool too.

## 4. Research (docs/research/smart-selection-bar.md)

Goodnotes: Lasso selects handwriting, pictures, text boxes, sticky notes; "Included in selection" filter; type-specific object menu; Goodnotes 7 lost goodwill by making the toolbar less customisable. Notability: text moved/resized with the Lasso. MyScript Notes: pen gestures edit text. General: contextual bars near the selection, only relevant controls, few primary buttons on small screens, accessible names. Purpose presets are rare in competitors.

## 5. Questions for Fable to decide (with Opus's pick)

1. **Tap on text in the Text tool → switch to the Lasso automatically (Goodnotes approach), or keep two tools?** Pick: keep two tools for now; measure after the Lasso text selection ships; the auto-switch is the riskiest part (cursor loss bugs we had before).
2. **One bar component or one look shared by several bars?** Pick: one component with a "selection kind" input (text / ink / picture / mixed / box) and a preset; less code, one look.
3. **Preset storage and editing:** where (Settings › Toolbars next to the top row customiser?), per device or synced? Pick: same place and storage as the top row customisation (device setting), so it works offline and matches.
4. **Mixed-selection filter (Text / Ink / Pictures toggles):** in or out for v1? Pick: in, only shown for mixed selections.
5. **Order of building** (each a slice, Sonnet builds, Opus reviews, owner checks on the iPad):
   a. B11, B12 (running now);
   b. Lasso text selection (letters, taps, highlight, handles, auto-back) using the CURRENT bars;
   c. the smart bar (inventory → picture → build), then presets and the filter;
   d. the "Scribble off while a box is selected" experiment.
   Pick: this order — the owner gets the precise selection first; the bar redesign then lands once.
6. **What must be proven on the real iPad** (no browser test can show Scribble): the circle recorder traces per slice; a "we will prove" list per slice (pencil-select-plan.md).
7. **Phone and computer:** the smart bar on the phone (few buttons + ⋯) and with a mouse — same presets? Pick: same presets, fewer buttons shown on the phone.

## 6. Must never happen (owner)

- While writing with Scribble, a letter loop is never taken as a selection; the bar never interrupts writing.
- A circle on words never brings Apple's bar.
- Words selected + scribble over them = delete.
- The Text tool never creates ink (B11).
- A redesign never drops a feature.

## 7. Files

owner-decisions.md (sections from "The owner's main iPad flow" on), pencil-select-plan.md, research/smart-selection-bar.md, combined-test-2026-11-16.md (F5–F7, B8–B12), refs/goodnotes-lasso-text-1/2.png, refs/paste-mock2-approved.png, IDEAS.md.

## 8. Owner's Goodnotes study (19 Nov, 18:08) — changes the frame

Pictures: refs/goodnotes-lasso-box-level-1/2.png, refs/goodnotes-lasso-text-level.png.

- **Goodnotes has two levels.** With **no typing cursor** in a box, the Lasso treats a text box as one object: a lasso round it selects the whole box and shows the **box bar** (AI, colour, size │ Resize, **Edit Text**, │ Cut, Duplicate, Delete, ⋯); a stroke inside the box drags the box; it never selects words; outside, it pans the page.
- **With the typing cursor active in a box** (after Edit Text or a tap in the text), the Lasso selects **text inside that box**, with handles, and shows the **text bar** (AI, colour, 26, Aa, B/I, align, list │ highlight, link, cut, copy, ⋯), plus a keyboard accessory bar at the bottom (undo, keyboard, indent, lists, align, B I U S, mic, return).
- Owner's reading: this split is how Goodnotes keeps Apple's bar away. Opus: Goodnotes, as a native app, can also turn Scribble off per view; we cannot — but our Lasso does not wake Scribble, so the same two-level model is possible for us.
- **New frame for Fable:** Box level (object) vs Text level (inside an edited box). The smart bar has a box state, a text state and ink/picture states. Our current box bar ≈ Goodnotes' box bar; our text selection bar ≈ its text bar.

## 9. Owner answers after the Goodnotes study (19 Nov)

- **Two levels: yes.** Box level (no cursor: the Lasso picks whole boxes, ink, pictures; box bar) and Text level (cursor in a box: the Lasso picks letters/words inside that box; text bar).
- At Text level, a Lasso stroke **outside** the edited box ends editing and selects objects (box level).
- Box → Text level: an **Edit Text** button on the box bar **and** a tap near the words.
- Bottom keyboard bar while typing: **open** — the owner will share more examples first.
- Still open from section 5: Goodnotes auto-switch (now mostly answered by the two levels), the mixed-selection filter, preset place, build order, phone.

## 10. Goodnotes text level has two bar states (owner, 19 Nov 18:16)

- **Cursor only** (refs/goodnotes-text-cursor-bar.png): AI, colour, size 26, Aa, B/I, align, list │ highlight, ⋯ — formatting for what is typed next.
- **Words selected** (refs/goodnotes-text-selected-bar.png): the same, plus **link, cut, copy** — the selection actions are added on the right; the bar keeps its place and shape otherwise.
- Both keep the bottom keyboard bar. Lesson for the smart bar: one bar, same order; selection actions appear/disappear at the end instead of swapping to a different bar (calm, predictable).

## 11. Goodnotes mixed selection (ink + text box) (owner, 19 Nov 18:20)

- Lasso round a text box with ink on it → the **box bar** (AI, colour, size │ Resize, Edit Text │ Cut, Duplicate, Delete, ⋯) (refs/goodnotes-mixed-bar.png).
- **Resize** → square corner handles + a rotate handle, and a short bar: Cut, Copy, Duplicate, Delete, ⋯ (refs/goodnotes-mixed-resize.png).
- **⋯** → Cut, Front, Back │ Copy, Duplicate, Paste, Paste and Match Style │ Take Screenshot, Add to Image Playground, Create Element │ Ask Siri (some are iPadOS system items) (refs/goodnotes-mixed-more.png).
- Owner: "all the options are already shared in the mixed state"; Edit Text opens the text bar (cursor state).

## 12. Final owner answers before Fable (19 Nov)

- Bottom keyboard bar while typing: **No** (our top row + smart bar cover it).
- Mixed-selection filter on the smart bar: **No** — the Lasso already has its "Picks: Ink / Pictures / Text" filter; one place is enough.
- Preset editing in Settings › Tool bar (new "Selection bar" part): **picture shown** (refs/selection-bar-presets-mock.png); owner OK pending.
- Build order: **yes** — B11/B12 (merged 19 Nov, 2ce4acf2) → two-level Lasso → smart bar → Scribble experiment.
- Phone: **yes**, same presets, fewer buttons.
- **Keep today's Lasso intact (v1).** The owner's Lasso was reworked many times after copying Goodnotes did not work in our app; it has many reasoned fixes. Text-level selection is added WITHOUT losing any of it. Fable: first inventory the current Lasso (features + the reasons behind them, owner-decisions.md / DECISIONS.md / CHANGELOG "Lasso") and decide what the text level reuses. (Inventory started by Opus; finish it in the Fable session if missing.)
- Open after B12: the v8 tool row still shows Backspace/Enter in every mode (Pencil-only rule not applied there yet) — small follow-up.

## 13. Pictures and read order (checked 20 Nov)

- Mocks: refs/lasso-text-mock.png (plan OK, but the owner rejected the format bar drawn in it: use the Lasso's own bar + Paste, later the smart bar); refs/selection-bar-presets-mock.png (Settings › Tool bar › Selection bar; OK pending); refs/paste-mock2-approved.png (approved).
- Goodnotes studies: refs/goodnotes-lasso-text-1/2, goodnotes-lasso-box-level-1/2, goodnotes-lasso-text-level, goodnotes-text-cursor-bar, goodnotes-text-selected-bar, goodnotes-mixed-bar/-resize/-more.
- Read order for Fable: this brief (sections 1-13; later sections update earlier ones) → owner-decisions.md from "The owner's main iPad flow" to the end → pencil-select-plan.md (trace findings, must-never) → research/smart-selection-bar.md → IDEAS.md (Goodnotes approach, Clean up with AI). State of the build: BUILD-STATE.md line 3.

## 14. Owner iPad report (20 Nov, preview f65b1fa6) — read before planning

- "Text tool and Lasso became a mess; it was far better before."
- Text tool: wrote "Service 23/11/2000 rate -is"; a circle sometimes selects, sometimes not.
- Lasso: does not select the words; does things the owner cannot follow.
- Red lines all over the screen: these are the Circle recorder's trace lines (Settings switch "Circle recorder" ON; it draws our path in red). Turn it OFF for normal use.
- Opus: since the last good iPad state, these changes touched selection: ios-select (circleSelect.ts), circle-recorder, b11-b12 (ink/controller.ts tool check + hover ends stroke), ci-reds-2/3 (MiniToolbar, PaperFrame resize). First step for the plan: re-test with the recorder OFF; if still bad, find which slice broke the Lasso (compare with the last version the owner called good) before building anything new.
- Full CI: chromium green; ~21 WebKit reds, mostly timing, a different set each run (see BUILD-STATE).
