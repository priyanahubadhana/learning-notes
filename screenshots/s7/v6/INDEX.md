# Reader v2 pictures, final look

Head commit when shot: 17cc7fc6 (source files unchanged since 7d36cbdb; this commit adds only the picture fixture and picture spec). Flag reader.v2 ON, real data, tips and toasts closed (toasts hidden except in toast-over-aa). Sizes: phone 390x844, ipad-land 1180x820, ipad-port 820x1180, pc 1440x900. Themes: day, night, sepia. Levels: beg (Beginner), pro (Professional). Name pattern: `<screen>-<level>-<theme>-<size>.png`.

| Picture set | Screen | Count |
| --- | --- | --- |
| epub-open-* | EPUB open with its text | 24 |
| epub-pictures-* | EPUB with a picture of its own (shown) and one from another website (blocked, alt text only) | 24 |
| epub-guard-* | EPUB guard states: hostile book; no script ran, text reads, outside picture blocked, links dead | 24 |
| epub-open-webkit-ipad-land.png | EPUB with text on real WebKit (iPad size) | 1 |
| line-focus-* | PDF line focus band | 24 |
| ruler-* | PDF ruler | 24 |
| pen-bar-* | PDF pen bar (pen-options-* : phone pen options, 6) | 24 + 6 |
| selection-popup-* | PDF selection pop-up | 24 |
| panel-pages-*, panel-notes-* | book panel, Pages and Notes | 24 + 24 |
| aa-more-*, toast-over-aa-* | Aa More card; toast above Aa | 24 + 24 |
| lock-* | padlock menu | 24 |
| settings-end-*, settings-reading-later-*, settings-sheet-* | Settings Reader rows, Coming later, Preview sheet | 24 + 24 + 12 |

Proofs: line focus = line-focus-pro-day-ipad-land.png (and all 24); pen bar = pen-bar-pro-day-ipad-port.png, pen-bar-*-phone.png; EPUB guards = epub-guard-beg-night-phone.png (hostile book reads, nothing ran), epub-pictures-pro-sepia-ipad-land.png (own picture shows, outside picture blocked).

Repeat-fault list (ECONOMY-MODE section 7), ticked on these pictures: no cut-off row without a thin scroll track: ok; toast above the phone tab bar: ok (toast-over-aa-*-phone); sidebar closed on iPad portrait: ok (rail only); shared parts only, Lucide icons, no browser drop-downs or resize grips: ok; no key names on touch screens, focus ring keyboard only: ok; Light/Dark/Sepia real data, tips and toasts closed, shot after the last source edit: ok; both levels, four sizes: ok.
