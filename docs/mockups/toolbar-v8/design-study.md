# Toolbar ▾ cards: design study (v7)

Date: 12 Nov 2026. Scope: every card that opens from a ▾ on the tool row (Pen, Shapes, Eraser, Lasso, Text), plus the shared frame for Insert, Elements and More. The bar structure approved in v6 is unchanged: same rows, same ▾ buttons, same features.

Mock: `v7/toolbar-mock-v7.html` (build: `node v7/build.cjs`). Sources added: `v7/v7.css`, `v7/v7.js`. Screenshots: `v7/v7-*.png` (landscape 1180×820), `v7/v7-p-*.png` (portrait 820×1180), card close-ups in `v7/clip/`.

## 1. Why the v6 cards did not feel premium (ranked)

Checked against the v6 screenshots and code. The main manager's diagnosis holds; items 3, 6 and 9 are additions.

1. **Text lists where a picture was needed.** Pen type, Size, Colour, Shape, Eraser mode and Box look were rows of words with a tick. You had to read to choose, and you could not see what you would get. Premium drawing apps let you choose by looking.
2. **Generic web-dropdown look.** Flat slabs, a 1 px outline on every chip, browser-default sliders, tiny ALL-CAPS labels, a bare "✕" character. Nothing was wrong, but nothing was crafted either.
3. **Two different kinds of card for the same job.** Half the ▾ buttons opened a 280 px "menu", the other half a 400 px "card", with different padding, headers, selection marks and positions. Beginner and Professional even got different kinds for the same ▾ (Size, Colour, Favourites). This is the root of the "inconsistent" feeling.
4. **Mixed concerns and menus inside menus.** Feel held pen response, Page style and three drill-in rows (Pen settings, Writing aids, Math assist), each opening another pane with a Back arrow. Line style and Page style opened a second menu on top of the card. Professional Feel and Format were one long scroll.
5. **No consistent anchor.** Pen cards hung from the chip, Text cards from the bar; menus sat 6 px under the chip at 12 px inset, cards at 8 px. A ▾ with an open menu did not look pressed, a ▾ with an open card did.
6. **Three ways to show "this one is chosen".** A tick (menus), an outline plus underline (chips), a tinted fill (tiles).
7. **No motion and no feedback.** Cards appeared and vanished. A pick changed the row silently (also the owner's v6 condition 1).
8. **Small flaws that read as unfinished.** The muddy colour chip (three overlapping dots with dark rims), "Pen" next to "Ballpoint" (which pen?), "Feel > Feel", the layer name cut to one letter.
9. **Heavy minimise ring.** An accent-filled, accent-ringed button competing with the tools, plus a dark halo.

## 2. What premium apps do (research)

| Source                                         | Pattern we take                                                                                                                                                                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apple HIG, Popovers                            | The arrow points as directly as possible at the control that opened it. Keep it only as big as its content. Never open a popover from a popover: close or replace. Tap outside closes.                                                                        |
| Apple Notes / Freeform (PencilKit tool picker) | Tools are drawn as the real instruments. Tapping a tool opens one small popover with only its own controls: a thickness row and an opacity slider. Colours are round swatches in a grid, chosen one has a ring with a gap.                                    |
| GoodNotes 6                                    | Three pen styles described by behaviour (fountain = pressure-sensitive, ball = even, brush = very pressure-sensitive). Stroke presets you can see, a thickness slider, Solid/Dashed/Dotted as one control, Tip sharpness and Pressure sensitivity as sliders. |
| Notability                                     | Tap a tool again for its options. A live preview sits next to the slider and changes as you drag. Favourites are saved pen styles shown as the pen itself. More spacing rather than more borders.                                                             |
| Procreate                                      | Brush list shows a stroke sample for each brush. Colour panel is one panel with tabs (Disc, Classic, Harmony, Value, Palettes) rather than one long page.                                                                                                     |
| Concepts                                       | Size, opacity and smoothing shown as live values on the tool; a stroke preview for every brush.                                                                                                                                                               |
| Craft / Apple Pages                            | Text styles are listed in their own look (Title is big and bold, Quote is italic with a bar).                                                                                                                                                                 |
| Linear / Figma                                 | One popover frame everywhere. Segmented controls for small choices. Tonal fills instead of outlines. Motion 150–250 ms, grows from the trigger, starts near 96% scale, never from zero.                                                                       |

Sources: [Apple HIG: Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers), [Apple: Configuring the PencilKit tool picker](https://developer.apple.com/documentation/pencilkit/configuring-the-pencilkit-tool-picker), [WWDC24: Squeeze the most out of Apple Pencil](https://developer.apple.com/wwdc24/10214), [Goodnotes: Write and customize ink with the Pen tool](https://support.goodnotes.com/hc/en-us/articles/7353756785679-Write-and-customize-ink-with-the-Pen-tool), [Notability: Calligraphy Pen](https://support.gingerlabs.com/hc/en-us/articles/11113646664218-Calligraphy-Pen), [MacRumors: Notability favourites toolbar](https://www.macrumors.com/2020/08/31/notability-10-new-tools-shop/), [Procreate Handbook: Colors interface](https://help.procreate.com/procreate/handbook/colors/colors-interface). Motion figures come from second-hand summaries of Emil Kowalski's guidance and should be tuned on the real iPad.

## 3. The design system (applies to ALL ▾ cards)

### 3.1 One frame

- Soft glass surface (88–92% opaque, blur 28 px), radius 20 px, hairline edge, a soft two-layer shadow and a 1 px top highlight. No hard outline.
- Padding 12 px. Header: title 15 px semibold on the left, one quiet round close on the right (30 px circle inside a 44 px target).
- A small arrow on the top edge points at the ▾ that opened the card.
- `#more`, `#acard`, `#lcard`, `#elcard` and `#morecard` all use this frame, in dark, light and sepia.

### 3.2 Two widths, one rule

- **Picker, 304 px**: you choose one thing (Pen type, Size, Colour, Favourites, Shape, Eraser mode and size, Lasso shape, Box look, Style, List).
- **Panel, 376 px**: you adjust several things (Feel, Format, Box, Lasso Select/Menu/Layers, Insert, More).
- Height follows the content. If it cannot fit, the body scrolls and the bottom edge fades to show there is more.

### 3.3 One anchor rule

- The card hangs 8 px below the toolbar. Its left edge lines up with the left edge of its ▾. It never leaves a 12 px margin from the screen edge; the arrow moves so it still points at the ▾.
- The ▾ looks pressed (tinted, chevron flipped) for as long as its card is open, for every card.
- Exceptions kept from v6: Insert hangs from the Insert button; the Box card moves beside a selected box and then has no arrow.
- Only one card at a time. No card opens from a card.

### 3.4 Labels and groups

- Group labels: sentence case, 12.5 px semibold, soft ink. No capitals, no letter-spacing.
- Controls under a label sit in one tonal "well" (radius 14 px) with hairlines between rows. A one-line note sits under the well in muted text.

### 3.5 Controls (one of each)

| Need                                                                     | Control                                                                                                     | Chosen state                     |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Choose by looking (pen, shape, eraser, box look, paper, font, favourite) | **Visual tile**: picture on top, name below, optional one-line hint                                         | Accent tint + 1.5 px accent ring |
| Choose a thickness                                                       | **Size tiles**: a line drawn at its real thickness, in the current colour                                   | Same as tiles                    |
| Choose a colour                                                          | **Round swatch grid**, six per row, 44 px targets                                                           | Accent ring with a gap           |
| Choose one of 2–5 words                                                  | **Segmented control**                                                                                       | Raised thumb                     |
| Switch between sections of a card                                        | **Section switcher** (segmented, thumb slides)                                                              | Raised thumb                     |
| An amount                                                                | **Custom slider**: 6 px track, accent fill, 24 px white knob, value in a pill. Thickness uses a wedge track | Knob grows while held            |
| On/off                                                                   | **Switch row**                                                                                              | Accent track                     |
| An action                                                                | **Action tile** or row with an icon                                                                         | Press feedback only              |
| Text style                                                               | **Style rows** drawn in their own style                                                                     | Accent tick                      |

All targets are 44 px or more.

### 3.6 Motion and feedback

| Event                                   | Motion                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Card opens                              | 200 ms, cubic-bezier(.2,.8,.2,1): fade in, scale .96 → 1, rise 6 px, growing from the arrow            |
| Card closes                             | 130 ms ease-in: fade, scale → .98                                                                      |
| Switch to another view in the same card | Re-plays the 200 ms open                                                                               |
| Section switcher                        | Thumb slides 280 ms spring cubic-bezier(.34,1.45,.64,1); pane fades up 180 ms                          |
| Press                                   | Scale .96 within 120 ms (stands in for a haptic tap; the real app should add a light haptic on iPhone) |
| Newly chosen tile, chip, swatch         | Pops .93 → 1 in 280 ms spring; ring and tick draw in                                                   |
| Simple picker after a pick              | Selection shows for 190 ms, then the card closes itself                                                |
| Value on the row changed                | That ▾ glows once: accent ring spreads and fades, 700 ms                                               |
| Reduced motion                          | Everything is instant; states still change                                                             |

### 3.7 Beginner and Professional

Same cards, same frame, same sections. Beginner shows the essentials; Professional adds controls inside the same sections.

- Size: Beginner three size tiles. Professional adds a live preview and Exact thickness.
- Colour: Beginner six swatches. Professional adds Colour picker and Custom colours.
- Favourites: both show favourite pens as tiles plus a "save" tile.
- Feel: both have Feel · Aids · Math · Page. Beginner Feel = Pressure, Stabilisation and a collapsed Fine-tune. Professional adds tip, response, layers, paper size, zoom.
- Format: both have Text · Style · Paragraph. Professional adds a fourth section, Advanced, plus fonts, strike-through, marks, more lists and blocks.

### 3.8 No duplicates, clearer names

- "Pen" (the type) is now "Fountain pen", so it no longer reads the same as "Ballpoint" or as the Pen tool. Decision to review with the owner.
- Each pen type has a three-word hint (Thick and thin, Even line, Soft bold, Sketchy, Broad tip, See-through).
- Page style appears once, as four paper tiles in Feel › Page. Line style appears once per mode, as a three-way control.
- The colour chip shows one clear dot: the current colour. (The three "recent" dots are gone from the chip; custom colours stay in the Colour card.)

## 4. Card by card

| ▾                                  | v6                                                 | v7                                                                                                   |
| ---------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Pen › Pen type                     | list of 6 words                                    | 6 tiles: the pen itself, a sample stroke in your colour, name, hint                                  |
| Pen › Size                         | list (Beginner), chips + default slider (Pro)      | size tiles with real line weights; Pro adds live preview and wedge slider                            |
| Pen › Colour                       | list of names (Beginner), square swatches (Pro)    | round swatch grid in both                                                                            |
| Pen › Feel                         | preview, sliders, Page style menu, 3 drill-in rows | 4 sections; no drill-in, no menu on a menu; paper tiles; line style 3-way                            |
| Pen › Favourites                   | list / pills                                       | pen tiles + dashed "save" tile                                                                       |
| Shapes › Shape                     | list                                               | icon tiles                                                                                           |
| Eraser › Mode, Size, Options       | lists with ticks                                   | icon tiles with hints, size dots, real switches                                                      |
| Lasso › Shape, Actions (Beginner)  | lists                                              | tiles; action list in the new frame                                                                  |
| Lasso › Select, Menu, Layers (Pro) | flat rows                                          | segmented shape, switch wells, two-line layer rows (name no longer cut)                              |
| Text › Box                         | list (Beginner), bordered tiles (Pro)              | look tiles with previews; Box/Layout segmented; round fill swatches                                  |
| Text › Format                      | 7 sections in one long scroll                      | Text · Style · Paragraph (· Advanced); fonts shown in their own face; styles shown in their own look |
| Text › Style, List                 | lists                                              | styles in their own look; list tiles + Outdent/Indent                                                |
| Minimise                           | accent fill + ring + halo                          | hairline ring, quiet icon; the first-use pulse is unchanged                                          |

## 5. Kept exactly

Every feature and every probe from v6. Coverage 878/878 and functional 152/152 pass on v7. Probe changes are location updates only: "Pen" → "Fountain pen"; Beginner Pen settings = the Fine-tune row; Writing aids, Math assist and Page style = Feel sections; Professional section names are read from the section switcher.

## 6. Open points for the owner / build

1. "Fountain pen" as the name (alternative: "Ink pen").
2. Simple pickers close themselves 0.19 s after a pick. Alternative: stay open until you tap outside.
3. Professional Feel › Feel still scrolls (about ten rows). Option: move Tip sharpness, Flatness and Line style into Size, so Size = how the line looks and Feel = how it responds.
4. v6 conditions not part of this pass: toast with Undo per change, the Professional "+" pin row, removing the top-bar Done.
5. Motion timings are a starting point; confirm on the real iPad.

## 7. v8 (12 Nov 2026): the same system everywhere, visible feedback, custom tools

Mock: `v8/toolbar-mock-v8.html` (build: `node v8/build.cjs`). Sources added: `v8.css`, `v8a.js` (M1–M3, V3), `v8b.js` (V1), `v8c.js` (V4). Screenshots: `v8/shots/v8-*.png` (1180×820) and `v8/shots/v8-p-*.png` (820×1180). v7 is untouched.

### 7.1 V1: every change shows

- The changed part glows once: the ▾ on the row (v7), and now the switch row, the selected box and the page.
- New bars and items slide or fade in (box bar, selection bars, lasso bar, mini keys, write pad, keyboard bar, reader bar, ruler, edge chips, new custom tools).
- A switch answers "X turned on · Undo". Undo puts every setting back exactly, even if the card has closed. Picks you can see on the page or the row glow instead of talking (quality standard 7: toasts for unseen actions).
- Every switch row has a tiny live picture that draws its off and on result (32 kinds). Spacing choices carry a glyph.

### 7.2 V3: audit, what moved to the card system

Box bar · text selection bar (mini and micro) · lasso/picture bar with its More, Colour, Thickness, Resize and Edit strips · keyboard bar · mini keys · write pad · reader bar · box grip menu and all list menus (rows in wells, Delete in red) · More, the all-tools panel (rows in wells) · Layouts card · Toolbar settings · Customise · Help · Reading look · Arrange the menu · dialogs (New layout, Rename, Delete, Add a picture, New recall card, Handwriting, Link, Save as preset, Save to notes, Screenshot) · Elements tabs · toast · tooltip.
Also fixed: stale "All tools row" wording (the row was removed in v6); capital-letter labels; arrow characters used as icons.

### 7.3 V4: custom tools (Professional; Beginner can unlock in More)

- ★ at the end of every tool row saves the setup you have now. Parts: Pen, Shape, Eraser, Lasso, Text box, in any mix.
- Save sheet: name, picture (live preview or an icon), what it sets, where it sits (row and position) with a live picture of the toolbar.
- One tap applies it and says so, with Undo. The button shows a ring while its setup is the active one.
- Hold a custom tool for Edit mode: drag to reorder (drop line), tap to change, ✕ to remove, Done.
- More › Custom tools: use on top, manage below (rename inline, earlier/later, change, duplicate, delete with Undo).
- The row never scrolls sideways: tools first lose their name, then fold into "⋯ n".

### 7.4 M1–M3

- M1: the Box card sits right of the box, else left, else under, else above. It never covers the box.
- M2: the box bar has no minimise. M3: the top-bar Done is removed.

### 7.5 Probes

Coverage 996/996 (878 kept; the one "Box bar: Minimise" probe is now a "must be gone" probe; 118 new for M1–M3, V1, V3, V4). Functional 152/152.

### 7.6 Open points for the owner

1. Pen › Favourites overlaps custom tools in Professional. Suggest folding Favourites into custom tools.
2. "All tools panel" was read as More (the old row is gone). Confirm.
3. The tall Box card under a wide box shows a short scrolling pane. Alternative: let the page scroll up to make room.
4. Using a custom tool placed on another row switches to that tool. Confirm.
