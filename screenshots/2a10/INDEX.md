# 2A.10 first look: Format "on" states

Made with `SHOTS=1 npx playwright test e2e/toolbarV10FormatOnShots.spec.ts` after the last source edit.
Pattern: format-<tab>-<device>-<day|night>-<beginner|professional>.png
Devices: phone, ipad-portrait, ipad-landscape. Beginner has tabs text, style, paragraph; Professional adds advanced.
State shown: bold, italic and key point on (Text), bulleted list on (Style), centre on (Paragraph); size Body is on by default.
Compare with docs/mockups/toolbar-v9/toolbar-v9.html (tile.sel: accent fill, ring, check badge).
