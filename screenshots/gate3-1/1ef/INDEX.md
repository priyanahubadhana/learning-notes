# Gate 3 pictures: toolbar.v8 slices 1e, 1f and BUG-003

Taken with `SHOTS=1 npx playwright test e2e/toolbarV8TextGate3Shots.spec.ts` on head 6512a1f1 (flag ON; all 192 pictures re-shot after the last source edit, 6512a1f1; after it only pictures, this index and 70dd95cb (e2e heading list only) follow). File name: `<screen>-<size>-<theme>-<level>.png`. Sizes: phone 390x844, ipad-landscape 1180x820, ipad-portrait 820x1180, pc 1440x900. Themes: day, night, sepia. Both levels on every size (192 pictures).

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
- [x] both levels (Beginner and Professional) on iPad landscape, iPad portrait, phone and PC: all 192 pictures, Professional included (alltools and formatadv on every size).

## Fix proof

- Box card never covers the box: `box-*` (iPad portrait: card left of the box frame; phone: card above the box).
- One Show toolbar pill, readable in all themes, inside the screen: `pill-*`.
- Peek fix (17f331ec): a peek ended by Settings On or a placement change no longer hides the bar on reload: proved by e2e `TB-75 choosing On...` and `TB-75 changing the bar placement...` (toolbarV8Tuck.spec.ts), on chromium and ipad-webkit; the pictures show the bar (`textrow-*`) and the pill (`pill-*`) unchanged.

- Nineteenth visit fixes: (1) Format icon upright: `format-pc-*`, `format-ipad-landscape-*`; (2) Format stays on the phone row while its card is open: `format-phone-*`, `box-phone-*`; (3) no placeholder line in the More card: `more-pc-*`, `more-ipad-landscape-*`; (4) Box card under the bar on phone: `box-phone-*-professional`; (5) sidebar closed on iPad portrait: all `*-ipad-portrait-*`; (6) thin track only where the card is cut, grid fills the card: `format-*-professional`, `insert-*`, `box-*`, `boxset-*` (no track); (7) Box settings row with icon, look name and hint: `boxset-*`.

- Twenty-fifth visit fix 1: `formatadv-*` (all 12) now scroll the card body (`.pcard-body`) and the spec asserts scrollTop > 0 before the shot (e2e/toolbarV8TextGate3Shots.spec.ts:106-112); none is byte-identical to its `format-*` picture any more. They show the font list, Import font and the line-height tiles (Normal, Tight, Loose) at the card bottom. Gate 2: `Aa Aa` is a plain string (TextCards.tsx:96), allowed in src/i18n/hardcodedText.test.ts.

- Final-look fix (main 5051497a): the line-height group has its own "Line height" heading (TextCards.tsx:83) and each sample is 2em wide and 48 px high, so "Aa Aa" shows as two lines spaced Normal, Tight or Loose (textCards.css:72-75): `formatadv-*` (all 12).

## Pictures (192, all taken at 6512a1f1)

- alltools-ipad-landscape-day-professional.png
- alltools-ipad-landscape-night-professional.png
- alltools-ipad-landscape-sepia-professional.png
- alltools-ipad-portrait-day-professional.png
- alltools-ipad-portrait-night-professional.png
- alltools-ipad-portrait-sepia-professional.png
- alltools-pc-day-professional.png
- alltools-pc-night-professional.png
- alltools-pc-sepia-professional.png
- alltools-phone-day-professional.png
- alltools-phone-night-professional.png
- alltools-phone-sepia-professional.png
- box-ipad-landscape-day-beginner.png
- box-ipad-landscape-day-professional.png
- box-ipad-landscape-night-beginner.png
- box-ipad-landscape-night-professional.png
- box-ipad-landscape-sepia-beginner.png
- box-ipad-landscape-sepia-professional.png
- box-ipad-portrait-day-beginner.png
- box-ipad-portrait-day-professional.png
- box-ipad-portrait-night-beginner.png
- box-ipad-portrait-night-professional.png
- box-ipad-portrait-sepia-beginner.png
- box-ipad-portrait-sepia-professional.png
- box-pc-day-beginner.png
- box-pc-day-professional.png
- box-pc-night-beginner.png
- box-pc-night-professional.png
- box-pc-sepia-beginner.png
- box-pc-sepia-professional.png
- box-phone-day-beginner.png
- box-phone-day-professional.png
- box-phone-night-beginner.png
- box-phone-night-professional.png
- box-phone-sepia-beginner.png
- box-phone-sepia-professional.png
- boxset-ipad-landscape-day-beginner.png
- boxset-ipad-landscape-day-professional.png
- boxset-ipad-landscape-night-beginner.png
- boxset-ipad-landscape-night-professional.png
- boxset-ipad-landscape-sepia-beginner.png
- boxset-ipad-landscape-sepia-professional.png
- boxset-ipad-portrait-day-beginner.png
- boxset-ipad-portrait-day-professional.png
- boxset-ipad-portrait-night-beginner.png
- boxset-ipad-portrait-night-professional.png
- boxset-ipad-portrait-sepia-beginner.png
- boxset-ipad-portrait-sepia-professional.png
- boxset-pc-day-beginner.png
- boxset-pc-day-professional.png
- boxset-pc-night-beginner.png
- boxset-pc-night-professional.png
- boxset-pc-sepia-beginner.png
- boxset-pc-sepia-professional.png
- boxset-phone-day-beginner.png
- boxset-phone-day-professional.png
- boxset-phone-night-beginner.png
- boxset-phone-night-professional.png
- boxset-phone-sepia-beginner.png
- boxset-phone-sepia-professional.png
- format-ipad-landscape-day-beginner.png
- format-ipad-landscape-day-professional.png
- format-ipad-landscape-night-beginner.png
- format-ipad-landscape-night-professional.png
- format-ipad-landscape-sepia-beginner.png
- format-ipad-landscape-sepia-professional.png
- format-ipad-portrait-day-beginner.png
- format-ipad-portrait-day-professional.png
- format-ipad-portrait-night-beginner.png
- format-ipad-portrait-night-professional.png
- format-ipad-portrait-sepia-beginner.png
- format-ipad-portrait-sepia-professional.png
- format-pc-day-beginner.png
- format-pc-day-professional.png
- format-pc-night-beginner.png
- format-pc-night-professional.png
- format-pc-sepia-beginner.png
- format-pc-sepia-professional.png
- format-phone-day-beginner.png
- format-phone-day-professional.png
- format-phone-night-beginner.png
- format-phone-night-professional.png
- format-phone-sepia-beginner.png
- format-phone-sepia-professional.png
- formatadv-ipad-landscape-day-professional.png
- formatadv-ipad-landscape-night-professional.png
- formatadv-ipad-landscape-sepia-professional.png
- formatadv-ipad-portrait-day-professional.png
- formatadv-ipad-portrait-night-professional.png
- formatadv-ipad-portrait-sepia-professional.png
- formatadv-pc-day-professional.png
- formatadv-pc-night-professional.png
- formatadv-pc-sepia-professional.png
- formatadv-phone-day-professional.png
- formatadv-phone-night-professional.png
- formatadv-phone-sepia-professional.png
- insert-ipad-landscape-day-beginner.png
- insert-ipad-landscape-day-professional.png
- insert-ipad-landscape-night-beginner.png
- insert-ipad-landscape-night-professional.png
- insert-ipad-landscape-sepia-beginner.png
- insert-ipad-landscape-sepia-professional.png
- insert-ipad-portrait-day-beginner.png
- insert-ipad-portrait-day-professional.png
- insert-ipad-portrait-night-beginner.png
- insert-ipad-portrait-night-professional.png
- insert-ipad-portrait-sepia-beginner.png
- insert-ipad-portrait-sepia-professional.png
- insert-pc-day-beginner.png
- insert-pc-day-professional.png
- insert-pc-night-beginner.png
- insert-pc-night-professional.png
- insert-pc-sepia-beginner.png
- insert-pc-sepia-professional.png
- insert-phone-day-beginner.png
- insert-phone-day-professional.png
- insert-phone-night-beginner.png
- insert-phone-night-professional.png
- insert-phone-sepia-beginner.png
- insert-phone-sepia-professional.png
- more-ipad-landscape-day-beginner.png
- more-ipad-landscape-day-professional.png
- more-ipad-landscape-night-beginner.png
- more-ipad-landscape-night-professional.png
- more-ipad-landscape-sepia-beginner.png
- more-ipad-landscape-sepia-professional.png
- more-ipad-portrait-day-beginner.png
- more-ipad-portrait-day-professional.png
- more-ipad-portrait-night-beginner.png
- more-ipad-portrait-night-professional.png
- more-ipad-portrait-sepia-beginner.png
- more-ipad-portrait-sepia-professional.png
- more-pc-day-beginner.png
- more-pc-day-professional.png
- more-pc-night-beginner.png
- more-pc-night-professional.png
- more-pc-sepia-beginner.png
- more-pc-sepia-professional.png
- more-phone-day-beginner.png
- more-phone-day-professional.png
- more-phone-night-beginner.png
- more-phone-night-professional.png
- more-phone-sepia-beginner.png
- more-phone-sepia-professional.png
- pill-ipad-landscape-day-beginner.png
- pill-ipad-landscape-day-professional.png
- pill-ipad-landscape-night-beginner.png
- pill-ipad-landscape-night-professional.png
- pill-ipad-landscape-sepia-beginner.png
- pill-ipad-landscape-sepia-professional.png
- pill-ipad-portrait-day-beginner.png
- pill-ipad-portrait-day-professional.png
- pill-ipad-portrait-night-beginner.png
- pill-ipad-portrait-night-professional.png
- pill-ipad-portrait-sepia-beginner.png
- pill-ipad-portrait-sepia-professional.png
- pill-pc-day-beginner.png
- pill-pc-day-professional.png
- pill-pc-night-beginner.png
- pill-pc-night-professional.png
- pill-pc-sepia-beginner.png
- pill-pc-sepia-professional.png
- pill-phone-day-beginner.png
- pill-phone-day-professional.png
- pill-phone-night-beginner.png
- pill-phone-night-professional.png
- pill-phone-sepia-beginner.png
- pill-phone-sepia-professional.png
- textrow-ipad-landscape-day-beginner.png
- textrow-ipad-landscape-day-professional.png
- textrow-ipad-landscape-night-beginner.png
- textrow-ipad-landscape-night-professional.png
- textrow-ipad-landscape-sepia-beginner.png
- textrow-ipad-landscape-sepia-professional.png
- textrow-ipad-portrait-day-beginner.png
- textrow-ipad-portrait-day-professional.png
- textrow-ipad-portrait-night-beginner.png
- textrow-ipad-portrait-night-professional.png
- textrow-ipad-portrait-sepia-beginner.png
- textrow-ipad-portrait-sepia-professional.png
- textrow-pc-day-beginner.png
- textrow-pc-day-professional.png
- textrow-pc-night-beginner.png
- textrow-pc-night-professional.png
- textrow-pc-sepia-beginner.png
- textrow-pc-sepia-professional.png
- textrow-phone-day-beginner.png
- textrow-phone-day-professional.png
- textrow-phone-night-beginner.png
- textrow-phone-night-professional.png
- textrow-phone-sepia-beginner.png
- textrow-phone-sepia-professional.png
