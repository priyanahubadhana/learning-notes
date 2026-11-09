# Premium design research (9 Nov 2026)

For the premium design pass (docs/plans/premium-design-2026-11.md). Feeds docs/design/system.md and docs/design/screens.md.
Source quality: pages marked (official) come from the platform owner. The rest are secondary write-ups, so we treat them as hints, not facts.

## 1. Apple HIG: materials, type, motion, iPad

- Findings: Apple now has two material families. Liquid Glass is for controls and navigation that float above content. Standard materials use blur and vibrancy. Liquid Glass belongs on the navigation layer, never on the content layer, and Apple says to remove custom backgrounds behind bars so the glass reads. Users can turn on reduce transparency or reduce motion, and the effects must change when they do. System parts adapt on their own; custom parts must supply their own fallbacks. Sources: [Adopting Liquid Glass (official)](https://developer.apple.com/tutorials/data/documentation/technologyoverviews/adopting-liquid-glass.md), [WWDC25 session 219 (official)](https://developer.apple.com/videos/play/wwdc2025/219), [HIG update note](https://pxlnv.com/linklog/hig-liquid-glass/), [critique: fragile UX](https://uxdesign.cc/liquid-glass-fragile-ux-and-why-i-wanted-2-weeks-before-writing-about-it-5dccafb5c28f).
- Adopt: glass on the frame only, which matches the owner's decision; the content (paper) stays solid. Honour `prefers-reduced-transparency` and `prefers-reduced-motion`. 44 pt touch targets. iPad pointer: hover gives a soft highlight but is never the only way to reach an action. Pencil: nothing depends on hover, and hit zones are palm-safe (the app already does this).
- Avoid: copying Liquid Glass refraction and lensing on the web (slow, poor contrast); glass behind long text.

## 2. Material 3 tokens

- Findings: M3 replaced tinted elevation overlays with tone-based surface container roles: Lowest, Low, Container, High, Highest. In dark mode a higher surface is lighter. The dark base is near-black, not #000. Sources: [Tone-based surface colour (official)](https://material.io/blog/tone-based-surface-color-m3), [Compose tonal elevation (official)](https://kotlinlang.org/api/compose-multiplatform/material3/androidx.compose.material3/-surface.html), [M2 dark theme (official)](https://m2.material.io/design/color/dark-theme).
- Adopt: named roles (canvas, surface-0 to surface-3) instead of one-off greys; in dark mode, show elevation by lightness; paired "on-" roles such as on-accent.
- Avoid: M3's heavy tinting and large FABs. Its five elevation levels are more than we need; we use four.

## 3. Linear (2024+ redesign)

- Findings: Linear rebuilt theme generation in LCH, where equal lightness numbers look equally bright. Secondary sources say this cut themes down to three inputs: base, accent and contrast. The look: calm low-chroma neutrals, the accent used rarely, hairline borders, dense but readable lists. Sources: [How we redesigned the Linear UI (official)](https://linear.app/now/how-we-redesigned-the-linear-ui), [sspai analysis](https://sspai.com/post/104449), [three-variable theme breakdown](https://astro-thedjpetersen-com.pages.dev/thoughts/linear-theme), [LCH and accessibility](https://zapier.com/blog/lch-easier-accessibility-prettier-colors).
- Adopt: give the neutrals a faint violet tint (the accent's hue family) so the palette reads as one; write tokens in `oklch()` with hex fallbacks; 1 px hairline borders at low contrast, plus a stronger border on inputs.
- Avoid: Linear's very faint muted text, which fails AA in places.

## 4. Command palettes (Raycast, Arc, Linear)

- Findings (from studying the products; no single source): one input at the top; results grouped (Pages, Actions, Settings); shortcut hints aligned right; a footer with ↵ / ↑↓ / Esc hints; an actions sub-menu for the selected item (Raycast ⌘K); recent items when the input is empty; fuzzy matching with the matched letters highlighted.
- Adopt: all of the above; at most 8 rows visible; opens in under 100 ms (the search index already exists).
- Avoid: modes nested more than one level deep; listing every action when the input is empty (show recent items and the top 5 instead).

## 5. Editor polish (Notion, Craft, Things)

- Findings: a big confident page title; line height 1.5 to 1.7; a line length of about 65 to 75 characters; block handles show only on hover or focus. The slash menu has an icon tile, the name, a one-line hint and the shortcut, grouped into Basic, Media, Learning and AI. Things uses motion to confirm actions (the checkbox ticks, the item slides away). Craft uses cards and soft depth around pages.
- Adopt: 44 px slash-menu rows with icon tiles; text on the paper capped at 72ch; chrome stays quiet until needed.
- Avoid: colourful decoration on every block; animation while typing.

## 6. Review UX (Anki/FSRS, RemNote, Brainscape)

- Findings: Anki shows the real next interval on each button. Again counts as a fail; Hard, Good and Easy count as a pass. Users often press Hard on cards they forgot. Four buttons are cramped on small screens. Brainscape uses 1 to 5 confidence ratings and a deck mastery bar. RemNote shows queue progress and inline cards. Sources: [Anki manual: studying (official)](https://docs.ankiweb.net/studying.html), [Anki stats (official)](https://docs.ankiweb.net/stats.html), [forum: misuse of Hard](https://forums.ankiweb.net/t/how-to-prevent-users-from-misusing-hard-ideas-are-welcome/49092?page=3), [forum: help on the answer side](https://forums.ankiweb.net/t/on-the-answer-side-i-need-some-reference-information-to-help-me-decide-which-button-to-press/58972).
- Adopt: an answer bar with Again / Hard / Good / Easy, each showing its interval ("10m", "2d", "4d", "9d"). Again sits apart (a gap) with a red tint. Good is the default (Space or Enter). A "3 / 20" counter and a thin progress bar. Tap the card or press Space to show the answer; keys 1 to 4 rate it. The wording asks "How well did you remember?", not "How long to wait?".
- Avoid: colour as the only signal (labels always show); confetti after every card (one calm summary at the end instead).

## 7. Quizzes, tests, assessment

- Findings (common practice in Khan Academy, Duolingo and LMS tools): one question per screen; clear progress; instant feedback in practice mode and feedback at the end in test mode; a review of wrong answers at the end; mastery levels per topic.
- Adopt: Practice and Test modes; a result screen with score, time and per-topic bars, plus a "Review 4 mistakes" button that turns wrong answers into recall cards.
- Avoid: timers on by default (they cause anxiety; optional only); leaderboards (collaboration is out of scope).

## 8. Learning analytics dashboards

- Findings: KPI tiles (value, label, change since last period); one hero chart; a calendar heatmap for streaks (GitHub and Anki style); a bar chart of upcoming reviews; a retention line. Funnel and cohort charts come from product analytics. For a personal app the useful versions are a New → Learning → Mature card funnel and a week-by-week retention grid.
- Adopt: at most 4 KPI tiles per row; a heatmap with 5 steps of one hue (violet) plus empty; every chart gets text labels and a table or aria summary; the existing chart palette rules stay (6 colours, colour-blind checked).
- Avoid: pie charts with more than 4 slices, 3D, gauges, gradients inside bars.

## 9. Glassmorphism done accessibly

- Findings: the main risk is text contrast over a backdrop that keeps changing, so test against the worst case. Ship `-webkit-backdrop-filter` beside the standard property for older Safari. Blur gets slower as the radius and the blurred area grow; mobile advice is at most 2 or 3 blurred layers per screen with a modest radius. Use an `@supports` fallback to a near-opaque fill, and give `prefers-reduced-transparency` users a solid panel. Sources: [OpenReplay backdrop-filter](https://blog.openreplay.com/creating-blurred-backgrounds-css-backdrop-filter/), [Glassmorphism done right](https://dev.to/alphashark/glassmorphism-in-css-the-frosted-glass-effect-done-right-4fho), [Liquid Glass on the web recipes](https://www.buildmvpfast.com/blog/liquid-glass-css-backdrop-filter-recipes-2026), [accessible glass 2026](https://lifa-su.github.io/blog/ai-css-glassmorphism-accessible-design.html). Nobody has verified the speed numbers in these sources, so we measure on the owner's iPad ourselves (plan step 6).
- Adopt: a glass fill opaque enough that text passes AA over both pure black and pure white behind it (at least 72 % in light, 70 % in dark); blur 16 to 24 px; saturate 140 to 180 %; a 1 px inner hairline; at most 3 blurred layers on screen. If the speed budget is hit, turn blur off while scrolling big pages or drawing ink (`data-glass="lite"`).
- Avoid: glass on the paper, on long lists, or on toasts stacked over other glass; animating the blur radius.

## 10. Spacing, type, colour, dark mode

- 4-pt grid: every spacing, size and radius is a multiple of 4 (2 is allowed for hairline nudges). This is common practice: Material uses 8 dp with a 4 dp sub-grid, and Apple uses a 4/8 pt rhythm.
- Type: an Inter-style sans with few sizes; big headings with tight letter spacing (-1 to -2 %) and line height 1.15 to 1.25; body text 15 to 16 px at 1.6. Inter is free (OFL licence, on Google Fonts), so it costs ₹0. The system font (SF Pro) is already first in our font list and looks native on Apple devices. Proposal: keep the system font first and load Inter only on other devices (the owner decides).
- Dark mode: no pure black. #000 smears on OLED screens while scrolling and makes glass look like holes. The base is about #121117 to #16151b; elevation shows as lightness; accents are lighter and less saturated (a lighter violet); text is not pure white (about #ECEBF2).
- Sources: [M2 dark theme (official)](https://m2.material.io/design/color/dark-theme), [Material tone-based surfaces (official)](https://material.io/blog/tone-based-surface-color-m3).

## 11. Skeletons, micro-interactions, reduced motion

- Skeletons: show one only when loading takes longer than 300 ms; its shape matches the real content; with reduced motion the shimmer stops and a static fill shows. No skeleton for the editor (content already shows piece by piece).
- Micro-interactions: buttons scale to 0.97 when pressed; on dense lists hover changes the fill, not the shadow; checkbox ticks and card flips use a short spring; a tick confirms a save; durations 150 to 250 ms (the owner's decision).
- Reduced motion: replace movement with opacity fades of 150 ms or less; no parallax; no card flip (crossfade instead); no shimmer.

## 12. What we will not do

- Only one variable sans web font; one icon set with one stroke width (no mixing); no neumorphism; no glass on content; no gradient text; no sound by default; no streak pressure (the streak shows but never nags).
