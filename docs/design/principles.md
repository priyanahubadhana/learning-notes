# Design principles and the rules behind them (plain words, for the owner)

| Status                                                                                                                                          | Scope                       | Builds on                                                                                                                                                                                                                                                                                                                                      | Last change        |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Draft, waiting for the owner's answers (the design questionnaire below, 18 clashes) and the principles sheet; pictures drawn by Opus after that | every screen and every part | docs/design/quality-standard.md (owner-approved 11 Nov), docs/design/system.md (9 Nov), docs/design/shell-spec.md, docs/design/owner-ui-patterns.md, docs/mockups/toolbar-v8/design-study.md, docs/design/owner-decisions.md, the five pillars (docs/MASTER-PLAN.md), the research of 22 Nov (every design decision since 9 Nov, with sources) | 22 Nov 2026, Fable |

## Read this first

The ten principles are the owner's face of the quality standard; under each one sit the concrete rules we already decided, with their source. Every spec's Design and quality check answers these; the reviewer checks them; a picture that breaks one is sent back. Each principle gets one own-drawn picture, never a screenshot of another app.

The research of 22 Nov also found **18 places where two of our own documents disagree**, mostly an older number against a newer one. They are the design questionnaire at the end: A is the pick with the reason, B the other; your answers become the one set of numbers every builder uses. Until then the newer document wins.

## The ten principles

> **The app frame stays intact (owner, 22 Nov 2026).** On tablet, iPad and PC the frame (the tool bar, the action bar, the side panel and their places) is solid and fixed. Nothing floats over it or hides it, because the tools on it are what the work needs. Pop-ups, pickers and toasts live inside the page area, never across the frame.

### 1. The notes are the hero (all pillars)

The page is the loudest thing on the screen; bars, menus and cards are quiet and step aside. Rules: glass is for the frame only, the paper is always solid; at most three blurred layers, the blur never animates, "Reduce glass" offers Auto or Solid; the canvas carries a faint violet-to-blue wash, plain under reduced transparency; neutrals carry a faint violet tint; dark mode never uses pure black; three themes, Night, Day and Sepia, with equal care, following the device by default; paper text at most 72 characters wide, body at least 15 px. Icons are one set, Lucide, rounded caps, no fills, 20 px in the UI, 16 in dense rows, 24 in the rail. (system.md 9 Nov; shell-spec; premium plan 9 Nov; owner 15 Nov.)

### 2. Simple by default, everything within reach (Notion, Figma)

The essentials are visible; everything else is one tap away under ▾ or in a picker; no feature is ever dropped to make a screen simpler. Rules: overflow goes into ⋯, never a sideways scroll; every ⋯ ends with Customise bar…; only one card at a time and no card opens from a card; pick on top, manage below; quick pickers close themselves 190 ms after a pick; a starter only sets starting values and never hides a setting; "Show all settings" opens every Advanced row without turning anything on. (v6 conditions 12 Nov; design-study; settings-v5 15 Nov.)

### 3. One job, one part, one name (all pillars)

A thing is built once and used everywhere, and called the same everywhere. Rules: the shared parts in docs/features/parts/ own placement, overflow, pickers, drag and the hold menu; one palette source per kind (text, pen, box); the names Tool bar, Action bar, pickers, Hold menu in the app, in Settings and in the specs; one name per option ("Keep look", not "Keep original"); the same words in Beginner and Professional. (22 Nov; 19 Nov; Home 12 Nov.)

### 4. Calm, precise motion (GoodNotes, Figma)

Things glide, never jump; nothing jitters or flickers; reduced motion turns movement into fades or instant changes; nothing animates while typing or drawing. Rules: motion tokens 120 / 180 / 240 ms, ease-out cubic-bezier(.2,.8,.2,1), exit about two thirds of enter, press scale .97; a card opens in 200 ms (scale .96 to 1, rise 6 px) and closes in 130 ms; a segmented thumb takes 280 ms; a new pick pops .93 to 1; a changed ▾ glows once for 700 ms; a bar glides with the selection. (system.md; design-study §3.6; principles 22 Nov.)

### 5. Every tap has a target (GoodNotes)

Every control is at least 44 pt; controls drawn at 32 to 36 px get an invisible extender; close buttons are 28 px inside a 44 target; content keeps 84 px of bottom clearance so nothing hides under a bar. Everything works by click, by key, and by finger or Pencil; nothing is found only by hovering: names show on hover with the Pencil or a mouse, and hover names are an extra, never the only way. Every icon-only button has a label for screen readers. (shell-spec; quality-standard; owner 21 and 22 Nov.)

### 6. Shape the page as you like (Figma)

Boxes anywhere, columns, stickies, pictures beside their text, layouts you can save; bars you can arrange, pin and dock. Rules: the Action bar's place order is below, above, upright right, upright left, then near the top bar, never over the selection; it can be pinned or docked on four sides and keeps its place; every floating bar has a minimise control and collapses to an accent chip at the right edge; bars drag and snap to edges; the Box card opens beside the box, never over it; a selected box shows a solid 1.5 px accent line with corner dots; drag shows live reflow. (21 Nov; shell-spec §5; v6; 11 Nov; Home 12 Nov.)

### 7. Honest feedback, one Undo (all pillars)

Every change shows at once: the changed part glows once, new items slide or fade in, a toast offers Undo; rows have tiny live previews. Every change can be undone with one Undo. Delete sits last in menus, in danger red, the only red button on a bar; destructive dialogs say "You can undo this." Toasts only for errors, Undo, or results not visible on screen. (v6 condition 1; shell-spec; owner-ui-patterns #10; quality-standard #7.)

### 8. Fast is a feature (Notion, Power BI)

Local actions respond at once; no spinners for things on the device; the first-load budget holds and new UI loads lazily; scrolling and inking at 60 fps; each spec states its speed budget and tests it. Fonts are self-hosted and loaded only when chosen; Inter is skipped on Apple devices, where the system font is used. (quality-standard #6; system.md §4; inspiration-apps.)

### 9. Reliable, never stuck (all pillars)

A fault is reproduced, fixed at its root, and gets a regression test; edge cases are tested: fast taps, Pencil versus finger, offline, reload. Nothing waits without a message and a way out: the update, the sync, the save. (quality-standard #3; update-v2 22 Nov.)

### 10. Plain words, the same everywhere (all pillars)

One-line explanations in the owner's language; sentence case; card labels 12.5 px semibold without capitals or letter-spacing; a rule or a must-never line is about twelve words; "Fountain pen", not "Pen"; "Time range", not "Period". (quality-standard; design-study §3.4; 22 Nov; Home 12 Nov.)

## The rules every screen shares (the design system in one place)

| Area     | The rule                                                                                                                                                                                                                                                                                                                                                                                                    | Source                                                 |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Icons    | Lucide only, rounded caps, no fills, currentColor; stroke 1.6 on a 24 grid (see clash 1); 20 px UI, 16 dense, 24 rail; Beginner shows icons only, Professional icon and name; rail icons: Library = books on a shelf, Notebooks = ruled notebook, Review = repeat arrows around a card; Pen, Pencil, Marker and Highlighter have distinct icons; no arrow characters as icons                               | system.md; shell-spec §9; owner 11 and 12 Nov          |
| Type     | system font first, then Inter Variable; scale display 40 · title 32 · h1 24 · h2 20 · h3 17 · body 15 (16 on paper) · small 13 · micro 11; UI chrome uses four sizes; quick fonts Easy to read (Atkinson Hyperlegible, the default), Classic (Literata), Handwritten (Patrick Hand); More fonts… keeps Inter, Lexend, JetBrains Mono, Caveat, OpenDyslexic; the reader's Bookerly-style is Literata, opt-in | system.md; owner 18 Nov; DECISIONS 11 Nov              |
| Colour   | accent violet #6941E0 light, #A08CFF dark, #5F37D4 sepia, for primary actions, selection and focus only; colour is never the only signal; neutrals tinted violet, written in oklch with hex fallbacks; hairline dividers, stronger hairlines at 3:1 on inputs; every pair passes WCAG AA; light default ink in dark mode; text selection a soft purple fill with round handles                              | DECISIONS 9 Nov; architecture.md; 15 and 19 Nov        |
| Glass    | frame bars 72% light / 70% dark, blur 16 bars, 20 sidebar, 24 menus, saturate 160%; card frames 88 to 92%, blur 28, saturate 170%, hairline edge with a 1 px top highlight; paper always solid                                                                                                                                                                                                              | system.md; design-study §3.1 (see clash 3)             |
| Shape    | 4-pt grid, no arbitrary pixels; radii: inputs 8, menus 12, cards and panels 20, sheets 24, pill for chips (see clash 4); pickers 304 px, panels 376 px, padding 12, wells radius 14; a card hangs 8 px under its bar, 12 px from any screen edge, its arrow at the ▾; rail 56, top bar 52 or 64 (clash 11), sheet 440 (clash 9), side list 288 (clash 6); breakpoints 640 and 1180                          | system.md; design-study §3.2; shell-spec; owner 15 Nov |
| Motion   | 120 / 180 / 240 ms tokens; cards 200 open, 130 close; thumb 280; pop .93 to 1; glow 700; press .97; reduced motion = fades or instant                                                                                                                                                                                                                                                                       | system.md; design-study §3.6                           |
| Bars     | two bars, Tool bar and Action bar; pickers open from a button; the Hold menu on press-and-hold; ⋯ last with Customise bar…; the More (sliders) control first on an options row; Undo and Redo at the top left of the page bar; ✓ top right and ✕ top left of sheets; Apple's own bar never shows inside boxes                                                                                               | 22 Nov; owner-ui-patterns #3; owner 15 and 18 Nov      |
| Settings | Settings v5 is the approved base; four starter cards with pictures; the current one outlined and tagged; "Changed by me" dots and page; pictures only on look rows; the big live preview on four groups, from a Preview pill on portrait and phone; first launch asks New, Used a little, Experienced                                                                                                       | settings-v5-stories 15 Nov; BUG-005                    |
| Words    | plain words, one line per setting, sentence case, one name per option, toasts only when needed, the same words at every level                                                                                                                                                                                                                                                                               | quality-standard; 12 and 19 Nov                        |

Likes to keep in mind (owner, 9 to 15 Nov): glassmorphism, editorial calm, Swiss minimalism, dark SaaS the way Linear, Apple, Notion and Raycast do it; modular cards; soft organic corners; GoodNotes' calm Pen and Shape cards as the Beginner model; today's eraser with its size preview; the box bar of 18 Nov. Rejected: a bar that looks out of place, a control that does not show its purpose, previews that pop out too much or cover the result, empty previews, invisible subtle changes, a blurry reader top bar, dull notebook rows, old icons in a new picture, and "too many changes at once". References are for learning, never for copying.

## The design questionnaire: 18 clashes, all settled on 22 Nov 2026 (A was the pick; B the other; the owner answered on the pictures page)

**Q1. Icon stroke.** A: 1.6 on a 24 grid (quality standard, shell spec, tool bar v8; the newer rule). B: 1.75 (system.md, 9 Nov). Case against A: the rail was drawn at 1.75 on 9 Nov and would be redrawn.
**Decided 22 Nov 2026 (owner, on the pictures page):** B. Icon stroke 1.75 on a 24 grid. The owner chose the picture, not the newer document; the quality standard, the shell spec and tool bar v8 change to 1.75.

**Q2. Motion scale.** A: one scale: the tokens 120, 180, 240 ms for everything, with the card values 200 open and 130 close as named uses, and "about 150 ms" retired as a loose phrase. B: keep "150 ms" as the rule and the tokens as detail. Case against A: three documents must be edited to say the same thing.
**Decided 22 Nov 2026 (owner, on the pictures page):** A. One motion scale: tokens 120, 180, 240 ms; card open 200, close 130; "about 150 ms" retired (the owner left it to Fable, then also picked A).

**Q3. Glass.** A: two glasses on purpose: frame glass 72 to 70% with blur 16 to 24 for bars and the sidebar; card glass 88 to 92% with blur 28 for cards and pickers; written down as such. B: one glass for everything (the card values). Case against A: two recipes to maintain.
**Decided 22 Nov 2026 (owner, on the pictures page):** A. Two glasses: frame glass 72 to 70% with blur 16 to 24 for bars and the sidebar; card glass 88 to 92% with blur 28 for cards and pickers.

**Q4. Radii.** A: inputs 8, menus 12, cards, pickers and panels 20, sheets 24, dialogs 24, toast 14, chips pill (the newer approved pictures). B: system.md's 6, 8, 12, 16, 24. Case against A: some older screens use 12 and 16 and would be touched in the polishing.
**Decided 22 Nov 2026 (owner, on the pictures page):** Mixed. Menus take B: radius 8 (the owner: "for this rename copy bar, this one looks better"). Everything else takes A: inputs 8, cards, pickers and panels 20, sheets 24, dialogs 24, toast 14, chips pill.

**Q5. Toasts.** A: a pill at the bottom centre, 2.6 s, 6 s when it offers Undo (shell spec). B: a solid box bottom-right for 5 s (system.md). Case against A: on a wide PC screen the centre is far from the pointer.
**Decided 22 Nov 2026 (owner, on the pictures page):** B place, A look (Fable's fill-in; the owner wrote only "at bottom right"): the toast sits bottom-right on every device, keeps the pill shape, 2.6 s, 6 s with Undo. Case against: bottom-right is farther from the iPad's centre of attention. If the owner wanted the solid box too, say "box".

**Q6. Side list width.** A: 288 px (your "a bit bigger", 12 Nov). B: 264 or 260. Case against A: less room for the page on a 1180 px screen.
**Decided 22 Nov 2026 (owner, on the pictures page):** A. Side list 288 px.

**Q7. Rail icons.** A: Notebooks = ruled notebook, Review = repeat arrows around a card (your 12 Nov review). B: the pencil and the cards-with-tick from the shell spec. Case against A: none; A is your decision, the shell spec is older.
**Decided 22 Nov 2026 (owner, on the pictures page):** A. Notebooks = ruled notebook; Review = repeat arrows around a card.

**Q8. ✓ and ✕ on sheets.** A: at the top, ✕ left and ✓ right (your 15 Nov). B: a footer "hint · Cancel · ✓ Done". Case against A: on a phone the thumb reaches the bottom more easily.
**Decided 22 Nov 2026 (owner, on the pictures page):** A. ✕ top left, ✓ top right on sheets.

**Q9. Sheet width.** A: 440 px (your 15 Nov). B: 376. Case against A: on a 1180 px screen a 440 sheet covers more of the page.
**Decided 22 Nov 2026 (owner, on the pictures page):** B. Sheet width 376 px ("the smaller the better here").

**Q10. Top bar controls.** A: Undo and Redo at the top left, no Back and Forward arrows (your 15 Nov). B: Back, Forward, Undo, Redo. Case against A: no Back on the PC where the mouse has no swipe; the browser's Back still works.
**Decided 22 Nov 2026 (owner, on the pictures page):** A. Undo and Redo top left; no Back and Forward arrows.

**Q11. Tool bar height.** A: 64 px (your 15 Nov pick). B: 52 px (tool bar v8). Case against A: 12 px less page on every screen.
**Decided 22 Nov 2026 (owner, on the pictures page):** A. Tool bar 64 px.

**Q12. Names on hold.** A: hover shows the name with the Pencil or a mouse; a held finger shows nothing for now (your 21 Nov); a finger-hold name can come in stage 2 as an option. B: a held button shows its name (your 15 and 20 Nov). Case against A: a finger-only user on the iPad has no way to read a name until stage 2.
**Decided 22 Nov 2026 (owner, on the pictures page):** C, the owner's own rule: hover (mouse or Pencil) shows the name; a hold shows the name and a one-line description; a setting "Tool hints" with Name only, Name and hint, Off. Default for the owner's account: Name only; default for a new user: Name and hint. Nothing is hover-only: the hold covers touch.

**Q13. Quick fonts.** A: Easy to read, Classic, Handwritten (your 18 Nov final). B: Modern, Classic, Technical. Case against A: none; A is the final decision.
**Decided 22 Nov 2026 (owner, on the pictures page):** A. Quick fonts: Easy to read, Classic, Handwritten.

**Q14. Default theme.** A: follow the device (the premium plan). B: Night by default (shell spec). Case against A: the first picture a new user sees depends on their device.
**Decided 22 Nov 2026 (owner, on the pictures page):** C, the owner's own rule: the default theme is Day for everyone; the owner sets Night on their own devices. Neither "follow the device" nor "Night by default".

**Q15. Names.** A: Action bar, Tool bar, pickers, Hold menu (your 22 Nov); the older "smart bar", "selection bar" and "strip" are replaced everywhere. B: keep the older names in old specs. Case against A: a pass over the specs to rename.
**Decided 22 Nov 2026 (owner, on the pictures page):** A. Action bar, Tool bar, pickers, Hold menu; the old names are replaced everywhere.

**Q16. Red.** A: red only for destructive actions, Delete on bars and in menus; the Review's "Again" uses the warm warning colour, not red. B: red for Again too. Case against A: Anki users expect red for Again.
**Decided 22 Nov 2026 (owner, on the pictures page):** B. Red for Delete and also for the Review's "Again".

**Q17. Compact density.** A: 44 px targets always; Compact only tightens spacing and never shrinks a target below 44. B: Compact may use 36 px controls on pointer devices. Case against A: a denser PC layout is not possible.
**Decided 22 Nov 2026 (owner, on the pictures page):** A. 44 px targets always; Compact tightens spacing only.

**Q18. More and ⋯.** A: two different things: the "More" control (sliders icon and the word) opens a row's options and sits first; "⋯" is overflow and sits last with Customise bar… at its end. B: one control, last. Case against A: two controls to learn.
**Decided 22 Nov 2026 (owner, on the pictures page):** B plus an arrow: one control, last, "cleaner like this"; it carries a small down arrow ▾ when more options exist.

### What the owner said on 22 Nov 2026 (for the pictures and the clash decisions)

- **Loved:** Notion, GoodNotes, Notability. GoodNotes screenshots are in docs/design/refs/ (bar, lasso, mixed selection). Notion and Notability: use their current look as the reference; nothing is copied.
- **Disliked:** plain Android UI against Samsung One UI and Apple: the older generic Android look (heavy, uneven, loud) is the picture of what we avoid; Samsung and Apple show the calm, even finish we want.
- **Use:** the real goal is the iPad with the Pencil for editing and reading. Because the Pencil work is parked, today it is reading on the iPad and writing on the PC. So: iPad stays the design target for every clash (tap size, where a toast sits, hover never required); the PC gets the same design, not a different one.
- **Answers in feelings** ("too heavy", "too round") are welcome; Fable or Opus turns each into a number and writes the number back into the file, so accuracy stays intact and the AI never guesses from the feeling alone.

## Owner comments, 22 Nov 2026

- Q1: "Whichever one is the latest one, use it. Re-verify the spec and show me the display so I can test and tell which is better; prefer the newer one with an explanation of what the older one could be."
- Q2: "I'll leave it up to you, decide yourself." (Decision: A, motion scale as in the shell spec; reason: one scale in one document.)
- Q3: "Show me the images so I can verify; show the one you recommend first; if another change could be done, tell me."
- Q4: "Use whichever is the latest and show me the recommendation in images; instead of numbers, show images; then make the change in the file."
- Q5: explanation given in the comment thread; answer open.
- Pictures for all 18: https://claude.ai/artifact/Tq23fSo7Ye8jcTD6TREdeN

## Confirm sheet (the owner answers by row: Yes, Explain again, or Change to …)

| Row | Statement                                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Principle 1, the notes are the hero, with its rules.                                                                                                      |
| 2   | Principle 2, simple by default, everything within reach.                                                                                                  |
| 3   | Principle 3, one job, one part, one name.                                                                                                                 |
| 4   | Principle 4, calm, precise motion.                                                                                                                        |
| 5   | Principle 5, every tap has a target.                                                                                                                      |
| 6   | Principle 6, shape the page as you like.                                                                                                                  |
| 7   | Principle 7, honest feedback, one Undo.                                                                                                                   |
| 8   | Principle 8, fast is a feature.                                                                                                                           |
| 9   | Principle 9, reliable, never stuck.                                                                                                                       |
| 10  | Principle 10, plain words, the same everywhere.                                                                                                           |
| 11  | The shared rules table is the design system in one place; system.md, shell-spec.md and design-study.md are corrected to match it after the questionnaire. |
| 12  | The likes and rejections list is right.                                                                                                                   |
| 13  | Ten principles is the right number; nothing is missing.                                                                                                   |

### Changes

- 22 Nov 2026, 07:00 · rewritten with the concrete rules under each principle, the shared rules table, the likes and rejections, and the 18 clashes as a questionnaire, from the design research of 22 Nov · Fable.
- 22 Nov 2026 · draft · Fable, from the quality standard, the owner's UI patterns and the owner's decisions of 21 and 22 Nov.
