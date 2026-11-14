# F5 / F9 pictures (48, all taken after the last source edit; head commit is the one that adds this file)
- search-{beginner|professional}-{day|night|sepia}-{ipad|ipad-portrait|phone|pc}.png: search pop-up with text. Shows the clear x inside the field (only with text), the separate close x beside it, no red Esc. Touch sizes have no keyboard-hint footer; pc keeps it.
- settings-search-{level}-{theme}-{size}.png: Settings > Tool bar with "tool" typed: the search box at the top, results with the help line on its own line, one clear x (the browser's own glyph is gone).
Repeat-fault list (ECONOMY-MODE section 7): thin scroll track n/a; toast n/a; sidebar closed on iPad portrait n/a (pop-up/Settings only); shared parts only (ClearField, Icon close) ok; no key names on touch ok (ipad/phone pictures); focus ring ok; Light/Dark/Sepia, both levels, 4 sizes ok.

## Fix round 2 (gate 2 / final look list)
- 72 pictures: search-*, settings-search-*, settings-scrolled-* (new: Settings Tool bar scrolled to the bottom, search bar stuck at the top).
- Item 5 (field fills the row, x at right edge): any search-* picture. Item 6 (section name on one line): settings-search-* pictures. Item 7 (bar full width, field 560): settings-scrolled-* pictures.
- Open: in settings-scrolled-* an On/Off switch's top edge paints over the stuck bar's top padding. Cause: the switch track is a positioned element and paints above the earlier, sticky bar. A one-line fix needs `z-index: 1` on .sv3-search, which raises the z-index ratchet (137) by one. Not done without approval.
