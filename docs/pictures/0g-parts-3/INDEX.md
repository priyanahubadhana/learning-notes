# Slice 0g step 3: Parts gallery pictures

Head commit when taken: be79fb29 (last source edit: the danger-text colour fix, Dialogs.css / ToastStack.css). Flag state: gallery at #/design-tokens. 144 pictures.
Name: `<section>-<level>-<theme>-<size>.png`. Sections: feedback, shellparts, wizard, toolframe, pills, compare. Levels: beginner, professional. Themes: day, night, sepia. Sizes: ipad-landscape 1194x834, ipad-portrait 834x1194 (WebKit iPad Pro 11), phone 390x844, pc 1336x720 (Chromium).
Fix proof: feedback-_-night-_ (red Delete button text now dark on Night, ratio checked by e2e/parts-gallery-contrast.spec.ts).

## Repeat-fault list (docs/ECONOMY-MODE.md section 7)

- Thin scroll track under a cut-off row: n/a in gallery; no row is cut off in the pictures (pills rows wrap).
- Toast above the phone tab bar: pills-*-phone (Phone tab bar / Lifted above a toast demos); S3-2x tests.
- Sidebar closed on iPad portrait: gallery page has no sidebar; ipad-portrait pictures show none.
- Shared parts only, Lucide icons, one button style per panel: all pictures; no drop-downs, radio dots or resize grips.
- No key names on touch screens; focus ring for keyboard only: touch hints use no key names (ipad/phone pictures); ring checked in S3-39.
- Light, Dark, Sepia with real data, tips and toasts closed: all 144 taken after the last source edit.
- Both levels, iPad landscape and portrait, phone, PC: all combinations present.
