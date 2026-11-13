# Slice 12 rest pictures (strip, Paste menu, page sheet, Arrange, row strip)

Flag page.menus ON, real data (notebook "Biology", page "Cell division"), taken after the last source edit (head commit of the sources: 77ae54a4 plus the strip CSS fix in the next commit). Made by shots.spec.ts (run with a config whose testDir is this folder).

Pattern: `<screen>-<size>-<theme>-<level>.png`

- screen: strip (right-click on the first line), paste (Paste menu open), sheet (page more-menu), arrange (Professional only: two pinned actions, Arrange list), rowstrip (long-press on the page row)
- size: ipadL 1180x820, ipadP 820x1180, phone 390x844, pc 1440x900
- theme: day, night, sepia
- level: beginner, professional

24 combinations: 4 screens in each, plus arrange in the 12 Professional ones = 108 pictures.

Which picture proves which fix:

- PM-23 row strip: rowstrip-* (strip opens at the pressed page row; Rename first, Delete page last, in red)
- PM-63 Arrange: arrange-*-professional (the Arrange list inside the page sheet, full width, one Done)
- Paste ▾ rows that apply: paste-* (plain text on the clipboard: Keep, Plain, Quote)
- Focus ring for the keyboard only: strip-* (no ring on the first button after a mouse right-click)
- "Add to favourites" on the Professional text strip (Comment is hidden until comments exist, docs/DECISIONS.md): strip-*-professional
- Phone strip fits 390 px, no item cut, no word broken: rowstrip-phone-* (Add to favourites on two lines), strip-phone-*
