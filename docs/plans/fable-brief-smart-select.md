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
