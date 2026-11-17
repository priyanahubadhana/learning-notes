# Text tool row vs the box bar (uniformity check, 18 Nov 2026)

Read from `src/app/tools/main/PillContent.tsx`, `mainTools.ts` (`PILL_OPTIONS.text`), `TextBoxExtras.tsx`, `textStyle.ts`, `src/editor/colorData.ts`, and the approved v9 Text cards (`docs/mockups/toolbar-v9/toolbar-v9.html`, `text.format`, `text.list`, favourites). Mock: `index.html` in this folder (frame numbers after the update).

| Text tool option (top tool bar) | In the box bar mock? | Same control? |
| --- | --- | --- |
| Gear (tool settings) | No: it belongs to the tool row, not to a box | n/a |
| Text tool tab (Aa) | No: tool selector | n/a |
| Style ▾ (Title, H1, H2, H3, Body; v9 adds Quote, Code block) | Added: ⋯ › Text style… (frame 12) and Format card (frame 13) | Same list; opened from ⋯, not a button |
| Font ▾ (Default, Sans, Serif, OpenDyslexic; v9 adds Literata, Source Serif, Atkinson) | Yes: Aa (frame 7) | Same button. **Differs:** list. Owner picture 9 has Modern, Classic, Technical, More fonts…; today's has Default, Sans, Serif, OpenDyslexic. Mock maps Modern=Sans, Classic=Serif, Technical=new mono font, and "More fonts…" keeps today's others (OpenDyslexic must not be lost). Needs an owner OK. |
| Text size ▾ (90, 100, 115, 130, 150 %) | Yes: size pill with the strip (frame 5; Text tool in frame 6) | Same strip (number, slider, −/+). **Differs:** today it is a whole-note percent (5 steps, `noteSize`); the bar's size is for the selected box's text. Decide: slider snaps to the 5 steps, or both become free |
| Line spacing ▾ (Normal, Tight, Loose) | Yes: spacing button in the align strip (frame 3) | Same options. **Differs:** today a whole-note setting |
| Bold, Italic, Underline | Yes: B/I strip (frame 2) | Same |
| Strike (Pro), Inline code | Strike in the B/I strip; Inline code under ⋯ › More text options | Same |
| Text colour (tap applies last colour, ▾ opens the card, 10 colours) | Yes: colour circle opens the picker (frame 8, now the same 10 colours) | Same palette. **Differs:** Text tool tap = apply last colour, ▾ = picker; the bar's circle opens the picker directly. Decide one rule |
| Highlight colour (+ ▾, 10 colours) | Yes: Highlight in the B/I strip with a colour row (frame 2) | Same palette. **Differs:** the same tap rule as text colour |
| List ▾ (bullets, numbers, checklist; v9 adds star, toggle, outdent, indent) | Yes: list strip now has Bullets, Numbers, Checklist, Outdent, Indent (frame 4); star and toggle lists are not in the strip | Same. Star and toggle list: add under ⋯ › More text options (open point) |
| Align ▾ (left, centre, right, justify) | Yes: align strip now has Justify (frame 3) | Same |
| Key point ★ | Added to the B/I strip (frame 2) | Same |
| Box style swatch (opens Box style) | Yes: fill square (frames 9, 10) | Same card. **Differs:** with no box selected the Text tool's swatch sets the look for NEW boxes and shows a dot when the box differs from it; the bar styles the selected box |
| Layout (grid) | Added: ⋯ › Layout… (frame 12) | Same layout mode |
| Format card (v9, Pro): Link, Plain block, Callout, Divider, Paragraph spacing, Line height, Letter spacing, Custom styles, Clear formatting | Added: ⋯ › More text options… opens the same card (frame 13) | Same card |
| Favourites ⋯2 (saved looks, e.g. Sticky note) | Yes, as Box style › My presets | Same data. **Differs:** chips on the row in the Text tool, inside Box style in the bar |
| + (Edit bar: choose what shows) | No | n/a. Open question: should the box bar have Edit bar too? Not in the decision, not built |

## Differences to settle (for the plan)

1. Font list names (Modern/Classic/Technical vs today's), and keeping OpenDyslexic.
2. Size, font and line spacing: whole note (Text tool) or the selected box (bar).
3. Colour tap rule: apply last colour vs open the picker.
4. Box style with no box selected (new boxes) vs the selected box.
5. Star list and Toggle list are not in the list strip yet.
6. The bar has no Edit bar (+).
