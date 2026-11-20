# Note for Opus: the two rare Lasso problems, "(a)" and "(b)" (Fable, 20 Nov 2026)

The owner asked for this note so that Opus can explain the two problems and keep asking about them. **The letters (a) and (b) are our labels, not the owner's words.** When you talk to the owner, describe what is seen on the screen; do not say "bug a" without the description.

## What the owner reported (20 Nov, Circle recorder OFF)

The Lasso works fine. About 1 or 2 times in every 5 to 10 uses:

- **(a) "Old Lasso outlines stay on the screen."** After circling something, the dashed loop or the dashed selection box does not go away when it should. It is left behind like a ghost line.
- **(b) "After the Pencil lifts, the old selection stays active, and the next Lasso stroke still acts on the old selection for a moment."** The owner lifts the Pencil and starts a new loop, but for a moment the app behaves as if the first loop were still going on.

Source: fable-brief-smart-select.md section 14. Spec lines that fix them: docs/features/lasso.md LS-50 to LS-56.

## How to explain it to the owner (plain words)

"When you lift the Pencil, the iPad should tell the app 'the Pencil is up'. Now and then that message never arrives. The app then thinks you are still drawing the loop: the outline stays (a), and when you touch again it is still busy with the old loop for a moment (b). The Pen and the Eraser already have a guard for this since 19 Nov; the Lasso does not have one yet."

Be honest: this cause was found by **reading the code** (lasso-inventory-2026-11-20.md section 4). It is not proven on the iPad. The fix starts with a test that replays it and fails first. If the owner's answers below do not fit this story, look for another cause before building.

## What to ask the owner the next time it happens (2 to 4 lines are enough)

1. Was the Pencil still close above the screen (hovering) after you lifted it?
2. Did the left-over outline **keep growing or follow the Pencil**, or did it sit still?
3. Did your next stroke **do nothing**, or did it **move or change the old selection**?
4. What did you do just before (a bar button, a resize, your hand resting on the screen, a tool change)?

Read the answers like this: "outline follows the hovering Pencil" and "next stroke does nothing" fit the lost-lift story (LS-50, LS-52). "Outline sits still and never goes" points to the fade or the left-over line selection (LS-51, LS-55). "Next stroke moves the old selection" may simply be a stroke that began inside the old box, which moves it on purpose (LS-26); check LS-53.

## The owner's first answer (20 Nov): "I keep my hand on the screen while circling with the Lasso"

This is a second lead, and maybe the main one. The Lasso has no palm guard (the Pen and the Eraser ignore touches for 0.7 s around a Pencil stroke; `accepts` in src/ink/controller.ts). Under the Lasso a touch is a finger: a tap places the typing cursor (LS-03), a touch during a move becomes the second finger of a twist (LS-29), a drag scrolls. A resting palm can therefore drop or change a selection, or keep a gesture open. Plain words for the owner: "Your hand on the glass may be read as a finger. The Pen already ignores it; the Lasso does not yet."

So the order is: the quiet recorder first (Part A2), one real trace from the owner (check C1a), then the fix (Part A1) written from what the iPad really sent. Spec lines LS-57, LS-58 and scenario S10.

## More answers (20 Nov, evening)

- In Pencil mode a finger never draws (only in Touch or Computer mode), so the palm does not draw its own loop on the owner's iPad. The two palm routes that remain are the twist and the cursor placed in the middle of a loop.
- Still to ask, in plain words (the owner did not understand the first wording): "You have something selected, with its dashed box. You start a new circle close to it. If the Pencil first touches inside that dashed box or right at its edge, the app moves the old thing instead of starting a new circle. Was your Pencil starting on or very near the old dashed box when it went wrong: yes, no, or not sure?"

## Standing reminder (owner, 20 Nov: "keep reminding me at the end")

Until the owner has passed the A1 iPad check, **end every message to the owner with one line**:

> Reminder: if a Lasso outline stays on the screen, or a new loop acts on the old selection, tell me what you saw (was the Pencil hovering, did the outline move, what did the next stroke do).

Also keep the Settings switch "Circle recorder" OFF (its red lines disturbed the Lasso and the Text tool on 20 Nov); Part A2 replaces it with a recorder that draws nothing.
