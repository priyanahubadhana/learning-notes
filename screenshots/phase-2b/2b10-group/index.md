# 2B.10 first-look pictures (switch textbox.v2 ON)

Taken after the last source edit, on `chromium` and `ipad-webkit` (same file names in each folder). Theme set on the page and checked before each shot.
Approved picture: docs/mockups/textbox-2b/states.html panels 6a and 6b.

| File                                                                         | What it shows                                                                                                                           |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `group-ipad-upright-{light,dark,sepia}.png`, `group-ipad-sideways-{...}.png` | panel 6a: two boxes picked with Lasso, one pill "2 boxes", Group on, Ungroup dimmed                                                     |
| `assist-ipad-upright-{...}.png`, `assist-ipad-sideways-{...}.png`            | panel 6b: page zoomed out, Layouts strip (One column, Two columns, Six boxes, Side + two), Done, coach line; "Two columns" just applied |
| `page-phone-{...}.png`                                                       | phone: no sheets, so no Lasso loop, no pill and no Layout button (as before)                                                            |

Beginner and Professional look the same here (no mode-specific parts). Boxes wiggle in the live page (a still picture cannot show it); reduced motion is tested in `e2e/tb2-group.spec.ts`.

Review 1 changes: the Layouts strip is one row at every iPad width (label hidden when narrow, tile labels wrap inside equal tiles); the pill stays inside the paper; every box has the dashed outline in Layout Assist.
