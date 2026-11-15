# Slice 12 rest pictures (strip, Paste menu, page sheet, Arrange, row strip)

Flag page.menus ON, real data (notebook "Biology", page "Cell division"), taken after the last source edit (source head cdca0be2; the pictures are in the commit after it). Made by shots.spec.ts (run with a config whose testDir is this folder).

Pattern: `<screen>-<size>-<theme>-<level>.png`

- screen: chooser (rich paste with "Always ask": Paste as pop-up), chip ("Pasted as" chip after Enter; Beginner shows none; Professional shows it with no extra unlock, as every switch reads on there, SET-B43), settings (General, Paste row, scrolled into view), strip (right-click on the first line), paste (Paste menu open), sheet (page more-menu), arrange (Professional only: two pinned actions, Arrange list), rowstrip (long-press on the page row)
- size: ipadL 1180x820, ipadP 820x1180, phone 390x844, pc 1440x900
- theme: day, night, sepia
- level: beginner, professional

24 combinations: 7 screens in each, plus arrange in the 12 Professional ones = 180 pictures.

Which picture proves which fix:

- PM-23 row strip: rowstrip-* (strip opens at the pressed page row; Rename first, Delete page last, in red)
- PM-63 Arrange: arrange-*-professional (the Arrange list inside the page sheet, full width, one Done)
- Paste ▾ rows that apply: paste-* (plain text on the clipboard: Keep, Plain, Quote)
- Focus ring for the keyboard only: strip-* (no ring on the first button after a mouse right-click)
- "Add to favourites" on the Professional text strip (Comment is hidden until comments exist, docs/DECISIONS.md): strip-*-professional
- Phone strip fits 390 px, no item cut, no word broken: rowstrip-phone-* (Add to favourites on two lines), strip-phone-*

New in this round (PM-43, PM-44):

- chooser-*: the Paste as pop-up (Keep original default, Plain text, As text box)
- chip-*-professional: the "Pasted as" chip; chip-*-beginner: no chip (hidden, PM-44)
- settings-*: Settings > General > Paste row shows Keep original (Reset to default link below)

Repeat-fault list (docs/ECONOMY-MODE.md section 7), ticked against these pictures:

- [x] thin scroll track under cut-off rows: none cut off in strip, rowstrip, settings
- [x] toast above the phone tab bar: chip-phone-* sit above the tab bar (e2e: the chip's bottom edge is above the bar's top)
- [x] sidebar closed on iPad portrait: closed in every ipadP picture except rowstrip-ipadP-* (that screen is the sidebar's own page row strip)
- [x] shared parts only, Lucide icons, one button style: yes
- [x] no key names on touch screens: chooser-ipad*/phone-* shot with touch show no Enter/Esc line; chooser-pc-* (mouse) still shows it (e2e on chromium and ipad-webkit)
- [x] Light, Dark, Sepia; real data; tips and toasts closed: yes (the chip itself is the feature shown)
- [x] both levels; iPad landscape and portrait, phone, PC: yes

Fixes this round and the picture that proves each: chip above the tab bar = chip-phone-*-professional; no key names on touch = chooser-ipadL/ipadP/phone-*; sidebar closed on iPad portrait = chooser-ipadP-*, chip-ipadP-*, settings-ipadP-*, strip-ipadP-*. iPad and phone pictures are shot with touch.

Final-look fixes (source head 49f61b14), and the picture that proves each:

1. Strip arrow points at the pressed spot: strip-pc-*, strip-ipadL-*, rowstrip-* (arrow under the press); e2e pageMenusPlace
2. Strip inside the page area: strip-pc-*, strip-ipadL-*; the row strip may start at the sidebar (rowstrip-*)
3. Paste card below the strip, left edges aligned, tall card scrolls: paste-ipadL-*, paste-pc-*
4. Chooser: close button, shared switch, 1 heading, ends above the phone tab bar: chooser-*-beginner, chooser-phone-*
5. One name: Keep original / Plain text / Always ask, row title Paste as: paste-*, chooser-*, chip-*, settings-*
6. Icons: bin on Delete page, lock on Lock editing: rowstrip-*; Arrange tiles show the action icon: arrange-*

Round 2 of the final look (source head 49f61b14): the strip stays in the page area whenever the whole strip fits there (measured, not a fixed width). Proof: strip-ipadP-*-beginner (strip starts inside the page, not over the rail); e2e pageMenusPlace at 820x1180, Beginner and Professional.

Fix round after the twenty-fourth visit and gate 2 (all 180 re-shot at source head cdca0be2):

- Paste card on the phone no longer lies on the tab bar: paste-phone-* (all three themes, both levels). Room below is now measured to 12 px above the tab bar; the card opens above the strip at full height, all six rows to "Link / Embed" on screen. e2e: pageMenusPlace "on a phone the Paste card ends 12 px above the tab bar, last row on screen".
- One name in the Settings description ("Always ask", "Keep original", "Plain text"): settings-*.
- "Pasted as" chip reads on in Professional (SET-B43), no unlock in the picture setup: chip-*-professional; chip-*-beginner still shows none.
