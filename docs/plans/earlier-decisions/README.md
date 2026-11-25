# Earlier decisions, collected (25 Nov 2026)

**What this is.** One list of every decision already made in the project, sorted by area of the app. The owner asked for it on 25 Nov 2026, so that no earlier decision is lost or ignored when a feature is planned again ([the Fable review](../fable-review-2026-11-25.md), sections 0.5 and 13.8).

**What this is not.** It is not a plan and not a spec. Nothing here was rewritten into a rule, and nothing was decided. The decision lists and the specs stay the sources. Where a line here and its source differ, the source wins.

## How it was made

- Twelve Sonnet helpers read the sources at commit 8440b4cd and wrote one row for each decision. A program sorted the rows by area. Fable set up the work and did not edit the rows.
- Sources read in full: `docs/DECISIONS.md` (all 1,795 lines), `docs/design/owner-decisions.md` (all 559 lines), the stage questionnaire, the stage map, the found wishes, `docs/MASTER-PLAN.md`, `docs/design/principles.md`.
- From the 107 spec files in `docs/features/` only these were taken: lines that name the owner; "must never happen" lines; open points; the status line. The other rules stay in their spec.
- Result: 2,661 rows; 1,063 of them are decisions by the owner.

## How to read a row

`date · who · standing.` then the spot, the decision in one sentence, the source's own words, and the source file with its line.

- **who:** owner, claude, opus, fable, manager, or unknown.
- **standing:** `stands`; `replaced` (the source says a later decision took its place); `unsure` (open, or the helper was not sure). The standing is the helper's reading, not a ruling.
- Each page has three parts: decided by the owner; picked by Claude, Opus, Fable or a manager; open or unsure.

## How it is used

1. Before a feature is planned, Fable reads the page of its area and the source lines behind the rows.
2. Each decision that still stands goes into the feature's big spec as a numbered line with its date.
3. The owner sees only the clashes: [pairs of decisions that disagree](clashes.md).

## Limits (read before you trust a page)

- A row is a helper's one-sentence reading. Check the source line before a row is used in a spec.
- The same decision can appear two or three times, once for each source that holds it. Nothing was merged.
- Feature ids (F-numbers) are filled only where a source names them. Most rows have none; use the area.
- These large spec files were searched by key words, not read line by line: shared-parts.md (lines 131 to 950), review-v2.md, selection-bar-buttons.md, toolbar-v8.md, lasso.md, media-v2.md, security-m1.md, device-modes.md, home.md.
- `docs/IDEAS.md`: only the items the owner marked were taken. The old notes in it (about lines 10 to 130) were not read.
- Not read at all: the comments in the tests, the GitHub issues, the changelog, and the files in `docs/archive/`.
- Six rows had an area name that is not in the list; they are on the page "Other".
- The pages show the state of 25 Nov 2026. A decision made later is not here.

## The pages

| Area                                   | Page                                                         | Rows | By the owner |
| -------------------------------------- | ------------------------------------------------------------ | ---- | ------------ |
| The frame and navigation               | [frame-navigation.md](frame-navigation.md)                   | 50   | 12           |
| Home and Library                       | [home-library.md](home-library.md)                           | 90   | 41           |
| Notebooks and pages                    | [notebooks-pages.md](notebooks-pages.md)                     | 70   | 18           |
| Search                                 | [search.md](search.md)                                       | 20   | 2            |
| The editor and text                    | [editor-text.md](editor-text.md)                             | 66   | 11           |
| The text box                           | [text-box.md](text-box.md)                                   | 137  | 79           |
| The paper page and layout              | [paper-page-layout.md](paper-page-layout.md)                 | 36   | 8            |
| The Tool bar                           | [tool-bar.md](tool-bar.md)                                   | 189  | 71           |
| The Action bar and the Selection bar   | [action-and-selection-bars.md](action-and-selection-bars.md) | 265  | 125          |
| Menus                                  | [menus.md](menus.md)                                         | 90   | 28           |
| Pencil, ink and Lasso                  | [pencil-ink-lasso.md](pencil-ink-lasso.md)                   | 189  | 67           |
| Text selection                         | [text-selection.md](text-selection.md)                       | 69   | 27           |
| Databases and mind maps                | [databases-mindmap.md](databases-mindmap.md)                 | 36   | 3            |
| Review, study and recall               | [review-study-recall.md](review-study-recall.md)             | 55   | 12           |
| The reader and media                   | [reader-media.md](reader-media.md)                           | 169  | 34           |
| AI, the connector and the notes format | [ai-connector-notes-format.md](ai-connector-notes-format.md) | 156  | 38           |
| Settings                               | [settings.md](settings.md)                                   | 141  | 70           |
| Update, install and offline            | [update-install-offline.md](update-install-offline.md)       | 61   | 21           |
| Data safety, sync and accounts         | [data-safety-sync-accounts.md](data-safety-sync-accounts.md) | 227  | 24           |
| The design system and the look         | [design-system-look.md](design-system-look.md)               | 119  | 76           |
| Tests and CI                           | [tests-and-ci.md](tests-and-ci.md)                           | 99   | 27           |
| Method and process                     | [method-and-process.md](method-and-process.md)               | 297  | 214          |
| Other                                  | [other.md](other.md)                                         | 30   | 1            |

The "By the owner" column counts the owner's rows in the first part of each page; the owner's open or unsure rows are in the third part.
