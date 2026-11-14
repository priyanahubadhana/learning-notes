# P1.5 pictures: the real Pencil on scroll bars, menus and lists

Taken on ipad-webkit (WebKit, touch) with the switch `foundation.shell` ON, 15 Nov 2026.

Retaken after the last source edit (commit 436e466c, merged with build/next at e3df975a). The first set showed two rows with selected (blue) text after a Pencil drag; that fault is fixed (commit 320649ba) and the pictures no longer show it.

File names: `<screen>-<size>-<level>-<theme>.png`

| Screen                  | What it shows                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `menu-after-pen-on-bar` | The tool bar ⋯ menu after a Pencil press on its own scroll bar: the menu is still open and its list has moved (SC-19)        |
| `panel-after-pen-drag`  | The pages panel over the page after a Pencil drag in its list: the list has moved and the panel shows its bar (SC-20, SC-21) |

Sizes: `ipad-upright` (820 x 1180), `ipad-sideways` (1180 x 820), `phone` (390 x 844). Levels: `beginner`, `professional`. Themes: `day` (light), `night` (dark). 2 screens x 3 sizes x 2 levels x 2 themes = 24 pictures.

Checked against docs/HOW-WE-BUILD.md section 7 by the builder: the bar look is P1.4's, unchanged (no new colour, shadow or motion). One visible change: the pages panel opened over the page now shows its scroll bar (it was drawn under the panel before).
