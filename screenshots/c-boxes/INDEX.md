# Box fixes C8 to C16: first-look pictures (switch textbox.v2 ON)

Made by `e2e/cBoxesShots.spec.ts` after the last source edit. Folders: `chromium/` and `ipad-webkit/`.
Each picture: `<state>-<light|dark>-<ipad-upright|ipad-sideways|phone>.png`. Page: one box left (Brown), two stacked right (Green, Blue).

| State | File prefix | What to see |
| --- | --- | --- |
| Typing (C11) | `1-typing-` | Thin accent border round the box, caret in it, no dots, no grip, no bar |
| Selected (C11, C16) | `2-selected-` | Only this box has 8 dots, the grip and the box bar; the others have none |
| None (C11) | `3-none-` | Nothing selected, no dots |

Notes
- Phone: a tap on bare paper makes a new box there, so the phone pictures deselect with Escape; the phone resizes width only (its own rule), so no 8 dots there.
- Beginner and Professional: the boxes and their dots are identical in both (only the Box card differs, not part of these fixes).
- C12 (frame matches fill), C13/C15 (every dot), C8 (Delete box) and C10 (pause) are checked by the e2e tests in `e2e/cBoxes.spec.ts`, not by pictures.
