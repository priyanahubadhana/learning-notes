# F5 / F6 / F7 pictures (slice/ios-select)

Taken from the final code on chromium (made by e2e/iosSelectShots.spec.ts). Page: made through the sidebar's Add page, Pencil mode, Text tool.

- `chromium-f5-f6-circle-strip-<light|dark>-<beginner|professional>-<ipad-sideways|ipad-upright|phone>.png`: a Pencil circle round "rate-is" (dash word) selects exactly that word; our selection strip (the mini bar, the same one a double tap opens) shows above the line, never over a text line. Apple's bar is not part of the page and cannot show in a browser; the e2e spec asserts its cause (the lift is cancelled).
- `chromium-f7-double-tap-<same set>.png`: a slow double tap (600 ms apart) on "plain": the word is selected, our mini toolbar shows.
- Sepia and PC: at the end of the phase.
