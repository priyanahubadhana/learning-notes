# Screens (premium design pass)

Each screen follows docs/design/system.md. "Today" is a short note on the current state; "Change" is the target. Build order follows the plan's steps 1-6.

## Quality audit (every screen, light + dark, phone + tablet + desktop)

1. Type hierarchy uses only the scale tokens. 2. Spacing is on the 4-pt grid (no arbitrary px). 3. Palette is tokens only; accent used rarely. 4. Radius from the scale; nested radii right. 5. One icon set and stroke. 6. Balanced white space. 7. One clear primary action per view. 8. Dark and light both checked (AA contrast test passes). 9. Responsive with no horizontal scroll at 320 px. 10. Every control state present. 11. Motion is subtle and fades under reduced motion. 12. No decoration without a job. 13. Readable: 72ch measure, body ≥ 15 px. Also: keyboard path works, screen-reader labels, 44 px targets, blur budget ≤ 3, iPad frame time < 20 ms while scrolling.

## Frame and sidebar

- Wireframe: the gradient wash on canvas; a floating glass sidebar (12 px inset, radius 16) holds Search/⌘K, Home, Review (due count), Library, notebooks tree, then Settings at the bottom; the top bar is a glass strip over the paper with breadcrumb, save state and page menu; the paper is a solid card (radius 16 on wide, edge to edge on phone).
- Today: flat `side` sidebar attached to the edge, blue accent.
- Change: floating panel, collapses to a 72 px icon rail (⌘\), drawer on phone; hover/selected rows use `hover` and `accent-soft`.
- Accept: blur layers ≤ 3; sidebar collapse 240 ms, fades under reduced motion; works RTL.

## Page and paper

- Wireframe: title 32/40 bold, an optional cover, meta line (muted small), body 16/26 capped at 72ch, block handles on hover/focus only.
- Today: solid page, 15 px body, BlockNote defaults partly themed.
- Change: type tokens on the editor, code and quote blocks on surface-1 with radius 8, selection in `select`, callouts in semantic soft fills.
- Accept: no glass on the paper; big-page perf budget (e2e/bigPageBudget) still passes.

## Slash menu

- Wireframe: glass menu 320 wide, search text echoed at the top, groups (Basic, Lists, Media, Learning, AI) with micro labels, rows 44: 32 px icon tile + name + one-line hint + shortcut on the right; footer "↑↓ to move · ↵ to insert · Esc".
- Change: replace BlockNote's default item style through its theming hooks only (no editor switch).
- Accept: fully keyboard driven; at most 8 rows before scrolling; matched letters highlighted.

## Command palette (new)

- Wireframe: dimmed backdrop, centred glass 640 × up to 480; input; empty state shows Recent + Suggested; groups Pages, Notebooks, Cards, Rows, Actions, Prompts & skills, Settings; each row has icon, title, path in muted text, shortcut; Tab or ⌘K opens actions for the selected item; footer with kbd hints.
- Accept: opens < 100 ms with Ctrl/Cmd+K; every menu action is listed with its shortcut; screen reader announces the result count (`role=combobox` + listbox).

## Home dashboard

- Wireframe: greeting (display) + quick add input; a row of 4 KPI tiles (Due today, Streak, Study time this week, Mastered cards) with change since last week; hero card "Review 18 due" (primary button); a 12-month calendar heatmap of reviews; a due-forecast bar chart (7/30 days); a card funnel New → Learning → Mature; recent pages as folder cards with tags.
- Accept: tiles 3-column span on desktop, 2 per row on tablet, 1 per row on phone; every chart has a text summary; skeletons after 300 ms.

## Review (flashcards)

- Wireframe: top: deck name, "3 / 20" counter, thin progress bar, close. Centre: the card (surface-0, radius 24, elev-2), front; tap/Space shows the answer (flip 240 ms, crossfade under reduced motion). Bottom answer bar: [Again 10m] gap [Hard 2d] [Good 4d] [Easy 9d]; keys 1-4; Good highlighted as default. End: summary (cards, accuracy, time, next due) with one calm tick animation.
- Change: intervals visible on the buttons; Again set apart; labels as well as colours.
- Accept: works one-handed on phone (bar in thumb zone); the intervals shown equal the scheduled ones (test); reviewLogs stay append-only.

## Review stats

- Retention line (target band shaded), due forecast bars, mastery stacked bar per notebook, heatmap; filter by notebook and range (segmented).

## Quizzes, tests, progress (design now, build in its own phase)

- Wireframe: start sheet (Practice / Test, question count, optional timer off by default); one question per screen with a progress bar; Practice gives instant feedback (success/danger soft fill + explanation); Test shows results at the end: score ring, time, per-topic bars, "Review 4 mistakes" → makes recall cards.
- Note: no building beyond the current phase. This is design only until the roadmap reaches it.

## Notebook overview

- Wireframe: header (name, icon, description), a progress ring (mastered / total cards), 3 KPI tiles (pages, cards due, last studied), then tabs: Pages (cards grid or list), Summary, Recall.
- Accept: ring has a text value and label; list virtualised for big notebooks.

## Databases with charts

- New view type "Chart" beside Table/Board: bar, line, or count by property; uses the chart palette; settings in a side panel (glass).
- Accept: aggregation runs in a service, not in the UI; it pages through big tables (scalability rule).

## Library and readers

- Library: grid of cover cards (radius 12, 3:4), filter chips, sort menu, skeleton covers. Reader: solid page, glass top bar that hides on scroll, highlights in semantic soft fills.

## Settings

- Wireframe: left list of sections (glass on wide, a stack on phone); content on surface-0 cards grouped by headings; Appearance: Theme (Device/Light/Dark/Sepia), Density (Comfortable/Compact), Reduce glass, Reduce motion follows the device, plus a link to the design system page.
- Accept: each switch has a label and a description; changes apply live.

## Onboarding

- Three steps on the gradient wash: welcome (display type, one line), pick what you study (chips), create your first notebook or import. Skip is always visible. A journey map: first note → first card → first review the next day (Home hero card points there).

## Design system page (in-app, Settings > About)

- Live swatches, type scale, buttons in every state, inputs, cards, skeletons, in the current theme. It is the visual test page for the audit.

## Build steps (ordered)

1. Tokens: add the system.md tokens to `src/index.css` (keep old names as aliases), the contrast test (unit test over token pairs), motion and glass utilities, the density attribute, and the Inter decision. Check: the contrast test passes; no visual regressions in e2e screenshots except colour.
2. Frame: wash, floating sidebar + rail, glass top bar, menus, pop-ups, toasts solid. Check: blur budget; iPad scroll frame time; reduced transparency → solid.
3. Command palette. Check: Ctrl/Cmd+K < 100 ms; all actions; a11y combobox.
4. Paper polish + slash menu. Check: big-page budget passes; slash keyboard flow.
5. Home dashboard, Review (intervals on buttons) + stats, Notebook overview, database chart view. Check: interval test; chart text summaries; skeletons.
6. Remaining screens (Library, readers, Settings, onboarding, design system page), then the full audit on every screen in both themes and three sizes, plus the iPad blur check.
