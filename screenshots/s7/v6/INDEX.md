# Reader v2 pictures, final look

Head commit when shot: 6dfe9e51 (source final for the gate 2 round: Settings dock and sheet follow the card edges, home-bar space kept, every srcset entry checked). All chromium pictures re-shot on it; only pictures whose pixels changed differ in git (the unchanged Settings pictures have the sidebar closed, where the dock was already inside the card; the sidebar-open case is covered by e2e/settingsV3DockCard.spec.ts). epub-open-webkit-ipad-land.png was shot on real WebKit on 0193eb76; no source of the open-book view changed since. Proofs of the earlier fixes: Settings dock and sheet inside the card = settings-sheet-beg-day-ipad-port.png and settings-end-_-ipad-port.png; Night swatch ring = pen-bar-_-night-_.png; quiet box = epub-pictures-pro-night-pc.png and epub-guard-_.png.

| Picture set                                                | Screen                                                                                          | Count        |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------ |
| epub-open-*                                                | EPUB open with its text                                                                         | 24           |
| epub-pictures-*                                            | EPUB with a picture of its own (shown) and one from another website (blocked, alt text only)    | 24           |
| epub-guard-*                                               | EPUB guard states: hostile book; no script ran, text reads, outside picture blocked, links dead | 24           |
| epub-open-webkit-ipad-land.png                             | EPUB with text on real WebKit (iPad size)                                                       | 1            |
| line-focus-*                                               | PDF line focus band                                                                             | 24           |
| ruler-*                                                    | PDF ruler                                                                                       | 24           |
| pen-bar-*                                                  | PDF pen bar (pen-options-* : phone pen options, 6)                                              | 24 + 6       |
| selection-popup-*                                          | PDF selection pop-up                                                                            | 24           |
| panel-pages-_, panel-notes-_                               | book panel, Pages and Notes                                                                     | 24 + 24      |
| aa-more-_, toast-over-aa-_                                 | Aa More card; toast above Aa                                                                    | 24 + 24      |
| lock-*                                                     | padlock menu                                                                                    | 24           |
| settings-end-_, settings-reading-later-_, settings-sheet-* | Settings Reader rows, Coming later, Preview sheet                                               | 24 + 24 + 12 |

Proofs: line focus = line-focus-pro-day-ipad-land.png (and all 24); pen bar = pen-bar-pro-day-ipad-port.png, pen-bar-*-phone.png; EPUB guards = epub-guard-beg-night-phone.png (hostile book reads, nothing ran), epub-pictures-pro-sepia-ipad-land.png (own picture shows, outside picture blocked).

Repeat-fault list (ECONOMY-MODE section 7), ticked on these pictures: no cut-off row without a thin scroll track: ok; toast above the phone tab bar: ok (toast-over-aa-*-phone); sidebar closed on iPad portrait: ok (rail only); shared parts only, Lucide icons, no browser drop-downs or resize grips: ok; no key names on touch screens, focus ring keyboard only: ok; Light/Dark/Sepia real data, tips and toasts closed, shot after the last source edit: ok; both levels, four sizes: ok.
