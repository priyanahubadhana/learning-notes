# Gate 3 pictures: toolbar.v8 slices 1e, 1f and BUG-003

Taken with `SHOTS=1 npx playwright test e2e/toolbarV8TextGate3Shots.spec.ts` on the head commit of the gate 2 fix round (see the last commit message; flag ON, after the last source edit). File name: `<screen>-<size>-<theme>-<level>.png`. Sizes: phone 390x844, ipad-landscape 1180x820, ipad-portrait 820x1180, pc 1440x900. Themes: day, night, sepia. Professional on iPad landscape and PC only.

## Screens

| Screen prefix | What it shows                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------- |
| `textrow-`    | Text row: settings, Box, Format, B, I (TB-40)                                                     |
| `format-`     | Format card (TB-41)                                                                               |
| `formatadv-`  | Format card scrolled to Advanced: fonts in their own face, line height (TB-41), Professional only |
| `box-`        | Box card beside the selected box (TB-42)                                                          |
| `boxset-`     | Box settings button card                                                                          |
| `insert-`     | Insert card (1f)                                                                                  |
| `more-`       | ⋯ card with its Tool bar group (1f)                                                               |
| `alltools-`   | All tools card, Professional (TB-63)                                                              |
| `pill-`       | Bar turned off: the one Show toolbar pill (BUG-003)                                               |

## Repeat-fault list (docs/ECONOMY-MODE.md section 7)

- [x] thin scroll track under any row that is cut off: `alltools-*`, `insert-*`, `format-*` (Professional) show the thin track; the Text row folds into ⋯ instead of scrolling sideways.
- [x] toast above the phone tab bar, never on it: `pill-phone-*` taken after the toast closed (waited until it was gone).
- [x] sidebar closed on iPad portrait: all `*-ipad-portrait-*` (hideSidebar).
- [x] shared parts only: Card, Tile, TileGroup, CardGroup, MinimiseChip; Lucide icons; no browser drop-downs.
- [x] no key names on touch screens; the focus ring shows for the keyboard only (all pictures use taps).
- [x] Light, Dark, Sepia with real data, tips and toasts closed, taken after the last source edit.
- [x] both levels; iPad landscape and portrait, phone, PC.

## Fix proof

- Box card never covers the box: `box-*` (iPad portrait: card left of the box frame; phone: card above the box).
- One Show toolbar pill, readable in all themes, inside the screen: `pill-*`.

## Pictures

- alltools-ipad-landscape-day-professional.png
- alltools-ipad-landscape-night-professional.png
- alltools-ipad-landscape-sepia-professional.png
- alltools-pc-day-professional.png
- alltools-pc-night-professional.png
- alltools-pc-sepia-professional.png
- box-ipad-landscape-day-beginner.png
- box-ipad-landscape-day-professional.png
- box-ipad-landscape-night-beginner.png
- box-ipad-landscape-night-professional.png
- box-ipad-landscape-sepia-beginner.png
- box-ipad-landscape-sepia-professional.png
- box-ipad-portrait-day-beginner.png
- box-ipad-portrait-night-beginner.png
- box-ipad-portrait-sepia-beginner.png
- box-pc-day-beginner.png
- box-pc-day-professional.png
- box-pc-night-beginner.png
- box-pc-night-professional.png
- box-pc-sepia-beginner.png
- box-pc-sepia-professional.png
- box-phone-day-beginner.png
- box-phone-night-beginner.png
- box-phone-sepia-beginner.png
- boxset-ipad-landscape-day-beginner.png
- boxset-ipad-landscape-day-professional.png
- boxset-ipad-landscape-night-beginner.png
- boxset-ipad-landscape-night-professional.png
- boxset-ipad-landscape-sepia-beginner.png
- boxset-ipad-landscape-sepia-professional.png
- boxset-ipad-portrait-day-beginner.png
- boxset-ipad-portrait-night-beginner.png
- boxset-ipad-portrait-sepia-beginner.png
- boxset-pc-day-beginner.png
- boxset-pc-day-professional.png
- boxset-pc-night-beginner.png
- boxset-pc-night-professional.png
- boxset-pc-sepia-beginner.png
- boxset-pc-sepia-professional.png
- boxset-phone-day-beginner.png
- boxset-phone-night-beginner.png
- boxset-phone-sepia-beginner.png
- format-ipad-landscape-day-beginner.png
- format-ipad-landscape-day-professional.png
- format-ipad-landscape-night-beginner.png
- format-ipad-landscape-night-professional.png
- format-ipad-landscape-sepia-beginner.png
- format-ipad-landscape-sepia-professional.png
- format-ipad-portrait-day-beginner.png
- format-ipad-portrait-night-beginner.png
- format-ipad-portrait-sepia-beginner.png
- format-pc-day-beginner.png
- format-pc-day-professional.png
- format-pc-night-beginner.png
- format-pc-night-professional.png
- format-pc-sepia-beginner.png
- format-pc-sepia-professional.png
- format-phone-day-beginner.png
- format-phone-night-beginner.png
- format-phone-sepia-beginner.png
- insert-ipad-landscape-day-beginner.png
- insert-ipad-landscape-day-professional.png
- insert-ipad-landscape-night-beginner.png
- insert-ipad-landscape-night-professional.png
- insert-ipad-landscape-sepia-beginner.png
- insert-ipad-landscape-sepia-professional.png
- insert-ipad-portrait-day-beginner.png
- insert-ipad-portrait-night-beginner.png
- insert-ipad-portrait-sepia-beginner.png
- insert-pc-day-beginner.png
- insert-pc-day-professional.png
- insert-pc-night-beginner.png
- insert-pc-night-professional.png
- insert-pc-sepia-beginner.png
- insert-pc-sepia-professional.png
- insert-phone-day-beginner.png
- insert-phone-night-beginner.png
- insert-phone-sepia-beginner.png
- more-ipad-landscape-day-beginner.png
- more-ipad-landscape-day-professional.png
- more-ipad-landscape-night-beginner.png
- more-ipad-landscape-night-professional.png
- more-ipad-landscape-sepia-beginner.png
- more-ipad-landscape-sepia-professional.png
- more-ipad-portrait-day-beginner.png
- more-ipad-portrait-night-beginner.png
- more-ipad-portrait-sepia-beginner.png
- more-pc-day-beginner.png
- more-pc-day-professional.png
- more-pc-night-beginner.png
- more-pc-night-professional.png
- more-pc-sepia-beginner.png
- more-pc-sepia-professional.png
- more-phone-day-beginner.png
- more-phone-night-beginner.png
- more-phone-sepia-beginner.png
- pill-ipad-landscape-day-beginner.png
- pill-ipad-landscape-day-professional.png
- pill-ipad-landscape-night-beginner.png
- pill-ipad-landscape-night-professional.png
- pill-ipad-landscape-sepia-beginner.png
- pill-ipad-landscape-sepia-professional.png
- pill-ipad-portrait-day-beginner.png
- pill-ipad-portrait-night-beginner.png
- pill-ipad-portrait-sepia-beginner.png
- pill-pc-day-beginner.png
- pill-pc-day-professional.png
- pill-pc-night-beginner.png
- pill-pc-night-professional.png
- pill-pc-sepia-beginner.png
- pill-pc-sepia-professional.png
- pill-phone-day-beginner.png
- pill-phone-night-beginner.png
- pill-phone-sepia-beginner.png
- textrow-ipad-landscape-day-beginner.png
- textrow-ipad-landscape-day-professional.png
- textrow-ipad-landscape-night-beginner.png
- textrow-ipad-landscape-night-professional.png
- textrow-ipad-landscape-sepia-beginner.png
- textrow-ipad-landscape-sepia-professional.png
- textrow-ipad-portrait-day-beginner.png
- textrow-ipad-portrait-night-beginner.png
- textrow-ipad-portrait-sepia-beginner.png
- textrow-pc-day-beginner.png
- textrow-pc-day-professional.png
- textrow-pc-night-beginner.png
- textrow-pc-night-professional.png
- textrow-pc-sepia-beginner.png
- textrow-pc-sepia-professional.png
- textrow-phone-day-beginner.png
- textrow-phone-night-beginner.png
- textrow-phone-sepia-beginner.png

## Gate 2 fix round: which picture proves each fix

| Fix                                                                           | Picture                                                                                  |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| TB-41 fonts in own face + line height                                         | `formatadv-<size>-<theme>-professional.png` (iPad landscape, PC)                         |
| Action tiles (headings, indent, divider)                                      | `format-*` look unchanged; role proved by e2e "headings, indent and divider are buttons" |
| Box look Undo/Redo, tuck 200 ms, Pencil tuck, reload peek, Pro switches alone | e2e only (no picture change)                                                             |
