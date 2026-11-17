# Text tool row vs the box bar (uniformity check, 18 Nov 2026, updated with the owner's answers)

Read from `src/app/tools/main/PillContent.tsx`, `mainTools.ts` (`PILL_OPTIONS.text`), `TextBoxExtras.tsx`, `textStyle.ts`, `src/editor/colorData.ts`, and the approved v9 Text cards (`docs/mockups/toolbar-v9/toolbar-v9.html`). Mock: `index.html` in this folder.

The visible bar is the same short Goodnotes set as before: colour, size, Aa, B/I, align, list, fill | Cut, Paste ▾, Delete, ⋯. Everything extra sits in a strip or under ⋯.

| Text tool option | In the box bar mock | Same control? |
| --- | --- | --- |
| Gear, Text tab (Aa), + (Edit bar) | No: they belong to the tool row | n/a |
| Style ▾, Key point, Link, callout, spacing, Justify, Advanced (Format card) | ⋯ › Text options… (one entry) opens the same Format card | Same card |
| Font ▾ | Aa strip: current font ✓, Easy to read (Atkinson Hyperlegible), Classic (Literata), Handwritten (Patrick Hand), More fonts… (Inter, Lexend, JetBrains Mono, Caveat, OpenDyslexic, today's others). System fallbacks in the mock, no web fonts loaded | Same list in both |
| Size ▾ | Size strip: number, slider, −/+ | Same strip. Acts on the selected box or words in the bar; in the Text tool it sets the size for what you write next (any number) |
| Line spacing ▾ | Spacing button in the align strip | Same; acts on the selected box or words |
| Bold, Italic, Underline, Strike, Highlight | B/I strip (5 buttons) | Same |
| Text colour, Highlight colour | A tap on the button opens the colours (10 colours) | Same rule in both |
| List ▾ | Strip: Bullets, Numbers, Checklist, Star, Toggle. No Outdent/Indent buttons (Tab and Shift+Tab still indent) | Same in both |
| Align ▾ | Strip: left, centre, right, line spacing; Justify in the Format card's Paragraph tab | Same |
| Box style swatch | Fill square | Same card. With no box selected the Text tool's swatch sets the look for new boxes |
| Layout | ⋯ › Layout… | Same |
| Favourites ⋯2 | Box style › My presets | Same data, different place |

## Still open (for the plan)

1. Highlight colour button: tap opens colours (shown only as a rule, no separate frame).
2. The bar has no Edit bar (+); not in the decision.
3. The Text tool's size slider has to accept any number; today's five steps (90 to 150 %) go away.
