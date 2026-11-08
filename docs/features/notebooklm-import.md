# Bring in from NotebookLM and optional page tabs

Security rules: [rules/security.md](../../rules/security.md). Research: [../research/notebooklm-import-2026-11.md](../research/notebooklm-import-2026-11.md). Builds on [audio.md](audio.md), [database.md](database.md), [recall-cards.md](recall-cards.md), [mind-map.md](mind-map.md), [prompt-library.md](prompt-library.md), [files-table-camera.md](files-table-camera.md).

## Purpose

Take what NotebookLM makes and keep it as ordinary notes here. The consumer NotebookLM has no public API, so this is a one-time copy by file or paste, never a live link. Built 9 Nov 2026. Also: four optional page tabs, switched on per notebook.

## How it works

- **Where:** Data (Save & restore) › More › "Bring in from NotebookLM". Choose a notebook and a page (or "A new page"), then choose or drop a file, or paste text and say what it is. A preview says what it is and where it goes; Add puts it there; one Undo in the toast takes it back (a page the import made goes to Trash with it). Code: `src/share/notebooklm/` (lazy; `parse.ts` pure, `run.ts` writes, `rebuild.ts` the AI step).
- **Audio overview (.m4a, .mp3, .wav):** kept as a recording of the page (the Audio panel and the Audio & video tab play it).
- **Video overview (.mp4):** a File block; it plays inline on the page (`InlineVideo`, only video/mp4, webm, quicktime) and in the Audio & video tab.
- **Slide deck (.pdf or .pptx):** a File block plus `BookFile.slides = true`; the Slides tab shows a strip (PDF pages drawn with pdf.js as they scroll into view; PowerPoint slide pictures read from the zip in slide order, `slidesModel.ts`). NotebookLM slides are pictures, so the text is not editable.
- **Mind map picture (.png):** an image block. Optional "Also rebuild it as an editable mind map": the cost line is shown first (rupees, tokens, model), the owner's own key and the notebook's AI permission are required; the model returns an indented outline that becomes a mind map block (`fromOutline`). Nothing is sent without that choice.
- **Report or briefing text (paste or .md/.txt):** headings, lists and tables through the ordinary Markdown reader.
- **Flashcards (CSV front,back or text "Q: / A:") and Quiz text:** Card blocks under a heading "Cards from NotebookLM", then card records. Quiz accepts numbered questions with options and an answer line or a tick, or the plain Q/A list the prompts below ask for. Decks are live filters here, not boxes, so there is no deck to choose: the cards belong to the chosen page and show in the decks that match it.
- **Data table (CSV or pasted tab/Markdown table):** a new database in the page's notebook (column types guessed like the CSV import) and a Database block on the page.
- **Mind map outline (pasted):** a mind map block.
- **Three paste-in prompts** in the Prompt library (purpose Import): "Mind map as indented outline", "Quiz as Q/A list with answers", "Infographic content as headings and bullet points". The owner pastes one into NotebookLM chat and pastes the answer here; the importer reads exactly that shape (tests use the seed texts).

## Optional page tabs

- Notes · Summary · Review stay. A notebook can add Mind map, Slides, Audio & video, Database (`Notebook.pageTabs`, off by default). Switch on from the ⋯ at the end of the tab row, or in Settings › General › Page tabs (per notebook, and a default for new notebooks, pref `pageTabs.default`). A switched-off tab opens the notes.
- **Mind map:** the page's mind map blocks (hand-made, skill output, imported), editable here; or "Make one from the headings". The notes editor reloads after changes made here.
- **Slides:** the decks above. **Audio & video:** the page's recordings (same rows as the left Audio panel, which stays) and videos.
- **Database:** the same database view as Quick access, filtered to this page by default, with chips for "This page and its sub-pages" and "The whole notebook".

## Edge cases

- Unknown file types, empty files and text with nothing to add are refused in plain words and change nothing.
- A file over 50 MB is refused (the attachment limit); audio 200 MB (recording limit).
- A new page made by an import that then fails is removed again.
- A PowerPoint that cannot be read, or has no pictures, says so; the file is still saved.

## Security check

Files are stored as data and never opened by the browser (downloads are octet-stream); the zip is read, never run. Pasted text is parsed as text (no HTML). The only network use is the optional picture rebuild, with the owner's key, after the cost shows; locked pages and notebooks that do not allow AI are refused by the usual checks.

## Tests

Unit: `src/share/notebooklm/parse.test.ts`, `run.test.ts`, `src/pages/tabs/slidesModel.test.ts`, `databaseScope.test.ts`, `src/notebooks/pageTabs.test.ts`. E2E (chromium): `e2e/notebooklmImport.spec.ts`, `e2e/pageTabs.spec.ts`.

## Not built

Drop or paste directly onto a page (only the Data screen import so far); a page filter on the notebook's own Database tab; PDF slides are not text-searched; video is not transcoded (playback depends on the browser).
