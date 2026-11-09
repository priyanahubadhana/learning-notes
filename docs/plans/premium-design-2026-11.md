# Premium design pass (owner answers, 9 Nov 2026)

Starts after today's fixes are live and tested on the iPad. Screen by screen, before/after screenshots.

Owner-liked styles: glassmorphism, immersive storytelling, editorial, Swiss minimalism, dark SaaS (Linear, Apple, Notion slash menu, Raycast-style command palette).

## Decisions

- Theme: follow the device; dark and light designed with equal care.
- Accent: violet, used sparingly (buttons, selection, focus).
- Glass: frame only (bars, sidebar, menus, pop-ups, command palette, floating panels). Paper/page stays solid and crisp.
- Backdrop: soft violet-to-blue gradient wash behind the frame (faint in light, deeper in dark).
- Type: clean sans (Inter-style), big confident headings, 3-4 sizes.
- Motion: subtle and quick (150-250 ms, gentle springs), honours reduce-motion.
- Density: comfortable, 44 px touch targets; Compact switch in Settings.
- Corners: soft round (12-16 px panels, pill buttons).
- Sidebar: floating glass panel with gap and rounded corners; collapses to an icon rail.
- Command palette (Ctrl/Cmd+K): every action with shortcuts, pages/notebooks/cards/rows, prompts and skills, settings; keyboard hints footer.
- Charts: Home dashboard (reviews, streak, study time, mastered), Review stats (retention, due forecast, mastery), Notebook overview (progress ring), Database chart views.
- Also: layered depth and floating panels, micro-interactions, drag and drop everywhere sensible, design tokens and a design system page.

## Steps

1. Design tokens (colour, glass, radius, spacing, type, motion, shadow) + rules in rules/architecture.md (Design).
2. Frame: backdrop, floating sidebar, glass bars, menus, pop-ups.
3. Command palette.
4. Page and paper polish; slash menu like the Notion reference.
5. Home dashboard and charts; Review stats; Notebook overview; database charts.
6. Every remaining screen; a11y and speed check (blur budget on iPad).

## Owner additions (9 Nov, second batch)

- Scope: whole ecosystem view (product, UI/UX, front-end, back-end, data, infra, security, QA, analytics) — design must fit all.
- Styles: minimalism (less visual noise, intentional simplicity); dark SaaS (dark surfaces, refined borders, strong but refined contrast); modular cards and organised blocks; glassmorphism (frosted, translucent, layered); organic design (natural shapes, soft corners, fluid layout).
- References: 4-point spacing system; Notion notes dashboard (quick add, navigation, folder cards with tags); flashcard app (deck progress, Easy/Good/Hard with intervals, colourful card grid, 1/5 counter, tap to show answer); analytics dashboard (funnel, cohort heatmap, KPI tiles, line charts); type scale sheet; button states (primary/secondary/tertiary/ghost × default/hover/disabled/active/loading); input and card components; journey map and user flow; skeleton loading states.
- Learning features to design for: quizzes, tests, progression and assessment; active recall and spaced repetition screens.
- Quality audit checklist: consistent type hierarchy, 4-pt spacing, limited intentional palette, consistent radius, consistent icon style, balanced white space, clear hierarchy, dark and light done well, responsive desktop/tablet/phone, consistent component states, subtle meaningful motion, no unnecessary decoration, readability.

## Owner addition (9 Nov night)
- Notebook rows in the sidebar feel dull: give notebooks more presence (notebook colour/icon chip, bolder name, page and due-card counts, progress hint, clearer open/active state). Do in the sidebar redesign (step 4/6), plus the Notebook overview (step 5).
