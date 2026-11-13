# Slice 12 rest pictures (strip, Paste menu, page sheet, Arrange, row strip)

Flag page.menus ON, real data (notebook "Biology", page "Cell division"), taken after the last source edit (source head 9e2fbb99; the pictures are in the commit after it). Made by shots.spec.ts (run with a config whose testDir is this folder).

Pattern: `<screen>-<size>-<theme>-<level>.png`

- screen: chooser (rich paste with "Always ask": Paste as pop-up), chip ("Pasted as" chip after Enter; Beginner shows none, Professional has the page.pastedChip switch ON), settings (General, Paste row, scrolled into view), strip (right-click on the first line), paste (Paste menu open), sheet (page more-menu), arrange (Professional only: two pinned actions, Arrange list), rowstrip (long-press on the page row)
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

- chooser-*: the Paste as pop-up (Keep original format default, Plain text, As text box)
- chip-*-professional: the "Pasted as" chip; chip-*-beginner: no chip (hidden, PM-44)
- settings-*: Settings > General > Paste row shows Keep format (Reset to default link below)

Repeat-fault list (docs/ECONOMY-MODE.md section 7), ticked against these pictures:

- [x] thin scroll track under cut-off rows: none cut off in strip, rowstrip, settings
- [x] toast above the phone tab bar: chip-phone-* sit above the tab bar (e2e: the chip's bottom edge is above the bar's top)
- [x] sidebar closed on iPad portrait: closed in every ipadP picture except rowstrip-ipadP-* (that screen is the sidebar's own page row strip)
- [x] shared parts only, Lucide icons, one button style: yes
- [x] no key names on touch screens: chooser-ipad*/phone-* shot with touch show no Enter/Esc line; chooser-pc-* (mouse) still shows it (e2e on chromium and ipad-webkit)
- [x] Light, Dark, Sepia; real data; tips and toasts closed: yes (the chip itself is the feature shown)
- [x] both levels; iPad landscape and portrait, phone, PC: yes

Fixes this round and the picture that proves each: chip above the tab bar = chip-phone-*-professional; no key names on touch = chooser-ipadL/ipadP/phone-*; sidebar closed on iPad portrait = chooser-ipadP-*, chip-ipadP-*, settings-ipadP-*, strip-ipadP-*. iPad and phone pictures are shot with touch.
