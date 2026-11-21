# Design principles (plain words, for the owner)

| Status                                                                                            | Scope                       | Builds on                                                                                                                                                                 | Last change        |
| ------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Draft, waiting for the owner's confirm sheet; pictures to be drawn by Opus in the app's own style | every screen and every part | docs/design/quality-standard.md (owner-approved 11 Nov), docs/design/owner-ui-patterns.md, the owner's decisions of 21 and 22 Nov, the five pillars (docs/MASTER-PLAN.md) | 22 Nov 2026, Fable |

These ten lines are the owner's face of the quality standard. Every spec's Design and quality check answers them; the reviewer checks them; a picture that breaks one is sent back. Each principle gets one own-drawn picture (a before and after, in the app's style), never a screenshot of another app.

| #   | Principle                                       | What it means                                                                                                                                                         | Pillar | Picture                                                               |
| --- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| 1   | **The notes are the hero.**                     | The page is the loudest thing on the screen. Bars, menus and cards are quiet and step aside. Nothing decorative competes with your words.                             | all    | a page with the Tool bar and the Action bar barely there              |
| 2   | **Simple by default, everything within reach.** | The essentials are visible. Everything else is one tap away under ▾ or in a picker. No feature is ever dropped to make a screen simpler.                              | N, F   | the Action bar with six buttons and ⋯, and the same bar opened        |
| 3   | **One job, one part, one name.**                | A thing is built once and used everywhere: one bar shell, one colour picker, one hold menu. It is called the same in every place, including Settings.                 | all    | the same colour picker on the Action bar, the Tool bar and a box card |
| 4   | **Calm, precise motion.**                       | Things glide, never jump. About 150 ms, nothing flickers. A bar moves with the selection smoothly. Reduced motion is respected.                                       | F, G   | the Action bar gliding from one selection to the next                 |
| 5   | **Every tap has a target.**                     | Every control is at least 44 px. Everything works by click, by key, and by finger or Pencil. Nothing is found only by hovering; names on hover are an extra.          | G      | a bar with its hit areas drawn                                        |
| 6   | **Shape the page as you like.**                 | Boxes anywhere, columns, stickies, pictures beside their text, layouts you can save. Bars and menus you can arrange. A starter sets values; it never hides a setting. | F      | one page laid out three ways                                          |
| 7   | **Honest feedback, one Undo.**                  | Every change shows at once. Every change can be undone with one Undo. An error says what happened and how to fix it, and offers Try again.                            | all    | a change glowing once, then Undo                                      |
| 8   | **Fast is a feature.**                          | Local actions respond at once; no spinners for things on the device. Each spec states its speed budget and tests it. Opening Today or a big notebook is quick.        | N, P   | a stopwatch beside an opening page                                    |
| 9   | **Reliable, never stuck.**                      | A fault is reproduced, fixed at its root, and gets a regression test. Nothing waits without a message and a way out. The update, the sync, the save: never stuck.     | all    | the update pill in its never-stuck states                             |
| 10  | **Plain words, the same everywhere.**           | One-line explanations in the owner's language. Tool bar, Action bar, pickers, Hold menu: the same names in the app, in Settings and in the specs.                     | all    | one setting row with its one-line explanation                         |

**Where the pillars show.** Notion: 2, 8. GoodNotes: 4, 5. Figma: 2, 4, 6. Power BI: 8 and the data views' own clarity. Anki: 7 and 9 in the review.

**Brand values behind them** (quality-standard.md): Apple's effortless depth, Toyota's reliability, Rams' as-little-design-as-possible, Muji's quiet, Leica's precision, Linear's speed, Stripe's plain words.

## Confirm sheet (the owner answers by row: Yes, Explain again, or Change to …)

| Row | Statement                                                |
| --- | -------------------------------------------------------- |
| 1   | Principle 1, the notes are the hero.                     |
| 2   | Principle 2, simple by default, everything within reach. |
| 3   | Principle 3, one job, one part, one name.                |
| 4   | Principle 4, calm, precise motion.                       |
| 5   | Principle 5, every tap has a target.                     |
| 6   | Principle 6, shape the page as you like.                 |
| 7   | Principle 7, honest feedback, one Undo.                  |
| 8   | Principle 8, fast is a feature.                          |
| 9   | Principle 9, reliable, never stuck.                      |
| 10  | Principle 10, plain words, the same everywhere.          |
| 11  | Ten is the right number; nothing is missing.             |

### Changes

- 22 Nov 2026 · draft · Fable, from the quality standard, the owner's UI patterns and the owner's decisions of 21 and 22 Nov.
