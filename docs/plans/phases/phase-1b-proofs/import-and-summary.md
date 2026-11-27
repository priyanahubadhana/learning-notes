# Proof A: import paths, size limits, Summary, second import, Trash, issues #81 #83

> One of the four reports behind [the proofs for the notebook spec](README.md) (26 Nov 2026). Read-only; made by a helper; the main claims were checked against the code by Fable.

Read-only check of the working tree `C:\Users\pc\Downloads\learning-notes` (main, commit fcc433f3, 26 Nov 2026). Nothing was changed. The app and the tests were not run. Every claim has a `file:line` that was opened. Sizes of new work are **estimates**.

## Findings that change or contradict a spec line (read these first)

1. **NB-41 "today no format makes a notebook with pages under pages, boxes, looks, ink or pictures" is wrong.** The app's own notebook file (`.learningnotes.json`, "Add as copies" on the Data screen) already carries a whole notebook with pages under pages, boxes with place, size, look and group, the box grid, ink strokes and shapes, highlights and text colours inside the block text, toggles, pictures, mind maps, cards with their schedules, databases and tags (`src/share/bundle.ts:56-74`, `src/share/checkRows.ts:133-178`, `src/share/importBundle.ts:102-427`). It is written by the app, not meant for a hand or for Claude, but it exists and is the natural target.
2. **Also wrong in part:** the `ln-skill/1` answer (the skill "paste-in" path) already makes pages under one overview page (`src/prompts/skillSave.ts:337-347`). So "pages under pages" exists one level deep there.
3. **There are four import formats for notes, not three:** `ln-notes/1` (Paste notes and the notes zip), `ln-skill/1` (skill answer), `ln-spec/1` (AI tool / connector only, no paste box found), and the notebook file / full backup zip. Plus Anki `.apkg`, Notion zip, NotebookLM and "layer" files.
4. **NB-43 cannot hold with today's readers.** Every reader refuses the whole file when it is too large or one row is broken. Several also drop parts **silently** (cards over 500, pictures over 25 MB, more than 200 pictures, mind-map nodes over 500, a picture line whose file is missing). No reader names what it dropped. Details in point 2.
5. **NB-47 "new for a whole notebook" is wrong.** A whole notebook already goes to the Trash in one step with an Undo in the toast, and "restore notebook" brings back its pages, notes and databases (`src/notebooks/Sidebar.tsx:278-288`, `src/notebooks/v2/useNotebookActions.ts:78-87`, `src/trash/trashService.ts:212-240`, test `e2e/trash.spec.ts:74`). But: "Paste notes" puts every pasted page into one shared notebook "Sources", so removing "the notebook brought in" would remove every pasted page.
6. **NB-13 and the Summary:** the Summary option shows **two** things today, not only a list: a typed paragraph at the top (`Page.summary`) and the list of lines (`summaryItems`) (`src/app/summary/SummaryView.tsx:124-142`). There is **no second paper surface** on a page. A Summary made of boxes is new work.
7. **NB-42:** the "layer" files already do "recognise a second import by an id in the file" and refuse it (`src/layers/layerService.ts:96-105`), and they record what was made so it can be removed later (`src/layers/layerService.ts:241-277`). This is a ready pattern for NB-42 and NB-47.
8. **A latent bug found on the way:** a page can be set to paper size "Fit" (`src/pages/PageView.tsx:299-309`, `src/pages/pageService.ts:121-128`), but the file reader accepts only A4 and Letter (`src/share/checkRows.ts:163`) and one bad field makes the whole file refused (`src/share/checkRows.ts:577`, `src/share/bundle.ts:403`). So a notebook with one "Fit" page, saved as a notebook file, cannot be added back. Not proved in the running app.

---

## Point 1. NB-41: import paths and what each can make

### The paths that exist

| Path                                                      | Where                                                                | Format                                               | Reader                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| Paste notes (Capture screen, and on a source page)        | `src/capture/NotesPanel.tsx:72`, `src/capture/PageAiActions.tsx:136` | `ln-notes/1` Markdown                                | `src/capture/notesFormat.ts:118`                       |
| Drop a zip (same panel)                                   | `src/capture/NotesPanel.tsx:97-118`                                  | `notes.md` + `images/*`                              | `src/capture/zipNotes.ts:51`                           |
| Skill answer, paste-in                                    | `src/prompts/RunSkill.tsx:268` (PasteIn)                             | `ln-skill/1` JSON                                    | `src/prompts/skillFormat.ts:205`                       |
| AI tool "create notebook from spec" (connector / AI jobs) | `src/aitools/jobs/stage.ts:213-231`                                  | `ln-spec/1` JSON                                     | `src/connector/spec.ts:729`                            |
| Data screen, "Add as copies"                              | `src/share/DataScreen.tsx:252-261`                                   | notebook file `.learningnotes.json`, or the full zip | `src/share/bundle.ts:367`, `src/share/readFull.ts:250` |
| Data screen, "Replace my notes"                           | `src/share/DataScreen.tsx:219-239`                                   | full zip `.learningnotes.zip` (whole workspace)      | `src/share/readFull.ts:250`                            |
| Layer file                                                | `src/layers/layerService.ts:97-114`                                  | notebook file + `layer` key                          | `src/layers/manifest.ts:69-81`                         |
| Anki                                                      | `src/share/DataScreen.tsx:264-305`                                   | `.apkg`                                              | `src/anki/readApkg.ts` (not opened)                    |
| Notion                                                    | `src/share/notionImport.ts:32-47`                                    | Notion Markdown and CSV zip                          | same file                                              |
| NotebookLM                                                | `src/share/notebooklm/run.ts` (header only read)                     | NotebookLM outputs                                   | not checked in detail                                  |

### What each format can make

**`ln-notes/1` (Paste notes, zip).** Confirmed: with no page given, it makes **one page** at the top of the notebook **"Sources"** (kind `sources`) and marks it as pasted text (`src/capture/importNotes.ts:195-200`, `src/library/libraryService.ts:40-58`). What lands on that page (`src/capture/importNotes.ts:90-160`):

- Key points → bullet lines under a heading. Steps → numbered lines.
- Mind map → one mind-map block (from an indented list).
- Cards → Card blocks (question with the answer under it); cloze → a line with hidden words.
- Screenshots → plain text lines that only name the time.
- Any other section → a heading plus Markdown (`src/editor/textBlocks.ts:105-143`): headings, bullets, numbered lines, paragraphs. Inline only **bold, italic, code, https links** (`src/editor/textBlocks.ts:46-69`). A `>` quote becomes a plain paragraph (`textBlocks.ts:127-128`).
- Pictures: only from the zip, as a picture block where `![..](images/x.png)` stands alone on a line (`importNotes.ts:51-63`).
- Not possible: a notebook, sub-pages, boxes (no `boxId` is set, so all goes in the one default box), looks, groups, ink, shapes, highlights, text colours, toggles, quotes, tables, databases, tags, page options, Summary lines.
- Everything gets `source: 'ai'` and one `batchId`, so "Remove this AI result" takes it away in one step (`importNotes.ts:204-208`, `239-254`).

**`ln-skill/1` (skill answer).** Makes, in an existing or a new notebook (`src/prompts/skillSave.ts:229-377`): one overview page (summary as a heading and a paragraph, key points with stars, a mind map, a database of points, the sources list), the detailed pages **under** the overview page (`skillSave.ts:337-347`), and a Cards page under it. One Undo takes it all back (`skillSave.ts:380-394`). Not possible: deeper levels, boxes, looks, ink, pictures, highlights, colours, tags, Summary lines.

**`ln-spec/1` (AI tool and connector).** Notebook with a title, cover colour, view, path style, A4/Letter, lined/grid/dots; flat pages (all at the top: `supabase/functions/_shared/notesWrite.ts:617-623`, and `SpecPage` has no parent: `src/connector/spec.ts:156-161`); 17 block types incl. toggle, callout, table, card, mind map, math, embed (https only), page link, database (`spec.ts:45-63`); cards; up to 10 databases with 7 column types (`spec.ts:67-75`). Page `summary` goes to `Page.summary` (`notesWrite.ts:404`); the notebook `summary` becomes a callout on page 1 (`notesWrite.ts:605-606`). Not possible: sub-pages, boxes, ink, pictures from files, highlights, colours, tags. No paste box for it was found in the app; it runs as the AI tool `notebooks.create_from_spec`.

**Notebook file (`.learningnotes.json`) — the full-fidelity format.** Carries notebooks, pages, blocks, cards with schedules, review history, databases, columns, views, tags with colours, pictures as base64, ink layers and ink chunks (`src/share/bundle.ts:56-89`). Rows are rebuilt field by field from a fixed list (`src/share/checkRows.ts:40-52`). For a page that includes `parentId` (pages under pages), `boxes`, `rows` (grid), `sheet`, `inkBg`, `tabColour`, `tagIds`, `summary` (`checkRows.ts:133-164`). For a block, `content` (the whole rich text, so highlight and text colour styles travel), `boxId`, `batchId` (`checkRows.ts:166-178`). For a notebook, `pageTabs` (which extra options show under a page's name) (`checkRows.ts:103`).
On import (`src/share/importBundle.ts`):

- Everything gets new ids; nothing that exists is changed (`importBundle.ts:29-35`, `179-199`).
- The notebook is named "Copy of …" unless `keepNames` (`importBundle.ts:242-244`).
- The notebook's own `kind`, `tabs` and `sample` are dropped; its tabs are reset to the defaults (`importBundle.ts:233-249`). `pageTabs` is kept.
- **Not carried at all:** `summaryItems` (the Summary lines), `annotations`, recordings, book files (they are not in the bundle's table list, `bundle.ts:76-89`).

**Full zip (`.learningnotes.zip`).** A zip of `manifest.json`, `tables/<table>.jsonl` (rows as stored) and `media/` (picture bytes) (`src/share/fullFile.ts:4-14`). It holds every table, incl. `summaryItems` and `annotations` (`src/share/readFull.ts:223-247`). "Replace my notes" writes all of it back (whole workspace). "Add as copies" turns it into the notebook file first (`src/share/restore.ts:178-193`), so the Summary lines and annotations are lost on that path (`bundle.ts:473-525`).

### Can a new notebook format reuse one?

Yes, two pieces:

- **Target:** `importBundle` already writes a whole notebook in one transaction, all-or-nothing (`importBundle.ts:109-113`), as copies, with ink and pictures. A Claude-friendly format could be compiled into a `Bundle` and handed to it.
- **The zip shape:** the full zip already carries pictures as separate files beside JSON rows (`fullFile.ts:4-14`).
- Why not hand Claude the bundle as it is: it is the raw stored shape. Claude would have to write order keys, BlockNote text runs, box millimetres, grid rows, and ink points relative to a block in page widths (`src/core/inkTypes.ts:54-61`). The checks are about types, not about layout, so overlapping boxes (NB-86, NB-44) would pass. This is a judgement, not tested.
- The plan already names a new format `ln-notes/2` (`docs/plans/stage-1-plan.md:46`).

### The stored data model a format must write (one page)

- **Page** (`src/core/types.ts:133-212`): `notebookId`, `parentId`, `title`, `order`, `summary`, `tagIds`, `tabColour`, `inkBg`, `sheet` ('A4' | 'Letter' | 'fit'), `boxes`, `rows`, `source`.
- **Box** `PaperBox` (`types.ts:240-272`): `id`, `x`, `y`, `w` in mm, `h`, `line`, `colour`, `style` (background, border, corners, shadow, padding: `core/boxStyle.ts`, not opened), `group` (Lasso group), `full`, `pw`, `locked`, `gone`.
- **Box grid** `GridRow` (`types.ts:224-238`): rows of 1 to 3 columns, each column a width share and 1 to 2 box ids; or a free box with `x`, `wmm`, `auto`.
- **Block** (`types.ts:315-352`): `pageId`, `parentId` (nesting), `type`, `content` (JSON), `order`, `boxId` (which box; unset = the first box), `source`, `batchId`. Highlights and text colours live inside `content` as text-run styles (not opened in detail; the reader keeps `content` as one object: `checkRows.ts:72-73`).
- **Picture**: an `image` block whose `url` is `lnimg:<id>` (`src/images/imageRef.ts:6`, `src/images/placePicture.ts:41-61`), plus an `images` row with the bytes (`types.ts:699-712`). Size `previewWidth` and alignment are block props (`placePicture.ts:43-46`).
- **Mind map**: a `mindMap` block with `data` (serialised nodes) and `theme` (`importNotes.ts:107-112`); at most 500 nodes, 200 characters each (`src/editor/mindMap/model.ts:29-30`).
- **Card**: a `card` block (question in the text, answer as child blocks), plus a `cards` row per card for the schedule (`types.ts:371-401`), made by `syncCardRecords` (`importNotes.ts:209`).
- **Ink and shapes** (`src/core/inkTypes.ts:23-26`, `48-115`): `inkLayers` per page; `inkChunks` of up to 60 strokes, each anchored to one block (`blockId`) or to the page. A shape is a stroke with `shape` = line, rect, ellipse, triangle or arrow. A stroke kind is ink, highlight or tape.
- **Database**: `databases`, `dbColumns`, `dbViews`, row pages with `values` (`types.ts:469-525`).
- **Summary lines**: `summaryItems` rows (`types.ts:663-675`).
- **Page options**: `Notebook.pageTabs` (Mind map, Slides, Audio, Database) for the whole notebook; Notes, Summary, Review always show (`src/notebooks/pageTabs.ts:7-13`).

### Missing (new work)

A format Claude can write that reaches boxes, grid, looks, groups, ink marks, shapes, highlights, colours, toggles, pictures from a zip, sub-pages at any depth, tags, page options and Summary content; a layout step that places boxes without overlap; carrying `summaryItems` through the notebook file.
**Size: large (estimate).** Reason: about ten data kinds, each with its own stored shape, plus layout rules (NB-86, NB-44) and the zip.

### Needs the running app

Whether text-run styles for highlight and colour survive an import exactly; whether ink anchored to new block ids lands in the right place after import.

---

## Point 2. NB-43: size limits and what happens on a fault

| Reader                                 | Limit                                                                                                                                      | What happens                                                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ln-notes/1` text                      | 2,000,000 characters (`notesFormat.ts:9`)                                                                                                  | whole text refused, user told "too big" (`notesFormat.ts:119-121`, `NotesPanel.tsx:85-90`)                                                                                                   |
| `ln-notes/1` nothing usable            | —                                                                                                                                          | refused, user told (`notesFormat.ts:208`)                                                                                                                                                    |
| `ln-notes/1` cards                     | 500 (`notesFormat.ts:10`)                                                                                                                  | the rest **dropped silently** (`notesFormat.ts:200`)                                                                                                                                         |
| `ln-notes/1` long paragraph            | 5,000 characters per block (`textBlocks.ts:28`)                                                                                            | split, nothing lost (`textBlocks.ts:31-44`)                                                                                                                                                  |
| Mind map                               | 500 nodes, 200 characters (`model.ts:29-30`)                                                                                               | rest **cut silently** (`model.ts:48-55`)                                                                                                                                                     |
| Notes zip                              | 200 MB file, 500 entries, 300 MB unpacked (`zipNotes.ts:12-14`)                                                                            | whole zip refused, one message "zip bad" (`zipNotes.ts:52-71`, `NotesPanel.tsx:115`)                                                                                                         |
| Zip, one picture                       | 25 MB (`imageRef.ts:28`)                                                                                                                   | that picture **skipped silently** (`zipNotes.ts:65`)                                                                                                                                         |
| Zip, pictures                          | 200 (`zipNotes.ts:15`)                                                                                                                     | the rest **skipped silently** (`zipNotes.ts:81`)                                                                                                                                             |
| Zip, file that is not png/jpg/gif/webp | —                                                                                                                                          | **skipped silently** (`zipNotes.ts:82-84`)                                                                                                                                                   |
| Picture line with no file              | —                                                                                                                                          | only the caption stays as text, **silently** (`importNotes.ts:60`)                                                                                                                           |
| `ln-skill/1`                           | 400,000 characters; 200 points, 300 cards, 40 pages, 20,000 characters a page (`skillFormat.ts:15-21`)                                     | over the total: refused. Over a count or a length: **cut silently** (`skillFormat.ts:153`, `159-160`)                                                                                        |
| `ln-spec/1`                            | 256 KB, 50 pages, 200 blocks a page, 500 cards, 10 databases … (`spec.ts:22-42`)                                                           | **refused whole**, with exact error paths, never trimmed (`spec.ts:21`)                                                                                                                      |
| Notebook file                          | 200 MB (`bundle.ts:32`, `fileIO.ts:55-56`); 2,000,000 rows (`bundle.ts:384`); picture under 60,000,000 base64 characters (`bundle.ts:412`) | **refused whole**; one broken row or field refuses the whole file (`checkRows.ts:577`, `bundle.ts:403`). Nothing is written (`bundle.ts:364-366`, one transaction `importBundle.ts:109-113`) |
| Full zip                               | 1 GB, 200,000 entries, 2.5 GB unpacked, 2,000,000 rows (`fullFile.ts:27-33`)                                                               | refused whole                                                                                                                                                                                |
| Notion zip                             | 400 MB, 20,000 entries, 2 MB per page, 50 MB per file, 5,000 pages (`notionImport.ts:41-47`)                                               | entries over a limit are skipped (`notionImport.ts:152`, `170`); whether the user is told: not checked                                                                                       |

**Contradiction with NB-43:** today a file is refused whole when one part is too large (notebook file, `ln-spec/1`, both zips), and other parts are dropped with no word. NB-43 needs a reader that keeps going, collects what it could not place with its chapter, and shows that list. **Size: medium (estimate).** Reason: a per-part report and per-part limits instead of one throw; the all-or-nothing transaction must stay for safety.

---

## Point 3. NB-13 and NB-45: the Summary

### The things called "summary" in the code

1. **`Page.summary`**: "a lesson's own summary", one plain text up to 20,000 characters (`types.ts:179-180`, `src/revise/reviseService.ts:12`, `49-64`). Shown and edited as the paragraph at the top of the Summary option (`SummaryView.tsx:124-132`, `235-268`) and in the Revise tab. `ln-spec/1` writes it (`notesWrite.ts:404`).
2. **`summaryItems` rows**: the list of lines (`types.ts:658-675`, `src/core/summaryService.ts:12-17`). A line is linked to a note line (shows its live words) or typed. At most 500 lines a page, 2,000 characters each (`summaryService.ts:19-20`). Plain text plus an optional link back.
3. **A "Summary" heading and paragraph inside the Notes**: the skill answer writes one (`skillSave.ts:258-259`); the in-app AI "Summarise" puts its text under the page's Summary heading (`src/ai/aiRun.ts:161`); `ln-spec/1` puts the notebook summary as a callout on page 1 (`notesWrite.ts:605-606`).
   Also two _views_ named Summary: the page's Summary option (`src/pages/PageView.tsx:712-723`) and the notebook's Summary tab (`src/notebooks/NotebookScreen.tsx:269-270`, tab added by `summaryService.ts:310-328`). Both read the same rows (1 and 2), per page or for the whole notebook (`summaryService.ts:197-271`).

### What the Summary option can hold today

The paragraph (1) and the list of lines (2). Plain text only: no boxes, pictures, shapes, ink, colours.

### A Summary that is a page of boxes, shapes and diagrams

- A page has **one** paper surface: one `boxes` list and one `rows` grid on the page (`types.ts:198-209`), and each block has one `boxId` (`types.ts:341-345`). Ink chunks belong to the page and a block (`inkTypes.ts:107-115`). There is no second surface.
- Ways to build it (all new): (a) a hidden child page that holds the Summary and is shown in the Summary option; (b) a second set of boxes and a "surface" mark on blocks and ink. (a) reuses the whole paper, ink and Undo machinery but needs the page list, search, review and export to hide or treat it; (b) touches every place that reads `boxes`, `boxId` and ink. This is a judgement from the data model, not tested.
- The list of lines must stay under it (NB-13): it can, since it is separate rows.
- If (a), the notebook file carries it already as a page; if the Summary lines must travel too, the bundle must gain `summaryItems` (`bundle.ts:76-89`).
- **Size: large (estimate).** Reason: a second editable paper per chapter, with the same tools, Undo and sync.

### Why the Summary stays empty after an import (issue #82)

Issue #82 (read with `gh issue view 82`): "after Paste notes, the Summary tab stays empty", fault 10, build 1b0b03a7.
Cause in the code: `importParsed` writes only blocks (`importNotes.ts:191-209`). It never writes `Page.summary` and never adds `summaryItems`. The key points become bullet blocks in the Notes (`importNotes.ts:95-100`). The Summary option reads only `Page.summary` and `summaryItems` (`summaryService.ts:229-264`), so it shows its empty text (`SummaryView.tsx:64-67`). Confirmed from the code; the picture was not opened.
Fix for NB-45 with today's pieces: write the key points as own lines (`addOwnLine`, `summaryService.ts:108-133`) or linked lines (`addBlockToSummary`, `summaryService.ts:62-105`), and a short text into `Page.summary`. **Size: small (estimate).**

---

## Point 4. NB-42: a second import of the same notebook

- **Paste notes / zip:** nothing is recognised. Each paste makes one more new page in "Sources" (`importNotes.ts:195-200`). There is no id in the format (`notesFormat.ts:15-25`).
- **Skill answer:** nothing recognised; a new notebook or new pages each time (`skillSave.ts:239-247`).
- **`ln-spec/1`:** nothing recognised; a new notebook each time (`notesWrite.ts:567`).
- **Notebook file:** always new copies with new ids, named "Copy of …" (`importBundle.ts:29-35`, `242-244`). The only thing matched is a **template**, by the same id or the same name and words (`importBundle.ts:146-178`). No notebook is matched by id or name.
- **Layer file:** **does** recognise it. The file has a stable `layer.id`; a second install is refused with "already added" (`src/layers/manifest.ts:11-19`, `src/layers/layerService.ts:96-105`). The install records each made item with a hash, so Remove takes away only what the owner did not change (`layerService.ts:135-147`, `164-277`).
- **Missing:** an id in the new format; a record of which notebook came from which id (a new field on the notebook, or an install record like `layerInstalls`); the three-choice question; "Replace" = old notebook to Trash + new one in, undone together by one Undo (today the notebook Undo restores only the trashed one, `trashService.ts:212-240`).
- **Contradiction:** none, but a new notebook field must be added to the typed field list or the file reader drops it (`checkRows.ts:40-52`, `83-113`), and to the sync table list (`src/sync/tables.ts`, not opened).
- **Size: medium (estimate).** Reason: the layer code is a close pattern; the joint Undo of "replace" is new.
- **Name match:** not used anywhere for notebooks. How a copy is named is an open small question in the spec (section 8).

---

## Point 5. NB-47: the whole notebook to the Trash, one Undo

- **Exists.** `deleteNotebook` soft-deletes the notebook, its pages, blocks and databases in one transaction (`src/notebooks/notebookService.ts:144-189`). The Sidebar and the notebooks screen show a toast with Undo that calls `restoreNotebook` (`src/notebooks/Sidebar.tsx:278-288`, `src/notebooks/v2/useNotebookActions.ts:78-87`). `restoreNotebook` brings back what was deleted at the same moment (`src/trash/trashService.ts:208-240`). A test covers restore from Trash (`e2e/trash.spec.ts:74`).
- **For one page:** `trashPageWithUndo` moves a page and its sub-pages to the Trash with an Undo toast (`src/pages/pageTrash.ts:17-48`).
- **Gaps:**
  - A pasted import is not its own notebook: it is a page in the shared "Sources" notebook (`importNotes.ts:196-197`). So NB-47 needs the new import to make its own notebook.
  - `deleteNotebook` does not touch ink, cards, Summary lines or pictures (`notebookService.ts:149-156`). Whether they show anywhere while the notebook is in the Trash (for example due cards): **not checked**.
  - A notebook with an edit lock, or holding a locked page, cannot be deleted (`notebookService.ts:159-167`).
- **Contradiction:** the spec line says "New for a whole notebook". The code says it exists. **Size: small (estimate)** for NB-47 itself; the "Replace" Undo of NB-42 is counted there.
- **Needs the running app:** that the Undo in the toast really brings everything back after an import (ink, cards due).

---

## Point 6. NB-44 with issues #81 and #83

### #81 "the right-hand branches of the mind map are cut off" (fault 9)

- The import makes the map from an indented list and puts it as one block in the page's first box (no `boxId`) (`importNotes.ts:107-112`, `model.ts:254-282`).
- The map is drawn at its own pixel size, branches growing to the right of the parent (`src/editor/mindMap/MindMapView.tsx:401-417`), inside a frame that scrolls (`MindMapView.tsx:395`: `max-h-[70vh] overflow-auto`). No fit-to-width and no zoom was found in that view.
- So a map wider than the box is either clipped or needs a sideways scroll inside the box. Which of the two the owner saw, and on which width, **cannot be settled from the code**; it needs the running app at 1440 x 900 and 820 x 1180.
- Also possible, and silent: more than 500 nodes are cut from the data (`model.ts:48-55`).
- NB-08 (zoom, drag, see it whole) is not met by this view. **Size: medium (estimate).**

### #83 "the 'Pasted text / AI is off' panel pushes the notes far down" (fault 11)

Cause in the code, confirmed step by step:

1. Paste notes with no page marks the new page as a source: `source: { kind: 'paste' }` (`importNotes.ts:198-200`).
2. Any page with a `source` gets a header: `BookHeader` with `AiActions` and `PageAiActions` inside (`src/App.tsx:1800-1823`).
3. The header shows the kind label "Pasted text" (`src/library/BookHeader.tsx:53-55`, `src/i18n/en/library.ts:49`).
4. With AI off, `AiActions` adds the full-width "AI is off" card (`src/ai/AiActions.tsx:78-90`).
5. The header is drawn above the page's option row and the notes (`src/pages/PageView.tsx:688`, before `697-711`).
   So a Claude notebook should not be marked as a pasted source, or the header should not show for it. **Size: small (estimate).**

### Other NB-44 parts

Boxes on each other, boxes past the sheet, broken pictures: today's `ln-notes/1` import makes no boxes at all, so those come with the new format. A broken picture today silently becomes its caption (`importNotes.ts:60`).

---

## Cannot be settled from the code (needs the running app or the iPad)

- #81: clip or scroll, and at which width.
- Whether highlights, text colours and ink land exactly right after a notebook file import.
- Whether due cards of a notebook in the Trash still show in Review.
- Whether the Notion import tells the user about skipped entries.
- The "Fit" paper bug (finding 8): proof by saving and re-adding a notebook with a Fit page.
